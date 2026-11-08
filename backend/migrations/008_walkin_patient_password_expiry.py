"""
Migration: 008_walkin_patient_password_expiry
Version: 008_walkin_patient_password_expiry
Stage: Walk-in Patient Credential Expiry & Mandatory Password Change

Purpose:
- Adds `must_change_password` (BOOLEAN DEFAULT 0 NOT NULL) to `users` table.
- Adds nullable `temporary_password_expires_at` (DATETIME NULL) to `users` table.
- Adds index `idx_users_must_change_pwd` on `users(must_change_password)`.
- Guarantees backward compatibility: all existing users default to `must_change_password = 0`.
- Supports durable provenance tracking and safe upgrade/downgrade.
"""

import sys
import os
import argparse
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy import text, inspect, create_engine

MIGRATION_VERSION = "008_walkin_patient_password_expiry"


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
    Audits database schema to determine if migration 008 is required.
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

        if not inspector.has_table('users'):
            raise MigrationPreconditionError("Precondition failed: table 'users' does not exist.")

        user_cols = {c['name'] for c in inspector.get_columns('users')}
        if 'must_change_password' in user_cols and 'temporary_password_expires_at' in user_cols:
            print(f"[AUDIT] Columns already exist on users.")
            return True

        print(f"[AUDIT] Migration {MIGRATION_VERSION} is required.")
        return False


def upgrade(engine):
    """Applies migration 008."""
    print(f"\n[UPGRADE] Starting migration {MIGRATION_VERSION}...")
    dialect = engine.name

    with engine.connect() as conn:
        ensure_migrations_table(conn)
        ensure_ownership_table(conn)
        inspector = inspect(conn)

        if not inspector.has_table('users'):
            raise MigrationPreconditionError("Table 'users' not found.")

        user_cols = {c['name'] for c in inspector.get_columns('users')}

        # 1. Add must_change_password column
        if 'must_change_password' not in user_cols:
            print("[UPGRADE] Adding 'must_change_password' column to 'users'...")
            record_object_provenance(conn, MIGRATION_VERSION, "column", "users", "must_change_password", "CREATING")
            if dialect == 'sqlite':
                conn.execute(text("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT 0"))
            elif dialect == 'postgresql':
                conn.execute(text("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "column", "users", "must_change_password", "CREATED")

        # 2. Add temporary_password_expires_at column
        if 'temporary_password_expires_at' not in user_cols:
            print("[UPGRADE] Adding 'temporary_password_expires_at' column to 'users'...")
            record_object_provenance(conn, MIGRATION_VERSION, "column", "users", "temporary_password_expires_at", "CREATING")
            if dialect == 'sqlite':
                conn.execute(text("ALTER TABLE users ADD COLUMN temporary_password_expires_at DATETIME NULL"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN temporary_password_expires_at TIMESTAMP NULL"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "column", "users", "temporary_password_expires_at", "CREATED")

        # 3. Create index on must_change_password
        try:
            if dialect == 'mysql':
                conn.execute(text("CREATE INDEX idx_users_must_change_pwd ON users(must_change_password)"))
            else:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_must_change_pwd ON users(must_change_password)"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "index", "users", "idx_users_must_change_pwd", "CREATED")
        except Exception as idx_err:
            print(f"[UPGRADE] Notice on index creation: {idx_err}")

        # 4. Ensure all pre-existing users have must_change_password = 0
        conn.execute(text("UPDATE users SET must_change_password = 0 WHERE must_change_password IS NULL"))
        conn.commit()

        # 5. Record version in schema_migrations (Database-agnostic ANSI SQL for SQLite, PostgreSQL, and MySQL)
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
    Rolls back migration 008:
    1. Drops index idx_users_must_change_pwd.
    2. Drops columns must_change_password and temporary_password_expires_at.
    3. Cleans up provenance records.
    4. Removes version from schema_migrations.
    """
    print(f"\n[DOWNGRADE] Reverting migration {MIGRATION_VERSION}...")
    dialect = engine.name

    with engine.connect() as conn:
        inspector = inspect(conn)

        if inspector.has_table('users'):
            # Drop index
            existing_indices = {i['name'] for i in inspector.get_indexes('users')}
            if 'idx_users_must_change_pwd' in existing_indices:
                print("[DOWNGRADE] Dropping index idx_users_must_change_pwd...")
                conn.execute(text("DROP INDEX idx_users_must_change_pwd"))
                conn.commit()
                remove_object_provenance(conn, MIGRATION_VERSION, "index", "users", "idx_users_must_change_pwd")

            # Drop columns
            cols = {c['name'] for c in inspector.get_columns('users')}
            for col in ['temporary_password_expires_at', 'must_change_password']:
                if col in cols:
                    print(f"[DOWNGRADE] Dropping column {col} from users...")
                    try:
                        conn.execute(text(f"ALTER TABLE users DROP COLUMN {col}"))
                        conn.commit()
                    except Exception as drop_err:
                        print(f"[DOWNGRADE] Notice on DROP COLUMN {col}: {drop_err}")
                    remove_object_provenance(conn, MIGRATION_VERSION, "column", "users", col)

        if inspector.has_table('schema_migrations'):
            conn.execute(
                text("DELETE FROM schema_migrations WHERE version = :ver"),
                {"ver": MIGRATION_VERSION}
            )
            conn.commit()

    print(f"[DOWNGRADE] Migration {MIGRATION_VERSION} successfully reverted!\n")


def main():
    parser = argparse.ArgumentParser(description=f"Migration {MIGRATION_VERSION}")
    parser.add_argument("--audit", action="store_true", help="Audit database schema")
    parser.add_argument("--upgrade", action="store_true", help="Apply migration")
    parser.add_argument("--downgrade", action="store_true", help="Revert migration")
    args = parser.parse_args()

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from config import Config

    db_uri = Config.get_database_uri()
    engine = create_engine(db_uri)

    if args.audit:
        is_applied = audit(engine)
        sys.exit(0 if is_applied else 1)
    elif args.upgrade:
        upgrade(engine)
        sys.exit(0)
    elif args.downgrade:
        downgrade(engine)
        sys.exit(0)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
