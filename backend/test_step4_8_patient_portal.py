"""
Integration and security test suite for Step 4.8: User / Patient Portal (/patient/*).

Verifies:
1. Standard PATIENT role authenticated access to personal dashboard and stats (/api/patient/stats).
2. Legacy USER role backward compatibility on patient portal endpoints.
3. IDOR Defense: Patient A attempting to view Patient B's appointment details receives 403 Forbidden.
4. IDOR Defense: Patient A attempting to cancel Patient B's appointment receives 403 Forbidden.
5. Patient appointment scoping: /api/patient/appointments returns only the caller's appointments.
6. Clinical records access: Patient can view their own completed consultations & doctor notes.
7. Clinical notes immutability: Patients cannot modify doctor notes, diagnosis, or prescription (403/400).
8. Booking workflow:
   - Patient can book an appointment with a valid doctor.
   - Spoofed patient_id / user_id in booking payload is rejected or forced to caller's own ID.
   - Spoofed hospital_id is overridden to the doctor's true hospital_id.
   - Slot conflict detection prevents double booking (409 Conflict).
9. Appointment cancellation workflow:
   - Patient can cancel their own pending/confirmed appointment.
   - Patient cannot cancel an already completed consultation (400 Bad Request).
   - Patient cannot cancel an already cancelled appointment (400 Bad Request).
10. Account deactivation security:
    - Inactive patient account receives 403 Forbidden on protected endpoints.
11. Privilege escalation defense:
    - Patient cannot alter their role to PLATFORM_OWNER or HOSPITAL_SUPER_ADMIN.
    - Patient cannot access Receptionist, Super Admin, Platform Owner, or Doctor-only APIs.
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
from models import db, User, Doctor, Hospital, Specialization, Appointment, AmbulanceRequest
from utils.auth_middleware import generate_token


@pytest.fixture(scope="module")
def patient_test_env():
    db_name = f"test_step4_8_{uuid.uuid4().hex[:8]}.db"
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), db_name)
    Config.DATABASE_URL = f"sqlite:///{db_path}"

    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"

    with app.app_context():
        db.create_all()

        # 1. Hospital & Specialization
        hosp = Hospital(
            name="Care Hospital",
            slug="care-hospital",
            image="https://example.com/care.jpg",
            address="77 Health Boulevard",
            city="Hyderabad",
            state="Telangana",
            emergency_number="108",
            phone="040-55556666",
            email="info@carehospital.com"
        )
        db.session.add(hosp)
        db.session.commit()

        spec = Specialization(
            name="General Medicine",
            slug="general-medicine",
            description="Primary care and general physician consultation"
        )
        db.session.add(spec)
        db.session.commit()

        # 2. Doctors
        doc1 = Doctor(
            name="Dr. Alok Nath",
            gender="Male",
            image="https://example.com/alok.jpg",
            qualification="MBBS, MD Internal Medicine",
            experience=15,
            specialization_id=spec.id,
            hospital_id=hosp.id,
            location="OPD Room 101",
            phone="+91 98765 33333",
            email="alok.nath@carehospital.com",
            consultation_fee=500.0,
            available_days="Monday - Saturday",
            available_time="09:00 AM - 05:00 PM",
            status="Active",
            rating=4.8,
            total_reviews=30
        )
        db.session.add(doc1)
        db.session.commit()

        # 3. Users:
        # Patient A (Standard 'PATIENT' role)
        pat_a = User(
            name="Ananya Roy",
            email="ananya.patient@test.com",
            role="PATIENT",
            phone="9876500010"
        )
        pat_a.set_password("Patient@123")

        # Patient B (Victim of IDOR attempt)
        pat_b = User(
            name="Bikram Sen",
            email="bikram.patient@test.com",
            role="PATIENT",
            phone="9876500020"
        )
        pat_b.set_password("Patient@123")

        # Patient C (Legacy 'USER' role for backward compatibility testing)
        pat_c_legacy = User(
            name="Chitra Legacy",
            email="chitra.legacy@test.com",
            role="USER",
            phone="9876500030"
        )
        pat_c_legacy.set_password("Patient@123")

        # Deactivated Patient
        pat_inactive = User(
            name="Deactivated Patient",
            email="inactive.patient@test.com",
            role="PATIENT",
            phone="9876500040",
            is_active=False
        )
        pat_inactive.set_password("Patient@123")

        # Receptionist & Doctor Users for boundary checks
        u_doc = User(
            name="Dr. Alok Nath",
            email="alok.physician@carehospital.com",
            role="DOCTOR",
            hospital_id=hosp.id
        )
        u_doc.set_password("Doctor@123")
        db.session.add(u_doc)
        db.session.commit()
        doc1.user_id = u_doc.id

        db.session.add_all([pat_a, pat_b, pat_c_legacy, pat_inactive])
        db.session.commit()

        # 4. Appointments
        today_str = date.today().isoformat()
        future_str = (date.today() + timedelta(days=2)).isoformat()
        past_str = (date.today() - timedelta(days=5)).isoformat()

        # Appt 1: Patient A, Pending, Future date
        appt1_pat_a = Appointment(
            user_id=pat_a.id,
            doctor_id=doc1.id,
            hospital_id=hosp.id,
            appointment_date=future_str,
            appointment_time="10:00 AM",
            reason="Persistent seasonal allergy symptoms",
            status="Pending"
        )

        # Appt 2: Patient A, Completed, Past date, with Doctor Notes
        appt2_pat_a_completed = Appointment(
            user_id=pat_a.id,
            doctor_id=doc1.id,
            hospital_id=hosp.id,
            appointment_date=past_str,
            appointment_time="02:00 PM",
            reason="Mild fever and dry cough",
            status="Completed",
            notes="Diagnosis: Viral pharyngitis. Prescribed Paracetamol 500mg TDS x 3 days and Cetirizine 10mg OD. Adequate oral hydration recommended."
        )

        # Appt 3: Patient B, Confirmed (Target for IDOR attacks by Patient A)
        appt3_pat_b = Appointment(
            user_id=pat_b.id,
            doctor_id=doc1.id,
            hospital_id=hosp.id,
            appointment_date=future_str,
            appointment_time="11:30 AM",
            reason="Confidential routine executive physical",
            status="Confirmed",
            notes="Confidential patient notes."
        )

        db.session.add_all([appt1_pat_a, appt2_pat_a_completed, appt3_pat_b])
        db.session.commit()

        # Tokens
        token_pat_a = generate_token(pat_a)
        token_pat_b = generate_token(pat_b)
        token_pat_c = generate_token(pat_c_legacy)
        token_inactive = generate_token(pat_inactive)
        token_doc = generate_token(u_doc)

        data = {
            'client': app.test_client(),
            'app': app,
            'pat_a_id': pat_a.id,
            'pat_b_id': pat_b.id,
            'pat_c_id': pat_c_legacy.id,
            'doc1_id': doc1.id,
            'hosp_id': hosp.id,
            'appt1_id': appt1_pat_a.id,
            'appt2_id': appt2_pat_a_completed.id,
            'appt3_id': appt3_pat_b.id,
            'token_pat_a': token_pat_a,
            'token_pat_b': token_pat_b,
            'token_pat_c': token_pat_c,
            'token_inactive': token_inactive,
            'token_doc': token_doc,
            'future_str': future_str
        }

    yield data

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


class TestPatientPortal:
    """Patient / User Portal test suite (/patient/*)"""

    def test_01_patient_dashboard_stats_and_metrics(self, patient_test_env):
        """PATIENT role can access own health metrics and upcoming visits."""
        client = patient_test_env['client']
        token = patient_test_env['token_pat_a']

        res = client.get(
            '/api/patient/stats',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        metrics = data['metrics']

        # Patient A has 2 appointments (1 upcoming, 1 completed)
        assert metrics['total_appointments'] == 2
        assert metrics['upcoming_count'] == 1
        assert metrics['completed_count'] == 1
        assert metrics['cancelled_count'] == 0
        assert len(data['upcoming_appointments']) == 1
        assert len(data['recent_consultations']) == 1

    def test_02_legacy_user_role_backward_compatibility(self, patient_test_env):
        """Legacy 'USER' role seamlessly accesses patient portal endpoints."""
        client = patient_test_env['client']
        token = patient_test_env['token_pat_c']

        res = client.get(
            '/api/patient/stats',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['user']['role'] == 'USER'
        assert data['metrics']['total_appointments'] == 0

    def test_03_patient_appointments_scoped_to_owner(self, patient_test_env):
        """Patient A list of appointments only contains Patient A's records."""
        client = patient_test_env['client']
        token = patient_test_env['token_pat_a']
        appt3_id = patient_test_env['appt3_id'] # Patient B's appointment

        # Via /api/patient/appointments
        res = client.get(
            '/api/patient/appointments',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        returned_ids = [a['id'] for a in data['appointments']]
        assert appt3_id not in returned_ids
        assert len(returned_ids) == 2

        # Via standard /api/appointments
        res_std = client.get(
            '/api/appointments',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res_std.status_code == 200
        std_ids = [a['id'] for a in res_std.get_json()['appointments']]
        assert appt3_id not in std_ids

    def test_04_patient_idor_read_defense(self, patient_test_env):
        """Patient A attempting to inspect Patient B's appointment details receives 403 Forbidden."""
        client = patient_test_env['client']
        token = patient_test_env['token_pat_a']
        appt3_id = patient_test_env['appt3_id']

        # Via /api/patient/appointments/:id
        res = client.get(
            f'/api/patient/appointments/{appt3_id}',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 403
        assert "Unauthorized" in res.get_json()['message']

        # Via /api/appointments/:id
        res_std = client.get(
            f'/api/appointments/{appt3_id}',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res_std.status_code == 403
        assert "Unauthorized" in res_std.get_json()['message']

    def test_05_patient_idor_cancel_defense(self, patient_test_env):
        """Patient A attempting to cancel Patient B's appointment receives 403 Forbidden."""
        client = patient_test_env['client']
        token = patient_test_env['token_pat_a']
        appt3_id = patient_test_env['appt3_id']

        # Via /api/patient/appointments/:id/cancel
        res = client.put(
            f'/api/patient/appointments/{appt3_id}/cancel',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 403
        assert "Unauthorized" in res.get_json()['message']

        # Via /api/appointments/:id
        res_std = client.put(
            f'/api/appointments/{appt3_id}',
            json={'status': 'Cancelled'},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res_std.status_code == 403

    def test_06_patient_can_view_own_medical_records(self, patient_test_env):
        """Patient can read their completed medical records and doctor prescriptions."""
        client = patient_test_env['client']
        token = patient_test_env['token_pat_a']

        res = client.get(
            '/api/patient/medical-records',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert len(data['records']) == 1

        record = data['records'][0]
        assert record['doctor_name'] == "Dr. Alok Nath"
        assert record['chief_complaint'] == "Mild fever and dry cough"
        assert "Viral pharyngitis" in record['clinical_notes']
        assert record['has_prescription'] is True

    def test_07_patient_cannot_alter_clinical_notes_or_status(self, patient_test_env):
        """Patient cannot modify doctor-authored clinical notes or mark consultations completed."""
        client = patient_test_env['client']
        token = patient_test_env['token_pat_a']
        appt1_id = patient_test_env['appt1_id']

        # Attempt to inject clinical notes
        res1 = client.put(
            f'/api/appointments/{appt1_id}',
            json={'notes': 'Patient attempting to forge clinical diagnosis'},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res1.status_code in (400, 403)

        # Attempt to mark status as Completed
        res2 = client.put(
            f'/api/appointments/{appt1_id}',
            json={'status': 'Completed'},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res2.status_code == 403
        assert "Patients can only cancel" in res2.get_json()['message']

    def test_08_patient_cannot_cancel_completed_consultation(self, patient_test_env):
        """Patient cannot cancel an already completed medical consultation record."""
        client = patient_test_env['client']
        token = patient_test_env['token_pat_a']
        appt2_id = patient_test_env['appt2_id'] # completed appointment

        res = client.put(
            f'/api/patient/appointments/{appt2_id}/cancel',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 400
        assert "Completed" in res.get_json()['message']

    def test_09_patient_can_cancel_own_pending_appointment(self, patient_test_env):
        """Patient successfully cancels their own eligible pending appointment."""
        client = patient_test_env['client']
        token = patient_test_env['token_pat_a']
        appt1_id = patient_test_env['appt1_id']

        res = client.put(
            f'/api/patient/appointments/{appt1_id}/cancel',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['appointment']['status'] == 'Cancelled'

        # Cancelling again must be rejected
        res_repeat = client.put(
            f'/api/patient/appointments/{appt1_id}/cancel',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res_repeat.status_code == 400
        assert "already cancelled" in res_repeat.get_json()['message']

    def test_10_patient_can_book_appointment(self, patient_test_env):
        """Patient books an appointment with doctor; backend sets patient_id to caller."""
        client = patient_test_env['client']
        token = patient_test_env['token_pat_a']
        doc1_id = patient_test_env['doc1_id']
        pat_a_id = patient_test_env['pat_a_id']
        pat_b_id = patient_test_env['pat_b_id']

        booking_date = (date.today() + timedelta(days=10)).isoformat()

        # Patient A attempts to spoof patient_id = Patient B
        res = client.post(
            '/api/appointments',
            json={
                'doctor_id': doc1_id,
                'appointment_date': booking_date,
                'appointment_time': '03:00 PM',
                'reason': 'Routine wellness check',
                'patient_id': pat_b_id, # Attempted spoofing
                'hospital_id': 99999   # Attempted spoofing
            },
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 201
        created = res.get_json()['appointment']

        # Patient ID MUST be caller (Patient A), NOT spoofed target (Patient B)
        assert created['user_id'] == pat_a_id
        # Hospital ID MUST be doctor's true hospital, NOT spoofed 99999
        assert created['hospital_id'] == patient_test_env['hosp_id']

    def test_11_booking_duplicate_slot_rejected(self, patient_test_env):
        """Booking the same doctor and slot twice is rejected with 409 Conflict."""
        client = patient_test_env['client']
        token = patient_test_env['token_pat_a']
        doc1_id = patient_test_env['doc1_id']
        future_str = patient_test_env['future_str']

        # appt3_pat_b occupies future_str at '11:30 AM'
        res = client.post(
            '/api/appointments',
            json={
                'doctor_id': doc1_id,
                'appointment_date': future_str,
                'appointment_time': '11:30 AM',
                'reason': 'Conflicting double booking attempt'
            },
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 409
        assert "already been booked" in res.get_json()['message']

    def test_12_deactivated_patient_denied_access(self, patient_test_env):
        """Deactivated patient account receives 403 Forbidden on protected routes."""
        client = patient_test_env['client']
        token_inactive = patient_test_env['token_inactive']

        res = client.get(
            '/api/patient/stats',
            headers={'Authorization': f'Bearer {token_inactive}'}
        )
        assert res.status_code == 403
        assert "deactivated" in res.get_json()['message']

    def test_13_patient_profile_self_service_update(self, patient_test_env):
        """Patient can update their name and phone number."""
        client = patient_test_env['client']
        token = patient_test_env['token_pat_a']

        res = client.put(
            '/api/patient/profile',
            json={
                'name': 'Ananya Roy Chowdhury',
                'phone': '+91 91234 56789'
            },
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['user']['name'] == 'Ananya Roy Chowdhury'
        assert data['user']['phone'] == '+91 91234 56789'

    def test_14_patient_cannot_tamper_role_or_privileges(self, patient_test_env):
        """Patient attempting to alter role or hospital_id receives 403 Forbidden."""
        client = patient_test_env['client']
        token = patient_test_env['token_pat_a']

        res = client.put(
            '/api/patient/profile',
            json={'role': 'PLATFORM_OWNER'},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 403
        assert "strictly prohibited" in res.get_json()['message']

    def test_15_patient_blocked_from_staff_and_admin_apis(self, patient_test_env):
        """Patient attempting to access staff management or admin APIs receives 403 Forbidden."""
        client = patient_test_env['client']
        token = patient_test_env['token_pat_a']

        # Reception
        res_rec = client.get('/api/reception/stats', headers={'Authorization': f'Bearer {token}'})
        assert res_rec.status_code == 403

        # Doctor
        res_doc = client.get('/api/doctor/stats', headers={'Authorization': f'Bearer {token}'})
        assert res_doc.status_code == 403

        # Hospital Staff Invitations
        res_inv = client.get('/api/hospital/invitations', headers={'Authorization': f'Bearer {token}'})
        assert res_inv.status_code == 403

        # Admin / Staff Dashboard Stats
        res_admin = client.get('/api/admin/stats', headers={'Authorization': f'Bearer {token}'})
        assert res_admin.status_code == 403

        # Platform Owner hospital creation
        res_owner = client.post('/api/hospitals', json={'name': 'Illegal Hospital'}, headers={'Authorization': f'Bearer {token}'})
        assert res_owner.status_code == 403
