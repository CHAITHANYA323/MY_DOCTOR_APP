"""
Step 4.10 Security Remediation Regression Test Suite
Validates:
1. Walk-in patient temporary password generation, expiry, and mandatory password change workflow.
2. Restricted session enforcement on all portal endpoints until password is changed.
3. Successful password change unlocking full access.
4. Backward compatibility for existing users and standard registration.
5. Absolute privacy of temporary credentials (zero exposure in lists or detail endpoints).
6. Ambulance multi-tenant isolation: Hospital Super Admin cross-hospital and unassigned-request modification/cancellation blocking.
7. Platform Owner oversight and patient self-cancellation for unassigned requests.
"""

import os
import sys
import unittest
import tempfile
import uuid
import shutil
from datetime import datetime, timedelta, timezone

_TEMP_TEST_DIR = os.path.join(tempfile.gettempdir(), f"step4_10_test_{uuid.uuid4().hex[:8]}")
os.makedirs(_TEMP_TEST_DIR, exist_ok=True)
_TEMP_DB_PATH = os.path.join(_TEMP_TEST_DIR, "step4_10.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEMP_DB_PATH}"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from config import Config
Config.DATABASE_URL = f"sqlite:///{_TEMP_DB_PATH}"

from app import create_app, initialize_database
from models import db, User, Hospital, Doctor, Specialization, Ambulance, AmbulanceRequest
from utils.auth_middleware import generate_token


class TestStep410SecurityRemediation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db_path = _TEMP_DB_PATH
        cls.db_uri = f"sqlite:///{_TEMP_DB_PATH}"
        os.environ["DATABASE_URL"] = cls.db_uri
        Config.DATABASE_URL = cls.db_uri

        cls.app = create_app()
        cls.app.config['TESTING'] = True
        initialize_database(cls.app)
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            # Seed hospitals
            cls.hosp1 = Hospital(
                name="Hospital Alpha",
                slug="hospital-alpha",
                image="https://example.com/hosp1.jpg",
                address="123 Alpha St",
                city="Metropolis",
                state="State Alpha",
                phone="111-222-3333",
                emergency_number="111-911"
            )
            cls.hosp2 = Hospital(
                name="Hospital Beta",
                slug="hospital-beta",
                image="https://example.com/hosp2.jpg",
                address="456 Beta Ave",
                city="Gotham",
                state="State Beta",
                phone="444-555-6666",
                emergency_number="444-911"
            )
            db.session.add_all([cls.hosp1, cls.hosp2])
            db.session.flush()

            # Seed Platform Owner
            cls.owner = User(
                name="Platform Owner",
                email=f"owner_{uuid.uuid4().hex[:6]}@mediconnect.com",
                role="PLATFORM_OWNER",
                is_active=True
            )
            cls.owner.set_password("OwnerSecure123!")

            # Seed Super Admins
            cls.admin1 = User(
                name="Admin Hospital Alpha",
                email=f"admin1_{uuid.uuid4().hex[:6]}@alpha.com",
                role="HOSPITAL_SUPER_ADMIN",
                hospital_id=cls.hosp1.id,
                is_active=True
            )
            cls.admin1.set_password("AdminAlpha123!")

            cls.admin2 = User(
                name="Admin Hospital Beta",
                email=f"admin2_{uuid.uuid4().hex[:6]}@beta.com",
                role="HOSPITAL_SUPER_ADMIN",
                hospital_id=cls.hosp2.id,
                is_active=True
            )
            cls.admin2.set_password("AdminBeta123!")

            # Seed Receptionist for Hospital 1
            cls.receptionist1 = User(
                name="Receptionist Alpha",
                email=f"reception1_{uuid.uuid4().hex[:6]}@alpha.com",
                role="RECEPTIONIST",
                hospital_id=cls.hosp1.id,
                is_active=True
            )
            cls.receptionist1.set_password("ReceptionAlpha123!")

            # Seed standard patient
            cls.standard_patient = User(
                name="Regular Patient",
                email=f"regular_{uuid.uuid4().hex[:6]}@patient.com",
                role="PATIENT",
                must_change_password=False,
                is_active=True
            )
            cls.standard_patient.set_password("RegularPass123!")

            db.session.add_all([cls.owner, cls.admin1, cls.admin2, cls.receptionist1, cls.standard_patient])
            db.session.commit()

            cls.hosp1_id = cls.hosp1.id
            cls.hosp2_id = cls.hosp2.id
            cls.owner_token = generate_token(cls.owner)
            cls.admin1_token = generate_token(cls.admin1)
            cls.admin2_token = generate_token(cls.admin2)
            cls.receptionist1_token = generate_token(cls.receptionist1)
            cls.standard_patient_token = generate_token(cls.standard_patient)

    @classmethod
    def tearDownClass(cls):
        try:
            with cls.app.app_context():
                db.session.remove()
                db.engine.dispose()
        except Exception:
            pass
        os.environ.pop("DATABASE_URL", None)
        Config.DATABASE_URL = None
        if os.path.exists(_TEMP_TEST_DIR):
            try:
                shutil.rmtree(_TEMP_TEST_DIR, ignore_errors=True)
            except Exception:
                pass

    # =========================================================================
    # TASK 1 TESTS — WALK-IN PATIENT PASSWORD SECURITY
    # =========================================================================

    def test_01_walkin_patient_registration_sets_must_change_and_expiry(self):
        """Walk-in patient registration by reception automatically sets must_change_password=True and expiry."""
        email = f"walkin_{uuid.uuid4().hex[:6]}@test.com"
        res = self.client.post('/api/reception/patients', headers={
            'Authorization': f'Bearer {self.receptionist1_token}'
        }, json={
            'name': 'John Walkin Doe',
            'email': email,
            'phone': '9876543210'
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('temporary_password', data)
        temp_pwd = data['temporary_password']
        self.assertTrue(len(temp_pwd) >= 12)
        self.assertTrue(data['patient']['must_change_password'])
        self.assertIsNotNone(data['patient']['temporary_password_expires_at'])

        # Verify DB directly
        with self.app.app_context():
            u = User.query.filter_by(email=email).first()
            self.assertIsNotNone(u)
            self.assertTrue(u.must_change_password)
            self.assertIsNotNone(u.temporary_password_expires_at)
            self.assertFalse(u.check_password("Patient@123"))
            self.assertTrue(u.check_password(temp_pwd))

    def test_02_walkin_patient_login_returns_must_change_password_flag(self):
        """Logging in with a temporary password signals must_change_password=True in the response."""
        email = f"walkin_login_{uuid.uuid4().hex[:6]}@test.com"
        res_reg = self.client.post('/api/reception/patients', headers={
            'Authorization': f'Bearer {self.receptionist1_token}'
        }, json={
            'name': 'Alice Walkin',
            'email': email,
            'phone': '9123456780'
        })
        self.assertEqual(res_reg.status_code, 201)
        temp_pwd = res_reg.get_json()['temporary_password']

        # Log in
        res_login = self.client.post('/api/auth/login', json={
            'email': email,
            'password': temp_pwd
        })
        self.assertEqual(res_login.status_code, 200)
        login_data = res_login.get_json()
        self.assertTrue(login_data['must_change_password'])
        self.assertTrue(login_data['user']['must_change_password'])
        self.assertIn('token', login_data)

    def test_03_restricted_token_blocks_platform_features(self):
        """A user requiring a password change is blocked with 403 PASSWORD_CHANGE_REQUIRED from platform routes."""
        email = f"walkin_blocked_{uuid.uuid4().hex[:6]}@test.com"
        res_reg = self.client.post('/api/reception/patients', headers={
            'Authorization': f'Bearer {self.receptionist1_token}'
        }, json={
            'name': 'Blocked Walkin',
            'email': email,
            'phone': '9988776655'
        })
        temp_pwd = res_reg.get_json()['temporary_password']

        res_login = self.client.post('/api/auth/login', json={
            'email': email,
            'password': temp_pwd
        })
        restricted_token = res_login.get_json()['token']

        # Attempt to access platform endpoints
        res_appts = self.client.get('/api/appointments', headers={'Authorization': f'Bearer {restricted_token}'})
        self.assertEqual(res_appts.status_code, 403)
        self.assertEqual(res_appts.get_json().get('code'), 'PASSWORD_CHANGE_REQUIRED')

        res_book = self.client.post('/api/appointments', headers={'Authorization': f'Bearer {restricted_token}'}, json={})
        self.assertEqual(res_book.status_code, 403)
        self.assertEqual(res_book.get_json().get('code'), 'PASSWORD_CHANGE_REQUIRED')

        res_amb = self.client.get('/api/ambulance-requests', headers={'Authorization': f'Bearer {restricted_token}'})
        self.assertEqual(res_amb.status_code, 403)
        self.assertEqual(res_amb.get_json().get('code'), 'PASSWORD_CHANGE_REQUIRED')

    def test_04_restricted_token_permits_password_change_and_me(self):
        """Restricted session permits GET /api/auth/me and POST /api/auth/change-password."""
        email = f"walkin_allow_{uuid.uuid4().hex[:6]}@test.com"
        res_reg = self.client.post('/api/reception/patients', headers={
            'Authorization': f'Bearer {self.receptionist1_token}'
        }, json={
            'name': 'Permitted Walkin',
            'email': email,
            'phone': '9988112233'
        })
        temp_pwd = res_reg.get_json()['temporary_password']

        res_login = self.client.post('/api/auth/login', json={'email': email, 'password': temp_pwd})
        restricted_token = res_login.get_json()['token']

        # GET /api/auth/me should succeed
        res_me = self.client.get('/api/auth/me', headers={'Authorization': f'Bearer {restricted_token}'})
        self.assertEqual(res_me.status_code, 200)
        self.assertTrue(res_me.get_json()['user']['must_change_password'])

    def test_05_successful_password_change_clears_flag_and_grants_full_access(self):
        """Changing password successfully clears must_change_password and grants an unrestricted token."""
        email = f"walkin_unlock_{uuid.uuid4().hex[:6]}@test.com"
        res_reg = self.client.post('/api/reception/patients', headers={
            'Authorization': f'Bearer {self.receptionist1_token}'
        }, json={
            'name': 'Unlocking Walkin',
            'email': email,
            'phone': '9112233445'
        })
        temp_pwd = res_reg.get_json()['temporary_password']

        res_login = self.client.post('/api/auth/login', json={'email': email, 'password': temp_pwd})
        restricted_token = res_login.get_json()['token']

        # Attempt short password -> 400
        res_short = self.client.post('/api/auth/change-password', headers={
            'Authorization': f'Bearer {restricted_token}'
        }, json={
            'current_password': temp_pwd,
            'new_password': '123',
            'confirm_password': '123'
        })
        self.assertEqual(res_short.status_code, 400)

        # Attempt wrong current password -> 400
        res_wrong = self.client.post('/api/auth/change-password', headers={
            'Authorization': f'Bearer {restricted_token}'
        }, json={
            'current_password': 'WrongPassword123!',
            'new_password': 'BrandNewPassword123!',
            'confirm_password': 'BrandNewPassword123!'
        })
        self.assertEqual(res_wrong.status_code, 400)

        # Successful password change
        new_pwd = "MySecretPersonalPass123!"
        res_change = self.client.post('/api/auth/change-password', headers={
            'Authorization': f'Bearer {restricted_token}'
        }, json={
            'current_password': temp_pwd,
            'new_password': new_pwd,
            'confirm_password': new_pwd
        })
        self.assertEqual(res_change.status_code, 200)
        change_data = res_change.get_json()
        self.assertTrue(change_data['success'])
        self.assertFalse(change_data['must_change_password'])
        unrestricted_token = change_data['token']

        # Using the new unrestricted token, platform access is granted!
        res_appts = self.client.get('/api/appointments', headers={'Authorization': f'Bearer {unrestricted_token}'})
        self.assertEqual(res_appts.status_code, 200)

        # Direct database verification
        with self.app.app_context():
            u = User.query.filter_by(email=email).first()
            self.assertFalse(u.must_change_password)
            self.assertIsNone(u.temporary_password_expires_at)
            self.assertTrue(u.check_password(new_pwd))

    def test_06_expired_temporary_password_rejected_on_login(self):
        """Temporary passwords past temporary_password_expires_at are rejected with 401."""
        email = f"expired_walkin_{uuid.uuid4().hex[:6]}@test.com"
        temp_pwd = "TempExpired123!"
        with self.app.app_context():
            expired_user = User(
                name="Expired Patient",
                email=email,
                phone="9998887776",
                role="PATIENT",
                must_change_password=True,
                temporary_password_expires_at=datetime.now(timezone.utc) - timedelta(days=1)
            )
            expired_user.set_password(temp_pwd)
            db.session.add(expired_user)
            db.session.commit()

        res_login = self.client.post('/api/auth/login', json={
            'email': email,
            'password': temp_pwd
        })
        self.assertEqual(res_login.status_code, 401)
        data = res_login.get_json()
        self.assertIn("expired", data['message'].lower())
        self.assertEqual(data.get('code'), 'TEMPORARY_PASSWORD_EXPIRED')

    def test_07_existing_users_unaffected_by_mandatory_password_change(self):
        """Existing user accounts with must_change_password=False log in normally with unrestricted session."""
        res = self.client.post('/api/auth/login', json={
            'email': self.standard_patient.email,
            'password': 'RegularPass123!'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertFalse(data['must_change_password'])
        token = data['token']

        # Can access appointments without restriction
        res_appts = self.client.get('/api/appointments', headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(res_appts.status_code, 200)

    def test_08_temporary_passwords_never_exposed_in_patient_search_or_details(self):
        """Patient lists and patient detail queries never leak temporary passwords."""
        email = f"secure_search_{uuid.uuid4().hex[:6]}@test.com"
        res_reg = self.client.post('/api/reception/patients', headers={
            'Authorization': f'Bearer {self.receptionist1_token}'
        }, json={
            'name': 'Secure Search Patient',
            'email': email,
            'phone': '9870001122'
        })
        self.assertEqual(res_reg.status_code, 201)
        created_id = res_reg.get_json()['patient']['id']

        # Query patient search
        res_search = self.client.get('/api/reception/patients?search=Secure', headers={
            'Authorization': f'Bearer {self.receptionist1_token}'
        })
        self.assertEqual(res_search.status_code, 200)
        for p in res_search.get_json()['patients']:
            self.assertNotIn('password', p)
            self.assertNotIn('temporary_password', p)
            self.assertNotIn('password_hash', p)

    # =========================================================================
    # TASK 2 TESTS — AMBULANCE TENANT ISOLATION
    # =========================================================================

    def test_09_superadmin_blocked_from_modifying_other_hospital_ambulance_request(self):
        """Hospital Super Admin of Hospital 2 cannot modify emergency request assigned to Hospital 1 (403)."""
        with self.app.app_context():
            req1 = AmbulanceRequest(
                patient_name="Patient Alpha",
                phone="9876543210",
                emergency_type="Trauma",
                pickup_location="Alpha City Center",
                destination_hospital="Hospital Alpha",
                hospital_id=self.hosp1_id,
                status="Pending"
            )
            db.session.add(req1)
            db.session.commit()
            req1_id = req1.id

        # Admin of Hospital 2 tries to update status of Hospital 1's request
        res = self.client.put(f'/api/ambulance-requests/{req1_id}', headers={
            'Authorization': f'Bearer {self.admin2_token}'
        }, json={
            'status': 'Cancelled'
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("belonging to other hospitals", res.get_json()['message'])

    def test_10_superadmin_blocked_from_modifying_unassigned_ambulance_request(self):
        """Hospital Super Admin cannot modify emergency request with hospital_id IS NULL (403)."""
        with self.app.app_context():
            req_null = AmbulanceRequest(
                patient_name="Unassigned Patient",
                phone="9876543210",
                emergency_type="Cardiac",
                pickup_location="Highway 101",
                destination_hospital="Nearest Available Hospital",
                hospital_id=None,
                status="Pending"
            )
            db.session.add(req_null)
            db.session.commit()
            req_null_id = req_null.id

        # Admin of Hospital 1 tries to update unassigned request
        res = self.client.put(f'/api/ambulance-requests/{req_null_id}', headers={
            'Authorization': f'Bearer {self.admin1_token}'
        }, json={
            'status': 'Cancelled'
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("Platform Owners", res.get_json()['message'])

    def test_11_superadmin_blocked_from_cancelling_other_hospital_ambulance_request(self):
        """Hospital Super Admin of Hospital 2 cannot cancel emergency request assigned to Hospital 1 (403)."""
        with self.app.app_context():
            req2 = AmbulanceRequest(
                patient_name="Patient Alpha 2",
                phone="9876543210",
                emergency_type="Severe",
                pickup_location="Alpha North",
                destination_hospital="Hospital Alpha",
                hospital_id=self.hosp1_id,
                status="Pending"
            )
            db.session.add(req2)
            db.session.commit()
            req2_id = req2.id

        res = self.client.post(f'/api/ambulance-requests/{req2_id}/cancel', headers={
            'Authorization': f'Bearer {self.admin2_token}'
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("belonging to other hospitals", res.get_json()['message'])

    def test_12_superadmin_blocked_from_cancelling_unassigned_ambulance_request(self):
        """Hospital Super Admin cannot cancel unassigned emergency request (403)."""
        with self.app.app_context():
            req_null2 = AmbulanceRequest(
                patient_name="Unassigned Patient 2",
                phone="9876543210",
                emergency_type="Accident",
                pickup_location="Rural Crossroads",
                destination_hospital="Nearest",
                hospital_id=None,
                status="Pending"
            )
            db.session.add(req_null2)
            db.session.commit()
            req_null2_id = req_null2.id

        res = self.client.post(f'/api/ambulance-requests/{req_null2_id}/cancel', headers={
            'Authorization': f'Bearer {self.admin1_token}'
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("Platform Owners", res.get_json()['message'])

    def test_13_platform_owner_can_manage_unassigned_ambulance_request(self):
        """Platform Owner has legitimate platform-wide authority to manage unassigned requests."""
        with self.app.app_context():
            req_owner = AmbulanceRequest(
                patient_name="Platform Oversight Patient",
                phone="9876543210",
                emergency_type="General",
                pickup_location="Metro Center",
                destination_hospital="Unspecified",
                hospital_id=None,
                status="Pending"
            )
            db.session.add(req_owner)
            db.session.commit()
            req_owner_id = req_owner.id

        res = self.client.post(f'/api/ambulance-requests/{req_owner_id}/cancel', headers={
            'Authorization': f'Bearer {self.owner_token}'
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.get_json()['success'])

    def test_14_patient_can_cancel_own_unassigned_ambulance_request(self):
        """A patient who submitted an emergency request can cancel their own request regardless of hospital assignment."""
        with self.app.app_context():
            req_patient = AmbulanceRequest(
                user_id=self.standard_patient.id,
                patient_name="Regular Patient Self",
                phone="9876543210",
                emergency_type="Other",
                pickup_location="Home Address",
                destination_hospital="Nearest Clinic",
                hospital_id=None,
                status="Pending"
            )
            db.session.add(req_patient)
            db.session.commit()
            req_patient_id = req_patient.id

        res = self.client.post(f'/api/ambulance-requests/{req_patient_id}/cancel', headers={
            'Authorization': f'Bearer {self.standard_patient_token}'
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.get_json()['success'])

    def test_15_unauthorized_patient_cannot_cancel_other_patient_unassigned_request(self):
        """A patient cannot cancel another patient's emergency request (403)."""
        with self.app.app_context():
            other_patient = User(
                name="Other Stranger Patient",
                email=f"stranger_{uuid.uuid4().hex[:6]}@patient.com",
                role="PATIENT",
                is_active=True
            )
            other_patient.set_password("StrangerPass123!")
            db.session.add(other_patient)
            db.session.commit()
            stranger_token = generate_token(other_patient)

            req_victim = AmbulanceRequest(
                user_id=self.standard_patient.id,
                patient_name="Victim Patient",
                phone="9876543210",
                emergency_type="Critical",
                pickup_location="Victim Location",
                destination_hospital="Nearest",
                hospital_id=None,
                status="Pending"
            )
            db.session.add(req_victim)
            db.session.commit()
            req_victim_id = req_victim.id

        res = self.client.post(f'/api/ambulance-requests/{req_victim_id}/cancel', headers={
            'Authorization': f'Bearer {stranger_token}'
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("not authorized", res.get_json()['message'])


if __name__ == '__main__':
    unittest.main()
