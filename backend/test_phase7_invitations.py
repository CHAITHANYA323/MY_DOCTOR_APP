import os
import sys
import tempfile
import uuid
import shutil
import json
import unittest
import threading
import multiprocessing
from datetime import datetime, date, timedelta, timezone

# Force isolated temporary database BEFORE importing any application modules
_TEMP_DB_PATH = os.environ.get("PHASE7_TEST_DB")
if not _TEMP_DB_PATH:
    _TEMP_TEST_DIR = os.path.join(tempfile.gettempdir(), f"phase7_test_{uuid.uuid4().hex[:8]}")
    os.makedirs(_TEMP_TEST_DIR, exist_ok=True)
    _TEMP_DB_PATH = os.path.join(_TEMP_TEST_DIR, "test_phase7.db")
    os.environ["PHASE7_TEST_DB"] = _TEMP_DB_PATH

os.environ["DATABASE_URL"] = f"sqlite:///{_TEMP_DB_PATH}"

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from config import Config
from models import db, User, Doctor, Hospital, Specialization, Invitation, AuditLog, Appointment
from utils.auth_middleware import generate_token
from utils.rate_limiter import reset_rate_limits


def _mp_acceptance_worker(db_path, raw_token, name_suffix, res_queue):
    """Top-level worker function for multiprocessing concurrency test."""
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    from config import Config
    Config.DATABASE_URL = f"sqlite:///{db_path}"
    Config.SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
    from app import create_app
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"
    with app.app_context():
        client = app.test_client()
        r = client.post('/api/invitations/accept', json={
            'token': raw_token,
            'name': f'Proc User {name_suffix}',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        res_queue.put((name_suffix, r.status_code, r.get_json()))



class TestPhase7StaffInvitations(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db_path = _TEMP_DB_PATH
        Config.DATABASE_URL = f"sqlite:///{cls.db_path}"
        os.environ["DATABASE_URL"] = f"sqlite:///{cls.db_path}"
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{cls.db_path}"
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            db.create_all()

            # Seed Specialization
            spec = Specialization(name="Cardiology", slug="cardiology", icon="heart")
            db.session.add(spec)
            db.session.commit()
            cls.spec_id = spec.id

            # Seed Hospitals
            cls.hosp1 = Hospital(
                name="Hospital Alpha",
                slug="hospital-alpha",
                image="https://example.com/hosp_a.jpg",
                address="10 Alpha Way",
                city="Hyderabad",
                state="Telangana",
                phone="+91 40 1111 2222",
                email="contact@hospitala.com",
                emergency_number="+91 40 1111 2222",
                facilities="ICU, Trauma"
            )
            cls.hosp2 = Hospital(
                name="Hospital Beta",
                slug="hospital-beta",
                image="https://example.com/hosp_b.jpg",
                address="20 Beta Blvd",
                city="Bengaluru",
                state="Karnataka",
                phone="+91 80 3333 4444",
                email="contact@hospitalb.com",
                emergency_number="+91 80 3333 4444",
                facilities="Cath Lab, Emergency"
            )
            db.session.add_all([cls.hosp1, cls.hosp2])
            db.session.commit()

            # Seed Platform Owner
            cls.owner = User(
                name="Platform Owner",
                email="owner@medicare.com",
                phone="+91 99999 00000",
                role="PLATFORM_OWNER",
                hospital_id=None,
                is_active=True
            )
            cls.owner.set_password("OwnerPassword@123")

            # Seed Hospital Super Admins
            cls.admin_a = User(
                name="Admin Alpha",
                email="admin_a@hospitala.com",
                phone="+91 99999 11111",
                role="HOSPITAL_SUPER_ADMIN",
                hospital_id=cls.hosp1.id,
                is_active=True
            )
            cls.admin_a.set_password("AdminAPassword@123")

            cls.admin_b = User(
                name="Admin Beta",
                email="admin_b@hospitalb.com",
                phone="+91 99999 22222",
                role="HOSPITAL_SUPER_ADMIN",
                hospital_id=cls.hosp2.id,
                is_active=True
            )
            cls.admin_b.set_password("AdminBPassword@123")

            # Seed Existing Patient
            cls.patient = User(
                name="Existing Patient",
                email="patient_upgrade@test.com",
                phone="+91 98888 33333",
                role="USER",
                hospital_id=None,
                is_active=True
            )
            cls.patient.set_password("PatientOriginal@123")

            # Seed Doctor user for already-linked doctor profile
            cls.linked_doc_user = User(
                name="Dr. Linked User",
                email="dr.linked@hospitala.com",
                phone="+91 97777 44444",
                role="DOCTOR",
                hospital_id=cls.hosp1.id,
                is_active=True
            )
            cls.linked_doc_user.set_password("DoctorPassword@123")

            db.session.add_all([cls.owner, cls.admin_a, cls.admin_b, cls.patient, cls.linked_doc_user])
            db.session.commit()

            # Seed Doctor Profiles
            cls.doc_a1 = Doctor(
                name="Dr. Unlinked Alpha",
                image="https://example.com/doc1.jpg",
                location="Hyderabad",
                specialization_id=cls.spec_id,
                hospital_id=cls.hosp1.id,
                qualification="MD, DM Cardiology",
                experience=12,
                consultation_fee=800.0,
                rating=4.9,
                user_id=None  # Ready for linking
            )
            cls.doc_a2_linked = Doctor(
                name="Dr. Already Linked",
                image="https://example.com/doc2.jpg",
                location="Hyderabad",
                specialization_id=cls.spec_id,
                hospital_id=cls.hosp1.id,
                qualification="MBBS, MD",
                experience=8,
                consultation_fee=600.0,
                rating=4.7,
                user_id=cls.linked_doc_user.id  # Already linked
            )
            cls.doc_b1 = Doctor(
                name="Dr. Beta Doc",
                image="https://example.com/doc3.jpg",
                location="Bengaluru",
                specialization_id=cls.spec_id,
                hospital_id=cls.hosp2.id,
                qualification="MD Cardiology",
                experience=15,
                consultation_fee=1000.0,
                rating=4.95,
                user_id=None
            )
            db.session.add_all([cls.doc_a1, cls.doc_a2_linked, cls.doc_b1])
            db.session.commit()

            cls.hosp1_id = cls.hosp1.id
            cls.hosp2_id = cls.hosp2.id
            cls.doc_a1_id = cls.doc_a1.id
            cls.doc_a2_linked_id = cls.doc_a2_linked.id
            cls.doc_b1_id = cls.doc_b1.id
            cls.patient_email = cls.patient.email
            cls.owner_email = cls.owner.email
            cls.admin_a_id = cls.admin_a.id

            cls.owner_token = generate_token(cls.owner)
            cls.admin_a_token = generate_token(cls.admin_a)
            cls.admin_b_token = generate_token(cls.admin_b)
            cls.patient_token = generate_token(cls.patient)

    @classmethod
    def tearDownClass(cls):
        Config.DATABASE_URL = None
        os.environ.pop("DATABASE_URL", None)
        try:
            with cls.app.app_context():
                db.session.remove()
                db.engine.dispose()
        except Exception:
            pass
        if os.path.exists(_TEMP_TEST_DIR):
            try:
                shutil.rmtree(_TEMP_TEST_DIR)
            except Exception:
                pass

    def setUp(self):
        reset_rate_limits()

    def test_01_token_crypto_generation_and_hashing(self):
        """Tokens must be cryptographically secure and stored only as SHA-256 hashes."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'crypto_test@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        raw_token = data['invitation']['token']
        self.assertTrue(len(raw_token) >= 32, "Raw token must have sufficient entropy")

        with self.app.app_context():
            inv = Invitation.query.filter_by(email='crypto_test@hospitala.com').first()
            self.assertIsNotNone(inv)
            # Database MUST store 64-character SHA-256 hash, NEVER raw token
            self.assertEqual(len(inv.token_hash), 64)
            self.assertNotEqual(inv.token_hash, raw_token)
            import hashlib
            expected_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
            self.assertEqual(inv.token_hash, expected_hash)

    def test_02_platform_owner_creates_hospital_with_super_admin_invite(self):
        """Platform Owner creates a new Hospital and dispatches Super Admin invitation."""
        res = self.client.post('/api/platform/hospitals', headers={
            'Authorization': f'Bearer {self.owner_token}'
        }, json={
            'name': 'City Care Multi-Speciality',
            'address': '45 Park Lane, Sector 3',
            'city': 'Bengaluru',
            'state': 'Karnataka',
            'emergency_number': '+91 80 2233 4455',
            'facilities': '24/7 Emergency, ICU, Cardiology Lab',
            'admin_name': 'Dr. Ramesh Varma',
            'admin_email': 'ramesh.varma@citycare.com'
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('City Care', data['hospital']['name'])
        self.assertEqual(data['invitation']['role'], 'HOSPITAL_SUPER_ADMIN')
        self.assertIn('/invite/accept/', data['invitation']['invite_link'])

        # Verify audit logs created without raw token or passwords
        with self.app.app_context():
            logs = AuditLog.query.filter_by(hospital_id=data['hospital']['id']).all()
            actions = {l.action for l in logs}
            self.assertIn('HOSPITAL_CREATE', actions)
            self.assertIn('INVITATION_CREATE', actions)
            for log in logs:
                if log.details:
                    self.assertNotIn(data['invitation']['token'], log.details)
                    self.assertNotIn('password', log.details.lower())

    def test_03_non_platform_owner_blocked_from_hospital_creation(self):
        """Non-platform-owners receive 403 on POST /api/platform/hospitals."""
        res = self.client.post('/api/platform/hospitals', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'name': 'Unauthorized Hospital',
            'address': '123 Fake St',
            'city': 'Nowhere',
            'emergency_number': '+91 00 0000 0000',
            'admin_email': 'fake@nowhere.com'
        })
        self.assertEqual(res.status_code, 403)

    def test_04_hospital_super_admin_can_invite_receptionist(self):
        """Hospital Super Admin invites Receptionist for own hospital."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'priya.reception@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data['invitation']['role'], 'RECEPTIONIST')
        self.assertEqual(data['invitation']['hospital_id'], self.hosp1_id)

    def test_05_hospital_super_admin_can_invite_doctor_with_valid_profile(self):
        """Hospital Super Admin invites Doctor linking unlinked doctor profile."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'dr.alpha@hospitala.com',
            'role': 'DOCTOR',
            'doctor_profile_id': self.doc_a1_id
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data['invitation']['doctor_profile_id'], self.doc_a1_id)

    def test_06_role_escalation_blocked_on_invite(self):
        """Super Admin cannot invite PLATFORM_OWNER or HOSPITAL_SUPER_ADMIN."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'escalate@hospitala.com',
            'role': 'PLATFORM_OWNER'
        })
        self.assertEqual(res.status_code, 403)

        res2 = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'escalate2@hospitala.com',
            'role': 'HOSPITAL_SUPER_ADMIN'
        })
        self.assertEqual(res2.status_code, 403)

    def test_07_hospital_id_spoofing_blocked(self):
        """Super Admin attempting to pass another hospital_id is rejected."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'spoof@hospitala.com',
            'role': 'RECEPTIONIST',
            'hospital_id': self.hosp2_id  # Attempted spoof
        })
        self.assertEqual(res.status_code, 403)

    def test_08_cross_hospital_doctor_linking_blocked(self):
        """Super Admin of Hospital A cannot link Doctor belonging to Hospital B."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'cross_doc@hospitala.com',
            'role': 'DOCTOR',
            'doctor_profile_id': self.doc_b1_id  # Doctor B belongs to Hospital B
        })
        self.assertEqual(res.status_code, 403)

    def test_09_already_linked_doctor_profile_rejected(self):
        """Attempting to invite for a doctor profile that already has an account is rejected (409)."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'duplicate_doc@hospitala.com',
            'role': 'DOCTOR',
            'doctor_profile_id': self.doc_a2_linked_id
        })
        self.assertEqual(res.status_code, 409)

    def test_10_duplicate_pending_invitation_rejected(self):
        """Attempting to create another active invitation for the same email is rejected (409)."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'duplicate_check@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        self.assertEqual(res.status_code, 201)

        res_dup = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'duplicate_check@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        self.assertEqual(res_dup.status_code, 409)

    def test_11_public_verify_returns_minimal_metadata(self):
        """Public verification endpoint returns only safe metadata and zero secret leaks."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'verify_meta@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        raw_token = res.get_json()['invitation']['token']

        verify_res = self.client.get(f'/api/invitations/verify/{raw_token}')
        self.assertEqual(verify_res.status_code, 200)
        data = verify_res.get_json()['invitation']

        self.assertEqual(data['email'], 'verify_meta@hospitala.com')
        self.assertEqual(data['role'], 'RECEPTIONIST')
        self.assertEqual(data['hospital_name'], 'Hospital Alpha')
        self.assertIn('expires_at', data)

        # STRICT PRIVACY GUARDS: Zero leakage of internal tokens or IDs
        self.assertNotIn('token_hash', data)
        self.assertNotIn('invited_by_id', data)
        self.assertNotIn('invited_by_name', data)
        self.assertNotIn('id', data)

    def test_12_invalid_tampered_token_rejected_400(self):
        """Invalid or tampered token returns 400 Bad Request."""
        res = self.client.get('/api/invitations/verify/completely_invalid_token_99999999999')
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid invitation token", res.get_json()['message'])

    def test_13_expired_token_rejected_400(self):
        """Tokens past expires_at are rejected with 400."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'expired_test@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        raw_token = res.get_json()['invitation']['token']

        # Force expiration in DB
        with self.app.app_context():
            inv = Invitation.query.filter_by(email='expired_test@hospitala.com').first()
            inv.expires_at = datetime.now(timezone.utc) - timedelta(hours=2)
            db.session.commit()

        # Verification fails
        v_res = self.client.get(f'/api/invitations/verify/{raw_token}')
        self.assertEqual(v_res.status_code, 400)
        self.assertIn("expired", v_res.get_json()['message'].lower())

        # Acceptance fails
        a_res = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'name': 'Expired User',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        self.assertEqual(a_res.status_code, 400)
        self.assertIn("expired", a_res.get_json()['message'].lower())

    def test_14_invitation_revocation_workflow(self):
        """Inviter can revoke an invitation; revoked token is immediately rejected."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'revoke_test@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        inv_id = res.get_json()['invitation']['id']
        raw_token = res.get_json()['invitation']['token']

        # Revoke invitation
        rev_res = self.client.post(f'/api/hospital/invitations/{inv_id}/revoke', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        })
        self.assertEqual(rev_res.status_code, 200)

        # Verification is blocked
        v_res = self.client.get(f'/api/invitations/verify/{raw_token}')
        self.assertEqual(v_res.status_code, 400)
        self.assertIn("revoked", v_res.get_json()['message'].lower())

        # Acceptance is blocked
        a_res = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'name': 'Revoked User',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        self.assertEqual(a_res.status_code, 400)
        self.assertIn("revoked", a_res.get_json()['message'].lower())

    def test_15_cross_hospital_revocation_blocked(self):
        """Hospital Admin B cannot revoke Hospital Admin A's invitations."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'cross_revoke@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        inv_id = res.get_json()['invitation']['id']

        rev_res = self.client.post(f'/api/hospital/invitations/{inv_id}/revoke', headers={
            'Authorization': f'Bearer {self.admin_b_token}'
        })
        self.assertEqual(rev_res.status_code, 403)

    def test_16_successful_new_user_acceptance_and_profile_link(self):
        """New user accepts DOCTOR invitation, creating account and linking doctor profile."""
        # Create fresh doctor profile for linking
        with self.app.app_context():
            new_doc = Doctor(
                name="Dr. Fresh Link",
                image="https://example.com/doc_fresh.jpg",
                location="Hyderabad",
                specialization_id=self.spec_id,
                hospital_id=self.hosp1_id,
                qualification="MS Ortho",
                experience=10,
                consultation_fee=700.0,
                rating=4.8,
                user_id=None
            )
            db.session.add(new_doc)
            db.session.commit()
            doc_id = new_doc.id

        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'fresh_doc@hospitala.com',
            'role': 'DOCTOR',
            'doctor_profile_id': doc_id
        })
        raw_token = res.get_json()['invitation']['token']

        # Accept invitation
        accept_res = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'name': 'Dr. Fresh Link',
            'phone': '+91 91234 56789',
            'password': 'SecureDocPass@123',
            'confirm_password': 'SecureDocPass@123'
        })
        self.assertEqual(accept_res.status_code, 201)
        user_data = accept_res.get_json()['user']
        self.assertEqual(user_data['email'], 'fresh_doc@hospitala.com')
        self.assertEqual(user_data['role'], 'DOCTOR')
        self.assertEqual(user_data['hospital_id'], self.hosp1_id)

        # Verify doctor profile is now linked
        with self.app.app_context():
            doc_in_db = db.session.get(Doctor, doc_id)
            self.assertEqual(doc_in_db.user_id, user_data['id'])
            inv = Invitation.query.filter_by(email='fresh_doc@hospitala.com').first()
            self.assertIsNotNone(inv.used_at)

    def test_17_replay_attack_rejected(self):
        """Consuming the same token a second time is rejected (Single-use)."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'replay_test@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        raw_token = res.get_json()['invitation']['token']

        # 1st acceptance succeeds
        res1 = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'name': 'Replay User',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        self.assertEqual(res1.status_code, 201)

        # 2nd acceptance must fail
        res2 = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'name': 'Attacker Trying Replay',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn("already been accepted", res2.get_json()['message'])

    def test_18_concurrent_acceptance_race_condition_safe(self):
        """Simultaneous concurrent acceptance requests result in exactly 1 success and 1 rejection."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'race_condition@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        raw_token = res.get_json()['invitation']['token']

        results = []

        def _attempt_accept(name_suffix):
            with self.app.app_context():
                client = self.app.test_client()
                r = client.post('/api/invitations/accept', json={
                    'token': raw_token,
                    'name': f'Thread User {name_suffix}',
                    'password': 'Password123!',
                    'confirm_password': 'Password123!'
                })
                results.append(r.status_code)

        t1 = threading.Thread(target=_attempt_accept, args=('A',))
        t2 = threading.Thread(target=_attempt_accept, args=('B',))

        t1.start()
        t2.start()
        t1.join()
        t2.join()

        self.assertEqual(len(results), 2)
        self.assertEqual(results.count(201), 1, "Exactly one concurrent thread must succeed (201)")
        self.assertEqual(results.count(400), 1, "The second concurrent thread must be rejected (400)")

        # Verify only 1 account exists in database
        with self.app.app_context():
            users = User.query.filter_by(email='race_condition@hospitala.com').all()
            self.assertEqual(len(users), 1, "Duplicate account creation must never occur")

    def test_19_existing_account_rejected_without_current_password(self):
        """Accepting an invitation for an existing email without current password is rejected."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': self.patient_email,  # Existing patient
            'role': 'RECEPTIONIST'
        })
        raw_token = res.get_json()['invitation']['token']

        # Attempt takeover without password
        bad_res1 = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'name': 'Attacker Name',
            'password': 'NewPassword@123'
        })
        self.assertEqual(bad_res1.status_code, 400)
        self.assertIn("current password to verify ownership", bad_res1.get_json()['message'])

        # Attempt takeover with wrong password
        bad_res2 = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'current_password': 'WrongPassword@999'
        })
        self.assertEqual(bad_res2.status_code, 401)
        self.assertIn("Current password is incorrect", bad_res2.get_json()['message'])

    def test_20_existing_account_successful_verified_linking(self):
        """Providing valid current_password safely links/upgrades existing user account."""
        with self.app.app_context():
            u2 = User(
                name="Patient Two",
                email="patient_link2@test.com",
                phone="+91 95555 44444",
                role="USER",
                is_active=True
            )
            u2.set_password("PatientTwoPass@123")
            db.session.add(u2)
            db.session.commit()

        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'patient_link2@test.com',
            'role': 'RECEPTIONIST'
        })
        self.assertEqual(res.status_code, 201)
        raw_token = res.get_json()['invitation']['token']

        # Legitimate verified acceptance
        good_res = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'current_password': 'PatientTwoPass@123'
        })
        self.assertEqual(good_res.status_code, 201)
        data = good_res.get_json()
        self.assertEqual(data['user']['role'], 'RECEPTIONIST')
        self.assertEqual(data['user']['hospital_id'], self.hosp1_id)

        # Verify user can still login with their original password
        login_res = self.client.post('/api/auth/login', json={
            'email': 'patient_link2@test.com',
            'password': 'PatientTwoPass@123'
        })
        self.assertEqual(login_res.status_code, 200)
        self.assertEqual(login_res.get_json()['user']['role'], 'RECEPTIONIST')

    def test_21_existing_platform_owner_cannot_be_converted(self):
        """Platform Owner cannot be targeted or converted by staff invitations."""
        # Platform owner creates invitation for their own email
        raw_token, token_hash = None, None
        with self.app.app_context():
            import secrets, hashlib
            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
            inv = Invitation(
                email=self.owner_email,
                role='RECEPTIONIST',
                hospital_id=self.hosp1_id,
                token_hash=token_hash,
                invited_by_id=self.admin_a_id,
                expires_at=datetime.now(timezone.utc) + timedelta(days=7)
            )
            db.session.add(inv)
            db.session.commit()

        # Acceptance blocked even with correct owner password
        res = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'current_password': 'OwnerPassword@123'
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("Platform Owner accounts cannot be modified", res.get_json()['message'])

    def test_22_invitation_list_scoping(self):
        """Hospital Super Admin sees only own invitations; Platform Owner sees all."""
        # Super Admin A sees only Hospital 1
        res_a = self.client.get('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        })
        self.assertEqual(res_a.status_code, 200)
        data_a = res_a.get_json()['invitations']
        for inv in data_a:
            self.assertEqual(inv['hospital_id'], self.hosp1_id)
            self.assertNotIn('token_hash', inv)

        # Platform Owner sees all
        res_owner = self.client.get('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.owner_token}'
        })
        self.assertEqual(res_owner.status_code, 200)
        data_owner = res_owner.get_json()['invitations']
        self.assertGreater(len(data_owner), len(data_a))

    def test_23_multi_process_concurrent_acceptance_safe(self):
        """Simultaneous multi-process acceptance results in exactly 1 success (201) and 1 rejection (400) (SEC-01)."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'mp_race_test@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        self.assertEqual(res.status_code, 201)
        raw_token = res.get_json()['invitation']['token']

        res_queue = multiprocessing.Queue()
        p1 = multiprocessing.Process(target=_mp_acceptance_worker, args=(self.db_path, raw_token, 'Alpha', res_queue))
        p2 = multiprocessing.Process(target=_mp_acceptance_worker, args=(self.db_path, raw_token, 'Beta', res_queue))

        p1.start()
        p2.start()
        p1.join(timeout=10)
        p2.join(timeout=10)

        results = []
        while not res_queue.empty():
            results.append(res_queue.get())

        self.assertEqual(len(results), 2, "Both processes must report results")
        statuses = [r[1] for r in results]
        self.assertEqual(statuses.count(201), 1, "Exactly one OS process must succeed (201)")
        self.assertEqual(statuses.count(400), 1, "The competing OS process must be rejected (400)")

        # Verify only 1 account exists in database
        with self.app.app_context():
            users = User.query.filter_by(email='mp_race_test@hospitala.com').all()
            self.assertEqual(len(users), 1, "Duplicate account creation across processes must never occur")

    def test_24_failed_acceptance_rolls_back_invitation_consumption(self):
        """Failure during acceptance rolls back used_at to NULL, permitting subsequent valid retry (SEC-01)."""
        with self.app.app_context():
            rb_user = User(
                name="Rollback Test User",
                email="rollback_user@test.com",
                phone="+91 91111 22222",
                role="USER",
                is_active=True
            )
            rb_user.set_password("OldPassword@123")
            db.session.add(rb_user)
            db.session.commit()

        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'rollback_user@test.com',
            'role': 'RECEPTIONIST'
        })
        self.assertEqual(res.status_code, 201)
        raw_token = res.get_json()['invitation']['token']
        inv_id = res.get_json()['invitation']['id']

        # Attempt acceptance with valid current_password but invalid new_password (< 6 chars)
        fail_res = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'current_password': 'OldPassword@123',
            'new_password': '123'
        })
        self.assertEqual(fail_res.status_code, 400)
        self.assertIn("at least 6 characters", fail_res.get_json()['message'])

        # Verify in DB: used_at is STILL NULL (atomic rollback verified!)
        with self.app.app_context():
            inv = db.session.get(Invitation, inv_id)
            self.assertIsNone(inv.used_at, "used_at must be rolled back to NULL upon failure")
            user = User.query.filter_by(email='rollback_user@test.com').first()
            self.assertEqual(user.role, 'USER', "User role must not be upgraded prematurely")

        # Now submit valid acceptance
        succ_res = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'current_password': 'OldPassword@123',
            'new_password': 'NewStrongPassword@123',
            'confirm_new_password': 'NewStrongPassword@123'
        })
        self.assertEqual(succ_res.status_code, 201)

        # Verify in DB: used_at is now stamped, user upgraded
        with self.app.app_context():
            inv = db.session.get(Invitation, inv_id)
            self.assertIsNotNone(inv.used_at)
            user = User.query.filter_by(email='rollback_user@test.com').first()
            self.assertEqual(user.role, 'RECEPTIONIST')

    def test_25_sec02_cross_hospital_staff_reassignment_blocked_at_creation(self):
        """Super Admin B cannot create an invitation for staff assigned to Hospital A (SEC-02)."""
        with self.app.app_context():
            staff_a = User(
                name="Staff Alpha Person",
                email="staff_alpha_unique@hospitala.com",
                phone="+91 92222 33333",
                role="RECEPTIONIST",
                hospital_id=self.hosp1_id,
                is_active=True
            )
            staff_a.set_password("StaffAPass@123")
            db.session.add(staff_a)
            db.session.commit()

        # Admin B tries to invite this staff to Hospital B
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_b_token}'
        }, json={
            'email': 'staff_alpha_unique@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("Cross-hospital staff transfer through invitations is not permitted", res.get_json()['message'])

    def test_26_sec02_cross_hospital_staff_transfer_blocked_at_acceptance(self):
        """Acceptance by staff assigned to another hospital is strictly rejected (SEC-02)."""
        import secrets, hashlib
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

        with self.app.app_context():
            staff_a2 = User(
                name="Staff Alpha 2",
                email="staff_alpha_2@hospitala.com",
                phone="+91 93333 44444",
                role="DOCTOR",
                hospital_id=self.hosp1_id,
                is_active=True
            )
            staff_a2.set_password("DocAPass@123")
            db.session.add(staff_a2)
            db.session.commit()

            # Forcibly create an invitation scoped to Hospital B
            inv_b = Invitation(
                email="staff_alpha_2@hospitala.com",
                role="DOCTOR",
                hospital_id=self.hosp2_id,
                doctor_profile_id=self.doc_b1_id,
                token_hash=token_hash,
                invited_by_id=self.admin_a_id,
                expires_at=datetime.now(timezone.utc) + timedelta(days=7)
            )
            db.session.add(inv_b)
            db.session.commit()

        # Acceptance must be blocked with 403
        res = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'current_password': 'DocAPass@123'
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("Cross-hospital staff transfer through invitations is not permitted", res.get_json()['message'])

    def test_27_sec02_demoting_hospital_super_admin_blocked(self):
        """Staff invitations cannot demote a Hospital Super Admin (SEC-02)."""
        import secrets, hashlib
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

        with self.app.app_context():
            inv = Invitation(
                email="admin_a@hospitala.com",
                role="RECEPTIONIST",
                hospital_id=self.hosp1_id,
                token_hash=token_hash,
                invited_by_id=self.admin_a_id,
                expires_at=datetime.now(timezone.utc) + timedelta(days=7)
            )
            db.session.add(inv)
            db.session.commit()

        res = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'current_password': 'AdminAPassword@123'
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("Hospital Super Admin accounts cannot be demoted", res.get_json()['message'])

    def test_28_sec03_missing_doctor_profile_id_rejected(self):
        """Inviting a Doctor without doctor_profile_id returns 400 Bad Request (SEC-03)."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'missing_profile_doc@hospitala.com',
            'role': 'DOCTOR'
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("doctor_profile_id is required", res.get_json()['message'])

    def test_29_sec04_dual_doctor_profile_linking_prevented(self):
        """User already linked to one doctor profile cannot link to a second profile (SEC-04)."""
        with self.app.app_context():
            doc2 = Doctor(
                name="Dr. Second Profile",
                image="https://example.com/doc2.jpg",
                location="Hyderabad",
                specialization_id=self.spec_id,
                hospital_id=self.hosp1_id,
                qualification="MD",
                experience=5,
                consultation_fee=500.0,
                rating=4.5,
                user_id=None
            )
            db.session.add(doc2)
            db.session.commit()
            doc2_id = doc2.id

        import secrets, hashlib
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

        # Invite linked_doc_user (already linked to doc_a2_linked) to link doc2
        with self.app.app_context():
            inv = Invitation(
                email="dr.linked@hospitala.com",
                role="DOCTOR",
                hospital_id=self.hosp1_id,
                doctor_profile_id=doc2_id,
                token_hash=token_hash,
                invited_by_id=self.admin_a_id,
                expires_at=datetime.now(timezone.utc) + timedelta(days=7)
            )
            db.session.add(inv)
            db.session.commit()

        res = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'current_password': 'DoctorPassword@123'
        })
        self.assertEqual(res.status_code, 409)
        self.assertIn("An account can only be linked to one doctor profile", res.get_json()['message'])

    def test_30_sec05_dual_context_appointments_personal_vs_hospital_queue(self):
        """Staff user can access their personal booked appointments via ?view=patient (SEC-05)."""
        with self.app.app_context():
            staff_patient = User(
                name="Staff Patient Dual",
                email="dual_staff@hospitala.com",
                phone="+91 94444 55555",
                role="RECEPTIONIST",
                hospital_id=self.hosp1_id,
                is_active=True
            )
            staff_patient.set_password("DualPass@123")

            other_patient = User(
                name="Other Patient Person",
                email="other_patient@hospitala.com",
                phone="+91 94444 66666",
                role="USER",
                is_active=True
            )
            other_patient.set_password("OtherPass@123")

            db.session.add_all([staff_patient, other_patient])
            db.session.commit()

            # Personal appointment booked by staff member
            appt1 = Appointment(
                user_id=staff_patient.id,
                doctor_id=self.doc_a1_id,
                hospital_id=self.hosp1_id,
                appointment_date=date.today().strftime('%Y-%m-%d'),
                appointment_time="10:00 AM",
                reason="Staff personal health check",
                status="Confirmed"
            )
            # Other patient's appointment at the same hospital
            appt2 = Appointment(
                user_id=other_patient.id,
                doctor_id=self.doc_a1_id,
                hospital_id=self.hosp1_id,
                appointment_date=date.today().strftime('%Y-%m-%d'),
                appointment_time="11:00 AM",
                reason="Routine general checkup",
                status="Confirmed"
            )
            db.session.add_all([appt1, appt2])
            db.session.commit()

            appt1_id = appt1.id
            appt2_id = appt2.id
            staff_token = generate_token(staff_patient)

        # 1. Staff queries personal appointments (?view=patient): must only see appt1
        res_personal = self.client.get('/api/appointments?view=patient', headers={
            'Authorization': f'Bearer {staff_token}'
        })
        self.assertEqual(res_personal.status_code, 200)
        appts_personal = res_personal.get_json()['appointments']
        self.assertEqual(len(appts_personal), 1)
        self.assertEqual(appts_personal[0]['id'], appt1_id)
        self.assertEqual(appts_personal[0]['reason'], "Staff personal health check")

        # 2. Staff queries hospital queue (default view): sees both appt1 and appt2
        res_hospital = self.client.get('/api/appointments', headers={
            'Authorization': f'Bearer {staff_token}'
        })
        self.assertEqual(res_hospital.status_code, 200)
        appts_hosp = res_hospital.get_json()['appointments']
        hosp_appt_ids = [a['id'] for a in appts_hosp]
        self.assertIn(appt1_id, hosp_appt_ids)
        self.assertIn(appt2_id, hosp_appt_ids)

        # 3. Staff accesses own personal appointment detail directly: returns 200
        res_detail = self.client.get(f'/api/appointments/{appt1_id}', headers={
            'Authorization': f'Bearer {staff_token}'
        })
        self.assertEqual(res_detail.status_code, 200)
        self.assertEqual(res_detail.get_json()['appointment']['id'], appt1_id)

        # 4. Super Admin of Hospital B attempting to access appt1: returns 403 Forbidden
        res_cross = self.client.get(f'/api/appointments/{appt1_id}', headers={
            'Authorization': f'Bearer {self.admin_b_token}'
        })
        self.assertEqual(res_cross.status_code, 403)

    def test_31_sec06_rate_limiting_public_verify(self):
        """Public verification is rate-limited to 60 req/min per IP (SEC-06)."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'rate_limit_verify@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        raw_token = res.get_json()['invitation']['token']

        # 60 calls succeed or return valid status
        for _ in range(60):
            r = self.client.get(f'/api/invitations/verify/{raw_token}', environ_base={'REMOTE_ADDR': '198.51.100.1'})
            self.assertEqual(r.status_code, 200)

        # 61st call is blocked with HTTP 429 Too Many Requests
        r_blocked = self.client.get(f'/api/invitations/verify/{raw_token}', environ_base={'REMOTE_ADDR': '198.51.100.1'})
        self.assertEqual(r_blocked.status_code, 429)
        self.assertIn('Retry-After', r_blocked.headers)
        self.assertIn("Too many verification attempts", r_blocked.get_json()['message'])

    def test_32_sec06_rate_limiting_failed_password_attempts(self):
        """5 failed password attempts lock account linking, 6th returns 429 (SEC-06)."""
        with self.app.app_context():
            locked_user = User(
                name="Lockout Target",
                email="lockout_target@test.com",
                phone="+91 96666 77777",
                role="USER",
                is_active=True
            )
            locked_user.set_password("CorrectPass@123")
            db.session.add(locked_user)
            db.session.commit()

        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'lockout_target@test.com',
            'role': 'RECEPTIONIST'
        })
        raw_token = res.get_json()['invitation']['token']

        # 5 consecutive failed password attempts return 401
        for _ in range(5):
            r = self.client.post('/api/invitations/accept', json={
                'token': raw_token,
                'current_password': 'WrongPassword@999'
            }, environ_base={'REMOTE_ADDR': '198.51.100.2'})
            self.assertEqual(r.status_code, 401)

        # 6th attempt is throttled with 429
        r_locked = self.client.post('/api/invitations/accept', json={
            'token': raw_token,
            'current_password': 'WrongPassword@999'
        }, environ_base={'REMOTE_ADDR': '198.51.100.2'})
        self.assertEqual(r_locked.status_code, 429)
        self.assertIn('Retry-After', r_locked.headers)
        self.assertIn("Too many failed password attempts", r_locked.get_json()['message'])

    def test_33_resend_invitation_success_and_old_token_invalidation(self):
        """Super Admin can resend invitation: new token generated, old token invalidated."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'resend_test@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        self.assertEqual(res.status_code, 201)
        inv_id = res.get_json()['invitation']['id']
        old_token = res.get_json()['invitation']['token']

        # Resend invitation
        resend_res = self.client.post(f'/api/hospital/invitations/{inv_id}/resend', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        })
        self.assertEqual(resend_res.status_code, 200)
        new_token = resend_res.get_json()['invitation']['token']
        self.assertNotEqual(old_token, new_token)

        # Old token is rejected
        old_verify = self.client.get(f'/api/invitations/verify/{old_token}')
        self.assertEqual(old_verify.status_code, 400)

        # New token verifies and accepts successfully
        new_verify = self.client.get(f'/api/invitations/verify/{new_token}')
        self.assertEqual(new_verify.status_code, 200)

        accept_res = self.client.post('/api/invitations/accept', json={
            'token': new_token,
            'name': 'Resent Receptionist',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        self.assertEqual(accept_res.status_code, 201)

    def test_34_cross_hospital_resend_blocked(self):
        """Hospital Admin B cannot resend Hospital Admin A's invitations."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'cross_resend@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        self.assertEqual(res.status_code, 201)
        inv_id = res.get_json()['invitation']['id']

        # Admin B tries to resend Admin A's invite -> 403
        r = self.client.post(f'/api/hospital/invitations/{inv_id}/resend', headers={
            'Authorization': f'Bearer {self.admin_b_token}'
        })
        self.assertEqual(r.status_code, 403)
        self.assertIn("belonging to another hospital", r.get_json()['message'])

    def test_35_cannot_resend_accepted_invitation(self):
        """Resending an already accepted invitation is rejected with 400."""
        res = self.client.post('/api/hospital/invitations', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        }, json={
            'email': 'accepted_resend@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        inv_id = res.get_json()['invitation']['id']
        token = res.get_json()['invitation']['token']

        # Accept
        self.client.post('/api/invitations/accept', json={
            'token': token,
            'name': 'Accepted User',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })

        # Try to resend -> 400
        r = self.client.post(f'/api/hospital/invitations/{inv_id}/resend', headers={
            'Authorization': f'Bearer {self.admin_a_token}'
        })
        self.assertEqual(r.status_code, 400)
        self.assertIn("already been accepted", r.get_json()['message'])

    def test_36_platform_owner_can_resend_super_admin_invitation(self):
        """Platform Owner can resend Hospital Super Admin invitation."""
        res = self.client.post('/api/platform/invitations', headers={
            'Authorization': f'Bearer {self.owner_token}'
        }, json={
            'email': 'owner_resend_admin@hospitala.com',
            'role': 'HOSPITAL_SUPER_ADMIN',
            'hospital_id': self.hosp1.id
        })
        self.assertEqual(res.status_code, 201)
        inv_id = res.get_json()['invitation']['id']

        resend_res = self.client.post(f'/api/hospital/invitations/{inv_id}/resend', headers={
            'Authorization': f'Bearer {self.owner_token}'
        })
        self.assertEqual(resend_res.status_code, 200)
        self.assertTrue(resend_res.get_json()['success'])



if __name__ == '__main__':
    unittest.main()
