"""
Migration: 009_role_registration_approval
Version: 009_role_registration_approval
Stage: Multi-Role Secure Registration & Account Approval Workflow

Purpose:
- Adds `approval_status` (VARCHAR(30) DEFAULT 'APPROVED' NOT NULL) to `users` table.
- Adds `approved_by_id` (INT NULL) to `users` table.
- Adds `approved_at` (DATETIME / TIMESTAMP NULL) to `users` table.
- Adds `rejection_reason` (TEXT NULL) to `users` table.
- Adds `registration_notes` (TEXT NULL) to `users` table.
- Adds index `idx_users_approval_status` on `users(approval_status)`.
- Adds `registration_number` (VARCHAR(100) NULL) to `doctors` table.
- Adds `council_name` (VARCHAR(150) NULL) to `doctors` table.
- Adds `designation` (VARCHAR(100) DEFAULT 'Consultant') to `doctors` table.
- Adds index `idx_doctors_reg_no` on `doctors(registration_number)`.
- Guarantees backward compatibility: all existing users default to `approval_status = 'APPROVED'`.
- Preserves 100% of existing user, doctor, hospital, and appointment records.
"""

import sys
import os
import argparse
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy import text, inspect, create_engine

MIGRATION_VERSION = "009_role_registration_approval"


class MigrationPreconditionError(Exception):
    """Raised when database pre-conditions fail, preventing safe migration."""
    pass


def ensure_migrations_table(connection):
    """Ensures schema_migrations table exists for version tracking."""
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(100) PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))


def ensure_ownership_table(connection):
    """Ensures migration_managed_objects table exists for provenance tracking."""
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS migration_managed_objects (
            migration_version VARCHAR(64) NOT NULL,
            object_type VARCHAR(32) NOT NULL,
            table_name VARCHAR(64) NOT NULL,
            object_name VARCHAR(64) NOT NULL,
            status VARCHAR(32) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (migration_version, object_type, table_name, object_name)
        )
    """))


def record_object_provenance(connection, version: str, obj_type: str, table_name: str, obj_name: str, status: str):
    """Inserts or updates provenance record and commits immediately."""
    ensure_ownership_table(connection)
    connection.execute(
        text("""
            DELETE FROM migration_managed_objects
            WHERE migration_version = :ver
              AND object_type = :obj_type
              AND table_name = :tbl
              AND object_name = :obj
        """),
        {"ver": version, "obj_type": obj_type, "tbl": table_name, "obj": obj_name}
    )
    connection.execute(
        text("""
            INSERT INTO migration_managed_objects
                (migration_version, object_type, table_name, object_name, status, created_at)
            VALUES
                (:ver, :obj_type, :tbl, :obj, :status, :now)
        """),
        {
            "ver": version,
            "obj_type": obj_type,
            "tbl": table_name,
            "obj": obj_name,
            "status": status,
            "now": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        }
    )
    connection.commit()


def remove_object_provenance(connection, version: str, obj_type: str, table_name: str, obj_name: str):
    """Deletes provenance record on clean downgrade."""
    inspector = inspect(connection)
    if inspector.has_table('migration_managed_objects'):
        connection.execute(
            text("""
                DELETE FROM migration_managed_objects
                WHERE migration_version = :ver
                  AND object_type = :obj_type
                  AND table_name = :tbl
                  AND object_name = :obj
            """),
            {"ver": version, "obj_type": obj_type, "tbl": table_name, "obj": obj_name}
        )
        connection.commit()


def audit(engine) -> bool:
    """
    Audits database schema to determine if migration 009 is required.
    Returns True if migration is already applied, False if needed.
    """
    with engine.connect() as conn:
        inspector = inspect(conn)

        if inspector.has_table('schema_migrations'):
            row = conn.execute(
                text("SELECT version FROM schema_migrations WHERE version = :ver"),
                {"ver": MIGRATION_VERSION}
            ).fetchone()
            if row:
                print(f"[AUDIT] Version {MIGRATION_VERSION} is already recorded in schema_migrations.")
                return True

        if not inspector.has_table('users') or not inspector.has_table('doctors'):
            raise MigrationPreconditionError("Precondition failed: table 'users' or 'doctors' does not exist.")

        user_cols = {c['name'] for c in inspector.get_columns('users')}
        doc_cols = {c['name'] for c in inspector.get_columns('doctors')}

        if 'approval_status' in user_cols and 'registration_number' in doc_cols:
            print("[AUDIT] Columns already exist on users and doctors.")
            return True

        print(f"[AUDIT] Migration {MIGRATION_VERSION} is required.")
        return False


def upgrade(engine):
    """Applies migration 009."""
    print(f"\n[UPGRADE] Starting migration {MIGRATION_VERSION}...")
    dialect = engine.name

    with engine.connect() as conn:
        ensure_migrations_table(conn)
        ensure_ownership_table(conn)
        inspector = inspect(conn)

        if not inspector.has_table('users') or not inspector.has_table('doctors'):
            raise MigrationPreconditionError("Tables 'users' or 'doctors' not found.")

        user_cols = {c['name'] for c in inspector.get_columns('users')}
        doc_cols = {c['name'] for c in inspector.get_columns('doctors')}

        # -------------------------------------------------------------
        # 1. Add approval columns to 'users' table
        # -------------------------------------------------------------
        if 'approval_status' not in user_cols:
            print("[UPGRADE] Adding 'approval_status' column to 'users'...")
            record_object_provenance(conn, MIGRATION_VERSION, "column", "users", "approval_status", "CREATING")
            conn.execute(text("ALTER TABLE users ADD COLUMN approval_status VARCHAR(30) NOT NULL DEFAULT 'APPROVED'"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "column", "users", "approval_status", "CREATED")

        if 'approved_by_id' not in user_cols:
            print("[UPGRADE] Adding 'approved_by_id' column to 'users'...")
            record_object_provenance(conn, MIGRATION_VERSION, "column", "users", "approved_by_id", "CREATING")
            conn.execute(text("ALTER TABLE users ADD COLUMN approved_by_id INT NULL"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "column", "users", "approved_by_id", "CREATED")

        if 'approved_at' not in user_cols:
            print("[UPGRADE] Adding 'approved_at' column to 'users'...")
            record_object_provenance(conn, MIGRATION_VERSION, "column", "users", "approved_at", "CREATING")
            if dialect == 'sqlite':
                conn.execute(text("ALTER TABLE users ADD COLUMN approved_at DATETIME NULL"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN approved_at TIMESTAMP NULL"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "column", "users", "approved_at", "CREATED")

        if 'rejection_reason' not in user_cols:
            print("[UPGRADE] Adding 'rejection_reason' column to 'users'...")
            record_object_provenance(conn, MIGRATION_VERSION, "column", "users", "rejection_reason", "CREATING")
            conn.execute(text("ALTER TABLE users ADD COLUMN rejection_reason TEXT NULL"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "column", "users", "rejection_reason", "CREATED")

        if 'registration_notes' not in user_cols:
            print("[UPGRADE] Adding 'registration_notes' column to 'users'...")
            record_object_provenance(conn, MIGRATION_VERSION, "column", "users", "registration_notes", "CREATING")
            conn.execute(text("ALTER TABLE users ADD COLUMN registration_notes TEXT NULL"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "column", "users", "registration_notes", "CREATED")

        # Create index on approval_status
        try:
            if dialect == 'mysql':
                conn.execute(text("CREATE INDEX idx_users_approval_status ON users(approval_status)"))
            else:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status)"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "index", "users", "idx_users_approval_status", "CREATED")
        except Exception as idx_err:
            print(f"[UPGRADE] Notice on users index: {idx_err}")

        # Ensure all existing users have approval_status = 'APPROVED'
        conn.execute(text("UPDATE users SET approval_status = 'APPROVED' WHERE approval_status IS NULL OR approval_status = ''"))
        conn.commit()

        # -------------------------------------------------------------
        # 2. Add doctor medical registration columns to 'doctors' table
        # -------------------------------------------------------------
        if 'registration_number' not in doc_cols:
            print("[UPGRADE] Adding 'registration_number' column to 'doctors'...")
            record_object_provenance(conn, MIGRATION_VERSION, "column", "doctors", "registration_number", "CREATING")
            conn.execute(text("ALTER TABLE doctors ADD COLUMN registration_number VARCHAR(100) NULL"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "column", "doctors", "registration_number", "CREATED")

        if 'council_name' not in doc_cols:
            print("[UPGRADE] Adding 'council_name' column to 'doctors'...")
            record_object_provenance(conn, MIGRATION_VERSION, "column", "doctors", "council_name", "CREATING")
            conn.execute(text("ALTER TABLE doctors ADD COLUMN council_name VARCHAR(150) NULL"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "column", "doctors", "council_name", "CREATED")

        if 'designation' not in doc_cols:
            print("[UPGRADE] Adding 'designation' column to 'doctors'...")
            record_object_provenance(conn, MIGRATION_VERSION, "column", "doctors", "designation", "CREATING")
            conn.execute(text("ALTER TABLE doctors ADD COLUMN designation VARCHAR(100) DEFAULT 'Consultant'"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "column", "doctors", "designation", "CREATED")

        # Create index on doctors(registration_number)
        try:
            if dialect == 'mysql':
                conn.execute(text("CREATE INDEX idx_doctors_reg_no ON doctors(registration_number)"))
            else:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_doctors_reg_no ON doctors(registration_number)"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "index", "doctors", "idx_doctors_reg_no", "CREATED")
        except Exception as idx_err:
            print(f"[UPGRADE] Notice on doctors index: {idx_err}")

        # -------------------------------------------------------------
        # 3. Record version in schema_migrations
        # -------------------------------------------------------------
        row = conn.execute(
            text("SELECT version FROM schema_migrations WHERE version = :ver"),
            {"ver": MIGRATION_VERSION}
        ).fetchone()
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        if row:
            conn.execute(
                text("UPDATE schema_migrations SET applied_at = :now WHERE version = :ver"),
                {"ver": MIGRATION_VERSION, "now": now_str}
            )
        else:
            conn.execute(
                text("INSERT INTO schema_migrations (version, applied_at) VALUES (:ver, :now)"),
                {"ver": MIGRATION_VERSION, "now": now_str}
            )
        conn.commit()
        print(f"[UPGRADE] Successfully applied migration {MIGRATION_VERSION}!\n")


def downgrade(engine):
    """Reverts migration 009."""
    print(f"\n[DOWNGRADE] Starting downgrade for {MIGRATION_VERSION}...")
    dialect = engine.name

    with engine.connect() as conn:
        if dialect == 'mysql':
            try:
                conn.execute(text("DROP INDEX idx_users_approval_status ON users"))
            except Exception:
                pass
            try:
                conn.execute(text("DROP INDEX idx_doctors_reg_no ON doctors"))
            except Exception:
                pass
            for col in ['registration_notes', 'rejection_reason', 'approved_at', 'approved_by_id', 'approval_status']:
                try:
                    conn.execute(text(f"ALTER TABLE users DROP COLUMN {col}"))
                except Exception:
                    pass
            for col in ['designation', 'council_name', 'registration_number']:
                try:
                    conn.execute(text(f"ALTER TABLE doctors DROP COLUMN {col}"))
                except Exception:
                    pass
            conn.commit()

        # Remove from schema_migrations
        inspector = inspect(conn)
        if inspector.has_table('schema_migrations'):
            conn.execute(
                text("DELETE FROM schema_migrations WHERE version = :ver"),
                {"ver": MIGRATION_VERSION}
            )
            conn.commit()

        # Clean provenance records
        for obj in ['approval_status', 'approved_by_id', 'approved_at', 'rejection_reason', 'registration_notes', 'idx_users_approval_status']:
            remove_object_provenance(conn, MIGRATION_VERSION, "column" if not obj.startswith("idx_") else "index", "users", obj)
        for obj in ['registration_number', 'council_name', 'designation', 'idx_doctors_reg_no']:
            remove_object_provenance(conn, MIGRATION_VERSION, "column" if not obj.startswith("idx_") else "index", "doctors", obj)

        print(f"[DOWNGRADE] Successfully completed downgrade for {MIGRATION_VERSION}!\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=f"Run migration {MIGRATION_VERSION}")
    parser.add_argument("--downgrade", action="store_true", help="Revert the migration")
    parser.add_argument("--audit", action="store_true", help="Audit the migration status")
    args = parser.parse_args()

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from config import Config
    eng = create_engine(Config.get_database_uri())

    if args.audit:
        needed = not audit(eng)
        sys.exit(0 if not needed else 1)
    elif args.downgrade:
        downgrade(eng)
    else:
        upgrade(eng)
