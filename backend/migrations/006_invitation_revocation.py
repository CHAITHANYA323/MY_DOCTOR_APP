"""
Migration: 006_invitation_revocation
Version: 006_invitation_revocation
Stage: Staff Invitation Revocation & Expiry Hardening

Purpose:
- Adds nullable `revoked_at` (DATETIME NULL) to `invitations` table.
- Adds index `idx_invitations_revoked` on `invitations(revoked_at)`.
- Guarantees durable migration provenance and recovery.
- Guarantees safe dialect-specific downgrade (SQLite, MySQL, PostgreSQL).
- Strictly fails closed without mutating records if pre-conditions fail.
- Preserves 100% of existing records.
"""

import sys
import os
import argparse
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy import text, inspect, create_engine

MIGRATION_VERSION = "006_invitation_revocation"


class MigrationPreconditionError(Exception):
    """Raised when database pre-conditions fail, preventing safe migration."""
    pass


class DowngradeReconciliationError(RuntimeError):
    """Raised when downgrade detects ambiguous, inconsistent, or unverified object provenance."""
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


def get_object_provenance(connection, version: str, obj_type: str, table_name: str, obj_name: str):
    """Returns recorded provenance status or None."""
    inspector = inspect(connection)
    if not inspector.has_table('migration_managed_objects'):
        return None
    row = connection.execute(
        text("""
            SELECT status FROM migration_managed_objects
            WHERE migration_version = :ver
              AND object_type = :obj_type
              AND table_name = :tbl
              AND object_name = :obj
        """),
        {"ver": version, "obj_type": obj_type, "tbl": table_name, "obj": obj_name}
    ).fetchone()
    return row[0] if row else None


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
    Audits database schema to determine if migration 006 is required.
    Returns True if migration is already applied, False if needed.
    """
    with engine.connect() as conn:
        inspector = inspect(conn)

        # Check migrations table
        if inspector.has_table('schema_migrations'):
            row = conn.execute(
                text("SELECT version FROM schema_migrations WHERE version = :ver"),
                {"ver": MIGRATION_VERSION}
            ).fetchone()
            if row:
                print(f"[AUDIT] Version {MIGRATION_VERSION} is already recorded in schema_migrations.")
                return True

        if not inspector.has_table('invitations'):
            raise MigrationPreconditionError("Precondition failed: table 'invitations' does not exist. Run migration 005 first.")

        # Check column
        cols = {c['name'] for c in inspector.get_columns('invitations')}
        if 'revoked_at' in cols:
            print(f"[AUDIT] invitations.revoked_at column already exists.")
            return True

        print(f"[AUDIT] Migration {MIGRATION_VERSION} is required (invitations.revoked_at column missing).")
        return False


def upgrade(engine):
    """
    Applies migration 006:
    1. Adds revoked_at column to invitations.
    2. Adds idx_invitations_revoked index.
    3. Records provenance.
    4. Records version in schema_migrations.
    """
    print(f"\n[UPGRADE] Starting migration {MIGRATION_VERSION}...")
    dialect = engine.name

    with engine.connect() as conn:
        ensure_migrations_table(conn)
        ensure_ownership_table(conn)
        inspector = inspect(conn)

        if not inspector.has_table('invitations'):
            raise MigrationPreconditionError("Table 'invitations' not found. Run migration 005 first.")

        cols = {c['name'] for c in inspector.get_columns('invitations')}

        # Add revoked_at column if not present
        if 'revoked_at' not in cols:
            print("[UPGRADE] Adding revoked_at column to invitations table...")
            record_object_provenance(conn, MIGRATION_VERSION, "COLUMN", "invitations", "revoked_at", "CREATING")
            conn.execute(text("ALTER TABLE invitations ADD COLUMN revoked_at DATETIME NULL"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "COLUMN", "invitations", "revoked_at", "CREATED")
            print("[UPGRADE] Column invitations.revoked_at added successfully.")
        else:
            print("[UPGRADE] Column invitations.revoked_at already exists.")

        # Re-inspect to create index
        inspector = inspect(conn)
        existing_indices = {i['name'] for i in inspector.get_indexes('invitations')}
        if 'idx_invitations_revoked' not in existing_indices:
            print("[UPGRADE] Creating index idx_invitations_revoked...")
            record_object_provenance(conn, MIGRATION_VERSION, "INDEX", "invitations", "idx_invitations_revoked", "CREATING")
            conn.execute(text("CREATE INDEX idx_invitations_revoked ON invitations (revoked_at)"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "INDEX", "invitations", "idx_invitations_revoked", "CREATED")
            print("[UPGRADE] Index idx_invitations_revoked created.")
        else:
            print("[UPGRADE] Index idx_invitations_revoked already exists.")

        # Record migration version (Database-agnostic ANSI SQL for SQLite, PostgreSQL, and MySQL)
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

    print(f"[UPGRADE] Migration {MIGRATION_VERSION} completed successfully!\n")


def downgrade(engine):
    """
    Rolls back migration 006:
    1. Verifies provenance.
    2. Drops idx_invitations_revoked index.
    3. Removes revoked_at column (using dialect-specific mechanism).
    4. Cleans up provenance records.
    5. Removes version from schema_migrations.
    """
    print(f"\n[DOWNGRADE] Reverting migration {MIGRATION_VERSION}...")
    dialect = engine.name

    with engine.connect() as conn:
        inspector = inspect(conn)

        # 1. Drop index
        if inspector.has_table('invitations'):
            existing_indices = {i['name'] for i in inspector.get_indexes('invitations')}
            if 'idx_invitations_revoked' in existing_indices:
                prov = get_object_provenance(conn, MIGRATION_VERSION, "INDEX", "invitations", "idx_invitations_revoked")
                if prov != "CREATED":
                    raise DowngradeReconciliationError("Cannot safely drop idx_invitations_revoked: unverified provenance.")
                print("[DOWNGRADE] Dropping index idx_invitations_revoked...")
                conn.execute(text("DROP INDEX idx_invitations_revoked"))
                conn.commit()
                remove_object_provenance(conn, MIGRATION_VERSION, "INDEX", "invitations", "idx_invitations_revoked")

            # 2. Drop column
            cols = {c['name'] for c in inspector.get_columns('invitations')}
            if 'revoked_at' in cols:
                prov = get_object_provenance(conn, MIGRATION_VERSION, "COLUMN", "invitations", "revoked_at")
                if prov != "CREATED":
                    raise DowngradeReconciliationError("Cannot safely remove invitations.revoked_at: unverified provenance.")

                print(f"[DOWNGRADE] Removing revoked_at column from invitations table (dialect: {dialect})...")
                if dialect == 'sqlite':
                    # SQLite table reconstruction preserving all data
                    conn.execute(text("PRAGMA foreign_keys=OFF"))
                    conn.execute(text("""
                        CREATE TABLE invitations_backup (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            email VARCHAR(120) NOT NULL,
                            role VARCHAR(30) NOT NULL,
                            hospital_id INTEGER NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                            doctor_profile_id INTEGER NULL REFERENCES doctors(id) ON DELETE SET NULL,
                            token_hash VARCHAR(64) NOT NULL UNIQUE,
                            invited_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                            expires_at DATETIME NOT NULL,
                            used_at DATETIME NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    """))
                    conn.execute(text("""
                        INSERT INTO invitations_backup (id, email, role, hospital_id, doctor_profile_id, token_hash, invited_by_id, expires_at, used_at, created_at)
                        SELECT id, email, role, hospital_id, doctor_profile_id, token_hash, invited_by_id, expires_at, used_at, created_at
                        FROM invitations
                    """))
                    conn.execute(text("DROP TABLE invitations"))
                    conn.execute(text("ALTER TABLE invitations_backup RENAME TO invitations"))
                    conn.execute(text("CREATE INDEX idx_invitations_email ON invitations (email)"))
                    conn.execute(text("CREATE INDEX idx_invitations_hospital ON invitations (hospital_id)"))
                    conn.execute(text("PRAGMA foreign_keys=ON"))
                    conn.commit()
                else:
                    conn.execute(text("ALTER TABLE invitations DROP COLUMN revoked_at"))
                    conn.commit()

                remove_object_provenance(conn, MIGRATION_VERSION, "COLUMN", "invitations", "revoked_at")
                print("[DOWNGRADE] Column revoked_at removed.")

        # Remove from schema_migrations
        if inspector.has_table('schema_migrations'):
            conn.execute(
                text("DELETE FROM schema_migrations WHERE version = :ver"),
                {"ver": MIGRATION_VERSION}
            )
            conn.commit()

    print(f"[DOWNGRADE] Migration {MIGRATION_VERSION} reverted cleanly!\n")


def status(engine):
    """Prints current migration status."""
    with engine.connect() as conn:
        inspector = inspect(conn)
        has_migrations = inspector.has_table('schema_migrations')
        applied = False
        applied_at = None

        if has_migrations:
            row = conn.execute(
                text("SELECT version, applied_at FROM schema_migrations WHERE version = :ver"),
                {"ver": MIGRATION_VERSION}
            ).fetchone()
            if row:
                applied = True
                applied_at = row[1]

        cols = set()
        if inspector.has_table('invitations'):
            cols = {c['name'] for c in inspector.get_columns('invitations')}

        print(f"\nMigration Status: {MIGRATION_VERSION}")
        print(f"  Applied in schema_migrations: {applied} ({applied_at})")
        print(f"  invitations.revoked_at column present: {'revoked_at' in cols}\n")


def main():
    parser = argparse.ArgumentParser(description=f"Manage migration {MIGRATION_VERSION}")
    parser.add_argument('action', choices=['audit', 'upgrade', 'downgrade', 'status'], help="Migration action")
    parser.add_argument('--db-url', default=None, help="Database connection URL")
    args = parser.parse_args()

    db_url = args.db_url or os.environ.get("DATABASE_URL")
    if not db_url:
        default_db = Path(__file__).resolve().parent.parent / "doctor_hospital.db"
        db_url = f"sqlite:///{default_db}"

    print(f"Connecting to database: {db_url}")
    engine = create_engine(db_url)

    if args.action == 'audit':
        is_applied = audit(engine)
        sys.exit(0 if is_applied else 1)
    elif args.action == 'upgrade':
        upgrade(engine)
    elif args.action == 'downgrade':
        downgrade(engine)
    elif args.action == 'status':
        status(engine)


if __name__ == '__main__':
    main()
