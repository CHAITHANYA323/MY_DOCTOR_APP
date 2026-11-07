"""
MediConnect Phase 2 Test Suite: Appointment Reliability & Concurrency
Isolated testing using temporary SQLite databases.
Guarantees zero mutations against existing production/development databases.
"""

import os
import sys
import tempfile
import uuid
import shutil

# Force isolated temporary database BEFORE importing any application modules
_TEMP_TEST_DIR_PATH = os.path.join(tempfile.gettempdir(), f"phase2_test_{uuid.uuid4().hex[:8]}")
os.makedirs(_TEMP_TEST_DIR_PATH, exist_ok=True)
_TEMP_DB_PATH = os.path.join(_TEMP_TEST_DIR_PATH, "test_phase2.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEMP_DB_PATH}"

import sqlite3
import multiprocessing
import unittest
from datetime import date, timedelta
from flask import json
from sqlalchemy import create_engine, text

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from models import db, User, Doctor, Hospital, Specialization, Appointment
from utils.auth_middleware import generate_token
from routes.appointments import normalize_appointment_time
import importlib

migration_001 = importlib.import_module("migrations.001_appointment_reliability")
run_migration_upgrade = migration_001.upgrade
run_migration_downgrade = migration_001.downgrade
check_preconditions = migration_001.check_preconditions
MigrationPreconditionError = migration_001.MigrationPreconditionError
MIGRATION_VERSION = migration_001.MIGRATION_VERSION


class TestAppointmentReliability(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db_path = _TEMP_DB_PATH
        cls.db_uri = f"sqlite:///{_TEMP_DB_PATH}"

        # Initialize test Flask application bound to isolated temporary database
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            db.drop_all()
            db.create_all()

            # Seed test hospital
            hospital = Hospital(
                name="Reliability General Hospital",
                slug="reliability-general-hospital",
                image="https://images.unsplash.com/photo-hospital.jpg",
                address="100 Quality Way",
                city="Metropolis",
                state="NY",
                phone="555-0100",
                emergency_number="911"
            )
            db.session.add(hospital)
            db.session.commit()
            cls.hospital_id = hospital.id

            # Seed test specialization
            spec = Specialization(
                name="Cardiology Test",
                slug="cardiology-test",
                description="Testing spec"
            )
            db.session.add(spec)
            db.session.commit()
            cls.spec_id = spec.id

            # Seed two test doctors
            doc1 = Doctor(
                name="Alice Heart",
                image="https://images.unsplash.com/photo-doc1.jpg",
                qualification="MD Cardiology",
                location="Metropolis",
                specialization_id=spec.id,
                hospital_id=hospital.id,
                experience=10,
                consultation_fee=150,
                rating=4.9
            )
            doc2 = Doctor(
                name="Bob Pulse",
                image="https://images.unsplash.com/photo-doc2.jpg",
                qualification="MD Cardiology",
                location="Metropolis",
                specialization_id=spec.id,
                hospital_id=hospital.id,
                experience=8,
                consultation_fee=140,
                rating=4.8
            )
            db.session.add_all([doc1, doc2])
            db.session.commit()
            cls.doc1_id = doc1.id
            cls.doc2_id = doc2.id

            # Seed regular patient user
            user1 = User(
                name="Jane Patient",
                email="jane.patient@test.com",
                phone="555-0101",
                role="USER"
            )
            user1.set_password("SecurePass123!")

            # Seed second patient user
            user2 = User(
                name="John Competitor",
                email="john.competitor@test.com",
                phone="555-0102",
                role="USER"
            )
            user2.set_password("SecurePass123!")

            # Seed admin user
            admin = User(
                name="Admin Supervisor",
                email="admin.phase2@test.com",
                phone="555-0199",
                role="ADMIN"
            )
            admin.set_password("AdminPass123!")

            db.session.add_all([user1, user2, admin])
            db.session.commit()

            cls.user1_id = user1.id
            cls.user2_id = user2.id
            cls.admin_id = admin.id

            cls.user1_token = generate_token(user1)
            cls.user2_token = generate_token(user2)
            cls.admin_token = generate_token(admin)

            cls.user1_headers = {"Authorization": f"Bearer {cls.user1_token}", "Content-Type": "application/json"}
            cls.user2_headers = {"Authorization": f"Bearer {cls.user2_token}", "Content-Type": "application/json"}
            cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}", "Content-Type": "application/json"}

    @classmethod
    def tearDownClass(cls):
        with cls.app.app_context():
            db.session.remove()
            db.engine.dispose()
        os.environ.pop("DATABASE_URL", None)
        try:
            shutil.rmtree(_TEMP_TEST_DIR_PATH, ignore_errors=True)
        except Exception:
            pass

    def setUp(self):
        # Clean appointments table before each test to guarantee isolation
        with self.app.app_context():
            Appointment.query.delete()
            db.session.commit()

    # --------------------------------------------------------------------------
    # 1. TIME VALIDATION & NORMALIZATION TESTS
    # --------------------------------------------------------------------------
    def test_time_normalization_valid_and_invalid(self):
        """Ensures canonical normalization and strict rejection of invalid time values."""
        # Valid conversions
        self.assertEqual(normalize_appointment_time("9:30 AM"), "09:30 AM")
        self.assertEqual(normalize_appointment_time("09:30 AM"), "09:30 AM")
        self.assertEqual(normalize_appointment_time("9:30am"), "09:30 AM")
        self.assertEqual(normalize_appointment_time("14:00"), "02:00 PM")
        self.assertEqual(normalize_appointment_time("00:00"), "12:00 AM")

        # Invalid rejections
        for invalid_time in ["25:00", "13:75", "00:30 AM", "13:00 PM", "invalid", "12:60 PM"]:
            with self.assertRaises(ValueError):
                normalize_appointment_time(invalid_time)

    # --------------------------------------------------------------------------
    # 2. BOOKED-SLOTS ENDPOINT TESTS
    # --------------------------------------------------------------------------
    def test_booked_slots_endpoint(self):
        """Verifies GET /api/appointments/booked-slots correctly reports occupied times."""
        target_date = (date.today() + timedelta(days=2)).isoformat()

        # Initially empty
        res = self.client.get(f"/api/appointments/booked-slots?doctor_id={self.doc1_id}&date={target_date}")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['booked_slots'], [])

        # Book one appointment
        book_res = self.client.post("/api/appointments", headers=self.user1_headers, data=json.dumps({
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "10:30 AM",
            "reason": "Consultation for test"
        }))
        self.assertEqual(book_res.status_code, 201)

        # Booked-slots now contains 10:30 AM
        res2 = self.client.get(f"/api/appointments/booked-slots?doctor_id={self.doc1_id}&date={target_date}")
        self.assertEqual(res2.status_code, 200)
        self.assertIn("10:30 AM", res2.get_json()['booked_slots'])

    # --------------------------------------------------------------------------
    # 3. CONFLICT DETECTION (HTTP 409)
    # --------------------------------------------------------------------------
    def test_double_booking_rejection_http_409(self):
        """Prevents two patients from booking the same doctor at the same date and time."""
        target_date = (date.today() + timedelta(days=3)).isoformat()
        payload = {
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "10:00 AM",
            "reason": "Checkup"
        }

        # First booking succeeds
        res1 = self.client.post("/api/appointments", headers=self.user1_headers, data=json.dumps(payload))
        self.assertEqual(res1.status_code, 201)
        self.assertTrue(res1.get_json()['success'])

        # Competing booking for same doctor/date/time receives HTTP 409 Conflict
        res2 = self.client.post("/api/appointments", headers=self.user2_headers, data=json.dumps(payload))
        self.assertEqual(res2.status_code, 409)
        self.assertFalse(res2.get_json()['success'])
        self.assertIn("already been booked", res2.get_json()['message'])

    # --------------------------------------------------------------------------
    # 4. DIFFERENT DOCTORS INDEPENDENT BOOKINGS
    # --------------------------------------------------------------------------
    def test_different_doctors_same_slot_allowed(self):
        """Verifies different doctors can both be booked for the same date and time."""
        target_date = (date.today() + timedelta(days=4)).isoformat()

        res1 = self.client.post("/api/appointments", headers=self.user1_headers, data=json.dumps({
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "11:00 AM",
            "reason": "Doc 1 checkup"
        }))
        self.assertEqual(res1.status_code, 201)

        res2 = self.client.post("/api/appointments", headers=self.user2_headers, data=json.dumps({
            "doctor_id": self.doc2_id,
            "appointment_date": target_date,
            "appointment_time": "11:00 AM",
            "reason": "Doc 2 checkup"
        }))
        self.assertEqual(res2.status_code, 201)

    # --------------------------------------------------------------------------
    # 5. CANCELLED SLOT RELEASE & RE-BOOKING
    # --------------------------------------------------------------------------
    def test_cancelled_slot_released_and_rebookable(self):
        """Verifies cancelled appointments release their slots so others can book."""
        target_date = (date.today() + timedelta(days=5)).isoformat()

        # Patient 1 books
        book_res = self.client.post("/api/appointments", headers=self.user1_headers, data=json.dumps({
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "02:00 PM",
            "reason": "Initial booking"
        }))
        appt_id = book_res.get_json()['appointment']['id']

        # Patient 1 cancels
        cancel_res = self.client.put(f"/api/appointments/{appt_id}", headers=self.user1_headers, data=json.dumps({
            "status": "Cancelled"
        }))
        self.assertEqual(cancel_res.status_code, 200)

        # Patient 2 can now book the exact same slot
        rebook_res = self.client.post("/api/appointments", headers=self.user2_headers, data=json.dumps({
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "02:00 PM",
            "reason": "Re-booking released slot"
        }))
        self.assertEqual(rebook_res.status_code, 201)

    # --------------------------------------------------------------------------
    # 6. COMPLETED SLOT DOES NOT BLOCK FUTURE AVAILABILITY
    # --------------------------------------------------------------------------
    def test_completed_slot_does_not_block_booking(self):
        """Verifies historical completed appointments do not occupy active availability."""
        target_date = (date.today() + timedelta(days=6)).isoformat()

        # Seed completed appointment
        with self.app.app_context():
            completed_appt = Appointment(
                user_id=self.user1_id,
                doctor_id=self.doc1_id,
                hospital_id=self.hospital_id,
                appointment_date=target_date,
                appointment_time="03:00 PM",
                reason="Historical visit",
                status="Completed"
            )
            db.session.add(completed_appt)
            db.session.commit()

        # New patient can book that slot
        book_res = self.client.post("/api/appointments", headers=self.user2_headers, data=json.dumps({
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "03:00 PM",
            "reason": "New consultation"
        }))
        self.assertEqual(book_res.status_code, 201)

    # --------------------------------------------------------------------------
    # 7. COMPLETED APPOINTMENT IMMUTABILITY
    # --------------------------------------------------------------------------
    def test_completed_appointment_immutability(self):
        """Ensures completed consultations cannot be reopened, cancelled, or rescheduled."""
        target_date = (date.today() + timedelta(days=7)).isoformat()
        with self.app.app_context():
            comp_appt = Appointment(
                user_id=self.user1_id,
                doctor_id=self.doc1_id,
                hospital_id=self.hospital_id,
                appointment_date=target_date,
                appointment_time="04:00 PM",
                reason="Terminal checkup",
                status="Completed",
                notes="Original clinical notes"
            )
            db.session.add(comp_appt)
            db.session.commit()
            appt_id = comp_appt.id

        # 1. Attempt to reopen to Pending
        res1 = self.client.put(f"/api/appointments/{appt_id}", headers=self.admin_headers, data=json.dumps({
            "status": "Pending"
        }))
        self.assertEqual(res1.status_code, 400)
        self.assertIn("cannot be reopened", res1.get_json()['message'])

        # 2. Attempt to reschedule date/time
        res2 = self.client.put(f"/api/appointments/{appt_id}", headers=self.admin_headers, data=json.dumps({
            "appointment_time": "05:00 PM"
        }))
        self.assertEqual(res2.status_code, 400)
        self.assertIn("immutable", res2.get_json()['message'])

        # 3. Attempt to delete completed appointment
        res3 = self.client.delete(f"/api/appointments/{appt_id}", headers=self.admin_headers)
        self.assertEqual(res3.status_code, 400)

        # 4. Admin appending notes preserves existing note content
        res4 = self.client.put(f"/api/appointments/{appt_id}", headers=self.admin_headers, data=json.dumps({
            "notes": "Follow-up lab results confirmed normal."
        }))
        self.assertEqual(res4.status_code, 200)
        updated_notes = res4.get_json()['appointment']['notes']
        self.assertIn("Original clinical notes", updated_notes)
        self.assertIn("Follow-up lab results confirmed normal", updated_notes)

    # --------------------------------------------------------------------------
    # 8. RESCHEDULING & REACTIVATION CONFLICT GUARDS
    # --------------------------------------------------------------------------
    def test_rescheduling_into_occupied_slot_returns_409(self):
        """Ensures rescheduling into an existing active slot returns HTTP 409."""
        target_date = (date.today() + timedelta(days=8)).isoformat()

        # Slot 1: 09:00 AM
        res1 = self.client.post("/api/appointments", headers=self.user1_headers, data=json.dumps({
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "09:00 AM",
            "reason": "Appt 1"
        }))
        self.assertEqual(res1.status_code, 201)

        # Slot 2: 09:30 AM
        res2 = self.client.post("/api/appointments", headers=self.user2_headers, data=json.dumps({
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "09:30 AM",
            "reason": "Appt 2"
        }))
        self.assertEqual(res2.status_code, 201)
        appt2_id = res2.get_json()['appointment']['id']

        # Admin attempts to reschedule Appt 2 to 09:00 AM (occupied by Appt 1)
        res_reschedule = self.client.put(f"/api/appointments/{appt2_id}", headers=self.admin_headers, data=json.dumps({
            "appointment_time": "09:00 AM"
        }))
        self.assertEqual(res_reschedule.status_code, 409)
        self.assertIn("already occupied", res_reschedule.get_json()['message'])

    def test_cancelled_reactivation_checks_conflicts(self):
        """Ensures reactivating a cancelled appointment checks for collisions."""
        target_date = (date.today() + timedelta(days=9)).isoformat()

        # 1. Book Appt 1 and cancel it
        b1 = self.client.post("/api/appointments", headers=self.user1_headers, data=json.dumps({
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "11:30 AM",
            "reason": "Appt 1"
        }))
        appt1_id = b1.get_json()['appointment']['id']
        self.client.put(f"/api/appointments/{appt1_id}", headers=self.user1_headers, data=json.dumps({"status": "Cancelled"}))

        # 2. Book Appt 2 in that newly released slot
        b2 = self.client.post("/api/appointments", headers=self.user2_headers, data=json.dumps({
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "11:30 AM",
            "reason": "Appt 2"
        }))
        self.assertEqual(b2.status_code, 201)

        # 3. Admin attempts to reactivate Appt 1 to Confirmed -> returns 409
        reactivate_res = self.client.put(f"/api/appointments/{appt1_id}", headers=self.admin_headers, data=json.dumps({
            "status": "Confirmed"
        }))
        self.assertEqual(reactivate_res.status_code, 409)

    # --------------------------------------------------------------------------
    # 9. MIGRATION PRECONDITION SAFETY TESTS
    # --------------------------------------------------------------------------
    def test_migration_precondition_aborts_on_duplicate_groups(self):
        """Confirms migration strictly refuses to mutate schema when duplicates exist."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tf:
            dup_db_path = tf.name

        try:
            dup_engine = create_engine(f"sqlite:///{dup_db_path}")
            with dup_engine.connect() as conn:
                conn.execute(text("""
                    CREATE TABLE appointments (
                        id INTEGER PRIMARY KEY,
                        doctor_id INTEGER NOT NULL,
                        appointment_date TEXT NOT NULL,
                        appointment_time TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'Pending'
                    )
                """))
                # Seed two duplicates for same active slot
                conn.execute(text("""
                    INSERT INTO appointments VALUES (1, 10, '2026-10-15', '10:00 AM', 'Pending')
                """))
                conn.execute(text("""
                    INSERT INTO appointments VALUES (2, 10, '2026-10-15', '10:00 AM', 'Pending')
                """))
                conn.commit()

            # Attempt upgrade -> MUST raise MigrationPreconditionError
            with self.assertRaises(MigrationPreconditionError):
                run_migration_upgrade(dup_engine)

            # Confirm schema was NOT mutated and records were NOT deleted
            with dup_engine.connect() as conn:
                count = conn.execute(text("SELECT count(*) FROM appointments")).scalar()
                self.assertEqual(count, 2)
                # Ensure index was not created
                idx = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_active_doctor_slot'")).fetchone()
                self.assertIsNone(idx)
                # Ensure schema_migrations table was NOT created before preconditions passed
                tbl = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'")).fetchone()
                self.assertIsNone(tbl)
        finally:
            dup_engine.dispose()
            if os.path.exists(dup_db_path):
                os.remove(dup_db_path)

    def test_migration_upgrade_and_downgrade_clean(self):
        """Verifies clean migration upgrade and rollback on non-conflicting database."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tf:
            clean_db_path = tf.name

        try:
            clean_engine = create_engine(f"sqlite:///{clean_db_path}")
            with clean_engine.connect() as conn:
                conn.execute(text("""
                    CREATE TABLE appointments (
                        id INTEGER PRIMARY KEY,
                        doctor_id INTEGER NOT NULL,
                        appointment_date TEXT NOT NULL,
                        appointment_time TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'Pending'
                    )
                """))
                conn.execute(text("INSERT INTO appointments VALUES (1, 1, '2026-10-15', '10:00 AM', 'Pending')"))
                conn.execute(text("INSERT INTO appointments VALUES (2, 1, '2026-10-15', '11:00 AM', 'Pending')"))
                conn.commit()

            # Upgrade succeeds
            res = run_migration_upgrade(clean_engine)
            self.assertTrue(res)

            # Index exists
            with clean_engine.connect() as conn:
                idx = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_active_doctor_slot'")).fetchone()
                self.assertIsNotNone(idx)
                ver = conn.execute(text("SELECT version FROM schema_migrations")).scalar()
                self.assertEqual(ver, MIGRATION_VERSION)

            # Downgrade succeeds
            down_res = run_migration_downgrade(clean_engine)
            self.assertTrue(down_res)

            with clean_engine.connect() as conn:
                idx_after = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_active_doctor_slot'")).fetchone()
                self.assertIsNone(idx_after)
                ver_count = conn.execute(text("SELECT count(*) FROM schema_migrations WHERE version=:v"), {"v": MIGRATION_VERSION}).scalar()
                self.assertEqual(ver_count, 0)
        finally:
            clean_engine.dispose()
            if os.path.exists(clean_db_path):
                os.remove(clean_db_path)

    # --------------------------------------------------------------------------
    # 10. AUDIT FIX TESTS: REASSIGNMENT, DELETION & CANONICALIZATION
    # --------------------------------------------------------------------------
    def test_admin_reassignment_rejected_with_400(self):
        """Verifies attempts to reassign doctor_id, hospital_id, or user_id are rejected with 400."""
        target_date = (date.today() + timedelta(days=10)).isoformat()
        res = self.client.post("/api/appointments", headers=self.user1_headers, data=json.dumps({
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "10:00 AM",
            "reason": "Reassign test"
        }))
        appt_id = res.get_json()['appointment']['id']

        # Attempt to modify doctor_id
        r_doc = self.client.put(f"/api/appointments/{appt_id}", headers=self.admin_headers, data=json.dumps({
            "doctor_id": self.doc2_id
        }))
        self.assertEqual(r_doc.status_code, 400)
        self.assertIn("Modifying doctor_id is not supported", r_doc.get_json()['message'])

        # Attempt to modify hospital_id
        r_hosp = self.client.put(f"/api/appointments/{appt_id}", headers=self.admin_headers, data=json.dumps({
            "hospital_id": 99
        }))
        self.assertEqual(r_hosp.status_code, 400)
        self.assertIn("Modifying hospital_id is not supported", r_hosp.get_json()['message'])

        # Attempt to modify user_id
        r_user = self.client.put(f"/api/appointments/{appt_id}", headers=self.admin_headers, data=json.dumps({
            "user_id": 99
        }))
        self.assertEqual(r_user.status_code, 400)
        self.assertIn("Modifying user_id is not supported", r_user.get_json()['message'])

    def test_patient_cannot_hard_delete_appointment(self):
        """Verifies patients cannot hard-delete appointments and receive HTTP 403."""
        target_date = (date.today() + timedelta(days=11)).isoformat()
        res = self.client.post("/api/appointments", headers=self.user1_headers, data=json.dumps({
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "11:00 AM",
            "reason": "Hard delete test"
        }))
        appt_id = res.get_json()['appointment']['id']

        # Patient tries to DELETE
        del_res = self.client.delete(f"/api/appointments/{appt_id}", headers=self.user1_headers)
        self.assertEqual(del_res.status_code, 403)
        self.assertIn("Patients cannot delete appointment records", del_res.get_json()['message'])

        # Appointment still exists in database
        with self.app.app_context():
            a = Appointment.query.get(appt_id)
            self.assertIsNotNone(a)

    def test_admin_hard_delete_with_locking(self):
        """Verifies admin hard-delete succeeds under lock and releases slot."""
        target_date = (date.today() + timedelta(days=12)).isoformat()
        res = self.client.post("/api/appointments", headers=self.user1_headers, data=json.dumps({
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "12:00 PM",
            "reason": "Admin delete test"
        }))
        appt_id = res.get_json()['appointment']['id']

        # Admin DELETE succeeds
        admin_del = self.client.delete(f"/api/appointments/{appt_id}", headers=self.admin_headers)
        self.assertEqual(admin_del.status_code, 200)

        # Slot is now available for new booking
        rebook_res = self.client.post("/api/appointments", headers=self.user2_headers, data=json.dumps({
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "12:00 PM",
            "reason": "Rebook after admin delete"
        }))
        self.assertEqual(rebook_res.status_code, 201)

    def test_legacy_time_normalization_in_booked_slots(self):
        """Verifies booked-slots API normalizes unpadded legacy appointment times."""
        target_date = (date.today() + timedelta(days=13)).isoformat()
        with self.app.app_context():
            # Insert unpadded legacy time
            legacy_appt = Appointment(
                user_id=self.user1_id,
                doctor_id=self.doc1_id,
                hospital_id=self.hospital_id,
                appointment_date=target_date,
                appointment_time="9:30 AM",
                reason="Legacy format test",
                status="Pending"
            )
            db.session.add(legacy_appt)
            db.session.commit()

        # Call booked-slots API
        res = self.client.get(f"/api/appointments/booked-slots?doctor_id={self.doc1_id}&date={target_date}")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("09:30 AM", data['booked_slots'])

        # Booking the canonical time fails with 409 Conflict
        book_res = self.client.post("/api/appointments", headers=self.user2_headers, data=json.dumps({
            "doctor_id": self.doc1_id,
            "appointment_date": target_date,
            "appointment_time": "09:30 AM",
            "reason": "Conflict against legacy"
        }))
        self.assertEqual(book_res.status_code, 409)

    def test_migration_detects_logical_duplicates(self):
        """Confirms migration aborts when logical duplicates differ only in padding/casing."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tf:
            logical_dup_path = tf.name

        try:
            eng = create_engine(f"sqlite:///{logical_dup_path}")
            with eng.connect() as conn:
                conn.execute(text("""
                    CREATE TABLE appointments (
                        id INTEGER PRIMARY KEY,
                        doctor_id INTEGER NOT NULL,
                        appointment_date TEXT NOT NULL,
                        appointment_time TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'Pending'
                    )
                """))
                # One unpadded "9:30 AM" and one canonical "09:30 AM"
                conn.execute(text("INSERT INTO appointments VALUES (1, 5, '2026-10-15', '9:30 AM', 'Pending')"))
                conn.execute(text("INSERT INTO appointments VALUES (2, 5, '2026-10-15', '09:30 AM', 'Confirmed')"))
                conn.commit()

            # Attempt upgrade -> MUST raise MigrationPreconditionError for logical collision
            with self.assertRaises(MigrationPreconditionError):
                run_migration_upgrade(eng)

            # Ensure schema was NOT mutated
            with eng.connect() as conn:
                idx = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_active_doctor_slot'")).fetchone()
                self.assertIsNone(idx)
        finally:
            eng.dispose()
            if os.path.exists(logical_dup_path):
                os.remove(logical_dup_path)

    def test_sqlite_pragmas_configured_correctly(self):
        """Verifies SQLite connection pragmas: busy_timeout=5000 and foreign_keys=1."""
        with self.app.app_context():
            timeout = db.session.execute(text("PRAGMA busy_timeout")).scalar()
            fk = db.session.execute(text("PRAGMA foreign_keys")).scalar()
            self.assertEqual(timeout, 5000)
            self.assertEqual(fk, 1)


# ------------------------------------------------------------------------------
# 10. MULTI-PROCESS CONCURRENCY TEST WORKER
# ------------------------------------------------------------------------------
def _concurrent_booking_worker(db_path, doctor_id, appt_date, appt_time, user_id, barrier, result_queue):
    """
    Simulates a distinct OS worker process with its own SQLite database connection.
    Executes transaction with BEGIN IMMEDIATE and active conflict detection.
    """
    try:
        conn = sqlite3.connect(db_path, timeout=5.0)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")

        # Synchronize all processes at the barrier before firing
        barrier.wait()

        # Start immediate transaction
        conn.execute("BEGIN IMMEDIATE")

        # Conflict check
        cur = conn.cursor()
        cur.execute("""
            SELECT id FROM appointments 
            WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? 
              AND status IN ('Pending', 'Confirmed')
        """, (doctor_id, appt_date, appt_time))
        conflict = cur.fetchone()

        if conflict:
            conn.rollback()
            conn.close()
            result_queue.put(("CONFLICT_409", os.getpid()))
            return

        # Insert booking
        cur.execute("""
            INSERT INTO appointments (user_id, doctor_id, hospital_id, appointment_date, appointment_time, reason, status)
            VALUES (?, ?, 1, ?, ?, 'Multi-process race test', 'Pending')
        """, (user_id, doctor_id, appt_date, appt_time))
        conn.commit()
        conn.close()
        result_queue.put(("SUCCESS_201", os.getpid()))

    except Exception as exc:
        result_queue.put((f"ERROR: {type(exc).__name__}: {exc}", os.getpid()))


class TestMultiProcessConcurrency(unittest.TestCase):
    def test_multi_process_simultaneous_booking_race(self):
        """
        Launches 6 distinct OS processes competing for the exact same slot.
        Verifies that database-level BEGIN IMMEDIATE serializes requests so that
        exactly ONE process succeeds (201) and all others detect conflict (409).
        """
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tf:
            race_db_path = tf.name

        try:
            # Prepare schema with partial unique index
            conn = sqlite3.connect(race_db_path)
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("""
                CREATE TABLE appointments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    doctor_id INTEGER NOT NULL,
                    hospital_id INTEGER NOT NULL,
                    appointment_date TEXT NOT NULL,
                    appointment_time TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'Pending'
                )
            """)
            conn.execute("""
                CREATE UNIQUE INDEX uq_active_doctor_slot 
                ON appointments (doctor_id, appointment_date, appointment_time) 
                WHERE status IN ('Pending', 'Confirmed')
            """)
            conn.commit()
            conn.close()

            num_workers = 6
            barrier = multiprocessing.Barrier(num_workers)
            result_queue = multiprocessing.Queue()
            processes = []

            target_date = "2026-12-01"
            target_time = "10:00 AM"

            for i in range(num_workers):
                p = multiprocessing.Process(
                    target=_concurrent_booking_worker,
                    args=(race_db_path, 1, target_date, target_time, i + 1, barrier, result_queue)
                )
                processes.append(p)
                p.start()

            for p in processes:
                p.join(timeout=10)

            results = []
            while not result_queue.empty():
                results.append(result_queue.get())

            successes = [r for r in results if r[0] == "SUCCESS_201"]
            conflicts = [r for r in results if r[0] == "CONFLICT_409"]

            # Assertions
            self.assertEqual(len(results), num_workers, f"Expected {num_workers} results, got {len(results)}")
            self.assertEqual(len(successes), 1, f"Expected exactly 1 winner, got {len(successes)}")
            self.assertEqual(len(conflicts), num_workers - 1, f"Expected {num_workers - 1} conflicts, got {len(conflicts)}")

            # Verify database state
            verify_conn = sqlite3.connect(race_db_path)
            cur = verify_conn.cursor()
            cur.execute("SELECT count(*) FROM appointments WHERE doctor_id=1 AND appointment_date=? AND appointment_time=?", (target_date, target_time))
            count = cur.fetchone()[0]
            verify_conn.close()
            self.assertEqual(count, 1, f"Database has {count} appointments, expected exactly 1")

        finally:
            if os.path.exists(race_db_path):
                os.remove(race_db_path)


if __name__ == '__main__':
    unittest.main()
