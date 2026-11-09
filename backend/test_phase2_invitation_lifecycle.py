"""
MediConnect — Phase 2: Secure Staff Account Provisioning & Invitation Lifecycle Test Battery
Validates the complete invitation lifecycle across all 5 roles:
1. Platform Owner invites Hospital Super Admin.
2. Hospital Super Admin invites Doctor (linking doctor profile).
3. Hospital Super Admin invites Receptionist.
4. Valid invitation acceptance by new staff member.
5. Expired invitation rejection.
6. Revoked invitation rejection.
7. Reuse of an accepted invitation (replay attack defense).
8. Duplicate email active invitation rejection.
9. Cross-hospital access rejection (Hospital Admin B cannot touch Hospital A staff).
10. Unauthorized role rejection (Receptionist/Doctor/Patient attempting invite endpoints).
11. Resend invitation workflow (token regeneration and old token invalidation).
12. Correct portal login authentication after activation.
"""
import os
import sys
import tempfile
import uuid
from datetime import datetime, timedelta, timezone

_TEMP_DIR = os.path.join(tempfile.gettempdir(), f"phase2_test_{uuid.uuid4().hex[:8]}")
os.makedirs(_TEMP_DIR, exist_ok=True)
_TEMP_DB = os.path.join(_TEMP_DIR, "test_phase2.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEMP_DB}"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from config import Config
Config.DATABASE_URL = f"sqlite:///{_TEMP_DB}"
Config.SQLALCHEMY_DATABASE_URI = f"sqlite:///{_TEMP_DB}"

from app import create_app
from models import db, User, Doctor, Hospital, Specialization, Invitation
from utils.auth_middleware import generate_token
from routes.invitations import _hash_token

def run_phase2_lifecycle_battery():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{_TEMP_DB}"

    results = []

    def record(name, status, detail=""):
        results.append((name, status, detail))
        badge = "[PASS]" if status else "[FAIL]"
        print(f" {badge} {name:<45} | {detail}")

    with app.app_context():
        db.create_all()

        # Seed Specialization
        spec = Specialization(name="Cardiology", slug="cardiology")
        db.session.add(spec)
        db.session.commit()

        # Seed Hospitals
        hosp1 = Hospital(
            name="Alpha General Hospital",
            slug="alpha-general",
            image="https://example.com/hosp1.jpg",
            address="100 Alpha St",
            city="Hyderabad",
            state="Telangana",
            phone="+91 40 1000 0001",
            email="info@alphageneral.com",
            emergency_number="+91 40 1000 0002"
        )
        hosp2 = Hospital(
            name="Beta Medical Center",
            slug="beta-medical",
            image="https://example.com/hosp2.jpg",
            address="200 Beta Ave",
            city="Bengaluru",
            state="Karnataka",
            phone="+91 80 2000 0001",
            email="info@betamedical.com",
            emergency_number="+91 80 2000 0002"
        )
        db.session.add_all([hosp1, hosp2])
        db.session.commit()

        # Seed Users
        owner = User(name="Root Owner", email="owner@mediconnect.com", phone="+91 90000 00001", role="PLATFORM_OWNER", is_active=True)
        owner.set_password("OwnerPassword123!")
        
        admin_hosp1 = User(name="Admin Alpha", email="admin.hosp1@alpha.com", phone="+91 90000 00002", role="HOSPITAL_SUPER_ADMIN", hospital_id=hosp1.id, is_active=True)
        admin_hosp1.set_password("AdminAlpha123!")

        admin_hosp2 = User(name="Admin Beta", email="admin.hosp2@beta.com", phone="+91 90000 00003", role="HOSPITAL_SUPER_ADMIN", hospital_id=hosp2.id, is_active=True)
        admin_hosp2.set_password("AdminBeta123!")

        receptionist = User(name="Reception Alpha", email="rec.alpha@alpha.com", phone="+91 90000 00004", role="RECEPTIONIST", hospital_id=hosp1.id, is_active=True)
        receptionist.set_password("RecAlpha123!")

        patient = User(name="Patient User", email="patient.user@test.com", phone="+91 90000 00005", role="USER", is_active=True)
        patient.set_password("Patient123!")

        db.session.add_all([owner, admin_hosp1, admin_hosp2, receptionist, patient])
        db.session.commit()

        # Seed Unlinked Doctor Profiles in Hospital 1 & Hospital 2
        doc_profile_hosp1 = Doctor(
            name="Dr. Unlinked Alpha",
            specialization_id=spec.id,
            hospital_id=hosp1.id,
            image="https://example.com/doc1.jpg",
            qualification="MBBS, MD (Cardiology)",
            user_id=None,
            experience=10,
            consultation_fee=600.0,
            location="Hyderabad",
            rating=4.9,
            total_reviews=20
        )
        doc_profile_hosp2 = Doctor(
            name="Dr. Unlinked Beta",
            specialization_id=spec.id,
            hospital_id=hosp2.id,
            image="https://example.com/doc2.jpg",
            qualification="MBBS, MS",
            user_id=None,
            experience=8,
            consultation_fee=500.0,
            location="Bengaluru",
            rating=4.7,
            total_reviews=15
        )
        db.session.add_all([doc_profile_hosp1, doc_profile_hosp2])
        db.session.commit()

        owner_token = generate_token(owner)
        admin1_token = generate_token(admin_hosp1)
        admin2_token = generate_token(admin_hosp2)
        rec_token = generate_token(receptionist)
        patient_token = generate_token(patient)

        client = app.test_client()

        print("\n" + "=" * 75)
        print("       MEDICONNECT PHASE 2: STAFF INVITATION LIFECYCLE TESTS")
        print("=" * 75 + "\n")

        # -------------------------------------------------------------
        # 1. Platform Owner invites Hospital Super Admin
        # -------------------------------------------------------------
        r = client.post('/api/platform/invitations', headers={'Authorization': f'Bearer {owner_token}'}, json={
            'email': 'new.superadmin@hospitala.com',
            'role': 'HOSPITAL_SUPER_ADMIN',
            'hospital_id': hosp1.id
        })
        d = r.get_json()
        status = r.status_code == 201 and d.get('success') and 'token' in d.get('invitation', {})
        admin_invite_token = d.get('invitation', {}).get('token')
        record("1. Platform Owner Invites Hospital Super Admin", status, f"HTTP {r.status_code} - Invite Link: {d.get('invitation', {}).get('invite_link')}")

        # -------------------------------------------------------------
        # 2. Hospital Super Admin invites Doctor (linking doctor profile)
        # -------------------------------------------------------------
        r = client.post('/api/hospital/invitations', headers={'Authorization': f'Bearer {admin1_token}'}, json={
            'email': 'new.doctor@hospitala.com',
            'role': 'DOCTOR',
            'doctor_profile_id': doc_profile_hosp1.id
        })
        d = r.get_json()
        status = r.status_code == 201 and d.get('success') and d.get('invitation', {}).get('doctor_profile_id') == doc_profile_hosp1.id
        doc_invite_token = d.get('invitation', {}).get('token')
        doc_invite_id = d.get('invitation', {}).get('id')
        record("2. Hospital Super Admin Invites Doctor", status, f"HTTP {r.status_code} - Linked Profile ID: {doc_profile_hosp1.id}")

        # -------------------------------------------------------------
        # 3. Hospital Super Admin invites Receptionist
        # -------------------------------------------------------------
        r = client.post('/api/hospital/invitations', headers={'Authorization': f'Bearer {admin1_token}'}, json={
            'email': 'new.receptionist@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        d = r.get_json()
        status = r.status_code == 201 and d.get('success') and d.get('invitation', {}).get('role') == 'RECEPTIONIST'
        rec_invite_token = d.get('invitation', {}).get('token')
        rec_invite_id = d.get('invitation', {}).get('id')
        record("3. Hospital Super Admin Invites Receptionist", status, f"HTTP {r.status_code} - Role: RECEPTIONIST")

        # -------------------------------------------------------------
        # 4. Valid Invitation Acceptance by New Staff Member
        # -------------------------------------------------------------
        r = client.post('/api/invitations/accept', json={
            'token': doc_invite_token,
            'name': 'Dr. Verified Staff',
            'phone': '+91 98888 12345',
            'password': 'StaffPassword123!',
            'confirm_password': 'StaffPassword123!'
        })
        d = r.get_json()
        new_doc_user = User.query.filter_by(email='new.doctor@hospitala.com').first()
        status = (r.status_code == 201 and d.get('success') and
                  new_doc_user is not None and new_doc_user.role == 'DOCTOR' and
                  doc_profile_hosp1.user_id == new_doc_user.id)
        record("4. Valid Invitation Acceptance (Doctor)", status, f"HTTP {r.status_code} - User Created with Doctor Link ID {doc_profile_hosp1.id}")

        # -------------------------------------------------------------
        # 5. Reuse of Accepted Invitation (Replay Attack Defense)
        # -------------------------------------------------------------
        r = client.post('/api/invitations/accept', json={
            'token': doc_invite_token,
            'name': 'Hacker Impersonator',
            'password': 'EvilPassword123!',
            'confirm_password': 'EvilPassword123!'
        })
        d = r.get_json()
        status = r.status_code == 400 and not d.get('success') and 'already been accepted' in d.get('message', '').lower()
        record("5. Reuse of Accepted Token (Replay Defense)", status, f"HTTP {r.status_code} - Rejected: {d.get('message')}")

        # -------------------------------------------------------------
        # 6. Revoked Invitation Rejection
        # -------------------------------------------------------------
        # Create temp invite and revoke it
        r_temp = client.post('/api/hospital/invitations', headers={'Authorization': f'Bearer {admin1_token}'}, json={
            'email': 'to_be_revoked@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        temp_id = r_temp.get_json()['invitation']['id']
        temp_token = r_temp.get_json()['invitation']['token']
        # Revoke
        r_rev = client.delete(f'/api/hospital/invitations/{temp_id}/revoke', headers={'Authorization': f'Bearer {admin1_token}'})
        # Try to verify revoked
        r_v = client.get(f'/api/invitations/verify/{temp_token}')
        # Try to accept revoked
        r_acc = client.post('/api/invitations/accept', json={
            'token': temp_token,
            'name': 'Revoked Staff',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        status = r_rev.status_code == 200 and r_v.status_code == 400 and r_acc.status_code == 400 and 'revoked' in r_acc.get_json().get('message', '').lower()
        record("6. Revoked Invitation Rejection", status, f"HTTP {r_acc.status_code} - Rejected: {r_acc.get_json().get('message')}")

        # -------------------------------------------------------------
        # 7. Expired Invitation Rejection
        # -------------------------------------------------------------
        raw_exp_token = "expired_test_token_sample_123456789"
        exp_hash = _hash_token(raw_exp_token)
        exp_inv = Invitation(
            email="expired.staff@hospitala.com",
            role="RECEPTIONIST",
            hospital_id=hosp1.id,
            token_hash=exp_hash,
            invited_by_id=admin_hosp1.id,
            expires_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        db.session.add(exp_inv)
        db.session.commit()

        r_v_exp = client.get(f'/api/invitations/verify/{raw_exp_token}')
        r_acc_exp = client.post('/api/invitations/accept', json={
            'token': raw_exp_token,
            'name': 'Expired Staff',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        status = r_v_exp.status_code == 400 and r_acc_exp.status_code == 400 and 'expired' in r_acc_exp.get_json().get('message', '').lower()
        record("7. Expired Invitation Rejection", status, f"HTTP {r_acc_exp.status_code} - Rejected: {r_acc_exp.get_json().get('message')}")

        # -------------------------------------------------------------
        # 8. Duplicate Active Email Invitation Rejection
        # -------------------------------------------------------------
        r_dup = client.post('/api/hospital/invitations', headers={'Authorization': f'Bearer {admin1_token}'}, json={
            'email': 'new.receptionist@hospitala.com',
            'role': 'RECEPTIONIST'
        })
        status = r_dup.status_code == 409 and 'already pending' in r_dup.get_json().get('message', '').lower()
        record("8. Duplicate Pending Email Rejection", status, f"HTTP {r_dup.status_code} - {r_dup.get_json().get('message')}")

        # -------------------------------------------------------------
        # 9. Cross-Hospital Access Rejection
        # -------------------------------------------------------------
        # Admin 2 tries to revoke Admin 1's receptionist invite -> 403
        r_cross_rev = client.delete(f'/api/hospital/invitations/{rec_invite_id}/revoke', headers={'Authorization': f'Bearer {admin2_token}'})
        # Admin 2 tries to link Admin 1's doctor profile -> 403
        r_cross_link = client.post('/api/hospital/invitations', headers={'Authorization': f'Bearer {admin2_token}'}, json={
            'email': 'cross_link@test.com',
            'role': 'DOCTOR',
            'doctor_profile_id': doc_profile_hosp1.id
        })
        status = r_cross_rev.status_code == 403 and r_cross_link.status_code == 403
        record("9. Cross-Hospital Access Rejection", status, f"HTTP {r_cross_rev.status_code} / {r_cross_link.status_code} - Multi-Hospital Scoping Enforced")

        # -------------------------------------------------------------
        # 10. Unauthorized Role Rejection (RBAC Enforcement)
        # -------------------------------------------------------------
        # Receptionist tries to invite -> 403
        r_rec_invite = client.post('/api/hospital/invitations', headers={'Authorization': f'Bearer {rec_token}'}, json={
            'email': 'unauth1@test.com', 'role': 'RECEPTIONIST'
        })
        # Patient tries to invite -> 403
        r_pat_invite = client.post('/api/hospital/invitations', headers={'Authorization': f'Bearer {patient_token}'}, json={
            'email': 'unauth2@test.com', 'role': 'RECEPTIONIST'
        })
        # Patient tries to query invitations -> 403
        r_pat_list = client.get('/api/hospital/invitations', headers={'Authorization': f'Bearer {patient_token}'})
        status = r_rec_invite.status_code == 403 and r_pat_invite.status_code == 403 and r_pat_list.status_code == 403
        record("10. Unauthorized Role Rejection (RBAC)", status, f"Receptionist ({r_rec_invite.status_code}), Patient ({r_pat_invite.status_code}) Blocked")

        # -------------------------------------------------------------
        # 11. Resend Invitation Workflow
        # -------------------------------------------------------------
        r_resend = client.post(f'/api/hospital/invitations/{rec_invite_id}/resend', headers={'Authorization': f'Bearer {admin1_token}'})
        d_res = r_resend.get_json()
        new_rec_token = d_res.get('invitation', {}).get('token')
        # Old token is rejected
        r_old_v = client.get(f'/api/invitations/verify/{rec_invite_token}')
        # New token verified
        r_new_v = client.get(f'/api/invitations/verify/{new_rec_token}')
        status = r_resend.status_code == 200 and r_old_v.status_code == 400 and r_new_v.status_code == 200
        record("11. Resend Invitation (Token Regeneration)", status, f"HTTP {r_resend.status_code} - Old Invalidated (400), New Verified (200)")

        # -------------------------------------------------------------
        # 12. Correct Portal Login After Activation
        # -------------------------------------------------------------
        r_login = client.post('/api/auth/login', json={
            'email': 'new.doctor@hospitala.com',
            'password': 'StaffPassword123!'
        })
        d_login = r_login.get_json()
        status = (r_login.status_code == 200 and d_login.get('success') and
                  d_login.get('user', {}).get('role') == 'DOCTOR' and
                  d_login.get('user', {}).get('hospital_id') == hosp1.id)
        record("12. Activated Account Login Authentication", status, f"HTTP {r_login.status_code} - Authenticated as DOCTOR at Hospital {hosp1.id}")

        print("\n" + "=" * 75)
        passed = sum(1 for _, s, _ in results if s)
        total = len(results)
        print(f"       RESULT: {passed} / {total} CHECKS PASSED ({(passed/total)*100:.1f}%)")
        print("=" * 75 + "\n")

        return passed == total

if __name__ == '__main__':
    success = run_phase2_lifecycle_battery()
    sys.exit(0 if success else 1)
