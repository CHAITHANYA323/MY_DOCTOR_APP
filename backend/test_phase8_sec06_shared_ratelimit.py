import os
import sys
import time
import tempfile
import uuid
import shutil
import unittest
import multiprocessing
import threading
from datetime import datetime, timezone, timedelta
from flask import Flask, request

# Setup isolated test directory BEFORE importing app
_TEMP_TEST_DIR = os.path.join(tempfile.gettempdir(), f"sec06_test_{uuid.uuid4().hex[:8]}")
os.makedirs(_TEMP_TEST_DIR, exist_ok=True)
_APP_DB_PATH = os.path.join(_TEMP_TEST_DIR, "test_app.db")
_RL_DB_PATH = os.path.join(_TEMP_TEST_DIR, "test_ratelimit_shared.db")

os.environ["DATABASE_URL"] = f"sqlite:///{_APP_DB_PATH}"
os.environ["RATE_LIMIT_DB_PATH"] = _RL_DB_PATH
os.environ["RATE_LIMIT_STORAGE"] = "sqlite"
os.environ["FLASK_ENV"] = "testing"

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from models import db, Hospital, User, Doctor, Specialization, Invitation
from utils.auth_middleware import generate_token
from utils.rate_limiter import (
    BaseRateLimiter,
    SqliteRateLimiter,
    MemoryRateLimiter,
    RedisRateLimiter,
    get_rate_limiter,
    set_rate_limiter,
    is_rate_limited,
    check_failed_password_limit,
    record_failed_password,
    clear_failed_passwords,
    reset_rate_limits,
    get_client_ip,
    VERIFY_LIMIT,
    VERIFY_WINDOW,
    ACCEPT_LIMIT,
    ACCEPT_WINDOW,
    PASSWORD_FAILED_LIMIT,
    PASSWORD_FAILED_WINDOW,
)


def _mp_worker_rate_limit(rl_db_path, bucket_key, limit, window, req_count, out_queue):
    """Top-level worker function executing in separate OS process."""
    limiter = SqliteRateLimiter(db_path=rl_db_path)
    results = []
    for _ in range(req_count):
        limited, retry = limiter.is_rate_limited(bucket_key, limit, window)
        results.append((limited, retry))
    out_queue.put(results)


class TestSEC06SharedRateLimiter(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from config import Config
        Config.DATABASE_URL = f"sqlite:///{_APP_DB_PATH}"
        os.environ["DATABASE_URL"] = f"sqlite:///{_APP_DB_PATH}"
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            db.drop_all()
            db.create_all()

            # Seed minimal required hospital and admin for invitation tests
            hosp = Hospital(
                name="Rate Limit Hospital",
                slug="rate-limit-hospital",
                image="https://example.com/hosp.jpg",
                address="100 Security Way",
                city="Cyberabad",
                state="Telangana",
                phone="+91 40 8888 9999",
                email="admin@rlhospital.com",
                emergency_number="+91 40 8888 9999",
                facilities="Emergency, ICU"
            )
            admin = User(
                name="RL Admin",
                email="admin@rlhospital.com",
                phone="+91 98888 00000",
                role="HOSPITAL_SUPER_ADMIN",
                is_active=True
            )
            admin.set_password("AdminSecurePass@123")
            db.session.add_all([hosp, admin])
            db.session.commit()

            admin.hospital_id = hosp.id
            cls.hosp_id = hosp.id
            cls.admin_token = generate_token(admin)

            # Seed existing patient
            patient = User(
                name="Existing Patient",
                email="patient_rl@hospital.com",
                phone="+91 97777 00000",
                role="USER",
                is_active=True
            )
            patient.set_password("PatientCorrect@123")
            db.session.add(patient)
            db.session.commit()

            cls.patient_email = patient.email

    @classmethod
    def tearDownClass(cls):
        try:
            with cls.app.app_context():
                db.session.remove()
                db.engine.dispose()
        except Exception:
            pass
        os.environ.pop("DATABASE_URL", None)
        os.environ.pop("RATE_LIMIT_DB_PATH", None)
        os.environ.pop("RATE_LIMIT_STORAGE", None)
        from config import Config
        Config.DATABASE_URL = None
        from utils.rate_limiter import set_rate_limiter
        set_rate_limiter(None)
        if os.path.exists(_TEMP_TEST_DIR):
            try:
                shutil.rmtree(_TEMP_TEST_DIR, ignore_errors=True)
            except Exception:
                pass

    def setUp(self):
        # Reset limiter state to ensure clean isolation
        set_rate_limiter(SqliteRateLimiter(db_path=_RL_DB_PATH))
        reset_rate_limits()

    # -------------------------------------------------------------------------
    # 1. Verification Limit (60 req/min)
    # -------------------------------------------------------------------------
    def test_01_verification_limit_allowed_and_blocked(self):
        """Verifies exactly 60 verification requests are allowed, 61st is blocked."""
        bucket = "verify:198.51.100.10"
        limiter = get_rate_limiter()

        # 1 to 60 allowed
        for i in range(VERIFY_LIMIT):
            limited, retry = limiter.is_rate_limited(bucket, VERIFY_LIMIT, VERIFY_WINDOW)
            self.assertFalse(limited, f"Request {i+1} should be permitted")
            self.assertEqual(retry, 0)

        # 61st request blocked
        limited, retry = limiter.is_rate_limited(bucket, VERIFY_LIMIT, VERIFY_WINDOW)
        self.assertTrue(limited, "61st request must be rate limited")
        self.assertGreaterEqual(retry, 1)
        self.assertLessEqual(retry, VERIFY_WINDOW)

    # -------------------------------------------------------------------------
    # 2. Acceptance Limit (20 req/min)
    # -------------------------------------------------------------------------
    def test_02_acceptance_limit_allowed_and_blocked(self):
        """Verifies exactly 20 acceptance requests are allowed, 21st is blocked."""
        bucket = "accept:198.51.100.20"
        limiter = get_rate_limiter()

        # 1 to 20 allowed
        for i in range(ACCEPT_LIMIT):
            limited, retry = limiter.is_rate_limited(bucket, ACCEPT_LIMIT, ACCEPT_WINDOW)
            self.assertFalse(limited, f"Request {i+1} should be permitted")
            self.assertEqual(retry, 0)

        # 21st request blocked
        limited, retry = limiter.is_rate_limited(bucket, ACCEPT_LIMIT, ACCEPT_WINDOW)
        self.assertTrue(limited, "21st request must be rate limited")
        self.assertGreaterEqual(retry, 1)
        self.assertLessEqual(retry, ACCEPT_WINDOW)

    # -------------------------------------------------------------------------
    # 3. Failed Password Limit (5 attempts per 15 min)
    # -------------------------------------------------------------------------
    def test_03_failed_password_limit_and_lockout(self):
        """Verifies 5 failed attempts trigger lockout on 6th attempt."""
        ip = "198.51.100.30"
        email = "target@hospital.com"
        limiter = get_rate_limiter()

        # Initial check should not be limited
        limited, _ = limiter.check_failed_password_limit(ip, email)
        self.assertFalse(limited)

        # Record 4 failures -> still not limited
        for _ in range(PASSWORD_FAILED_LIMIT - 1):
            limiter.record_failed_password(ip, email)
            limited, _ = limiter.check_failed_password_limit(ip, email)
            self.assertFalse(limited)

        # Record 5th failure -> now limited!
        limiter.record_failed_password(ip, email)
        limited, retry = limiter.check_failed_password_limit(ip, email)
        self.assertTrue(limited, "5th failed attempt must trigger lockout")
        self.assertGreater(retry, 0)
        self.assertLessEqual(retry, PASSWORD_FAILED_WINDOW)

    # -------------------------------------------------------------------------
    # 4. Correct Retry-After Header
    # -------------------------------------------------------------------------
    def test_04_retry_after_header_returned_on_429(self):
        """Verifies HTTP 429 response contains a positive integer Retry-After header."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_token}'
        }, json={
            'email': 'retry_header@hospital.com',
            'role': 'RECEPTIONIST'
        })
        self.assertEqual(res.status_code, 201)
        raw_token = res.get_json()['invitation']['token']

        # Saturate 60 verification requests
        for _ in range(VERIFY_LIMIT):
            self.client.get(f'/api/invitations/{raw_token}', environ_base={'REMOTE_ADDR': '198.51.100.40'})

        # 61st request
        res_429 = self.client.get(f'/api/invitations/{raw_token}', environ_base={'REMOTE_ADDR': '198.51.100.40'})
        self.assertEqual(res_429.status_code, 429)
        self.assertIn('Retry-After', res_429.headers)
        retry_val = res_429.headers['Retry-After']
        self.assertTrue(retry_val.isdigit())
        self.assertGreater(int(retry_val), 0)

    # -------------------------------------------------------------------------
    # 5. Counter Expiry (Sliding Window Purge)
    # -------------------------------------------------------------------------
    def test_05_counter_expiry_allows_new_requests(self):
        """Verifies events outside the sliding window are evicted and don't block new requests."""
        bucket = "expiry_test_bucket"
        limiter = get_rate_limiter()

        # Use 1-second window with limit 2
        limited, _ = limiter.is_rate_limited(bucket, limit=2, window_seconds=1)
        self.assertFalse(limited)
        limited, _ = limiter.is_rate_limited(bucket, limit=2, window_seconds=1)
        self.assertFalse(limited)

        # 3rd is immediately blocked
        limited, _ = limiter.is_rate_limited(bucket, limit=2, window_seconds=1)
        self.assertTrue(limited)

        # Wait 1.1s for window to slide past
        time.sleep(1.1)

        # Now request should be allowed again
        limited, _ = limiter.is_rate_limited(bucket, limit=2, window_seconds=1)
        self.assertFalse(limited, "Window expiry must permit new requests")

    # -------------------------------------------------------------------------
    # 6. Successful Counter Reset
    # -------------------------------------------------------------------------
    def test_06_successful_password_resets_counter(self):
        """Verifies clear_failed_passwords resets counter for target account."""
        ip = "198.51.100.60"
        email = "reset_target@hospital.com"
        limiter = get_rate_limiter()

        # Trigger lockout with 5 failures
        for _ in range(5):
            limiter.record_failed_password(ip, email)

        limited, _ = limiter.check_failed_password_limit(ip, email)
        self.assertTrue(limited)

        # Clear counter (simulating valid password submission)
        limiter.clear_failed_passwords(ip, email)

        # Lockout must now be cleared
        limited, _ = limiter.check_failed_password_limit(ip, email)
        self.assertFalse(limited, "Counter clearance must unlock the account")

    # -------------------------------------------------------------------------
    # 7. Multiple Worker Processes Sharing the Same Rate-Limit Counters
    # -------------------------------------------------------------------------
    def test_07_multiple_worker_processes_share_counters(self):
        """Verifies separate OS child processes share identical rate limit counters."""
        bucket = "shared_process_bucket"
        limit = 20
        window = 60

        q1 = multiprocessing.Queue()
        q2 = multiprocessing.Queue()

        # Worker 1 sends 10 requests, Worker 2 sends 10 requests -> Total = 20
        p1 = multiprocessing.Process(target=_mp_worker_rate_limit, args=(_RL_DB_PATH, bucket, limit, window, 10, q1))
        p2 = multiprocessing.Process(target=_mp_worker_rate_limit, args=(_RL_DB_PATH, bucket, limit, window, 10, q2))

        p1.start()
        p2.start()
        p1.join(timeout=10)
        p2.join(timeout=10)

        res1 = q1.get()
        res2 = q2.get()

        # All 20 requests across the two processes must succeed
        all_results = res1 + res2
        self.assertEqual(len(all_results), 20)
        self.assertTrue(all(not limited for limited, _ in all_results))

        # The 21st request executed in the main process must be blocked!
        limiter = SqliteRateLimiter(db_path=_RL_DB_PATH)
        limited, retry = limiter.is_rate_limited(bucket, limit, window)
        self.assertTrue(limited, "The 21st request across processes must be blocked by the shared limiter")
        self.assertGreater(retry, 0)

    # -------------------------------------------------------------------------
    # 8. Concurrent Requests at Rate-Limit Boundary
    # -------------------------------------------------------------------------
    def test_08_concurrent_requests_at_rate_limit_boundary(self):
        """Verifies rapid concurrent threads hitting limit boundary cannot exceed quota."""
        bucket = "concurrent_boundary_test"
        limit = 10
        window = 60
        limiter = get_rate_limiter()

        outcomes = []
        threads = []

        def _hammer():
            limited, _ = limiter.is_rate_limited(bucket, limit, window)
            outcomes.append(limited)

        # Launch 25 concurrent threads attempting to execute
        for _ in range(25):
            t = threading.Thread(target=_hammer)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        self.assertEqual(len(outcomes), 25)
        allowed_count = outcomes.count(False)
        blocked_count = outcomes.count(True)

        # Exactly 10 must be allowed, and 15 must be blocked
        self.assertEqual(allowed_count, 10, "Atomic limiter must allow exactly the configured quota")
        self.assertEqual(blocked_count, 15, "Atomic limiter must reject all requests beyond quota")

    # -------------------------------------------------------------------------
    # 9. Redis Unavailable Behavior (Fail-Closed in Production)
    # -------------------------------------------------------------------------
    def test_09_redis_unavailable_fail_closed_in_production(self):
        """Verifies Redis outage triggers fail-closed defensive response in production mode."""
        # Point to unreachable port
        unreachable_limiter = RedisRateLimiter(redis_url="redis://127.0.0.1:65530/0")

        # In production mode with fail_closed=True
        old_env = os.environ.get("FLASK_ENV")
        os.environ["FLASK_ENV"] = "production"
        os.environ["RATE_LIMIT_FAIL_CLOSED"] = "true"

        try:
            limited, retry = unreachable_limiter.is_rate_limited("test_outage", 20, 60)
            self.assertTrue(limited, "Must fail closed during Redis outage to prevent brute-force attacks")
            self.assertGreaterEqual(retry, 60)

            pwd_limited, pwd_retry = unreachable_limiter.check_failed_password_limit("1.2.3.4", "admin@medicare.com")
            self.assertTrue(pwd_limited, "Must fail closed on password checks during Redis outage")
            self.assertGreaterEqual(pwd_retry, 60)
        finally:
            if old_env is not None:
                os.environ["FLASK_ENV"] = old_env
            else:
                os.environ.pop("FLASK_ENV", None)

    # -------------------------------------------------------------------------
    # 10. Trusted Proxy and Client IP Extraction
    # -------------------------------------------------------------------------
    def test_10_trusted_proxy_and_client_ip_extraction(self):
        """Verifies untrusted X-Forwarded-For is ignored, trusted proxy is respected."""
        test_app = Flask(__name__)

        # Case A: TRUST_PROXY_HEADERS=false (default) -> X-Forwarded-For is completely IGNORED
        os.environ["TRUST_PROXY_HEADERS"] = "false"
        with test_app.test_request_context(
            headers={'X-Forwarded-For': '203.0.113.199'},
            environ_base={'REMOTE_ADDR': '192.168.1.100'}
        ):
            ip = get_client_ip()
            self.assertEqual(ip, '192.168.1.100', "Must ignore X-Forwarded-For when TRUST_PROXY_HEADERS is false")

        # Case B: TRUST_PROXY_HEADERS=true, but connection is NOT from trusted proxy
        os.environ["TRUST_PROXY_HEADERS"] = "true"
        os.environ["TRUSTED_PROXIES"] = "127.0.0.1,::1"
        with test_app.test_request_context(
            headers={'X-Forwarded-For': '203.0.113.199'},
            environ_base={'REMOTE_ADDR': '192.168.1.100'}  # Not in TRUSTED_PROXIES!
        ):
            ip = get_client_ip()
            self.assertEqual(ip, '192.168.1.100', "Must reject X-Forwarded-For from untrusted remote address")

        # Case C: TRUST_PROXY_HEADERS=true, and connection IS from trusted proxy
        with test_app.test_request_context(
            headers={'X-Forwarded-For': '203.0.113.199, 10.0.0.1'},
            environ_base={'REMOTE_ADDR': '127.0.0.1'}  # In TRUSTED_PROXIES!
        ):
            ip = get_client_ip()
            self.assertEqual(ip, '203.0.113.199', "Must extract genuine client IP when forwarded by trusted proxy")

    # -------------------------------------------------------------------------
    # 11. Existing Invitation Acceptance and Verification Behavior Integration
    # -------------------------------------------------------------------------
    def test_11_existing_invitation_lifecycle_integration(self):
        """Verifies full integration with /api/invitations verify and accept flows under shared storage."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_token}'
        }, json={
            'email': self.patient_email,
            'role': 'RECEPTIONIST'
        })
        self.assertEqual(res.status_code, 201)
        raw_token = res.get_json()['invitation']['token']

        # 1. Verification succeeds
        v_res = self.client.get(f'/api/invitations/{raw_token}', environ_base={'REMOTE_ADDR': '198.51.100.99'})
        self.assertEqual(v_res.status_code, 200)

        # 2. Five wrong passwords return 401
        for _ in range(5):
            f_res = self.client.post('/api/invitations/accept', json={
                'token': raw_token,
                'current_password': 'WrongPassword@999'
            }, environ_base={'REMOTE_ADDR': '198.51.100.99'})
            self.assertEqual(f_res.status_code, 401)

        # 3. 6th attempt is throttled with 429
        t_res = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'current_password': 'WrongPassword@999'
        }, environ_base={'REMOTE_ADDR': '198.51.100.99'})
        self.assertEqual(t_res.status_code, 429)
        self.assertIn('Retry-After', t_res.headers)

        # 4. Clear lockout (simulating IP reset or legitimate unblock)
        clear_failed_passwords('198.51.100.99', self.patient_email)

        # 5. Legitimate password succeeds and activates account
        s_res = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'current_password': 'PatientCorrect@123'
        }, environ_base={'REMOTE_ADDR': '198.51.100.99'})
        self.assertEqual(s_res.status_code, 201)
        self.assertEqual(s_res.get_json()['user']['role'], 'RECEPTIONIST')


if __name__ == '__main__':
    unittest.main()
