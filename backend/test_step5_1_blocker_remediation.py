"""
Step 5.1 Blocker Remediation Test Suite
Validates the five production-readiness remediations:
1. BLK-01: Prohibiting silent SQLite fallback in production; fail-fast validation.
2. BLK-02: PostgreSQL-compatible migration version recording and DDL idempotency.
3. BLK-03: PostgreSQL sequence synchronization logic (populated vs empty tables, setval is_called semantics).
4. BLK-04: Reverse proxy ProxyFix configuration and trusted proxy headers.
5. BLK-05: Strict CORS origin validation (allowed, rejected, malformed, missing, preflight OPTIONS).
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch
import tempfile
import uuid
import shutil
import sqlite3
from sqlalchemy import create_engine, text

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from config import Config
from app import create_app, initialize_database
from models import db, User
from utils.db_sequences import sync_postgres_sequences, DOMAIN_TABLES_WITH_SEQUENCES


class TestStep51BlockerRemediation(unittest.TestCase):

    def setUp(self):
        # Save environment variables to restore in tearDown
        self.original_env = os.environ.copy()

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.original_env)

    # =========================================================================
    # BLK-01: REMOVE SILENT SQLITE FALLBACK
    # =========================================================================

    def test_01_production_config_rejects_default_secret_key(self):
        """Production environment strictly requires a custom, non-default SECRET_KEY."""
        os.environ["FLASK_ENV"] = "production"
        Config.SECRET_KEY = Config.DEFAULT_SECRET_KEY
        with self.assertRaises(RuntimeError) as ctx:
            Config.validate_production_config()
        self.assertIn("custom SECRET_KEY is strictly required in production", str(ctx.exception))

    def test_02_production_config_rejects_sqlite_database_url(self):
        """Production environment strictly prohibits sqlite database URLs."""
        os.environ["FLASK_ENV"] = "production"
        Config.SECRET_KEY = "custom-high-entropy-production-secret-key-12345"
        os.environ["DATABASE_URL"] = "sqlite:///backend/doctor_hospital.db"
        Config.DATABASE_URL = "sqlite:///backend/doctor_hospital.db"
        with self.assertRaises(RuntimeError) as ctx:
            Config.validate_production_config()
        self.assertIn("Running with SQLite in production is strictly forbidden", str(ctx.exception))

    def test_03_production_config_rejects_missing_database_url(self):
        """Production environment raises fatal error if no remote DATABASE_URL is configured."""
        os.environ["FLASK_ENV"] = "production"
        Config.SECRET_KEY = "custom-high-entropy-production-secret-key-12345"
        os.environ.pop("DATABASE_URL", None)
        Config.DATABASE_URL = None
        Config.MYSQL_USER = ""
        Config.MYSQL_DB = ""
        Config.MYSQL_PASSWORD = ""
        with self.assertRaises(RuntimeError) as ctx:
            Config.validate_production_config()
        self.assertIn("persistent database URL (DATABASE_URL) is required in production", str(ctx.exception))

    def test_04_initialize_database_fails_fast_in_production_on_connection_error(self):
        """In production, if remote DB connection fails, startup must fail immediately without falling back to SQLite."""
        os.environ["FLASK_ENV"] = "production"
        Config.SECRET_KEY = "custom-production-secret-for-testing-123456789"
        os.environ["DATABASE_URL"] = "postgresql+psycopg2://invalid:pass@127.0.0.1:54329/nonexistent_db"
        Config.DATABASE_URL = "postgresql+psycopg2://invalid:pass@127.0.0.1:54329/nonexistent_db"

        test_app = create_app()

        with self.assertRaises(RuntimeError) as ctx:
            initialize_database(test_app)
        self.assertIn("CRITICAL DATABASE CONNECTION FAILURE", str(ctx.exception))
        self.assertIn("Silent fallback to SQLite is strictly forbidden in production", str(ctx.exception))

    def test_05_development_preserves_local_sqlite_fallback(self):
        """In local development (FLASK_ENV=development), SQLite fallback remains functional."""
        os.environ["FLASK_ENV"] = "development"
        Config.SECRET_KEY = Config.DEFAULT_SECRET_KEY
        os.environ.pop("DATABASE_URL", None)
        Config.DATABASE_URL = None
        orig_pwd = os.environ.get("MYSQL_PASSWORD")
        os.environ.pop("MYSQL_PASSWORD", None)
        Config.MYSQL_PASSWORD = ""
        try:
            uri = Config.get_database_uri()
            self.assertTrue(uri.startswith("sqlite:///"))
        finally:
            if orig_pwd is not None:
                os.environ["MYSQL_PASSWORD"] = orig_pwd
                Config.MYSQL_PASSWORD = orig_pwd

    # =========================================================================
    # BLK-02: POSTGRESQL COMPATIBLE MIGRATIONS (006, 007, 008)
    # =========================================================================

    def test_06_migrations_006_007_008_use_ansi_sql_version_tracking(self):
        """Migrations 006, 007, and 008 must not contain SQLite-specific 'INSERT OR IGNORE' or 'INSERT OR REPLACE'."""
        for mig_file in ['006_invitation_revocation.py', '007_ambulance_hospital_isolation.py', '008_walkin_patient_password_expiry.py']:
            fpath = os.path.join(os.path.dirname(__file__), 'migrations', mig_file)
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
            self.assertNotIn("INSERT OR IGNORE", content, f"{mig_file} contains forbidden INSERT OR IGNORE")
            self.assertNotIn("INSERT OR REPLACE", content, f"{mig_file} contains forbidden INSERT OR REPLACE")

    def test_07_migration_007_and_008_upgrade_downgrade_idempotency_on_isolated_db(self):
        """Verify upgrade and downgrade cycle works idempotently with ANSI SQL version recording."""
        temp_dir = os.path.join(tempfile.gettempdir(), f"mig_blk02_{uuid.uuid4().hex[:8]}")
        os.makedirs(temp_dir, exist_ok=True)
        db_path = os.path.join(temp_dir, "mig_test.db")
        db_uri = f"sqlite:///{db_path}"

        try:
            conn = sqlite3.connect(db_path)
            conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name VARCHAR(100));")
            conn.execute("CREATE TABLE hospitals (id INTEGER PRIMARY KEY, name VARCHAR(100));")
            conn.execute("CREATE TABLE ambulances (id INTEGER PRIMARY KEY, vehicle_number VARCHAR(50), driver_name VARCHAR(100), driver_phone VARCHAR(30), current_location VARCHAR(150));")
            conn.execute("CREATE TABLE ambulance_requests (id INTEGER PRIMARY KEY, patient_name VARCHAR(100), phone VARCHAR(30), emergency_type VARCHAR(50), pickup_location VARCHAR(100), destination_hospital VARCHAR(100));")
            conn.commit()
            conn.close()

            engine = create_engine(db_uri)

            import importlib.util
            # Test 007
            spec007 = importlib.util.spec_from_file_location("mig007", os.path.join(os.path.dirname(__file__), 'migrations', '007_ambulance_hospital_isolation.py'))
            mig007 = importlib.util.module_from_spec(spec007)
            spec007.loader.exec_module(mig007)

            # Test 008
            spec008 = importlib.util.spec_from_file_location("mig008", os.path.join(os.path.dirname(__file__), 'migrations', '008_walkin_patient_password_expiry.py'))
            mig008 = importlib.util.module_from_spec(spec008)
            spec008.loader.exec_module(mig008)

            # Run upgrades
            mig007.upgrade(engine)
            mig008.upgrade(engine)

            # Verify schema_migrations has both versions
            with engine.connect() as c:
                versions = [r[0] for r in c.execute(text("SELECT version FROM schema_migrations ORDER BY version")).fetchall()]
                self.assertIn("007_ambulance_hospital_isolation", versions)
                self.assertIn("008_walkin_patient_password_expiry", versions)

            # Re-upgrade (idempotency check)
            mig007.upgrade(engine)
            mig008.upgrade(engine)

            # Run downgrades
            mig008.downgrade(engine)
            mig007.downgrade(engine)

            # Verify versions removed
            with engine.connect() as c:
                versions = [r[0] for r in c.execute(text("SELECT version FROM schema_migrations ORDER BY version")).fetchall()]
                self.assertNotIn("008_walkin_patient_password_expiry", versions)
                self.assertNotIn("007_ambulance_hospital_isolation", versions)

            engine.dispose()
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    # =========================================================================
    # BLK-03: POSTGRESQL SEQUENCE HANDLING
    # =========================================================================

    def test_08_sync_postgres_sequences_gracefully_skips_sqlite(self):
        """Calling sync_postgres_sequences on SQLite engine reports clean skip without error."""
        engine = create_engine("sqlite:///:memory:")
        res = sync_postgres_sequences(engine)
        self.assertTrue(res["success"])
        self.assertEqual(res["dialect"], "sqlite")
        self.assertIn("does not use PostgreSQL sequence generators", res["skipped"]["reason"])
        engine.dispose()

    def test_09_sync_postgres_sequences_handles_populated_and_empty_tables(self):
        """Verify setval query logic: populated tables get is_called=True, empty tables get is_called=False."""
        mock_engine = MagicMock()
        mock_engine.name = "postgresql"
        mock_conn = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_conn

        # Mock sequence discovery:
        # Table 1: populated table (max_id = 42)
        # Table 2: empty table (max_id = None)
        def mock_execute(statement, params=None):
            sql = str(statement)
            result_mock = MagicMock()
            if "pg_get_serial_sequence" in sql:
                tbl = params.get("tbl") if params else "table"
                result_mock.scalar.return_value = f"public.{tbl}_id_seq"
            elif "MAX(" in sql:
                if "users" in sql:
                    result_mock.scalar.return_value = 42
                else:
                    result_mock.scalar.return_value = None
            elif "setval" in sql:
                result_mock.scalar.return_value = 42 if "users" in str(params) else 1
            return result_mock

        mock_conn.execute.side_effect = mock_execute

        tables = [("users", "id"), ("reviews", "id")]
        res = sync_postgres_sequences(mock_engine, tables=tables)

        self.assertTrue(res["success"])
        self.assertEqual(res["dialect"], "postgresql")
        # Populated table check
        self.assertEqual(res["synced"]["users"]["rows"], "populated")
        self.assertEqual(res["synced"]["users"]["max_id"], 42)
        self.assertEqual(res["synced"]["users"]["next_val"], 43)
        self.assertTrue(res["synced"]["users"]["is_called"])

        # Empty table check
        self.assertEqual(res["synced"]["reviews"]["rows"], "empty")
        self.assertIsNone(res["synced"]["reviews"]["max_id"])
        self.assertEqual(res["synced"]["reviews"]["next_val"], 1)
        self.assertFalse(res["synced"]["reviews"]["is_called"])

    # =========================================================================
    # BLK-04: REVERSE PROXY & PROXYFIX CONFIGURATION
    # =========================================================================

    def test_10_proxyfix_applied_when_trust_proxy_headers_enabled(self):
        """When TRUST_PROXY_HEADERS=true, ProxyFix is applied to wsgi_app with configured counts."""
        os.environ["TRUST_PROXY_HEADERS"] = "true"
        os.environ["PROXY_FIX_X_FOR"] = "2"
        os.environ["PROXY_FIX_X_PROTO"] = "2"
        Config.TRUST_PROXY_HEADERS = True
        Config.PROXY_FIX_X_FOR = 2
        Config.PROXY_FIX_X_PROTO = 2

        app = create_app()
        # Verify app.wsgi_app is wrapped with ProxyFix
        from werkzeug.middleware.proxy_fix import ProxyFix
        self.assertIsInstance(app.wsgi_app, ProxyFix)
        self.assertEqual(app.wsgi_app.x_for, 2)
        self.assertEqual(app.wsgi_app.x_proto, 2)

    def test_11_proxyfix_not_applied_when_trust_proxy_headers_disabled(self):
        """When TRUST_PROXY_HEADERS=false (default dev), ProxyFix is not mounted."""
        os.environ["TRUST_PROXY_HEADERS"] = "false"
        Config.TRUST_PROXY_HEADERS = False

        app = create_app()
        from werkzeug.middleware.proxy_fix import ProxyFix
        self.assertNotIsInstance(app.wsgi_app, ProxyFix)

    # =========================================================================
    # BLK-05: RESTRICT CORS ORIGINS
    # =========================================================================

    def test_12_cors_allows_local_development_origins_in_dev_mode(self):
        """In development mode, localhost and 127.0.0.1 are allowed and reflected with Vary header."""
        os.environ["FLASK_ENV"] = "development"
        app = create_app()
        client = app.test_client()

        res = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173")
        self.assertIn("Origin", res.headers.get("Vary", ""))

        res_127 = client.get("/api/health", headers={"Origin": "http://127.0.0.1:3000"})
        self.assertEqual(res_127.status_code, 200)
        self.assertEqual(res_127.headers.get("Access-Control-Allow-Origin"), "http://127.0.0.1:3000")

    def test_13_cors_rejects_unapproved_origins(self):
        """Unapproved/attacker origins must NEVER receive an Access-Control-Allow-Origin header."""
        app = create_app()
        client = app.test_client()

        res = client.get("/api/health", headers={"Origin": "https://malicious-attacker.com"})
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.headers.get("Access-Control-Allow-Origin"))

    def test_14_cors_rejects_malformed_and_subdomain_spoof_origins(self):
        """Subdomain spoofs like http://localhost.evil.com and 'null' origins must be rejected."""
        app = create_app()
        client = app.test_client()

        for bad_origin in ["http://localhost.evil.com", "http://127.0.0.1.attacker.org", "null", "javascript:alert(1)"]:
            res = client.get("/api/health", headers={"Origin": bad_origin})
            self.assertEqual(res.status_code, 200)
            self.assertIsNone(
                res.headers.get("Access-Control-Allow-Origin"),
                f"Origin '{bad_origin}' was unexpectedly allowed!"
            )

    def test_15_cors_allows_configured_production_origins(self):
        """Explicitly configured ALLOWED_ORIGINS are accepted and unconfigured origins are rejected."""
        os.environ["ALLOWED_ORIGINS"] = "https://mediconnect.health, https://portal.mediconnect.health"
        app = create_app()
        client = app.test_client()

        # Configured production domain 1
        res1 = client.get("/api/health", headers={"Origin": "https://mediconnect.health"})
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.headers.get("Access-Control-Allow-Origin"), "https://mediconnect.health")

        # Configured production domain 2
        res2 = client.get("/api/health", headers={"Origin": "https://portal.mediconnect.health"})
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.headers.get("Access-Control-Allow-Origin"), "https://portal.mediconnect.health")

        # Unconfigured domain
        res_unauth = client.get("/api/health", headers={"Origin": "https://other-domain.com"})
        self.assertEqual(res_unauth.status_code, 200)
        self.assertIsNone(res_unauth.headers.get("Access-Control-Allow-Origin"))

    def test_16_cors_preflight_options_respects_origin_whitelist(self):
        """OPTIONS preflight requests to /api/health return CORS headers only for allowed origins."""
        app = create_app()
        client = app.test_client()

        # Allowed origin preflight
        res_allowed = client.options("/api/health", headers={"Origin": "http://localhost:5173"})
        self.assertEqual(res_allowed.status_code, 200)
        self.assertEqual(res_allowed.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173")
        self.assertIn("GET", res_allowed.headers.get("Access-Control-Allow-Methods", ""))

        # Disallowed origin preflight
        res_blocked = client.options("/api/health", headers={"Origin": "https://evil-site.com"})
        self.assertEqual(res_blocked.status_code, 200)
        self.assertIsNone(res_blocked.headers.get("Access-Control-Allow-Origin"))

    def test_17_request_without_origin_header_functions_normally(self):
        """Requests without Origin header (e.g. server-to-server, curl, same-origin) succeed without CORS headers."""
        app = create_app()
        client = app.test_client()

        res = client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.headers.get("Access-Control-Allow-Origin"))
        data = res.get_json()
        self.assertTrue(data.get("success"))


if __name__ == "__main__":
    unittest.main()
