"""
Step 5.3 Neon PostgreSQL Verification Test Suite
Tests backup verification, credential masking, SSL enforcement, engine pooling options,
and safe execution without leaking secrets.
"""
import os
import sys
import glob
import sqlite3
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from config import Config
from manage import get_migration_engine, run_migrations
from utils.db_sequences import sync_postgres_sequences
from verify_step5_3_neon import mask_url, verify_neon


def test_01_verify_sqlite_backup_exists_and_intact():
    """Verify that a fresh verified SQLite backup exists for Step 5.3."""
    backups = glob.glob(os.path.join(os.path.dirname(__file__), "backups", "doctor_hospital_step5_3_backup_*.db"))
    assert len(backups) > 0, "No Step 5.3 backup found in backend/backups/"
    latest_backup = sorted(backups)[-1]
    assert os.path.getsize(latest_backup) > 0, f"Backup {latest_backup} is empty"

    conn = sqlite3.connect(latest_backup)
    cursor = conn.cursor()
    integrity = cursor.execute("PRAGMA integrity_check;").fetchall()
    fk_check = cursor.execute("PRAGMA foreign_key_check;").fetchall()
    conn.close()

    assert integrity == [("ok",)], f"Backup integrity check failed: {integrity}"
    assert fk_check == [], f"Backup foreign key violations found: {fk_check}"


def test_02_verify_masking_function_masks_passwords_and_hosts():
    """Verify that mask_url safely strips passwords and obscures project IDs."""
    raw = "postgresql://neondb_owner:npg_SecretPass123@ep-cool-resonance-123456-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
    masked = mask_url(raw)
    assert "npg_SecretPass123" not in masked, "Password leaked in masked URL!"
    assert "ep-coo***" in masked or "ep-***" in masked, "Host project ID was not masked!"
    assert "neondb_owner" in masked
    assert "sslmode=require" in masked


def test_03_verify_sslmode_required_by_neon_specification():
    """Verify that Neon connection URLs enforce sslmode=require."""
    url_without_ssl = "postgresql://user:pass@ep-cool-resonance-123456-pooler.us-east-1.aws.neon.tech/neondb"
    normalized = Config.get_database_uri(url_without_ssl)
    assert "sslmode=require" in normalized


def test_04_verify_neon_engine_options_configuration():
    """Verify that PostgreSQL engine options configure pool_pre_ping and pool_recycle."""
    neon_url = "postgresql://user:pass@ep-cool-resonance-123456-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
    options = Config.get_engine_options(neon_url)
    assert options.get("pool_pre_ping") is True
    assert options.get("pool_recycle") == 300
    assert options.get("pool_size") == 10
    assert options.get("max_overflow") == 20


def test_05_verify_migration_runner_direct_url_override():
    """Verify that migration runner supports direct compute connection override."""
    direct_url = "postgresql://user:pass@ep-direct-compute.us-east-1.aws.neon.tech/neondb?sslmode=require"
    engine = get_migration_engine(direct_url)
    assert engine.url.host == "ep-direct-compute.us-east-1.aws.neon.tech"


def test_06_verify_sequence_sync_safely_skips_when_not_postgres():
    """Verify sequence synchronization handles non-PostgreSQL dialects safely."""
    from sqlalchemy import create_engine
    sqlite_engine = create_engine("sqlite:///backend/doctor_hospital.db")
    res = sync_postgres_sequences(target=sqlite_engine)
    assert res.get("dialect") == "sqlite"
    assert "reason" in res.get("skipped", {})


def test_07_verify_zero_secret_exposure_in_env_example():
    """Verify .env.example contains only placeholders and zero real secrets."""
    example_path = os.path.join(os.path.dirname(__file__), ".env.example")
    with open(example_path, "r") as f:
        content = f.read()
    assert "<password>" in content or "<neon_token>" in content or "<project>" in content
    assert "npg_" not in content
    assert "medicare-jwt-secret-key-323" not in content


def test_08_verify_live_neon_or_safe_missing_env_state():
    """Verify verify_neon executes cleanly and safely without unhandled exceptions."""
    result = verify_neon()
    assert result["status"] in ("success", "missing_env", "direct_failed", "pooled_failed")
    assert "password" not in str(result).lower() or "***" in str(result)
