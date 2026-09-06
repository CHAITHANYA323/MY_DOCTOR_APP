import json
from app import create_app
from models import db

def test_api_suite():
    app = create_app()
    client = app.test_client()

    print("=== Testing Flask API Endpoints ===")

    # 1. Health check
    res = client.get('/api/health')
    assert res.status_code == 200, f"Health check failed: {res.status_code}"
    print("[OK] GET /api/health passed")

    # 2. Login as Admin
    res = client.post('/api/auth/login', json={
        'email': 'admin@medicare.com',
        'password': 'Admin@123'
    })
    assert res.status_code == 200, f"Admin login failed: {res.status_code}"
    admin_data = json.loads(res.data)
    admin_token = admin_data['token']
    assert admin_data['user']['role'] == 'ADMIN'
    print(f"[OK] POST /api/auth/login (Admin) passed. User: {admin_data['user']['name']}")

    # 3. Login as Patient
    res = client.post('/api/auth/login', json={
        'email': 'patient@medicare.com',
        'password': 'Patient@123'
    })
    assert res.status_code == 200, f"Patient login failed: {res.status_code}"
    patient_data = json.loads(res.data)
    patient_token = patient_data['token']
    assert patient_data['user']['role'] == 'USER'
    print(f"[OK] POST /api/auth/login (Patient) passed. User: {patient_data['user']['name']}")

    # 4. GET /api/specializations
    res = client.get('/api/specializations')
    assert res.status_code == 200
    specs_data = json.loads(res.data)
    assert specs_data['count'] == 20, f"Expected 20 specializations, got {specs_data['count']}"
    print(f"[OK] GET /api/specializations passed ({specs_data['count']} specializations)")

    # 5. GET /api/hospitals
    res = client.get('/api/hospitals')
    assert res.status_code == 200
    hosp_data = json.loads(res.data)
    assert hosp_data['total'] >= 6
    print(f"[OK] GET /api/hospitals passed ({hosp_data['total']} hospitals)")

    # 6. GET /api/doctors (search and filters)
    res = client.get('/api/doctors?search=Rajesh')
    assert res.status_code == 200
    doc_data = json.loads(res.data)
    assert len(doc_data['doctors']) >= 1
    doc_id = doc_data['doctors'][0]['id']
    print(f"[OK] GET /api/doctors (Search: Rajesh) passed. Found: {doc_data['doctors'][0]['name']}")

    # 7. GET /api/doctors/<id>
    res = client.get(f'/api/doctors/{doc_id}')
    assert res.status_code == 200
    doc_detail = json.loads(res.data)['doctor']
    assert doc_detail['name'] == 'Dr. Rajesh Kumar'
    assert len(doc_detail['reviews']) >= 1
    print(f"[OK] GET /api/doctors/{doc_id} details passed with {len(doc_detail['reviews'])} reviews")

    # 8. Book Appointment as Patient
    res = client.post('/api/appointments', 
        headers={'Authorization': f'Bearer {patient_token}'},
        json={
            'doctor_id': doc_id,
            'hospital_id': doc_detail['hospital_id'],
            'appointment_date': '2026-10-15',
            'appointment_time': '10:00 AM',
            'reason': 'Follow up cardiology review.'
        }
    )
    assert res.status_code == 201, f"Booking appointment failed: {res.data}"
    new_appt = json.loads(res.data)['appointment']
    print(f"[OK] POST /api/appointments passed. Appointment ID: {new_appt['id']}")

    # 9. Get User Appointments
    res = client.get('/api/appointments', headers={'Authorization': f'Bearer {patient_token}'})
    assert res.status_code == 200
    appts = json.loads(res.data)['appointments']
    assert len(appts) >= 1
    print(f"[OK] GET /api/appointments (Patient) passed ({len(appts)} appointments)")

    # 10. Emergency Ambulance Request
    res = client.post('/api/ambulance-requests', json={
        'patient_name': 'Anil Roy',
        'phone': '+91 98765 00000',
        'emergency_type': 'Accident',
        'pickup_location': 'Beach Road, Visakhapatnam',
        'destination_hospital': 'Apollo Hospitals',
        'patients_count': 1,
        'additional_info': 'Two-wheeler skid injury'
    })
    assert res.status_code == 201
    amb_req = json.loads(res.data)['request']
    print(f"[OK] POST /api/ambulance-requests passed. Request ID: {amb_req['id']}")

    # 11. Admin Dashboard Stats
    res = client.get('/api/admin/stats', headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    admin_stats = json.loads(res.data)
    metrics = admin_stats['metrics']
    print(f"[OK] GET /api/admin/stats passed: Doctors: {metrics['total_doctors']}, Appointments: {metrics['total_appointments']}, Ambulances: {metrics['total_ambulances']}")

    print("\nSUCCESS: ALL BACKEND SMOKE TESTS PASSED CLEANLY!")

if __name__ == '__main__':
    test_api_suite()
