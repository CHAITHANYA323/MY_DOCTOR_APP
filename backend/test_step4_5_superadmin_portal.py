"""
Integration and security test suite for Step 4.5: Hospital Super Admin Portal.

Verifies:
1. Hospital Super Admin authenticated access and strict hospital scoping for dashboard metrics.
2. Tenant isolation: Hospital A Super Admin cannot read, modify, or revoke Hospital B resources.
3. RBAC protections: Super Admin cannot invite Super Admins or Platform Owners, nor delete hospitals.
4. SEC-02 & SEC-03 compliance on staff invitations: mandatory same-hospital unlinked doctor profile.
5. Hospital settings management: Super Admin can update their own hospital settings but not other hospitals.
6. Appointments management: Scoped to the authenticated Super Admin's hospital.
"""

import os
import sys
import uuid
import hashlib
import pytest
from datetime import datetime, timedelta, timezone

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from config import Config
from models import db, User, Doctor, Hospital, Specialization, Invitation, Appointment
from utils.auth_middleware import generate_token


@pytest.fixture(scope="module")
def superadmin_test_env():
    db_name = f"test_step4_5_{uuid.uuid4().hex[:8]}.db"
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), db_name)
    Config.DATABASE_URL = f"sqlite:///{db_path}"

    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"

    with app.app_context():
        db.create_all()

        # 1. Hospital A & Hospital B
        hosp_a = Hospital(
            name="Apollo Health City",
            slug="apollo-health-city",
            image="https://example.com/apollo.jpg",
            address="100 Jubilee Hills",
            city="Hyderabad",
            state="Telangana",
            emergency_number="1066",
            phone="040-23607777",
            email="info@apollohealth.com",
            working_hours="24 Hours / 7 Days",
            facilities="ICU, Emergency, Cardiology, Neurology"
        )
        hosp_b = Hospital(
            name="Care Hospital",
            slug="care-hospital",
            image="https://example.com/care.jpg",
            address="200 Banjara Hills",
            city="Hyderabad",
            state="Telangana",
            emergency_number="108",
            phone="040-30418888",
            email="info@carehospitals.com",
            working_hours="24 Hours / 7 Days",
            facilities="ICU, Trauma, General Surgery"
        )
        db.session.add_all([hosp_a, hosp_b])
        db.session.flush()

        # 2. Specialization
        cardio = Specialization(name="Cardiology", slug="cardiology", description="Heart and cardiovascular care")
        ortho = Specialization(name="Orthopedics", slug="orthopedics", description="Bone and joint health")
        db.session.add_all([cardio, ortho])
        db.session.flush()

        # 3. Platform Owner
        owner = User(
            name="Platform Super Owner",
            email="owner@mediconnect.com",
            role="PLATFORM_OWNER",
            hospital_id=None,
            is_active=True
        )
        owner.set_password("OwnerSecure@123")

        # 4. Hospital A Super Admin & Hospital B Super Admin
        sa_a = User(
            name="Super Admin Apollo",
            email="superadmin.a@apollohealth.com",
            role="HOSPITAL_SUPER_ADMIN",
            hospital_id=hosp_a.id,
            is_active=True
        )
        sa_a.set_password("SuperAdminA@123")

        sa_b = User(
            name="Super Admin Care",
            email="superadmin.b@carehospitals.com",
            role="HOSPITAL_SUPER_ADMIN",
            hospital_id=hosp_b.id,
            is_active=True
        )
        sa_b.set_password("SuperAdminB@123")

        # 5. Receptionist for Hospital A
        rec_a = User(
            name="Receptionist Apollo",
            email="receptionist.a@apollohealth.com",
            role="RECEPTIONIST",
            hospital_id=hosp_a.id,
            is_active=True
        )
        rec_a.set_password("ReceptionA@123")

        # 6. Patient User
        patient = User(
            name="Patient John",
            email="patient.john@example.com",
            role="PATIENT",
            hospital_id=None,
            is_active=True
        )
        patient.set_password("PatientPass@123")

        db.session.add_all([owner, sa_a, sa_b, rec_a, patient])
        db.session.flush()

        # 7. Doctors in Hospital A
        doc_a1 = Doctor(
            name="Dr. Apollo Cardio",
            specialization_id=cardio.id,
            hospital_id=hosp_a.id,
            qualification="MBBS, MD Cardiology",
            experience=12,
            consultation_fee=800.0,
            location="Hyderabad",
            image="https://example.com/doc1.jpg"
        )
        # Unlinked Doctor profile in Hospital A
        unlinked_doc_a = Doctor(
            name="Dr. Apollo Unlinked",
            specialization_id=ortho.id,
            hospital_id=hosp_a.id,
            qualification="MBBS, MS Ortho",
            experience=7,
            consultation_fee=600.0,
            location="Hyderabad",
            image="https://example.com/doc2.jpg"
        )
        # Unlinked Doctor profile in Hospital B
        unlinked_doc_b = Doctor(
            name="Dr. Care Unlinked",
            specialization_id=ortho.id,
            hospital_id=hosp_b.id,
            qualification="MBBS, MS Ortho",
            experience=5,
            consultation_fee=500.0,
            location="Hyderabad",
            image="https://example.com/doc3.jpg"
        )
        db.session.add_all([doc_a1, unlinked_doc_a, unlinked_doc_b])
        db.session.flush()

        # Doctor user linked to doc_a1
        doc_user_a1 = User(
            name="Dr. Apollo Cardio",
            email="doc.cardio@apollohealth.com",
            role="DOCTOR",
            hospital_id=hosp_a.id,
            is_active=True
        )
        doc_user_a1.set_password("DoctorPass@123")
        db.session.add(doc_user_a1)
        db.session.flush()

        doc_a1.user_id = doc_user_a1.id

        # 8. Appointments
        appt_a = Appointment(
            user_id=patient.id,
            doctor_id=doc_a1.id,
            hospital_id=hosp_a.id,
            appointment_date="2026-11-20",
            appointment_time="10:00 AM",
            status="Pending",
            reason="Routine Checkup"
        )
        db.session.add(appt_a)
        db.session.flush()

        # 9. Invitations
        exp = datetime.now(timezone.utc) + timedelta(days=7)
        inv_a = Invitation(
            email="pending.nurse@apollohealth.com",
            role="RECEPTIONIST",
            hospital_id=hosp_a.id,
            token_hash=hashlib.sha256("apollo_rec_invite_token_123".encode('utf-8')).hexdigest(),
            invited_by_id=sa_a.id,
            expires_at=exp
        )
        inv_b = Invitation(
            email="pending.care@carehospitals.com",
            role="RECEPTIONIST",
            hospital_id=hosp_b.id,
            token_hash=hashlib.sha256("care_rec_invite_token_456".encode('utf-8')).hexdigest(),
            invited_by_id=sa_b.id,
            expires_at=exp
        )
        db.session.add_all([inv_a, inv_b])
        db.session.commit()

        # Store IDs
        hosp_a_id = hosp_a.id
        hosp_b_id = hosp_b.id
        unlinked_a_id = unlinked_doc_a.id
        unlinked_b_id = unlinked_doc_b.id
        linked_a_id = doc_a1.id
        appt_a_id = appt_a.id
        inv_a_id = inv_a.id
        inv_b_id = inv_b.id
        cardio_id = cardio.id

        tokens = {
            'owner': generate_token(owner),
            'sa_a': generate_token(sa_a),
            'sa_b': generate_token(sa_b),
            'rec_a': generate_token(rec_a),
            'patient': generate_token(patient)
        }

    client = app.test_client()

    yield {
        'client': client,
        'app': app,
        'tokens': tokens,
        'hosp_a_id': hosp_a_id,
        'hosp_b_id': hosp_b_id,
        'unlinked_a_id': unlinked_a_id,
        'unlinked_b_id': unlinked_b_id,
        'linked_a_id': linked_a_id,
        'appt_a_id': appt_a_id,
        'inv_a_id': inv_a_id,
        'inv_b_id': inv_b_id,
        'cardio_id': cardio_id
    }

    # Clean up test database file
    with app.app_context():
        db.session.remove()
        db.drop_all()
        db.engine.dispose()

    Config.DATABASE_URL = None
    try:
        if os.path.exists(db_path):
            os.remove(db_path)
    except Exception:
        pass


# =============================================================================
# 1. DASHBOARD STATS SCOPING & ACCESS
# =============================================================================

def test_super_admin_dashboard_stats_scoped_to_assigned_hospital(superadmin_test_env):
    """Confirm Super Admin A receives stats strictly for Hospital A."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.get('/api/admin/stats', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    metrics = data['metrics']

    # Hospital A has 2 doctors (1 linked + 1 unlinked)
    assert metrics['total_doctors'] == 2
    assert metrics['total_hospitals'] == 1
    assert metrics['total_appointments'] == 1
    assert metrics['pending_appointments'] == 1


def test_super_admin_cross_hospital_isolation_stats(superadmin_test_env):
    """Confirm Hospital B Super Admin sees only Hospital B stats."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_b']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.get('/api/admin/stats', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    metrics = data['metrics']

    # Hospital B has only 1 doctor (unlinked)
    assert metrics['total_doctors'] == 1
    # Hospital B has 0 appointments
    assert metrics['total_appointments'] == 0


def test_unauthorized_roles_blocked_from_superadmin_stats(superadmin_test_env):
    """Confirm Patient cannot access /api/admin/stats."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['patient']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.get('/api/admin/stats', headers=headers)
    assert res.status_code == 403


# =============================================================================
# 2. HOSPITAL SETTINGS MANAGEMENT
# =============================================================================

def test_super_admin_can_update_own_hospital_settings(superadmin_test_env):
    """Super Admin A updates Hospital A phone, helpline, and hours."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    hosp_a_id = superadmin_test_env['hosp_a_id']
    headers = {'Authorization': f'Bearer {token}'}

    payload = {
        'phone': '040-99998888',
        'emergency_number': '1099',
        'working_hours': '24/7 Emergency & ICU',
        'facilities': 'ICU, Emergency, 24/7 Pharmacy, Cath Lab'
    }

    res = client.put(f'/api/hospitals/{hosp_a_id}', json=payload, headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['hospital']['phone'] == '040-99998888'
    assert data['hospital']['emergency_number'] == '1099'


def test_super_admin_cannot_update_other_hospital_settings(superadmin_test_env):
    """Super Admin A cannot modify Hospital B settings (cross-hospital forbidden)."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    hosp_b_id = superadmin_test_env['hosp_b_id']
    headers = {'Authorization': f'Bearer {token}'}

    payload = {'phone': '040-00000000'}
    res = client.put(f'/api/hospitals/{hosp_b_id}', json=payload, headers=headers)
    assert res.status_code == 403
    data = res.get_json()
    assert 'assigned hospital' in data['message'].lower()


def test_unauthorized_roles_cannot_update_hospital_settings(superadmin_test_env):
    """Receptionist and Patient cannot update hospital settings."""
    client = superadmin_test_env['client']
    hosp_a_id = superadmin_test_env['hosp_a_id']

    for role_name in ['rec_a', 'patient']:
        token = superadmin_test_env['tokens'][role_name]
        headers = {'Authorization': f'Bearer {token}'}
        res = client.put(f'/api/hospitals/{hosp_a_id}', json={'phone': '000'}, headers=headers)
        assert res.status_code == 403


def test_super_admin_cannot_delete_hospital(superadmin_test_env):
    """Super Admin cannot delete hospitals (restricted strictly to Platform Owner)."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    hosp_a_id = superadmin_test_env['hosp_a_id']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.delete(f'/api/hospitals/{hosp_a_id}', headers=headers)
    assert res.status_code == 403


# =============================================================================
# 3. STAFF INVITATION MANAGEMENT & SEC-03 CHECKS
# =============================================================================

def test_super_admin_can_invite_receptionist(superadmin_test_env):
    """Super Admin can invite Receptionist to their hospital."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    headers = {'Authorization': f'Bearer {token}'}

    payload = {
        'email': 'new.receptionist@apollohealth.com',
        'role': 'RECEPTIONIST'
    }
    res = client.post('/api/hospital/invitations', json=payload, headers=headers)
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert data['invitation']['role'] == 'RECEPTIONIST'
    assert data['invitation']['hospital_id'] == superadmin_test_env['hosp_a_id']


def test_super_admin_cannot_invite_super_admin_or_owner(superadmin_test_env):
    """Super Admin cannot invite another Super Admin or Platform Owner."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    headers = {'Authorization': f'Bearer {token}'}

    for forbidden_role in ['HOSPITAL_SUPER_ADMIN', 'PLATFORM_OWNER']:
        payload = {
            'email': f'try.{forbidden_role.lower()}@apollohealth.com',
            'role': forbidden_role
        }
        res = client.post('/api/hospital/invitations', json=payload, headers=headers)
        assert res.status_code in (400, 403)


def test_sec03_doctor_invitation_requires_doctor_profile(superadmin_test_env):
    """SEC-03: Inviting a DOCTOR without a doctor_profile_id is rejected."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    headers = {'Authorization': f'Bearer {token}'}

    payload = {
        'email': 'dr.noprofile@apollohealth.com',
        'role': 'DOCTOR'
    }
    res = client.post('/api/hospital/invitations', json=payload, headers=headers)
    assert res.status_code == 400
    data = res.get_json()
    assert 'doctor_profile' in data['message'].lower()


def test_sec03_doctor_invitation_cannot_use_cross_hospital_doctor_profile(superadmin_test_env):
    """SEC-03: Super Admin A cannot invite a doctor using Hospital B's doctor profile."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    unlinked_b_id = superadmin_test_env['unlinked_b_id']
    headers = {'Authorization': f'Bearer {token}'}

    payload = {
        'email': 'dr.stolenprofile@apollohealth.com',
        'role': 'DOCTOR',
        'doctor_profile_id': unlinked_b_id
    }
    res = client.post('/api/hospital/invitations', json=payload, headers=headers)
    assert res.status_code in (400, 403)
    data = res.get_json()
    assert 'another hospital' in data['message'].lower() or 'assigned hospital' in data['message'].lower()


def test_sec03_doctor_invitation_cannot_use_already_linked_doctor_profile(superadmin_test_env):
    """SEC-03: Super Admin cannot invite a doctor using an already linked profile."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    linked_a_id = superadmin_test_env['linked_a_id']
    headers = {'Authorization': f'Bearer {token}'}

    payload = {
        'email': 'dr.alreadylinked@apollohealth.com',
        'role': 'DOCTOR',
        'doctor_profile_id': linked_a_id
    }
    res = client.post('/api/hospital/invitations', json=payload, headers=headers)
    assert res.status_code in (400, 409)


def test_super_admin_can_invite_doctor_with_valid_unlinked_profile(superadmin_test_env):
    """Super Admin A can invite a DOCTOR using Hospital A's unlinked doctor profile."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    unlinked_a_id = superadmin_test_env['unlinked_a_id']
    headers = {'Authorization': f'Bearer {token}'}

    payload = {
        'email': 'dr.validortho@apollohealth.com',
        'role': 'DOCTOR',
        'doctor_profile_id': unlinked_a_id
    }
    res = client.post('/api/hospital/invitations', json=payload, headers=headers)
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert data['invitation']['doctor_profile_id'] == unlinked_a_id


def test_super_admin_can_list_only_own_hospital_invitations(superadmin_test_env):
    """Super Admin A only sees Hospital A invitations."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.get('/api/hospital/invitations', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    invitations = data['invitations']

    for inv in invitations:
        assert inv['hospital_id'] == superadmin_test_env['hosp_a_id']


def test_super_admin_cannot_revoke_other_hospital_invitation(superadmin_test_env):
    """Super Admin A cannot revoke Hospital B's invitation."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    inv_b_id = superadmin_test_env['inv_b_id']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.delete(f'/api/hospital/invitations/{inv_b_id}/revoke', headers=headers)
    assert res.status_code == 403


def test_super_admin_can_revoke_own_hospital_invitation(superadmin_test_env):
    """Super Admin A can revoke Hospital A's invitation."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    inv_a_id = superadmin_test_env['inv_a_id']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.delete(f'/api/hospital/invitations/{inv_a_id}/revoke', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True


# =============================================================================
# 4. DOCTORS & APPOINTMENTS SCOPING
# =============================================================================

def test_super_admin_creates_doctor_forced_to_own_hospital(superadmin_test_env):
    """Creating a doctor profile via Super Admin forces hospital_id to user.hospital_id."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    cardio_id = superadmin_test_env['cardio_id']
    hosp_b_id = superadmin_test_env['hosp_b_id']
    headers = {'Authorization': f'Bearer {token}'}

    # Attempt to supply hospital_id of Hospital B in payload
    payload = {
        'name': 'Dr. Apollo Newcomer',
        'specialization_id': cardio_id,
        'hospital_id': hosp_b_id,
        'qualification': 'MBBS, DNB',
        'experience': 4,
        'consultation_fee': 550.0,
        'location': 'Hyderabad',
        'image': 'https://example.com/newdoc.jpg'
    }

    res = client.post('/api/doctors', json=payload, headers=headers)
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    # Crucial check: Hospital ID MUST be Hospital A, ignoring payload spoofing
    assert data['doctor']['hospital_id'] == superadmin_test_env['hosp_a_id']


def test_super_admin_appointments_scoped_to_assigned_hospital(superadmin_test_env):
    """Super Admin querying /api/appointments only receives appointments for Hospital A."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.get('/api/appointments', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    appointments = data['appointments']
    assert len(appointments) >= 1
    for a in appointments:
        assert a['hospital_id'] == superadmin_test_env['hosp_a_id']


def test_super_admin_can_update_appointment_status(superadmin_test_env):
    """Super Admin can update status of appointments in their own hospital."""
    client = superadmin_test_env['client']
    token = superadmin_test_env['tokens']['sa_a']
    appt_a_id = superadmin_test_env['appt_a_id']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.put(f'/api/appointments/{appt_a_id}', json={'status': 'Confirmed'}, headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['appointment']['status'] == 'Confirmed'
