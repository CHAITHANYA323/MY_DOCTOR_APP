"""
MediConnect Management CLI
Provides administrative commands for system maintenance and Platform Owner promotion.

Usage:
  python backend/manage.py promote-owner --email=<email> [--yes]
"""
import sys
import os
import argparse
import importlib.util
import inspect as py_inspect
from pathlib import Path
from sqlalchemy import create_engine, text

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))


def promote_owner(email: str, force_yes: bool = False):
    from app import create_app
    from models import db, User, AuditLog

    app = create_app()
    with app.app_context():
        email_clean = email.strip().lower()
        user = User.query.filter_by(email=email_clean).first()
        if not user:
            print(f"[ERROR] User with email '{email_clean}' not found in database.")
            sys.exit(1)

        print(f"\n--- Target Account Details ---")
        print(f"ID:           {user.id}")
        print(f"Name:         {user.name}")
        print(f"Email:        {user.email}")
        print(f"Current Role: {user.role}")
        print(f"Hospital ID:  {user.hospital_id}")
        print(f"Is Active:    {user.is_active}")
        print(f"------------------------------\n")

        if user.role == 'PLATFORM_OWNER':
            print(f"[NOTICE] User '{email_clean}' is already a PLATFORM_OWNER. No action taken.")
            return

        if not force_yes:
            try:
                confirmation = input(f"Are you sure you want to promote '{user.email}' to PLATFORM_OWNER? [y/N]: ").strip().lower()
            except (EOFError, KeyboardInterrupt):
                print("\n[ABORTED] Operation cancelled by user.")
                sys.exit(1)
            if confirmation not in ('y', 'yes'):
                print("[ABORTED] Promotion cancelled.")
                sys.exit(0)

        prev_role = user.role
        user.role = 'PLATFORM_OWNER'
        user.hospital_id = None
        user.is_active = True

        audit = AuditLog(
            hospital_id=None,
            user_id=user.id,
            action='OWNER_PROMOTION',
            resource_type='USER',
            resource_id=user.id,
            details=f"User {user.email} promoted from {prev_role} to PLATFORM_OWNER via CLI bootstrap.",
            ip_address='127.0.0.1 (CLI)'
        )
        db.session.add(audit)
        db.session.commit()

        print(f"[SUCCESS] User '{user.email}' (ID: {user.id}) has been successfully promoted to PLATFORM_OWNER.")
        print(f"[AUDIT] Audit log entry recorded with action 'OWNER_PROMOTION'.\n")


def get_migration_engine(target_url=None):
    """
    Returns an engine for migrations:
    Prefers MIGRATION_DATABASE_URL or DIRECT_DATABASE_URL.
    Falls back to Config.get_database_uri().
    """
    if target_url:
        url = target_url.strip()
    else:
        mig_url = (os.getenv("MIGRATION_DATABASE_URL") or os.getenv("DIRECT_DATABASE_URL") or "").strip()
        is_placeholder_pg = any(p in mig_url for p in ("YOUR_NEON", "ep-sample", "<user>", "<password>"))
        if mig_url and not is_placeholder_pg:
            url = mig_url
        else:
            from config import Config
            url = Config.get_database_uri()

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    elif url.startswith("mysql://"):
        url = url.replace("mysql://", "mysql+pymysql://", 1)
    return create_engine(url)


def run_migrations(status_only=False, target_url=None):
    """
    Safe ordered migration runner for migrations 001–008.
    Applies migrations in strict numerical order and records versions in schema_migrations.
    """
    engine = get_migration_engine(target_url)
    dialect = engine.name.lower()
    print(f"\n=== MediConnect Migration Runner (Dialect: {dialect.upper()}) ===")

    # Ensure schema_migrations table exists
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(100) PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        applied_rows = conn.execute(text("SELECT version, applied_at FROM schema_migrations")).fetchall()
        applied_map = {r[0]: r[1] for r in applied_rows}

    # Discover migration files in sorted order
    mig_dir = os.path.join(os.path.dirname(__file__), 'migrations')
    mig_files = sorted([f for f in os.listdir(mig_dir) if f.endswith('.py') and f != '__init__.py' and not f.startswith('.')])

    print(f"Discovered {len(mig_files)} migrations in {mig_dir}\n")

    if status_only:
        print(f"{'Migration File':<42} | {'Version Identifier':<38} | {'Status'}")
        print("-" * 105)
        for mf in mig_files:
            fpath = os.path.join(mig_dir, mf)
            spec = importlib.util.spec_from_file_location(mf[:-3], fpath)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            ver = getattr(mod, "MIGRATION_VERSION", mf[:-3])
            if ver in applied_map:
                status_str = f"APPLIED ({applied_map[ver]})"
            else:
                status_str = "PENDING"
            print(f"{mf:<42} | {ver:<38} | {status_str}")
        print()
        return

    # Execute pending migrations in ascending order
    pending_count = 0
    for mf in mig_files:
        fpath = os.path.join(mig_dir, mf)
        spec = importlib.util.spec_from_file_location(mf[:-3], fpath)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        ver = getattr(mod, "MIGRATION_VERSION", mf[:-3])

        if ver in applied_map:
            print(f"  [ALREADY APPLIED] {mf} ({ver})")
            continue

        print(f"\n>> Executing migration {ver} ({mf})...")
        pending_count += 1

        # Check upgrade function signature
        sig = py_inspect.signature(mod.upgrade)
        param_name = list(sig.parameters.keys())[0] if sig.parameters else "engine"
        if param_name in ("connection", "conn"):
            with engine.connect() as conn:
                mod.upgrade(conn)
        else:
            mod.upgrade(engine)

        # Confirm recorded
        with engine.begin() as conn:
            row = conn.execute(
                text("SELECT version FROM schema_migrations WHERE version = :ver"),
                {"ver": ver}
            ).fetchone()
            if not row:
                conn.execute(
                    text("INSERT INTO schema_migrations (version, applied_at) VALUES (:ver, CURRENT_TIMESTAMP)"),
                    {"ver": ver}
                )

        print(f"  [SUCCESS] {ver} applied successfully.")

    if pending_count == 0:
        print("\nAll migrations are already up to date. Zero pending migrations.")
    else:
        print(f"\nSuccessfully applied {pending_count} migrations.")

    # Synchronize sequences on PostgreSQL
    if dialect == "postgresql":
        print("\nSynchronizing PostgreSQL sequences...")
        from utils.db_sequences import sync_postgres_sequences
        res = sync_postgres_sequences(engine)
        print(f"Sequences synced: {len(res.get('synced', {}))} tables.")

    print("=== Migration process finished cleanly ===\n")


def run_sync_sequences():
    """CLI handler for PostgreSQL sequence synchronization (BLK-03)."""
    app = create_app()
    with app.app_context():
        from utils.db_sequences import sync_postgres_sequences
        print("\n--- Synchronizing PostgreSQL Sequences ---")
        res = sync_postgres_sequences(db.engine)
        print(f"Dialect: {res.get('dialect')}")
        if res.get("synced"):
            for tbl, details in res["synced"].items():
                print(f"  [SYNCED] {tbl:<25} Seq: {details['sequence']} | Next Val: {details['next_val']} (Rows: {details['rows']})")
        if res.get("skipped"):
            for k, reason in res["skipped"].items():
                print(f"  [SKIPPED] {k}: {reason}")
        if res.get("errors"):
            for tbl, err in res["errors"].items():
                print(f"  [ERROR] {tbl}: {err}")
            sys.exit(1)
        print("Sequence synchronization completed successfully.\n")


def main():
    parser = argparse.ArgumentParser(description="MediConnect Management CLI")
    subparsers = parser.add_subparsers(dest="command", help="Management commands")

    promote_parser = subparsers.add_parser("promote-owner", help="Promote a user account to PLATFORM_OWNER")
    promote_parser.add_argument("--email", required=True, help="Email address of target user")
    promote_parser.add_argument("--yes", "-y", action="store_true", help="Skip confirmation prompt")

    subparsers.add_parser("sync-sequences", help="Synchronize PostgreSQL primary key sequences after data import (BLK-03)")

    migrate_parser = subparsers.add_parser("migrate", help="Apply all pending migrations in ascending order (001-008)")
    migrate_parser.add_argument("--status", action="store_true", help="Show migration status without applying")
    migrate_parser.add_argument("--db-url", type=str, default=None, help="Explicit database URL (overrides environment)")

    subparsers.add_parser("migrate-status", help="Display migration status table")

    args = parser.parse_args()

    if args.command == "promote-owner":
        promote_owner(args.email, force_yes=args.yes)
    elif args.command == "sync-sequences":
        run_sync_sequences()
    elif args.command == "migrate":
        run_migrations(status_only=args.status, target_url=args.db_url)
    elif args.command == "migrate-status":
        run_migrations(status_only=True)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
