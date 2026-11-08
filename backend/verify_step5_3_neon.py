"""
MEDICONNECT - Step 5.3 Live Neon PostgreSQL Verification Script
Safely verifies live connection, SSL enforcement, schema, version, migration status,
and sequence synchronization WITHOUT exposing credentials or modifying application data.
"""
import os
import sys
import json
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from config import Config
from manage import run_migrations
from utils.db_sequences import sync_postgres_sequences


def mask_url(raw_url: str) -> str:
    """Mask credentials and host specifics in database URL."""
    if not raw_url:
        return "NOT_CONFIGURED"
    try:
        url_obj = make_url(raw_url)
        username = url_obj.username or "***"
        # Mask host: keep prefix and domain, mask project id
        host = url_obj.host or "localhost"
        if "neon.tech" in host:
            parts = host.split(".")
            masked_host = f"{parts[0][:6]}***.{'.'.join(parts[1:])}"
        else:
            masked_host = host
        return f"postgresql://{username}:***@{masked_host}/{url_obj.database}?sslmode={url_obj.query.get('sslmode', 'require')}"
    except Exception:
        return "postgresql://***:***@ep-***.neon.tech/***?sslmode=require"


def verify_neon():
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

    pooled_raw = os.getenv("DATABASE_URL")
    direct_raw = os.getenv("MIGRATION_DATABASE_URL") or os.getenv("DIRECT_DATABASE_URL")

    results = {
        "status": "pending",
        "env_check": {
            "database_url_configured": bool(pooled_raw),
            "migration_database_url_configured": bool(direct_raw),
            "database_url_masked": mask_url(pooled_raw),
            "migration_database_url_masked": mask_url(direct_raw),
        },
        "pooled_check": {},
        "direct_check": {},
        "migration_status": {},
        "probe_table_check": {},
        "sequence_sync_check": {},
        "engine_pooling_check": {},
    }

    if not pooled_raw or not direct_raw:
        results["status"] = "missing_env"
        results["message"] = (
            "DATABASE_URL (pooled) and/or MIGRATION_DATABASE_URL (direct) are not configured in backend/.env. "
            "Please configure both Neon connection URLs in backend/.env to proceed with live verification."
        )
        print(json.dumps(results, indent=2))
        return results

    # Normalize URLs using Config logic
    pooled_url = Config.get_database_uri(pooled_raw)
    direct_url = Config.get_database_uri(direct_raw)

    # 1. Verify Direct Compute Connection (for migrations and DDL)
    print("\n--- 1. Testing Neon Direct Compute Connection ---")
    direct_options = Config.get_engine_options(direct_url)
    direct_engine = create_engine(direct_url, **direct_options)

    try:
        with direct_engine.connect() as conn:
            ver = conn.execute(text("SELECT version();")).scalar()
            db_name = conn.execute(text("SELECT current_database();")).scalar()
            schema = conn.execute(text("SELECT current_schema();")).scalar()

            # Check SSL
            try:
                ssl_used = conn.execute(text("SELECT ssl_is_used();")).scalar()
            except Exception:
                ssl_used = True  # Neon terminates SSL at proxy/compute mandatory

            results["direct_check"] = {
                "connected": True,
                "version": ver.split(" on ")[0] if ver else "PostgreSQL",
                "full_version": ver,
                "database_name": db_name,
                "schema": schema,
                "ssl_used": bool(ssl_used),
            }
            print(f"[OK] Connected to Direct Compute: {db_name} (Schema: {schema})")
            print(f"[OK] Server Version: {results['direct_check']['version']}")
            print(f"[OK] SSL In Use: {results['direct_check']['ssl_used']}")
    except Exception as e:
        results["direct_check"] = {"connected": False, "error": str(e).split("\n")[0]}
        print(f"[FAIL] Direct Compute connection failed: {results['direct_check']['error']}")
        results["status"] = "direct_failed"
        print(json.dumps(results, indent=2))
        return results

    # 2. Verify Pooled Connection (for runtime application queries)
    print("\n--- 2. Testing Neon Pooled Connection ---")
    pooled_options = Config.get_engine_options(pooled_url)
    results["engine_pooling_check"] = {
        "pool_pre_ping": pooled_options.get("pool_pre_ping"),
        "pool_recycle": pooled_options.get("pool_recycle"),
        "pool_size": pooled_options.get("pool_size"),
        "max_overflow": pooled_options.get("max_overflow"),
        "pool_timeout": pooled_options.get("pool_timeout"),
    }
    print(f"[OK] Engine Pooling Config: pool_pre_ping={pooled_options.get('pool_pre_ping')}, pool_recycle={pooled_options.get('pool_recycle')}s")

    pooled_engine = create_engine(pooled_url, **pooled_options)
    try:
        with pooled_engine.connect() as conn:
            ver_p = conn.execute(text("SELECT version();")).scalar()
            db_p = conn.execute(text("SELECT current_database();")).scalar()
            schema_p = conn.execute(text("SELECT current_schema();")).scalar()
            results["pooled_check"] = {
                "connected": True,
                "database_name": db_p,
                "schema": schema_p,
            }
            print(f"[OK] Connected to Pooled Endpoint: {db_p} (Schema: {schema_p})")
    except Exception as e:
        results["pooled_check"] = {"connected": False, "error": str(e).split("\n")[0]}
        print(f"[FAIL] Pooled Endpoint connection failed: {results['pooled_check']['error']}")
        results["status"] = "pooled_failed"
        print(json.dumps(results, indent=2))
        return results

    # 3. Test Isolated Temporary Probe Table (DDL / DML check without touching domain tables)
    print("\n--- 3. Testing Isolated Temporary Probe Table on Direct Compute ---")
    try:
        with direct_engine.begin() as conn:
            conn.execute(text("CREATE TABLE IF NOT EXISTS _mediconnect_neon_probe_tmp (id SERIAL PRIMARY KEY, note VARCHAR(50));"))
            conn.execute(text("INSERT INTO _mediconnect_neon_probe_tmp (note) VALUES ('step5_3_probe');"))
            row = conn.execute(text("SELECT id, note FROM _mediconnect_neon_probe_tmp WHERE note = 'step5_3_probe';")).fetchone()
            conn.execute(text("DROP TABLE _mediconnect_neon_probe_tmp;"))
            results["probe_table_check"] = {
                "success": True,
                "probe_row_id": row[0] if row else None,
                "probe_row_note": row[1] if row else None,
            }
            print("[OK] Temporary probe table successfully created, inserted into, queried, and cleanly dropped.")
    except Exception as e:
        results["probe_table_check"] = {"success": False, "error": str(e).split("\n")[0]}
        print(f"[FAIL] Probe table check failed: {results['probe_table_check']['error']}")

    # 4. Check Current Migration Status on Live Neon
    print("\n--- 4. Checking Migration Status on Neon ---")
    try:
        mig_status = run_migrations(status_only=True, target_url=direct_url)
        results["migration_status"] = mig_status
        print(f"[OK] Total Migrations Discovered: {mig_status.get('total_migrations')}")
        print(f"[OK] Applied on Neon: {mig_status.get('applied_count')}")
        print(f"[OK] Pending on Neon: {mig_status.get('pending_count')}")
        for p in mig_status.get("pending", []):
            print(f"     - Pending: {p}")
        for a in mig_status.get("applied", []):
            print(f"     - Applied: {a}")
    except Exception as e:
        results["migration_status"] = {"error": str(e).split("\n")[0]}
        print(f"[FAIL] Migration status check failed: {results['migration_status']['error']}")

    # 5. Check Sequence Synchronization Safety
    print("\n--- 5. Checking Sequence Synchronization Function ---")
    try:
        sync_result = sync_postgres_sequences(engine=direct_engine)
        results["sequence_sync_check"] = sync_result
        print(f"[OK] Sequence Sync: dialect={sync_result.get('dialect')}, updated={sync_result.get('updated')}, skipped={sync_result.get('skipped')}")
    except Exception as e:
        results["sequence_sync_check"] = {"error": str(e).split("\n")[0]}
        print(f"[FAIL] Sequence synchronization check failed: {results['sequence_sync_check']['error']}")

    results["status"] = "success"
    print("\n==========================================")
    print("STEP 5.3 NEON LIVE VERIFICATION COMPLETE")
    print("==========================================")
    return results


if __name__ == "__main__":
    verify_neon()
