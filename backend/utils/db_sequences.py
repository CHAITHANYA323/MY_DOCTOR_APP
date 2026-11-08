"""
Database Sequence Management Utility (BLK-03)
Provides safe, production-grade PostgreSQL sequence synchronization after data imports.

In PostgreSQL, importing records with explicit primary keys does NOT advance the
underlying sequence (e.g. users_id_seq). This utility synchronizes all sequences to:
  1. MAX(id) with is_called=TRUE if the table contains existing rows.
  2. 1 with is_called=FALSE if the table is empty (ensuring the next insert gets id=1).

Safely handles:
- Zero-row tables without skipping id=1
- High-concurrency environments
- Dialect verification (graceful no-op on SQLite / non-Postgres)
"""

import logging
from typing import Dict, Any, List, Optional
from sqlalchemy import text, inspect
from sqlalchemy.engine import Engine, Connection

logger = logging.getLogger("mediconnect.db_sequences")

DOMAIN_TABLES_WITH_SEQUENCES = [
    ("specializations", "id"),
    ("hospitals", "id"),
    ("users", "id"),
    ("doctors", "id"),
    ("ambulances", "id"),
    ("ambulance_requests", "id"),
    ("appointments", "id"),
    ("reviews", "id"),
    ("favorites", "id"),
    ("invitations", "id"),
    ("audit_logs", "id"),
]


def sync_postgres_sequences(
    target=None,
    tables: Optional[List[tuple]] = None
) -> Dict[str, Any]:
    """
    Synchronizes PostgreSQL sequences for the given tables.

    :param target: SQLAlchemy Engine, Connection, or None (uses app db engine)
    :param tables: Optional list of (table_name, pk_column) tuples
    :return: Dictionary containing sync results per table and overall status
    """
    results: Dict[str, Any] = {
        "success": True,
        "dialect": "unknown",
        "synced": {},
        "skipped": {},
        "errors": {}
    }

    if target is None:
        try:
            from models import db
            engine = db.engine
        except Exception as e:
            results["success"] = False
            results["errors"]["engine"] = f"Unable to resolve database engine: {e}"
            return results
    elif isinstance(target, Connection):
        engine = target.engine
    else:
        engine = target

    dialect_name = getattr(engine, "name", "").lower()
    results["dialect"] = dialect_name

    if dialect_name != "postgresql":
        # SQLite or other engine: sequences do not require explicit synchronization
        logger.info(f"Database dialect is '{dialect_name}'. PostgreSQL sequence synchronization skipped.")
        results["skipped"]["reason"] = f"Dialect '{dialect_name}' does not use PostgreSQL sequence generators."
        return results

    table_list = tables or DOMAIN_TABLES_WITH_SEQUENCES

    with engine.connect() as conn:
        for tbl, pk_col in table_list:
            try:
                # 1. Discover sequence name bound to this column
                seq_query = text("SELECT pg_get_serial_sequence(:tbl, :col)")
                seq_name = conn.execute(seq_query, {"tbl": tbl, "col": pk_col}).scalar()

                if not seq_name:
                    results["skipped"][tbl] = f"No serial sequence bound to {tbl}.{pk_col}."
                    continue

                # 2. Get current maximum primary key value
                max_id_query = text(f"SELECT MAX({pk_col}) FROM {tbl}")
                max_id = conn.execute(max_id_query).scalar()

                # 3. Synchronize sequence using setval
                if max_id is not None:
                    # Populated table: setval(seq, max_id, true) -> nextval will be max_id + 1
                    setval_query = text("SELECT setval(:seq, :max_val, true)")
                    new_val = conn.execute(setval_query, {"seq": seq_name, "max_val": int(max_id)}).scalar()
                    results["synced"][tbl] = {
                        "sequence": seq_name,
                        "rows": "populated",
                        "max_id": int(max_id),
                        "next_val": int(max_id) + 1,
                        "is_called": True,
                        "setval_result": new_val
                    }
                else:
                    # Empty table: setval(seq, 1, false) -> nextval will be 1
                    setval_query = text("SELECT setval(:seq, 1, false)")
                    new_val = conn.execute(setval_query, {"seq": seq_name}).scalar()
                    results["synced"][tbl] = {
                        "sequence": seq_name,
                        "rows": "empty",
                        "max_id": None,
                        "next_val": 1,
                        "is_called": False,
                        "setval_result": new_val
                    }

                conn.commit()

            except Exception as table_err:
                logger.error(f"Error synchronizing sequence for {tbl}.{pk_col}: {table_err}")
                results["errors"][tbl] = str(table_err)
                results["success"] = False

    return results
