"""
Integration and regression test suite for Step 4.3: Unified Login and Staff Invitation Onboarding.

Verifies:
1. Authentication compatibility and payload format for all 5 roles + legacy ADMIN.
2. Defensive role matching logic (server-authoritative role verification & mismatch detection).
3. Legacy ADMIN isolation (no automatic promotion or hospital access).
4. Staff invitation verification, safe metadata, expiry, revocation, and atomic single-use acceptance.
5. Patient dashboard routing and data isolation compatibility.
"""

import os
import sys
import uuid
import pytest
from datetime import datetime, timedelta, timezone

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from config import Config
from models import db, User, Doctor, Hospital, Specialization, Invitation, AuditLog
from utils.auth_middleware import generate_token, decode_token
from routes.invitations import _generate_crypto_token, _hash_token


@pytest.fixture(scope="module")
def app_and_client():
    db_name = f"test_step4_3_{uuid.uuid4().hex[:8]}.db"
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), db_name)
    Config.DATABASE_URL = f"sqlite:///{db_path}"

    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"

    with app.app_context():
        db.create_all()

        # 1. Specialization
        spec = Specialization(name="Cardiology", slug="cardiology", description="Heart specialist")
        db.session.add(spec)
        db.session.flush()

        # 2. Hospital
        hosp = Hospital(
            name="Apollo General Hospital",
            slug="apollo-general-hospital",
            image="https://example.com/apollo.jpg",
            address="100 Health Way",
            city="Hyderabad",
            state="Telangana",
            emergency_number="108"
        )
        db.session.add(hosp)
        db.session.flush()

        # 3. Platform Owner
        owner = User(
            name="Platform Owner",
            email="owner@mediconnect.com",
            role="PLATFORM_OWNER",
            hospital_id=None,
            is_active=True
        )
        owner.set_password("Owner@123")
        db.session.add(owner)

        # 4. Hospital Super Admin
        super_admin = User(
            name="Apollo Super Admin",
            email="superadmin@apollo.com",
            role="HOSPITAL_SUPER_ADMIN",
            hospital_id=hosp.id,
            is_active=True
        )
        super_admin.set_password("SuperAdmin@123")
        db.session.add(super_admin)

        # 5. Receptionist
        receptionist = User(
            name="Apollo Front Desk",
            email="reception@apollo.com",
            role="RECEPTIONIST",
            hospital_id=hosp.id,
            is_active=True
        )
        receptionist.set_password("Reception@123")
        db.session.add(receptionist)

        # 6. Doctor profile and user
        doc_profile = Doctor(
            name="Dr. Sarah Jenkins",
            image="https://example.com/sarah.jpg",
            specialization_id=spec.id,
            hospital_id=hosp.id,
            qualification="MBBS, MD Cardiology",
            experience=10,
            location="Hyderabad",
            consultation_fee=500.0,
            status="Active"
        )
        db.session.add(doc_profile)
        db.session.flush()

        doctor_user = User(
            name="Dr. Sarah Jenkins",
            email="sarah.jenkins@apollo.com",
            role="DOCTOR",
            hospital_id=hosp.id,
            is_active=True
        )
        doctor_user.set_password("Doctor@123")
        db.session.add(doctor_user)
        db.session.flush()

        doc_profile.user_id = doctor_user.id

        # 7. Unlinked Doctor profile for invitation testing
        unlinked_doc = Doctor(
            name="Dr. Unlinked Specialist",
            image="https://example.com/unlinked.jpg",
            specialization_id=spec.id,
            hospital_id=hosp.id,
            qualification="MBBS, MS",
            experience=8,
            location="Hyderabad",
            consultation_fee=600.0,
            status="Active"
        )
        db.session.add(unlinked_doc)

        # 8. Patient / User
        patient = User(
            name="Jane Patient",
            email="jane.patient@mediconnect.com",
            role="USER",
            hospital_id=None,
            is_active=True
        )
        patient.set_password("Patient@123")
        db.session.add(patient)

        # 9. Legacy Admin
        legacy_admin = User(
            name="Legacy Admin",
            email="legacy.admin@mediconnect.com",
            role="ADMIN",
            hospital_id=None,
            is_active=True
        )
        legacy_admin.set_password("Admin@123")
        db.session.add(legacy_admin)

        db.session.commit()
        hosp_id = hosp.id
        unlinked_doc_id = unlinked_doc.id

    client = app.test_client()
    yield app, client, hosp_id, unlinked_doc_id

    # Teardown
    Config.DATABASE_URL = None
    with app.app_context():
        db.session.remove()
        db.drop_all()
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except OSError:
            pass


# -------------------------------------------------------------------------
# Test Suite 1: Authentication API for All 5 Portals + Legacy ADMIN
# -------------------------------------------------------------------------
class TestUnifiedAuthentication:
    """Verifies that all 5 portals and legacy accounts authenticate through POST /api/auth/login."""

    def test_platform_owner_login(self, app_and_client):
        _, client, _, _ = app_and_client
        res = client.post('/api/auth/login', json={
            'email': 'owner@mediconnect.com',
            'password': 'Owner@123'
        })
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['user']['role'] == 'PLATFORM_OWNER'
        assert data['user']['hospital_id'] is None
        assert 'token' in data

    def test_hospital_super_admin_login(self, app_and_client):
        _, client, hosp_id, _ = app_and_client
        res = client.post('/api/auth/login', json={
            'email': 'superadmin@apollo.com',
            'password': 'SuperAdmin@123'
        })
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['user']['role'] == 'HOSPITAL_SUPER_ADMIN'
        assert data['user']['hospital_id'] == hosp_id
        assert data['user']['hospital_name'] == 'Apollo General Hospital'

    def test_receptionist_login(self, app_and_client):
        _, client, hosp_id, _ = app_and_client
        res = client.post('/api/auth/login', json={
            'email': 'reception@apollo.com',
            'password': 'Reception@123'
        })
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['user']['role'] == 'RECEPTIONIST'
        assert data['user']['hospital_id'] == hosp_id

    def test_doctor_login(self, app_and_client):
        _, client, hosp_id, _ = app_and_client
        res = client.post('/api/auth/login', json={
            'email': 'sarah.jenkins@apollo.com',
            'password': 'Doctor@123'
        })
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['user']['role'] == 'DOCTOR'
        assert data['user']['hospital_id'] == hosp_id

    def test_patient_login(self, app_and_client):
        _, client, _, _ = app_and_client
        res = client.post('/api/auth/login', json={
            'email': 'jane.patient@mediconnect.com',
            'password': 'Patient@123'
        })
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['user']['role'] in ('USER', 'PATIENT')
        assert data['user']['hospital_id'] is None

    def test_legacy_admin_login(self, app_and_client):
        _, client, _, _ = app_and_client
        res = client.post('/api/auth/login', json={
            'email': 'legacy.admin@mediconnect.com',
            'password': 'Admin@123'
        })
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['user']['role'] == 'ADMIN'
        # Legacy admin must not have hospital assigned automatically
        assert data['user']['hospital_id'] is None

    def test_brute_force_login_rate_limiting(self, app_and_client):
        """Verifies that consecutive failed logins trigger 429 Too Many Requests."""
        from utils.rate_limiter import reset_rate_limits
        reset_rate_limits()

        _, client, _, _ = app_and_client
        target_email = f"brute_{uuid.uuid4().hex[:8]}@mediconnect.com"

        # 5 failed attempts
        for _ in range(5):
            res = client.post('/api/auth/login', json={
                'email': target_email,
                'password': 'WrongPassword999'
            })
            assert res.status_code == 401

        # 6th attempt should be blocked by rate limiter
        blocked_res = client.post('/api/auth/login', json={
            'email': target_email,
            'password': 'WrongPassword999'
        })
        assert blocked_res.status_code == 429
        data = blocked_res.get_json()
        assert 'Too many failed login attempts' in data['message']


# -------------------------------------------------------------------------
# Test Suite 2: Defensive Role Matching Validation
# -------------------------------------------------------------------------
class TestRoleMatchingLogic:
    """Simulates the defensive AuthContext / Login matching logic."""

    @staticmethod
    def simulate_role_check(user_raw_role, expected_role):
        def norm(r):
            if not r:
                return None
            u = str(r).strip().upper()
            return 'PATIENT' if u == 'USER' else u

        norm_user = norm(user_raw_role)
        norm_expected = norm(expected_role)

        if user_raw_role == 'ADMIN' and expected_role != 'ADMIN':
            return {
                'match': False,
                'is_legacy_admin': True,
                'message': 'Legacy Administrator account detected. This account has not yet been assigned to a hospital role.'
            }

        if norm_user != norm_expected:
            return {
                'match': False,
                'is_legacy_admin': False,
                'message': f"Account role mismatch: expected {expected_role}, actual {user_raw_role}"
            }

        return {'match': True, 'destination': f"/{'patient' if norm_user == 'PATIENT' else norm_user.lower()}"}

    def test_patient_selecting_doctor_mismatch(self, app_and_client):
        """When a patient credentials are authenticated under DOCTOR tab, access is rejected."""
        _, client, _, _ = app_and_client
        res = client.post('/api/auth/login', json={
            'email': 'jane.patient@mediconnect.com',
            'password': 'Patient@123'
        })
        assert res.status_code == 200
        user_role = res.get_json()['user']['role']

        check = self.simulate_role_check(user_role, expected_role='DOCTOR')
        assert check['match'] is False
        assert 'Account role mismatch' in check['message']

    def test_doctor_selecting_platform_owner_mismatch(self, app_and_client):
        """When a doctor credentials are authenticated under PLATFORM_OWNER tab, access is rejected."""
        _, client, _, _ = app_and_client
        res = client.post('/api/auth/login', json={
            'email': 'sarah.jenkins@apollo.com',
            'password': 'Doctor@123'
        })
        assert res.status_code == 200
        user_role = res.get_json()['user']['role']

        check = self.simulate_role_check(user_role, expected_role='PLATFORM_OWNER')
        assert check['match'] is False
        assert 'Account role mismatch' in check['message']

    def test_legacy_admin_selecting_receptionist_blocked(self, app_and_client):
        """Legacy ADMIN cannot sign in as RECEPTIONIST."""
        _, client, _, _ = app_and_client
        res = client.post('/api/auth/login', json={
            'email': 'legacy.admin@mediconnect.com',
            'password': 'Admin@123'
        })
        assert res.status_code == 200
        user_role = res.get_json()['user']['role']

        check = self.simulate_role_check(user_role, expected_role='RECEPTIONIST')
        assert check['match'] is False
        assert check['is_legacy_admin'] is True

    def test_patient_matching_success(self, app_and_client):
        """Patient credentials under PATIENT tab match successfully."""
        _, client, _, _ = app_and_client
        res = client.post('/api/auth/login', json={
            'email': 'jane.patient@mediconnect.com',
            'password': 'Patient@123'
        })
        user_role = res.get_json()['user']['role']
        check = self.simulate_role_check(user_role, expected_role='PATIENT')
        assert check['match'] is True


# -------------------------------------------------------------------------
# Test Suite 3: Staff Invitation Verification & Acceptance Lifecycle
# -------------------------------------------------------------------------
class TestInvitationOnboardingLifecycle:
    """Verifies GET /api/invitations/verify/<token> and POST /api/invitations/accept."""

    def test_verify_valid_doctor_invitation(self, app_and_client):
        app, client, hosp_id, unlinked_doc_id = app_and_client
        raw_token, token_hash = _generate_crypto_token()

        with app.app_context():
            super_admin = User.query.filter_by(email='superadmin@apollo.com').first()
            inv = Invitation(
                email='dr.new@apollo.com',
                role='DOCTOR',
                hospital_id=hosp_id,
                doctor_profile_id=unlinked_doc_id,
                token_hash=token_hash,
                invited_by_id=super_admin.id,
                expires_at=datetime.now(timezone.utc) + timedelta(days=7)
            )
            db.session.add(inv)
            db.session.commit()

        res = client.get(f'/api/invitations/verify/{raw_token}')
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['invitation']['email'] == 'dr.new@apollo.com'
        assert data['invitation']['role'] == 'DOCTOR'
        assert data['invitation']['hospital_name'] == 'Apollo General Hospital'
        assert data['invitation']['doctor_name'] == 'Dr. Unlinked Specialist'
        assert data['invitation']['requires_password_verification'] is False

    def test_verify_expired_invitation(self, app_and_client):
        app, client, hosp_id, _ = app_and_client
        raw_token, token_hash = _generate_crypto_token()

        with app.app_context():
            super_admin = User.query.filter_by(email='superadmin@apollo.com').first()
            inv = Invitation(
                email='expired.staff@apollo.com',
                role='RECEPTIONIST',
                hospital_id=hosp_id,
                token_hash=token_hash,
                invited_by_id=super_admin.id,
                expires_at=datetime.now(timezone.utc) - timedelta(days=1)  # expired
            )
            db.session.add(inv)
            db.session.commit()

        res = client.get(f'/api/invitations/verify/{raw_token}')
        assert res.status_code == 400
        data = res.get_json()
        assert data['success'] is False
        assert 'expired' in data['message'].lower()

    def test_verify_revoked_invitation(self, app_and_client):
        app, client, hosp_id, _ = app_and_client
        raw_token, token_hash = _generate_crypto_token()

        with app.app_context():
            super_admin = User.query.filter_by(email='superadmin@apollo.com').first()
            inv = Invitation(
                email='revoked.staff@apollo.com',
                role='RECEPTIONIST',
                hospital_id=hosp_id,
                token_hash=token_hash,
                invited_by_id=super_admin.id,
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
                revoked_at=datetime.now(timezone.utc)
            )
            db.session.add(inv)
            db.session.commit()

        res = client.get(f'/api/invitations/verify/{raw_token}')
        assert res.status_code == 400
        data = res.get_json()
        assert data['success'] is False
        assert 'revoked' in data['message'].lower()

    def test_accept_invitation_provisions_account(self, app_and_client):
        app, client, hosp_id, unlinked_doc_id = app_and_client
        raw_token, token_hash = _generate_crypto_token()

        with app.app_context():
            super_admin = User.query.filter_by(email='superadmin@apollo.com').first()
            inv = Invitation(
                email='new.doctor@apollo.com',
                role='DOCTOR',
                hospital_id=hosp_id,
                doctor_profile_id=unlinked_doc_id,
                token_hash=token_hash,
                invited_by_id=super_admin.id,
                expires_at=datetime.now(timezone.utc) + timedelta(days=7)
            )
            db.session.add(inv)
            db.session.commit()

        # Submit acceptance payload
        accept_res = client.post('/api/invitations/accept', json={
            'token': raw_token,
            'name': 'Dr. New Doctor',
            'phone': '+91 98765 11111',
            'password': 'DocPassword@123',
            'confirm_password': 'DocPassword@123'
        })
        assert accept_res.status_code == 201
        data = accept_res.get_json()
        assert data['success'] is True
        assert data['user']['email'] == 'new.doctor@apollo.com'
        assert data['user']['role'] == 'DOCTOR'
        assert data['user']['hospital_id'] == hosp_id

        # Verify doctor profile is linked
        with app.app_context():
            new_user = User.query.filter_by(email='new.doctor@apollo.com').first()
            assert new_user is not None
            doc = db.session.get(Doctor, unlinked_doc_id)
            assert doc.user_id == new_user.id

        # Second acceptance attempt must be rejected (single-use token)
        repeat_res = client.post('/api/invitations/accept', json={
            'token': raw_token,
            'name': 'Dr. Duplicate',
            'password': 'DocPassword@123',
            'confirm_password': 'DocPassword@123'
        })
        assert repeat_res.status_code == 400
        assert 'already been accepted' in repeat_res.get_json()['message'].lower()

    def test_verify_already_accepted_invitation(self, app_and_client):
        """Verifying an already-accepted token returns a clear 400."""
        app, client, hosp_id, _ = app_and_client
        raw_token, token_hash = _generate_crypto_token()

        with app.app_context():
            super_admin = User.query.filter_by(email='superadmin@apollo.com').first()
            inv = Invitation(
                email='used.token@apollo.com',
                role='RECEPTIONIST',
                hospital_id=hosp_id,
                token_hash=token_hash,
                invited_by_id=super_admin.id,
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
                used_at=datetime.now(timezone.utc)
            )
            db.session.add(inv)
            db.session.commit()

        res = client.get(f'/api/invitations/verify/{raw_token}')
        assert res.status_code == 400
        assert 'already been accepted' in res.get_json()['message'].lower()


# -------------------------------------------------------------------------
# Test Suite 4: Patient Dashboard Routing Compatibility
# -------------------------------------------------------------------------
class TestPatientDashboardAccess:
    """Verifies that patient dashboard backend endpoints remain accessible."""

    def test_patient_stats_access(self, app_and_client):
        app, client, _, _ = app_and_client
        with app.app_context():
            patient = User.query.filter_by(email='jane.patient@mediconnect.com').first()
            token = generate_token(patient)

        res = client.get('/api/user/stats', headers={'Authorization': f'Bearer {token}'})
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert 'total_appointments' in data['metrics']

    def test_unauthenticated_dashboard_rejected(self, app_and_client):
        _, client, _, _ = app_and_client
        res = client.get('/api/user/stats')
        assert res.status_code == 401
