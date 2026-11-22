"""
Integration and security test suite for the Multi-Hospital Ecosystem Redesign:
- Hospital Admin Portal (/api/hospital-admin/*)
- SuperAdmin Portal (/api/superadmin/*)
- Platform Owner Portal (/api/owner/*)
- Strict RBAC and Multi-Hospital Scope Isolation
"""

import os
import sys
import uuid
import json
import pytest

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from config import Config
from models import (
    db,
    User,
    Hospital,
    Doctor,
    Specialization,
    Appointment,
    AuditLog,
    SuperadminHospitalAssignment,
    HospitalAdminAssignment,
)
from utils.auth_middleware import generate_token


@pytest.fixture(scope="module")
def ecosystem_env():
    db_name = f"test_ecosystem_{uuid.uuid4().hex[:8]}.db"
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), db_name)
    Config.DATABASE_URL = f"sqlite:///{db_path}"

    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"

    with app.app_context():
        db.create_all()

        # 1. Hospitals
        hosp1 = Hospital(
            name="Apollo Jubilee Hills",
            slug="apollo-jubilee-hills",
            image="https://example.com/apollo.jpg",
            address="Road No. 72, Jubilee Hills",
            city="Hyderabad",
            state="Telangana",
            is_verified=True,
            phone="040-23607777",
            emergency_number="1066"
        )
        hosp2 = Hospital(
            name="KIMS Secunderabad",
            slug="kims-secunderabad",
            image="https://example.com/kims.jpg",
            address="Minister Road, Secunderabad",
            city="Secunderabad",
            state="Telangana",
            is_verified=True,
            phone="040-44885000",
            emergency_number="1050"
        )
        hosp3 = Hospital(
            name="Warangal Regional Hospital",
            slug="warangal-regional-hospital",
            image="https://example.com/warangal.jpg",
            address="Naimnagar, Warangal",
            city="Warangal",
            state="Telangana",
            is_verified=True,
            phone="0870-2444444",
            emergency_number="108"
        )
        db.session.add_all([hosp1, hosp2, hosp3])
        db.session.flush()

        # 2. Platform Owner
        owner = User(
            name="Platform Executive Owner",
            email="owner@mediconnect.com",
            role="PLATFORM_OWNER",
            is_active=True,
            approval_status="APPROVED"
        )
        owner.set_password("OwnerPass@123")
        db.session.add(owner)

        # 3. SuperAdmin
        super_admin = User(
            name="Regional Super Admin",
            email="superadmin@mediconnect.com",
            role="HOSPITAL_SUPER_ADMIN",
            is_active=True,
            approval_status="APPROVED",
            hospital_id=hosp1.id
        )
        super_admin.set_password("SuperPass@123")
        db.session.add(super_admin)
        db.session.flush()

        # Assign hosp1 and hosp2 to SuperAdmin, leaving hosp3 unassigned
        db.session.add(SuperadminHospitalAssignment(
            superadmin_id=super_admin.id,
            hospital_id=hosp1.id,
            status="Active"
        ))
        db.session.add(SuperadminHospitalAssignment(
            superadmin_id=super_admin.id,
            hospital_id=hosp2.id,
            status="Active"
        ))

        # 4. Primary Hospital Admin for hosp1
        primary_admin = User(
            name="Chief Admin Apollo",
            email="primary.admin@apollo.com",
            role="HOSPITAL_ADMIN",
            is_active=True,
            approval_status="APPROVED",
            hospital_id=hosp1.id
        )
        primary_admin.set_password("AdminPass@123")
        db.session.add(primary_admin)
        db.session.flush()

        hosp1.primary_admin_id = primary_admin.id
        db.session.add(HospitalAdminAssignment(
            hospital_id=hosp1.id,
            admin_id=primary_admin.id,
            is_primary=True,
            designation="Hospital Superintendent",
            status="Active"
        ))

        # 5. Secondary Admin for hosp1 (candidate for replacement)
        secondary_admin = User(
            name="Deputy Admin Apollo",
            email="deputy.admin@apollo.com",
            role="HOSPITAL_ADMIN",
            is_active=True,
            approval_status="APPROVED",
            hospital_id=hosp1.id
        )
        secondary_admin.set_password("AdminPass@123")
        db.session.add(secondary_admin)

        # 6. Receptionist for hosp1
        receptionist = User(
            name="Front Desk Receptionist",
            email="reception@apollo.com",
            role="RECEPTIONIST",
            is_active=True,
            approval_status="APPROVED",
            hospital_id=hosp1.id
        )
        receptionist.set_password("RecepPass@123")
        db.session.add(receptionist)

        # 7. Doctor for hosp1
        doctor_user = User(
            name="Dr. Srinivas Rao",
            email="dr.srinivas@apollo.com",
            role="DOCTOR",
            is_active=True,
            approval_status="APPROVED",
            hospital_id=hosp1.id
        )
        doctor_user.set_password("DocPass@123")
        db.session.add(doctor_user)
        db.session.flush()

        spec = Specialization(
            name="Cardiology",
            slug="cardiology",
            icon="heart",
            description="Cardiology heart care"
        )
        db.session.add(spec)
        db.session.flush()

        doctor_profile = Doctor(
            user_id=doctor_user.id,
            hospital_id=hosp1.id,
            name="Dr. Srinivas Rao",
            specialization_id=spec.id,
            image="https://example.com/doctor.jpg",
            location="Jubilee Hills, Hyderabad",
            qualification="MD, DM (Cardiology)",
            experience=14,
            consultation_fee=600,
            status="Active"
        )
        db.session.add(doctor_profile)

        # 8. Regular Patient
        patient = User(
            name="Ananya Sharma",
            email="ananya@example.com",
            role="USER",
            is_active=True,
            approval_status="APPROVED"
        )
        patient.set_password("PatientPass@123")
        db.session.add(patient)

        db.session.commit()

        # Generate tokens
        env_data = {
            "client": app.test_client(),
            "owner_token": generate_token(owner),
            "superadmin_token": generate_token(super_admin),
            "primary_admin_token": generate_token(primary_admin),
            "receptionist_token": generate_token(receptionist),
            "doctor_token": generate_token(doctor_user),
            "patient_token": generate_token(patient),
            "hosp1_id": hosp1.id,
            "hosp2_id": hosp2.id,
            "hosp3_id": hosp3.id,
            "super_admin_id": super_admin.id,
            "secondary_admin_id": secondary_admin.id
        }

        yield env_data

    # Teardown
    try:
        if os.path.exists(db_path):
            os.remove(db_path)
    except Exception:
        pass


# =============================================================================
# 1. PLATFORM OWNER TESTS
# =============================================================================
def test_platform_owner_overview(ecosystem_env):
    client = ecosystem_env["client"]
    token = ecosystem_env["owner_token"]

    res = client.get('/api/owner/overview', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data['success'] is True
    metrics = data['metrics']
    assert metrics['total_hospitals'] == 3
    assert metrics['total_superadmins'] >= 1
    assert metrics['total_hospital_admins'] >= 2
    # hosp2 and hosp3 don't have primary admins assigned yet
    assert metrics['hospitals_without_primary_admin'] >= 2


def test_platform_owner_superadmins_and_assignments(ecosystem_env):
    client = ecosystem_env["client"]
    token = ecosystem_env["owner_token"]
    sa_id = ecosystem_env["super_admin_id"]
    hosp3_id = ecosystem_env["hosp3_id"]

    # List SuperAdmins
    res = client.get('/api/owner/superadmins', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data['success'] is True
    assert len(data['superadmins']) >= 1

    sa_item = next(s for s in data['superadmins'] if s['id'] == sa_id)
    assert sa_item['assigned_hospitals_count'] == 2

    # Assign hosp3 to this SuperAdmin
    res_assign = client.post(
        f'/api/owner/superadmins/{sa_id}/assign-hospitals',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'hospital_ids': [ecosystem_env["hosp1_id"], ecosystem_env["hosp2_id"], hosp3_id],
            'notes': 'Added Warangal Regional Hospital to regional cluster'
        }
    )
    assert res_assign.status_code == 200
    assign_data = json.loads(res_assign.data)
    assert assign_data['success'] is True
    assert assign_data['assigned_count'] == 3


def test_platform_owner_hospital_admins_directory(ecosystem_env):
    client = ecosystem_env["client"]
    token = ecosystem_env["owner_token"]

    res = client.get('/api/owner/hospital-admins', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data['success'] is True
    assert len(data['admins']) >= 2
    assert len(data['hospitals_without_primary']) >= 1


# =============================================================================
# 2. SUPERADMIN PORTAL TESTS
# =============================================================================
def test_superadmin_assigned_hospitals(ecosystem_env):
    client = ecosystem_env["client"]
    token = ecosystem_env["superadmin_token"]

    res = client.get('/api/superadmin/assigned-hospitals', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data['success'] is True
    assert len(data['hospitals']) >= 2
    # Verify primary admin is resolved on hosp1
    hosp1 = next(h for h in data['hospitals'] if h['id'] == ecosystem_env["hosp1_id"])
    assert hosp1['primary_admin'] is not None
    assert hosp1['primary_admin']['name'] == 'Chief Admin Apollo'


def test_superadmin_dashboard_stats_and_anti_idor(ecosystem_env):
    client = ecosystem_env["client"]
    token = ecosystem_env["superadmin_token"]
    hosp1_id = ecosystem_env["hosp1_id"]

    # Aggregated stats
    res_all = client.get('/api/superadmin/dashboard-stats', headers={'Authorization': f'Bearer {token}'})
    assert res_all.status_code == 200
    data_all = json.loads(res_all.data)
    assert data_all['success'] is True
    assert data_all['assigned_hospitals_count'] >= 2

    # Scoped stats for assigned hospital
    res_scoped = client.get(f'/api/superadmin/dashboard-stats?hospital_id={hosp1_id}', headers={'Authorization': f'Bearer {token}'})
    assert res_scoped.status_code == 200
    data_scoped = json.loads(res_scoped.data)
    assert data_scoped['success'] is True
    assert data_scoped['target_hospital_name'] == 'Apollo Jubilee Hills'

    # IDOR Check: An invalid hospital id not in assigned list (e.g. 99999)
    res_idor = client.get('/api/superadmin/dashboard-stats?hospital_id=99999', headers={'Authorization': f'Bearer {token}'})
    assert res_idor.status_code == 403


def test_superadmin_primary_admin_replacement_workflow(ecosystem_env):
    client = ecosystem_env["client"]
    token = ecosystem_env["superadmin_token"]
    hosp1_id = ecosystem_env["hosp1_id"]
    secondary_admin_id = ecosystem_env["secondary_admin_id"]

    # Replace primary admin with secondary admin
    res = client.post(
        f'/api/superadmin/hospitals/{hosp1_id}/replace-primary-admin',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'new_admin_id': secondary_admin_id,
            'reason': 'Promotion to Primary Hospital Superintendent'
        }
    )
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data['success'] is True
    assert data['new_primary_admin']['id'] == secondary_admin_id

    # Verify admin history logs both previous and new assignments
    res_hist = client.get(f'/api/superadmin/hospitals/{hosp1_id}/admin-history', headers={'Authorization': f'Bearer {token}'})
    assert res_hist.status_code == 200
    data_hist = json.loads(res_hist.data)
    assert data_hist['success'] is True
    assert len(data_hist['history']) >= 2


# =============================================================================
# 3. HOSPITAL ADMIN PORTAL TESTS
# =============================================================================
def test_hospital_admin_dashboard(ecosystem_env):
    client = ecosystem_env["client"]
    token = ecosystem_env["primary_admin_token"]

    res = client.get('/api/hospital-admin/dashboard', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data['success'] is True
    assert data['hospital']['name'] == 'Apollo Jubilee Hills'
    assert 'metrics' in data
    assert data['metrics']['active_doctors'] >= 1
    assert data['metrics']['active_receptionists'] >= 1


def test_hospital_admin_permitted_profile_updates(ecosystem_env):
    client = ecosystem_env["client"]
    token = ecosystem_env["primary_admin_token"]

    res = client.put(
        '/api/hospital-admin/hospital-profile',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'emergency_number': '1099',
            'phone': '040-23608888',
            'address': 'Road No. 72, Film Nagar, Jubilee Hills',
            'website': 'https://apollo-jubileehills.example.com'
        }
    )
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data['success'] is True
    assert data['hospital']['emergency_number'] == '1099'
    assert data['hospital']['phone'] == '040-23608888'


def test_hospital_admin_doctors_and_receptionists_management(ecosystem_env):
    client = ecosystem_env["client"]
    token = ecosystem_env["primary_admin_token"]

    # Doctors list
    res_docs = client.get('/api/hospital-admin/doctors', headers={'Authorization': f'Bearer {token}'})
    assert res_docs.status_code == 200
    data_docs = json.loads(res_docs.data)
    assert data_docs['success'] is True
    assert len(data_docs['doctors']) >= 1

    # Receptionists list
    res_rec = client.get('/api/hospital-admin/receptionists', headers={'Authorization': f'Bearer {token}'})
    assert res_rec.status_code == 200
    data_rec = json.loads(res_rec.data)
    assert data_rec['success'] is True
    assert len(data_rec['receptionists']) >= 1


# =============================================================================
# 4. STRICT RBAC ISOLATION & PERMISSION BOUNDARIES
# =============================================================================
def test_rbac_strict_isolation_boundaries(ecosystem_env):
    client = ecosystem_env["client"]
    patient_token = ecosystem_env["patient_token"]
    doctor_token = ecosystem_env["doctor_token"]
    rec_token = ecosystem_env["receptionist_token"]
    admin_token = ecosystem_env["primary_admin_token"]
    sa_token = ecosystem_env["superadmin_token"]

    # 1. Patients cannot access Hospital Admin, SuperAdmin, or Owner APIs
    assert client.get('/api/hospital-admin/dashboard', headers={'Authorization': f'Bearer {patient_token}'}).status_code in [401, 403]
    assert client.get('/api/superadmin/assigned-hospitals', headers={'Authorization': f'Bearer {patient_token}'}).status_code in [401, 403]
    assert client.get('/api/owner/overview', headers={'Authorization': f'Bearer {patient_token}'}).status_code in [401, 403]

    # 2. Doctors cannot access Hospital Admin or Owner APIs
    assert client.get('/api/hospital-admin/dashboard', headers={'Authorization': f'Bearer {doctor_token}'}).status_code in [401, 403]
    assert client.get('/api/owner/overview', headers={'Authorization': f'Bearer {doctor_token}'}).status_code in [401, 403]

    # 3. Receptionists cannot access Hospital Admin or Owner APIs
    assert client.get('/api/hospital-admin/dashboard', headers={'Authorization': f'Bearer {rec_token}'}).status_code in [401, 403]
    assert client.get('/api/owner/overview', headers={'Authorization': f'Bearer {rec_token}'}).status_code in [401, 403]

    # 4. Hospital Admin cannot access Platform Owner APIs
    assert client.get('/api/owner/overview', headers={'Authorization': f'Bearer {admin_token}'}).status_code in [401, 403]

    # 5. SuperAdmin cannot access Platform Owner executive APIs
    assert client.get('/api/owner/overview', headers={'Authorization': f'Bearer {sa_token}'}).status_code in [401, 403]
