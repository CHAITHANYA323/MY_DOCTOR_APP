"""
MediConnect — Phase 2: Multi-Role Registration & Approval Integration Test Suite
Validates the complete registration, credentialing, pending restrictions, and approval workflows:
 1. Direct Patient Registration & Immediate Login (Preserved Phase 1 behavior)
 2. Doctor Registration Request (Pending Approval status & Doctor profile creation)
 3. Pending Doctor Login Interception (HTTP 403 ACCOUNT_PENDING_APPROVAL)
 4. Pending Doctor Protected Endpoint Defense (JWT blocked by auth_middleware)
 5. Cross-Hospital IDOR Defense (HSA Hospital 2 cannot approve Hospital 1 staff)
 6. Valid Hospital Super Admin Doctor Approval (User active, Doctor active, login enabled)
 7. Repeated / Duplicate Approval Rejection (HTTP 400 Bad Request)
 8. Receptionist Registration Request & Approval Workflow
 9. Institutional Rejection Workflow (Audit reason recorded, login blocked with reason)
10. Hospital Super Admin Registration Request (hospital_id=None, PENDING_APPROVAL)
11. Platform Owner Approval & Automatic Hospital Entity Provisioning
12. Platform Owner Rejection of Super Admin Request
13. Public Platform Owner Registration Strictly Denied (HTTP 403)
14. Duplicate Email and Duplicate Medical Registration Number Rejection (HTTP 409)
15. Existing Invitation Workflow Compatibility (Zero regression)
"""
import os
import sys
import tempfile
import uuid
import json
from datetime import datetime, timedelta, timezone

_TEMP_DIR = os.path.join(tempfile.gettempdir(), f"phase2_reg_test_{uuid.uuid4().hex[:8]}")
os.makedirs(_TEMP_DIR, exist_ok=True)
_TEMP_DB = os.path.join(_TEMP_DIR, "test_phase2_reg.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEMP_DB}"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from config import Config
Config.DATABASE_URL = f"sqlite:///{_TEMP_DB}"
Config.SQLALCHEMY_DATABASE_URI = f"sqlite:///{_TEMP_DB}"

from app import create_app
from models import db, User, Doctor, Hospital, Specialization, Invitation, AuditLog
from utils.auth_middleware import generate_token


def run_phase2_test_battery():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{_TEMP_DB}"

    results = []

    def record(name, status, detail=""):
        results.append((name, status, detail))
        badge = "[PASS]" if status else "[FAIL]"
        print(f" {badge} {name:<52} | {detail}")

    with app.app_context():
        # Ensure database and tables exist
        db.create_all()

        # Query seeded resources
        cardio = Specialization.query.filter(Specialization.name.ilike('%Cardiology%')).first()
        if not cardio:
            cardio = Specialization(name="Cardiology", slug="cardiology")
            db.session.add(cardio)
            db.session.commit()

        neuro = Specialization.query.filter(Specialization.name.ilike('%Neurology%')).first()
        if not neuro:
            neuro = Specialization(name="Neurology", slug="neuro")
            db.session.add(neuro)
            db.session.commit()

        hospitals = Hospital.query.limit(2).all()
        if len(hospitals) >= 2:
            hosp1, hosp2 = hospitals[0], hospitals[1]
        else:
            hosp1 = Hospital(
                name="Apex Apollo Hospital",
                slug="apex-apollo-hospital",
                image="https://example.com/apollo.jpg",
                address="Jubilee Hills",
                city="Hyderabad",
                state="Telangana",
                phone="+91 40 2360 7777",
                email="info@apexapollo.com",
                emergency_number="1066"
            )
            hosp2 = Hospital(
                name="Fortis Care Hospital",
                slug="fortis-care-hospital",
                image="https://example.com/fortis.jpg",
                address="Banjara Hills",
                city="Hyderabad",
                state="Telangana",
                phone="+91 40 4000 8888",
                email="info@fortiscare.com",
                emergency_number="105"
            )
            db.session.add_all([hosp1, hosp2])
            db.session.commit()

        # Setup test Platform Owner
        owner = User.query.filter_by(role='PLATFORM_OWNER').first()
        if not owner:
            owner = User(
                name="Test Platform Owner",
                email="test.owner@mediconnect.com",
                role="PLATFORM_OWNER",
                approval_status="APPROVED",
                is_active=True
            )
            owner.set_password("OwnerSecure123!")
            db.session.add(owner)
            db.session.commit()
        else:
            owner.set_password("OwnerSecure123!")
            owner.approval_status = "APPROVED"
            owner.is_active = True
            db.session.commit()

        # Setup test Super Admins for Hospital 1 and Hospital 2
        hsa1 = User.query.filter_by(hospital_id=hosp1.id, role='HOSPITAL_SUPER_ADMIN').first()
        if not hsa1:
            hsa1 = User(
                name="Hospital 1 Super Admin",
                email=f"hsa1_{uuid.uuid4().hex[:6]}@hosp1.com",
                role="HOSPITAL_SUPER_ADMIN",
                hospital_id=hosp1.id,
                approval_status="APPROVED",
                is_active=True
            )
            hsa1.set_password("AdminSecure123!")
            db.session.add(hsa1)
            db.session.commit()
        else:
            hsa1.set_password("AdminSecure123!")
            hsa1.approval_status = "APPROVED"
            hsa1.is_active = True
            db.session.commit()

        hsa2 = User.query.filter_by(hospital_id=hosp2.id, role='HOSPITAL_SUPER_ADMIN').first()
        if not hsa2:
            hsa2 = User(
                name="Hospital 2 Super Admin",
                email=f"hsa2_{uuid.uuid4().hex[:6]}@hosp2.com",
                role="HOSPITAL_SUPER_ADMIN",
                hospital_id=hosp2.id,
                approval_status="APPROVED",
                is_active=True
            )
            hsa2.set_password("AdminSecure123!")
            db.session.add(hsa2)
            db.session.commit()
        else:
            hsa2.set_password("AdminSecure123!")
            hsa2.approval_status = "APPROVED"
            hsa2.is_active = True
            db.session.commit()

        owner_token = generate_token(owner)
        hsa1_token = generate_token(hsa1)
        hsa2_token = generate_token(hsa2)

        client = app.test_client()

        print("\n" + "=" * 80)
        print("MEDICONNECT PHASE 2: MULTI-ROLE REGISTRATION & APPROVAL TEST SUITE")
        print("=" * 80)

        # ---------------------------------------------------------------------
        # 1. Patient Direct Registration & Immediate Login
        # ---------------------------------------------------------------------
        pat_email = f"patient_{uuid.uuid4().hex[:6]}@example.com"
        res = client.post('/api/auth/register', json={
            'name': 'Ramesh Sharma',
            'email': pat_email,
            'phone': '+91 98765 43210',
            'password': 'PatientPass123!',
            'confirm_password': 'PatientPass123!',
            'role': 'PATIENT'
        })
        p_data = res.get_json() or {}
        p_ok = res.status_code == 201 and p_data.get('success') is True
        p_user = User.query.filter_by(email=pat_email).first()
        p_status_ok = p_user and p_user.approval_status == 'APPROVED' and p_user.is_active is True

        # Test login
        l_res = client.post('/api/auth/login', json={
            'email': pat_email,
            'password': 'PatientPass123!'
        })
        l_ok = l_res.status_code == 200 and 'token' in (l_res.get_json() or {})
        record(
            "1. Patient Direct Registration & Login",
            p_ok and p_status_ok and l_ok,
            f"HTTP {res.status_code} | approval_status={p_user.approval_status if p_user else None}"
        )

        # ---------------------------------------------------------------------
        # 2. Doctor Registration Request (Pending Approval)
        # ---------------------------------------------------------------------
        doc_email = f"dr.ananya_{uuid.uuid4().hex[:6]}@apollo.com"
        doc_reg_no = f"TSMC/2021/{uuid.uuid4().hex[:5].upper()}"
        res = client.post('/api/auth/register-request', json={
            'name': 'Dr. Ananya Verma',
            'email': doc_email,
            'phone': '+91 98222 11001',
            'password': 'DoctorSecret123!',
            'confirm_password': 'DoctorSecret123!',
            'role': 'DOCTOR',
            'hospital_id': hosp1.id,
            'specialization_id': cardio.id,
            'registration_number': doc_reg_no,
            'council_name': 'Telangana State Medical Council',
            'qualification': 'MBBS, MD (Cardiology)',
            'experience': 8,
            'designation': 'Associate Consultant',
            'consultation_fee': 750.0
        })
        doc_req_ok = res.status_code == 201 and res.get_json().get('success') is True
        doc_user = User.query.filter_by(email=doc_email).first()
        doc_user_pending = (
            doc_user is not None and
            doc_user.approval_status == 'PENDING_APPROVAL' and
            doc_user.is_active is False
        )
        doc_profile = Doctor.query.filter_by(user_id=doc_user.id).first() if doc_user else None
        doc_profile_pending = (
            doc_profile is not None and
            doc_profile.status == 'Pending' and
            doc_profile.registration_number == doc_reg_no
        )
        record(
            "2. Doctor Registration Request Created",
            doc_req_ok and doc_user_pending and doc_profile_pending,
            f"User status={doc_user.approval_status if doc_user else None} | Doctor status={doc_profile.status if doc_profile else None}"
        )

        # ---------------------------------------------------------------------
        # 3. Pending Doctor Login Interception
        # ---------------------------------------------------------------------
        l_doc_res = client.post('/api/auth/login', json={
            'email': doc_email,
            'password': 'DoctorSecret123!'
        })
        l_doc_data = l_doc_res.get_json() or {}
        doc_login_blocked = (
            l_doc_res.status_code == 403 and
            l_doc_data.get('error_code') == 'ACCOUNT_PENDING_APPROVAL'
        )
        record(
            "3. Pending Doctor Login Intercepted",
            doc_login_blocked,
            f"HTTP {l_doc_res.status_code} | error_code={l_doc_data.get('error_code')}"
        )

        # ---------------------------------------------------------------------
        # 4. Pending Doctor Protected Endpoint Defense
        # ---------------------------------------------------------------------
        pending_token = generate_token(doc_user)
        prot_res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {pending_token}'})
        prot_data = prot_res.get_json() or {}
        middleware_blocked = (
            prot_res.status_code == 403 and
            prot_data.get('error_code') == 'ACCOUNT_PENDING_APPROVAL'
        )
        record(
            "4. Pending Account Protected Access Defense",
            middleware_blocked,
            f"HTTP {prot_res.status_code} | error_code={prot_data.get('error_code')}"
        )

        # ---------------------------------------------------------------------
        # 5. Cross-Hospital IDOR Defense
        # ---------------------------------------------------------------------
        # HSA2 (Hospital 2) attempts to approve Dr. Ananya (Hospital 1)
        idor_res = client.post(
            f'/api/hospital/approvals/{doc_user.id}/approve',
            headers={'Authorization': f'Bearer {hsa2_token}'}
        )
        idor_blocked = idor_res.status_code == 403
        record(
            "5. Cross-Hospital IDOR Defense",
            idor_blocked,
            f"HTTP {idor_res.status_code} | Cross-tenant approval denied"
        )

        # ---------------------------------------------------------------------
        # 6. Valid Hospital Super Admin Doctor Approval
        # ---------------------------------------------------------------------
        # HSA1 views pending approvals
        list_res = client.get(
            '/api/hospital/approvals?status=pending',
            headers={'Authorization': f'Bearer {hsa1_token}'}
        )
        list_data = list_res.get_json() or {}
        in_list = any(r['id'] == doc_user.id for r in list_data.get('requests', []))

        # HSA1 approves Doctor
        appr_res = client.post(
            f'/api/hospital/approvals/{doc_user.id}/approve',
            headers={'Authorization': f'Bearer {hsa1_token}'}
        )
        appr_ok = appr_res.status_code == 200 and appr_res.get_json().get('success') is True

        db.session.refresh(doc_user)
        db.session.refresh(doc_profile)
        user_activated = (
            doc_user.approval_status == 'APPROVED' and
            doc_user.is_active is True and
            doc_user.approved_by_id == hsa1.id and
            doc_user.approved_at is not None
        )
        profile_activated = doc_profile.status == 'Active'

        # Doctor can now log in
        l_appr_res = client.post('/api/auth/login', json={
            'email': doc_email,
            'password': 'DoctorSecret123!'
        })
        doc_now_logs_in = (
            l_appr_res.status_code == 200 and
            'token' in (l_appr_res.get_json() or {})
        )

        record(
            "6. Valid HSA Doctor Approval & Activation",
            in_list and appr_ok and user_activated and profile_activated and doc_now_logs_in,
            f"HTTP {appr_res.status_code} | Doctor login status={l_appr_res.status_code}"
        )

        # ---------------------------------------------------------------------
        # 7. Repeated / Duplicate Approval Rejection
        # ---------------------------------------------------------------------
        rep_res = client.post(
            f'/api/hospital/approvals/{doc_user.id}/approve',
            headers={'Authorization': f'Bearer {hsa1_token}'}
        )
        rep_blocked = rep_res.status_code == 400
        record(
            "7. Repeated Approval Request Rejection",
            rep_blocked,
            f"HTTP {rep_res.status_code} | Prevented duplicate approval mutation"
        )

        # ---------------------------------------------------------------------
        # 8. Receptionist Registration Request & Approval
        # ---------------------------------------------------------------------
        rec_email = f"kavita_{uuid.uuid4().hex[:6]}@apollo.com"
        rec_reg = client.post('/api/auth/register-request', json={
            'name': 'Kavita Patel',
            'email': rec_email,
            'phone': '+91 97000 12345',
            'password': 'ReceptionSecret123!',
            'confirm_password': 'ReceptionSecret123!',
            'role': 'RECEPTIONIST',
            'hospital_id': hosp1.id
        })
        rec_ok = rec_reg.status_code == 201
        rec_user = User.query.filter_by(email=rec_email).first()

        # Approve Receptionist
        rec_appr = client.post(
            f'/api/hospital/approvals/{rec_user.id}/approve',
            headers={'Authorization': f'Bearer {hsa1_token}'}
        )
        db.session.refresh(rec_user)
        rec_activated = (
            rec_appr.status_code == 200 and
            rec_user.approval_status == 'APPROVED' and
            rec_user.is_active is True
        )
        record(
            "8. Receptionist Request & Approval Workflow",
            rec_ok and rec_activated,
            f"HTTP {rec_appr.status_code} | User role={rec_user.role} active={rec_user.is_active}"
        )

        # ---------------------------------------------------------------------
        # 9. Institutional Rejection Workflow with Audit Reason
        # ---------------------------------------------------------------------
        rej_email = f"dr.fraud_{uuid.uuid4().hex[:6]}@apollo.com"
        rej_reg = client.post('/api/auth/register-request', json={
            'name': 'Dr. Unverified Credentials',
            'email': rej_email,
            'phone': '+91 91111 22222',
            'password': 'DoctorPass123!',
            'confirm_password': 'DoctorPass123!',
            'role': 'DOCTOR',
            'hospital_id': hosp1.id,
            'specialization_id': neuro.id,
            'registration_number': f'FAKE-REG-{uuid.uuid4().hex[:5].upper()}',
            'council_name': 'Unverified Council'
        })
        rej_user = User.query.filter_by(email=rej_email).first()

        rejection_reason_msg = "Medical registration number not found in State Medical Council registry."
        rej_action = client.post(
            f'/api/hospital/approvals/{rej_user.id}/reject',
            headers={'Authorization': f'Bearer {hsa1_token}'},
            json={'reason': rejection_reason_msg}
        )
        db.session.refresh(rej_user)
        rej_ok = (
            rej_action.status_code == 200 and
            rej_user.approval_status == 'REJECTED' and
            rej_user.is_active is False and
            rej_user.rejection_reason == rejection_reason_msg
        )

        # Attempt to login as rejected user
        l_rej = client.post('/api/auth/login', json={
            'email': rej_email,
            'password': 'DoctorPass123!'
        })
        l_rej_data = l_rej.get_json() or {}
        rej_login_blocked = (
            l_rej.status_code == 403 and
            l_rej_data.get('error_code') == 'ACCOUNT_REJECTED' and
            rejection_reason_msg in l_rej_data.get('message', '')
        )
        record(
            "9. Institutional Rejection Workflow",
            rej_ok and rej_login_blocked,
            f"HTTP {l_rej.status_code} | Reason saved and returned on rejected login attempt"
        )

        # ---------------------------------------------------------------------
        # 10. Hospital Super Admin Registration Request
        # ---------------------------------------------------------------------
        hsa_applicant_email = f"dr.kalyan_{uuid.uuid4().hex[:6]}@carehospital.com"
        proposed_hosp_name = f"Care Super Speciality {uuid.uuid4().hex[:4].upper()}"
        hsa_req = client.post('/api/auth/register-request', json={
            'name': 'Dr. Kalyan Varma',
            'email': hsa_applicant_email,
            'phone': '+91 99888 77665',
            'password': 'SuperAdminSecret123!',
            'confirm_password': 'SuperAdminSecret123!',
            'role': 'HOSPITAL_SUPER_ADMIN',
            'hospital_name': proposed_hosp_name,
            'hospital_city': 'Secunderabad',
            'hospital_state': 'Telangana',
            'emergency_number': '1088',
            'hospital_address': 'MG Road, Secunderabad',
            'facilities': 'ICU, Trauma, Organ Transplant'
        })
        hsa_req_ok = hsa_req.status_code == 201
        hsa_applicant = User.query.filter_by(email=hsa_applicant_email).first()
        hsa_pending_ok = (
            hsa_applicant is not None and
            hsa_applicant.hospital_id is None and
            hsa_applicant.approval_status == 'PENDING_APPROVAL' and
            hsa_applicant.is_active is False
        )
        record(
            "10. Hospital Super Admin Registration Request",
            hsa_req_ok and hsa_pending_ok,
            f"hospital_id={hsa_applicant.hospital_id if hsa_applicant else None} | status={hsa_applicant.approval_status if hsa_applicant else None}"
        )

        # ---------------------------------------------------------------------
        # 11. Platform Owner Approval & Automatic Hospital Provisioning
        # ---------------------------------------------------------------------
        # Platform Owner views pending Super Admin requests
        po_list = client.get(
            '/api/platform/approvals?status=pending',
            headers={'Authorization': f'Bearer {owner_token}'}
        )
        po_list_data = po_list.get_json() or {}
        hsa_in_po_list = any(r['id'] == hsa_applicant.id for r in po_list_data.get('requests', []))

        # Platform Owner approves Super Admin request
        po_appr = client.post(
            f'/api/platform/approvals/{hsa_applicant.id}/approve',
            headers={'Authorization': f'Bearer {owner_token}'},
            json={}
        )
        po_appr_ok = po_appr.status_code == 200 and po_appr.get_json().get('success') is True

        db.session.refresh(hsa_applicant)
        new_hosp = Hospital.query.filter_by(name=proposed_hosp_name).first()
        hosp_provisioned_ok = (
            new_hosp is not None and
            hsa_applicant.hospital_id == new_hosp.id and
            hsa_applicant.approval_status == 'APPROVED' and
            hsa_applicant.is_active is True and
            hsa_applicant.approved_by_id == owner.id
        )

        # Super Admin can now log in
        l_hsa = client.post('/api/auth/login', json={
            'email': hsa_applicant_email,
            'password': 'SuperAdminSecret123!'
        })
        hsa_login_ok = l_hsa.status_code == 200 and 'token' in (l_hsa.get_json() or {})

        record(
            "11. Platform Owner Approval & Hospital Creation",
            hsa_in_po_list and po_appr_ok and hosp_provisioned_ok and hsa_login_ok,
            f"Created Hospital ID #{new_hosp.id if new_hosp else None} | Super Admin active={hsa_applicant.is_active}"
        )

        # ---------------------------------------------------------------------
        # 12. Platform Owner Rejection of Super Admin Request
        # ---------------------------------------------------------------------
        bad_hsa_email = f"bogus_{uuid.uuid4().hex[:6]}@fakeclinic.com"
        client.post('/api/auth/register-request', json={
            'name': 'Bogus Clinic Admin',
            'email': bad_hsa_email,
            'phone': '+91 90000 00000',
            'password': 'AdminSecret123!',
            'confirm_password': 'AdminSecret123!',
            'role': 'HOSPITAL_SUPER_ADMIN',
            'hospital_name': 'Bogus Clinic',
            'hospital_city': 'Unknown',
            'emergency_number': '000'
        })
        bad_hsa = User.query.filter_by(email=bad_hsa_email).first()

        po_rej = client.post(
            f'/api/platform/approvals/{bad_hsa.id}/reject',
            headers={'Authorization': f'Bearer {owner_token}'},
            json={'reason': 'Hospital license documentation could not be verified.'}
        )
        db.session.refresh(bad_hsa)
        po_rej_ok = (
            po_rej.status_code == 200 and
            bad_hsa.approval_status == 'REJECTED' and
            bad_hsa.is_active is False and
            bad_hsa.hospital_id is None
        )
        record(
            "12. Platform Owner Rejection of Super Admin",
            po_rej_ok,
            f"HTTP {po_rej.status_code} | Rejected status={bad_hsa.approval_status}"
        )

        # ---------------------------------------------------------------------
        # 13. Public Platform Owner Registration Strictly Denied
        # ---------------------------------------------------------------------
        po_attack = client.post('/api/auth/register-request', json={
            'name': 'Attacker Escalating to Owner',
            'email': 'attacker@evil.com',
            'password': 'AttackPass123!',
            'confirm_password': 'AttackPass123!',
            'role': 'PLATFORM_OWNER'
        })
        po_attack_blocked = po_attack.status_code == 403
        record(
            "13. Public Platform Owner Signup Strictly Denied",
            po_attack_blocked,
            f"HTTP {po_attack.status_code} | Platform Owner cannot be registered publicly"
        )

        # ---------------------------------------------------------------------
        # 14. Duplicate Email and Medical Registration Number Defense
        # ---------------------------------------------------------------------
        # Duplicate email
        dup_email_res = client.post('/api/auth/register-request', json={
            'name': 'Duplicate Email Doctor',
            'email': doc_email,  # already exists
            'password': 'DoctorPass123!',
            'confirm_password': 'DoctorPass123!',
            'role': 'DOCTOR',
            'hospital_id': hosp1.id,
            'registration_number': f'TSMC/NEW/{uuid.uuid4().hex[:4].upper()}'
        })
        dup_email_blocked = dup_email_res.status_code == 409

        # Duplicate medical registration number
        dup_reg_res = client.post('/api/auth/register-request', json={
            'name': 'Duplicate Reg Doctor',
            'email': f'another.doctor_{uuid.uuid4().hex[:6]}@apollo.com',
            'password': 'DoctorPass123!',
            'confirm_password': 'DoctorPass123!',
            'role': 'DOCTOR',
            'hospital_id': hosp1.id,
            'registration_number': doc_reg_no  # already used by Dr. Ananya
        })
        dup_reg_blocked = dup_reg_res.status_code == 409

        record(
            "14. Duplicate Email & NMC Reg# Rejection",
            dup_email_blocked and dup_reg_blocked,
            f"Duplicate Email: HTTP {dup_email_res.status_code} | Duplicate Reg#: HTTP {dup_reg_res.status_code}"
        )

        # ---------------------------------------------------------------------
        # 15. Existing Invitation Workflow Compatibility
        # ---------------------------------------------------------------------
        inv_email = f"invited_{uuid.uuid4().hex[:6]}@apollo.com"
        create_inv_res = client.post(
            '/api/hospital/invitations',
            headers={'Authorization': f'Bearer {hsa1_token}'},
            json={
                'email': inv_email,
                'role': 'RECEPTIONIST'
            }
        )
        inv_created = create_inv_res.status_code == 201
        inv_data = create_inv_res.get_json() or {}
        raw_token = inv_data.get('invitation', {}).get('token') or inv_data.get('invitation', {}).get('raw_token')

        # Accept invitation
        accept_res = client.post('/api/invitations/accept', json={
            'token': raw_token,
            'name': 'Invited Receptionist User',
            'password': 'InvitedSecure123!',
            'confirm_password': 'InvitedSecure123!',
            'phone': '+91 93333 44444'
        })
        accept_ok = accept_res.status_code in (200, 201) and accept_res.get_json().get('success') is True

        # Log in as newly onboarded staff
        inv_login_res = client.post('/api/auth/login', json={
            'email': inv_email,
            'password': 'InvitedSecure123!'
        })
        inv_login_ok = inv_login_res.status_code == 200

        record(
            "15. Existing Invitation Workflow Compatibility",
            inv_created and accept_ok and inv_login_ok,
            f"Invitation Created HTTP {create_inv_res.status_code} | Accepted HTTP {accept_res.status_code} | Login HTTP {inv_login_res.status_code}"
        )

        # ---------------------------------------------------------------------
        # 16. Admin Self-Registration & Approval Workflow
        # ---------------------------------------------------------------------
        admin_email = f"admin.applicant_{uuid.uuid4().hex[:6]}@apollo.com"
        admin_reg_res = client.post('/api/auth/register-request', json={
            'name': 'Srikanth Admin Applicant',
            'email': admin_email,
            'phone': '+91 94444 55555',
            'password': 'AdminPass123!',
            'confirm_password': 'AdminPass123!',
            'role': 'ADMIN',
            'hospital_id': hosp1.id,
            'department': 'Hospital Administration / Management'
        })
        admin_reg_ok = admin_reg_res.status_code == 201
        admin_data = admin_reg_res.get_json() or {}
        admin_user_id = admin_data.get('user', {}).get('id')

        # Pending Admin cannot log in
        admin_pending_login = client.post('/api/auth/login', json={
            'email': admin_email,
            'password': 'AdminPass123!'
        })
        admin_pending_blocked = (admin_pending_login.status_code == 403 and
                                 admin_pending_login.get_json().get('error_code') == 'ACCOUNT_PENDING_APPROVAL')

        # Cross-hospital IDOR defense: HSA 2 cannot approve Admin for Hospital 1
        hsa2_attack = client.post(
            f'/api/hospital/approvals/{admin_user_id}/approve',
            headers={'Authorization': f'Bearer {hsa2_token}'}
        )
        hsa2_blocked = hsa2_attack.status_code == 403

        # Hospital 1 Super Admin approves Admin
        hsa1_admin_appr = client.post(
            f'/api/hospital/approvals/{admin_user_id}/approve',
            headers={'Authorization': f'Bearer {hsa1_token}'}
        )
        hsa1_appr_ok = hsa1_admin_appr.status_code == 200

        # Approved Admin logs in successfully
        admin_approved_login = client.post('/api/auth/login', json={
            'email': admin_email,
            'password': 'AdminPass123!'
        })
        admin_login_ok = admin_approved_login.status_code == 200 and 'token' in admin_approved_login.get_json()

        record(
            "16. Admin Self-Registration & HSA Approval Workflow",
            admin_reg_ok and admin_pending_blocked and hsa2_blocked and hsa1_appr_ok and admin_login_ok,
            f"Reg HTTP {admin_reg_res.status_code} | Pending blocked HTTP {admin_pending_login.status_code} | IDOR blocked HTTP {hsa2_attack.status_code} | Approved HTTP {hsa1_admin_appr.status_code} | Login HTTP {admin_approved_login.status_code}"
        )

        # ---------------------------------------------------------------------
        # 17. Doctor Credential Verification Flags & Demo Disclaimers
        # ---------------------------------------------------------------------
        # Pre-seeded demo doctor check (id <= 6)
        demo_doc = Doctor.query.filter(Doctor.id <= 6).first()
        if not demo_doc:
            # Create a mock demo doctor (id <= 6) to verify model logic
            demo_doc = Doctor(
                id=1,
                name="Dr. Rajesh Demo Sharma",
                qualification="MBBS, MD",
                experience=12,
                specialization_id=cardio.id,
                hospital_id=hosp1.id,
                location="Hyderabad",
                registration_number="TSMC-2012-DEMO",
                council_name="Telangana State Medical Council",
                image="https://example.com/demo.jpg"
            )
            db.session.add(demo_doc)
            db.session.commit()
        else:
            # Ensure demo doctor has fictional registration number
            demo_doc.registration_number = "TSMC-2012-DEMO"
            demo_doc.council_name = "Telangana State Medical Council"
            db.session.commit()

        demo_dict = demo_doc.to_dict()
        demo_is_unverified = (
            demo_dict.get('is_demo') is True and
            demo_dict.get('is_verified') is False and
            demo_dict.get('verification_status') == 'Demo Profile (Unverified)' and
            demo_dict.get('is_fictional_reg') is True and
            demo_dict.get('council_verification_disclaimer') is not None
        )

        # Newly registered & approved doctor check (approved by HSA)
        approved_doc = Doctor.query.filter_by(user_id=doc_user.id).first()
        approved_doc_dict = approved_doc.to_dict() if approved_doc else {}
        approved_is_verified = (
            approved_doc_dict.get('is_demo') is False and
            approved_doc_dict.get('is_verified') is True and
            approved_doc_dict.get('verification_status') == 'Verified Clinician'
        )

        record(
            "17. Doctor Credential Verification & Demo Disclaimers",
            demo_is_unverified and approved_is_verified,
            f"Demo Doc: is_demo={demo_dict.get('is_demo')}, is_verified={demo_dict.get('is_verified')} | Approved Doc: is_demo={approved_doc_dict.get('is_demo')}, is_verified={approved_doc_dict.get('is_verified')}"
        )

        print("=" * 80)
        passed_count = sum(1 for _, status, _ in results if status)
        total_count = len(results)
        print(f"RESULTS: {passed_count}/{total_count} TESTS PASSED")
        print("=" * 80)

        assert passed_count == total_count, f"Some tests failed: {total_count - passed_count} failures."
        return passed_count, total_count


if __name__ == '__main__':
    run_phase2_test_battery()
