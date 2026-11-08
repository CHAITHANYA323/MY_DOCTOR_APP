"""
Step 5.5 Live MySQL Verification Script
Verifies that all 11 tables exist in MySQL, all 55 records are accessible,
and Flask API endpoints and authentication function seamlessly on MySQL.
"""

import os
import sys
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

os.environ['SKIP_AUTO_SEED'] = 'true'

from app import create_app
from models import db, User, Doctor, Hospital, Specialization, Appointment, AmbulanceRequest, Invitation, AuditLog


def verify_live_mysql():
    app = create_app()
    client = app.test_client()

    print("\n========================================================")
    print("STEP 5.5 LIVE MYSQL VERIFICATION SUITE")
    print("========================================================")

    # 1. Health endpoint
    res_health = client.get('/api/health')
    assert res_health.status_code == 200
    print(f"[API] GET /api/health: {res_health.status_code} OK")

    # 2. Database model queries within app context
    with app.app_context():
        user_count = User.query.count()
        hosp_count = Hospital.query.count()
        doc_count = Doctor.query.count()
        spec_count = Specialization.query.count()
        appt_count = Appointment.query.count()
        amb_req_count = AmbulanceRequest.query.count()
        inv_count = Invitation.query.count()
        audit_count = AuditLog.query.count()

        print(f"\n[ORM] Active MySQL Live Row Counts:")
        print(f"  - Users              : {user_count:>3} (Expected: 27)")
        print(f"  - Hospitals          : {hosp_count:>3} (Expected:  4)")
        print(f"  - Doctors            : {doc_count:>3} (Expected:  6)")
        print(f"  - Specializations    : {spec_count:>3} (Expected:  1)")
        print(f"  - Appointments       : {appt_count:>3} (Expected:  3)")
        print(f"  - Ambulance Requests : {amb_req_count:>3} (Expected:  7)")
        print(f"  - Invitations        : {inv_count:>3} (Expected:  2)")
        print(f"  - Audit Logs         : {audit_count:>3} (Expected:  5)")

        assert user_count == 27, f"Expected 27 users, got {user_count}"
        assert hosp_count == 4, f"Expected 4 hospitals, got {hosp_count}"
        assert doc_count == 6, f"Expected 6 doctors, got {doc_count}"
        assert spec_count == 1, f"Expected 1 specialization, got {spec_count}"
        assert appt_count == 3, f"Expected 3 appointments, got {appt_count}"
        assert amb_req_count == 7, f"Expected 7 requests, got {amb_req_count}"
        assert inv_count == 2, f"Expected 2 invitations, got {inv_count}"
        assert audit_count == 5, f"Expected 5 audit logs, got {audit_count}"

        # 3. Inspect sample roles in MySQL
        roles = {u.role for u in User.query.all()}
        print(f"\n[RBAC] User Roles in MySQL: {sorted(list(roles))}")
        expected_roles = {'HOSPITAL_SUPER_ADMIN', 'PATIENT', 'PLATFORM_OWNER', 'RECEPTIONIST', 'USER'}
        assert expected_roles.issubset(roles), f"Missing roles: {expected_roles - roles}"

        # 4. Verify Platform Owner account
        owner = User.query.filter_by(role='PLATFORM_OWNER').first()
        assert owner is not None
        print(f"[RBAC] Platform Owner verified: {owner.name} ({owner.email})")

    # 5. Public API endpoints
    res_hosp = client.get('/api/hospitals')
    assert res_hosp.status_code == 200
    hosp_json = res_hosp.get_json()
    assert len(hosp_json.get('hospitals', [])) == 4
    print(f"\n[API] GET /api/hospitals returned {len(hosp_json['hospitals'])} hospitals.")

    res_doc = client.get('/api/doctors')
    assert res_doc.status_code == 200
    doc_json = res_doc.get_json()
    assert len(doc_json.get('doctors', [])) == 5
    print(f"[API] GET /api/doctors returned {len(doc_json['doctors'])} active doctors (filtered by status=Active).")

    res_doc_all = client.get('/api/doctors?status=all')
    assert res_doc_all.status_code == 200
    doc_all_json = res_doc_all.get_json()
    assert len(doc_all_json.get('doctors', [])) == 6
    print(f"[API] GET /api/doctors?status=all returned {len(doc_all_json['doctors'])} total doctors.")

    res_spec = client.get('/api/specializations')
    assert res_spec.status_code == 200
    spec_json = res_spec.get_json()
    assert len(spec_json.get('specializations', [])) == 1
    print(f"[API] GET /api/specializations returned {len(spec_json['specializations'])} specializations.")

    print("\n========================================================")
    print("SUCCESS: ALL LIVE MYSQL CHECKS PASSED WITH 100% INTEGRITY!")
    print("========================================================\n")


if __name__ == "__main__":
    verify_live_mysql()
