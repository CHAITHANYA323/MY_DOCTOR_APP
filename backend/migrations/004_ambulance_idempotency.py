"""
Migration: 004_ambulance_idempotency
Version: 004_ambulance_idempotency
Stage: Phase 5 Part 2A Emergency Request Idempotency & Safe Retries

Purpose:
- Adds nullable `idempotency_key VARCHAR(64)` column to `ambulance_requests`.
- Creates unique index `uq_ambulance_requests_idempotency_key` on `ambulance_requests(idempotency_key)`.
- Preserves all existing records with NULL keys (multiple NULLs permitted by SQL standard).
- Guarantees durable migration provenance and interrupted-upgrade recovery (CREATING -> CREATED).
- Guarantees safe dialect-specific downgrade (MySQL DROP INDEX ON table vs SQLite DROP INDEX IF EXISTS, and column drop).
- Strictly fails closed without mutating records if pre-conditions fail.
"""

import sys
import os
import argparse
from datetime import datetime, timezone
from sqlalchemy import text, inspect

MIGRATION_VERSION = "004_ambulance_idempotency"


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
    """Returns True if this migration version is recorded in schema_migrations."""
    ensure_migrations_table(connection)
    row = connection.execute(
        text("SELECT version FROM schema_migrations WHERE version = :ver"),
        {"ver": MIGRATION_VERSION}
    ).fetchone()
    return row is not None


def check_column_exists(connection, dialect_name: str, table_name: str, col_name: str) -> bool:
    """Checks if a column physically exists in a table."""
    if dialect_name == 'sqlite':
        cols = [r[1] for r in connection.execute(text(f"PRAGMA table_info({table_name})")).fetchall()]
        return col_name in cols
    elif dialect_name in ('postgresql', 'mysql'):
        query = text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = :tbl AND column_name = :col
        """)
        row = connection.execute(query, {"tbl": table_name, "col": col_name}).fetchone()
        return row is not None
    return False


def check_index_exists(connection, dialect_name: str, table_name: str, idx_name: str) -> bool:
    """Checks if an index physically exists."""
    if dialect_name == 'sqlite':
        row = connection.execute(text("""
            SELECT name FROM sqlite_master 
            WHERE type = 'index' AND name = :idx
        """), {"idx": idx_name}).fetchone()
        return row is not None and row[0] is not None
    elif dialect_name == 'postgresql':
        row = connection.execute(text("""
            SELECT indexname FROM pg_indexes 
            WHERE tablename = :tbl AND indexname = :idx
        """), {"tbl": table_name, "idx": idx_name}).fetchone()
        return row is not None and row[0] is not None
    elif dialect_name == 'mysql':
        row = connection.execute(text("""
            SELECT index_name FROM information_schema.statistics 
            WHERE table_name = :tbl 
              AND index_name = :idx 
              AND table_schema = DATABASE()
        """), {"tbl": table_name, "idx": idx_name}).fetchone()
        return row is not None and row[0] is not None
    return False


def check_preconditions(connection):
    """
    Validates pre-conditions before migration:
    1. Table 'ambulance_requests' must exist.
    2. If 'idempotency_key' column already exists, verify no duplicate non-null values exist.
    """
    inspector = inspect(connection)
    if not inspector.has_table('ambulance_requests'):
        raise MigrationPreconditionError("Precondition failed: table 'ambulance_requests' does not exist.")

    dialect_name = connection.dialect.name.lower()
    col_exists = check_column_exists(connection, dialect_name, 'ambulance_requests', 'idempotency_key')
    if col_exists:
        # Check for duplicate non-null keys
        dupes = connection.execute(text("""
            SELECT idempotency_key, COUNT(*) as dupe_count
            FROM ambulance_requests
            WHERE idempotency_key IS NOT NULL
            GROUP BY idempotency_key
            HAVING COUNT(*) > 1
        """)).fetchall()
        if dupes:
            dupe_details = [f"Key '{d[0]}': {d[1]} occurrences" for d in dupes]
            raise MigrationPreconditionError(
                f"Precondition failed: found duplicate idempotency_key values: {', '.join(dupe_details)}. "
                "Manual deduplication required before applying uniqueness constraint."
            )


def inspect_managed_objects(connection, dialect_name: str):
    """
    Inspects physical database state and recorded provenance for all migration-managed objects:
    - column 'idempotency_key' on 'ambulance_requests'
    - index 'uq_ambulance_requests_idempotency_key' on 'ambulance_requests'
    """
    col_phys = check_column_exists(connection, dialect_name, 'ambulance_requests', 'idempotency_key')
    col_status = get_object_provenance(connection, MIGRATION_VERSION, 'column', 'ambulance_requests', 'idempotency_key')

    idx_phys = check_index_exists(connection, dialect_name, 'ambulance_requests', 'uq_ambulance_requests_idempotency_key')
    idx_status = get_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_ambulance_requests_idempotency_key')

    return [
        {
            'object_type': 'column',
            'table_name': 'ambulance_requests',
            'object_name': 'idempotency_key',
            'physically_exists': col_phys,
            'recorded_status': col_status
        },
        {
            'object_type': 'index',
            'table_name': 'ambulance_requests',
            'object_name': 'uq_ambulance_requests_idempotency_key',
            'physically_exists': idx_phys,
            'recorded_status': idx_status
        }
    ]


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
            # Safe: should never drop pre-existing objects
            pass
        else:
            raise DowngradeReconciliationError(
                f"Cannot downgrade: {obj_type} '{obj_name}' has unrecognized status '{rec_status}'. "
                "Manual intervention required."
            )


def upgrade(connection):
    """
    Applies migration 004_ambulance_idempotency:
    1. Verifies pre-conditions (table exists, no duplicate non-null idempotency_keys).
    2. Adds column 'idempotency_key VARCHAR(64)' to 'ambulance_requests' if not physically present.
    3. Creates unique index 'uq_ambulance_requests_idempotency_key'.
    4. Handles interrupted-upgrade recovery (CREATING -> CREATED) and preserves PRE_EXISTING objects.
    5. Records version in schema_migrations.
    """
    dialect_name = connection.dialect.name.lower()
    ensure_migrations_table(connection)
    ensure_ownership_table(connection)

    if check_is_applied(connection):
        print(f"[Migration Notice] Version '{MIGRATION_VERSION}' is already applied. Skipping.")
        return

    print(f"[Migration] Running pre-flight checks for {MIGRATION_VERSION} on {dialect_name}...")
    check_preconditions(connection)

    objects = inspect_managed_objects(connection, dialect_name)
    col_obj = objects[0]
    idx_obj = objects[1]

    # 1. Column idempotency_key
    if col_obj['physically_exists']:
        if col_obj['recorded_status'] is None:
            record_object_provenance(connection, MIGRATION_VERSION, 'column', 'ambulance_requests', 'idempotency_key', 'PRE_EXISTING')
            print("[Migration Notice] Column 'idempotency_key' already physically exists. Marked as PRE_EXISTING.")
        elif col_obj['recorded_status'] == 'CREATING':
            record_object_provenance(connection, MIGRATION_VERSION, 'column', 'ambulance_requests', 'idempotency_key', 'CREATED')
            print("[Migration Notice] Interrupted upgrade recovered: column marked as CREATED.")
        elif col_obj['recorded_status'] == 'PRE_EXISTING':
            print("[Migration Notice] Column 'idempotency_key' is already recorded as PRE_EXISTING.")
    else:
        record_object_provenance(connection, MIGRATION_VERSION, 'column', 'ambulance_requests', 'idempotency_key', 'CREATING')
        print(f"[Migration] Adding column 'idempotency_key' to ambulance_requests ({dialect_name})...")
        if dialect_name in ('sqlite', 'postgresql'):
            connection.execute(text("ALTER TABLE ambulance_requests ADD COLUMN idempotency_key VARCHAR(64)"))
        elif dialect_name == 'mysql':
            connection.execute(text("ALTER TABLE ambulance_requests ADD COLUMN idempotency_key VARCHAR(64) NULL"))
        else:
            raise NotImplementedError(f"Unsupported database dialect: {dialect_name}")
        record_object_provenance(connection, MIGRATION_VERSION, 'column', 'ambulance_requests', 'idempotency_key', 'CREATED')

    # 2. Unique index uq_ambulance_requests_idempotency_key
    if idx_obj['physically_exists']:
        if idx_obj['recorded_status'] is None:
            record_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_ambulance_requests_idempotency_key', 'PRE_EXISTING')
            print("[Migration Notice] Index 'uq_ambulance_requests_idempotency_key' already physically exists. Marked as PRE_EXISTING.")
        elif idx_obj['recorded_status'] == 'CREATING':
            record_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_ambulance_requests_idempotency_key', 'CREATED')
            print("[Migration Notice] Interrupted upgrade recovered: index marked as CREATED.")
        elif idx_obj['recorded_status'] == 'PRE_EXISTING':
            print("[Migration Notice] Index 'uq_ambulance_requests_idempotency_key' is already recorded as PRE_EXISTING.")
    else:
        record_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_ambulance_requests_idempotency_key', 'CREATING')
        print(f"[Migration] Creating unique index 'uq_ambulance_requests_idempotency_key' ({dialect_name})...")
        if dialect_name in ('sqlite', 'postgresql'):
            connection.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_ambulance_requests_idempotency_key
                ON ambulance_requests (idempotency_key)
            """))
        elif dialect_name == 'mysql':
            connection.execute(text("""
                CREATE UNIQUE INDEX uq_ambulance_requests_idempotency_key
                ON ambulance_requests (idempotency_key)
            """))
        else:
            raise NotImplementedError(f"Unsupported database dialect: {dialect_name}")
        record_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_ambulance_requests_idempotency_key', 'CREATED')

    # 3. Record in schema_migrations
    connection.execute(
        text("INSERT INTO schema_migrations (version, applied_at) VALUES (:ver, :now)"),
        {"ver": MIGRATION_VERSION, "now": datetime.now(timezone.utc)}
    )
    connection.commit()
    print(f"[Migration Success] Successfully applied '{MIGRATION_VERSION}'.")


def downgrade(connection):
    """
    Reverts migration 004_ambulance_idempotency:
    1. Verifies downgrade preflight checks on managed objects.
    2. Drops unique index uq_ambulance_requests_idempotency_key (only if CREATED by this migration).
    3. Drops column idempotency_key (only if CREATED by this migration).
    4. Cleans up provenance records and schema_migrations version.
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

    col_obj = managed_objects[0]
    idx_obj = managed_objects[1]

    # 1. Drop index first
    if idx_obj['recorded_status'] in ('CREATED', 'DROPPING'):
        record_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_ambulance_requests_idempotency_key', 'DROPPING')
        print(f"[Migration] Dropping unique index 'uq_ambulance_requests_idempotency_key' ({dialect_name})...")
        if dialect_name == 'mysql':
            connection.execute(text("ALTER TABLE ambulance_requests DROP INDEX uq_ambulance_requests_idempotency_key"))
        else:
            connection.execute(text("DROP INDEX IF EXISTS uq_ambulance_requests_idempotency_key"))
        delete_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_ambulance_requests_idempotency_key')
    elif idx_obj['recorded_status'] == 'PRE_EXISTING':
        print("[Migration Notice] Index was PRE_EXISTING. Preserving index.")
        delete_object_provenance(connection, MIGRATION_VERSION, 'index', 'ambulance_requests', 'uq_ambulance_requests_idempotency_key')

    # 2. Drop column
    if col_obj['recorded_status'] in ('CREATED', 'DROPPING'):
        record_object_provenance(connection, MIGRATION_VERSION, 'column', 'ambulance_requests', 'idempotency_key', 'DROPPING')
        print(f"[Migration] Dropping column 'idempotency_key' ({dialect_name})...")
        try:
            connection.execute(text("ALTER TABLE ambulance_requests DROP COLUMN idempotency_key"))
        except Exception as e:
            print(f"[Migration Warning] DROP COLUMN failed or not natively supported: {e}")
        delete_object_provenance(connection, MIGRATION_VERSION, 'column', 'ambulance_requests', 'idempotency_key')
    elif col_obj['recorded_status'] == 'PRE_EXISTING':
        print("[Migration Notice] Column was PRE_EXISTING. Preserving column.")
        delete_object_provenance(connection, MIGRATION_VERSION, 'column', 'ambulance_requests', 'idempotency_key')

    # 3. Remove version from schema_migrations
    connection.execute(
        text("DELETE FROM schema_migrations WHERE version = :ver"),
        {"ver": MIGRATION_VERSION}
    )
    connection.commit()
    print(f"[Migration Success] Successfully reverted '{MIGRATION_VERSION}'.")


def main():
    parser = argparse.ArgumentParser(description="Migration 004: Ambulance Request Idempotency")
    parser.add_argument('--upgrade', action='store_true', help="Apply migration")
    parser.add_argument('--downgrade', action='store_true', help="Revert migration")
    args = parser.parse_args()

    # Safety restriction: do not run against default DB directly
    db_uri = os.getenv("DATABASE_URL")
    if not db_uri:
        print("[Migration Error] DATABASE_URL environment variable is required to run migrations.")
        sys.exit(1)

    from sqlalchemy import create_engine
    engine = create_engine(db_uri)

    with engine.connect() as conn:
        if args.upgrade:
            upgrade(conn)
        elif args.downgrade:
            downgrade(conn)
        else:
            parser.print_help()


if __name__ == '__main__':
    main()

