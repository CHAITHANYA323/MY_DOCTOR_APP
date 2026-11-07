"""
Migration: 002_review_reliability
Version: 002_review_reliability
Stage: Phase 4 Reviews & Ratings Security & Reliability

Purpose:
- Validates review data integrity (checks for existing duplicate appointment_ids or invalid ratings).
- Safely adds 'appointment_id' column to 'reviews' table (foreign key to appointments.id).
- Allows existing legacy reviews to retain appointment_id = NULL without data loss.
- Creates unique index/constraint 'uq_review_appointment' on reviews(appointment_id)
  to guarantee at most one review per appointment across SQLite, PostgreSQL, and MySQL.
- Preserves dialect compatibility and maintains durable downgrade protocol:
  * PRE_EXISTING objects are preserved and never dropped.
  * CREATED -> DROPPING -> DDL -> DROPPED transitions.
  * Pre-flight gate verifies all managed objects before any mutation.
- Manages version tracking via schema_migrations and migration_managed_objects tables.
"""

import sys
import os
import re
import argparse
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import create_engine, text, inspect

MIGRATION_VERSION = "002_review_reliability"


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
    """Returns the recorded status ('CREATED', 'CREATING', 'DROPPING', 'DROPPED', 'PRE_EXISTING') or None."""
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
    """Strictly read-only check for whether 002_review_reliability is already recorded in schema_migrations."""
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
    1. Table 'reviews' must exist.
    2. Table 'appointments' must exist.
    3. All existing reviews must have valid rating (1-5).
    4. If 'appointment_id' column already exists in 'reviews', check for duplicate or orphan values.
    """
    inspector = inspect(connection)
    if not inspector.has_table('reviews'):
        raise MigrationPreconditionError("Precondition failed: table 'reviews' does not exist.")
    if not inspector.has_table('appointments'):
        raise MigrationPreconditionError("Precondition failed: table 'appointments' does not exist.")

    # Check for invalid ratings in existing reviews
    invalid_ratings = connection.execute(text("""
        SELECT id, rating FROM reviews 
        WHERE rating IS NULL OR rating < 1 OR rating > 5
    """)).fetchall()
    if invalid_ratings:
        raise MigrationPreconditionError(
            f"Precondition failed: found {len(invalid_ratings)} review(s) with invalid ratings: {invalid_ratings}"
        )

    # Check if appointment_id column already exists
    dialect_name = connection.dialect.name.lower()
    col_exists = False
    if dialect_name == 'sqlite':
        columns = [row[1] for row in connection.execute(text("PRAGMA table_info(reviews)")).fetchall()]
        col_exists = 'appointment_id' in columns
    elif dialect_name == 'postgresql':
        res = connection.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'reviews' AND column_name = 'appointment_id'
        """)).fetchone()
        col_exists = res is not None
    elif dialect_name == 'mysql':
        res = connection.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'reviews' AND column_name = 'appointment_id' AND table_schema = DATABASE()
        """)).fetchone()
        col_exists = res is not None

    if col_exists:
        # Check for duplicates on existing non-null appointment_id
        dupes = connection.execute(text("""
            SELECT appointment_id, COUNT(*) FROM reviews 
            WHERE appointment_id IS NOT NULL 
            GROUP BY appointment_id HAVING COUNT(*) > 1
        """)).fetchall()
        if dupes:
            raise MigrationPreconditionError(
                f"Precondition failed: found duplicate reviews for appointment_id: {dupes}"
            )

        # Check for orphan appointment_ids
        orphans = connection.execute(text("""
            SELECT r.id, r.appointment_id FROM reviews r 
            LEFT JOIN appointments a ON r.appointment_id = a.id 
            WHERE r.appointment_id IS NOT NULL AND a.id IS NULL
        """)).fetchall()
        if orphans:
            raise MigrationPreconditionError(
                f"Precondition failed: found orphan reviews referencing non-existent appointments: {orphans}"
            )


def inspect_managed_objects(connection, dialect_name: str):
    """
    Inspects physical database state and recorded provenance for all migration-managed objects.
    Managed objects for 002_review_reliability:
    - column 'appointment_id' on 'reviews'
    - index 'uq_review_appointment' on 'reviews'
    """
    objects = []

    # 1. Index uq_review_appointment
    idx_phys = False
    if dialect_name == 'sqlite':
        row = connection.execute(text("""
            SELECT name FROM sqlite_master 
            WHERE type = 'index' AND name = 'uq_review_appointment'
        """)).fetchone()
        idx_phys = (row is not None and row[0] is not None)
    elif dialect_name == 'postgresql':
        row = connection.execute(text("""
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'reviews' AND indexname = 'uq_review_appointment'
        """)).fetchone()
        idx_phys = (row is not None and row[0] is not None)
    elif dialect_name == 'mysql':
        row = connection.execute(text("""
            SELECT index_name FROM information_schema.statistics 
            WHERE table_name = 'reviews' AND index_name = 'uq_review_appointment' AND table_schema = DATABASE()
        """)).fetchone()
        idx_phys = (row is not None and row[0] is not None)

    idx_status = get_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment')
    objects.append({
        'object_type': 'index',
        'table_name': 'reviews',
        'object_name': 'uq_review_appointment',
        'physically_exists': idx_phys,
        'recorded_status': idx_status
    })

    # 2. Column appointment_id
    col_phys = False
    if dialect_name == 'sqlite':
        columns = [row[1] for row in connection.execute(text("PRAGMA table_info(reviews)")).fetchall()]
        col_phys = 'appointment_id' in columns
    elif dialect_name == 'postgresql':
        row = connection.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'reviews' AND column_name = 'appointment_id'
        """)).fetchone()
        col_phys = (row is not None and row[0] is not None)
    elif dialect_name == 'mysql':
        row = connection.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'reviews' AND column_name = 'appointment_id' AND table_schema = DATABASE()
        """)).fetchone()
        col_phys = (row is not None and row[0] is not None)

    col_status = get_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id')
    objects.append({
        'object_type': 'column',
        'table_name': 'reviews',
        'object_name': 'appointment_id',
        'physically_exists': col_phys,
        'recorded_status': col_status
    })

    return objects


def validate_downgrade_preflight(managed_objects):
    """
    Validates ALL managed objects together before any downgrade mutation begins.
    Aborts with DowngradeReconciliationError if:
    - An object is recorded as CREATED or PRE_EXISTING but physically missing.
    - An object has status CREATING, DROPPING, or an unrecognized status.
    - An object has no recorded provenance.
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
            continue

        if rec_status == 'CREATED':
            if not phys_exists:
                raise DowngradeReconciliationError(
                    f"Safety check failed: {obj_type} '{obj_name}' has provenance 'CREATED' "
                    "but is physically absent from the database before downgrade started. "
                    "Cannot verify if an interrupted downgrade or out-of-band manual drop occurred. "
                    "Refusing to silently delete records. Manual reconciliation required."
                )

        elif rec_status == 'PRE_EXISTING':
            if not phys_exists:
                raise DowngradeReconciliationError(
                    f"Safety check failed: {obj_type} '{obj_name}' has provenance 'PRE_EXISTING' "
                    "but is physically absent from the database. Manual reconciliation required."
                )

        elif rec_status in ('CREATING', 'DROPPING'):
            raise DowngradeReconciliationError(
                f"Safety check failed: {obj_type} '{obj_name}' is in transitional state '{rec_status}'. "
                "A previous operation was interrupted. Manual inspection and reconciliation required."
            )

        elif rec_status is None:
            raise DowngradeReconciliationError(
                f"Missing provenance: {obj_type} '{obj_name}' has no recorded provenance "
                "in migration_managed_objects. Cannot safely downgrade without verified ownership."
            )

        else:
            raise DowngradeReconciliationError(
                f"Unrecognized provenance status '{rec_status}' for {obj_type} '{obj_name}'. "
                "Manual reconciliation required."
            )


def upgrade(engine):
    """
    Applies migration 002_review_reliability:
    1. One-time SQLite WAL mode initialization on a dedicated AUTOCOMMIT connection.
    2. Read-only applied status check.
    3. Strict precondition checks (runs BEFORE ANY schema mutation).
    4. Migration version tracking table creation.
    5. Dialect-specific DDL:
       - Adds 'appointment_id' column to reviews.
       - Creates unique index 'uq_review_appointment'.
    6. Migration version recording.
    """
    dialect_name = engine.name.lower()

    if dialect_name == 'sqlite':
        try:
            with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as wal_conn:
                wal_mode = wal_conn.execute(text("PRAGMA journal_mode=WAL")).scalar()
                if str(wal_mode).lower() != 'wal':
                    print(f"[Migration Warning] SQLite WAL mode rejected; current mode is '{wal_mode}'.")
                else:
                    print(f"[Migration] SQLite WAL mode successfully verified: {wal_mode.upper()}")
        except Exception as e:
            print(f"[Migration Warning] Failed to initialize SQLite WAL mode: {e}")

    with engine.connect() as connection:
        if check_is_applied(connection):
            print(f"[Migration Notice] Version '{MIGRATION_VERSION}' is already applied.")
            return True

        # Precondition Gate
        check_preconditions(connection)

        print(f"[Migration] Executing upgrade for dialect: {dialect_name}...")
        ensure_migrations_table(connection)
        ensure_ownership_table(connection)

        if dialect_name == 'sqlite':
            # 1. Add appointment_id column
            columns = [row[1] for row in connection.execute(text("PRAGMA table_info(reviews)")).fetchall()]
            col_exists = 'appointment_id' in columns
            col_prov = get_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id')

            if not col_exists:
                print("[Migration] Adding column 'appointment_id' to reviews...")
                record_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id', 'CREATING')
                connection.execute(text("ALTER TABLE reviews ADD COLUMN appointment_id INTEGER REFERENCES appointments(id)"))
                record_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id', 'CREATED')
            else:
                if col_prov == 'CREATING':
                    record_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id', 'CREATED')
                elif col_prov != 'CREATED':
                    record_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id', 'PRE_EXISTING')
                print("[Migration] Column 'appointment_id' already exists. Skipping ADD COLUMN.")

            # 2. Create unique index uq_review_appointment
            row = connection.execute(text("""
                SELECT sql FROM sqlite_master 
                WHERE type = 'index' AND name = 'uq_review_appointment'
            """)).fetchone()
            idx_exists = (row is not None and row[0] is not None)
            idx_prov = get_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment')

            if not idx_exists:
                print("[Migration] Creating unique index 'uq_review_appointment' on reviews(appointment_id)...")
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment', 'CREATING')
                connection.execute(text("""
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_review_appointment 
                    ON reviews (appointment_id) 
                    WHERE appointment_id IS NOT NULL
                """))
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment', 'CREATED')
            else:
                if idx_prov == 'CREATING':
                    record_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment', 'CREATED')
                elif idx_prov != 'CREATED':
                    record_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment', 'PRE_EXISTING')
                print("[Migration] Detected existing index 'uq_review_appointment'. Skipping CREATE INDEX.")

        elif dialect_name == 'postgresql':
            # 1. Add appointment_id column
            res = connection.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'reviews' AND column_name = 'appointment_id'
            """)).fetchone()
            col_exists = res is not None
            col_prov = get_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id')

            if not col_exists:
                print("[Migration] Adding column 'appointment_id' to reviews...")
                record_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id', 'CREATING')
                connection.execute(text("""
                    ALTER TABLE reviews ADD COLUMN appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL
                """))
                record_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id', 'CREATED')
            else:
                if col_prov == 'CREATING':
                    record_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id', 'CREATED')
                elif col_prov != 'CREATED':
                    record_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id', 'PRE_EXISTING')
                print("[Migration] Column 'appointment_id' already exists. Skipping ADD COLUMN.")

            # 2. Create unique index
            res = connection.execute(text("""
                SELECT indexname FROM pg_indexes 
                WHERE tablename = 'reviews' AND indexname = 'uq_review_appointment'
            """)).fetchone()
            idx_exists = res is not None
            idx_prov = get_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment')

            if not idx_exists:
                print("[Migration] Creating unique index 'uq_review_appointment'...")
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment', 'CREATING')
                connection.execute(text("""
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_review_appointment 
                    ON reviews (appointment_id) 
                    WHERE appointment_id IS NOT NULL
                """))
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment', 'CREATED')
            else:
                if idx_prov == 'CREATING':
                    record_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment', 'CREATED')
                elif idx_prov != 'CREATED':
                    record_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment', 'PRE_EXISTING')
                print("[Migration] Detected existing index 'uq_review_appointment'. Skipping CREATE INDEX.")

        elif dialect_name == 'mysql':
            # 1. Add appointment_id column and foreign key
            res = connection.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'reviews' AND column_name = 'appointment_id' AND table_schema = DATABASE()
            """)).fetchone()
            col_exists = res is not None
            col_prov = get_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id')

            if not col_exists:
                print("[Migration] Adding column 'appointment_id' and foreign key to reviews...")
                record_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id', 'CREATING')
                connection.execute(text("""
                    ALTER TABLE reviews 
                    ADD COLUMN appointment_id INT NULL,
                    ADD CONSTRAINT fk_rev_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
                """))
                record_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id', 'CREATED')
            else:
                if col_prov == 'CREATING':
                    record_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id', 'CREATED')
                elif col_prov != 'CREATED':
                    record_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id', 'PRE_EXISTING')
                print("[Migration] Column 'appointment_id' already exists. Skipping ADD COLUMN.")

            # 2. Add unique constraint/index
            res = connection.execute(text("""
                SELECT index_name FROM information_schema.statistics 
                WHERE table_name = 'reviews' AND index_name = 'uq_review_appointment' AND table_schema = DATABASE()
            """)).fetchone()
            idx_exists = res is not None
            idx_prov = get_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment')

            if not idx_exists:
                print("[Migration] Adding unique constraint 'uq_review_appointment'...")
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment', 'CREATING')
                connection.execute(text("""
                    ALTER TABLE reviews ADD CONSTRAINT uq_review_appointment UNIQUE (appointment_id)
                """))
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment', 'CREATED')
            else:
                if idx_prov == 'CREATING':
                    record_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment', 'CREATED')
                elif idx_prov != 'CREATED':
                    record_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment', 'PRE_EXISTING')
                print("[Migration] Detected existing constraint 'uq_review_appointment'. Skipping ADD CONSTRAINT.")

        # Record migration version
        connection.execute(
            text("""
                INSERT INTO schema_migrations (version, applied_at)
                VALUES (:ver, :now)
            """),
            {"ver": MIGRATION_VERSION, "now": datetime.now(timezone.utc)}
        )
        connection.commit()
        print(f"[Migration Success] Successfully applied '{MIGRATION_VERSION}'.")
        return True


def downgrade(engine):
    """
    Safely reverts migration 002_review_reliability following durable downgrade protocol:
    1. Pre-flight validation gate of ALL managed objects before any DDL.
    2. Durable state transitions (CREATED -> DROPPING -> DDL -> DROPPED).
    3. Preserves PRE_EXISTING objects.
    4. Purges migration records only upon 100% conclusive downgrade completion.
    """
    with engine.connect() as connection:
        dialect_name = engine.name.lower()
        is_applied = check_is_applied(connection)
        inspector = inspect(connection)
        has_provenance_table = inspector.has_table('migration_managed_objects')
        provenance_count = 0
        if has_provenance_table:
            provenance_count = connection.execute(
                text("SELECT COUNT(*) FROM migration_managed_objects WHERE migration_version = :ver"),
                {"ver": MIGRATION_VERSION}
            ).scalar() or 0

        has_partial_provenance = (provenance_count > 0)

        if not is_applied and not has_partial_provenance:
            print(f"[Migration Notice] Version '{MIGRATION_VERSION}' is not currently applied.")
            return True

        if is_applied and not has_partial_provenance:
            managed_objects = inspect_managed_objects(connection, dialect_name)
            if any(obj['physically_exists'] for obj in managed_objects):
                raise DowngradeReconciliationError(
                    f"Cannot verify ownership: Migration '{MIGRATION_VERSION}' is marked as applied in schema_migrations, "
                    "but no provenance records exist in migration_managed_objects while physical objects are present. "
                    "Refusing to drop objects or purge records without proof of ownership. Operator reconciliation required."
                )
            else:
                raise DowngradeReconciliationError(
                    f"Cannot verify ownership: Migration '{MIGRATION_VERSION}' is marked in schema_migrations, "
                    "but has zero provenance records and physical objects are absent. Inconsistent state. "
                    "Refusing to silently purge migration records. Operator reconciliation required."
                )

        print(f"[Migration] Inspecting managed objects for downgrade ({dialect_name})...")
        managed_objects = inspect_managed_objects(connection, dialect_name)

        # Pre-flight Gate
        validate_downgrade_preflight(managed_objects)

        print(f"[Migration] Reverting migration for dialect: {dialect_name}...")

        idx_obj = next(o for o in managed_objects if o['object_type'] == 'index')
        col_obj = next(o for o in managed_objects if o['object_type'] == 'column')

        # 1. Drop index first
        if idx_obj['recorded_status'] == 'PRE_EXISTING':
            print("[Migration] Preserving pre-existing index 'uq_review_appointment' (not created by this migration).")
        elif idx_obj['recorded_status'] == 'DROPPED':
            print("[Migration] Resuming downgrade: index 'uq_review_appointment' was already dropped in prior run.")
        elif idx_obj['recorded_status'] == 'CREATED':
            print("[Migration] Dropping unique index 'uq_review_appointment'...")
            record_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment', 'DROPPING')
            if dialect_name in ('sqlite', 'postgresql'):
                connection.execute(text("DROP INDEX IF EXISTS uq_review_appointment"))
            elif dialect_name == 'mysql':
                connection.execute(text("ALTER TABLE reviews DROP INDEX uq_review_appointment"))
            record_object_provenance(connection, MIGRATION_VERSION, 'index', 'reviews', 'uq_review_appointment', 'DROPPED')

        # 2. Drop column second
        if col_obj['recorded_status'] == 'PRE_EXISTING':
            print("[Migration] Preserving pre-existing column 'appointment_id' (not created by this migration).")
        elif col_obj['recorded_status'] == 'DROPPED':
            print("[Migration] Resuming downgrade: column 'appointment_id' was already dropped in prior run.")
        elif col_obj['recorded_status'] == 'CREATED':
            print("[Migration] Dropping column 'appointment_id'...")
            record_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id', 'DROPPING')
            if dialect_name == 'sqlite':
                connection.execute(text("ALTER TABLE reviews DROP COLUMN appointment_id"))
            elif dialect_name == 'postgresql':
                connection.execute(text("ALTER TABLE reviews DROP COLUMN IF EXISTS appointment_id CASCADE"))
            elif dialect_name == 'mysql':
                # Try dropping FK first, then column
                try:
                    connection.execute(text("ALTER TABLE reviews DROP FOREIGN KEY fk_rev_appointment"))
                except Exception:
                    pass
                connection.execute(text("ALTER TABLE reviews DROP COLUMN appointment_id"))
            record_object_provenance(connection, MIGRATION_VERSION, 'column', 'reviews', 'appointment_id', 'DROPPED')

        # Clean up version tracking and provenance table only when all objects have been safely handled
        if is_applied:
            connection.execute(
                text("DELETE FROM schema_migrations WHERE version = :ver"),
                {"ver": MIGRATION_VERSION}
            )
        connection.execute(
            text("DELETE FROM migration_managed_objects WHERE migration_version = :ver"),
            {"ver": MIGRATION_VERSION}
        )
        connection.commit()

        if is_applied:
            print(f"[Migration Success] Successfully reverted '{MIGRATION_VERSION}'.")
        else:
            print(f"[Migration Success] Successfully cleaned up partially applied migration '{MIGRATION_VERSION}'.")
        return True


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Review Reliability Migration 002")
    parser.add_argument("action", choices=["upgrade", "downgrade", "status", "audit"], default="status", nargs="?")
    parser.add_argument("--db-uri", default=None, help="Database connection URI")
    args = parser.parse_args()

    if args.db_uri:
        uri = args.db_uri
    else:
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
        from config import Config
        uri = Config.get_database_uri()

    engine = create_engine(uri)

    if args.action == "upgrade":
        upgrade(engine)
    elif args.action == "downgrade":
        downgrade(engine)
    elif args.action == "status":
        with engine.connect() as conn:
            applied = check_is_applied(conn)
            print(f"Migration {MIGRATION_VERSION}: {'APPLIED' if applied else 'PENDING'}")
    elif args.action == "audit":
        with engine.connect() as conn:
            managed = inspect_managed_objects(conn, engine.name.lower())
            print(f"Managed Objects for {MIGRATION_VERSION}:")
            for obj in managed:
                print(f" - {obj['object_type']} {obj['object_name']}: exists={obj['physically_exists']}, provenance={obj['recorded_status']}")

