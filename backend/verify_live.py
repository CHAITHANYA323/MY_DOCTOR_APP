import requests

def test_endpoints():
    print('Checking Vite frontend...')
    r_front = requests.get('http://localhost:5173/')
    print(f'Frontend HTTP Status: {r_front.status_code}')
    assert r_front.status_code == 200

    print('Checking Flask backend...')
    r_back = requests.get('http://localhost:5000/api/health')
    print(f'Backend Health: {r_back.json()}')
    assert r_back.status_code == 200

    r_docs = requests.get('http://localhost:5000/api/doctors?limit=3')
    docs = r_docs.json()['doctors']
    print(f'Doctors count returned: {len(docs)}')
    assert len(docs) > 0

    r_specs = requests.get('http://localhost:5000/api/specializations')
    specs_count = r_specs.json()['count']
    print(f'Specializations count: {specs_count}')
    assert specs_count == 20

    r_hosps = requests.get('http://localhost:5000/api/hospitals')
    hosps_count = r_hosps.json()['total']
    print(f'Hospitals count: {hosps_count}')
    assert hosps_count >= 6

    print('Checking Admin Login & Dashboard Stats...')
    r_login = requests.post('http://localhost:5000/api/auth/login', json={'email': 'admin@medicare.com', 'password': 'Admin@123'})
    token = r_login.json()['token']
    r_stats = requests.get('http://localhost:5000/api/admin/stats', headers={'Authorization': f'Bearer {token}'})
    metrics = r_stats.json()['metrics']
    print(f'Admin Stats: Doctors={metrics["total_doctors"]}, Appointments={metrics["total_appointments"]}, Ambulances={metrics["total_ambulances"]}')
    assert r_stats.status_code == 200

    print('SUCCESS: ALL LIVE SERVER VERIFICATIONS PASSED!')

if __name__ == '__main__':
    test_endpoints()
