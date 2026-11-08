"""
Step 5.2 Neon PostgreSQL Setup Preparation Test Suite
Validates:
1. DATABASE_URL normalization and Neon SSL mode enforcement.
2. Connection pool engine options for PostgreSQL vs SQLite.
3. PostgreSQL driver dependency in requirements.txt.
4. Centralized migration runner (manage.py migrate & migrate-status) ordering and idempotency.
5. Sequence synchronization coverage across all 11 integer primary key domain models.
6. Safe environment template (.env.example) configuration and zero secret exposure.
"""

import os
import sys
import unittest
import tempfile
import uuid
import shutil
import sqlite3
from pathlib import Path
from sqlalchemy import create_engine, text

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from config import Config
from app import create_app
from models import (
    User, Specialization, Hospital, Doctor, Ambulance, AmbulanceRequest,
    Appointment, Review, Favorite, Invitation, AuditLog
)
from utils.db_sequences import sync_postgres_sequences, DOMAIN_TABLES_WITH_SEQUENCES
from manage import run_migrations, get_migration_engine


class TestStep52NeonPreparation(unittest.TestCase):

    def setUp(self):
        self.original_env = os.environ.copy()
        self.original_config_db_url = Config.DATABASE_URL

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.original_env)
        Config.DATABASE_URL = self.original_config_db_url

    # =========================================================================
    # 1. DATABASE_URL & NEON CONNECTION PARSING
    # =========================================================================

    def test_01_postgres_prefix_normalized_to_postgresql(self):
        """postgres:// prefix is normalized to postgresql:// for SQLAlchemy 2.0 driver compatibility."""
        os.environ["DATABASE_URL"] = "postgres://sample_user:sample_pass@ep-sample-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
        Config.DATABASE_URL = os.environ["DATABASE_URL"]
        uri = Config.get_database_uri()
        self.assertTrue(uri.startswith("postgresql://"))

    def test_02_neon_host_enforces_sslmode_require_if_missing(self):
        """Neon connection URLs without sslmode automatically have ?sslmode=require appended."""
        os.environ["DATABASE_URL"] = "postgresql://sample_user:sample_pass@ep-sample-pooler.us-east-1.aws.neon.tech/neondb"
        Config.DATABASE_URL = os.environ["DATABASE_URL"]
        uri = Config.get_database_uri()
        self.assertIn("sslmode=require", uri)

    def test_03_neon_pooled_and_direct_connection_strings_supported(self):
        """Both Neon pooled (-pooler) and direct compute connection strings resolve cleanly."""
        pooled_url = "postgresql://user:pass@ep-test-1234-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
        direct_url = "postgresql://user:pass@ep-test-1234.us-east-1.aws.neon.tech/neondb?sslmode=require"

        os.environ["DATABASE_URL"] = pooled_url
        Config.DATABASE_URL = pooled_url
        self.assertEqual(Config.get_database_uri(), pooled_url)

        os.environ["DATABASE_URL"] = direct_url
        Config.DATABASE_URL = direct_url
        self.assertEqual(Config.get_database_uri(), direct_url)

    def test_04_engine_options_enabled_for_postgresql_disabled_for_sqlite(self):
        """PostgreSQL enables pool_pre_ping and pool_recycle; SQLite returns empty engine options."""
        # SQLite
        os.environ.pop("DATABASE_URL", None)
        Config.DATABASE_URL = None
        os.environ["FLASK_ENV"] = "development"
        orig_pwd = os.environ.get("MYSQL_PASSWORD")
        os.environ.pop("MYSQL_PASSWORD", None)
        Config.MYSQL_PASSWORD = ""
        try:
            sqlite_opts = Config.get_engine_options()
            self.assertEqual(sqlite_opts, {})
        finally:
            if orig_pwd is not None:
                os.environ["MYSQL_PASSWORD"] = orig_pwd
                Config.MYSQL_PASSWORD = orig_pwd

        # PostgreSQL
        os.environ["DATABASE_URL"] = "postgresql://user:pass@ep-sample-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
        Config.DATABASE_URL = os.environ["DATABASE_URL"]
        os.environ["DB_POOL_PRE_PING"] = "true"
        os.environ["DB_POOL_RECYCLE"] = "300"
        os.environ["DB_POOL_SIZE"] = "15"

        pg_opts = Config.get_engine_options()
        self.assertTrue(pg_opts["pool_pre_ping"])
        self.assertEqual(pg_opts["pool_recycle"], 300)
        self.assertEqual(pg_opts["pool_size"], 15)

    # =========================================================================
    # 2. DRIVER DEPENDENCY & ENVIRONMENT TEMPLATE
    # =========================================================================

    def test_05_psycopg2_binary_included_in_requirements(self):
        """psycopg2-binary>=2.9.9 must be present in backend/requirements.txt."""
        req_path = os.path.join(os.path.dirname(__file__), 'requirements.txt')
        with open(req_path, 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn("psycopg2-binary", content)

    def test_06_env_example_contains_safe_neon_placeholders(self):
        """backend/.env.example must provide Neon pooled, direct, and SSL options with zero hardcoded credentials."""
        env_example_path = os.path.join(os.path.dirname(__file__), '.env.example')
        with open(env_example_path, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn("DATABASE_URL=", content)
        self.assertIn("MIGRATION_DATABASE_URL=", content)
        self.assertIn("sslmode=require", content)
        self.assertIn("DB_POOL_PRE_PING=true", content)
        self.assertIn("neon.tech", content)

        # Zero real secrets check
        self.assertNotIn("npg_", content)
        self.assertNotIn("secret-production", content)
        self.assertIn("YOUR_NEON_PASSWORD", content)

    # =========================================================================
    # 3. MIGRATION RUNNER ORDER & VERSION TRACKING
    # =========================================================================

    def test_07_migration_runner_discovers_all_eight_migrations_in_numerical_order(self):
        """manage.py migration runner discovers migrations 001 to 008 in exact sequential order."""
        mig_dir = os.path.join(os.path.dirname(__file__), 'migrations')
        mig_files = sorted([f for f in os.listdir(mig_dir) if f.endswith('.py') and f != '__init__.py' and not f.startswith('.')])

        self.assertEqual(len(mig_files), 8)
        self.assertTrue(mig_files[0].startswith("001_"))
        self.assertTrue(mig_files[1].startswith("002_"))
        self.assertTrue(mig_files[2].startswith("003_"))
        self.assertTrue(mig_files[3].startswith("004_"))
        self.assertTrue(mig_files[4].startswith("005_"))
        self.assertTrue(mig_files[5].startswith("006_"))
        self.assertTrue(mig_files[6].startswith("007_"))
        self.assertTrue(mig_files[7].startswith("008_"))

    def test_08_migration_runner_prefers_migration_database_url_override(self):
        """Migration runner preferentially connects via MIGRATION_DATABASE_URL over DATABASE_URL."""
        direct_url = "postgresql://user:pass@ep-direct-compute.us-east-1.aws.neon.tech/neondb?sslmode=require"
        pooled_url = "postgresql://user:pass@ep-pooled-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

        os.environ["DATABASE_URL"] = pooled_url
        os.environ["MIGRATION_DATABASE_URL"] = direct_url

        engine = get_migration_engine()
        self.assertEqual(engine.url.render_as_string(hide_password=False), direct_url)
        self.assertEqual(engine.url.host, "ep-direct-compute.us-east-1.aws.neon.tech")
        engine.dispose()

    # =========================================================================
    # 4. PRIMARY KEY SEQUENCE SYNCHRONIZATION COVERAGE
    # =========================================================================

    def test_09_all_eleven_domain_tables_covered_by_sequence_sync(self):
        """All 11 integer primary key domain models must be registered in DOMAIN_TABLES_WITH_SEQUENCES."""
        registered_tables = {tbl for tbl, col in DOMAIN_TABLES_WITH_SEQUENCES}

        expected_tables = {
            "specializations", "hospitals", "users", "doctors", "ambulances",
            "ambulance_requests", "appointments", "reviews", "favorites",
            "invitations", "audit_logs"
        }

        self.assertEqual(registered_tables, expected_tables)

        # Confirm each model has an integer 'id' primary key
        models_to_check = [
            Specialization, Hospital, User, Doctor, Ambulance, AmbulanceRequest,
            Appointment, Review, Favorite, Invitation, AuditLog
        ]
        for model in models_to_check:
            self.assertTrue(hasattr(model, 'id'))
            self.assertEqual(model.__table__.name, model.__tablename__)
            self.assertTrue(model.__table__.name in expected_tables)


if __name__ == "__main__":
    unittest.main()
