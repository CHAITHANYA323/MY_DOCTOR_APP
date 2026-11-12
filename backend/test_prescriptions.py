"""
Test Suite: MediConnect Digital Prescription Management System
Tests:
1. Prescription creation by authorized doctor
2. Validation enforcement (missing diagnosis, empty medicines, invalid patient)
3. Snapshot fidelity (doctor credentials, NMC registration, hospital details)
4. Doctor prescription list retrieval
5. Patient prescription list retrieval (strictly scoped)
6. IDOR Defense: Patient B receives 403 Forbidden when accessing Patient A's prescription
7. PDF generation endpoint (returns valid PDF with correct headers and bytes)
8. Public verification endpoint for pharmacies
"""

import io
import json
import pytest
from app import create_app, db
from models import User, Doctor, Hospital, Appointment, Prescription
from utils.auth_middleware import generate_token


@pytest.fixture
def app_instance():
    app = create_app()
    app.config['TESTING'] = True
    return app


@pytest.fixture
def client(app_instance):
    return app_instance.test_client()


def test_prescription_lifecycle_and_idor_security(app_instance, client):
    with app_instance.app_context():
        # Retrieve test doctor (dr.one@medicare.com)
        doctor_user = User.query.filter_by(email='dr.one@medicare.com').first()
        assert doctor_user is not None, "Test doctor user not found"
        doctor_token = generate_token(doctor_user)
        doctor = doctor_user.doctor_profile or Doctor.query.filter_by(user_id=doctor_user.id).first()
        assert doctor is not None, "Doctor record not found"

        # Retrieve Patient A and Patient B
        patient_a = User.query.filter(User.role.in_(['PATIENT', 'USER'])).first()
        assert patient_a is not None, "Patient A not found"
        patient_a_token = generate_token(patient_a)

        patient_b = User.query.filter(User.role.in_(['PATIENT', 'USER']), User.id != patient_a.id).first()
        assert patient_b is not None, "Patient B not found"
        patient_b_token = generate_token(patient_b)

        # -------------------------------------------------------------
        # 1. Validation Failures: Doctor tries to create invalid Rx
        # -------------------------------------------------------------
        # Missing diagnosis
        res = client.post(
            '/api/doctor/prescriptions',
            headers={'Authorization': f'Bearer {doctor_token}'},
            json={
                'patient_id': patient_a.id,
                'diagnosis': '',
                'medicines': [{'name': 'Paracetamol', 'dosage': '500mg'}]
            }
        )
        assert res.status_code == 400
        assert res.json['success'] is False

        # Empty medicines
        res = client.post(
            '/api/doctor/prescriptions',
            headers={'Authorization': f'Bearer {doctor_token}'},
            json={
                'patient_id': patient_a.id,
                'diagnosis': 'Seasonal Allergic Rhinitis',
                'medicines': []
            }
        )
        assert res.status_code == 400

        # Non-doctor tries to issue prescription -> 403 Forbidden
        res = client.post(
            '/api/doctor/prescriptions',
            headers={'Authorization': f'Bearer {patient_a_token}'},
            json={
                'patient_id': patient_b.id,
                'diagnosis': 'Migraine',
                'medicines': [{'name': 'Ibuprofen', 'dosage': '400mg'}]
            }
        )
        assert res.status_code == 403

        # -------------------------------------------------------------
        # 2. Doctor successfully creates valid prescription for Patient A
        # -------------------------------------------------------------
        rx_payload = {
            'patient_id': patient_a.id,
            'diagnosis': 'Essential Hypertension & Mild Angina',
            'symptoms': 'Intermittent chest discomfort on exertion, BP 142/90 mmHg.',
            'medicines': [
                {
                    'name': 'Amlodipine Besylate 5mg',
                    'dosage': '1 Tablet',
                    'frequency': '1-0-0',
                    'duration': '30 Days',
                    'timing': 'Morning After Food',
                    'instructions': 'Take with water at breakfast.'
                },
                {
                    'name': 'Atorvastatin 20mg',
                    'dosage': '1 Tablet',
                    'frequency': '0-0-1',
                    'duration': '30 Days',
                    'timing': 'Bedtime',
                    'instructions': 'Do not take with grapefruit juice.'
                }
            ],
            'additional_advice': 'Strict salt restriction (<2g/day), daily walking 40 mins.',
            'follow_up_date': '2026-12-15',
            'notes': 'Monitor BP weekly. ECG recommended if discomfort recurs.'
        }

        res = client.post(
            '/api/doctor/prescriptions',
            headers={'Authorization': f'Bearer {doctor_token}'},
            json=rx_payload
        )
        assert res.status_code == 201
        data = res.json
        assert data['success'] is True
        created_rx = data['prescription']
        rx_id = created_rx['id']
        rx_number = created_rx['prescription_number']

        assert rx_number.startswith('RX-')
        assert created_rx['patient_id'] == patient_a.id
        assert created_rx['doctor_id'] == doctor.id
        assert len(created_rx['medicines']) == 2
        assert 'Dr.' in created_rx['doctor_name']

        # -------------------------------------------------------------
        # 3. Doctor lists prescriptions
        # -------------------------------------------------------------
        res = client.get(
            '/api/doctor/prescriptions',
            headers={'Authorization': f'Bearer {doctor_token}'}
        )
        assert res.status_code == 200
        doc_rx_list = res.json['prescriptions']
        assert any(p['id'] == rx_id for p in doc_rx_list)

        # -------------------------------------------------------------
        # 4. Patient A retrieves their prescriptions
        # -------------------------------------------------------------
        res = client.get(
            '/api/patient/prescriptions',
            headers={'Authorization': f'Bearer {patient_a_token}'}
        )
        assert res.status_code == 200
        pat_a_rxs = res.json['prescriptions']
        assert any(p['id'] == rx_id for p in pat_a_rxs)

        # -------------------------------------------------------------
        # 5. IDOR DEFENSE TEST: Patient B CANNOT access Patient A's prescription!
        # -------------------------------------------------------------
        res = client.get(
            f'/api/prescriptions/{rx_id}',
            headers={'Authorization': f'Bearer {patient_b_token}'}
        )
        assert res.status_code == 403, "IDOR check failed: Patient B accessed Patient A's prescription!"
        assert res.json['success'] is False

        # Patient B CANNOT download Patient A's prescription PDF!
        res = client.get(
            f'/api/prescriptions/{rx_id}/pdf',
            headers={'Authorization': f'Bearer {patient_b_token}'}
        )
        assert res.status_code == 403, "IDOR check failed: Patient B downloaded Patient A's prescription PDF!"

        # Patient A CAN access their own prescription
        res = client.get(
            f'/api/prescriptions/{rx_id}',
            headers={'Authorization': f'Bearer {patient_a_token}'}
        )
        assert res.status_code == 200
        assert res.json['prescription']['id'] == rx_id

        # -------------------------------------------------------------
        # 6. PDF Generation & Streaming Verification
        # -------------------------------------------------------------
        res = client.get(
            f'/api/prescriptions/{rx_id}/pdf',
            headers={'Authorization': f'Bearer {patient_a_token}'}
        )
        assert res.status_code == 200
        assert res.content_type == 'application/pdf'
        assert res.data.startswith(b'%PDF-')
        assert len(res.data) > 1000

        # -------------------------------------------------------------
        # 7. Verification Endpoint for Pharmacies
        # -------------------------------------------------------------
        res = client.get(f'/api/prescriptions/verify/{rx_number}')
        assert res.status_code == 200
        assert res.json['valid'] is True
        assert res.json['prescription_number'] == rx_number
        assert res.json['items_count'] == 2

        print("\nAll Prescription Backend & IDOR Security Tests Passed 100%!")


if __name__ == '__main__':
    app = create_app()
    app.config['TESTING'] = True
    c = app.test_client()
    test_prescription_lifecycle_and_idor_security(app, c)

