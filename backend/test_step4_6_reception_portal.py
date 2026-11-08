"""
Integration and security test suite for Step 4.6: Hospital Admin / Reception Portal (/admin/*).

Verifies:
1. Receptionist authenticated access to own hospital dashboard and live queues.
2. Cross-hospital isolation: Receptionist cannot access, check in, or modify appointments of other hospitals.
3. Patient privacy: Receptionist cannot access patient records or consultation history of other hospitals.
4. Reception appointment check-in (Confirmed) and cancellation workflows.
5. Inability to mark appointments Completed (clinical boundary reserved for Doctors/Super Admins).
6. Inability to update hospital operational settings or delete hospitals.
7. Inability to invite or manage staff (restricted strictly to Super Admins and Platform Owners).
8. Patient registration with input validation and duplicate conflict handling.
9. Appointment booking strictly scoped to the Receptionist's assigned hospital.
10. Strict RBAC blocking of unauthorized roles (Patient, Doctor, unauthenticated) from reception operations.
"""

import os
import sys
import uuid
import pytest
from datetime import datetime, date, timedelta, timezone

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from config import Config
from models import db, User, Doctor, Hospital, Specialization, Appointment, Invitation
from utils.auth_middleware import generate_token


@pytest.fixture(scope="module")
def reception_test_env():
    db_name = f"test_step4_6_{uuid.uuid4().hex[:8]}.db"
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), db_name)
    Config.DATABASE_URL = f"sqlite:///{db_path}"

    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"

    with app.app_context():
        db.create_all()

        # 1. Hospitals A & B
        hosp_a = Hospital(
            name="City Care Hospital",
            slug="city-care-hospital",
            image="https://example.com/citycare.jpg",
            address="123 Hospital Road",
            city="Hyderabad",
            state="Telangana",
            emergency_number="108",
            phone="040-11112222",
            email="info@citycare.com"
        )
        hosp_b = Hospital(
            name="Metro Life Hospital",
            slug="metro-life-hospital",
            image="https://example.com/metrolife.jpg",
            address="456 Metro Ave",
            city="Hyderabad",
            state="Telangana",
            emergency_number="102",
            phone="040-33334444",
            email="info@metrolife.com"
        )
        db.session.add_all([hosp_a, hosp_b])
        db.session.flush()

        # 2. Specializations
        gen_med = Specialization(name="General Medicine", slug="general-medicine", description="Primary care")
        pedia = Specialization(name="Pediatrics", slug="pediatrics", description="Child healthcare")
        db.session.add_all([gen_med, pedia])
        db.session.flush()

        # 3. Receptionists for Hospital A & B
        rec_a = User(
            name="Receptionist Priya",
            email="priya.reception@citycare.com",
            role="RECEPTIONIST",
            hospital_id=hosp_a.id,
            is_active=True
        )
        rec_a.set_password("ReceptionA@123")

        rec_b = User(
            name="Receptionist Rahul",
            email="rahul.reception@metrolife.com",
            role="RECEPTIONIST",
            hospital_id=hosp_b.id,
            is_active=True
        )
        rec_b.set_password("ReceptionB@123")

        # 4. Hospital Super Admin
        sa_a = User(
            name="Super Admin CityCare",
            email="admin@citycare.com",
            role="HOSPITAL_SUPER_ADMIN",
            hospital_id=hosp_a.id,
            is_active=True
        )
        sa_a.set_password("SuperAdminA@123")

        # 5. Doctor in Hospital A and Doctor in Hospital B
        doc_a = Doctor(
            name="Dr. Anita Sharma",
            specialization_id=gen_med.id,
            hospital_id=hosp_a.id,
            qualification="MBBS, MD",
            experience=10,
            consultation_fee=600.0,
            location="Hyderabad",
            image="https://example.com/doc_a.jpg"
        )
        doc_b = Doctor(
            name="Dr. Vikram Rao",
            specialization_id=pedia.id,
            hospital_id=hosp_b.id,
            qualification="MBBS, DCH",
            experience=8,
            consultation_fee=700.0,
            location="Hyderabad",
            image="https://example.com/doc_b.jpg"
        )
        db.session.add_all([rec_a, rec_b, sa_a, doc_a, doc_b])
        db.session.flush()

        # Doctor user for doc_a
        doc_user_a = User(
            name="Dr. Anita Sharma",
            email="anita.doc@citycare.com",
            role="DOCTOR",
            hospital_id=hosp_a.id,
            is_active=True
        )
        doc_user_a.set_password("DocPass@123")
        db.session.add(doc_user_a)
        db.session.flush()
        doc_a.user_id = doc_user_a.id

        # 6. Patients
        patient_a = User(
            name="Patient Sneha",
            email="sneha.patient@example.com",
            phone="9876500001",
            role="PATIENT",
            is_active=True
        )
        patient_a.set_password("PatientPass@123")

        patient_b = User(
            name="Patient Tarun",
            email="tarun.patient@example.com",
            phone="9876500002",
            role="PATIENT",
            is_active=True
        )
        patient_b.set_password("PatientPass@123")

        db.session.add_all([patient_a, patient_b])
        db.session.flush()

        # 7. Appointments:
        # Appt A1: In Hospital A for Patient A (Today, Pending)
        today_str = date.today().isoformat()
        appt_a1 = Appointment(
            user_id=patient_a.id,
            doctor_id=doc_a.id,
            hospital_id=hosp_a.id,
            appointment_date=today_str,
            appointment_time="10:00 AM",
            status="Pending",
            reason="High Fever and Cough"
        )
        # Appt B1: In Hospital B for Patient B (Today, Pending)
        appt_b1 = Appointment(
            user_id=patient_b.id,
            doctor_id=doc_b.id,
            hospital_id=hosp_b.id,
            appointment_date=today_str,
            appointment_time="11:30 AM",
            status="Pending",
            reason="Routine Pediatric Checkup"
        )
        db.session.add_all([appt_a1, appt_b1])
        db.session.commit()

        # IDs
        hosp_a_id = hosp_a.id
        hosp_b_id = hosp_b.id
        doc_a_id = doc_a.id
        doc_b_id = doc_b.id
        patient_a_id = patient_a.id
        patient_b_id = patient_b.id
        appt_a1_id = appt_a1.id
        appt_b1_id = appt_b1.id

        tokens = {
            'rec_a': generate_token(rec_a),
            'rec_b': generate_token(rec_b),
            'sa_a': generate_token(sa_a),
            'doc_a': generate_token(doc_user_a),
            'patient_a': generate_token(patient_a)
        }

    client = app.test_client()

    yield {
        'client': client,
        'app': app,
        'tokens': tokens,
        'hosp_a_id': hosp_a_id,
        'hosp_b_id': hosp_b_id,
        'doc_a_id': doc_a_id,
        'doc_b_id': doc_b_id,
        'patient_a_id': patient_a_id,
        'patient_b_id': patient_b_id,
        'appt_a1_id': appt_a1_id,
        'appt_b1_id': appt_b1_id,
        'today_str': today_str
    }

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
# 1. RECEPTION DASHBOARD & STATS ACCESS
# =============================================================================

def test_receptionist_can_access_own_reception_dashboard(reception_test_env):
    """Receptionist A can access /api/reception/stats scoped to Hospital A."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.get('/api/reception/stats', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['hospital_id'] == reception_test_env['hosp_a_id']
    metrics = data['metrics']
    assert metrics['today_appointments'] == 1
    assert metrics['pending_checkins'] == 1
    assert metrics['checked_in'] == 0


def test_receptionist_cross_hospital_dashboard_isolation(reception_test_env):
    """Receptionist B accesses /api/reception/stats scoped strictly to Hospital B."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_b']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.get('/api/reception/stats', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['hospital_id'] == reception_test_env['hosp_b_id']
    assert data['metrics']['today_appointments'] == 1


def test_unauthorized_roles_blocked_from_reception_stats(reception_test_env):
    """Patients and Doctors cannot access reception front desk statistics."""
    client = reception_test_env['client']

    for role_key in ['patient_a', 'doc_a']:
        token = reception_test_env['tokens'][role_key]
        res = client.get('/api/reception/stats', headers={'Authorization': f'Bearer {token}'})
        assert res.status_code == 403


# =============================================================================
# 2. APPOINTMENT QUEUES & CROSS-HOSPITAL ISOLATION
# =============================================================================

def test_receptionist_can_view_own_hospital_appointments(reception_test_env):
    """Receptionist A only retrieves Hospital A appointments from /api/appointments."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.get('/api/appointments', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    for appt in data['appointments']:
        assert appt['hospital_id'] == reception_test_env['hosp_a_id']


def test_receptionist_cannot_access_other_hospital_appointments(reception_test_env):
    """Receptionist A cannot inspect Hospital B appointment details (403 Forbidden)."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    appt_b1_id = reception_test_env['appt_b1_id']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.get(f'/api/appointments/{appt_b1_id}', headers=headers)
    assert res.status_code == 403
    data = res.get_json()
    assert 'unauthorized' in data['message'].lower()


def test_receptionist_cannot_modify_other_hospital_appointment(reception_test_env):
    """Receptionist A cannot check in or cancel Hospital B appointments."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    appt_b1_id = reception_test_env['appt_b1_id']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.put(f'/api/appointments/{appt_b1_id}', json={'status': 'Confirmed'}, headers=headers)
    assert res.status_code == 403
    data = res.get_json()
    assert 'cross-hospital' in data['message'].lower()


def test_receptionist_can_checkin_own_hospital_appointment(reception_test_env):
    """Receptionist A can check in (status 'Confirmed') Hospital A appointments."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    appt_a1_id = reception_test_env['appt_a1_id']
    headers = {'Authorization': f'Bearer {token}'}

    payload = {'status': 'Confirmed', 'notes': 'Patient arrived and seated in waiting area.'}
    res = client.put(f'/api/appointments/{appt_a1_id}', json=payload, headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['appointment']['status'] == 'Confirmed'
    assert 'seated in waiting area' in data['appointment']['notes']


def test_receptionist_cannot_mark_appointment_completed(reception_test_env):
    """Receptionist cannot mark consultations as 'Completed' (clinical boundary)."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    appt_a1_id = reception_test_env['appt_a1_id']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.put(f'/api/appointments/{appt_a1_id}', json={'status': 'Completed'}, headers=headers)
    assert res.status_code == 403
    data = res.get_json()
    assert 'receptionists can only confirm' in data['message'].lower()


def test_receptionist_can_cancel_own_hospital_appointment(reception_test_env):
    """Receptionist can cancel an appointment at their own hospital."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    appt_a1_id = reception_test_env['appt_a1_id']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.put(f'/api/appointments/{appt_a1_id}', json={'status': 'Cancelled'}, headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['appointment']['status'] == 'Cancelled'


# =============================================================================
# 3. PATIENT DIRECTORY & PRIVACY PROTECTION
# =============================================================================

def test_receptionist_patient_directory_scoped_to_own_hospital(reception_test_env):
    """Receptionist A only sees patients who have appointment history at Hospital A."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.get('/api/reception/patients', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    patient_ids = [p['id'] for p in data['patients']]

    # Patient A (visited Hospital A) must be present
    assert reception_test_env['patient_a_id'] in patient_ids
    # Patient B (visited ONLY Hospital B) must NOT be present
    assert reception_test_env['patient_b_id'] not in patient_ids


def test_receptionist_can_view_patient_records_of_own_hospital(reception_test_env):
    """Receptionist A can view details of Patient A who has appointment at Hospital A."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    patient_a_id = reception_test_env['patient_a_id']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.get(f'/api/reception/patients/{patient_a_id}', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['patient']['id'] == patient_a_id
    assert 'appointments' in data['patient']


def test_receptionist_cannot_access_another_hospitals_patient_records(reception_test_env):
    """Receptionist A cannot access Patient B details who only visited Hospital B (403 Forbidden)."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    patient_b_id = reception_test_env['patient_b_id']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.get(f'/api/reception/patients/{patient_b_id}', headers=headers)
    assert res.status_code == 403
    data = res.get_json()
    assert 'other hospitals' in data['message'].lower() or 'access denied' in data['message'].lower()


# =============================================================================
# 4. PATIENT REGISTRATION & DUPLICATE PROTECTION
# =============================================================================

def test_receptionist_patient_registration_valid_data(reception_test_env):
    """Receptionist can register a new walk-in patient."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    headers = {'Authorization': f'Bearer {token}'}

    payload = {
        'name': 'Walkin Patient Meera',
        'email': 'meera.walkin@example.com',
        'phone': '9876599999',
        'password': 'MeeraPass@123'
    }

    res = client.post('/api/reception/patients', json=payload, headers=headers)
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert data['patient']['name'] == 'Walkin Patient Meera'
    assert data['patient']['role'] == 'PATIENT'


def test_receptionist_patient_registration_duplicate_email_rejected(reception_test_env):
    """Registering a patient with an existing email returns 409 Conflict."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    headers = {'Authorization': f'Bearer {token}'}

    payload = {
        'name': 'Duplicate Patient',
        'email': 'meera.walkin@example.com',  # Already created above
        'phone': '9876588888'
    }

    res = client.post('/api/reception/patients', json=payload, headers=headers)
    assert res.status_code == 409
    data = res.get_json()
    assert 'already exists' in data['message'].lower()


def test_receptionist_patient_registration_invalid_data_rejected(reception_test_env):
    """Invalid email, short name, or invalid phone are rejected with 400 Bad Request."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    headers = {'Authorization': f'Bearer {token}'}

    # 1. Invalid email
    res1 = client.post('/api/reception/patients', json={'name': 'Valid Name', 'email': 'not-an-email', 'phone': '9876543210'}, headers=headers)
    assert res1.status_code == 400

    # 2. Short name
    res2 = client.post('/api/reception/patients', json={'name': 'A', 'email': 'valid@test.com', 'phone': '9876543210'}, headers=headers)
    assert res2.status_code == 400

    # 3. Invalid phone
    res3 = client.post('/api/reception/patients', json={'name': 'Valid Name', 'email': 'valid2@test.com', 'phone': '123'}, headers=headers)
    assert res3.status_code == 400


# =============================================================================
# 5. RECEPTION APPOINTMENT BOOKING & SCOPING
# =============================================================================

def test_receptionist_can_book_appointment_for_own_hospital_doctor(reception_test_env):
    """Receptionist A books an appointment for Patient A with Doctor A."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    doc_a_id = reception_test_env['doc_a_id']
    patient_a_id = reception_test_env['patient_a_id']
    hosp_a_id = reception_test_env['hosp_a_id']
    headers = {'Authorization': f'Bearer {token}'}

    booking_date = (date.today() + timedelta(days=2)).isoformat()
    payload = {
        'patient_id': patient_a_id,
        'doctor_id': doc_a_id,
        'appointment_date': booking_date,
        'appointment_time': '02:00 PM',
        'reason': 'Follow-up blood test evaluation'
    }

    res = client.post('/api/appointments', json=payload, headers=headers)
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert data['appointment']['hospital_id'] == hosp_a_id
    assert data['appointment']['user_id'] == patient_a_id


def test_receptionist_cannot_book_appointment_for_other_hospital_doctor(reception_test_env):
    """Receptionist A cannot book appointments with Doctor B belonging to Hospital B (403 Forbidden)."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    doc_b_id = reception_test_env['doc_b_id']
    patient_a_id = reception_test_env['patient_a_id']
    headers = {'Authorization': f'Bearer {token}'}

    booking_date = (date.today() + timedelta(days=2)).isoformat()
    payload = {
        'patient_id': patient_a_id,
        'doctor_id': doc_b_id,
        'appointment_date': booking_date,
        'appointment_time': '03:00 PM',
        'reason': 'Attempting cross-hospital booking'
    }

    res = client.post('/api/appointments', json=payload, headers=headers)
    assert res.status_code == 403
    data = res.get_json()
    assert 'assigned hospital' in data['message'].lower()


def test_receptionist_cannot_spoof_hospital_id_in_booking(reception_test_env):
    """Receptionist A passing hospital_id of Hospital B is overridden by server identity."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    doc_a_id = reception_test_env['doc_a_id']
    patient_a_id = reception_test_env['patient_a_id']
    hosp_a_id = reception_test_env['hosp_a_id']
    hosp_b_id = reception_test_env['hosp_b_id']
    headers = {'Authorization': f'Bearer {token}'}

    booking_date = (date.today() + timedelta(days=3)).isoformat()
    payload = {
        'patient_id': patient_a_id,
        'doctor_id': doc_a_id,
        'hospital_id': hosp_b_id,  # Malicious attempt to spoof hospital
        'appointment_date': booking_date,
        'appointment_time': '04:00 PM',
        'reason': 'Testing hospital_id spoofing prevention'
    }

    res = client.post('/api/appointments', json=payload, headers=headers)
    assert res.status_code == 201
    data = res.get_json()
    # Confirms server strictly forced hospital_id to Hospital A
    assert data['appointment']['hospital_id'] == hosp_a_id


# =============================================================================
# 6. RESTRICTED OPERATIONS: SETTINGS & STAFF MANAGEMENT
# =============================================================================

def test_receptionist_cannot_modify_hospital_settings(reception_test_env):
    """Receptionist cannot modify hospital settings (403 Forbidden)."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    hosp_a_id = reception_test_env['hosp_a_id']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.put(f'/api/hospitals/{hosp_a_id}', json={'phone': '040-00000000'}, headers=headers)
    assert res.status_code == 403
    data = res.get_json()
    assert 'insufficient permissions' in data['message'].lower() or 'access denied' in data['message'].lower()


def test_receptionist_cannot_invite_staff(reception_test_env):
    """Receptionist cannot issue staff invitations (403 Forbidden)."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    headers = {'Authorization': f'Bearer {token}'}

    payload = {'email': 'hacker@example.com', 'role': 'RECEPTIONIST'}
    res = client.post('/api/hospital/invitations', json=payload, headers=headers)
    assert res.status_code == 403


def test_receptionist_cannot_access_staff_user_list(reception_test_env):
    """Receptionist cannot access staff list via /api/auth/users (403 Forbidden)."""
    client = reception_test_env['client']
    token = reception_test_env['tokens']['rec_a']
    headers = {'Authorization': f'Bearer {token}'}

    res = client.get('/api/auth/users', headers=headers)
    assert res.status_code == 403
