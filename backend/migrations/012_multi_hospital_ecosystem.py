"""
Migration: 012_multi_hospital_ecosystem
Version: 012_multi_hospital_ecosystem
Stage: Complete Hospital Admin, SuperAdmin & Platform Owner Ecosystem Redesign

Purpose:
- Creates 'superadmin_hospital_assignments' table for SuperAdmins managing multiple assigned hospitals.
- Creates 'hospital_admin_assignments' table for tracking Primary and Operational Hospital Admins per hospital.
- Adds 'primary_admin_id' to 'hospitals' table for fast Primary Admin resolution.
- Automatically seeds initial assignments for existing SuperAdmin and Admin users to preserve 100% backward compatibility.
- 100% idempotent, safe to run multiple times.
"""

import sys
import os
import argparse
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy import text, inspect, create_engine

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from config import Config

MIGRATION_VERSION = "012_multi_hospital_ecosystem"


def ensure_migrations_table(connection):
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(100) PRIMARY KEY,
            applied_at VARCHAR(50)
        )
    """))
    connection.commit()


def upgrade(target_uri=None):
    uri = target_uri or Config.get_database_uri()
    print(f"\n[UPGRADE] Running migration {MIGRATION_VERSION} on {uri.split('://')[0].upper()}...")
    engine = create_engine(uri)

    with engine.connect() as conn:
        ensure_migrations_table(conn)
        inspector = inspect(conn)
        dialect = engine.dialect.name.lower()
        existing_tables = [t.lower() for t in inspector.get_table_names()]

        # -------------------------------------------------------------
        # 1. superadmin_hospital_assignments Table
        # -------------------------------------------------------------
        if "superadmin_hospital_assignments" not in existing_tables:
            print("[UPGRADE] Creating 'superadmin_hospital_assignments' table...")
            if dialect == "mysql":
                conn.execute(text("""
                    CREATE TABLE superadmin_hospital_assignments (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        superadmin_id INT NOT NULL,
                        hospital_id INT NOT NULL,
                        assigned_by_id INT NULL,
                        status VARCHAR(30) NOT NULL DEFAULT 'Active',
                        assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        notes TEXT NULL,
                        CONSTRAINT fk_saha_superadmin FOREIGN KEY (superadmin_id) REFERENCES users (id) ON DELETE CASCADE,
                        CONSTRAINT fk_saha_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals (id) ON DELETE CASCADE,
                        CONSTRAINT fk_saha_assigned_by FOREIGN KEY (assigned_by_id) REFERENCES users (id) ON DELETE SET NULL,
                        INDEX idx_saha_superadmin (superadmin_id),
                        INDEX idx_saha_hospital (hospital_id),
                        INDEX idx_saha_status (status)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
            else:
                conn.execute(text("""
                    CREATE TABLE superadmin_hospital_assignments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        superadmin_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                        hospital_id INTEGER NOT NULL REFERENCES hospitals (id) ON DELETE CASCADE,
                        assigned_by_id INTEGER NULL REFERENCES users (id) ON DELETE SET NULL,
                        status VARCHAR(30) NOT NULL DEFAULT 'Active',
                        assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        notes TEXT NULL
                    );
                """))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_saha_superadmin ON superadmin_hospital_assignments (superadmin_id);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_saha_hospital ON superadmin_hospital_assignments (hospital_id);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_saha_status ON superadmin_hospital_assignments (status);"))
            conn.commit()
            print("[UPGRADE] 'superadmin_hospital_assignments' created successfully.")
        else:
            print("[SKIP] 'superadmin_hospital_assignments' table already exists.")

        # -------------------------------------------------------------
        # 2. hospital_admin_assignments Table
        # -------------------------------------------------------------
        if "hospital_admin_assignments" not in existing_tables:
            print("[UPGRADE] Creating 'hospital_admin_assignments' table...")
            if dialect == "mysql":
                conn.execute(text("""
                    CREATE TABLE hospital_admin_assignments (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        hospital_id INT NOT NULL,
                        admin_id INT NOT NULL,
                        designation VARCHAR(100) NOT NULL DEFAULT 'Primary Hospital Administrator',
                        is_primary BOOLEAN NOT NULL DEFAULT TRUE,
                        status VARCHAR(30) NOT NULL DEFAULT 'Active',
                        assigned_by_id INT NULL,
                        assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        revoked_at DATETIME NULL,
                        replacement_reason TEXT NULL,
                        CONSTRAINT fk_haa_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals (id) ON DELETE CASCADE,
                        CONSTRAINT fk_haa_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE,
                        CONSTRAINT fk_haa_assigned_by FOREIGN KEY (assigned_by_id) REFERENCES users (id) ON DELETE SET NULL,
                        INDEX idx_haa_hospital (hospital_id),
                        INDEX idx_haa_admin (admin_id),
                        INDEX idx_haa_status (status)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
            else:
                conn.execute(text("""
                    CREATE TABLE hospital_admin_assignments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        hospital_id INTEGER NOT NULL REFERENCES hospitals (id) ON DELETE CASCADE,
                        admin_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                        designation VARCHAR(100) NOT NULL DEFAULT 'Primary Hospital Administrator',
                        is_primary BOOLEAN NOT NULL DEFAULT 1,
                        status VARCHAR(30) NOT NULL DEFAULT 'Active',
                        assigned_by_id INTEGER NULL REFERENCES users (id) ON DELETE SET NULL,
                        assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        revoked_at DATETIME NULL,
                        replacement_reason TEXT NULL
                    );
                """))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_haa_hospital ON hospital_admin_assignments (hospital_id);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_haa_admin ON hospital_admin_assignments (admin_id);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_haa_status ON hospital_admin_assignments (status);"))
            conn.commit()
            print("[UPGRADE] 'hospital_admin_assignments' created successfully.")
        else:
            print("[SKIP] 'hospital_admin_assignments' table already exists.")

        # -------------------------------------------------------------
        # 3. Add primary_admin_id to hospitals table if not present
        # -------------------------------------------------------------
        hosp_cols = [c['name'].lower() for c in inspector.get_columns('hospitals')]
        if 'primary_admin_id' not in hosp_cols:
            print("[UPGRADE] Adding 'primary_admin_id' column to 'hospitals'...")
            if dialect == 'mysql':
                conn.execute(text("""
                    ALTER TABLE hospitals
                    ADD COLUMN primary_admin_id INT NULL,
                    ADD CONSTRAINT fk_hosp_primary_admin FOREIGN KEY (primary_admin_id) REFERENCES users (id) ON DELETE SET NULL;
                """))
            else:
                conn.execute(text("ALTER TABLE hospitals ADD COLUMN primary_admin_id INTEGER REFERENCES users (id) ON DELETE SET NULL;"))
            conn.commit()
            print("[UPGRADE] 'primary_admin_id' added to 'hospitals'.")
        else:
            print("[SKIP] 'primary_admin_id' already present on 'hospitals'.")

        # -------------------------------------------------------------
        # 4. Data Migration & Seeding for Existing Users
        # -------------------------------------------------------------
        print("[UPGRADE] Seeding initial SuperAdmin and Hospital Admin assignments...")
        # A. Seed SuperAdmin assignments from users with role HOSPITAL_SUPER_ADMIN and hospital_id
        conn.execute(text("""
            INSERT INTO superadmin_hospital_assignments (superadmin_id, hospital_id, status, assigned_at, notes)
            SELECT u.id, u.hospital_id, 'Active', CURRENT_TIMESTAMP, 'Initial system migration assignment'
            FROM users u
            WHERE u.role IN ('HOSPITAL_SUPER_ADMIN', 'SUPERADMIN')
              AND u.hospital_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM superadmin_hospital_assignments s
                  WHERE s.superadmin_id = u.id AND s.hospital_id = u.hospital_id AND s.status = 'Active'
              );
        """))

        # B. Seed Hospital Admin assignments from users with role ADMIN and hospital_id
        conn.execute(text("""
            INSERT INTO hospital_admin_assignments (hospital_id, admin_id, designation, is_primary, status, assigned_at)
            SELECT u.hospital_id, u.id, 'Primary Hospital Administrator', 1, 'Active', CURRENT_TIMESTAMP
            FROM users u
            WHERE u.role IN ('ADMIN', 'HOSPITAL_ADMIN')
              AND u.hospital_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM hospital_admin_assignments haa
                  WHERE haa.hospital_id = u.hospital_id AND haa.admin_id = u.id AND haa.status = 'Active'
              );
        """))

        # C. Update hospitals.primary_admin_id from active hospital_admin_assignments
        conn.execute(text("""
            UPDATE hospitals
            SET primary_admin_id = (
                SELECT haa.admin_id
                FROM hospital_admin_assignments haa
                WHERE haa.hospital_id = hospitals.id AND haa.is_primary = 1 AND haa.status = 'Active'
                ORDER BY haa.id ASC
                LIMIT 1
            )
            WHERE hospitals.primary_admin_id IS NULL
              AND EXISTS (
                  SELECT 1 FROM hospital_admin_assignments haa2
                  WHERE haa2.hospital_id = hospitals.id AND haa2.is_primary = 1 AND haa2.status = 'Active'
              );
        """))
        conn.commit()

        # -------------------------------------------------------------
        # 5. Record Schema Migration
        # -------------------------------------------------------------
        now_str = datetime.now(timezone.utc).isoformat()
        conn.execute(text("""
            INSERT INTO schema_migrations (version, applied_at)
            VALUES (:ver, :at)
            ON DUPLICATE KEY UPDATE applied_at = :at
        """), {"ver": MIGRATION_VERSION, "at": now_str}) if dialect == 'mysql' else conn.execute(text("""
            INSERT OR REPLACE INTO schema_migrations (version, applied_at)
            VALUES (:ver, :at)
        """), {"ver": MIGRATION_VERSION, "at": now_str})
        conn.commit()

        print(f"[SUCCESS] Migration {MIGRATION_VERSION} completed successfully!\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=f"Run migration {MIGRATION_VERSION}")
    parser.add_argument("--uri", type=str, default=None, help="Target database URI override")
    args = parser.parse_args()
    upgrade(target_uri=args.uri)
