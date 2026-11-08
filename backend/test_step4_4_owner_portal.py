"""
Integration and security test suite for Step 4.4: Platform Owner Portal.

Verifies:
1. Platform Owner authorized access to all owner-level endpoints.
2. Strict RBAC blocking for all unauthorized roles (Hospital Super Admin, Receptionist, Doctor, Patient, Legacy Admin).
3. Hospital onboarding with atomic initial Super Admin invitation generation.
4. Platform-wide invitation governance and revocation.
5. Platform audit log retrieval and filtering with sensitive data suppression.
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
from utils.auth_middleware import generate_token


@pytest.fixture(scope="module")
def owner_test_env():
    db_name = f"test_step4_4_{uuid.uuid4().hex[:8]}.db"
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), db_name)
    Config.DATABASE_URL = f"sqlite:///{db_path}"

    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"

    with app.app_context():
        db.create_all()

        # 1. Existing Hospital
        hosp = Hospital(
            name="Global Med Center",
            slug="global-med-center",
            image="https://example.com/med.jpg",
            address="500 Healthcare Blvd",
            city="Hyderabad",
            state="Telangana",
            emergency_number="108"
        )
        db.session.add(hosp)
        db.session.flush()

        # 2. Platform Owner
        owner = User(
            name="Root Platform Owner",
            email="root.owner@mediconnect.com",
            role="PLATFORM_OWNER",
            hospital_id=None,
            is_active=True
        )
        owner.set_password("OwnerPassword@123")
        db.session.add(owner)

        # 3. Hospital Super Admin
        super_admin = User(
            name="Hospital Super Admin",
            email="admin@globalmed.com",
            role="HOSPITAL_SUPER_ADMIN",
            hospital_id=hosp.id,
            is_active=True
        )
        super_admin.set_password("AdminPass@123")
        db.session.add(super_admin)

        # 4. Receptionist
        receptionist = User(
            name="Front Desk Staff",
            email="reception@globalmed.com",
            role="RECEPTIONIST",
            hospital_id=hosp.id,
            is_active=True
        )
        receptionist.set_password("ReceptionPass@123")
        db.session.add(receptionist)

        # 5. Doctor
        doc_user = User(
            name="Dr. Specialist",
            email="doctor@globalmed.com",
            role="DOCTOR",
            hospital_id=hosp.id,
            is_active=True
        )
        doc_user.set_password("DocPass@123")
        db.session.add(doc_user)

        # 6. Patient / User
        patient = User(
            name="Regular Patient",
            email="patient@example.com",
            role="USER",
            hospital_id=None,
            is_active=True
        )
        patient.set_password("PatientPass@123")
        db.session.add(patient)

        # 7. Legacy Admin
        legacy_admin = User(
            name="Legacy Administrator",
            email="legacy@medicare.com",
            role="ADMIN",
            hospital_id=None,
            is_active=True
        )
        legacy_admin.set_password("LegacyPass@123")
        db.session.add(legacy_admin)

        db.session.commit()

        # Extract IDs and tokens
        owner_token = generate_token(owner)
        superadmin_token = generate_token(super_admin)
        receptionist_token = generate_token(receptionist)
        doctor_token = generate_token(doc_user)
        patient_token = generate_token(patient)
        legacy_admin_token = generate_token(legacy_admin)
        hosp_id = hosp.id

    client = app.test_client()

    tokens = {
        'owner': owner_token,
        'superadmin': superadmin_token,
        'receptionist': receptionist_token,
        'doctor': doctor_token,
        'patient': patient_token,
        'legacy_admin': legacy_admin_token,
    }

    yield app, client, tokens, hosp_id

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
# Test Suite 1: Platform Owner Authorized Access
# -------------------------------------------------------------------------
class TestPlatformOwnerAuthorizedAccess:
    """Verifies that PLATFORM_OWNER has access to all owner-level endpoints."""

    def test_owner_stats_access(self, owner_test_env):
        _, client, tokens, _ = owner_test_env
        res = client.get('/api/admin/stats', headers={'Authorization': f"Bearer {tokens['owner']}"})
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert 'total_hospitals' in data['metrics']
        assert 'total_doctors' in data['metrics']
        assert 'total_users' in data['metrics']

    def test_owner_invitations_listing_global_scope(self, owner_test_env):
        _, client, tokens, _ = owner_test_env
        res = client.get('/api/hospital/invitations', headers={'Authorization': f"Bearer {tokens['owner']}"})
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert 'invitations' in data

    def test_owner_audit_logs_access(self, owner_test_env):
        _, client, tokens, _ = owner_test_env
        res = client.get('/api/platform/audit-logs', headers={'Authorization': f"Bearer {tokens['owner']}"})
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert 'logs' in data


# -------------------------------------------------------------------------
# Test Suite 2: Unauthorized Roles Blocked from Platform Owner Endpoints
# -------------------------------------------------------------------------
class TestUnauthorizedRolesBlocked:
    """Verifies that NO non-owner role can access Platform Owner endpoints."""

    @pytest.mark.parametrize("role_name", [
        'superadmin', 'receptionist', 'doctor', 'patient', 'legacy_admin'
    ])
    def test_unauthorized_blocked_from_hospital_creation(self, owner_test_env, role_name):
        _, client, tokens, _ = owner_test_env
        res = client.post(
            '/api/platform/hospitals',
            headers={'Authorization': f"Bearer {tokens[role_name]}"},
            json={
                'name': 'Intruder Hospital',
                'address': '123 Fake St',
                'city': 'Hyderabad',
                'emergency_number': '108',
                'admin_email': 'intruder@test.com'
            }
        )
        assert res.status_code == 403
        data = res.get_json()
        assert data['success'] is False

    @pytest.mark.parametrize("role_name", [
        'superadmin', 'receptionist', 'doctor', 'patient', 'legacy_admin'
    ])
    def test_unauthorized_blocked_from_platform_invitations(self, owner_test_env, role_name):
        _, client, tokens, hosp_id = owner_test_env
        res = client.post(
            '/api/platform/invitations',
            headers={'Authorization': f"Bearer {tokens[role_name]}"},
            json={
                'hospital_id': hosp_id,
                'email': 'escalate@test.com',
                'role': 'HOSPITAL_SUPER_ADMIN'
            }
        )
        assert res.status_code == 403
        assert res.get_json()['success'] is False

    @pytest.mark.parametrize("role_name", [
        'superadmin', 'receptionist', 'doctor', 'patient', 'legacy_admin'
    ])
    def test_unauthorized_blocked_from_audit_logs(self, owner_test_env, role_name):
        _, client, tokens, _ = owner_test_env
        res = client.get(
            '/api/platform/audit-logs',
            headers={'Authorization': f"Bearer {tokens[role_name]}"}
        )
        assert res.status_code == 403
        assert res.get_json()['success'] is False

    def test_unauthenticated_blocked(self, owner_test_env):
        _, client, _, _ = owner_test_env
        res = client.get('/api/platform/audit-logs')
        assert res.status_code == 401


# -------------------------------------------------------------------------
# Test Suite 3: Hospital Onboarding and Super Admin Invitation
# -------------------------------------------------------------------------
class TestHospitalOnboardingWithAdmin:
    """Verifies atomic creation of hospital and Super Admin invitation."""

    def test_create_hospital_success(self, owner_test_env):
        _, client, tokens, _ = owner_test_env
        res = client.post(
            '/api/platform/hospitals',
            headers={'Authorization': f"Bearer {tokens['owner']}"},
            json={
                'name': 'Sunshine Multi-Speciality Hospital',
                'address': '789 Sunrise Avenue',
                'city': 'Secunderabad',
                'state': 'Telangana',
                'emergency_number': '108',
                'facilities': 'ICU, Trauma, Pharmacy',
                'admin_email': 'superadmin@sunshine.com',
                'admin_name': 'Dr. Sunshine Admin'
            }
        )
        assert res.status_code == 201
        data = res.get_json()
        assert data['success'] is True
        assert data['hospital']['name'] == 'Sunshine Multi-Speciality Hospital'
        assert data['hospital']['city'] == 'Secunderabad'
        assert data['invitation']['role'] == 'HOSPITAL_SUPER_ADMIN'
        assert data['invitation']['email'] == 'superadmin@sunshine.com'
        assert 'token' in data['invitation']
        assert data['invitation']['invite_link'].startswith('/invite/accept/')

    def test_create_hospital_cross_hospital_staff_rejected(self, owner_test_env):
        """SEC-02: Target email already assigned to another hospital must be rejected."""
        _, client, tokens, _ = owner_test_env
        res = client.post(
            '/api/platform/hospitals',
            headers={'Authorization': f"Bearer {tokens['owner']}"},
            json={
                'name': 'Conflict Hospital',
                'address': '100 Conflict Way',
                'city': 'Warangal',
                'emergency_number': '108',
                'admin_email': 'admin@globalmed.com'  # Already assigned to Global Med Center
            }
        )
        assert res.status_code == 403
        assert 'already assigned to another hospital' in res.get_json()['message']

    def test_create_hospital_duplicate_name_city_rejected(self, owner_test_env):
        """Duplicate hospital in same city rejected."""
        _, client, tokens, _ = owner_test_env
        res = client.post(
            '/api/platform/hospitals',
            headers={'Authorization': f"Bearer {tokens['owner']}"},
            json={
                'name': 'Global Med Center',
                'address': 'Different Address',
                'city': 'Hyderabad',
                'emergency_number': '108',
                'admin_email': 'new.admin@test.com'
            }
        )
        assert res.status_code == 409
        assert 'already exists' in res.get_json()['message']


# -------------------------------------------------------------------------
# Test Suite 4: Super Admin Invitation Governance and Revocation
# -------------------------------------------------------------------------
class TestSuperAdminInvitationGovernance:
    """Verifies listing and revoking platform-scoped invitations."""

    def test_issue_and_revoke_platform_invitation(self, owner_test_env):
        _, client, tokens, hosp_id = owner_test_env

        # 1. Issue invitation for existing hospital
        issue_res = client.post(
            '/api/platform/invitations',
            headers={'Authorization': f"Bearer {tokens['owner']}"},
            json={
                'hospital_id': hosp_id,
                'email': 'second.admin@globalmed.com',
                'role': 'HOSPITAL_SUPER_ADMIN'
            }
        )
        assert issue_res.status_code == 201
        inv_id = issue_res.get_json()['invitation']['id']

        # 2. Revoke invitation
        revoke_res = client.delete(
            f'/api/hospital/invitations/{inv_id}/revoke',
            headers={'Authorization': f"Bearer {tokens['owner']}"}
        )
        assert revoke_res.status_code == 200
        assert revoke_res.get_json()['success'] is True

        # 3. Double revocation rejected
        repeat_revoke = client.delete(
            f'/api/hospital/invitations/{inv_id}/revoke',
            headers={'Authorization': f"Bearer {tokens['owner']}"}
        )
        assert repeat_revoke.status_code == 400
        assert 'already revoked' in repeat_revoke.get_json()['message'].lower()


# -------------------------------------------------------------------------
# Test Suite 5: Platform Audit Logs API
# -------------------------------------------------------------------------
class TestPlatformAuditLogsAPI:
    """Verifies that platform audit events are recorded and queryable by owner."""

    def test_audit_logs_contain_recorded_events(self, owner_test_env):
        _, client, tokens, _ = owner_test_env
        res = client.get(
            '/api/platform/audit-logs',
            headers={'Authorization': f"Bearer {tokens['owner']}"}
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert isinstance(data['logs'], list)

        # Check schema of audit log entries (no sensitive keys)
        if len(data['logs']) > 0:
            log = data['logs'][0]
            assert 'action' in log
            assert 'resource_type' in log
            assert 'created_at' in log
            assert 'password' not in log
            assert 'token_hash' not in log
            assert 'secret' not in log

    def test_audit_logs_action_filter(self, owner_test_env):
        _, client, tokens, _ = owner_test_env
        res = client.get(
            '/api/platform/audit-logs?action=INVITATION_CREATE',
            headers={'Authorization': f"Bearer {tokens['owner']}"}
        )
        assert res.status_code == 200
        data = res.get_json()
        for log in data['logs']:
            assert 'INVITATION_CREATE' in log['action']
