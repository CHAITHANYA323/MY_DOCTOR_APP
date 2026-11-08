"""
MediConnect Step 5.6: Interactive Verification of All 5 Role Portals
Verifies end-to-end authentication, role-based dashboard access, workflow endpoints,
and RBAC cross-tenant boundary protections against the live local MySQL database.

Roles Tested:
1. Platform Owner (owner@mediconnect.com)
2. Hospital Super Admin (admin.hosp1@medicare.com)
3. Receptionist (reception.hosp1@medicare.com)
4. Doctor (dr.one@medicare.com)
5. Patient (patient.alpha@test.com)
"""

import sys
import os
import json
from pathlib import Path

# Set backend directory in sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

os.environ['SKIP_AUTO_SEED'] = 'true'

from app import create_app
from models import db, User, Hospital, Doctor, Appointment, Specialization, AuditLog, Invitation
from utils.auth_middleware import decode_token


def run_portal_verification():
    app = create_app()
    client = app.test_client()

    print("\n" + "=" * 70)
    print("MEDICONNECT STEP 5.6: INTERACTIVE 5-ROLE PORTAL VERIFICATION")
    print("=" * 70)

    # -------------------------------------------------------------------------
    # 0. System & Database Health Check
    # -------------------------------------------------------------------------
    print("\n--- [Phase 0] System & Database Health Check ---")
    res_health = client.get('/api/health')
    assert res_health.status_code == 200, f"Health check failed: {res_health.status_code}"
    print(f"[*] API Health (/api/health): {res_health.status_code} OK")

    with app.app_context():
        user_cnt = User.query.count()
        hosp_cnt = Hospital.query.count()
        doc_cnt = Doctor.query.count()
        appt_cnt = Appointment.query.count()
        assert user_cnt == 27, f"Expected 27 users, found {user_cnt}"
        assert hosp_cnt == 4, f"Expected 4 hospitals, found {hosp_cnt}"
        assert doc_cnt == 6, f"Expected 6 doctors, found {doc_cnt}"
        assert appt_cnt == 3, f"Expected 3 appointments, found {appt_cnt}"
        print(f"[*] MySQL Database Parity Verified: 27 Users, 4 Hospitals, 6 Doctors, 3 Appointments")

    # Track role results
    role_results = {}

    # -------------------------------------------------------------------------
    # 1. Platform Owner Portal Verification
    # -------------------------------------------------------------------------
    print("\n--- [Role 1] Platform Owner Portal Verification ---")
    owner_email = "owner@mediconnect.com"
    owner_pwd = "Owner@123"

    res_login = client.post('/api/login', json={'email': owner_email, 'password': owner_pwd})
    assert res_login.status_code == 200, f"Owner login failed: {res_login.status_code}"
    owner_data = res_login.get_json()
    owner_token = owner_data.get('token')
    assert owner_token, "Owner token missing"
    assert owner_data['user']['role'] == 'PLATFORM_OWNER'
    owner_headers = {'Authorization': f'Bearer {owner_token}'}
    print(f"[*] Login: 200 OK | Authenticated as PLATFORM_OWNER ({owner_email})")

    # Verify /api/auth/me
    res_me = client.get('/api/auth/me', headers=owner_headers)
    assert res_me.status_code == 200
    assert res_me.get_json()['user']['role'] == 'PLATFORM_OWNER'
    print(f"[*] Session Identity (/api/auth/me): Verified")

    # Verify Admin Stats (Platform-wide metrics)
    res_stats = client.get('/api/admin/stats', headers=owner_headers)
    assert res_stats.status_code == 200
    stats_json = res_stats.get_json()
    assert stats_json['success'] is True
    metrics = stats_json['metrics']
    assert metrics['total_doctors'] == 6
    assert metrics['total_hospitals'] == 4
    print(f"[*] Platform Dashboard Metrics (/api/admin/stats): 200 OK (Doctors: {metrics['total_doctors']}, Hospitals: {metrics['total_hospitals']})")

    # Verify Hospital Directory Management
    res_hosps = client.get('/api/hospitals', headers=owner_headers)
    assert res_hosps.status_code == 200
    assert len(res_hosps.get_json().get('hospitals', [])) == 4
    print(f"[*] Hospital Oversight (/api/hospitals): 200 OK (4 hospitals accessible)")

    # Verify Platform Audit Logs
    res_audit = client.get('/api/platform/audit-logs', headers=owner_headers)
    assert res_audit.status_code == 200
    audit_json = res_audit.get_json()
    assert audit_json['success'] is True
    print(f"[*] Security Audit Logs (/api/platform/audit-logs): 200 OK ({len(audit_json.get('audit_logs', []))} log entries)")

    # Verify Cross-Role Access Restriction (Owner cannot access patient medical records)
    res_blocked = client.get('/api/patient/medical-records', headers=owner_headers)
    assert res_blocked.status_code == 403
    print(f"[*] RBAC Boundary Check: Accessing patient-only records correctly returned 403 Forbidden")

    role_results['PLATFORM_OWNER'] = 'PASS'

    # -------------------------------------------------------------------------
    # 2. Hospital Super Admin Portal Verification
    # -------------------------------------------------------------------------
    print("\n--- [Role 2] Hospital Super Admin Portal Verification ---")
    sa_email = "admin.hosp1@medicare.com"
    sa_pwd = "Admin@123"

    res_sa_login = client.post('/api/login', json={'email': sa_email, 'password': sa_pwd})
    assert res_sa_login.status_code == 200
    sa_data = res_sa_login.get_json()
    sa_token = sa_data.get('token')
    assert sa_data['user']['role'] == 'HOSPITAL_SUPER_ADMIN'
    assert sa_data['user']['hospital_id'] == 1
    sa_headers = {'Authorization': f'Bearer {sa_token}'}
    print(f"[*] Login: 200 OK | Authenticated as HOSPITAL_SUPER_ADMIN (Hospital ID: 1)")

    # Hospital-scoped Admin Stats
    res_sa_stats = client.get('/api/admin/stats', headers=sa_headers)
    assert res_sa_stats.status_code == 200
    sa_metrics = res_sa_stats.get_json()['metrics']
    assert sa_metrics['total_hospitals'] == 1, "Hospital Super Admin must see strictly 1 hospital"
    print(f"[*] Scoped Hospital Dashboard (/api/admin/stats): 200 OK (Strictly Hospital 1 scoped)")

    # Hospital Doctors Roster
    res_sa_docs = client.get('/api/doctors?hospital_id=1&status=all', headers=sa_headers)
    assert res_sa_docs.status_code == 200
    sa_docs_json = res_sa_docs.get_json()
    assert len(sa_docs_json.get('doctors', [])) > 0
    print(f"[*] Hospital Doctor Roster (/api/doctors?hospital_id=1): 200 OK ({len(sa_docs_json['doctors'])} doctors)")

    # Hospital Invitations (Staff Management)
    res_sa_inv = client.get('/api/hospital/invitations', headers=sa_headers)
    assert res_sa_inv.status_code == 200
    print(f"[*] Hospital Staff Invitations (/api/hospital/invitations): 200 OK")

    # RBAC Boundary Check: Super Admin cannot access platform audit logs or platform hospitals
    res_sa_audit = client.get('/api/platform/audit-logs', headers=sa_headers)
    assert res_sa_audit.status_code == 403
    print(f"[*] RBAC Boundary Check: Accessing platform audit logs correctly returned 403 Forbidden")

    role_results['HOSPITAL_SUPER_ADMIN'] = 'PASS'

    # -------------------------------------------------------------------------
    # 3. Receptionist Portal Verification
    # -------------------------------------------------------------------------
    print("\n--- [Role 3] Receptionist Portal Verification ---")
    rec_email = "reception.hosp1@medicare.com"
    rec_pwd = "Reception@123"

    res_rec_login = client.post('/api/login', json={'email': rec_email, 'password': rec_pwd})
    assert res_rec_login.status_code == 200
    rec_data = res_rec_login.get_json()
    rec_token = rec_data.get('token')
    assert rec_data['user']['role'] == 'RECEPTIONIST'
    assert rec_data['user']['hospital_id'] == 1
    rec_headers = {'Authorization': f'Bearer {rec_token}'}
    print(f"[*] Login: 200 OK | Authenticated as RECEPTIONIST (Hospital ID: 1)")

    # Reception Operations Dashboard
    res_rec_stats = client.get('/api/reception/stats', headers=rec_headers)
    assert res_rec_stats.status_code == 200
    rec_stats_json = res_rec_stats.get_json()
    assert rec_stats_json['success'] is True
    print(f"[*] Reception Operational Stats (/api/reception/stats): 200 OK")

    # Patient Search / Check-in Lookup
    res_rec_pts = client.get('/api/reception/patients', headers=rec_headers)
    assert res_rec_pts.status_code == 200
    rec_pts_json = res_rec_pts.get_json()
    assert rec_pts_json['success'] is True
    print(f"[*] Patient Search & Check-in (/api/reception/patients): 200 OK ({len(rec_pts_json.get('patients', []))} patients listed)")

    # RBAC Boundary Check: Receptionist cannot access platform audit logs or doctor profile
    res_rec_audit = client.get('/api/platform/audit-logs', headers=rec_headers)
    assert res_rec_audit.status_code == 403
    res_rec_doc = client.get('/api/doctor/profile', headers=rec_headers)
    assert res_rec_doc.status_code == 403
    print(f"[*] RBAC Boundary Check: Accessing platform audit logs (403) and clinical profile (403) correctly blocked")

    role_results['RECEPTIONIST'] = 'PASS'

    # -------------------------------------------------------------------------
    # 4. Doctor Portal Verification
    # -------------------------------------------------------------------------
    print("\n--- [Role 4] Doctor Portal Verification ---")
    doc_email = "dr.one@medicare.com"
    doc_pwd = "Doctor@123"

    res_doc_login = client.post('/api/login', json={'email': doc_email, 'password': doc_pwd})
    assert res_doc_login.status_code == 200
    doc_data = res_doc_login.get_json()
    doc_token = doc_data.get('token')
    assert doc_data['user']['role'] == 'DOCTOR'
    doc_headers = {'Authorization': f'Bearer {doc_token}'}
    print(f"[*] Login: 200 OK | Authenticated as DOCTOR ({doc_email})")

    # Doctor Clinical Profile
    res_doc_prof = client.get('/api/doctor/profile', headers=doc_headers)
    assert res_doc_prof.status_code == 200
    doc_prof_json = res_doc_prof.get_json()
    assert doc_prof_json['success'] is True
    print(f"[*] Doctor Clinical Profile (/api/doctor/profile): 200 OK (Doctor: {doc_prof_json['doctor']['name']})")

    # Doctor Dashboard / Stats
    res_doc_stats = client.get('/api/doctor/stats', headers=doc_headers)
    assert res_doc_stats.status_code == 200
    doc_stats_json = res_doc_stats.get_json()
    assert doc_stats_json['success'] is True
    print(f"[*] Doctor Clinical Agenda (/api/doctor/stats): 200 OK")

    # Doctor Patients
    res_doc_pts = client.get('/api/doctor/patients', headers=doc_headers)
    assert res_doc_pts.status_code == 200
    doc_pts_json = res_doc_pts.get_json()
    assert doc_pts_json['success'] is True
    print(f"[*] Doctor Patient Roster (/api/doctor/patients): 200 OK")

    # RBAC Boundary Check: Doctor cannot access receptionist dashboard or admin stats
    res_doc_rec = client.get('/api/reception/stats', headers=doc_headers)
    assert res_doc_rec.status_code == 403
    res_doc_adm = client.get('/api/admin/stats', headers=doc_headers)
    assert res_doc_adm.status_code == 403
    print(f"[*] RBAC Boundary Check: Accessing reception stats (403) and admin stats (403) correctly blocked")

    role_results['DOCTOR'] = 'PASS'

    # -------------------------------------------------------------------------
    # 5. Patient Portal Verification
    # -------------------------------------------------------------------------
    print("\n--- [Role 5] Patient Portal Verification ---")
    pat_email = "patient.alpha@test.com"
    pat_pwd = "Patient@123"

    res_pat_login = client.post('/api/login', json={'email': pat_email, 'password': pat_pwd})
    assert res_pat_login.status_code == 200
    pat_data = res_pat_login.get_json()
    pat_token = pat_data.get('token')
    assert pat_data['user']['role'] == 'PATIENT'
    pat_headers = {'Authorization': f'Bearer {pat_token}'}
    print(f"[*] Login: 200 OK | Authenticated as PATIENT ({pat_email})")

    # Patient Dashboard
    res_pat_dash = client.get('/api/patient/dashboard', headers=pat_headers)
    assert res_pat_dash.status_code == 200
    pat_dash_json = res_pat_dash.get_json()
    assert pat_dash_json['success'] is True
    print(f"[*] Patient Dashboard (/api/patient/dashboard): 200 OK")

    # Patient Appointments
    res_pat_appts = client.get('/api/patient/appointments', headers=pat_headers)
    assert res_pat_appts.status_code == 200
    pat_appts_json = res_pat_appts.get_json()
    assert pat_appts_json['success'] is True
    print(f"[*] Patient Appointments (/api/patient/appointments): 200 OK")

    # Patient Medical Records
    res_pat_med = client.get('/api/patient/medical-records', headers=pat_headers)
    assert res_pat_med.status_code == 200
    pat_med_json = res_pat_med.get_json()
    assert pat_med_json['success'] is True
    print(f"[*] Patient Medical Records (/api/patient/medical-records): 200 OK")

    # Appointment Booking Availability Check (Read-Only)
    res_slots = client.get('/api/appointments/booked-slots?doctor_id=1&date=2026-11-09', headers=pat_headers)
    assert res_slots.status_code == 200
    slots_json = res_slots.get_json()
    assert slots_json['success'] is True
    print(f"[*] Slot Availability Check (/api/appointments/booked-slots): 200 OK")

    # RBAC Boundary Check: Patient cannot access clinical doctor stats, reception stats, or admin stats
    res_pat_doc = client.get('/api/doctor/stats', headers=pat_headers)
    assert res_pat_doc.status_code == 403
    res_pat_rec = client.get('/api/reception/stats', headers=pat_headers)
    assert res_pat_rec.status_code == 403
    res_pat_adm = client.get('/api/admin/stats', headers=pat_headers)
    assert res_pat_adm.status_code == 403
    print(f"[*] RBAC Boundary Check: Doctor stats (403), reception stats (403), and admin stats (403) correctly blocked")

    role_results['PATIENT'] = 'PASS'

    # -------------------------------------------------------------------------
    # 6. Global Unauthenticated & Invalid Token Boundary Checks
    # -------------------------------------------------------------------------
    print("\n--- [Phase 6] Global Unauthenticated & Tamper Checks ---")
    protected_urls = [
        '/api/admin/stats',
        '/api/reception/stats',
        '/api/doctor/stats',
        '/api/patient/dashboard',
        '/api/platform/audit-logs',
        '/api/auth/me'
    ]

    for url in protected_urls:
        # No header
        res_no_auth = client.get(url)
        assert res_no_auth.status_code == 401, f"Expected 401 for {url}, got {res_no_auth.status_code}"

        # Tampered / Invalid header
        res_bad_auth = client.get(url, headers={'Authorization': 'Bearer forged.tampered.token'})
        assert res_bad_auth.status_code == 401, f"Expected 401 for bad token on {url}, got {res_bad_auth.status_code}"

    print(f"[*] 6/6 Sensitive Endpoints Confirmed 401 Unauthorized for Missing & Tampered Credentials")

    # -------------------------------------------------------------------------
    # Summary Table
    # -------------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("STEP 5.6 VERIFICATION SUMMARY — ALL 5 ROLES PASSED")
    print("=" * 70)
    for r, status in role_results.items():
        print(f"  - {r:<25} : {status}")
    print("=" * 70 + "\n")


def http_req(url, method="GET", data=None, headers=None):
    import urllib.request
    import urllib.error

    if headers is None:
        headers = {}
    if data is not None and isinstance(data, dict):
        data_bytes = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    else:
        data_bytes = None
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            body = response.read().decode("utf-8")
            return response.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body) if body else {}
        except Exception:
            parsed = {}
        return e.code, parsed


def verify_live_http_network(base_url, label):
    print(f"\n======================================================================")
    print(f"LIVE NETWORK HTTP VERIFICATION: {label} ({base_url})")
    print(f"======================================================================")

    # 1. Health
    status, health_body = http_req(f"{base_url}/api/health")
    assert status == 200, f"Health failed on {base_url}: {status}"
    print(f"[*] GET {base_url}/api/health: {status} OK")

    # 2. Platform Owner
    status, res = http_req(f"{base_url}/api/login", "POST", {'email': 'owner@mediconnect.com', 'password': 'Owner@123'})
    assert status == 200 and res.get('success'), f"Owner login failed: {status}"
    owner_token = res['token']
    owner_hdrs = {'Authorization': f'Bearer {owner_token}'}

    status, stats = http_req(f"{base_url}/api/admin/stats", headers=owner_hdrs)
    assert status == 200 and stats.get('success'), f"Owner stats failed: {status}"
    print(f"[*] [Role: PLATFORM_OWNER] Live HTTP Login & /api/admin/stats: 200 OK")

    # 3. Hospital Super Admin
    status, res = http_req(f"{base_url}/api/login", "POST", {'email': 'admin.hosp1@medicare.com', 'password': 'Admin@123'})
    assert status == 200 and res.get('success'), f"Super Admin login failed: {status}"
    sa_token = res['token']
    sa_hdrs = {'Authorization': f'Bearer {sa_token}'}

    status, sa_stats = http_req(f"{base_url}/api/admin/stats", headers=sa_hdrs)
    assert status == 200 and sa_stats.get('success'), f"SA stats failed: {status}"
    status, sa_audit = http_req(f"{base_url}/api/platform/audit-logs", headers=sa_hdrs)
    assert status == 403, f"SA audit should be 403, got {status}"
    print(f"[*] [Role: HOSPITAL_SUPER_ADMIN] Live HTTP Login & Hospital-scoped Stats: 200 OK (RBAC 403 verified)")

    # 4. Receptionist
    status, res = http_req(f"{base_url}/api/login", "POST", {'email': 'reception.hosp1@medicare.com', 'password': 'Reception@123'})
    assert status == 200 and res.get('success'), f"Receptionist login failed: {status}"
    rec_token = res['token']
    rec_hdrs = {'Authorization': f'Bearer {rec_token}'}

    status, rec_stats = http_req(f"{base_url}/api/reception/stats", headers=rec_hdrs)
    assert status == 200 and rec_stats.get('success'), f"Reception stats failed: {status}"
    status, rec_audit = http_req(f"{base_url}/api/platform/audit-logs", headers=rec_hdrs)
    assert status == 403
    print(f"[*] [Role: RECEPTIONIST] Live HTTP Login & Reception Stats: 200 OK (RBAC 403 verified)")

    # 5. Doctor
    status, res = http_req(f"{base_url}/api/login", "POST", {'email': 'dr.one@medicare.com', 'password': 'Doctor@123'})
    assert status == 200 and res.get('success'), f"Doctor login failed: {status}"
    doc_token = res['token']
    doc_hdrs = {'Authorization': f'Bearer {doc_token}'}

    status, doc_prof = http_req(f"{base_url}/api/doctor/profile", headers=doc_hdrs)
    assert status == 200 and doc_prof.get('success'), f"Doctor profile failed: {status}"
    status, doc_adm = http_req(f"{base_url}/api/admin/stats", headers=doc_hdrs)
    assert status == 403
    print(f"[*] [Role: DOCTOR] Live HTTP Login & Clinical Profile: 200 OK (RBAC 403 verified)")

    # 6. Patient
    status, res = http_req(f"{base_url}/api/login", "POST", {'email': 'patient.alpha@test.com', 'password': 'Patient@123'})
    assert status == 200 and res.get('success'), f"Patient login failed: {status}"
    pat_token = res['token']
    pat_hdrs = {'Authorization': f'Bearer {pat_token}'}

    status, pat_dash = http_req(f"{base_url}/api/patient/dashboard", headers=pat_hdrs)
    assert status == 200 and pat_dash.get('success'), f"Patient dashboard failed: {status}"
    status, pat_adm = http_req(f"{base_url}/api/admin/stats", headers=pat_hdrs)
    assert status == 403
    print(f"[*] [Role: PATIENT] Live HTTP Login & Patient Dashboard: 200 OK (RBAC 403 verified)")

    # 7. Unauthenticated 401
    status, _ = http_req(f"{base_url}/api/admin/stats")
    assert status == 401
    print(f"[*] [Security] Live HTTP Unauthenticated Access: 401 Unauthorized confirmed")
    print(f"[*] {label} VERIFICATION COMPLETE: ALL CHECKS PASSED OVER LIVE NETWORK!\n")


if __name__ == "__main__":
    run_portal_verification()
    verify_live_http_network("http://127.0.0.1:5000", "BACKEND FLASK SERVER")
    verify_live_http_network("http://localhost:5173", "FRONTEND VITE DEV REVERSE PROXY")
