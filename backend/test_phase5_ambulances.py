"""
MediConnect Phase 5 Test Suite: Emergency & Ambulance Dispatch Reliability
Isolated testing using temporary SQLite databases.
Guarantees zero mutations against existing development or production databases.
"""

import os
import sys
import tempfile
import uuid
import unittest
import threading
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

# Force isolated temporary database BEFORE importing any application modules
_TEMP_TEST_DIR_PATH = os.path.join(tempfile.gettempdir(), f"phase5_test_{uuid.uuid4().hex[:8]}")
os.makedirs(_TEMP_TEST_DIR_PATH, exist_ok=True)
_TEMP_DB_PATH = os.path.join(_TEMP_TEST_DIR_PATH, "test_phase5.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEMP_DB_PATH}"

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from models import db, User, Ambulance, AmbulanceRequest
import importlib
migration_003 = importlib.import_module("migrations.003_ambulance_dispatch_reliability")
mig_upgrade = migration_003.upgrade
mig_downgrade = migration_003.downgrade
check_preconditions = migration_003.check_preconditions
check_is_applied = migration_003.check_is_applied
MigrationPreconditionError = migration_003.MigrationPreconditionError

migration_004 = importlib.import_module("migrations.004_ambulance_idempotency")
mig004_upgrade = migration_004.upgrade
mig004_downgrade = migration_004.downgrade
check_is_applied_004 = migration_004.check_is_applied
MigrationPreconditionError004 = migration_004.MigrationPreconditionError


class TestPhase5Ambulances(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            db.create_all()
            # Apply migrations 003 and 004 in test DB
            with db.engine.connect() as conn:
                mig_upgrade(conn)
                mig004_upgrade(conn)

    @classmethod
    def tearDownClass(cls):
        with cls.app.app_context():
            db.session.remove()
            db.drop_all()
        if os.path.exists(_TEMP_DB_PATH):
            try:
                os.remove(_TEMP_DB_PATH)
            except Exception:
                pass

    def setUp(self):
        with self.app.app_context():
            # Clean requests and ambulances between tests
            AmbulanceRequest.query.delete()
            Ambulance.query.delete()
            db.session.commit()

    # ---------------------------------------------------------
    # 1. Concurrency & Double-Dispatch Prevention
    # ---------------------------------------------------------
    def test_01_concurrent_ambulance_dispatch_no_double_assignment(self):
        """Simulate 10 simultaneous emergency requests with only 1 ambulance available."""
        with self.app.app_context():
            amb = Ambulance(
                vehicle_number="MH01-AMB-101",
                driver_name="Ramesh Test",
                driver_phone="+91 98000 11111",
                ambulance_type="Basic Life Support",
                current_location="Mumbai Central",
                status="Available"
            )
            db.session.add(amb)
            db.session.commit()
            amb_id = amb.id

        results = []
        errors = []
        barrier = threading.Barrier(10)

        def submit_emergency(index):
            try:
                barrier.wait(timeout=10)
            except Exception as e:
                errors.append(e)
                return
            with self.app.app_context():
                client = self.app.test_client()
                try:
                    res = client.post("/api/ambulance-requests", json={
                        "patient_name": f"Emergency Patient {index}",
                        "phone": f"+91 98000 2222{index}",
                        "emergency_type": "Heart Emergency",
                        "pickup_location": f"Sector {index}, Marine Drive",
                        "destination_hospital": "Apollo Hospital",
                        "patients_count": 1
                    })
                    results.append(res.get_json())
                except Exception as e:
                    errors.append(e)

        threads = []
        for i in range(10):
            t = threading.Thread(target=submit_emergency, args=(i,))
            threads.append(t)

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0, f"Encountered unexpected thread errors: {errors}")
        self.assertEqual(len(results), 10)

        # Count how many got Dispatched vs Pending
        dispatched_list = [r['request'] for r in results if r.get('request', {}).get('status') == 'Dispatched']
        pending_list = [r['request'] for r in results if r.get('request', {}).get('status') == 'Pending']

        # Exactly 1 request must be Dispatched to the single available ambulance
        self.assertEqual(len(dispatched_list), 1, "Exactly one emergency request should be Dispatched")
        self.assertEqual(dispatched_list[0]['assigned_ambulance_id'], amb_id)

        # The other 9 requests must be queued as Pending without dropping any call
        self.assertEqual(len(pending_list), 9, "Remaining 9 emergency requests should be safely queued as Pending")
        for p in pending_list:
            self.assertIsNone(p['assigned_ambulance_id'], "Pending requests must not have assigned ambulance")

        # Verify database state
        with self.app.app_context():
            amb_db = db.session.get(Ambulance, amb_id)
            self.assertEqual(amb_db.status, 'On Duty')

            active_count = AmbulanceRequest.query.filter_by(assigned_ambulance_id=amb_id, status='Dispatched').count()
            self.assertEqual(active_count, 1, "Database must have strictly 1 active request for this ambulance")

    # ---------------------------------------------------------
    # 2. Safe Auto-Assignment with No Available Ambulances
    # ---------------------------------------------------------
    def test_02_emergency_request_saved_when_all_ambulances_busy(self):
        """When fleet is exhausted, request is safely created as Pending (never lost)."""
        with self.app.app_context():
            amb = Ambulance(
                vehicle_number="MH01-AMB-202",
                driver_name="Suresh Busy",
                driver_phone="+91 98000 22222",
                ambulance_type="ICU Ambulance",
                current_location="Dadar",
                status="On Duty"
            )
            db.session.add(amb)
            db.session.commit()

        res = self.client.post("/api/ambulance-requests", json={
            "patient_name": "Emergency Patient Busy",
            "phone": "+91 98000 33333",
            "emergency_type": "Breathing Problem",
            "pickup_location": "Bandra Kurla Complex",
            "destination_hospital": "Lilavati Hospital"
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()['request']
        self.assertEqual(data['status'], 'Pending')
        self.assertIsNone(data['assigned_ambulance_id'])

    # ---------------------------------------------------------
    # 3. Partial Unique Index Direct Enforcement
    # ---------------------------------------------------------
    def test_03_partial_unique_index_blocks_duplicate_active_dispatches(self):
        """Database constraint blocks direct insertion of multiple Dispatched requests on same ambulance."""
        with self.app.app_context():
            amb = Ambulance(
                vehicle_number="MH01-AMB-303",
                driver_name="Direct Tester",
                driver_phone="+91 98000 33333",
                current_location="Andheri",
                status="On Duty"
            )
            db.session.add(amb)
            db.session.commit()

            # First active request
            req1 = AmbulanceRequest(
                patient_name="Patient 1",
                phone="9800011111",
                emergency_type="Accident",
                pickup_location="Location A",
                destination_hospital="Hospital A",
                status="Dispatched",
                assigned_ambulance_id=amb.id
            )
            db.session.add(req1)
            db.session.commit()

            # Second active request on same ambulance must raise IntegrityError
            req2 = AmbulanceRequest(
                patient_name="Patient 2",
                phone="9800022222",
                emergency_type="Accident",
                pickup_location="Location B",
                destination_hospital="Hospital B",
                status="Dispatched",
                assigned_ambulance_id=amb.id
            )
            db.session.add(req2)
            with self.assertRaises(IntegrityError):
                db.session.commit()
            db.session.rollback()

    def test_04_partial_unique_index_allows_multiple_completed_dispatches(self):
        """Completed or Cancelled requests on the same ambulance do not conflict."""
        with self.app.app_context():
            amb = Ambulance(
                vehicle_number="MH01-AMB-404",
                driver_name="History Tester",
                driver_phone="+91 98000 44444",
                current_location="Colaba",
                status="Available"
            )
            db.session.add(amb)
            db.session.commit()

            req_comp1 = AmbulanceRequest(
                patient_name="Old Patient 1",
                phone="9800011111",
                emergency_type="General",
                pickup_location="Colaba 1",
                destination_hospital="Hospital 1",
                status="Completed",
                assigned_ambulance_id=amb.id
            )
            req_comp2 = AmbulanceRequest(
                patient_name="Old Patient 2",
                phone="9800022222",
                emergency_type="General",
                pickup_location="Colaba 2",
                destination_hospital="Hospital 2",
                status="Cancelled",
                assigned_ambulance_id=amb.id
            )
            db.session.add_all([req_comp1, req_comp2])
            db.session.commit() # Should succeed without unique violation

            # And a new Dispatched request can still be assigned to it
            req_active = AmbulanceRequest(
                patient_name="Active Patient",
                phone="9800033333",
                emergency_type="Accident",
                pickup_location="Colaba 3",
                destination_hospital="Hospital 3",
                status="Dispatched",
                assigned_ambulance_id=amb.id
            )
            db.session.add(req_active)
            db.session.commit()
            self.assertEqual(req_active.status, "Dispatched")

    # ---------------------------------------------------------
    # 4. CheckConstraints on Status Enums
    # ---------------------------------------------------------
    def test_05_check_constraint_rejects_invalid_ambulance_status(self):
        """Invalid status on Ambulance is rejected by table constraint."""
        with self.app.app_context():
            amb = Ambulance(
                vehicle_number="MH01-AMB-505",
                driver_name="Invalid Status Tester",
                driver_phone="9800055555",
                current_location="Thane",
                status="InvalidStatus"
            )
            db.session.add(amb)
            with self.assertRaises(IntegrityError):
                db.session.commit()
            db.session.rollback()

    def test_06_check_constraint_rejects_invalid_request_status(self):
        """Invalid status on AmbulanceRequest is rejected by table constraint."""
        with self.app.app_context():
            req = AmbulanceRequest(
                patient_name="Invalid Status Req",
                phone="9800066666",
                emergency_type="Heart",
                pickup_location="Location",
                destination_hospital="Hospital",
                status="InvalidRequestStatus"
            )
            db.session.add(req)
            with self.assertRaises(IntegrityError):
                db.session.commit()
            db.session.rollback()

    # ---------------------------------------------------------
    # 5. Migration 003 Lifecycle: Preflight, Upgrade, Downgrade
    # ---------------------------------------------------------
    def test_07_migration_upgrade_and_downgrade_roundtrip(self):
        """Test clean downgrade and upgrade cycle on scratch database."""
        scratch_dir = tempfile.mkdtemp()
        scratch_db_path = os.path.join(scratch_dir, "mig_test.db")
        scratch_url = f"sqlite:///{scratch_db_path}"

        from sqlalchemy import create_engine
        engine = create_engine(scratch_url)

        with engine.connect() as conn:
            # Create minimal tables
            conn.execute(text("""
                CREATE TABLE ambulances (
                    id INTEGER PRIMARY KEY,
                    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
                    driver_name VARCHAR(100) NOT NULL,
                    driver_phone VARCHAR(30) NOT NULL,
                    ambulance_type VARCHAR(60) DEFAULT 'Basic Life Support',
                    current_location VARCHAR(150) NOT NULL,
                    status VARCHAR(30) DEFAULT 'Available',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("""
                CREATE TABLE ambulance_requests (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    patient_name VARCHAR(100) NOT NULL,
                    phone VARCHAR(30) NOT NULL,
                    emergency_type VARCHAR(100) NOT NULL,
                    pickup_location VARCHAR(255) NOT NULL,
                    destination_hospital VARCHAR(150) NOT NULL,
                    patients_count INTEGER DEFAULT 1,
                    additional_info TEXT,
                    status VARCHAR(30) DEFAULT 'Pending',
                    assigned_ambulance_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()

            # 1. Upgrade
            self.assertFalse(check_is_applied(conn))
            mig_upgrade(conn)
            self.assertTrue(check_is_applied(conn))

            # Verify index exists
            idx_row = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_active_ambulance_dispatch'")).fetchone()
            self.assertIsNotNone(idx_row)

            # 2. Downgrade
            mig_downgrade(conn)
            self.assertFalse(check_is_applied(conn))

            # Verify index dropped
            idx_row_after = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_active_ambulance_dispatch'")).fetchone()
            self.assertIsNone(idx_row_after)

            # 3. Idempotent re-upgrade
            mig_upgrade(conn)
            self.assertTrue(check_is_applied(conn))

        try:
            os.remove(scratch_db_path)
            os.rmdir(scratch_dir)
        except Exception:
            pass

    def test_08_migration_preflight_fails_closed_on_invalid_status(self):
        """Migration fails closed if existing ambulance records contain invalid status."""
        scratch_dir = tempfile.mkdtemp()
        scratch_db_path = os.path.join(scratch_dir, "mig_fail_test.db")
        scratch_url = f"sqlite:///{scratch_db_path}"

        from sqlalchemy import create_engine
        engine = create_engine(scratch_url)

        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE ambulances (
                    id INTEGER PRIMARY KEY,
                    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
                    driver_name VARCHAR(100) NOT NULL,
                    driver_phone VARCHAR(30) NOT NULL,
                    ambulance_type VARCHAR(60) DEFAULT 'Basic Life Support',
                    current_location VARCHAR(150) NOT NULL,
                    status VARCHAR(30) DEFAULT 'Available',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("""
                CREATE TABLE ambulance_requests (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    patient_name VARCHAR(100) NOT NULL,
                    phone VARCHAR(30) NOT NULL,
                    emergency_type VARCHAR(100) NOT NULL,
                    pickup_location VARCHAR(255) NOT NULL,
                    destination_hospital VARCHAR(150) NOT NULL,
                    patients_count INTEGER DEFAULT 1,
                    additional_info TEXT,
                    status VARCHAR(30) DEFAULT 'Pending',
                    assigned_ambulance_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            # Insert invalid status
            conn.execute(text("INSERT INTO ambulances (vehicle_number, driver_name, driver_phone, current_location, status) VALUES ('BAD-101', 'Bad Driver', '123', 'City', 'CorruptStatus')"))
            conn.commit()

            with self.assertRaises(MigrationPreconditionError):
                mig_upgrade(conn)

            # Verify index was NOT created (failed closed)
            idx_row = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_active_ambulance_dispatch'")).fetchone()
            self.assertIsNone(idx_row)

        try:
            os.remove(scratch_db_path)
            os.rmdir(scratch_dir)
        except Exception:
            pass

    def test_09_migration_preflight_fails_closed_on_duplicate_active_dispatches(self):
        """Migration fails closed if existing data contains duplicate active dispatches on same ambulance."""
        scratch_dir = tempfile.mkdtemp()
        scratch_db_path = os.path.join(scratch_dir, "mig_dupe_test.db")
        scratch_url = f"sqlite:///{scratch_db_path}"

        from sqlalchemy import create_engine
        engine = create_engine(scratch_url)

        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE ambulances (
                    id INTEGER PRIMARY KEY,
                    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
                    driver_name VARCHAR(100) NOT NULL,
                    driver_phone VARCHAR(30) NOT NULL,
                    ambulance_type VARCHAR(60) DEFAULT 'Basic Life Support',
                    current_location VARCHAR(150) NOT NULL,
                    status VARCHAR(30) DEFAULT 'Available',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("""
                CREATE TABLE ambulance_requests (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    patient_name VARCHAR(100) NOT NULL,
                    phone VARCHAR(30) NOT NULL,
                    emergency_type VARCHAR(100) NOT NULL,
                    pickup_location VARCHAR(255) NOT NULL,
                    destination_hospital VARCHAR(150) NOT NULL,
                    patients_count INTEGER DEFAULT 1,
                    additional_info TEXT,
                    status VARCHAR(30) DEFAULT 'Pending',
                    assigned_ambulance_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("INSERT INTO ambulances (id, vehicle_number, driver_name, driver_phone, current_location, status) VALUES (1, 'AMB-1', 'D1', '123', 'City', 'On Duty')"))
            # Insert duplicate active dispatches for same ambulance #1
            conn.execute(text("INSERT INTO ambulance_requests (patient_name, phone, emergency_type, pickup_location, destination_hospital, status, assigned_ambulance_id) VALUES ('P1', '123', 'Heart', 'L1', 'H1', 'Dispatched', 1)"))
            conn.execute(text("INSERT INTO ambulance_requests (patient_name, phone, emergency_type, pickup_location, destination_hospital, status, assigned_ambulance_id) VALUES ('P2', '456', 'Heart', 'L2', 'H2', 'Dispatched', 1)"))
            conn.commit()

            with self.assertRaises(MigrationPreconditionError):
                mig_upgrade(conn)

            # Verify index was NOT created
            idx_row = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_active_ambulance_dispatch'")).fetchone()
            self.assertIsNone(idx_row)

        try:
            os.remove(scratch_db_path)
            os.rmdir(scratch_dir)
        except Exception:
            pass

    def test_10_forced_integrity_error_fallback_persists_pending(self):
        """Forces IntegrityError on primary dispatch commit and verifies fallback persists exactly one Pending request with no ambulance."""
        from unittest.mock import patch

        with self.app.app_context():
            amb = Ambulance(
                vehicle_number="MH01-AMB-999",
                driver_name="Fallback Test Driver",
                driver_phone="+91 98000 99999",
                ambulance_type="Basic Life Support",
                current_location="Colaba",
                status="Available"
            )
            db.session.add(amb)
            db.session.commit()
            amb_id = amb.id

        real_commit = db.session.commit
        commit_calls = 0

        def mocked_commit():
            nonlocal commit_calls
            commit_calls += 1
            if commit_calls == 1:
                # First commit attempt: simulate collision / IntegrityError on partial unique index
                raise IntegrityError("Simulated index collision", params=None, orig=Exception("UNIQUE constraint failed"))
            return real_commit()

        with patch.object(db.session, 'commit', side_effect=mocked_commit):
            res = self.client.post("/api/ambulance-requests", json={
                "patient_name": "Fallback Test Patient",
                "phone": "+91 99999 88888",
                "emergency_type": "Breathing Difficulty",
                "pickup_location": "Gate 4, Nariman Point",
                "destination_hospital": "Lilavati Hospital",
                "patients_count": 1
            })

        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['request']['status'], 'Pending')
        self.assertIsNone(data['request']['assigned_ambulance_id'])

        # Verify in database: exactly 1 request persisted, status Pending, no ambulance assigned
        with self.app.app_context():
            requests = AmbulanceRequest.query.filter_by(patient_name="Fallback Test Patient").all()
            self.assertEqual(len(requests), 1, "Exactly one emergency request must be persisted")
            self.assertEqual(requests[0].status, 'Pending')
            self.assertIsNone(requests[0].assigned_ambulance_id)

            # Ambulance status was rolled back to Available
            amb_db = db.session.get(Ambulance, amb_id)
            self.assertEqual(amb_db.status, 'Available')

    def test_11_migration_preflight_fails_closed_on_invalid_request_status(self):
        """Migration fails closed if existing data contains invalid ambulance_requests.status."""
        scratch_dir = tempfile.mkdtemp()
        scratch_db_path = os.path.join(scratch_dir, "mig_invalid_req_status.db")
        scratch_url = f"sqlite:///{scratch_db_path}"

        from sqlalchemy import create_engine
        engine = create_engine(scratch_url)

        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE ambulances (
                    id INTEGER PRIMARY KEY,
                    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
                    driver_name VARCHAR(100) NOT NULL,
                    driver_phone VARCHAR(30) NOT NULL,
                    ambulance_type VARCHAR(60) DEFAULT 'Basic Life Support',
                    current_location VARCHAR(150) NOT NULL,
                    status VARCHAR(30) DEFAULT 'Available',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("""
                CREATE TABLE ambulance_requests (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    patient_name VARCHAR(100) NOT NULL,
                    phone VARCHAR(30) NOT NULL,
                    emergency_type VARCHAR(100) NOT NULL,
                    pickup_location VARCHAR(255) NOT NULL,
                    destination_hospital VARCHAR(150) NOT NULL,
                    patients_count INTEGER DEFAULT 1,
                    additional_info TEXT,
                    status VARCHAR(30) DEFAULT 'Pending',
                    assigned_ambulance_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            # Insert valid ambulance
            conn.execute(text("INSERT INTO ambulances (vehicle_number, driver_name, driver_phone, current_location, status) VALUES ('AMB-101', 'Driver One', '123', 'City', 'Available')"))
            # Insert invalid request status
            conn.execute(text("INSERT INTO ambulance_requests (patient_name, phone, emergency_type, pickup_location, destination_hospital, status) VALUES ('P1', '123', 'Heart', 'L1', 'H1', 'CorruptRequestStatus')"))
            conn.commit()

            with self.assertRaises(MigrationPreconditionError) as cm:
                mig_upgrade(conn)

            self.assertIn("invalid status", str(cm.exception).lower())

            # Verify index was NOT created (failed closed)
            idx_row = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_active_ambulance_dispatch'")).fetchone()
            self.assertIsNone(idx_row)

        try:
            os.remove(scratch_db_path)
            os.rmdir(scratch_dir)
        except Exception:
            pass

    def test_12_interrupted_upgrade_recovers_creating_to_created_and_downgrades_safely(self):
        """Simulates interrupted upgrade where index physically exists with provenance 'CREATING'.
        Verifies rerun promotes provenance to 'CREATED' and subsequent downgrade cleanly drops it."""
        scratch_dir = tempfile.mkdtemp()
        scratch_db_path = os.path.join(scratch_dir, "mig_recovery_test.db")
        scratch_url = f"sqlite:///{scratch_db_path}"

        from sqlalchemy import create_engine
        engine = create_engine(scratch_url)

        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE ambulances (
                    id INTEGER PRIMARY KEY,
                    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
                    driver_name VARCHAR(100) NOT NULL,
                    driver_phone VARCHAR(30) NOT NULL,
                    ambulance_type VARCHAR(60) DEFAULT 'Basic Life Support',
                    current_location VARCHAR(150) NOT NULL,
                    status VARCHAR(30) DEFAULT 'Available',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("""
                CREATE TABLE ambulance_requests (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    patient_name VARCHAR(100) NOT NULL,
                    phone VARCHAR(30) NOT NULL,
                    emergency_type VARCHAR(100) NOT NULL,
                    pickup_location VARCHAR(255) NOT NULL,
                    destination_hospital VARCHAR(150) NOT NULL,
                    patients_count INTEGER DEFAULT 1,
                    additional_info TEXT,
                    status VARCHAR(30) DEFAULT 'Pending',
                    assigned_ambulance_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()

            # Simulate interrupted state:
            # 1. Initialize migration and ownership tables
            migration_003.ensure_migrations_table(conn)
            migration_003.ensure_ownership_table(conn)

            # 2. Index physically created by previous interrupted attempt
            conn.execute(text("""
                CREATE UNIQUE INDEX uq_active_ambulance_dispatch 
                ON ambulance_requests (assigned_ambulance_id) 
                WHERE status IN ('Dispatched', 'Arrived') AND assigned_ambulance_id IS NOT NULL
            """))

            # 3. Provenance record was left in 'CREATING' before crash/interrupt
            migration_003.record_object_provenance(
                conn,
                migration_003.MIGRATION_VERSION,
                'index',
                'ambulance_requests',
                'uq_active_ambulance_dispatch',
                'CREATING'
            )
            conn.commit()

            # Verify initial simulated interrupted state
            self.assertFalse(check_is_applied(conn))
            initial_prov = migration_003.get_object_provenance(
                conn,
                migration_003.MIGRATION_VERSION,
                'index',
                'ambulance_requests',
                'uq_active_ambulance_dispatch'
            )
            self.assertEqual(initial_prov, 'CREATING')

            # 4. Rerun upgrade to trigger provenance recovery
            mig_upgrade(conn)

            # Verify that upgrade recovered status from 'CREATING' to 'CREATED'
            recovered_prov = migration_003.get_object_provenance(
                conn,
                migration_003.MIGRATION_VERSION,
                'index',
                'ambulance_requests',
                'uq_active_ambulance_dispatch'
            )
            self.assertEqual(recovered_prov, 'CREATED')
            self.assertTrue(check_is_applied(conn))

            # 5. Verify downgrade successfully handles the recovered index
            mig_downgrade(conn)
            self.assertFalse(check_is_applied(conn))

            # Verify index was cleanly dropped
            idx_after = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_active_ambulance_dispatch'")).fetchone()
            self.assertIsNone(idx_after)

            # Verify provenance was deleted
            prov_after = migration_003.get_object_provenance(
                conn,
                migration_003.MIGRATION_VERSION,
                'index',
                'ambulance_requests',
                'uq_active_ambulance_dispatch'
            )
            self.assertIsNone(prov_after)

        try:
            os.remove(scratch_db_path)
            os.rmdir(scratch_dir)
        except Exception:
            pass

    def test_13_pre_existing_index_preserved_during_downgrade(self):
        """Verifies that an index marked as PRE_EXISTING is physically preserved during downgrade."""
        scratch_dir = tempfile.mkdtemp()
        scratch_db_path = os.path.join(scratch_dir, "mig_pre_existing_test.db")
        scratch_url = f"sqlite:///{scratch_db_path}"

        from sqlalchemy import create_engine
        engine = create_engine(scratch_url)

        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE ambulances (
                    id INTEGER PRIMARY KEY,
                    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
                    driver_name VARCHAR(100) NOT NULL,
                    driver_phone VARCHAR(30) NOT NULL,
                    ambulance_type VARCHAR(60) DEFAULT 'Basic Life Support',
                    current_location VARCHAR(150) NOT NULL,
                    status VARCHAR(30) DEFAULT 'Available',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("""
                CREATE TABLE ambulance_requests (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    patient_name VARCHAR(100) NOT NULL,
                    phone VARCHAR(30) NOT NULL,
                    emergency_type VARCHAR(100) NOT NULL,
                    pickup_location VARCHAR(255) NOT NULL,
                    destination_hospital VARCHAR(150) NOT NULL,
                    patients_count INTEGER DEFAULT 1,
                    additional_info TEXT,
                    status VARCHAR(30) DEFAULT 'Pending',
                    assigned_ambulance_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            # Pre-existing index before migration runs
            conn.execute(text("""
                CREATE UNIQUE INDEX uq_active_ambulance_dispatch 
                ON ambulance_requests (assigned_ambulance_id) 
                WHERE status IN ('Dispatched', 'Arrived') AND assigned_ambulance_id IS NOT NULL
            """))
            conn.commit()

            # Run upgrade: must detect pre-existing index and mark provenance as PRE_EXISTING
            mig_upgrade(conn)
            self.assertTrue(check_is_applied(conn))
            prov = migration_003.get_object_provenance(
                conn,
                migration_003.MIGRATION_VERSION,
                'index',
                'ambulance_requests',
                'uq_active_ambulance_dispatch'
            )
            self.assertEqual(prov, 'PRE_EXISTING')

            # Run downgrade: must preserve the physical index
            mig_downgrade(conn)
            self.assertFalse(check_is_applied(conn))

            # Verify index is STILL physically present in database
            idx_row = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_active_ambulance_dispatch'")).fetchone()
            self.assertIsNotNone(idx_row, "Pre-existing index must be physically preserved after downgrade")

        try:
            os.remove(scratch_db_path)
            os.rmdir(scratch_dir)
        except Exception:
            pass

    # ---------------------------------------------------------
    # Phase 5 Part 2A: Backend Validation & Idempotency Tests
    # ---------------------------------------------------------
    def test_14_invalid_phone_formats_rejected(self):
        """Emergency request rejects invalid phone formats with HTTP 400."""
        invalid_phones = [
            "abc",
            "123",
            "+1-800-EMERGENCY-NOW",
            "phone!@#",
            "",
            "   ",
            "+91 " + "9" * 35  # > 30 chars
        ]
        for bad_phone in invalid_phones:
            res = self.client.post("/api/ambulance-requests", json={
                "patient_name": "Test Patient",
                "phone": bad_phone,
                "pickup_location": "Marine Drive, Mumbai",
                "emergency_type": "Accident"
            })
            self.assertEqual(res.status_code, 400, f"Expected 400 for phone: '{bad_phone}', got {res.status_code}")
            data = res.get_json()
            self.assertFalse(data['success'])
            self.assertIn("phone", data['message'].lower())

    def test_15_valid_phone_formats_accepted(self):
        """Emergency request accepts valid national and international phone numbers."""
        with self.app.app_context():
            amb = Ambulance(
                vehicle_number="MH01-VAL-01",
                driver_name="Phone Tester",
                driver_phone="+91 98000 00001",
                current_location="Churchgate",
                status="Available"
            )
            db.session.add(amb)
            db.session.commit()

        valid_phones = [
            "+91 98765 43210",
            "9876543210",
            "+1 (555) 234-5678",
            "022-22001122"
        ]
        for idx, good_phone in enumerate(valid_phones):
            res = self.client.post("/api/ambulance-requests", json={
                "patient_name": f"Valid Patient {idx}",
                "phone": good_phone,
                "pickup_location": f"Address {idx}, Churchgate",
                "emergency_type": "Accident"
            })
            self.assertEqual(res.status_code, 201, f"Expected 201 for phone: '{good_phone}', got {res.status_code}")
            self.assertTrue(res.get_json()['success'])

    def test_16_non_integer_patients_count_rejected(self):
        """Malformed patients_count values return HTTP 400 Bad Request, never HTTP 500."""
        malformed_counts = ["two", "many", "3.5", "invalid", True, False, []]
        for bad_count in malformed_counts:
            res = self.client.post("/api/ambulance-requests", json={
                "patient_name": "Count Test Patient",
                "phone": "+91 98000 77777",
                "pickup_location": "Bandra West, Mumbai",
                "patients_count": bad_count
            })
            self.assertEqual(res.status_code, 400, f"Expected 400 for patients_count: {bad_count}, got {res.status_code}")
            data = res.get_json()
            self.assertFalse(data['success'])
            self.assertIn("patients count", data['message'].lower())

    def test_17_out_of_range_patients_count_rejected(self):
        """Patients count outside range 1-10 is rejected with HTTP 400."""
        out_of_bounds = [0, -1, -5, 11, 20, 100]
        for count in out_of_bounds:
            res = self.client.post("/api/ambulance-requests", json={
                "patient_name": "Range Test Patient",
                "phone": "+91 98000 77777",
                "pickup_location": "Bandra West, Mumbai",
                "patients_count": count
            })
            self.assertEqual(res.status_code, 400, f"Expected 400 for patients_count: {count}, got {res.status_code}")
            self.assertFalse(res.get_json()['success'])

        # Valid count boundary 1 and 10 succeeds
        res_ok = self.client.post("/api/ambulance-requests", json={
            "patient_name": "Boundary Patient",
            "phone": "+91 98000 77777",
            "pickup_location": "Bandra West, Mumbai",
            "patients_count": 10
        })
        self.assertEqual(res_ok.status_code, 201)

    def test_18_string_length_boundaries_enforced(self):
        """Enforces schema boundaries on patient_name, pickup_location, hospital, emergency_type, additional_info, and idempotency_key."""
        base_payload = {
            "patient_name": "Valid Patient",
            "phone": "+91 98000 77777",
            "pickup_location": "Valid Address 123",
            "destination_hospital": "Apollo Hospital",
            "emergency_type": "Critical",
            "patients_count": 1
        }

        # patient_name min length 2
        p1 = dict(base_payload, patient_name="A")
        res = self.client.post("/api/ambulance-requests", json=p1)
        self.assertEqual(res.status_code, 400)
        self.assertIn("patient name", res.get_json()['message'].lower())

        # patient_name max length 100
        p2 = dict(base_payload, patient_name="N" * 101)
        res = self.client.post("/api/ambulance-requests", json=p2)
        self.assertEqual(res.status_code, 400)
        self.assertIn("patient name", res.get_json()['message'].lower())

        # pickup_location min length 5
        p3 = dict(base_payload, pickup_location="123")
        res = self.client.post("/api/ambulance-requests", json=p3)
        self.assertEqual(res.status_code, 400)
        self.assertIn("pickup location", res.get_json()['message'].lower())

        # pickup_location max length 255
        p4 = dict(base_payload, pickup_location="L" * 256)
        res = self.client.post("/api/ambulance-requests", json=p4)
        self.assertEqual(res.status_code, 400)
        self.assertIn("pickup location", res.get_json()['message'].lower())

        # destination_hospital max length 150
        p5 = dict(base_payload, destination_hospital="H" * 151)
        res = self.client.post("/api/ambulance-requests", json=p5)
        self.assertEqual(res.status_code, 400)
        self.assertIn("destination hospital", res.get_json()['message'].lower())

        # emergency_type max length 100
        p6 = dict(base_payload, emergency_type="E" * 101)
        res = self.client.post("/api/ambulance-requests", json=p6)
        self.assertEqual(res.status_code, 400)
        self.assertIn("emergency type", res.get_json()['message'].lower())

        # additional_info max length 1000
        p7 = dict(base_payload, additional_info="A" * 1001)
        res = self.client.post("/api/ambulance-requests", json=p7)
        self.assertEqual(res.status_code, 400)
        self.assertIn("additional information", res.get_json()['message'].lower())

        # idempotency_key max length 64
        res = self.client.post("/api/ambulance-requests", json=base_payload, headers={"Idempotency-Key": "K" * 65})
        self.assertEqual(res.status_code, 400)
        self.assertIn("idempotency-key", res.get_json()['message'].lower())

    def test_19_same_idempotency_key_replay_returns_original_request(self):
        """Sending the same Idempotency-Key with identical payload replays original response without duplicate dispatch."""
        with self.app.app_context():
            amb = Ambulance(
                vehicle_number="MH01-IDEM-01",
                driver_name="Idem Driver",
                driver_phone="+91 98000 88888",
                current_location="Dadar",
                status="Available"
            )
            db.session.add(amb)
            db.session.commit()
            amb_id = amb.id

        payload = {
            "patient_name": "Idempotent Patient",
            "phone": "+91 98765 11111",
            "emergency_type": "Chest Pain",
            "pickup_location": "Gate 2, Dadar Station, Mumbai",
            "destination_hospital": "KEM Hospital",
            "patients_count": 1
        }
        headers = {"Idempotency-Key": "idem-uuid-001"}

        # 1. Initial Request
        res1 = self.client.post("/api/ambulance-requests", json=payload, headers=headers)
        self.assertEqual(res1.status_code, 201)
        data1 = res1.get_json()
        self.assertTrue(data1['success'])
        req_id1 = data1['request']['id']
        self.assertEqual(data1['request']['status'], 'Dispatched')
        self.assertEqual(data1['request']['assigned_ambulance_id'], amb_id)
        self.assertNotIn('idempotency_key', data1['request'], "idempotency_key must be absent from initial response JSON")

        # 2. Replay with identical payload & key
        res2 = self.client.post("/api/ambulance-requests", json=payload, headers=headers)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.headers.get('Idempotent-Replay'), 'true')
        data2 = res2.get_json()
        self.assertTrue(data2['success'])
        self.assertEqual(data2['request']['id'], req_id1)
        self.assertEqual(data2['request']['assigned_ambulance_id'], amb_id)
        self.assertNotIn('idempotency_key', data2['request'], "idempotency_key must be absent from replay response JSON")

        # Verify database has strictly 1 record
        with self.app.app_context():
            total_requests = AmbulanceRequest.query.filter_by(idempotency_key="idem-uuid-001").count()
            self.assertEqual(total_requests, 1, "Only 1 database record must exist for this key")

            amb_db = db.session.get(Ambulance, amb_id)
            self.assertEqual(amb_db.status, 'On Duty')

    def test_20_same_idempotency_key_different_payload_returns_409_conflict(self):
        """Reusing the same Idempotency-Key with a different payload returns HTTP 409 Conflict."""
        headers = {"Idempotency-Key": "conflict-test-key-002"}
        payload_a = {
            "patient_name": "Patient Alpha",
            "phone": "+91 98000 12345",
            "emergency_type": "Accident",
            "pickup_location": "Highway 1, Mumbai",
            "destination_hospital": "Cooper Hospital"
        }
        res1 = self.client.post("/api/ambulance-requests", json=payload_a, headers=headers)
        self.assertEqual(res1.status_code, 201)

        payload_b = {
            "patient_name": "Patient Beta", # Different patient name
            "phone": "+91 98000 12345",
            "emergency_type": "Accident",
            "pickup_location": "Highway 1, Mumbai",
            "destination_hospital": "Cooper Hospital"
        }
        res2 = self.client.post("/api/ambulance-requests", json=payload_b, headers=headers)
        self.assertEqual(res2.status_code, 409)
        data = res2.get_json()
        self.assertFalse(data['success'])
        self.assertIn("different emergency request payload", data['message'])

    def test_21_different_idempotency_keys_create_independent_requests(self):
        """Distinct Idempotency-Keys create independent requests."""
        payload = {
            "patient_name": "Legitimate Emergency",
            "phone": "+91 98000 55555",
            "emergency_type": "Severe Trauma",
            "pickup_location": "Marine Lines, Mumbai",
            "destination_hospital": "Saifee Hospital"
        }
        res1 = self.client.post("/api/ambulance-requests", json=payload, headers={"Idempotency-Key": "key-alpha-1"})
        res2 = self.client.post("/api/ambulance-requests", json=payload, headers={"Idempotency-Key": "key-beta-2"})

        self.assertEqual(res1.status_code, 201)
        self.assertEqual(res2.status_code, 201)
        self.assertNotEqual(res1.get_json()['request']['id'], res2.get_json()['request']['id'])

    def test_22_same_key_concurrent_submission_safe_single_dispatch(self):
        """Simultaneous concurrent requests with identical Idempotency-Key dispatch strictly 1 ambulance."""
        with self.app.app_context():
            amb = Ambulance(
                vehicle_number="MH01-CONC-99",
                driver_name="Race Driver",
                driver_phone="+91 98000 99999",
                current_location="Andheri East",
                status="Available"
            )
            db.session.add(amb)
            db.session.commit()
            amb_id = amb.id

        barrier = threading.Barrier(10)
        results = []
        errors = []

        def submit_idempotent_worker(idx):
            try:
                barrier.wait(timeout=10)
            except Exception as e:
                errors.append(e)
                return
            with self.app.app_context():
                client = self.app.test_client()
                try:
                    res = client.post("/api/ambulance-requests", json={
                        "patient_name": "Concurrent Patient",
                        "phone": "+91 98222 33333",
                        "emergency_type": "Cardiac Arrest",
                        "pickup_location": "Terminal 2, Mumbai Airport",
                        "destination_hospital": "Nanavati Hospital",
                        "patients_count": 1
                    }, headers={"Idempotency-Key": "concurrent-idem-key-888"})
                    results.append((res.status_code, res.get_json()))
                except Exception as e:
                    errors.append(e)

        threads = [threading.Thread(target=submit_idempotent_worker, args=(i,)) for i in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0, f"Thread errors: {errors}")
        self.assertEqual(len(results), 10)

        created_count = sum(1 for status_code, _ in results if status_code == 201)
        replay_count = sum(1 for status_code, _ in results if status_code == 200)

        # Exactly 1 thread created the request, remaining 9 were served idempotent replays
        self.assertEqual(created_count, 1, "Exactly 1 concurrent request should be 201 Created")
        self.assertEqual(replay_count, 9, "Remaining 9 concurrent requests should be 200 Replays")

        # All 10 returned the same request ID
        all_ids = set(data['request']['id'] for _, data in results)
        self.assertEqual(len(all_ids), 1, "All concurrent requests must return the identical request ID")

        # In DB: strictly 1 request
        with self.app.app_context():
            total = AmbulanceRequest.query.filter_by(idempotency_key="concurrent-idem-key-888").count()
            self.assertEqual(total, 1)

    def test_23_migration_004_upgrade_and_downgrade_lifecycle(self):
        """Tests migration 004 upgrade, downgrade, and re-entrant upgrade lifecycle in scratch database."""
        scratch_dir = tempfile.mkdtemp()
        scratch_db_path = os.path.join(scratch_dir, "mig004_lifecycle.db")
        scratch_url = f"sqlite:///{scratch_db_path}"

        from sqlalchemy import create_engine
        engine = create_engine(scratch_url)

        with engine.connect() as conn:
            # Create base table WITHOUT idempotency_key
            conn.execute(text("""
                CREATE TABLE ambulance_requests (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    patient_name VARCHAR(100) NOT NULL,
                    phone VARCHAR(30) NOT NULL,
                    emergency_type VARCHAR(100) NOT NULL,
                    pickup_location VARCHAR(255) NOT NULL,
                    destination_hospital VARCHAR(150) NOT NULL,
                    patients_count INTEGER DEFAULT 1,
                    additional_info TEXT,
                    status VARCHAR(30) DEFAULT 'Pending',
                    assigned_ambulance_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()

            # 1. Upgrade
            self.assertFalse(check_is_applied_004(conn))
            mig004_upgrade(conn)
            self.assertTrue(check_is_applied_004(conn))

            # Verify column exists
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info(ambulance_requests)")).fetchall()]
            self.assertIn("idempotency_key", cols)

            # Verify unique index exists
            idx = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_ambulance_requests_idempotency_key'")).fetchone()
            self.assertIsNotNone(idx)

            # 2. Downgrade
            mig004_downgrade(conn)
            self.assertFalse(check_is_applied_004(conn))

            # Verify index dropped
            idx_after = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_ambulance_requests_idempotency_key'")).fetchone()
            self.assertIsNone(idx_after)

            # 3. Re-upgrade (re-entrancy check)
            mig004_upgrade(conn)
            self.assertTrue(check_is_applied_004(conn))

        try:
            os.remove(scratch_db_path)
            os.rmdir(scratch_dir)
        except Exception:
            pass

    def test_24_migration_004_fails_closed_on_duplicate_existing_keys(self):
        """Migration 004 fails closed if existing table has duplicate non-null idempotency_keys."""
        scratch_dir = tempfile.mkdtemp()
        scratch_db_path = os.path.join(scratch_dir, "mig004_dupe.db")
        scratch_url = f"sqlite:///{scratch_db_path}"

        from sqlalchemy import create_engine
        engine = create_engine(scratch_url)

        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE ambulance_requests (
                    id INTEGER PRIMARY KEY,
                    idempotency_key VARCHAR(64),
                    patient_name VARCHAR(100) NOT NULL,
                    phone VARCHAR(30) NOT NULL,
                    emergency_type VARCHAR(100) NOT NULL,
                    pickup_location VARCHAR(255) NOT NULL,
                    destination_hospital VARCHAR(150) NOT NULL
                )
            """))
            # Insert duplicate keys
            conn.execute(text("INSERT INTO ambulance_requests (idempotency_key, patient_name, phone, emergency_type, pickup_location, destination_hospital) VALUES ('DUPE-01', 'P1', '1234567', 'Heart', 'L1', 'H1')"))
            conn.execute(text("INSERT INTO ambulance_requests (idempotency_key, patient_name, phone, emergency_type, pickup_location, destination_hospital) VALUES ('DUPE-01', 'P2', '7654321', 'Trauma', 'L2', 'H2')"))
            conn.commit()

            with self.assertRaises(MigrationPreconditionError004) as cm:
                mig004_upgrade(conn)

            self.assertIn("duplicate idempotency_key values", str(cm.exception))

            # Verify unique index was NOT created
            idx = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_ambulance_requests_idempotency_key'")).fetchone()
            self.assertIsNone(idx)

        try:
            os.remove(scratch_db_path)
            os.rmdir(scratch_dir)
        except Exception:
            pass

    def test_25_migration_004_interrupted_upgrade_recovery(self):
        """Migration 004 safely recovers from an interrupted upgrade where objects exist with provenance CREATING."""
        scratch_dir = tempfile.mkdtemp()
        scratch_db_path = os.path.join(scratch_dir, "mig004_recovery.db")
        scratch_url = f"sqlite:///{scratch_db_path}"

        from sqlalchemy import create_engine
        engine = create_engine(scratch_url)

        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE ambulance_requests (
                    id INTEGER PRIMARY KEY,
                    idempotency_key VARCHAR(64),
                    patient_name VARCHAR(100) NOT NULL,
                    phone VARCHAR(30) NOT NULL,
                    emergency_type VARCHAR(100) NOT NULL,
                    pickup_location VARCHAR(255) NOT NULL,
                    destination_hospital VARCHAR(150) NOT NULL
                )
            """))
            conn.execute(text("""
                CREATE UNIQUE INDEX uq_ambulance_requests_idempotency_key
                ON ambulance_requests (idempotency_key)
            """))

            # Simulate interrupted state: provenance recorded as CREATING
            migration_004.ensure_ownership_table(conn)
            migration_004.record_object_provenance(conn, migration_004.MIGRATION_VERSION, 'column', 'ambulance_requests', 'idempotency_key', 'CREATING')
            migration_004.record_object_provenance(conn, migration_004.MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_ambulance_requests_idempotency_key', 'CREATING')
            conn.commit()

            # Run upgrade: must detect and promote to CREATED
            mig004_upgrade(conn)
            self.assertTrue(check_is_applied_004(conn))

            col_prov = migration_004.get_object_provenance(conn, migration_004.MIGRATION_VERSION, 'column', 'ambulance_requests', 'idempotency_key')
            idx_prov = migration_004.get_object_provenance(conn, migration_004.MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_ambulance_requests_idempotency_key')
            self.assertEqual(col_prov, 'CREATED')
            self.assertEqual(idx_prov, 'CREATED')

            # Downgrade must safely drop them
            mig004_downgrade(conn)
            self.assertFalse(check_is_applied_004(conn))

        try:
            os.remove(scratch_db_path)
            os.rmdir(scratch_dir)
        except Exception:
            pass

    def test_26_idempotency_key_never_exposed_in_any_api_response(self):
        """Idempotency key must never be exposed in any ambulance API response JSON (create, replay, list)."""
        from utils.auth_middleware import generate_token

        with self.app.app_context():
            amb = Ambulance(
                vehicle_number="MH01-PRIV-01",
                driver_name="Privacy Tester",
                driver_phone="+91 98000 54321",
                current_location="Nariman Point",
                status="Available"
            )
            db.session.add(amb)

            user = User(
                name="Privacy Patient",
                email="privacy.patient@example.com",
                phone="+91 98000 12345",
                role="USER"
            )
            user.set_password("SecurePass123!")
            db.session.add(user)
            db.session.commit()
            token = generate_token(user)

        auth_headers = {
            'Authorization': f'Bearer {token}',
            'Idempotency-Key': 'secret-client-token-99999'
        }

        # 1. Create Request
        res_create = self.client.post("/api/ambulance-requests", json={
            "patient_name": "Privacy Patient",
            "phone": "+91 98000 12345",
            "emergency_type": "Severe Allergic Reaction",
            "pickup_location": "Gate 1, Nariman Point, Mumbai",
            "destination_hospital": "Bombay Hospital",
            "patients_count": 1
        }, headers=auth_headers)
        self.assertEqual(res_create.status_code, 201)
        create_data = res_create.get_json()['request']
        self.assertNotIn('idempotency_key', create_data, "idempotency_key must be absent from POST /api/ambulance-requests response")

        # 2. Replay Request
        res_replay = self.client.post("/api/ambulance-requests", json={
            "patient_name": "Privacy Patient",
            "phone": "+91 98000 12345",
            "emergency_type": "Severe Allergic Reaction",
            "pickup_location": "Gate 1, Nariman Point, Mumbai",
            "destination_hospital": "Bombay Hospital",
            "patients_count": 1
        }, headers=auth_headers)
        self.assertEqual(res_replay.status_code, 200)
        replay_data = res_replay.get_json()['request']
        self.assertNotIn('idempotency_key', replay_data, "idempotency_key must be absent from replay response")

        # 3. List Requests
        res_list = self.client.get("/api/ambulance-requests", headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(res_list.status_code, 200)
        list_data = res_list.get_json()['requests']
        self.assertGreaterEqual(len(list_data), 1)
        for item in list_data:
            self.assertNotIn('idempotency_key', item, "idempotency_key must be absent from GET /api/ambulance-requests response")

        # 4. Verify the key IS persisted and accessible internally on the model
        with self.app.app_context():
            req_db = AmbulanceRequest.query.filter_by(patient_name="Privacy Patient").first()
            self.assertEqual(req_db.idempotency_key, 'secret-client-token-99999')

    # ---------------------------------------------------------
    # Part 2B: Dispatch State Machine & Fleet Reliability Tests
    # ---------------------------------------------------------
    def _create_test_user(self, role="USER", email=None):
        if not email:
            email = f"user_{uuid.uuid4().hex[:8]}@example.com"
        with self.app.app_context():
            u = User(
                name="Test User",
                email=email,
                phone="+91 98000 77777",
                role=role
            )
            u.set_password("Password123!")
            db.session.add(u)
            db.session.commit()
            from utils.auth_middleware import generate_token
            token = generate_token(u)
            return u.id, token

    def test_27_valid_complete_lifecycle(self):
        """Valid complete lifecycle: Pending -> Dispatched -> Arrived -> Completed with fleet updates."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            amb = Ambulance(
                vehicle_number="MH01-LIFE-27",
                driver_name="Lifecycle Driver",
                driver_phone="+91 98000 11127",
                current_location="Andheri East",
                status="Available"
            )
            db.session.add(amb)
            req = AmbulanceRequest(
                patient_name="Lifecycle Patient",
                phone="+91 98000 22227",
                emergency_type="Trauma",
                pickup_location="Andheri East, Mumbai",
                destination_hospital="Kokilaben Hospital",
                status="Pending",
                assigned_ambulance_id=None
            )
            db.session.add(req)
            db.session.commit()
            amb_id = amb.id
            req_id = req.id

        # 1. Pending -> Dispatched (assigning amb)
        res1 = self.client.put(f"/api/ambulance-requests/{req_id}", json={
            "status": "Dispatched",
            "assigned_ambulance_id": amb_id
        }, headers=admin_headers)
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.get_json()['request']['status'], 'Dispatched')
        with self.app.app_context():
            amb_db = db.session.get(Ambulance, amb_id)
            self.assertEqual(amb_db.status, 'On Duty')

        # 2. Dispatched -> Arrived
        res2 = self.client.put(f"/api/ambulance-requests/{req_id}", json={
            "status": "Arrived"
        }, headers=admin_headers)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.get_json()['request']['status'], 'Arrived')
        with self.app.app_context():
            amb_db = db.session.get(Ambulance, amb_id)
            self.assertEqual(amb_db.status, 'On Duty')

        # 3. Arrived -> Completed (releases ambulance)
        res3 = self.client.put(f"/api/ambulance-requests/{req_id}", json={
            "status": "Completed"
        }, headers=admin_headers)
        self.assertEqual(res3.status_code, 200)
        self.assertEqual(res3.get_json()['request']['status'], 'Completed')
        with self.app.app_context():
            amb_db = db.session.get(Ambulance, amb_id)
            self.assertEqual(amb_db.status, 'Available')

    def test_28_completed_terminal_state_immutability(self):
        """Completed is an immutable terminal state; all mutations must be rejected with 400."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            amb = Ambulance(vehicle_number="MH01-COMP-28", driver_name="D28", driver_phone="+91 98000 00028", current_location="Colaba", status="Available")
            db.session.add(amb)
            db.session.flush()
            req = AmbulanceRequest(
                patient_name="Completed Patient",
                phone="+91 98000 00028",
                emergency_type="Fracture",
                pickup_location="Colaba Post Office",
                destination_hospital="GT Hospital",
                status="Completed",
                assigned_ambulance_id=amb.id
            )
            db.session.add(req)
            db.session.commit()
            req_id = req.id

        for target in ["Pending", "Dispatched", "Arrived", "Cancelled"]:
            res = self.client.put(f"/api/ambulance-requests/{req_id}", json={"status": target}, headers=admin_headers)
            self.assertEqual(res.status_code, 400, f"Expected 400 when mutating Completed to {target}")

        with self.app.app_context():
            req_db = db.session.get(AmbulanceRequest, req_id)
            self.assertEqual(req_db.status, "Completed")

    def test_29_cancelled_terminal_state_immutability(self):
        """Cancelled is an immutable terminal state; all mutations must be rejected with 400."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            req = AmbulanceRequest(
                patient_name="Cancelled Patient",
                phone="+91 98000 00029",
                emergency_type="Fever",
                pickup_location="Dadar Market",
                destination_hospital="KEM Hospital",
                status="Cancelled",
                assigned_ambulance_id=None
            )
            db.session.add(req)
            db.session.commit()
            req_id = req.id

        for target in ["Pending", "Dispatched", "Arrived", "Completed"]:
            res = self.client.put(f"/api/ambulance-requests/{req_id}", json={"status": target}, headers=admin_headers)
            self.assertEqual(res.status_code, 400, f"Expected 400 when mutating Cancelled to {target}")

        with self.app.app_context():
            req_db = db.session.get(AmbulanceRequest, req_id)
            self.assertEqual(req_db.status, "Cancelled")

    def test_30_invalid_skip_pending_to_completed_rejected(self):
        """Skipping states: Pending directly to Completed is rejected with 400."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            req = AmbulanceRequest(
                patient_name="Skip Patient",
                phone="+91 98000 00030",
                emergency_type="Chest Pain",
                pickup_location="Worli Sea Face",
                destination_hospital="Podar Hospital",
                status="Pending"
            )
            db.session.add(req)
            db.session.commit()
            req_id = req.id

        res = self.client.put(f"/api/ambulance-requests/{req_id}", json={"status": "Completed"}, headers=admin_headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cannot transition request", res.get_json()['message'])

    def test_31_invalid_skip_pending_to_arrived_rejected(self):
        """Skipping states: Pending directly to Arrived is rejected with 400."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            req = AmbulanceRequest(
                patient_name="Skip Arrived Patient",
                phone="+91 98000 00031",
                emergency_type="Severe Fall",
                pickup_location="Bandra West",
                destination_hospital="Lilavati Hospital",
                status="Pending"
            )
            db.session.add(req)
            db.session.commit()
            req_id = req.id

        res = self.client.put(f"/api/ambulance-requests/{req_id}", json={"status": "Arrived"}, headers=admin_headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cannot transition request", res.get_json()['message'])

    def test_32_invalid_transition_arrived_to_pending_rejected(self):
        """Invalid backward transition: Arrived directly to Pending is rejected with 400."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            amb = Ambulance(vehicle_number="MH01-ARR-32", driver_name="D32", driver_phone="+91 98000 00032", current_location="Bandra", status="On Duty")
            db.session.add(amb)
            db.session.flush()
            req = AmbulanceRequest(
                patient_name="Arrived Patient",
                phone="+91 98000 00032",
                emergency_type="Burn Injury",
                pickup_location="Bandra Kurla Complex",
                destination_hospital="Asian Heart Institute",
                status="Arrived",
                assigned_ambulance_id=amb.id
            )
            db.session.add(req)
            db.session.commit()
            req_id = req.id

        res = self.client.put(f"/api/ambulance-requests/{req_id}", json={"status": "Pending"}, headers=admin_headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cannot", res.get_json()['message'])

    def test_33_invalid_skip_dispatched_to_completed_rejected(self):
        """Skipping states: Dispatched directly to Completed (skipping Arrived) is rejected with 400."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            amb = Ambulance(vehicle_number="MH01-DISP-33", driver_name="D33", driver_phone="+91 98000 00033", current_location="Juhu", status="On Duty")
            db.session.add(amb)
            db.session.flush()
            req = AmbulanceRequest(
                patient_name="Dispatched Patient",
                phone="+91 98000 00033",
                emergency_type="Stroke",
                pickup_location="Juhu Beach",
                destination_hospital="Cooper Hospital",
                status="Dispatched",
                assigned_ambulance_id=amb.id
            )
            db.session.add(req)
            db.session.commit()
            req_id = req.id

        res = self.client.put(f"/api/ambulance-requests/{req_id}", json={"status": "Completed"}, headers=admin_headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cannot transition request", res.get_json()['message'])

    def test_34_safe_reassignment_releases_old_ambulance(self):
        """Reassigning ambulance A to B releases A to Available and sets B to On Duty."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            amb_a = Ambulance(vehicle_number="MH01-AMB-34A", driver_name="Driver A", driver_phone="+91 98000 00341", current_location="Dadar", status="On Duty")
            amb_b = Ambulance(vehicle_number="MH01-AMB-34B", driver_name="Driver B", driver_phone="+91 98000 00342", current_location="Dadar", status="Available")
            db.session.add_all([amb_a, amb_b])
            db.session.flush()
            req = AmbulanceRequest(
                patient_name="Reassign Patient",
                phone="+91 98000 00034",
                emergency_type="Cardiac Arrest",
                pickup_location="Dadar TT Circle",
                destination_hospital="Hinduja Hospital",
                status="Dispatched",
                assigned_ambulance_id=amb_a.id
            )
            db.session.add(req)
            db.session.commit()
            amb_a_id = amb_a.id
            amb_b_id = amb_b.id
            req_id = req.id

        res = self.client.put(f"/api/ambulance-requests/{req_id}", json={
            "assigned_ambulance_id": amb_b_id
        }, headers=admin_headers)
        self.assertEqual(res.status_code, 200)

        with self.app.app_context():
            req_db = db.session.get(AmbulanceRequest, req_id)
            amb_a_db = db.session.get(Ambulance, amb_a_id)
            amb_b_db = db.session.get(Ambulance, amb_b_id)

            self.assertEqual(req_db.assigned_ambulance_id, amb_b_id)
            self.assertEqual(amb_a_db.status, 'Available', "Old ambulance must be released to Available")
            self.assertEqual(amb_b_db.status, 'On Duty', "New ambulance must be On Duty")

    def test_35_reassignment_to_maintenance_ambulance_rejected(self):
        """Assigning an ambulance currently under Maintenance must be rejected with 400."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            amb_maint = Ambulance(vehicle_number="MH01-MAINT-35", driver_name="Maintenance Driver", driver_phone="+91 98000 00035", current_location="Workshop", status="Maintenance")
            db.session.add(amb_maint)
            req = AmbulanceRequest(
                patient_name="Maint Test Patient",
                phone="+91 98000 00035",
                emergency_type="Respiratory",
                pickup_location="Kurla West",
                destination_hospital="Bhabha Hospital",
                status="Pending"
            )
            db.session.add(req)
            db.session.commit()
            maint_id = amb_maint.id
            req_id = req.id

        res = self.client.put(f"/api/ambulance-requests/{req_id}", json={
            "assigned_ambulance_id": maint_id
        }, headers=admin_headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Maintenance", res.get_json()['message'])

        with self.app.app_context():
            amb_db = db.session.get(Ambulance, maint_id)
            self.assertEqual(amb_db.status, 'Maintenance', "Maintenance status must not be modified")

    def test_36_reassignment_to_busy_ambulance_rejected_409(self):
        """Assigning an ambulance that is already serving another active request must return 409 Conflict."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            amb_busy = Ambulance(vehicle_number="MH01-BUSY-36", driver_name="Busy Driver", driver_phone="+91 98000 00036", current_location="Sion", status="On Duty")
            db.session.add(amb_busy)
            db.session.flush()
            req1 = AmbulanceRequest(
                patient_name="Active Patient 1",
                phone="+91 98000 00361",
                emergency_type="Stroke",
                pickup_location="Sion Circle",
                destination_hospital="Sion Hospital",
                status="Dispatched",
                assigned_ambulance_id=amb_busy.id
            )
            req2 = AmbulanceRequest(
                patient_name="Active Patient 2",
                phone="+91 98000 00362",
                emergency_type="Allergy",
                pickup_location="Matunga",
                destination_hospital="Sion Hospital",
                status="Pending",
                assigned_ambulance_id=None
            )
            db.session.add_all([req1, req2])
            db.session.commit()
            busy_amb_id = amb_busy.id
            req2_id = req2.id

        res = self.client.put(f"/api/ambulance-requests/{req2_id}", json={
            "assigned_ambulance_id": busy_amb_id
        }, headers=admin_headers)
        self.assertEqual(res.status_code, 409)
        self.assertIn("already serving another active request", res.get_json()['message'])

    def test_37_assignment_to_nonexistent_ambulance_rejected_404(self):
        """Assigning a non-existent ambulance ID returns 404."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            req = AmbulanceRequest(
                patient_name="Nonexistent Amb Patient",
                phone="+91 98000 00037",
                emergency_type="Asthma",
                pickup_location="Goregaon East",
                destination_hospital="Lifeline Hospital",
                status="Pending"
            )
            db.session.add(req)
            db.session.commit()
            req_id = req.id

        res = self.client.put(f"/api/ambulance-requests/{req_id}", json={
            "assigned_ambulance_id": 999999
        }, headers=admin_headers)
        self.assertEqual(res.status_code, 404)

    def test_38_admin_unassignment_dispatched_to_pending(self):
        """Admin unassignment clears assigned_ambulance_id, resets status to Pending, and frees vehicle."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            amb = Ambulance(vehicle_number="MH01-UNASSIGN-38", driver_name="D38", driver_phone="+91 98000 00038", current_location="Chembur", status="On Duty")
            db.session.add(amb)
            db.session.flush()
            req = AmbulanceRequest(
                patient_name="Unassign Patient",
                phone="+91 98000 00038",
                emergency_type="Fracture",
                pickup_location="Chembur Naka",
                destination_hospital="Surana Hospital",
                status="Dispatched",
                assigned_ambulance_id=amb.id
            )
            db.session.add(req)
            db.session.commit()
            amb_id = amb.id
            req_id = req.id

        res = self.client.put(f"/api/ambulance-requests/{req_id}", json={
            "status": "Pending",
            "assigned_ambulance_id": None
        }, headers=admin_headers)
        self.assertEqual(res.status_code, 200)

        with self.app.app_context():
            req_db = db.session.get(AmbulanceRequest, req_id)
            amb_db = db.session.get(Ambulance, amb_id)

            self.assertEqual(req_db.status, 'Pending')
            self.assertIsNone(req_db.assigned_ambulance_id)
            self.assertEqual(amb_db.status, 'Available')

    def test_39_unassignment_rejected_for_arrived_request(self):
        """Attempting to unassign an ambulance from an Arrived request is rejected with 400."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            amb = Ambulance(vehicle_number="MH01-ARR-39", driver_name="D39", driver_phone="+91 98000 00039", current_location="Vashi", status="On Duty")
            db.session.add(amb)
            db.session.flush()
            req = AmbulanceRequest(
                patient_name="Arrived Unassign",
                phone="+91 98000 00039",
                emergency_type="Chest Pain",
                pickup_location="Vashi Plaza",
                destination_hospital="Fortis Hospital",
                status="Arrived",
                assigned_ambulance_id=amb.id
            )
            db.session.add(req)
            db.session.commit()
            req_id = req.id

        res = self.client.put(f"/api/ambulance-requests/{req_id}", json={
            "assigned_ambulance_id": None
        }, headers=admin_headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cannot unassign", res.get_json()['message'])

    def test_40_patient_cancels_own_pending_request(self):
        """Authenticated patient cancels their own Pending request via dedicated POST /cancel."""
        patient_id, patient_token = self._create_test_user(role="USER")
        patient_headers = {'Authorization': f'Bearer {patient_token}'}

        with self.app.app_context():
            req = AmbulanceRequest(
                user_id=patient_id,
                patient_name="Patient Self Cancel",
                phone="+91 98000 00040",
                emergency_type="Minor Burn",
                pickup_location="Powai Lake",
                destination_hospital="Hiranandani Hospital",
                status="Pending"
            )
            db.session.add(req)
            db.session.commit()
            req_id = req.id

        res = self.client.post(f"/api/ambulance-requests/{req_id}/cancel", headers=patient_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['request']['status'], 'Cancelled')

        with self.app.app_context():
            req_db = db.session.get(AmbulanceRequest, req_id)
            self.assertEqual(req_db.status, 'Cancelled')

    def test_41_patient_cancels_own_dispatched_request_releases_vehicle(self):
        """Patient cancels own Dispatched request; assigned vehicle is safely released to Available."""
        patient_id, patient_token = self._create_test_user(role="USER")
        patient_headers = {'Authorization': f'Bearer {patient_token}'}

        with self.app.app_context():
            amb = Ambulance(vehicle_number="MH01-REL-41", driver_name="D41", driver_phone="+91 98000 00041", current_location="Thane", status="On Duty")
            db.session.add(amb)
            db.session.flush()
            req = AmbulanceRequest(
                user_id=patient_id,
                patient_name="Patient Dispatched Cancel",
                phone="+91 98000 00041",
                emergency_type="Sprain",
                pickup_location="Thane West",
                destination_hospital="Jupiter Hospital",
                status="Dispatched",
                assigned_ambulance_id=amb.id
            )
            db.session.add(req)
            db.session.commit()
            amb_id = amb.id
            req_id = req.id

        res = self.client.post(f"/api/ambulance-requests/{req_id}/cancel", headers=patient_headers)
        self.assertEqual(res.status_code, 200)

        with self.app.app_context():
            req_db = db.session.get(AmbulanceRequest, req_id)
            amb_db = db.session.get(Ambulance, amb_id)

            self.assertEqual(req_db.status, 'Cancelled')
            self.assertEqual(amb_db.status, 'Available', "Assigned vehicle must be safely released to Available")

    def test_42_patient_blocked_cancelling_other_patients_request_403(self):
        """Patient attempting to cancel another patient's emergency request is blocked with 403."""
        patient1_id, patient1_token = self._create_test_user(role="USER")
        patient2_id, patient2_token = self._create_test_user(role="USER")
        patient2_headers = {'Authorization': f'Bearer {patient2_token}'}

        with self.app.app_context():
            req = AmbulanceRequest(
                user_id=patient1_id,
                patient_name="Patient 1",
                phone="+91 98000 00042",
                emergency_type="Breathing Issue",
                pickup_location="Malad West",
                destination_hospital="Apex Hospital",
                status="Pending"
            )
            db.session.add(req)
            db.session.commit()
            req_id = req.id

        # Patient 2 tries to cancel Patient 1's request
        res = self.client.post(f"/api/ambulance-requests/{req_id}/cancel", headers=patient2_headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn("not authorized", res.get_json()['message'])

        with self.app.app_context():
            req_db = db.session.get(AmbulanceRequest, req_id)
            self.assertEqual(req_db.status, 'Pending', "Request status must not be modified by unauthorized user")

    def test_43_patient_blocked_from_put_mutation_403(self):
        """Regular patient is blocked from invoking admin PUT endpoint with 403."""
        patient_id, patient_token = self._create_test_user(role="USER")
        patient_headers = {'Authorization': f'Bearer {patient_token}'}

        with self.app.app_context():
            req = AmbulanceRequest(
                user_id=patient_id,
                patient_name="Patient Put Test",
                phone="+91 98000 00043",
                emergency_type="Cardiac",
                pickup_location="Mulund West",
                destination_hospital="Fortis Hospital",
                status="Pending"
            )
            db.session.add(req)
            db.session.commit()
            req_id = req.id

        res = self.client.put(f"/api/ambulance-requests/{req_id}", json={
            "status": "Completed"
        }, headers=patient_headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn("Administrator privileges required", res.get_json()['message'])

    def test_44_patient_blocked_cancelling_arrived_request_400(self):
        """Patient cannot cancel request once ambulance has arrived on scene (returns 400)."""
        patient_id, patient_token = self._create_test_user(role="USER")
        patient_headers = {'Authorization': f'Bearer {patient_token}'}

        with self.app.app_context():
            amb = Ambulance(vehicle_number="MH01-ARR-44", driver_name="D44", driver_phone="+91 98000 00044", current_location="Kandivali", status="On Duty")
            db.session.add(amb)
            db.session.flush()
            req = AmbulanceRequest(
                user_id=patient_id,
                patient_name="Patient Arrived Scene",
                phone="+91 98000 00044",
                emergency_type="Stroke",
                pickup_location="Kandivali West",
                destination_hospital="Shatabdi Hospital",
                status="Arrived",
                assigned_ambulance_id=amb.id
            )
            db.session.add(req)
            db.session.commit()
            req_id = req.id

        res = self.client.post(f"/api/ambulance-requests/{req_id}/cancel", headers=patient_headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("arrived on scene", res.get_json()['message'])

    def test_45_patient_blocked_cancelling_terminal_request_400(self):
        """Patient cannot cancel already Completed or Cancelled request (returns 400)."""
        patient_id, patient_token = self._create_test_user(role="USER")
        patient_headers = {'Authorization': f'Bearer {patient_token}'}

        with self.app.app_context():
            req_comp = AmbulanceRequest(
                user_id=patient_id,
                patient_name="Patient Completed",
                phone="+91 98000 00045",
                emergency_type="Fracture",
                pickup_location="Borivali West",
                destination_hospital="Karuna Hospital",
                status="Completed"
            )
            req_canc = AmbulanceRequest(
                user_id=patient_id,
                patient_name="Patient Cancelled",
                phone="+91 98000 00046",
                emergency_type="Allergy",
                pickup_location="Borivali East",
                destination_hospital="Karuna Hospital",
                status="Cancelled"
            )
            db.session.add_all([req_comp, req_canc])
            db.session.commit()
            comp_id = req_comp.id
            canc_id = req_canc.id

        res_comp = self.client.post(f"/api/ambulance-requests/{comp_id}/cancel", headers=patient_headers)
        self.assertEqual(res_comp.status_code, 400)

        res_canc = self.client.post(f"/api/ambulance-requests/{canc_id}/cancel", headers=patient_headers)
        self.assertEqual(res_canc.status_code, 400)

    def test_46_zero_dependency_rule_multiple_active_references(self):
        """Zero-dependency rule: Vehicle remains On Duty until all active references are resolved, and Maintenance is never overwritten."""
        from routes.ambulances import safe_release_ambulance
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            amb = Ambulance(vehicle_number="MH01-ZERO-46", driver_name="Zero Dep Driver", driver_phone="+91 98000 00046", current_location="Santacruz", status="On Duty")
            db.session.add(amb)
            db.session.flush()

            # 1. Non-active completed historical request referencing the vehicle
            req_history = AmbulanceRequest(
                patient_name="Historical Patient",
                phone="+91 98000 00460",
                emergency_type="Fracture",
                pickup_location="Santacruz West",
                destination_hospital="Nanavati Hospital",
                status="Completed",
                assigned_ambulance_id=amb.id
            )
            # 2. Currently active dispatched request referencing the vehicle
            req_active = AmbulanceRequest(
                patient_name="Active Patient",
                phone="+91 98000 00461",
                emergency_type="Heart Attack",
                pickup_location="Santacruz East",
                destination_hospital="Nanavati Hospital",
                status="Dispatched",
                assigned_ambulance_id=amb.id
            )
            db.session.add_all([req_history, req_active])
            db.session.commit()
            amb_id = amb.id
            req_active_id = req_active.id

        # Direct safe_release_ambulance invocation while req_active is still active
        with self.app.app_context():
            safe_release_ambulance(amb_id)
            db.session.commit()
            amb_db = db.session.get(Ambulance, amb_id)
            self.assertEqual(amb_db.status, 'On Duty', "Ambulance must remain On Duty while an active request references it")

        # Now advance active request through state machine to Completed
        self.client.put(f"/api/ambulance-requests/{req_active_id}", json={"status": "Arrived"}, headers=admin_headers)
        res_comp = self.client.put(f"/api/ambulance-requests/{req_active_id}", json={"status": "Completed"}, headers=admin_headers)
        self.assertEqual(res_comp.status_code, 200)

        # Now zero active requests reference the vehicle, so it must transition to 'Available'
        with self.app.app_context():
            amb_db = db.session.get(Ambulance, amb_id)
            self.assertEqual(amb_db.status, 'Available', "Vehicle must become Available once all active dispatches are completed")

            # Verify that Maintenance status is never overwritten by safe_release_ambulance
            amb_db.status = 'Maintenance'
            db.session.commit()
            safe_release_ambulance(amb_id)
            db.session.commit()
            amb_db_recheck = db.session.get(Ambulance, amb_id)
            self.assertEqual(amb_db_recheck.status, 'Maintenance', "safe_release_ambulance must never overwrite Maintenance status")

    def test_47_conflicting_update_rejected(self):
        """Conflicting updates (e.g., assigning ambulance while setting status to Pending) are rejected with 400."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            amb = Ambulance(vehicle_number="MH01-CONF-47", driver_name="D47", driver_phone="+91 98000 00047", current_location="Dharavi", status="Available")
            db.session.add(amb)
            req = AmbulanceRequest(
                patient_name="Conflict Patient",
                phone="+91 98000 00047",
                emergency_type="Fracture",
                pickup_location="Dharavi 90ft Road",
                destination_hospital="Sion Hospital",
                status="Pending"
            )
            db.session.add(req)
            db.session.commit()
            amb_id = amb.id
            req_id = req.id

        res = self.client.put(f"/api/ambulance-requests/{req_id}", json={
            "status": "Pending",
            "assigned_ambulance_id": amb_id
        }, headers=admin_headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Conflicting", res.get_json()['message'])

    def test_48_dispatch_without_ambulance_rejected(self):
        """Dispatching a Pending request without assigning an ambulance is rejected with 400."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            req = AmbulanceRequest(
                patient_name="No Amb Patient",
                phone="+91 98000 00048",
                emergency_type="Dizziness",
                pickup_location="Grant Road",
                destination_hospital="Saifee Hospital",
                status="Pending"
            )
            db.session.add(req)
            db.session.commit()
            req_id = req.id

        res = self.client.put(f"/api/ambulance-requests/{req_id}", json={
            "status": "Dispatched"
        }, headers=admin_headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("assigned ambulance", res.get_json()['message'])

    def test_49_concurrent_status_updates_thread_barrier(self):
        """Simultaneous concurrent status updates synchronized with threading.Barrier."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            amb = Ambulance(vehicle_number="MH01-CONC-49", driver_name="Concurrent D49", driver_phone="+91 98000 00049", current_location="Tardeo", status="On Duty")
            db.session.add(amb)
            db.session.flush()
            req = AmbulanceRequest(
                patient_name="Concurrent Patient",
                phone="+91 98000 00049",
                emergency_type="Severe Head Injury",
                pickup_location="AC Market, Tardeo",
                destination_hospital="Bhatia Hospital",
                status="Dispatched",
                assigned_ambulance_id=amb.id
            )
            db.session.add(req)
            db.session.commit()
            amb_id = amb.id
            req_id = req.id

        barrier = threading.Barrier(4)
        statuses = []
        errors = []

        def worker(target_status):
            try:
                barrier.wait(timeout=5)
            except Exception as e:
                errors.append(e)
                return
            with self.app.app_context():
                client = self.app.test_client()
                try:
                    res = client.put(f"/api/ambulance-requests/{req_id}", json={"status": target_status}, headers=admin_headers)
                    statuses.append((target_status, res.status_code))
                except Exception as ex:
                    errors.append(ex)

        threads = [
            threading.Thread(target=worker, args=("Arrived",)),
            threading.Thread(target=worker, args=("Arrived",)),
            threading.Thread(target=worker, args=("Completed",)),
            threading.Thread(target=worker, args=("Pending",))
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0)
        # Database must be in a consistent, valid state
        with self.app.app_context():
            req_db = db.session.get(AmbulanceRequest, req_id)
            self.assertIn(req_db.status, ['Dispatched', 'Arrived', 'Pending', 'Completed', 'Cancelled'])

    def test_50_forced_transaction_integrity_error_rollback(self):
        """Simulate an IntegrityError during PUT update; verifies clean rollback and 409 response."""
        admin_id, admin_token = self._create_test_user(role="ADMIN")
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        with self.app.app_context():
            amb = Ambulance(vehicle_number="MH01-ROLL-50", driver_name="Rollback Driver", driver_phone="+91 98000 00050", current_location="Byculla", status="Available")
            db.session.add(amb)
            req = AmbulanceRequest(
                patient_name="Rollback Patient",
                phone="+91 98000 00050",
                emergency_type="Allergy",
                pickup_location="Byculla Zoo",
                destination_hospital="Masina Hospital",
                status="Pending"
            )
            db.session.add(req)
            db.session.commit()
            amb_id = amb.id
            req_id = req.id

        # Patch db.session.commit to raise IntegrityError
        from unittest.mock import patch
        with patch.object(db.session, 'commit', side_effect=IntegrityError("Forced Unique Conflict", "orig", "params")):
            res = self.client.put(f"/api/ambulance-requests/{req_id}", json={
                "status": "Dispatched",
                "assigned_ambulance_id": amb_id
            }, headers=admin_headers)
            self.assertEqual(res.status_code, 409)
            self.assertIn("constraint conflict", res.get_json()['message'])

        # Verify state was rolled back cleanly
        with self.app.app_context():
            req_db = db.session.get(AmbulanceRequest, req_id)
            amb_db = db.session.get(Ambulance, amb_id)
            self.assertEqual(req_db.status, 'Pending', "Request must remain Pending after rollback")
            self.assertEqual(amb_db.status, 'Available', "Ambulance must remain Available after rollback")



if __name__ == '__main__':
    unittest.main()
