"""
Migration: 007_ambulance_hospital_isolation
Version: 007_ambulance_hospital_isolation
Stage: Multi-Hospital Ambulance Fleet & Emergency Dispatch Tenant Isolation

Purpose:
- Adds nullable `hospital_id` (foreign key to hospitals) to `ambulances` table.
- Adds nullable `hospital_id` (foreign key to hospitals) to `ambulance_requests` table.
- Creates index `idx_ambulances_hospital_id` on `ambulances(hospital_id)`.
- Creates index `idx_ambulance_requests_hospital_id` on `ambulance_requests(hospital_id)`.
- Backfills existing ambulances and ambulance requests to hospital 1 as default tenant.
- Preserves 100% of existing data and foreign key integrity.
"""

import sys
import os
import argparse
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy import text, inspect, create_engine

MIGRATION_VERSION = "007_ambulance_hospital_isolation"


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


def audit(engine) -> bool:
    """
    Audits database schema to determine if migration 007 is required.
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

        if not inspector.has_table('ambulances') or not inspector.has_table('ambulance_requests'):
            raise MigrationPreconditionError("Precondition failed: 'ambulances' or 'ambulance_requests' table does not exist.")

        amb_cols = {c['name'] for c in inspector.get_columns('ambulances')}
        req_cols = {c['name'] for c in inspector.get_columns('ambulance_requests')}

        if 'hospital_id' in amb_cols and 'hospital_id' in req_cols:
            print(f"[AUDIT] hospital_id columns already exist on ambulances and ambulance_requests.")
            return True

        print(f"[AUDIT] Migration {MIGRATION_VERSION} is required.")
        return False


def upgrade(engine):
    """Applies migration 007."""
    print(f"\n[UPGRADE] Starting migration {MIGRATION_VERSION}...")
    dialect = engine.name

    with engine.connect() as conn:
        ensure_migrations_table(conn)
        ensure_ownership_table(conn)
        inspector = inspect(conn)

        if not inspector.has_table('ambulances') or not inspector.has_table('ambulance_requests'):
            raise MigrationPreconditionError("Required ambulance tables not found.")

        amb_cols = {c['name'] for c in inspector.get_columns('ambulances')}
        req_cols = {c['name'] for c in inspector.get_columns('ambulance_requests')}

        # 1. Add hospital_id to ambulances if missing
        if 'hospital_id' not in amb_cols:
            print("[UPGRADE] Adding 'hospital_id' column to 'ambulances'...")
            record_object_provenance(conn, MIGRATION_VERSION, "column", "ambulances", "hospital_id", "CREATING")
            if dialect == 'sqlite':
                conn.execute(text("ALTER TABLE ambulances ADD COLUMN hospital_id INTEGER REFERENCES hospitals(id)"))
            elif dialect == 'postgresql':
                conn.execute(text("ALTER TABLE ambulances ADD COLUMN IF NOT EXISTS hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL"))
            else:
                conn.execute(text("ALTER TABLE ambulances ADD COLUMN hospital_id INT NULL, ADD CONSTRAINT fk_ambulances_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "column", "ambulances", "hospital_id", "CREATED")

        # 2. Add hospital_id to ambulance_requests if missing
        if 'hospital_id' not in req_cols:
            print("[UPGRADE] Adding 'hospital_id' column to 'ambulance_requests'...")
            record_object_provenance(conn, MIGRATION_VERSION, "column", "ambulance_requests", "hospital_id", "CREATING")
            if dialect == 'sqlite':
                conn.execute(text("ALTER TABLE ambulance_requests ADD COLUMN hospital_id INTEGER REFERENCES hospitals(id)"))
            elif dialect == 'postgresql':
                conn.execute(text("ALTER TABLE ambulance_requests ADD COLUMN IF NOT EXISTS hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL"))
            else:
                conn.execute(text("ALTER TABLE ambulance_requests ADD COLUMN hospital_id INT NULL, ADD CONSTRAINT fk_ambulance_requests_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL"))
            conn.commit()
            record_object_provenance(conn, MIGRATION_VERSION, "column", "ambulance_requests", "hospital_id", "CREATED")

        # 3. Create indices
        try:
            if dialect == 'mysql':
                conn.execute(text("CREATE INDEX idx_ambulances_hospital_id ON ambulances(hospital_id)"))
                conn.execute(text("CREATE INDEX idx_ambulance_requests_hospital_id ON ambulance_requests(hospital_id)"))
            else:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ambulances_hospital_id ON ambulances(hospital_id)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ambulance_requests_hospital_id ON ambulance_requests(hospital_id)"))
            conn.commit()
        except Exception as idx_err:
            print(f"[UPGRADE] Notice on index creation: {idx_err}")

        # 4. Backfill default hospital_id = 1 for existing ambulances if unassigned
        conn.execute(text("UPDATE ambulances SET hospital_id = 1 WHERE hospital_id IS NULL"))
        conn.execute(text("UPDATE ambulance_requests SET hospital_id = 1 WHERE hospital_id IS NULL"))
        conn.commit()

        # 5. Record version (Database-agnostic ANSI SQL for SQLite, PostgreSQL, and MySQL)
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


def downgrade(engine):
    """
    Rolls back migration 007 safely:
    1. Drops indexes idx_ambulances_hospital_id and idx_ambulance_requests_hospital_id.
    2. Drops hospital_id column from ambulances and ambulance_requests.
    3. Cleans up provenance records.
    4. Removes version from schema_migrations.
    """
    print(f"\n[DOWNGRADE] Reverting migration {MIGRATION_VERSION}...")
    dialect = engine.name

    with engine.connect() as conn:
        inspector = inspect(conn)

        # 1. Drop indexes
        for tbl, idx in [('ambulances', 'idx_ambulances_hospital_id'), ('ambulance_requests', 'idx_ambulance_requests_hospital_id')]:
            if inspector.has_table(tbl):
                existing_indices = {i['name'] for i in inspector.get_indexes(tbl)}
                if idx in existing_indices:
                    print(f"[DOWNGRADE] Dropping index {idx} on {tbl}...")
                    conn.execute(text(f"DROP INDEX {idx}"))
                    conn.commit()
                    remove_object_provenance(conn, MIGRATION_VERSION, "index", tbl, idx)

        # 2. Drop hospital_id from ambulances
        if inspector.has_table('ambulances'):
            cols = {c['name'] for c in inspector.get_columns('ambulances')}
            if 'hospital_id' in cols:
                print("[DOWNGRADE] Removing hospital_id column from ambulances...")
                try:
                    conn.execute(text("ALTER TABLE ambulances DROP COLUMN hospital_id"))
                    conn.commit()
                except Exception:
                    # SQLite fallback if DROP COLUMN not directly supported
                    conn.execute(text("PRAGMA foreign_keys=OFF"))
                    conn.execute(text("""
                        CREATE TABLE ambulances_backup (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            vehicle_number VARCHAR(50) NOT NULL UNIQUE,
                            driver_name VARCHAR(100) NOT NULL,
                            driver_phone VARCHAR(30) NOT NULL,
                            ambulance_type VARCHAR(60),
                            current_location VARCHAR(150) NOT NULL,
                            status VARCHAR(30) NOT NULL DEFAULT 'Available',
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    """))
                    conn.execute(text("""
                        INSERT INTO ambulances_backup (id, vehicle_number, driver_name, driver_phone, ambulance_type, current_location, status, created_at)
                        SELECT id, vehicle_number, driver_name, driver_phone, ambulance_type, current_location, status, created_at
                        FROM ambulances
                    """))
                    conn.execute(text("DROP TABLE ambulances"))
                    conn.execute(text("ALTER TABLE ambulances_backup RENAME TO ambulances"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_ambulances_status ON ambulances(status)"))
                    conn.execute(text("PRAGMA foreign_keys=ON"))
                    conn.commit()
                remove_object_provenance(conn, MIGRATION_VERSION, "column", "ambulances", "hospital_id")

        # 3. Drop hospital_id from ambulance_requests
        if inspector.has_table('ambulance_requests'):
            cols = {c['name'] for c in inspector.get_columns('ambulance_requests')}
            if 'hospital_id' in cols:
                print("[DOWNGRADE] Removing hospital_id column from ambulance_requests...")
                try:
                    conn.execute(text("ALTER TABLE ambulance_requests DROP COLUMN hospital_id"))
                    conn.commit()
                except Exception:
                    # SQLite fallback if DROP COLUMN not directly supported
                    conn.execute(text("PRAGMA foreign_keys=OFF"))
                    conn.execute(text("""
                        CREATE TABLE ambulance_requests_backup (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            idempotency_key VARCHAR(64) UNIQUE,
                            user_id INTEGER REFERENCES users(id),
                            patient_name VARCHAR(100) NOT NULL,
                            phone VARCHAR(30) NOT NULL,
                            emergency_type VARCHAR(100) NOT NULL,
                            pickup_location VARCHAR(255) NOT NULL,
                            destination_hospital VARCHAR(150) NOT NULL,
                            patients_count INTEGER DEFAULT 1,
                            additional_info TEXT,
                            status VARCHAR(30) NOT NULL DEFAULT 'Pending',
                            assigned_ambulance_id INTEGER REFERENCES ambulances(id),
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    """))
                    conn.execute(text("""
                        INSERT INTO ambulance_requests_backup (id, idempotency_key, user_id, patient_name, phone, emergency_type, pickup_location, destination_hospital, patients_count, additional_info, status, assigned_ambulance_id, created_at)
                        SELECT id, idempotency_key, user_id, patient_name, phone, emergency_type, pickup_location, destination_hospital, patients_count, additional_info, status, assigned_ambulance_id, created_at
                        FROM ambulance_requests
                    """))
                    conn.execute(text("DROP TABLE ambulance_requests"))
                    conn.execute(text("ALTER TABLE ambulance_requests_backup RENAME TO ambulance_requests"))
                    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_ambulance_requests_idempotency_key ON ambulance_requests(idempotency_key)"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_ambulance_requests_status ON ambulance_requests(status)"))
                    conn.execute(text("PRAGMA foreign_keys=ON"))
                    conn.commit()
                remove_object_provenance(conn, MIGRATION_VERSION, "column", "ambulance_requests", "hospital_id")

        # 4. Remove version from schema_migrations
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
