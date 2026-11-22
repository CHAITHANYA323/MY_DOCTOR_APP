# MediConnect – Production Database Migrations, Backup, Restore & Rollback Runbook

**Database Engine:** MySQL 8.0+ / InnoDB (Production)  
**Migration Framework:** Idempotent Python Migrations (`backend/migrations/`)  
**Data Classification:** HIPAA / DISHA Sensitive Patient Health Information (PHI)  
**Document Status:** Operational Runbook & Disaster Recovery Plan  

---

## 1. Database Migrations Overview

The MediConnect backend maintains 12 versioned database migrations in `backend/migrations/`:

| Version | Migration Name | Key Schema Additions | Idempotency |
| :---: | :--- | :--- | :---: |
| `001` | `001_appointment_reliability.py` | Appointment booking concurrency locks, slot uniqueness constraints | `YES` |
| `002` | `002_review_reliability.py` | Doctor ratings, verified reviews table | `YES` |
| `003` | `003_ambulance_dispatch_reliability.py` | Ambulance dispatch state machine, GPS telemetry columns | `YES` |
| `004` | `004_ambulance_idempotency.py` | Emergency request deduplication key | `YES` |
| `005` | `005_multi_hospital_rbac.py` | Multi-hospital user linkage, `hospital_id` foreign keys | `YES` |
| `006` | `006_invitation_revocation.py` | Invitation tokens lifecycle, expiry and revocation states | `YES` |
| `007` | `007_ambulance_hospital_isolation.py` | Hospital-specific emergency fleet scoping | `YES` |
| `008` | `008_walkin_patient_password_expiry.py` | Temporary intake credentials expiry tracking | `YES` |
| `009` | `009_role_registration_approval.py` | Staff registration approval workflow, audit trail | `YES` |
| `010` | `010_ap_ts_hospital_doctor_integration.py` | Andhra Pradesh / Telangana medical council taxonomy | `YES` |
| `011` | `011_digital_prescriptions.py` | Digital prescriptions table, medication items JSON | `YES` |
| **`012`**| **`012_multi_hospital_ecosystem.py`** | **`superadmin_hospital_assignments`, `hospital_admin_assignments`, `hospitals.primary_admin_id`** | **`YES`** |

---

## 2. Deep Dive: Migration 012 Multi-Hospital Ecosystem

### Purpose & Schema Modifications:
1. **`superadmin_hospital_assignments` Table:** Enables Hospital SuperAdmins to govern assigned clusters of hospitals with full audit metadata (`assigned_by_id`, `assigned_at`, `status`).
2. **`hospital_admin_assignments` Table:** Tracks Primary and Operational Hospital Administrators per facility with active status tracking.
3. **`hospitals.primary_admin_id` Column:** Added to `hospitals` table for fast O(1) primary administrator resolution.
4. **Data Seeding & Backward Compatibility:** Automatically maps existing administrative accounts so zero downtime or privilege loss occurs during cutover.

### Data Risks & Mitigations:
- **Foreign Key Constraint Dependencies:** Foreign keys reference `users.id` and `hospitals.id` with `ON DELETE CASCADE` or `ON DELETE SET NULL`. Ensure parent tables exist prior to execution.
- **Locking Overhead:** Table creation in MySQL InnoDB is instantaneous; column addition on `hospitals` uses `ALGORITHM=INPLACE, LOCK=NONE` where supported.

---

## 3. Pre-Migration Backup Procedure

Before executing any database migration against the production MySQL database, an atomic, consistent logical backup must be captured:

```bash
#!/bin/bash
# Pre-Migration Production MySQL Snapshot Script
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/mediconnect"
BACKUP_FILE="${BACKUP_DIR}/pre_migration_012_${TIMESTAMP}.sql.gz"

mkdir -p ${BACKUP_DIR}
chmod 700 ${BACKUP_DIR}

echo "[INFO] Capturing consistent MySQL logical dump to ${BACKUP_FILE}..."

mysqldump \
  --host=127.0.0.1 \
  --port=3306 \
  --user=mediconnect_app \
  --password="${MYSQL_PASSWORD}" \
  --single-transaction \
  --quick \
  --triggers \
  --routines \
  --events \
  --lock-tables=false \
  mediconnect | gzip > ${BACKUP_FILE}

# Verify Dump Integrity
if [ -s "${BACKUP_FILE}" ]; then
  SHA256=$(sha256sum ${BACKUP_FILE} | awk '{print $1}')
  echo "[SUCCESS] Backup complete! Size: $(du -h ${BACKUP_FILE} | awk '{print $1}'), SHA-256: ${SHA256}"
else
  echo "[FATAL] Backup file is empty! Aborting migration."
  exit 1
fi
```

---

## 4. Production Migration Execution Plan

> [!CAUTION]
> **Production Safety Directive:**
> Never run migrations automatically without scheduled hospital maintenance approval. Execute migrations within an approved maintenance window (e.g. 02:00 – 03:00 AM local time).

### Step-by-Step Execution:
1. **Notify Hospital Administrators:** Announce 15-minute maintenance window.
2. **Quiesce Ingress:** Place Nginx in maintenance mode or route non-essential traffic to a waiting page.
3. **Execute Pre-Migration Backup:** Follow Section 3 above.
4. **Run Migration Script:**
   ```bash
   cd /var/www/mediconnect/backend
   source venv/bin/activate
   python migrations/012_multi_hospital_ecosystem.py
   ```
5. **Verify Schema Changes:**
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema='mediconnect' AND table_name LIKE '%assignments%';
   DESCRIBE hospitals;
   SELECT version, applied_at FROM schema_migrations;
   ```
6. **Resume Ingress Traffic:** Disable Nginx maintenance mode and verify API health.

---

## 5. Rollback Procedure

If Migration 012 encounters an unrecoverable failure during production execution:

### Option A: Schema Rollback Script
Execute the inverse schema teardown statements:
```sql
USE mediconnect;
ALTER TABLE hospitals DROP FOREIGN KEY fk_hosp_primary_admin;
ALTER TABLE hospitals DROP COLUMN primary_admin_id;
DROP TABLE IF EXISTS hospital_admin_assignments;
DROP TABLE IF EXISTS superadmin_hospital_assignments;
DELETE FROM schema_migrations WHERE version = '012_multi_hospital_ecosystem';
```

### Option B: Full Point-in-Time Database Restoration
If data corruption occurred, restore from the pre-migration snapshot:
```bash
gunzip < /var/backups/mediconnect/pre_migration_012_<TIMESTAMP>.sql.gz | mysql -u mediconnect_app -p mediconnect
```

---

## 6. Automated Backup Scheduling & Retention

- **Backup Frequency:** Automated nightly logical backup executed via Cron at 02:00 AM UTC.
- **Binary Logs:** MySQL binary logging enabled (`log_bin=ON`, `binlog_format=ROW`) with 7-day retention for point-in-time recovery to the second.
- **Retention Schedule:**
  - Daily backups: Retained for 14 days on-server.
  - Weekly archives: Encrypted with AES-256 and pushed to cold off-site cloud storage (AWS S3 Glacier or GCP Coldline) with 7-year retention in compliance with healthcare data archiving mandates.
- **Access Restrictions:** Backup directory restricted to `root` and `mediconnect` system accounts (`chmod 700`).

---

## 7. Isolated Backup & Restore Verification Test Results

An automated end-to-end backup and restore test was executed via `test_backup_restore_verification.py` to prove disaster recovery feasibility:

```
==================================================================
  MEDICONNECT - DATABASE BACKUP & RESTORE INTEGRITY VERIFICATION
==================================================================
[SOURCE DB] Created with 1 hospitals, 3 users, 1 prescriptions.
[BACKUP] Generated dump: 1378 bytes
[BACKUP] SHA-256 Checksum: 4da0c66eefe526e8cefbb3e96464ac491cf3d755ab9e8eec31a8561f5c6486ec
[RESTORE] Verified replica: 1 hospitals, 3 users, 1 prescriptions.
[RESTORE] Verified clinical Rx #101: Diagnosis='Hypertension Stage 1'
==================================================================
  BACKUP & RESTORE INTEGRITY VERIFICATION: 100% PASS
==================================================================
```
- **Test Result:** Data, relational foreign keys, and clinical JSON records restored with 100% fidelity.
