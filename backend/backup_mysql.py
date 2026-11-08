#!/usr/bin/env python3
"""
MediConnect Safe MySQL Backup and Recovery Tool
Provides atomic, high-fidelity backup, verification, and restoration
for the local and cloud MySQL database without relying on external system binaries.

Usage:
  python backend/backup_mysql.py backup [--tag=<tag>]
  python backend/backup_mysql.py list
  python backend/backup_mysql.py verify --file=<backup_file>
  python backend/backup_mysql.py restore --file=<backup_file> [--yes]
"""

import os
import sys
import json
import hashlib
import argparse
from datetime import datetime, timezone, date
from pathlib import Path
from decimal import Decimal

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from config import Config
from sqlalchemy import create_engine, text, inspect

BACKUP_DIR = BASE_DIR / "backups" / "mysql"

# Canonical table processing order adhering to foreign key dependencies
ORDERED_TABLES = [
    "hospitals",
    "specializations",
    "users",
    "doctors",
    "ambulances",
    "appointments",
    "ambulance_requests",
    "reviews",
    "favorites",
    "invitations",
    "audit_logs"
]


class BackupJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder handling datetime, date, and Decimal types."""
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, bytes):
            return obj.decode('utf-8', errors='replace')
        return super().default(obj)


def get_safe_masked_url(engine_url: str) -> str:
    """Returns a connection URL with credentials safely masked."""
    if "@" in engine_url:
        protocol_and_creds, host_and_db = engine_url.split("@", 1)
        protocol = protocol_and_creds.split("://")[0]
        user = protocol_and_creds.split("://")[1].split(":")[0] if ":" in protocol_and_creds.split("://")[1] else "user"
        return f"{protocol}://{user}:***@{host_and_db}"
    return engine_url


def calculate_sha256(file_path: Path) -> str:
    """Calculates SHA-256 checksum of a file."""
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def create_backup(tag: str = "") -> Path:
    """Creates a complete JSON snapshot of all tables in the MySQL database."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    tag_suffix = f"_{tag.strip()}" if tag else ""
    filename = f"mediconnect_mysql_{timestamp}{tag_suffix}.json"
    backup_path = BACKUP_DIR / filename

    # Safety Guard: Never overwrite an existing backup
    if backup_path.exists():
        timestamp_micro = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"mediconnect_mysql_{timestamp_micro}{tag_suffix}.json"
        backup_path = BACKUP_DIR / filename
        if backup_path.exists():
            raise FileExistsError(f"CRITICAL SAFETY ABORT: Backup file '{backup_path}' already exists.")

    db_uri = Config.get_database_uri()
    masked_url = get_safe_masked_url(db_uri)
    print(f"\n--- Initiating MySQL Database Backup ---")
    print(f"Target Database: {masked_url}")

    engine = create_engine(db_uri)
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    snapshot_data = {
        "metadata": {
            "version": "1.0",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "generator": "MediConnect Safe MySQL Backup Tool",
            "tables_count": {},
            "total_records": 0
        },
        "tables": {}
    }

    total_records = 0
    with engine.connect() as conn:
        for table_name in ORDERED_TABLES:
            if table_name not in existing_tables:
                print(f"  [Notice] Table '{table_name}' does not exist in database. Skipping.")
                continue

            # Query all rows
            result = conn.execute(text(f"SELECT * FROM `{table_name}`"))
            columns = list(result.keys())
            rows = []
            for row in result.fetchall():
                row_dict = dict(zip(columns, row))
                rows.append(row_dict)

            count = len(rows)
            snapshot_data["tables"][table_name] = {
                "columns": columns,
                "count": count,
                "rows": rows
            }
            snapshot_data["metadata"]["tables_count"][table_name] = count
            total_records += count
            print(f"  [OK] Extracted table '{table_name}': {count} records")

    snapshot_data["metadata"]["total_records"] = total_records

    # Write snapshot to temp file first, then rename atomically
    temp_path = backup_path.with_suffix(".tmp")
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(snapshot_data, f, cls=BackupJSONEncoder, indent=2)

    temp_path.replace(backup_path)

    # Compute checksum
    checksum = calculate_sha256(backup_path)
    file_size_bytes = backup_path.stat().st_size

    # Verify backup integrity immediately
    verify_backup(backup_path)

    print(f"\n[SUCCESS] Backup successfully created and verified!")
    print(f"  File:       {backup_path.name}")
    print(f"  Location:   {backup_path}")
    print(f"  Size:       {file_size_bytes:,} bytes")
    print(f"  Records:    {total_records} across {len(snapshot_data['tables'])} tables")
    print(f"  SHA-256:    {checksum}\n")
    return backup_path


def verify_backup(backup_path: Path) -> dict:
    """Verifies that a backup file is well-formed, readable, and structurally sound."""
    if not backup_path.exists():
        raise FileNotFoundError(f"Backup file not found: {backup_path}")

    try:
        with open(backup_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as parse_err:
        raise ValueError(f"CORRUPT BACKUP: Unable to parse JSON from {backup_path.name}: {parse_err}")

    metadata = data.get("metadata", {})
    tables = data.get("tables", {})

    if not metadata or not isinstance(tables, dict):
        raise ValueError(f"CORRUPT BACKUP: Missing required 'metadata' or 'tables' dictionary in {backup_path.name}")

    expected_total = metadata.get("total_records", 0)
    actual_total = sum(t.get("count", 0) for t in tables.values())

    if expected_total != actual_total:
        raise ValueError(
            f"INTEGRITY MISMATCH: Expected {expected_total} records from metadata, but found {actual_total} records."
        )

    return {
        "status": "VALID",
        "total_records": actual_total,
        "tables_count": metadata.get("tables_count", {}),
        "created_at": metadata.get("created_at"),
        "sha256": calculate_sha256(backup_path),
        "file_size": backup_path.stat().st_size
    }


def list_backups():
    """Lists all available MySQL backups in the backup directory."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backups = sorted(BACKUP_DIR.glob("mediconnect_mysql_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)

    print("\n" + "=" * 75)
    print("               MEDICONNECT MYSQL DATABASE BACKUPS")
    print("=" * 75)

    if not backups:
        print("  No MySQL backups found in backend/backups/mysql/.")
        print("  Run 'python backend/backup_mysql.py backup' to create one.\n")
        return

    print(f"{'Filename':<38} {'Size':<10} {'Records':<10} {'Integrity':<10}")
    print("-" * 75)

    for b in backups:
        try:
            info = verify_backup(b)
            status = "[OK] Valid"
            records_str = str(info["total_records"])
        except Exception as e:
            status = "[FAIL] Error"
            records_str = "N/A"
        size_str = f"{b.stat().st_size / 1024:.1f} KB"
        print(f"{b.name:<38} {size_str:<10} {records_str:<10} {status:<10}")

    print("=" * 75 + "\n")


def restore_backup(backup_path: Path, force_yes: bool = False):
    """Safely restores a verified backup into the active MySQL database with explicit confirmation."""
    print(f"\n--- Pre-Restore Verification ---")
    info = verify_backup(backup_path)
    print(f"Backup file verified: {backup_path.name}")
    print(f"Recorded timestamp:  {info['created_at']}")
    print(f"Total records:       {info['total_records']}")
    print(f"SHA-256:             {info['sha256']}")

    db_uri = Config.get_database_uri()
    masked_url = get_safe_masked_url(db_uri)
    print(f"\nTarget Database:     {masked_url}")

    # Explicit confirmation guard
    if not force_yes:
        print("\n" + "!" * 75)
        print(" [WARNING] YOU ARE ABOUT TO OVERWRITE DATA IN THE ACTIVE MYSQL DATABASE!")
        print(f" Database: {masked_url}")
        print(f" Source:   {backup_path.name} ({info['total_records']} records)")
        print("!" * 75)
        try:
            confirm = input("\nType 'RESTORE' in capital letters to proceed: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n[ABORTED] Restore cancelled by user.")
            sys.exit(1)

        if confirm != "RESTORE":
            print("[ABORTED] Confirmation keyword did not match 'RESTORE'. Restoration cancelled.")
            sys.exit(0)

    # Load data
    with open(backup_path, "r", encoding="utf-8") as f:
        snapshot = json.load(f)

    tables_data = snapshot.get("tables", {})
    engine = create_engine(db_uri)

    print("\n--- Executing Safe Database Restore ---")
    with engine.begin() as conn:
        # 1. Temporarily disable foreign key checks for clean truncation and insertion
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))

        # 2. Truncate tables in reverse dependency order
        for table_name in reversed(ORDERED_TABLES):
            if table_name in tables_data:
                conn.execute(text(f"TRUNCATE TABLE `{table_name}`;"))
                print(f"  [Truncated] Table '{table_name}' cleared.")

        # 3. Insert records in forward dependency order
        restored_total = 0
        for table_name in ORDERED_TABLES:
            if table_name not in tables_data:
                continue

            t_data = tables_data[table_name]
            rows = t_data.get("rows", [])
            columns = t_data.get("columns", [])

            if not rows:
                print(f"  [Restored]  Table '{table_name}': 0 records (empty table).")
                continue

            # Batch insert rows
            col_list = ", ".join(f"`{col}`" for col in columns)
            param_placeholders = ", ".join(f":{col}" for col in columns)
            insert_stmt = text(f"INSERT INTO `{table_name}` ({col_list}) VALUES ({param_placeholders})")

            conn.execute(insert_stmt, rows)
            restored_total += len(rows)
            print(f"  [Restored]  Table '{table_name}': {len(rows)} records restored.")

        # 4. Re-enable foreign key checks
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))

    # Post-restore parity verification
    print("\n--- Verifying Restored Database Integrity ---")
    with engine.connect() as conn:
        actual_total = 0
        mismatch = False
        for table_name in ORDERED_TABLES:
            if table_name in tables_data:
                expected_count = tables_data[table_name]["count"]
                current_count = conn.execute(text(f"SELECT COUNT(*) FROM `{table_name}`")).scalar()
                actual_total += current_count
                if current_count != expected_count:
                    print(f"  [MISMATCH] Table '{table_name}': expected {expected_count}, got {current_count}")
                    mismatch = True
                else:
                    print(f"  [OK] Table '{table_name}': {current_count} records verified.")

        if mismatch or actual_total != info["total_records"]:
            raise RuntimeError(
                f"RESTORE PARITY ERROR: Restored {actual_total} records, but backup had {info['total_records']}."
            )

    print(f"\n[SUCCESS] Restoration completed flawlessly!")
    print(f"  Total records active: {actual_total}")
    print(f"  Source backup:        {backup_path.name}\n")


def main():
    parser = argparse.ArgumentParser(description="MediConnect Safe MySQL Backup and Recovery Utility")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Backup subcommand
    backup_parser = subparsers.add_parser("backup", help="Create a complete snapshot of active MySQL database")
    backup_parser.add_argument("--tag", default="", help="Optional descriptive label for the backup")

    # List subcommand
    subparsers.add_parser("list", help="List all available MySQL backups")

    # Verify subcommand
    verify_parser = subparsers.add_parser("verify", help="Verify integrity of an existing backup file")
    verify_parser.add_argument("--file", required=True, help="Backup filename or path to verify")

    # Restore subcommand
    restore_parser = subparsers.add_parser("restore", help="Restore active MySQL database from backup")
    restore_parser.add_argument("--file", required=True, help="Backup filename or path to restore from")
    restore_parser.add_argument("--yes", action="store_true", help="Bypass interactive confirmation prompt")

    args = parser.parse_args()

    if args.command == "backup":
        create_backup(tag=args.tag)
    elif args.command == "list":
        list_backups()
    elif args.command == "verify":
        target = Path(args.file)
        if not target.is_absolute() and not target.exists():
            target = BACKUP_DIR / args.file
        info = verify_backup(target)
        print(f"\n[OK] Backup '{target.name}' is VALID.")
        print(f"  Records:  {info['total_records']}")
        print(f"  Created:  {info['created_at']}")
        print(f"  Size:     {info['file_size']:,} bytes")
        print(f"  SHA-256:  {info['sha256']}\n")
    elif args.command == "restore":
        target = Path(args.file)
        if not target.is_absolute() and not target.exists():
            target = BACKUP_DIR / args.file
        restore_backup(target, force_yes=args.yes)


if __name__ == "__main__":
    main()

