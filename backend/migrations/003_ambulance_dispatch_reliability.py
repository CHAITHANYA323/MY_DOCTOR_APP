"""
Migration: 003_ambulance_dispatch_reliability
Version: 003_ambulance_dispatch_reliability
Stage: Phase 5 Emergency & Ambulance Dispatch Reliability

Purpose:
- Validates status integrity of ambulances and ambulance_requests before schema mutation.
- Detects existing duplicate active dispatches on the same ambulance and fails closed safely.
- Creates dialect-appropriate uniqueness enforcement preventing double-dispatch:
  * SQLite / PostgreSQL: Partial unique index on ambulance_requests(assigned_ambulance_id)
    where status IN ('Dispatched', 'Arrived') AND assigned_ambulance_id IS NOT NULL.
  * MySQL 8.0+: Functional unique index on active dispatches.
- Guarantees durable downgrade provenance tracking (CREATED -> DROPPING -> DDL -> DROPPED).
- Strictly fails closed without mutating or dropping legacy records if pre-conditions fail.
"""

import sys
import os
import argparse
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import create_engine, text, inspect

MIGRATION_VERSION = "003_ambulance_dispatch_reliability"
VALID_AMBULANCE_STATUSES = ('Available', 'On Duty', 'Maintenance')
VALID_REQUEST_STATUSES = ('Pending', 'Dispatched', 'Arrived', 'Completed', 'Cancelled')
ACTIVE_DISPATCH_STATUSES = ('Dispatched', 'Arrived')


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
    """Returns recorded provenance status ('CREATED', 'CREATING', 'DROPPING', 'DROPPED', 'PRE_EXISTING') or None."""
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
            "now": datetime.now(timezone.utc),
        }
    )
    connection.commit()


def delete_object_provenance(connection, version: str, obj_type: str, table_name: str, obj_name: str):
    """Removes a provenance record upon successful drop and commits immediately."""
    inspector = inspect(connection)
    if not inspector.has_table('migration_managed_objects'):
        return
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


def check_is_applied(connection) -> bool:
    """Strictly read-only check for whether 003_ambulance_dispatch_reliability is already recorded in schema_migrations."""
    inspector = inspect(connection)
    if not inspector.has_table('schema_migrations'):
        return False
    row = connection.execute(
        text("SELECT version FROM schema_migrations WHERE version = :ver"),
        {"ver": MIGRATION_VERSION}
    ).fetchone()
    return row is not None


def check_preconditions(connection):
    """
    Strict precondition validation gate:
    1. Table 'ambulances' must exist.
    2. Table 'ambulance_requests' must exist.
    3. All existing ambulances must have valid status.
    4. All existing ambulance_requests must have valid status.
    5. No duplicate active assignments on the same ambulance across 'Dispatched' or 'Arrived'.
    """
    inspector = inspect(connection)
    if not inspector.has_table('ambulances'):
        raise MigrationPreconditionError("Precondition failed: table 'ambulances' does not exist.")
    if not inspector.has_table('ambulance_requests'):
        raise MigrationPreconditionError("Precondition failed: table 'ambulance_requests' does not exist.")

    # 1. Check for invalid ambulance statuses
    amb_rows = connection.execute(text("SELECT id, status FROM ambulances")).fetchall()
    invalid_amb = [f"ID {r[0]}: status='{r[1]}'" for r in amb_rows if r[1] not in VALID_AMBULANCE_STATUSES]
    if invalid_amb:
        raise MigrationPreconditionError(
            f"Precondition failed: found {len(invalid_amb)} ambulance record(s) with invalid status: {', '.join(invalid_amb)}"
        )

    # 2. Check for invalid request statuses
    req_rows = connection.execute(text("SELECT id, status FROM ambulance_requests")).fetchall()
    invalid_req = [f"ID {r[0]}: status='{r[1]}'" for r in req_rows if r[1] not in VALID_REQUEST_STATUSES]
    if invalid_req:
        raise MigrationPreconditionError(
            f"Precondition failed: found {len(invalid_req)} request record(s) with invalid status: {', '.join(invalid_req)}"
        )

    # 3. Check for conflicting duplicate active assignments on the same ambulance
    dupes = connection.execute(text("""
        SELECT assigned_ambulance_id, COUNT(*) as active_count
        FROM ambulance_requests
        WHERE status IN ('Dispatched', 'Arrived')
          AND assigned_ambulance_id IS NOT NULL
        GROUP BY assigned_ambulance_id
        HAVING COUNT(*) > 1
    """)).fetchall()

    if dupes:
        dupe_details = [f"Ambulance ID {d[0]} has {d[1]} active dispatches" for d in dupes]
        raise MigrationPreconditionError(
            f"Precondition failed: found conflicting duplicate active ambulance dispatches: {', '.join(dupe_details)}. "
            "Manual resolution required before applying uniqueness constraint."
        )


def inspect_managed_objects(connection, dialect_name: str):
    """
    Inspects physical database state and recorded provenance for all migration-managed objects.
    Managed object for 003_ambulance_dispatch_reliability:
    - index 'uq_active_ambulance_dispatch' on 'ambulance_requests'
    """
    idx_phys = False
    if dialect_name == 'sqlite':
        row = connection.execute(text("""
            SELECT name FROM sqlite_master 
            WHERE type = 'index' AND name = 'uq_active_ambulance_dispatch'
        """)).fetchone()
        idx_phys = (row is not None and row[0] is not None)
    elif dialect_name == 'postgresql':
        row = connection.execute(text("""
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'ambulance_requests' AND indexname = 'uq_active_ambulance_dispatch'
        """)).fetchone()
        idx_phys = (row is not None and row[0] is not None)
    elif dialect_name == 'mysql':
        row = connection.execute(text("""
            SELECT index_name FROM information_schema.statistics 
            WHERE table_name = 'ambulance_requests' 
              AND index_name = 'uq_active_ambulance_dispatch' 
              AND table_schema = DATABASE()
        """)).fetchone()
        idx_phys = (row is not None and row[0] is not None)

    idx_status = get_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_active_ambulance_dispatch')

    return [{
        'object_type': 'index',
        'table_name': 'ambulance_requests',
        'object_name': 'uq_active_ambulance_dispatch',
        'physically_exists': idx_phys,
        'recorded_status': idx_status
    }]


def validate_downgrade_preflight(managed_objects):
    """
    Validates managed objects before downgrade begins.
    Fails closed if provenance is inconsistent with recorded status.
    """
    for obj in managed_objects:
        obj_name = obj['object_name']
        obj_type = obj['object_type']
        rec_status = obj['recorded_status']
        phys_exists = obj['physically_exists']

        if rec_status == 'DROPPED':
            if phys_exists:
                raise DowngradeReconciliationError(
                    f"Inconsistent state: {obj_type} '{obj_name}' is recorded as DROPPED "
                    "but is physically present in the database. Manual reconciliation required."
                )
        elif rec_status == 'CREATED':
            if not phys_exists:
                raise DowngradeReconciliationError(
                    f"Missing object: {obj_type} '{obj_name}' was recorded as CREATED "
                    "by this migration but is physically missing. Aborting downgrade to prevent corruption."
                )
        elif rec_status == 'DROPPING':
            # Interrupted previous downgrade, safe to resume drop
            pass
        elif rec_status == 'PRE_EXISTING':
            # Should never drop pre-existing objects
            pass
        else:
            raise DowngradeReconciliationError(
                f"Cannot downgrade: {obj_type} '{obj_name}' has unrecognized status '{rec_status}'. "
                "Manual intervention required."
            )


def upgrade(connection):
    """
    Applies migration 003_ambulance_dispatch_reliability:
    1. Verifies pre-conditions (status integrity and no active duplicate assignments).
    2. Creates partial unique index uq_active_ambulance_dispatch.
    3. Records provenance in migration_managed_objects.
    4. Records version in schema_migrations.
    """
    dialect_name = connection.dialect.name.lower()
    ensure_migrations_table(connection)
    ensure_ownership_table(connection)

    if check_is_applied(connection):
        print(f"[Migration Notice] Version '{MIGRATION_VERSION}' is already applied. Skipping.")
        return

    print(f"[Migration] Running pre-flight checks for {MIGRATION_VERSION} on {dialect_name}...")
    check_preconditions(connection)

    # Check if index physically exists prior to this migration
    objects = inspect_managed_objects(connection, dialect_name)
    idx_obj = objects[0]

    if idx_obj['physically_exists']:
        if idx_obj['recorded_status'] is None:
            # Pre-existing object outside this migration
            record_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_active_ambulance_dispatch', 'PRE_EXISTING')
            print("[Migration Notice] Index 'uq_active_ambulance_dispatch' already physically exists. Marked as PRE_EXISTING.")
        elif idx_obj['recorded_status'] == 'CREATING':
            # Interrupted upgrade: index was physically created before crash/interrupt
            record_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_active_ambulance_dispatch', 'CREATED')
            print("[Migration Notice] Interrupted upgrade recovered: index marked as CREATED.")
        elif idx_obj['recorded_status'] == 'PRE_EXISTING':
            # Preserve PRE_EXISTING unchanged
            print("[Migration Notice] Index 'uq_active_ambulance_dispatch' is already recorded as PRE_EXISTING.")
    else:
        # Mark as CREATING then execute DDL
        record_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_active_ambulance_dispatch', 'CREATING')

        print(f"[Migration] Creating partial unique index 'uq_active_ambulance_dispatch' on dialect: {dialect_name}...")
        if dialect_name in ('sqlite', 'postgresql'):
            connection.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_active_ambulance_dispatch 
                ON ambulance_requests (assigned_ambulance_id) 
                WHERE status IN ('Dispatched', 'Arrived') AND assigned_ambulance_id IS NOT NULL
            """))
        elif dialect_name == 'mysql':
            connection.execute(text("""
                CREATE UNIQUE INDEX uq_active_ambulance_dispatch 
                ON ambulance_requests (
                    (CASE WHEN status IN ('Dispatched', 'Arrived') AND assigned_ambulance_id IS NOT NULL THEN assigned_ambulance_id ELSE NULL END)
                )
            """))
        else:
            raise NotImplementedError(f"Unsupported database dialect: {dialect_name}")

        record_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_active_ambulance_dispatch', 'CREATED')

    # Record migration version in schema_migrations
    connection.execute(
        text("INSERT INTO schema_migrations (version, applied_at) VALUES (:ver, :now)"),
        {"ver": MIGRATION_VERSION, "now": datetime.now(timezone.utc)}
    )
    connection.commit()
    print(f"[Migration Success] Successfully applied '{MIGRATION_VERSION}'.")


def downgrade(connection):
    """
    Reverts migration 003_ambulance_dispatch_reliability:
    1. Verifies downgrade preflight checks on managed index.
    2. Drops partial unique index uq_active_ambulance_dispatch (only if CREATED by this migration).
    3. Cleans up provenance records and schema_migrations version.
    """
    dialect_name = connection.dialect.name.lower()
    ensure_migrations_table(connection)
    ensure_ownership_table(connection)

    if not check_is_applied(connection):
        print(f"[Migration Notice] Version '{MIGRATION_VERSION}' is not currently applied. Skipping downgrade.")
        return

    print(f"[Migration] Inspecting managed objects for downgrade ({dialect_name})...")
    managed_objects = inspect_managed_objects(connection, dialect_name)
    validate_downgrade_preflight(managed_objects)

    idx_obj = managed_objects[0]
    if idx_obj['recorded_status'] in ('CREATED', 'DROPPING'):
        record_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_active_ambulance_dispatch', 'DROPPING')
        print(f"[Migration] Dropping partial unique index 'uq_active_ambulance_dispatch' ({dialect_name})...")
        if dialect_name == 'mysql':
            connection.execute(text("ALTER TABLE ambulance_requests DROP INDEX uq_active_ambulance_dispatch"))
        else:
            connection.execute(text("DROP INDEX IF EXISTS uq_active_ambulance_dispatch"))
        delete_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_active_ambulance_dispatch')
    elif idx_obj['recorded_status'] == 'PRE_EXISTING':
        print("[Migration Notice] Index 'uq_active_ambulance_dispatch' was PRE_EXISTING. Preserving index.")
        delete_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_active_ambulance_dispatch')

    # Remove version from schema_migrations
    connection.execute(
        text("DELETE FROM schema_migrations WHERE version = :ver"),
        {"ver": MIGRATION_VERSION}
    )
    connection.commit()
    print(f"[Migration Success] Successfully reverted '{MIGRATION_VERSION}'.")


def main():
    parser = argparse.ArgumentParser(description="Migration 003: Ambulance Dispatch Reliability")
    parser.add_argument('--upgrade', action='store_true', help="Apply migration")
    parser.add_argument('--downgrade', action='store_true', help="Revert migration")
    parser.add_argument('--check', action='store_true', help="Check migration status")
    parser.add_argument('--db-url', type=str, help="Database connection URL", default=None)
    args = parser.parse_args()

    db_url = args.db_url or os.environ.get('DATABASE_URL')
    if not db_url:
        print("[Error] No database URL provided. Set DATABASE_URL or pass --db-url.")
        sys.exit(1)

    engine = create_engine(db_url)
    with engine.connect() as conn:
        if args.check:
            applied = check_is_applied(conn)
            print(f"Migration {MIGRATION_VERSION}: {'APPLIED' if applied else 'NOT APPLIED'}")
        elif args.downgrade:
            downgrade(conn)
        elif args.upgrade:
            upgrade(conn)
        else:
            parser.print_help()


if __name__ == '__main__':
    main()

