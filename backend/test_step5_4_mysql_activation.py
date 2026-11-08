"""
Step 5.4 MySQL Activation Test Suite
Validates:
1. Safe credential handling and URL encoding for MySQL passwords containing '@', '#', etc.
2. Automatic selection of MySQL when configured in backend/.env.
3. Legacy PostgreSQL placeholders do not override active MySQL configuration.
4. Explicit SQLite DATABASE_URL continues to be honored for unit tests and local isolation.
5. SQLAlchemy engine options for MySQL (pool_pre_ping=True, pool_recycle=300).
6. Centralized migration runner engine resolution for MySQL.
7. Integrity of existing SQLite database and backups.
"""

import os
import sys
import glob
import sqlite3
import pytest
from sqlalchemy.engine import URL, create_engine
from sqlalchemy import text

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from config import Config
from manage import get_migration_engine


def test_01_url_create_handles_special_characters_in_password():
    """Verify that URL.create safely handles passwords containing '@', '#', '%', etc."""
    special_password = "Secure@Password#2026%Test"
    url_obj = URL.create(
        drivername="mysql+pymysql",
        username="mediconnect_user",
        password=special_password,
        host="localhost",
        port=3306,
        database="mediconnect",
        query={"charset": "utf8mb4"}
    )
    rendered = url_obj.render_as_string(hide_password=False)
    masked = url_obj.render_as_string(hide_password=True)

    # Must encode '@' as '%40' and '#' as '%23'
    assert "%40" in rendered, "@ symbol was not URL-encoded!"
    assert "%23" in rendered, "# symbol was not URL-encoded!"
    assert "***" in masked, "Masked string did not obscure password!"
    assert "mediconnect" in masked
    assert "localhost" in masked


def test_02_config_constructs_mysql_uri_with_encoded_password(monkeypatch):
    """Verify Config.get_database_uri() generates a valid mysql+pymysql URI."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setattr(Config, "DATABASE_URL", None)
    uri = Config.get_database_uri()
    assert uri.startswith("mysql+pymysql://")
    assert "mediconnect" in uri
    assert "charset=utf8mb4" in uri


def test_03_legacy_postgres_placeholders_do_not_override_mysql(monkeypatch):
    """Verify that dummy PostgreSQL placeholders do NOT override valid MySQL credentials."""
    dummy_pg = "postgresql+psycopg2://YOUR_NEON_USER:YOUR_NEON_PASSWORD@ep-sample-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
    monkeypatch.setenv("DATABASE_URL", dummy_pg)

    uri = Config.get_database_uri()
    # Must still select MySQL because DATABASE_URL is a dummy placeholder
    assert uri.startswith("mysql+pymysql://")
    assert "neon.tech" not in uri


def test_04_sqlite_url_honored_for_unit_testing(monkeypatch):
    """Verify that explicit SQLite URLs are honored immediately for unit tests."""
    sqlite_test_url = "sqlite:///C:/test_temp/isolated.db"
    monkeypatch.setenv("DATABASE_URL", sqlite_test_url)

    uri = Config.get_database_uri()
    assert uri == sqlite_test_url


def test_05_engine_options_for_mysql():
    """Verify that SQLAlchemy engine options configure pool_pre_ping and pool_recycle for MySQL."""
    mysql_url = "mysql+pymysql://root:pass@localhost:3306/mediconnect?charset=utf8mb4"
    options = Config.get_engine_options(mysql_url)
    assert options.get("pool_pre_ping") is True
    assert options.get("pool_recycle") == 300
    assert options.get("pool_size") == 10
    assert options.get("max_overflow") == 20


def test_06_manage_py_migration_engine_resolves_mysql(monkeypatch):
    """Verify that manage.py migration engine resolves MySQL when configured."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("MIGRATION_DATABASE_URL", raising=False)
    monkeypatch.setattr(Config, "DATABASE_URL", None)
    engine = get_migration_engine()
    assert engine.url.drivername == "mysql+pymysql"
    assert engine.url.database == "mediconnect"


def test_07_pymysql_driver_dependency():
    """Verify that PyMySQL is installed and declared in requirements.txt."""
    import pymysql
    assert pymysql.__version__ is not None

    req_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
    with open(req_path, "r") as f:
        req_content = f.read()
    assert "PyMySQL" in req_content


def test_08_original_sqlite_db_and_backups_intact():
    """Verify that the original SQLite database and backup files are untouched and healthy."""
    db_path = os.path.join(os.path.dirname(__file__), "doctor_hospital.db")
    assert os.path.exists(db_path), "Active SQLite database missing!"

    conn = sqlite3.connect(db_path)
    integrity = conn.execute("PRAGMA integrity_check;").fetchall()
    fk_check = conn.execute("PRAGMA foreign_key_check;").fetchall()
    conn.close()

    assert integrity == [("ok",)], f"Integrity check failed: {integrity}"
    assert fk_check == [], f"Foreign key check failed: {fk_check}"

    backups = glob.glob(os.path.join(os.path.dirname(__file__), "backups", "doctor_hospital_step5_3_backup_*.db"))
    assert len(backups) > 0, "No Step 5.3 backup found!"
    b_conn = sqlite3.connect(backups[-1])
    b_integrity = b_conn.execute("PRAGMA integrity_check;").fetchall()
    b_conn.close()
    assert b_integrity == [("ok",)]
