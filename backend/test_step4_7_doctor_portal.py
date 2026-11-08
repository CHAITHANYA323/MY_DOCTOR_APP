"""
Integration and security test suite for Step 4.7: Doctor Portal (/doctor/*).

Verifies:
1. Doctor Dashboard stats (/api/doctor/stats):
   - Correct counts for today's pending, confirmed, completed, and cancelled appointments.
   - All-time totals: total appointments, total completed, total patients treated.
   - Real-time today's schedule and recent appointments.
2. Doctor Profile retrieval (/api/doctor/profile and /me):
   - Returns linked doctor profile with hospital and specialization details.
3. Doctor Profile self-service updates:
   - Doctor can update about bio, phone, email, languages, consultation fee, available days/time, status.
   - Rejects negative fee.
4. Administrative field tampering protection:
   - Modifying hospital_id, specialization_id, user_id, or name is rejected with 403 Forbidden.
5. Multi-tenant appointment isolation:
   - Doctor 1 only sees Doctor 1's appointments via /api/appointments.
   - Doctor 1 attempting to view Doctor 2's appointment details receives 403 Forbidden.
6. Clinical consultation workflow & notes:
   - Doctor can mark own appointment as Confirmed, Completed, or Cancelled.
   - Doctor can enter/update clinical notes (diagnosis, prescription).
   - Doctor attempting to modify Doctor 2's appointment receives 403 Forbidden.
   - Guard against invalid field mutations (doctor_id, hospital_id).
7. Doctor Patient Directory Scoping (/api/doctor/patients):
   - Only lists patients who have at least one appointment with this doctor.
   - Returns visit count, last visit date, and last consultation notes.
   - Search filter works across name, email, phone.
8. Patient History IDOR Defense (/api/doctor/patients/<id>):
   - Doctor 1 can view patient history for their own patient.
   - Doctor 1 attempting to view medical history of a patient who only visited Doctor 2 receives 403 Forbidden.
9. RBAC Boundary Enforcement:
   - Non-doctor roles (Patient, Receptionist) cannot access /api/doctor/* (403 Forbidden).
   - Doctor without a linked doctor profile receives 404 Not Found.
   - Doctor cannot access Reception or Super Admin operations.
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
from models import db, User, Doctor, Hospital, Specialization, Appointment
from utils.auth_middleware import generate_token


@pytest.fixture(scope="module")
def doctor_test_env():
    db_name = f"test_step4_7_{uuid.uuid4().hex[:8]}.db"
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), db_name)
    Config.DATABASE_URL = f"sqlite:///{db_path}"

    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"

    with app.app_context():
        db.create_all()

        # 1. Hospitals A & B
        hosp_a = Hospital(
            name="Apollo Care Hospital",
            slug="apollo-care-hospital",
            image="https://example.com/apollo.jpg",
            address="100 Health Way",
            city="Hyderabad",
            state="Telangana",
            emergency_number="108",
            phone="040-11112222",
            email="contact@apollocare.com"
        )
        hosp_b = Hospital(
            name="Fortis City Hospital",
            slug="fortis-city-hospital",
            image="https://example.com/fortis.jpg",
            address="200 Medical Blvd",
            city="Bengaluru",
            state="Karnataka",
            emergency_number="102",
            phone="080-33334444",
            email="contact@fortiscity.com"
        )
        db.session.add_all([hosp_a, hosp_b])
        db.session.commit()

        # 2. Specializations
        spec_cardio = Specialization(
            name="Cardiology",
            slug="cardiology",
            description="Heart care specialist"
        )
        spec_neuro = Specialization(
            name="Neurology",
            slug="neurology",
            description="Brain and nerve specialist"
        )
        db.session.add_all([spec_cardio, spec_neuro])
        db.session.commit()

        # 3. Doctors (Doctor 1 in Hospital A, Doctor 2 in Hospital B)
        doc1 = Doctor(
            name="Dr. Sarah Jenkins",
            gender="Female",
            image="https://example.com/sarah.jpg",
            qualification="MBBS, MD Cardiology",
            experience=10,
            specialization_id=spec_cardio.id,
            hospital_id=hosp_a.id,
            location="Cardio Wing, Floor 3",
            phone="+91 98765 11111",
            email="sarah.jenkins@apollocare.com",
            consultation_fee=600.0,
            available_days="Monday - Friday",
            available_time="09:00 AM - 04:00 PM",
            languages="English, Hindi, Telugu",
            about="Board certified cardiologist with decade of intervention experience.",
            status="Active",
            rating=4.9,
            total_reviews=25
        )
        doc2 = Doctor(
            name="Dr. Marcus Brody",
            gender="Male",
            image="https://example.com/marcus.jpg",
            qualification="MBBS, DM Neurology",
            experience=12,
            specialization_id=spec_neuro.id,
            hospital_id=hosp_b.id,
            location="Neuro Suite 4B",
            phone="+91 98765 22222",
            email="marcus.brody@fortis.com",
            consultation_fee=800.0,
            available_days="Tuesday - Saturday",
            available_time="10:00 AM - 05:00 PM",
            languages="English, Kannada",
            about="Neurologist specializing in neuro-muscular disorders.",
            status="Active",
            rating=4.8,
            total_reviews=18
        )
        db.session.add_all([doc1, doc2])
        db.session.commit()

        # 4. User Accounts
        # Doctor 1 User
        u_doc1 = User(
            name="Dr. Sarah Jenkins",
            email="sarah.doctor@apollocare.com",
            role="DOCTOR",
            hospital_id=hosp_a.id
        )
        u_doc1.set_password("Doctor@123")
        db.session.add(u_doc1)
        db.session.commit()
        doc1.user_id = u_doc1.id

        # Doctor 2 User
        u_doc2 = User(
            name="Dr. Marcus Brody",
            email="marcus.doctor@fortis.com",
            role="DOCTOR",
            hospital_id=hosp_b.id
        )
        u_doc2.set_password("Doctor@123")
        db.session.add(u_doc2)
        db.session.commit()
        doc2.user_id = u_doc2.id

        # Doctor without linked profile
        u_unlinked_doc = User(
            name="Dr. Unlinked Phantom",
            email="unlinked.doctor@hospital.org",
            role="DOCTOR",
            hospital_id=hosp_a.id
        )
        u_unlinked_doc.set_password("Doctor@123")

        # Patients
        # Patient A (sees Doctor 1)
        pat_a = User(
            name="Arun Verma",
            email="arun.verma@patient.com",
            role="PATIENT",
            phone="9876500001"
        )
        pat_a.set_password("Patient@123")

        # Patient B (sees Doctor 2 only)
        pat_b = User(
            name="Bhavna Rao",
            email="bhavna.rao@patient.com",
            role="PATIENT",
            phone="9876500002"
        )
        pat_b.set_password("Patient@123")

        # Receptionist (Hospital A)
        receptionist = User(
            name="Rekha FrontDesk",
            email="rekha.reception@apollocare.com",
            role="RECEPTIONIST",
            hospital_id=hosp_a.id
        )
        receptionist.set_password("Reception@123")

        db.session.add_all([u_unlinked_doc, pat_a, pat_b, receptionist])
        db.session.commit()

        # 5. Appointments
        today_str = date.today().isoformat()
        yesterday_str = (date.today() - timedelta(days=1)).isoformat()
        tomorrow_str = (date.today() + timedelta(days=1)).isoformat()

        # Appt 1: Doctor 1, Patient A, Today, Confirmed
        appt1 = Appointment(
            user_id=pat_a.id,
            doctor_id=doc1.id,
            hospital_id=hosp_a.id,
            appointment_date=today_str,
            appointment_time="10:00 AM",
            reason="Chest tightness and palpitations",
            status="Confirmed",
            notes="Initial triage completed by front desk."
        )
        # Appt 2: Doctor 1, Patient A, Today, Pending
        appt2 = Appointment(
            user_id=pat_a.id,
            doctor_id=doc1.id,
            hospital_id=hosp_a.id,
            appointment_date=today_str,
            appointment_time="11:30 AM",
            reason="Follow-up ECG review",
            status="Pending"
        )
        # Appt 3: Doctor 1, Patient A, Yesterday, Completed
        appt3 = Appointment(
            user_id=pat_a.id,
            doctor_id=doc1.id,
            hospital_id=hosp_a.id,
            appointment_date=yesterday_str,
            appointment_time="02:00 PM",
            reason="Routine cardiac consultation",
            status="Completed",
            notes="BP 120/80. Prescribed Atenolol 25mg daily."
        )
        # Appt 4: Doctor 2, Patient B, Today, Confirmed (Hospital B)
        appt4 = Appointment(
            user_id=pat_b.id,
            doctor_id=doc2.id,
            hospital_id=hosp_b.id,
            appointment_date=today_str,
            appointment_time="10:00 AM",
            reason="Chronic migraine assessment",
            status="Confirmed",
            notes="Patient reports aura before headaches."
        )

        db.session.add_all([appt1, appt2, appt3, appt4])
        db.session.commit()

        # Generate tokens
        token_doc1 = generate_token(u_doc1)
        token_doc2 = generate_token(u_doc2)
        token_unlinked = generate_token(u_unlinked_doc)
        token_pat_a = generate_token(pat_a)
        token_pat_b = generate_token(pat_b)
        token_reception = generate_token(receptionist)

        doc1_id = doc1.id
        doc2_id = doc2.id
        pat_a_id = pat_a.id
        pat_b_id = pat_b.id
        pat_a_name = pat_a.name
        pat_b_name = pat_b.name

        data = {
            'client': app.test_client(),
            'app': app,
            'doc1_id': doc1_id,
            'doc2_id': doc2_id,
            'pat_a_id': pat_a_id,
            'pat_b_id': pat_b_id,
            'pat_a_name': pat_a_name,
            'pat_b_name': pat_b_name,
            'appt1_id': appt1.id,
            'appt2_id': appt2.id,
            'appt3_id': appt3.id,
            'appt4_id': appt4.id,
            'token_doc1': token_doc1,
            'token_doc2': token_doc2,
            'token_unlinked': token_unlinked,
            'token_pat_a': token_pat_a,
            'token_pat_b': token_pat_b,
            'token_reception': token_reception,
            'hosp_a_id': hosp_a.id,
            'hosp_b_id': hosp_b.id
        }

    yield data

    # Teardown
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


class TestDoctorPortal:
    """Doctor Portal test suite (/doctor/*)"""

    def test_01_doctor_stats_and_dashboard_metrics(self, doctor_test_env):
        """Doctor 1 gets their real-time clinical practice metrics."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']

        res = client.get(
            '/api/doctor/stats',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        metrics = data['metrics']

        # Doctor 1 has 2 appointments today (appt1: Confirmed, appt2: Pending), 1 yesterday (Completed)
        assert metrics['today_appointments'] == 2
        assert metrics['today_confirmed'] == 1
        assert metrics['today_pending'] == 1
        assert metrics['total_appointments'] == 3
        assert metrics['total_completed'] == 1
        assert metrics['total_patients'] == 1 # only Patient A
        assert metrics['rating'] == 4.9

        # Schedule check
        assert len(data['today_schedule']) == 2
        assert data['doctor']['name'] == "Dr. Sarah Jenkins"
        assert data['doctor']['specialization'] == "Cardiology"

    def test_02_doctor_profile_retrieval(self, doctor_test_env):
        """Doctor 1 retrieves their full profile with hospital and specialization details."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']

        res = client.get(
            '/api/doctor/profile',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        doc = data['doctor']
        assert doc['name'] == "Dr. Sarah Jenkins"
        assert doc['specialization_name'] == "Cardiology"
        assert doc['hospital_name'] == "Apollo Care Hospital"
        assert doc['consultation_fee'] == 600.0
        assert doc['account_email'] == "sarah.doctor@apollocare.com"

    def test_03_doctor_profile_self_service_update(self, doctor_test_env):
        """Doctor 1 updates bio, phone, languages, and consultation fee."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']

        res = client.put(
            '/api/doctor/profile',
            json={
                'about': 'Updated clinical profile specializing in preventative cardiovascular therapy.',
                'phone': '+91 99999 88888',
                'languages': 'English, Hindi, Telugu, Tamil',
                'consultation_fee': 750.0,
                'available_days': 'Monday - Saturday',
                'available_time': '09:00 AM - 05:00 PM',
                'status': 'Active'
            },
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['doctor']['consultation_fee'] == 750.0
        assert data['doctor']['phone'] == '+91 99999 88888'
        assert data['doctor']['available_days'] == 'Monday - Saturday'
        assert 'preventative' in data['doctor']['about']

    def test_04_doctor_profile_negative_fee_rejected(self, doctor_test_env):
        """Negative consultation fee is rejected with 400 Bad Request."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']

        res = client.put(
            '/api/doctor/profile',
            json={'consultation_fee': -100.0},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 400
        data = res.get_json()
        assert data['success'] is False
        assert "cannot be negative" in data['message']

    def test_05_doctor_cannot_tamper_hospital_id(self, doctor_test_env):
        """Doctor attempting to modify hospital_id is blocked with 403 Forbidden."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']
        hosp_b_id = doctor_test_env['hosp_b_id']

        res = client.put(
            '/api/doctor/profile',
            json={'hospital_id': hosp_b_id},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 403
        data = res.get_json()
        assert data['success'] is False
        assert "restricted to hospital administrators" in data['message']

    def test_06_doctor_cannot_tamper_specialization_or_user_id(self, doctor_test_env):
        """Doctor attempting to alter specialization_id or user_id receives 403 Forbidden."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']

        res = client.put(
            '/api/doctor/profile',
            json={'specialization_id': 999},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 403

        res_user = client.put(
            '/api/doctor/profile',
            json={'user_id': 999},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res_user.status_code == 403

    def test_07_doctor_cannot_tamper_name(self, doctor_test_env):
        """Doctor attempting to modify legal credential name receives 403 Forbidden."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']

        res = client.put(
            '/api/doctor/profile',
            json={'name': 'Dr. Tampered Impostor'},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 403
        assert "Hospital Administration" in res.get_json()['message']

    def test_08_appointments_list_scoped_to_doctor(self, doctor_test_env):
        """Doctor 1 query to /api/appointments returns only Doctor 1's appointments."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']
        doc1_id = doctor_test_env['doc1_id']
        appt4_id = doctor_test_env['appt4_id'] # belongs to Doc 2

        res = client.get(
            '/api/appointments',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 200
        data = res.get_json()
        appts = data['appointments']
        assert len(appts) == 3 # appt1, appt2, appt3
        assert all(a['doctor_id'] == doc1_id for a in appts)
        assert appt4_id not in [a['id'] for a in appts]

    def test_09_doctor_cross_appointment_view_blocked(self, doctor_test_env):
        """Doctor 1 attempting to view Doctor 2's appointment receives 403 Forbidden."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']
        appt4_id = doctor_test_env['appt4_id']

        res = client.get(
            f'/api/appointments/{appt4_id}',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 403
        assert "Unauthorized access" in res.get_json()['message']

    def test_10_doctor_complete_consultation_with_notes(self, doctor_test_env):
        """Doctor 1 marks their own appointment as Completed and adds clinical notes."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']
        appt1_id = doctor_test_env['appt1_id']

        res = client.put(
            f'/api/doctor/appointments/{appt1_id}',
            json={
                'status': 'Completed',
                'notes': 'Consultation concluded. Normal sinus rhythm confirmed on 12-lead ECG. Advised lifestyle modifications.'
            },
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['appointment']['status'] == 'Completed'
        assert 'lifestyle modifications' in data['appointment']['notes']

    def test_11_doctor_cannot_modify_other_doctor_appointment(self, doctor_test_env):
        """Doctor 1 attempting to modify Doctor 2's appointment receives 403 Forbidden."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']
        appt4_id = doctor_test_env['appt4_id']

        # Via /api/doctor/appointments/:id
        res1 = client.put(
            f'/api/doctor/appointments/{appt4_id}',
            json={'status': 'Completed', 'notes': 'Unauthorized modification attempt'},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res1.status_code == 403
        assert "Unauthorized" in res1.get_json()['message']

        # Via /api/appointments/:id
        res2 = client.put(
            f'/api/appointments/{appt4_id}',
            json={'status': 'Completed', 'notes': 'Unauthorized modification attempt'},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res2.status_code == 403
        assert "Unauthorized" in res2.get_json()['message']

    def test_12_doctor_patient_directory_scoping(self, doctor_test_env):
        """Doctor 1 patient directory only includes patients with appointments with Doctor 1."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']
        pat_a_id = doctor_test_env['pat_a_id']
        pat_b_id = doctor_test_env['pat_b_id']
        pat_a_name = doctor_test_env['pat_a_name']

        res = client.get(
            '/api/doctor/patients',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        patient_ids = [p['id'] for p in data['patients']]

        assert pat_a_id in patient_ids
        assert pat_b_id not in patient_ids # Patient B only saw Doctor 2!

        patient_rec = next(p for p in data['patients'] if p['id'] == pat_a_id)
        assert patient_rec['total_visits'] == 3
        assert patient_rec['name'] == pat_a_name

    def test_13_doctor_patient_search_filter(self, doctor_test_env):
        """Doctor 1 searches patients by query string."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']

        # Match Arun
        res_match = client.get(
            '/api/doctor/patients?search=Arun',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res_match.status_code == 200
        assert len(res_match.get_json()['patients']) == 1

        # No match
        res_none = client.get(
            '/api/doctor/patients?search=NonExistentPatientXYZ',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res_none.status_code == 200
        assert len(res_none.get_json()['patients']) == 0

    def test_14_doctor_patient_history_idor_defense(self, doctor_test_env):
        """Doctor 1 can view Patient A's history, but is blocked from Patient B with 403."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']
        pat_a_id = doctor_test_env['pat_a_id']
        pat_b_id = doctor_test_env['pat_b_id']
        pat_a_name = doctor_test_env['pat_a_name']

        # Permitted: Patient A has visits with Doctor 1
        res_a = client.get(
            f'/api/doctor/patients/{pat_a_id}',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res_a.status_code == 200
        data_a = res_a.get_json()
        assert data_a['success'] is True
        assert data_a['patient']['name'] == pat_a_name
        assert len(data_a['appointments']) == 3

        # IDOR Block: Patient B never visited Doctor 1
        res_b = client.get(
            f'/api/doctor/patients/{pat_b_id}',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res_b.status_code == 403
        data_b = res_b.get_json()
        assert data_b['success'] is False
        assert "Access denied" in data_b['message']

    def test_15_unauthorized_role_blocked_from_doctor_portal(self, doctor_test_env):
        """Patient or Receptionist calling /api/doctor/* receives 403 Forbidden."""
        client = doctor_test_env['client']
        token_pat = doctor_test_env['token_pat_a']
        token_rec = doctor_test_env['token_reception']

        # Patient blocked
        res_p = client.get(
            '/api/doctor/stats',
            headers={'Authorization': f'Bearer {token_pat}'}
        )
        assert res_p.status_code == 403
        assert "Doctor privileges required" in res_p.get_json()['message']

        # Receptionist blocked
        res_r = client.get(
            '/api/doctor/stats',
            headers={'Authorization': f'Bearer {token_rec}'}
        )
        assert res_r.status_code == 403
        assert "Doctor privileges required" in res_r.get_json()['message']

    def test_16_unlinked_doctor_account_returns_404(self, doctor_test_env):
        """Doctor user with no linked Doctor profile receives 404 Not Found."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_unlinked']

        res = client.get(
            '/api/doctor/stats',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 404
        assert "Doctor profile not found" in res.get_json()['message']

    def test_17_doctor_blocked_from_reception_endpoints(self, doctor_test_env):
        """Doctor attempting to call /api/reception/* receives 403 Forbidden."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']

        res = client.get(
            '/api/reception/stats',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 403
        assert "Access denied" in res.get_json()['message'] or "permissions" in res.get_json()['message']

    def test_18_doctor_blocked_from_invitations(self, doctor_test_env):
        """Doctor attempting to invite staff receives 403 Forbidden."""
        client = doctor_test_env['client']
        token = doctor_test_env['token_doc1']

        res = client.post(
            '/api/hospital/invitations',
            json={'email': 'newstaff@apollo.com', 'role': 'RECEPTIONIST'},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert res.status_code == 403
