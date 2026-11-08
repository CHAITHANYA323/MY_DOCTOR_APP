"""
MediConnect Phase 2 Test Suite: Multi-Tenant RBAC & Hospital-Scoped Query Isolation
Tests comprehensive cross-hospital IDOR defense, receptionist boundaries, doctor portal scoping,
Platform Owner operations, legacy ADMIN zero-bypass enforcement, and CLI owner bootstrap.

Isolated testing using temporary SQLite databases.
Guarantees zero mutations against existing development or production databases.
"""

import os
import sys
import tempfile
import uuid
import unittest
from datetime import date, timedelta
from flask import json
from sqlalchemy import create_engine, text

# Force isolated temporary database BEFORE importing any application modules
_TEMP_TEST_DIR_PATH = os.path.join(tempfile.gettempdir(), f"phase6_rbac_test_{uuid.uuid4().hex[:8]}")
os.makedirs(_TEMP_TEST_DIR_PATH, exist_ok=True)
_TEMP_DB_PATH = os.path.join(_TEMP_TEST_DIR_PATH, "test_phase6_rbac.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEMP_DB_PATH}"

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from config import Config
from app import create_app, initialize_database
from models import db, User, Doctor, Hospital, Specialization, Appointment, AuditLog
from utils.auth_middleware import generate_token
import manage


class TestPhase6RBACIsolation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db_path = _TEMP_DB_PATH
        cls.db_uri = f"sqlite:///{_TEMP_DB_PATH}"
        os.environ["DATABASE_URL"] = cls.db_uri
        Config.DATABASE_URL = cls.db_uri

        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            initialize_database(cls.app)

            # Ensure schema_migrations and objects exist
            import importlib
            mig005 = importlib.import_module("migrations.005_multi_hospital_rbac")
            mig005.upgrade(db.engine)

            # Retrieve seeded hospitals
            hospitals = Hospital.query.all()
            cls.hosp1 = hospitals[0]
            cls.hosp2 = hospitals[1]

            spec = Specialization.query.first()
            cls.spec_id = spec.id

            # Create Platform Owner
            cls.owner = User(
                name="Platform Super Owner",
                email="owner@mediconnect.com",
                role="PLATFORM_OWNER",
                hospital_id=None,
                is_active=True
            )
            cls.owner.set_password("Owner@123")
            db.session.add(cls.owner)

            # Create Hospital 1 Super Admin
            cls.hosp1_admin = User(
                name="Hospital 1 Super Admin",
                email="admin.hosp1@medicare.com",
                role="HOSPITAL_SUPER_ADMIN",
                hospital_id=cls.hosp1.id,
                is_active=True
            )
            cls.hosp1_admin.set_password("Admin@123")
            db.session.add(cls.hosp1_admin)

            # Create Hospital 2 Super Admin
            cls.hosp2_admin = User(
                name="Hospital 2 Super Admin",
                email="admin.hosp2@medicare.com",
                role="HOSPITAL_SUPER_ADMIN",
                hospital_id=cls.hosp2.id,
                is_active=True
            )
            cls.hosp2_admin.set_password("Admin@123")
            db.session.add(cls.hosp2_admin)

            # Create Hospital 1 Receptionist
            cls.hosp1_reception = User(
                name="Hospital 1 Receptionist",
                email="reception.hosp1@medicare.com",
                role="RECEPTIONIST",
                hospital_id=cls.hosp1.id,
                is_active=True
            )
            cls.hosp1_reception.set_password("Reception@123")
            db.session.add(cls.hosp1_reception)

            # Create Patient
            cls.patient = User(
                name="Verified Patient Alpha",
                email="patient.alpha@test.com",
                role="PATIENT",
                hospital_id=None,
                is_active=True
            )
            cls.patient.set_password("Patient@123")
            db.session.add(cls.patient)

            # Create Deactivated User
            cls.deactivated_user = User(
                name="Deactivated Staff",
                email="deactivated@medicare.com",
                role="HOSPITAL_SUPER_ADMIN",
                hospital_id=cls.hosp1.id,
                is_active=False
            )
            cls.deactivated_user.set_password("Password@123")
            db.session.add(cls.deactivated_user)

            # Create Legacy Unassigned Admin
            cls.legacy_admin = User(
                name="Unassigned Legacy Admin",
                email="legacy.admin@medicare.com",
                role="ADMIN",
                hospital_id=None,
                is_active=True
            )
            cls.legacy_admin.set_password("Admin@123")
            db.session.add(cls.legacy_admin)

            # Create Doctor 1 (Hospital 1)
            cls.doc1 = Doctor(
                name="Dr. Hospital One",
                gender="Male",
                image="https://images.unsplash.com/doc1.jpg",
                qualification="MD Cardiology",
                experience=10,
                specialization_id=cls.spec_id,
                hospital_id=cls.hosp1.id,
                location="Bengaluru",
                consultation_fee=750.0,
                status="Active"
            )
            db.session.add(cls.doc1)

            # Create Doctor 2 (Hospital 2)
            cls.doc2 = Doctor(
                name="Dr. Hospital Two",
                gender="Female",
                image="https://images.unsplash.com/doc2.jpg",
                qualification="MD Neurology",
                experience=12,
                specialization_id=cls.spec_id,
                hospital_id=cls.hosp2.id,
                location="Hyderabad",
                consultation_fee=850.0,
                status="Active"
            )
            db.session.add(cls.doc2)
            db.session.commit()

            # Create Doctor 1 User identity and link
            cls.doc1_user = User(
                name="Dr. Hospital One",
                email="dr.one@medicare.com",
                role="DOCTOR",
                hospital_id=cls.hosp1.id,
                is_active=True
            )
            cls.doc1_user.set_password("Doctor@123")
            db.session.add(cls.doc1_user)
            db.session.commit()
            cls.doc1.user_id = cls.doc1_user.id
            db.session.commit()

            # Create Appointment 1 in Hospital 1
            tomorrow = (date.today() + timedelta(days=2)).isoformat()
            cls.appt1 = Appointment(
                user_id=cls.patient.id,
                doctor_id=cls.doc1.id,
                hospital_id=cls.hosp1.id,
                appointment_date=tomorrow,
                appointment_time="10:00 AM",
                reason="Hospital 1 Cardiology consultation",
                status="Pending"
            )
            db.session.add(cls.appt1)

            # Create Appointment 2 in Hospital 2
            cls.appt2 = Appointment(
                user_id=cls.patient.id,
                doctor_id=cls.doc2.id,
                hospital_id=cls.hosp2.id,
                appointment_date=tomorrow,
                appointment_time="11:00 AM",
                reason="Hospital 2 Neurology consultation",
                status="Pending"
            )
            db.session.add(cls.appt2)
            db.session.commit()

            # Store IDs and tokens
            cls.owner_token = generate_token(cls.owner)
            cls.hosp1_admin_token = generate_token(cls.hosp1_admin)
            cls.hosp2_admin_token = generate_token(cls.hosp2_admin)
            cls.hosp1_reception_token = generate_token(cls.hosp1_reception)
            cls.doc1_token = generate_token(cls.doc1_user)
            cls.patient_token = generate_token(cls.patient)
            cls.legacy_admin_token = generate_token(cls.legacy_admin)

            cls.appt1_id = cls.appt1.id
            cls.appt2_id = cls.appt2.id
            cls.doc1_id = cls.doc1.id
            cls.doc2_id = cls.doc2.id
            cls.hosp1_id = cls.hosp1.id
            cls.hosp2_id = cls.hosp2.id

    def test_01_cross_hospital_appointment_read_idor_defense(self):
        """Hospital 1 Admin attempting to view Hospital 2 Appointment details must receive 403 Forbidden."""
        res = self.client.get(
            f"/api/appointments/{self.appt2_id}",
            headers={"Authorization": f"Bearer {self.hosp1_admin_token}"}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Unauthorized access", res.get_json()['message'])

    def test_02_own_hospital_appointment_read_permitted(self):
        """Hospital 1 Admin viewing Hospital 1 Appointment is permitted."""
        res = self.client.get(
            f"/api/appointments/{self.appt1_id}",
            headers={"Authorization": f"Bearer {self.hosp1_admin_token}"}
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['appointment']['id'], self.appt1_id)

    def test_03_cross_hospital_appointment_mutation_idor_defense(self):
        """Hospital 1 Admin attempting to update Hospital 2 Appointment status must receive 403 Forbidden."""
        res = self.client.put(
            f"/api/appointments/{self.appt2_id}",
            json={"status": "Confirmed"},
            headers={"Authorization": f"Bearer {self.hosp1_admin_token}"}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Cross-hospital mutation is blocked", res.get_json()['message'])

    def test_04_appointments_list_scoped_by_hospital(self):
        """Hospital 1 Admin query to /api/appointments only returns Hospital 1 appointments."""
        res = self.client.get(
            "/api/appointments",
            headers={"Authorization": f"Bearer {self.hosp1_admin_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        hosp_ids = [a['hospital_id'] for a in data['appointments']]
        self.assertTrue(all(h == self.hosp1_id for h in hosp_ids))
        self.assertNotIn(self.appt2_id, [a['id'] for a in data['appointments']])

    def test_05_cross_hospital_doctor_update_idor_defense(self):
        """Hospital 1 Admin attempting to modify Hospital 2 Doctor must receive 403 Forbidden."""
        res = self.client.put(
            f"/api/doctors/{self.doc2_id}",
            json={"consultation_fee": 999.0},
            headers={"Authorization": f"Bearer {self.hosp1_admin_token}"}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("manage doctors in your own hospital", res.get_json()['message'])

    def test_06_cross_hospital_doctor_delete_idor_defense(self):
        """Hospital 1 Admin attempting to delete Hospital 2 Doctor must receive 403 Forbidden."""
        res = self.client.delete(
            f"/api/doctors/{self.doc2_id}",
            headers={"Authorization": f"Bearer {self.hosp1_admin_token}"}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("delete doctors from your own hospital", res.get_json()['message'])

    def test_07_hospital_id_tampering_prevented_in_doctor_creation(self):
        """Hospital 1 Admin passing spoofed hospital_id=Hospital2 is overridden to Hospital 1."""
        res = self.client.post(
            "/api/doctors",
            json={
                "name": "Dr. Spoofing Attempt",
                "qualification": "MS Surgery",
                "experience": 8,
                "specialization_id": self.spec_id,
                "hospital_id": self.hosp2_id,  # Tampered target
                "location": "Visakhapatnam",
                "consultation_fee": 600.0
            },
            headers={"Authorization": f"Bearer {self.hosp1_admin_token}"}
        )
        self.assertEqual(res.status_code, 201)
        created_doc = res.get_json()['doctor']
        # The backend must have forced the hospital_id to hosp1
        self.assertEqual(created_doc['hospital_id'], self.hosp1_id)

    def test_08_receptionist_cross_hospital_checkin_blocked(self):
        """Hospital 1 Receptionist cannot check in Hospital 2 Appointment."""
        res = self.client.put(
            f"/api/appointments/{self.appt2_id}",
            json={"status": "Confirmed"},
            headers={"Authorization": f"Bearer {self.hosp1_reception_token}"}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Cross-hospital mutation is blocked", res.get_json()['message'])

    def test_09_receptionist_own_hospital_checkin_permitted(self):
        """Hospital 1 Receptionist can check in Hospital 1 Appointment."""
        res = self.client.put(
            f"/api/appointments/{self.appt1_id}",
            json={"status": "Confirmed"},
            headers={"Authorization": f"Bearer {self.hosp1_reception_token}"}
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['appointment']['status'], 'Confirmed')

    def test_10_doctor_cross_consultation_view_blocked(self):
        """Doctor 1 attempting to view Doctor 2 Appointment details receives 403 Forbidden."""
        res = self.client.get(
            f"/api/appointments/{self.appt2_id}",
            headers={"Authorization": f"Bearer {self.doc1_token}"}
        )
        self.assertEqual(res.status_code, 403)

    def test_11_doctor_can_update_own_profile(self):
        """Doctor can modify their own clinical bio and consultation fee."""
        res = self.client.put(
            f"/api/doctors/{self.doc1_id}",
            json={"about": "Updated cardiology specialist bio.", "consultation_fee": 800.0},
            headers={"Authorization": f"Bearer {self.doc1_token}"}
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['doctor']['consultation_fee'], 800.0)

    def test_12_doctor_cannot_modify_other_doctor_profile(self):
        """Doctor 1 attempting to modify Doctor 2 profile receives 403 Forbidden."""
        res = self.client.put(
            f"/api/doctors/{self.doc2_id}",
            json={"consultation_fee": 500.0},
            headers={"Authorization": f"Bearer {self.doc1_token}"}
        )
        self.assertEqual(res.status_code, 403)

    def test_13_platform_owner_full_visibility(self):
        """Platform Owner can view appointments from all hospitals."""
        res = self.client.get(
            "/api/appointments",
            headers={"Authorization": f"Bearer {self.owner_token}"}
        )
        self.assertEqual(res.status_code, 200)
        appts = res.get_json()['appointments']
        hosp_ids = set(a['hospital_id'] for a in appts)
        self.assertIn(self.hosp1_id, hosp_ids)
        self.assertIn(self.hosp2_id, hosp_ids)

    def test_14_platform_owner_hard_delete_appointment(self):
        """Platform Owner is permitted to hard-delete non-completed appointment."""
        with self.app.app_context():
            temp_appt = Appointment(
                user_id=self.patient.id,
                doctor_id=self.doc1.id,
                hospital_id=self.hosp1.id,
                appointment_date=(date.today() + timedelta(days=5)).isoformat(),
                appointment_time="03:00 PM",
                reason="Temporary test delete",
                status="Pending"
            )
            db.session.add(temp_appt)
            db.session.commit()
            temp_id = temp_appt.id

        # Non-owner hard delete attempt fails
        res_fail = self.client.delete(
            f"/api/appointments/{temp_id}",
            headers={"Authorization": f"Bearer {self.hosp1_admin_token}"}
        )
        self.assertEqual(res_fail.status_code, 403)

        # Platform owner hard delete succeeds
        res_ok = self.client.delete(
            f"/api/appointments/{temp_id}",
            headers={"Authorization": f"Bearer {self.owner_token}"}
        )
        self.assertEqual(res_ok.status_code, 200)

    def test_15_legacy_admin_zero_wildcard_bypass(self):
        """Unassigned legacy ADMIN account receives 403 on institutional endpoints."""
        res = self.client.get(
            "/api/appointments",
            headers={"Authorization": f"Bearer {self.legacy_admin_token}"}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("authorized role", res.get_json()['message'])

    def test_16_deactivated_account_blocked(self):
        """Deactivated user account is rejected on login and token authentication."""
        # Login rejection
        res_login = self.client.post(
            "/api/auth/login",
            json={"email": "deactivated@medicare.com", "password": "Password@123"}
        )
        self.assertEqual(res_login.status_code, 403)
        self.assertIn("deactivated", res_login.get_json()['message'])

        # Token authentication rejection
        with self.app.app_context():
            u = User.query.filter_by(email="deactivated@medicare.com").first()
            deactivated_token = generate_token(u)
        res_auth = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {deactivated_token}"}
        )
        self.assertEqual(res_auth.status_code, 403)

    def test_17_manage_promote_owner_cli_command(self):
        """Verifies manage.py promote-owner promotes user, clears hospital_id, and logs audit."""
        with self.app.app_context():
            promo_user = User(
                name="Candidate To Promote",
                email="promote.me@medicare.com",
                role="USER",
                hospital_id=self.hosp1.id,
                is_active=True
            )
            promo_user.set_password("Promo@123")
            db.session.add(promo_user)
            db.session.commit()
            promo_id = promo_user.id

        # Run promotion via CLI function
        manage.promote_owner("promote.me@medicare.com", force_yes=True)

        with self.app.app_context():
            updated = db.session.get(User, promo_id)
            self.assertEqual(updated.role, "PLATFORM_OWNER")
            self.assertIsNone(updated.hospital_id)

            # Check audit log
            audit = AuditLog.query.filter_by(
                user_id=promo_id,
                action='OWNER_PROMOTION'
            ).first()
            self.assertIsNotNone(audit)
            self.assertIn("promoted", audit.details)


if __name__ == '__main__':
    unittest.main()
