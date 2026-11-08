import os
import sys
import tempfile
import uuid
import shutil
import json

# Force isolated temporary database BEFORE importing any application modules
_TEMP_TEST_DIR = os.path.join(tempfile.gettempdir(), f"phase1_test_{uuid.uuid4().hex[:8]}")
os.makedirs(_TEMP_TEST_DIR, exist_ok=True)
_TEMP_DB_PATH = os.path.join(_TEMP_TEST_DIR, "test_phase1.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEMP_DB_PATH}"

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from models import db, User

def test_phase1_security():
    app = create_app()
    client = app.test_client()

    print("==================================================")
    print("PHASE 1: CRITICAL SECURITY FIXES TEST SUITE")
    print("==================================================")

    # ----------------------------------------------------
    # TEST 1: Public Registration with role='ADMIN' is forced to 'USER'
    # ----------------------------------------------------
    admin_attempt_email = f"attacker_{uuid.uuid4().hex[:6]}@test.com"
    res = client.post('/api/auth/register', json={
        'name': 'Privilege Escalation Attempt',
        'email': admin_attempt_email,
        'phone': '+91 98765 00001',
        'password': 'Password@123',
        'confirm_password': 'Password@123',
        'role': 'ADMIN'  # Attempted privilege escalation
    })
    assert res.status_code == 201, f"Registration failed: {res.data}"
    reg_data = json.loads(res.data)
    assert reg_data['user']['role'] == 'USER', f"Security failure! User created with role {reg_data['user']['role']}"
    print(f"[PASS] 1. Registration with role='ADMIN' forced to: {reg_data['user']['role']}")

    # ----------------------------------------------------
    # TEST 2: Normal Public Registration continues working as 'USER'
    # ----------------------------------------------------
    normal_email = f"patient_{uuid.uuid4().hex[:6]}@test.com"
    res = client.post('/api/auth/register', json={
        'name': 'Legitimate Patient',
        'email': normal_email,
        'phone': '+91 98765 00002',
        'password': 'PatientPassword@123',
        'confirm_password': 'PatientPassword@123'
    })
    assert res.status_code == 201, f"Normal registration failed: {res.data}"
    normal_data = json.loads(res.data)
    assert normal_data['user']['role'] == 'USER'
    print(f"[PASS] 2. Normal registration created standard USER account: {normal_data['user']['name']}")

    # Log in as this newly registered patient to get token
    res = client.post('/api/auth/login', json={
        'email': normal_email,
        'password': 'PatientPassword@123'
    })
    assert res.status_code == 200
    token = json.loads(res.data)['token']
    auth_headers = {'Authorization': f'Bearer {token}'}

    # ----------------------------------------------------
    # TEST 3: Password change WITHOUT current_password is rejected (HTTP 400)
    # ----------------------------------------------------
    res = client.put('/api/auth/profile', headers=auth_headers, json={
        'name': 'Legitimate Patient',
        'new_password': 'BrandNewPassword@456'
    })
    assert res.status_code == 400, f"Expected 400 for missing current password, got: {res.status_code}"
    err_data = json.loads(res.data)
    assert 'Current password is required' in err_data['message']
    print(f"[PASS] 3. Password change without current_password rejected: {err_data['message']}")

    # ----------------------------------------------------
    # TEST 4: Password change with WRONG current_password is rejected (HTTP 400)
    # ----------------------------------------------------
    res = client.put('/api/auth/profile', headers=auth_headers, json={
        'name': 'Legitimate Patient',
        'current_password': 'WrongPassword@999',
        'new_password': 'BrandNewPassword@456'
    })
    assert res.status_code == 400, f"Expected 400 for incorrect current password, got: {res.status_code}"
    err_data = json.loads(res.data)
    assert 'Current password is incorrect' in err_data['message']
    print(f"[PASS] 4. Password change with wrong current_password rejected: {err_data['message']}")

    # ----------------------------------------------------
    # TEST 5: Password change with short new password (< 6 chars) is rejected (HTTP 400)
    # ----------------------------------------------------
    res = client.put('/api/auth/profile', headers=auth_headers, json={
        'name': 'Legitimate Patient',
        'current_password': 'PatientPassword@123',
        'new_password': '123'
    })
    assert res.status_code == 400
    err_data = json.loads(res.data)
    assert 'at least 6 characters' in err_data['message']
    print(f"[PASS] 5. Short new password rejected: {err_data['message']}")

    # ----------------------------------------------------
    # TEST 6: Password change with identical new password is rejected (HTTP 400)
    # ----------------------------------------------------
    res = client.put('/api/auth/profile', headers=auth_headers, json={
        'name': 'Legitimate Patient',
        'current_password': 'PatientPassword@123',
        'new_password': 'PatientPassword@123'
    })
    assert res.status_code == 400
    err_data = json.loads(res.data)
    assert 'must be different' in err_data['message']
    print(f"[PASS] 6. Identical new password rejected: {err_data['message']}")

    # ----------------------------------------------------
    # TEST 7: Password change with CORRECT current_password succeeds (HTTP 200)
    # ----------------------------------------------------
    res = client.put('/api/auth/profile', headers=auth_headers, json={
        'name': 'Legitimate Patient Updated',
        'phone': '+91 99999 88888',
        'current_password': 'PatientPassword@123',
        'new_password': 'BrandNewPassword@456'
    })
    assert res.status_code == 200, f"Password change failed: {res.data}"
    success_data = json.loads(res.data)
    assert success_data['success'] is True
    assert success_data['user']['name'] == 'Legitimate Patient Updated'
    print(f"[PASS] 7. Password change with correct current_password succeeded: {success_data['message']}")

    # ----------------------------------------------------
    # TEST 8: Verify login with OLD password fails and NEW password succeeds
    # ----------------------------------------------------
    res_old = client.post('/api/auth/login', json={
        'email': normal_email,
        'password': 'PatientPassword@123'
    })
    assert res_old.status_code == 401, "Old password should have been invalidated!"
    print("[PASS] 8a. Login with old password rejected (HTTP 401)")

    res_new = client.post('/api/auth/login', json={
        'email': normal_email,
        'password': 'BrandNewPassword@456'
    })
    assert res_new.status_code == 200, "New password should succeed!"
    new_token = json.loads(res_new.data)['token']
    print("[PASS] 8b. Login with new password succeeded (HTTP 200)")

    # ----------------------------------------------------
    # TEST 9: Normal profile update without password works cleanly
    # ----------------------------------------------------
    res_profile = client.put('/api/auth/profile',
        headers={'Authorization': f'Bearer {new_token}'},
        json={
            'name': 'Rahul Sharma Renamed',
            'phone': '+91 91234 56780'
        }
    )
    assert res_profile.status_code == 200
    profile_data = json.loads(res_profile.data)
    assert profile_data['user']['name'] == 'Rahul Sharma Renamed'
    print("[PASS] 9. Standard profile update without password change succeeded")

    # ----------------------------------------------------
    # TEST 10: USER token blocked from ADMIN endpoints (HTTP 403)
    # ----------------------------------------------------
    res_forbidden = client.get('/api/admin/stats', headers={'Authorization': f'Bearer {new_token}'})
    assert res_forbidden.status_code == 403, f"Expected 403 for user accessing admin stats, got: {res_forbidden.status_code}"
    print("[PASS] 10a. Regular USER token blocked from /api/admin/stats (HTTP 403)")

    res_forbidden_doc = client.post('/api/doctors', headers={'Authorization': f'Bearer {new_token}'}, json={'name': 'Fake Doc'})
    assert res_forbidden_doc.status_code == 403
    print("[PASS] 10b. Regular USER token blocked from POST /api/doctors (HTTP 403)")

    # ----------------------------------------------------
    # TEST 11: Authorized PLATFORM_OWNER token succeeds on ADMIN endpoints (HTTP 200)
    # ----------------------------------------------------
    with app.app_context():
        import manage
        manage.promote_owner('admin@medicare.com', force_yes=True)

    res_admin_login = client.post('/api/auth/login', json={
        'email': 'admin@medicare.com',
        'password': 'Admin@123'
    })
    assert res_admin_login.status_code == 200
    admin_token = json.loads(res_admin_login.data)['token']

    res_admin_stats = client.get('/api/admin/stats', headers={'Authorization': f'Bearer {admin_token}'})
    assert res_admin_stats.status_code == 200
    print("[PASS] 11. Legitimate PLATFORM_OWNER token succeeds on /api/admin/stats (HTTP 200)")

    print("\n==================================================")
    print("ALL PHASE 1 SECURITY TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

    # Cleanup temporary test database
    with app.app_context():
        db.session.remove()
        db.engine.dispose()
    os.environ.pop("DATABASE_URL", None)
    try:
        shutil.rmtree(_TEMP_TEST_DIR, ignore_errors=True)
    except Exception:
        pass

if __name__ == '__main__':
    test_phase1_security()
