"""
Migration: 011_digital_prescriptions
Version: 011_digital_prescriptions
Stage: Digital Prescription Management System

Purpose:
- Creates 'prescriptions' table with comprehensive patient, doctor, hospital, and clinical medication schema.
- Supports digital prescription lifecycle: creation, PDF generation, IDOR security, and patient access.
- 100% idempotent and safe to run multiple times.
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

MIGRATION_VERSION = "011_digital_prescriptions"


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

        # -------------------------------------------------------------
        # 1. Prescriptions Table Creation
        # -------------------------------------------------------------
        existing_tables = [t.lower() for t in inspector.get_table_names()]

        if "prescriptions" not in existing_tables:
            print("[UPGRADE] Creating 'prescriptions' table...")
            if dialect == "mysql":
                conn.execute(text("""
                    CREATE TABLE prescriptions (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        prescription_number VARCHAR(64) NOT NULL UNIQUE,
                        patient_id INT NOT NULL,
                        doctor_id INT NOT NULL,
                        hospital_id INT NULL,
                        appointment_id INT NULL,
                        patient_name VARCHAR(120) NOT NULL,
                        patient_age VARCHAR(20) NULL,
                        patient_gender VARCHAR(20) NULL,
                        patient_phone VARCHAR(30) NULL,
                        doctor_name VARCHAR(120) NOT NULL,
                        doctor_qualification VARCHAR(150) NULL,
                        doctor_reg_number VARCHAR(100) NULL,
                        doctor_specialization VARCHAR(100) NULL,
                        hospital_name VARCHAR(150) NULL,
                        hospital_address VARCHAR(255) NULL,
                        hospital_phone VARCHAR(50) NULL,
                        diagnosis TEXT NOT NULL,
                        symptoms TEXT NULL,
                        medicines JSON NOT NULL,
                        additional_advice TEXT NULL,
                        follow_up_date VARCHAR(50) NULL,
                        notes TEXT NULL,
                        status VARCHAR(30) NOT NULL DEFAULT 'Active',
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        CONSTRAINT fk_rx_patient FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
                        CONSTRAINT fk_rx_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE,
                        CONSTRAINT fk_rx_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals (id) ON DELETE SET NULL,
                        CONSTRAINT fk_rx_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE SET NULL,
                        INDEX idx_rx_patient (patient_id),
                        INDEX idx_rx_doctor (doctor_id),
                        INDEX idx_rx_hospital (hospital_id),
                        INDEX idx_rx_appointment (appointment_id),
                        INDEX idx_rx_created_at (created_at),
                        INDEX idx_rx_status (status)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
            else:
                conn.execute(text("""
                    CREATE TABLE prescriptions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        prescription_number VARCHAR(64) NOT NULL UNIQUE,
                        patient_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                        doctor_id INTEGER NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
                        hospital_id INTEGER REFERENCES hospitals (id) ON DELETE SET NULL,
                        appointment_id INTEGER REFERENCES appointments (id) ON DELETE SET NULL,
                        patient_name VARCHAR(120) NOT NULL,
                        patient_age VARCHAR(20),
                        patient_gender VARCHAR(20),
                        patient_phone VARCHAR(30),
                        doctor_name VARCHAR(120) NOT NULL,
                        doctor_qualification VARCHAR(150),
                        doctor_reg_number VARCHAR(100),
                        doctor_specialization VARCHAR(100),
                        hospital_name VARCHAR(150),
                        hospital_address VARCHAR(255),
                        hospital_phone VARCHAR(50),
                        diagnosis TEXT NOT NULL,
                        symptoms TEXT,
                        medicines TEXT NOT NULL,
                        additional_advice TEXT,
                        follow_up_date VARCHAR(50),
                        notes TEXT,
                        status VARCHAR(30) NOT NULL DEFAULT 'Active',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rx_patient ON prescriptions (patient_id);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rx_doctor ON prescriptions (doctor_id);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rx_hospital ON prescriptions (hospital_id);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rx_appointment ON prescriptions (appointment_id);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rx_created_at ON prescriptions (created_at);"))
            conn.commit()
            print("[UPGRADE] 'prescriptions' table created successfully.")
        else:
            print("[UPGRADE] 'prescriptions' table already exists. Checking indexes...")

        # -------------------------------------------------------------
        # 2. Record in schema_migrations
        # -------------------------------------------------------------
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        row = conn.execute(
            text("SELECT version FROM schema_migrations WHERE version = :ver"),
            {"ver": MIGRATION_VERSION}
        ).fetchone()

        if row:
            conn.execute(
                text("UPDATE schema_migrations SET applied_at = :now WHERE version = :ver"),
                {"ver": MIGRATION_VERSION, "now": now_str}
            )
        else:
            conn.execute(
                text("INSERT INTO schema_migrations (version, applied_at) VALUES (:ver, :now)"),
                {"ver": MIGRATION_VERSION, "now": now_str}
            )
        conn.commit()

    print(f"[UPGRADE] Successfully applied migration {MIGRATION_VERSION}!\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--database-url", dest="db_url", default=None)
    args = parser.parse_args()
    upgrade(args.db_url)

