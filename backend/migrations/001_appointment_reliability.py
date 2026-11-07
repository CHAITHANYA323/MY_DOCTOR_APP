"""
Migration: 001_appointment_reliability
Version: 001_appointment_reliability
Stage: Phase 2 Appointment Reliability

Purpose:
- Validates status integrity and rejects invalid or NULL statuses.
- Detects existing duplicate active slots (both exact-string and logically identical normalized slots).
- Aborts safely before performing any schema mutation if unresolved collisions exist.
- Normalizes legacy appointment times into canonical 'hh:mm AM|PM' format across existing records.
- Creates dialect-appropriate uniqueness enforcement:
  * SQLite / PostgreSQL: Partial unique index for 'Pending' and 'Confirmed' appointments.
  * MySQL 8.0+: Stored virtual column (active_slot_key) + unique constraint.
- Ensures 'Cancelled' and 'Completed' appointments release slots and do not block availability.
- Manages version tracking via schema_migrations table.

Database Constraint Compatibility Notes:
- Partial Unique Index (`uq_active_doctor_slot`):
  Supported natively by SQLite 3.8.0+ and PostgreSQL. This index applies directly
  to EXISTING SQLite tables via `CREATE UNIQUE INDEX ... WHERE` without requiring table recreation.
- SQLite Table-Level CHECK Constraint & Nullability:
  SQLite does NOT support `ALTER TABLE ADD CONSTRAINT CHECK (...)` on existing tables.
  Therefore, for existing SQLite databases created before this migration:
  * Database-level uniqueness is fully enforced via the partial unique index.
  * Status validity on existing SQLite databases is enforced at the Python application
    layer (`VALID_STATUSES` in routes and precondition audit checks).
  * On newly created SQLite databases (via SQLAlchemy `create_all()`), the `chk_appointment_status`
    CHECK constraint defined in `models.py` is created as part of the table DDL.
  * If database-level CHECK enforcement is strictly required on a legacy SQLite database,
    it requires the SQLite 12-step table recreation procedure (documented below).
- Dialect Testing Note:
  MySQL and PostgreSQL DDL definitions are dialect-standard and syntactically verified.
  Runtime behavior on MySQL / PostgreSQL is unverified unless tested against live server instances.
"""

import sys
import os
import re
import sqlite3
import argparse
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import create_engine, text, inspect

MIGRATION_VERSION = "001_appointment_reliability"
VALID_STATUSES = ('Pending', 'Confirmed', 'Cancelled', 'Completed')
ACTIVE_STATUSES = ('Pending', 'Confirmed')

TIME_12H_REGEX = re.compile(r'^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$', re.IGNORECASE)
TIME_24H_REGEX = re.compile(r'^([01]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$')


def normalize_migration_time(time_str: str) -> str:
    """
    Validates and normalizes appointment time into canonical 12-hour format: 'hh:mm AM|PM'.
    Matches 12h ('9:30 AM', '09:30 am') and 24h ('14:30', '09:30:00').
    """
    if not time_str or not isinstance(time_str, str):
        raise ValueError("Appointment time is required.")
    cleaned = time_str.strip()
    m12 = TIME_12H_REGEX.match(cleaned)
    if m12:
        hour, minute, period = m12.groups()
        return f"{int(hour):02d}:{int(minute):02d} {period.upper()}"
    m24 = TIME_24H_REGEX.match(cleaned)
    if m24:
        hour, minute, _ = m24.groups()
        dt = datetime.strptime(f"{int(hour):02d}:{int(minute):02d}", "%H:%M")
        return dt.strftime("%I:%M %p")
    raise ValueError(f"Invalid appointment time format: '{time_str}'")


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
    """Returns the recorded status ('CREATED', 'CREATING', 'PRE_EXISTING') or None."""
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


def validate_mysql_generation_expression(raw_expr: str) -> bool:
    """
    Strictly verifies that the MySQL generation expression matches the intended
    active slot formula:
        CASE WHEN status IN ('Pending', 'Confirmed')
             THEN CONCAT(doctor_id, '_', appointment_date, '_', appointment_time)
             ELSE NULL
        END
    Normalizes backticks, quotes, character-set introducers, and whitespace
    before validating against allowed structural patterns.
    """
    if not raw_expr or not isinstance(raw_expr, str):
        return False

    # 1. Strip backticks and normalize double quotes to single quotes
    cleaned = raw_expr.replace('`', '').replace('"', "'")

    # 2. Strip character-set introducers (e.g. _utf8mb4'Pending' -> 'Pending', _latin1'_' -> '_')
    cleaned = re.sub(r'_[a-zA-Z0-9_]+(?=\')', '', cleaned)

    # 3. Collapse whitespace and lowercase
    compressed = re.sub(r'\s+', '', cleaned).lower()

    status_condition = (
        r'(?:'
        r'statusin\(\'(?:pending\',\'confirmed|confirmed\',\'pending)\'\)'
        r'|'
        r'\(?status=\'pending\'\)?or\(?status=\'confirmed\'\)?'
        r'|'
        r'\(?status=\'confirmed\'\)?or\(?status=\'pending\'\)?'
        r')'
    )

    pattern = re.compile(
        rf'^case\(*when\(*{status_condition}\)*'
        rf'then\(*concat\(doctor_id,\'_\',appointment_date,\'_\',appointment_time\)\)*'
        rf'(?:elsenull)?'
        rf'end$',
        re.IGNORECASE
    )

    return bool(pattern.match(compressed))


def validate_sqlite_partial_index(ddl_sql: str) -> bool:
    """
    Validates SQLite index DDL from sqlite_master:
    - Must be a UNIQUE index on table 'appointments'
    - Indexed columns must be exactly (doctor_id, appointment_date, appointment_time)
    - Predicate must strictly match: status IN ('Pending', 'Confirmed') (or equality equivalent)
    - Rejects unconditional indexes, wrong columns, and invalid predicates (fails closed).
    """
    if not ddl_sql or not isinstance(ddl_sql, str):
        return False

    cleaned = ddl_sql.replace('"', '').replace('`', '').replace('[', '').replace(']', '')
    compressed = re.sub(r'\s+', '', cleaned).lower()

    if not compressed.startswith('createuniqueindex'):
        return False

    tbl_and_cols_match = re.search(
        r'onappointments\(doctor_id,appointment_date,appointment_time\)',
        compressed
    )
    if not tbl_and_cols_match:
        return False

    where_idx = compressed.rfind('where')
    if where_idx == -1:
        return False

    predicate = compressed[where_idx + 5:]
    # Normalize optional parens around status: (status) -> status
    predicate = re.sub(r'\(+status\)+', 'status', predicate)

    allowed_predicate_pattern = re.compile(
        r'^\(*'
        r'(?:'
        r'statusin\(\'(?:pending\',\'confirmed|confirmed\',\'pending)\'\)'
        r'|'
        r'\(?status=\'pending\'\)?or\(?status=\'confirmed\'\)?'
        r'|'
        r'\(?status=\'confirmed\'\)?or\(?status=\'pending\'\)?'
        r')'
        r'\)*$',
        re.IGNORECASE
    )

    return bool(allowed_predicate_pattern.match(predicate))


def validate_postgresql_partial_index(indexdef: str) -> bool:
    """
    Validates PostgreSQL index definition from pg_indexes:
    - Must be a UNIQUE index on table 'appointments' using BTREE
    - Indexed columns must be exactly (doctor_id, appointment_date, appointment_time)
    - Predicate must strictly match: status IN ('Pending', 'Confirmed') or ANY/OR equivalent
    - Rejects unconditional indexes, wrong columns, and invalid predicates (fails closed).
    """
    if not indexdef or not isinstance(indexdef, str):
        return False

    cleaned = indexdef.replace('"', '')
    # Strip PostgreSQL type casts like ::text or ::character varying
    cleaned = re.sub(r'::[a-zA-Z0-9_ ]+', '', cleaned)
    compressed = re.sub(r'\s+', '', cleaned).lower()

    if not compressed.startswith('createuniqueindex'):
        return False

    tbl_cols_pattern = re.compile(
        r'on(?:[a-z0-9_]+\.)?appointments(?:usingbtree)?\(doctor_id,appointment_date,appointment_time\)',
        re.IGNORECASE
    )
    if not tbl_cols_pattern.search(compressed):
        return False

    where_idx = compressed.rfind('where')
    if where_idx == -1:
        return False

    predicate = compressed[where_idx + 5:]
    # Normalize optional parens around status: (status) -> status
    predicate = re.sub(r'\(+status\)+', 'status', predicate)

    allowed_predicate_pattern = re.compile(
        r'^\(*'
        r'(?:'
        r'statusin\(\'(?:pending\',\'confirmed|confirmed\',\'pending)\'\)'
        r'|'
        r'status=any\(array\[\'(?:pending\',\'confirmed|confirmed\',\'pending)\'\]\)'
        r'|'
        r'\(?status=\'pending\'\)?or\(?status=\'confirmed\'\)?'
        r'|'
        r'\(?status=\'confirmed\'\)?or\(?status=\'pending\'\)?'
        r')'
        r'\)*$',
        re.IGNORECASE
    )

    return bool(allowed_predicate_pattern.match(predicate))


def check_is_applied(connection) -> bool:
    """Checks if this migration version has already been applied (strictly read-only)."""
    inspector = inspect(connection)
    if not inspector.has_table('schema_migrations'):
        return False
    result = connection.execute(
        text("SELECT COUNT(*) FROM schema_migrations WHERE version = :ver"),
        {"ver": MIGRATION_VERSION}
    ).scalar()
    return bool(result and result > 0)


def perform_sqlite_online_backup(db_path: str) -> str:
    """
    Performs a consistent online checkpointed backup of an SQLite database.
    Safe for live WAL-mode databases without file corruption or dirty reads.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{db_path}.bak_{timestamp}"
    
    src = sqlite3.connect(db_path)
    dst = sqlite3.connect(backup_path)
    with dst:
        src.backup(dst, pages=100)
    dst.close()
    src.close()
    return backup_path


def check_preconditions(connection):
    """
    Validates data integrity before performing any schema mutation:
    1. Checks for NULL or non-standard status strings.
    2. Validates appointment time formats for all active slots.
    3. Detects logical collisions among active appointments ('Pending', 'Confirmed')
       after time canonicalization (e.g., '9:30 AM' vs '09:30 AM').
    Raises MigrationPreconditionError if any violation exists.
    """
    # 1. Status Integrity Check
    status_query = text("""
        SELECT id, doctor_id, appointment_date, appointment_time, status
        FROM appointments
        WHERE status IS NULL 
           OR status NOT IN ('Pending', 'Confirmed', 'Cancelled', 'Completed')
           OR status != TRIM(status)
    """)
    invalid_status_rows = connection.execute(status_query).fetchall()
    if invalid_status_rows:
        diagnostic = "\n".join(
            f"  - Appt ID {r[0]}: status={repr(r[4])} (Doctor {r[1]}, Date {r[2]}, Time {r[3]})"
            for r in invalid_status_rows
        )
        raise MigrationPreconditionError(
            f"Precondition Failed: Found {len(invalid_status_rows)} appointment(s) with invalid or NULL statuses:\n"
            f"{diagnostic}\n"
            "All statuses must be strictly one of: 'Pending', 'Confirmed', 'Cancelled', 'Completed'."
        )

    # 2. Active Slot Logical Collision Check (with canonical time normalization)
    active_rows = connection.execute(text("""
        SELECT id, doctor_id, appointment_date, appointment_time, status
        FROM appointments
        WHERE status IN ('Pending', 'Confirmed')
    """)).fetchall()

    logical_groups = {}
    invalid_time_rows = []

    for r in active_rows:
        appt_id, doc_id, appt_date, raw_time, status = r[0], r[1], str(r[2]), r[3], r[4]
        try:
            norm_time = normalize_migration_time(raw_time)
        except ValueError:
            invalid_time_rows.append(r)
            continue

        key = (doc_id, appt_date, norm_time)
        logical_groups.setdefault(key, []).append((appt_id, raw_time, status))

    if invalid_time_rows:
        diag = "\n".join(
            f"  - Appt ID {r[0]}: time={repr(r[3])} (Doctor {r[1]}, Date {r[2]})"
            for r in invalid_time_rows
        )
        raise MigrationPreconditionError(
            f"Precondition Failed: Found {len(invalid_time_rows)} active appointment(s) with unparseable time strings:\n"
            f"{diag}\n"
            "All appointment times must be in valid 12-hour or 24-hour format."
        )

    collision_groups = {k: v for k, v in logical_groups.items() if len(v) > 1}
    if collision_groups:
        diagnostic = "\n".join(
            f"  - Doctor {k[0]}, Date {k[1]}, Canonical Slot '{k[2]}': {len(v)} active appointments (IDs: {[item[0] for item in v]}, Raw: {[item[1] for item in v]})"
            for k, v in collision_groups.items()
        )
        raise MigrationPreconditionError(
            f"Precondition Failed: Found {len(collision_groups)} active duplicate collision group(s) after canonicalization:\n"
            f"{diagnostic}\n"
            "An administrator must resolve all duplicate active appointments before unique constraints can be applied.\n"
            "Migration aborted safely. Zero schema mutations performed."
        )


def upgrade(engine):
    """
    Applies migration 001_appointment_reliability:
    1. One-time SQLite WAL mode initialization on a dedicated AUTOCOMMIT connection.
    2. Read-only applied status check.
    3. Strict precondition checks (runs BEFORE ANY schema mutation or table creation).
    4. Migration version tracking table creation.
    5. Canonicalization of existing stored appointment times.
    6. Dialect-specific uniqueness DDL.
    7. Migration version recording.
    """
    dialect_name = engine.name.lower()

    # 1. One-time SQLite WAL mode initialization using dedicated AUTOCOMMIT connection
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
        # 2. Strictly read-only check if migration is already applied (zero DDL)
        if check_is_applied(connection):
            print(f"[Migration Notice] Version '{MIGRATION_VERSION}' is already applied.")
            return True

        # 3. Precondition Gate: validates status integrity and logical collisions.
        # MUST run before ANY DDL, including schema_migrations table creation.
        check_preconditions(connection)

        print(f"[Migration] Executing upgrade for dialect: {dialect_name}...")

        # 4. Now that preconditions have passed, ensure schema_migrations and ownership tables exist
        ensure_migrations_table(connection)
        ensure_ownership_table(connection)

        # 5. Canonicalize existing stored appointment times across all records
        all_appts = connection.execute(text("SELECT id, appointment_time FROM appointments")).fetchall()
        normalized_count = 0
        for appt_id, raw_time in all_appts:
            if raw_time:
                try:
                    norm = normalize_migration_time(raw_time)
                    if norm != raw_time:
                        connection.execute(
                            text("UPDATE appointments SET appointment_time = :norm WHERE id = :id"),
                            {"norm": norm, "id": appt_id}
                        )
                        normalized_count += 1
                except ValueError:
                    pass
        if normalized_count > 0:
            print(f"[Migration] Canonicalized {normalized_count} legacy appointment time string(s).")

        # 6. Dialect-specific uniqueness enforcement with persistent provenance tracking
        if dialect_name == 'sqlite':
            row = connection.execute(text("""
                SELECT sql FROM sqlite_master 
                WHERE type = 'index' AND name = 'uq_active_doctor_slot'
            """)).fetchone()
            idx_exists = (row is not None and row[0] is not None)
            idx_prov = get_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot')

            if not idx_exists:
                print("[Migration] Creating partial unique index 'uq_active_doctor_slot'...")
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'CREATING')
                connection.execute(text("""
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_active_doctor_slot 
                    ON appointments (doctor_id, appointment_date, appointment_time) 
                    WHERE status IN ('Pending', 'Confirmed')
                """))
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'CREATED')
            else:
                ddl_sql = row[0]
                if not validate_sqlite_partial_index(ddl_sql):
                    raise MigrationPreconditionError(
                        f"Incompatible existing index 'uq_active_doctor_slot' found in sqlite_master:\n"
                        f"  DDL: {ddl_sql}\n"
                        "Expected UNIQUE index on appointments(doctor_id, appointment_date, appointment_time) "
                        "with predicate WHERE status IN ('Pending', 'Confirmed').\n"
                        "Migration aborted to prevent schema corruption. Manual review required."
                    )
                if idx_prov == 'CREATING':
                    record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'CREATED')
                elif idx_prov != 'CREATED':
                    record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'PRE_EXISTING')
                print("[Migration] Detected existing compatible partial unique index 'uq_active_doctor_slot'. Skipping CREATE INDEX.")

        elif dialect_name == 'postgresql':
            row = connection.execute(text("""
                SELECT indexdef FROM pg_indexes 
                WHERE tablename = 'appointments' AND indexname = 'uq_active_doctor_slot'
            """)).fetchone()
            idx_exists = (row is not None and row[0] is not None)
            idx_prov = get_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot')

            if not idx_exists:
                print("[Migration] Creating partial unique index 'uq_active_doctor_slot'...")
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'CREATING')
                connection.execute(text("""
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_active_doctor_slot 
                    ON appointments (doctor_id, appointment_date, appointment_time) 
                    WHERE status IN ('Pending', 'Confirmed')
                """))
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'CREATED')
            else:
                indexdef = row[0]
                if not validate_postgresql_partial_index(indexdef):
                    raise MigrationPreconditionError(
                        f"Incompatible existing index 'uq_active_doctor_slot' found in pg_indexes:\n"
                        f"  indexdef: {indexdef}\n"
                        "Expected UNIQUE BTREE index on appointments(doctor_id, appointment_date, appointment_time) "
                        "with predicate WHERE status IN ('Pending', 'Confirmed').\n"
                        "Migration aborted to prevent schema corruption. Manual review required."
                    )
                if idx_prov == 'CREATING':
                    record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'CREATED')
                elif idx_prov != 'CREATED':
                    record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'PRE_EXISTING')
                print("[Migration] Detected existing compatible partial unique index 'uq_active_doctor_slot'. Skipping CREATE INDEX.")

        elif dialect_name == 'mysql':
            # 1. Inspect existing column definition using information_schema
            col_info = connection.execute(text("""
                SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, EXTRA, GENERATION_EXPRESSION
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'appointments'
                  AND COLUMN_NAME = 'active_slot_key'
            """)).fetchone()

            col_prov = get_object_provenance(connection, MIGRATION_VERSION, 'column', 'appointments', 'active_slot_key')

            if col_info is None:
                # Column does not exist; create it and record CREATING -> CREATED
                print("[Migration] Adding generated column 'active_slot_key' to 'appointments'...")
                record_object_provenance(connection, MIGRATION_VERSION, 'column', 'appointments', 'active_slot_key', 'CREATING')
                connection.execute(text("""
                    ALTER TABLE appointments 
                    ADD COLUMN active_slot_key VARCHAR(100) 
                    GENERATED ALWAYS AS (
                        CASE 
                            WHEN status IN ('Pending', 'Confirmed') 
                            THEN CONCAT(doctor_id, '_', appointment_date, '_', appointment_time) 
                            ELSE NULL 
                        END
                    ) STORED
                """))
                record_object_provenance(connection, MIGRATION_VERSION, 'column', 'appointments', 'active_slot_key', 'CREATED')
            else:
                # Column exists; strictly verify its compatibility
                col_name, data_type, max_len, extra, gen_expr = (
                    col_info[0],
                    str(col_info[1]).lower(),
                    col_info[2],
                    str(col_info[3] or '').upper(),
                    str(col_info[4] or '')
                )
                is_stored = 'STORED' in extra
                has_valid_type = (data_type == 'varchar' and (max_len is None or max_len >= 100))
                has_valid_expr = validate_mysql_generation_expression(gen_expr)

                if not (is_stored and has_valid_type and has_valid_expr):
                    raise MigrationPreconditionError(
                        f"Incompatible existing column 'active_slot_key' found on table 'appointments':\n"
                        f"  - Data Type: {data_type} (length: {max_len})\n"
                        f"  - Extra: {extra}\n"
                        f"  - Expression: {gen_expr}\n"
                        "Expected STORED GENERATED VARCHAR(100) matching canonical active slot formula.\n"
                        "Migration aborted to prevent schema corruption or data loss. Manual review required."
                    )

                if col_prov == 'CREATING':
                    record_object_provenance(connection, MIGRATION_VERSION, 'column', 'appointments', 'active_slot_key', 'CREATED')
                elif col_prov != 'CREATED':
                    record_object_provenance(connection, MIGRATION_VERSION, 'column', 'appointments', 'active_slot_key', 'PRE_EXISTING')

                print("[Migration] Detected existing compatible column 'active_slot_key'. Skipping ADD COLUMN.")

            # 2. Inspect existing index definition using information_schema.STATISTICS
            index_rows = connection.execute(text("""
                SELECT 
                    NON_UNIQUE,
                    COLUMN_NAME,
                    SEQ_IN_INDEX,
                    SUB_PART,
                    INDEX_TYPE
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'appointments'
                  AND INDEX_NAME = 'uq_active_doctor_slot'
                ORDER BY SEQ_IN_INDEX
            """)).fetchall()

            idx_prov = get_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot')

            if not index_rows:
                # Index does not exist; create it and record CREATING -> CREATED
                print("[Migration] Creating unique index 'uq_active_doctor_slot' on 'appointments'...")
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'CREATING')
                connection.execute(text("""
                    CREATE UNIQUE INDEX uq_active_doctor_slot 
                    ON appointments (active_slot_key)
                """))
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'CREATED')
            else:
                # Index exists; strictly verify uniqueness, column reference, full-width (SUB_PART is None), and BTREE
                is_unique = (int(index_rows[0][0]) == 0)
                col_name = str(index_rows[0][1]).lower()
                seq_in_index = int(index_rows[0][2])
                sub_part = index_rows[0][3]
                index_type = str(index_rows[0][4] or '').upper()

                is_compatible = (
                    len(index_rows) == 1 and
                    is_unique and
                    col_name == 'active_slot_key' and
                    seq_in_index == 1 and
                    sub_part is None and
                    index_type == 'BTREE'
                )

                if not is_compatible:
                    raise MigrationPreconditionError(
                        f"Incompatible existing index 'uq_active_doctor_slot' found on table 'appointments':\n"
                        f"  - Non-Unique flag: {index_rows[0][0]} (expected 0 for UNIQUE)\n"
                        f"  - Columns: {[r[1] for r in index_rows]} (expected ['active_slot_key'])\n"
                        f"  - Sub-Part: {[r[3] for r in index_rows]} (expected None for full-width)\n"
                        f"  - Index Type: {[r[4] for r in index_rows]} (expected BTREE)\n"
                        "Migration aborted to prevent schema corruption. Manual review required."
                    )

                if idx_prov == 'CREATING':
                    record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'CREATED')
                elif idx_prov != 'CREATED':
                    record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'PRE_EXISTING')

                print("[Migration] Detected existing compatible unique index 'uq_active_doctor_slot'. Skipping CREATE INDEX.")
        else:
            raise NotImplementedError(f"Unsupported database dialect: {dialect_name}")

        # Record migration version
        connection.execute(
            text("INSERT INTO schema_migrations (version, applied_at) VALUES (:ver, :now)"),
            {"ver": MIGRATION_VERSION, "now": datetime.now(timezone.utc)}
        )
        connection.commit()
        print(f"[Migration Success] Successfully applied '{MIGRATION_VERSION}'.")
        return True


def inspect_managed_objects(connection, dialect_name: str) -> list[dict]:
    """
    Inspects physical existence and provenance for all objects managed by this migration.
    Returns a list of dicts for each dialect-managed object.
    """
    objects = []
    if dialect_name == 'sqlite':
        row = connection.execute(text("""
            SELECT 1 FROM sqlite_master 
            WHERE type = 'index' AND name = 'uq_active_doctor_slot'
        """)).fetchone()
        exists = (row is not None)
        prov = get_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot')
        objects.append({
            'object_type': 'index',
            'table_name': 'appointments',
            'object_name': 'uq_active_doctor_slot',
            'physically_exists': exists,
            'recorded_status': prov
        })
    elif dialect_name == 'postgresql':
        row = connection.execute(text("""
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'appointments' AND indexname = 'uq_active_doctor_slot'
        """)).fetchone()
        exists = (row is not None)
        prov = get_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot')
        objects.append({
            'object_type': 'index',
            'table_name': 'appointments',
            'object_name': 'uq_active_doctor_slot',
            'physically_exists': exists,
            'recorded_status': prov
        })
    elif dialect_name == 'mysql':
        # 1. Index
        row_idx = connection.execute(text("""
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'appointments'
              AND INDEX_NAME = 'uq_active_doctor_slot'
        """)).fetchone()
        idx_exists = (row_idx is not None)
        idx_prov = get_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot')
        objects.append({
            'object_type': 'index',
            'table_name': 'appointments',
            'object_name': 'uq_active_doctor_slot',
            'physically_exists': idx_exists,
            'recorded_status': idx_prov
        })
        # 2. Column
        row_col = connection.execute(text("""
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'appointments'
              AND COLUMN_NAME = 'active_slot_key'
        """)).fetchone()
        col_exists = (row_col is not None)
        col_prov = get_object_provenance(connection, MIGRATION_VERSION, 'column', 'appointments', 'active_slot_key')
        objects.append({
            'object_type': 'column',
            'table_name': 'appointments',
            'object_name': 'active_slot_key',
            'physically_exists': col_exists,
            'recorded_status': col_prov
        })
    else:
        raise NotImplementedError(f"Unsupported database dialect: {dialect_name}")

    return objects


def validate_downgrade_preflight(managed_objects: list[dict]):
    """
    Validates physical existence and provenance records for ALL managed objects
    BEFORE any destructive DDL is executed.
    Fails closed on any ambiguity, absence, or unproven ownership.
    """
    for obj in managed_objects:
        obj_type = obj['object_type']
        obj_name = obj['object_name']
        tbl_name = obj['table_name']
        exists = obj['physically_exists']
        prov = obj['recorded_status']

        if exists:
            if prov == 'CREATED':
                continue
            elif prov == 'PRE_EXISTING':
                continue
            elif prov == 'CREATING':
                raise DowngradeReconciliationError(
                    f"Downgrade Aborted: {obj_type.capitalize()} '{obj_name}' on table '{tbl_name}' "
                    f"is in '{prov}' state from an incomplete upgrade. Manual reconciliation required."
                )
            elif prov == 'DROPPING':
                raise DowngradeReconciliationError(
                    f"Downgrade Aborted: {obj_type.capitalize()} '{obj_name}' on table '{tbl_name}' "
                    f"is in '{prov}' state from an interrupted downgrade but is still physically present. "
                    "Operator reconciliation required."
                )
            elif prov == 'DROPPED':
                raise DowngradeReconciliationError(
                    f"Downgrade Aborted: {obj_type.capitalize()} '{obj_name}' on table '{tbl_name}' "
                    f"is recorded as 'DROPPED', but is still physically present in the schema. "
                    "Operator reconciliation required."
                )
            else:
                raise DowngradeReconciliationError(
                    f"Cannot verify ownership: {obj_type.capitalize()} '{obj_name}' on table '{tbl_name}' "
                    f"exists in physical schema with unverified provenance ({repr(prov)}). "
                    "Refusing to drop object or purge migration records. Operator reconciliation required."
                )
        else:
            if prov == 'DROPPED':
                # Conclusively dropped by a prior downgrade step of this migration; safe to skip
                continue
            elif prov == 'CREATED':
                raise DowngradeReconciliationError(
                    f"Downgrade Aborted: {obj_type.capitalize()} '{obj_name}' on table '{tbl_name}' "
                    f"is recorded as 'CREATED' by this migration, but is physically absent from the database. "
                    "Downgrade was not in progress for this object; it may have been deleted out-of-band. "
                    "Refusing to silently purge provenance or delete migration records. Operator reconciliation required."
                )
            elif prov == 'PRE_EXISTING':
                raise DowngradeReconciliationError(
                    f"Downgrade Aborted: {obj_type.capitalize()} '{obj_name}' on table '{tbl_name}' "
                    f"is recorded as 'PRE_EXISTING', but is physically absent from the database. "
                    "Refusing to silently purge provenance or delete migration records. Operator reconciliation required."
                )
            elif prov == 'DROPPING':
                raise DowngradeReconciliationError(
                    f"Downgrade Aborted: {obj_type.capitalize()} '{obj_name}' on table '{tbl_name}' "
                    f"is recorded as 'DROPPING' and is physically absent. A 'DROPPING' marker alone does not "
                    "conclusively prove this migration performed the drop. Operator reconciliation required."
                )
            elif prov is None:
                continue
            else:
                raise DowngradeReconciliationError(
                    f"Downgrade Aborted: {obj_type.capitalize()} '{obj_name}' on table '{tbl_name}' "
                    f"is physically absent with unverified status ({repr(prov)}). Operator reconciliation required."
                )


def downgrade(engine):
    """
    Safely reverts migration 001_appointment_reliability without restoring old snapshots
    or overwriting subsequent application transactions.
    Follows an explicit, durable downgrade protocol:
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

        # Pre-flight Gate: Validates ALL objects together before any DDL
        validate_downgrade_preflight(managed_objects)

        print(f"[Migration] Reverting migration for dialect: {dialect_name}...")

        if dialect_name in ('sqlite', 'postgresql'):
            idx_obj = managed_objects[0]
            if idx_obj['recorded_status'] == 'PRE_EXISTING':
                print("[Migration] Preserving pre-existing index 'uq_active_doctor_slot' (not created by this migration).")
            elif idx_obj['recorded_status'] == 'DROPPED':
                print("[Migration] Resuming downgrade: index 'uq_active_doctor_slot' was already dropped in prior run.")
            elif idx_obj['recorded_status'] == 'CREATED':
                print("[Migration] Dropping unique index 'uq_active_doctor_slot'...")
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'DROPPING')
                connection.execute(text("DROP INDEX IF EXISTS uq_active_doctor_slot"))
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'DROPPED')

        elif dialect_name == 'mysql':
            idx_obj = next(o for o in managed_objects if o['object_type'] == 'index')
            col_obj = next(o for o in managed_objects if o['object_type'] == 'column')

            # 1. Index first
            if idx_obj['recorded_status'] == 'PRE_EXISTING':
                print("[Migration] Preserving pre-existing index 'uq_active_doctor_slot' (not created by this migration).")
            elif idx_obj['recorded_status'] == 'DROPPED':
                print("[Migration] Resuming downgrade: index 'uq_active_doctor_slot' was already dropped in prior run.")
            elif idx_obj['recorded_status'] == 'CREATED':
                print("[Migration] Dropping unique index 'uq_active_doctor_slot'...")
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'DROPPING')
                connection.execute(text("ALTER TABLE appointments DROP INDEX uq_active_doctor_slot"))
                record_object_provenance(connection, MIGRATION_VERSION, 'index', 'appointments', 'uq_active_doctor_slot', 'DROPPED')

            # 2. Column second
            if col_obj['recorded_status'] == 'PRE_EXISTING':
                print("[Migration] Preserving pre-existing column 'active_slot_key' (not created by this migration).")
            elif col_obj['recorded_status'] == 'DROPPED':
                print("[Migration] Resuming downgrade: column 'active_slot_key' was already dropped in prior run.")
            elif col_obj['recorded_status'] == 'CREATED':
                print("[Migration] Dropping column 'active_slot_key'...")
                record_object_provenance(connection, MIGRATION_VERSION, 'column', 'appointments', 'active_slot_key', 'DROPPING')
                connection.execute(text("ALTER TABLE appointments DROP COLUMN active_slot_key"))
                record_object_provenance(connection, MIGRATION_VERSION, 'column', 'appointments', 'active_slot_key', 'DROPPED')

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
    parser = argparse.ArgumentParser(description="Appointment Reliability Migration 001")
    parser.add_argument("action", choices=["upgrade", "downgrade", "status", "audit"], default="status", nargs="?")
    parser.add_argument("--db-uri", default=None, help="Database connection URI")
    args = parser.parse_args()

    # Use specified URI or import from config
    if args.db_uri:
        uri = args.db_uri
    else:
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
        from config import Config
        uri = Config.get_database_uri()

    engine = create_engine(uri)

    if args.action == "status":
        with engine.connect() as conn:
            applied = check_is_applied(conn)
            print(f"Migration: {MIGRATION_VERSION} | Applied: {applied}")
    elif args.action == "audit":
        with engine.connect() as conn:
            try:
                check_preconditions(conn)
                print("[Audit OK] Zero active slot collisions or invalid statuses found. Ready for migration.")
            except MigrationPreconditionError as err:
                print(f"[Audit Warning] {err}")
                sys.exit(1)
    elif args.action == "upgrade":
        try:
            upgrade(engine)
        except MigrationPreconditionError as pre_err:
            print(f"[Migration Aborted] {pre_err}")
            sys.exit(1)
    elif args.action == "downgrade":
        try:
            downgrade(engine)
        except (MigrationPreconditionError, DowngradeReconciliationError) as down_err:
            print(f"[Migration Revert Aborted] {down_err}")
            sys.exit(1)
        except Exception as down_err:
            print(f"[Migration Revert Aborted] Unexpected error: {down_err}")
            sys.exit(1)

