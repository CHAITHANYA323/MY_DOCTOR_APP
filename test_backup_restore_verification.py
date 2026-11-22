"""
Test Script: Backup & Restore Integrity Verification
Demonstrates and validates automated database backup generation, checksum hashing,
and isolated restore verification for MediConnect.
"""

import os
import sys
import sqlite3
import hashlib
import tempfile
from pathlib import Path

def run_backup_restore_test():
    print("==================================================================")
    print("  MEDICONNECT - DATABASE BACKUP & RESTORE INTEGRITY VERIFICATION")
    print("==================================================================")

    with tempfile.TemporaryDirectory() as tmp_dir:
        src_db = os.path.join(tmp_dir, "primary_source.db")
        backup_sql = os.path.join(tmp_dir, "backup_dump.sql")
        restored_db = os.path.join(tmp_dir, "restored_replica.db")

        # 1. Create Source Database with Clinical Schema
        conn_src = sqlite3.connect(src_db)
        cursor_src = conn_src.cursor()

        cursor_src.execute("""
            CREATE TABLE hospitals (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                city TEXT NOT NULL,
                emergency_number TEXT NOT NULL
            );
        """)

        cursor_src.execute("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL,
                hospital_id INTEGER REFERENCES hospitals(id)
            );
        """)

        cursor_src.execute("""
            CREATE TABLE prescriptions (
                id INTEGER PRIMARY KEY,
                patient_id INTEGER REFERENCES users(id),
                doctor_id INTEGER REFERENCES users(id),
                hospital_id INTEGER REFERENCES hospitals(id),
                diagnosis TEXT NOT NULL,
                medicines TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)

        # Insert Mock Records
        cursor_src.execute("INSERT INTO hospitals VALUES (1, 'Reliability General Hospital', 'Metropolis', '108');")
        cursor_src.execute("INSERT INTO users VALUES (1, 'Dr. Rajesh Kumar', 'dr.one@medicare.com', 'DOCTOR', 1);")
        cursor_src.execute("INSERT INTO users VALUES (2, 'John Doe Patient', 'patient.alpha@test.com', 'PATIENT', 1);")
        cursor_src.execute("INSERT INTO users VALUES (3, 'Front Desk Intake', 'reception.hosp1@medicare.com', 'RECEPTIONIST', 1);")
        cursor_src.execute("INSERT INTO prescriptions VALUES (101, 2, 1, 1, 'Hypertension Stage 1', '[{\"name\":\"Amlodipine\",\"dosage\":\"5mg\"}]', '2026-11-22T10:00:00Z');")
        
        conn_src.commit()

        # Measure counts in source
        cursor_src.execute("SELECT COUNT(*) FROM hospitals;")
        hosp_count_src = cursor_src.fetchone()[0]
        cursor_src.execute("SELECT COUNT(*) FROM users;")
        user_count_src = cursor_src.fetchone()[0]
        cursor_src.execute("SELECT COUNT(*) FROM prescriptions;")
        rx_count_src = cursor_src.fetchone()[0]

        print(f"[SOURCE DB] Created with {hosp_count_src} hospitals, {user_count_src} users, {rx_count_src} prescriptions.")

        # 2. Generate Logical SQL Backup Dump
        with open(backup_sql, 'w', encoding='utf-8') as f:
            for line in conn_src.iterdump():
                f.write(f"{line}\n")

        conn_src.close()
        backup_size = os.path.getsize(backup_sql)
        
        # Calculate SHA-256 Checksum
        with open(backup_sql, 'rb') as f:
            backup_sha256 = hashlib.sha256(f.read()).hexdigest()

        print(f"[BACKUP] Generated dump: {backup_size} bytes")
        print(f"[BACKUP] SHA-256 Checksum: {backup_sha256}")

        # 3. Restore Into Fresh Isolated Database
        conn_res = sqlite3.connect(restored_db)
        cursor_res = conn_res.cursor()

        with open(backup_sql, 'r', encoding='utf-8') as f:
            dump_content = f.read()
            cursor_res.executescript(dump_content)

        conn_res.commit()

        # 4. Verification & Consistency Checks
        cursor_res.execute("SELECT COUNT(*) FROM hospitals;")
        hosp_count_res = cursor_res.fetchone()[0]
        cursor_res.execute("SELECT COUNT(*) FROM users;")
        user_count_res = cursor_res.fetchone()[0]
        cursor_res.execute("SELECT COUNT(*) FROM prescriptions;")
        rx_count_res = cursor_res.fetchone()[0]

        # Verify prescription detail
        cursor_res.execute("SELECT diagnosis, medicines FROM prescriptions WHERE id = 101;")
        rx_row = cursor_res.fetchone()

        conn_res.close()

        print(f"[RESTORE] Verified replica: {hosp_count_res} hospitals, {user_count_res} users, {rx_count_res} prescriptions.")
        print(f"[RESTORE] Verified clinical Rx #101: Diagnosis='{rx_row[0]}'")

        assert hosp_count_src == hosp_count_res, "Hospital count mismatch"
        assert user_count_src == user_count_res, "User count mismatch"
        assert rx_count_src == rx_count_res, "Prescription count mismatch"
        assert rx_row[0] == "Hypertension Stage 1", "Clinical data corrupted"

        print("==================================================================")
        print("  BACKUP & RESTORE INTEGRITY VERIFICATION: 100% PASS")
        print("==================================================================")

if __name__ == '__main__':
    run_backup_restore_test()
