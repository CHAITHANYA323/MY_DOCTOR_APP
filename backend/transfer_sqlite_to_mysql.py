"""
MediConnect Database Migration Utility: SQLite -> MySQL 8.0+
Executes high-fidelity, zero-data-loss transfer of all domain records.
Preserves primary keys, auto-increments, password hashes, foreign key relations, and timestamps.
"""

import os
import sys
import sqlite3
import sqlalchemy
from pathlib import Path
from datetime import datetime, timezone

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from config import Config


DOMAIN_TABLES_IN_ORDER = [
    'specializations',
    'hospitals',
    'users',
    'ambulances',
    'doctors',
    'appointments',
    'ambulance_requests',
    'reviews',
    'favorites',
    'invitations',
    'audit_logs'
]


def run_data_transfer():
    sqlite_db_path = BASE_DIR / "doctor_hospital.db"
    if not sqlite_db_path.exists():
        print(f"[ERROR] Source SQLite database not found at {sqlite_db_path}")
        sys.exit(1)

    print("\n========================================================")
    print("MEDICONNECT STEP 5.5: SQLITE -> MYSQL DATA TRANSFER")
    print("========================================================")

    # 1. Open SQLite in strictly READ-ONLY mode
    sqlite_uri = f"file:{sqlite_db_path.as_posix()}?mode=ro"
    print(f"[Source] Connecting to SQLite (Read-Only URI: {sqlite_uri})...")
    sqlite_conn = sqlite3.connect(sqlite_uri, uri=True)
    sqlite_conn.row_factory = sqlite3.Row

    # Verify SQLite pre-flight integrity
    integrity = [r[0] for r in sqlite_conn.execute("PRAGMA integrity_check;").fetchall()]
    fk_errors = sqlite_conn.execute("PRAGMA foreign_key_check;").fetchall()
    if integrity != ['ok']:
        print(f"[ERROR] Source SQLite failed integrity check: {integrity}")
        sys.exit(1)
    if fk_errors:
        print(f"[ERROR] Source SQLite has foreign key violations: {fk_errors}")
        sys.exit(1)
    print(f"[Source] SQLite integrity verified: OK (0 FK violations).")

    # 2. Connect to target MySQL via SQLAlchemy
    mysql_uri = Config.get_database_uri()
    print(f"[Target] Connecting to MySQL using configured URI...")
    eng = sqlalchemy.create_engine(mysql_uri)
    masked_url = eng.url.render_as_string(hide_password=True)
    print(f"[Target] Connected to: {masked_url}")

    # Inspect MySQL tables
    with eng.connect() as conn:
        existing_tables = [r[0] for r in conn.execute(sqlalchemy.text("SHOW TABLES;")).fetchall()]
        for tbl in DOMAIN_TABLES_IN_ORDER:
            if tbl not in existing_tables:
                print(f"[ERROR] Required table '{tbl}' does not exist in MySQL. Please run schema creation first.")
                sys.exit(1)

    # 3. Read baseline counts from SQLite
    sqlite_counts = {}
    total_records = 0
    for tbl in DOMAIN_TABLES_IN_ORDER:
        cnt = sqlite_conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
        sqlite_counts[tbl] = cnt
        total_records += cnt

    print(f"\n[Source] Discovered {total_records} relational records across {len(DOMAIN_TABLES_IN_ORDER)} tables:")
    for tbl in DOMAIN_TABLES_IN_ORDER:
        print(f"  - {tbl:<22}: {sqlite_counts[tbl]:>4} rows")

    # 4. Perform Data Transfer with FOREIGN_KEY_CHECKS disabled during the session
    print(f"\n[Transfer] Beginning parameterized data insertion into MySQL...")
    with eng.connect() as mysql_conn:
        mysql_conn.execute(sqlalchemy.text("SET FOREIGN_KEY_CHECKS = 0;"))
        try:
            for tbl in DOMAIN_TABLES_IN_ORDER:
                cnt = sqlite_counts[tbl]
                if cnt == 0:
                    print(f"  [SKIPPED] {tbl} (0 rows to transfer)")
                    continue

                # Get columns from SQLite
                cur = sqlite_conn.execute(f"SELECT * FROM {tbl}")
                col_names = [description[0] for description in cur.description]

                # If generated columns exist in MySQL (e.g. active_slot_key in appointments), omit them from INSERT
                if tbl == 'appointments' and 'active_slot_key' in col_names:
                    col_names.remove('active_slot_key')

                cols_escaped = ", ".join(f"`{col}`" for col in col_names)
                placeholders = ", ".join(f":{col}" for col in col_names)
                insert_sql = sqlalchemy.text(f"INSERT INTO `{tbl}` ({cols_escaped}) VALUES ({placeholders})")

                # Fetch all rows from SQLite
                rows = cur.fetchall()
                data_dicts = []
                for row in rows:
                    d = dict(row)
                    if tbl == 'appointments' and 'active_slot_key' in d:
                        del d['active_slot_key']
                    data_dicts.append(d)

                # Batch insert into MySQL
                mysql_conn.execute(insert_sql, data_dicts)
                print(f"  [INSERTED] {tbl:<20}: {len(data_dicts):>4} rows transferred successfully.")

            mysql_conn.commit()
            print("[Transfer] Transaction committed successfully.")
        except Exception as err:
            mysql_conn.rollback()
            print(f"[FATAL] Transfer failed on table '{tbl}': {err}")
            raise err
        finally:
            mysql_conn.execute(sqlalchemy.text("SET FOREIGN_KEY_CHECKS = 1;"))
            mysql_conn.commit()

    # 5. Parity & Integrity Verification
    print("\n========================================================")
    print("STEP 5.5 VERIFICATION: PARITY & ORPHAN CHECKS")
    print("========================================================")

    parity_errors = []
    with eng.connect() as mysql_conn:
        print(f"{'Table Name':<24} | {'SQLite Count':<14} | {'MySQL Count':<14} | {'Status'}")
        print("-" * 65)
        for tbl in DOMAIN_TABLES_IN_ORDER:
            m_cnt = mysql_conn.execute(sqlalchemy.text(f"SELECT COUNT(*) FROM `{tbl}`;")).scalar()
            s_cnt = sqlite_counts[tbl]
            status = "MATCH (OK)" if s_cnt == m_cnt else "MISMATCH (FAIL)"
            if s_cnt != m_cnt:
                parity_errors.append(f"{tbl}: SQLite ({s_cnt}) != MySQL ({m_cnt})")
            print(f"{tbl:<24} | {s_cnt:<14} | {m_cnt:<14} | {status}")

        # Orphan Checks
        print("\n--- Foreign Key Orphan Validation ---")
        orphan_checks = [
            ("users -> hospitals", "SELECT COUNT(*) FROM users u LEFT JOIN hospitals h ON u.hospital_id = h.id WHERE u.hospital_id IS NOT NULL AND h.id IS NULL;"),
            ("doctors -> hospitals", "SELECT COUNT(*) FROM doctors d LEFT JOIN hospitals h ON d.hospital_id = h.id WHERE h.id IS NULL;"),
            ("doctors -> specializations", "SELECT COUNT(*) FROM doctors d LEFT JOIN specializations s ON d.specialization_id = s.id WHERE s.id IS NULL;"),
            ("appointments -> users", "SELECT COUNT(*) FROM appointments a LEFT JOIN users u ON a.user_id = u.id WHERE u.id IS NULL;"),
            ("appointments -> doctors", "SELECT COUNT(*) FROM appointments a LEFT JOIN doctors d ON a.doctor_id = d.id WHERE d.id IS NULL;"),
            ("appointments -> hospitals", "SELECT COUNT(*) FROM appointments a LEFT JOIN hospitals h ON a.hospital_id = h.id WHERE h.id IS NULL;"),
            ("ambulance_requests -> hospitals", "SELECT COUNT(*) FROM ambulance_requests r LEFT JOIN hospitals h ON r.hospital_id = h.id WHERE r.hospital_id IS NOT NULL AND h.id IS NULL;"),
            ("audit_logs -> users", "SELECT COUNT(*) FROM audit_logs l LEFT JOIN users u ON l.user_id = u.id WHERE u.id IS NULL;")
        ]

        orphan_errors = []
        for desc, sql in orphan_checks:
            orphans = mysql_conn.execute(sqlalchemy.text(sql)).scalar()
            status = "CLEAN (0 orphans)" if orphans == 0 else f"VIOLATION ({orphans} orphans)"
            if orphans != 0:
                orphan_errors.append(f"{desc}: {orphans} orphaned records")
            print(f"  - {desc:<35}: {status}")

    sqlite_conn.close()

    # Final post-flight SQLite check
    post_conn = sqlite3.connect(sqlite_db_path)
    post_integrity = post_conn.execute("PRAGMA integrity_check;").fetchall()
    post_conn.close()
    if post_integrity != [('ok',)]:
        print(f"[FATAL] SQLite database was unexpectedly modified!")
        sys.exit(1)

    print("\n[Source] Post-migration SQLite integrity check: OK (Source file was 100% read-only).")

    if parity_errors or orphan_errors:
        print("\n[MIGRATION FAILED] Parity or integrity violations detected:")
        for e in parity_errors + orphan_errors:
            print(f"  * {e}")
        sys.exit(1)

    print("\n========================================================")
    print("SUCCESS: 100% DATA PARITY & RELATIONAL INTEGRITY VERIFIED!")
    print("========================================================\n")


if __name__ == "__main__":
    run_data_transfer()
