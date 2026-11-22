# MediConnect – Synthetic-Only Demo Database Generation Report

**Document Title:** Fresh Isolated Synthetic-Only Demo Database & Cloud Pre-Check Report  
**Target Environment:** Enzonic MySQL 8.4 Free Tier (`mediconnect-demo`)  
**Security Level:** 100% Fictional Data (Zero Production / Personal PII)  
**Generation Timestamp:** November 22, 2026  
**Final Migration Verdict:** 🟢 **GO (SAFE TO IMPORT INTO ENZONIC DEMO DATABASE)**  

---

## 1. Executive Summary

In response to the NO-GO privacy audit of the local MySQL backup, a completely isolated, 100% synthetic demonstration database (`mediconnect_synthetic_demo`) was created and exported to:

> **Backup File:** [backups/mediconnect_demo_synthetic.sql](file:///C:/Users/Lap12NOC/Desktop/DoctorApp/backups/mediconnect_demo_synthetic.sql)  
> **Checksum File:** [backups/mediconnect_demo_synthetic.sql.sha256](file:///C:/Users/Lap12NOC/Desktop/DoctorApp/backups/mediconnect_demo_synthetic.sql.sha256)  
> **File Size:** **48,438 bytes** (47.3 KB) | **681 lines**  
> **SHA-256 Checksum:** `c4e2a2cf0c386b156f5f45a7019d597258b3f7c73c8bc92011eb5ff7d28f5b5d`  

### Key Accomplishments & Safety Guarantees:
1. **Zero Contamination from Original Database:** Not a single row, email, phone number, name, or password hash was copied from the original `mediconnect` database.
2. **Original Database Untouched:** The active `mediconnect` database was audited before and after generation; zero records were altered, deleted, or truncated.
3. **100% Synthetic Fictional Data:** All emails use the reserved domain `@demo.mediconnect.com`. All phone numbers use standard fictional reserved prefixes (`+91 98000 000xx`).
4. **All Six Portals & Roles Represented:** Complete role coverage across Platform Owner, SuperAdmin, Hospital Admin, Receptionist, Doctor, and Patient.
5. **Fresh Demo Password:** All demo accounts are seeded with a newly generated Werkzeug scrypt hash corresponding to the documented demo password: `Demo@MediConnect2026`.
6. **Zero Commercial Emails / Zero PII:** Automated offline privacy scanners confirmed **0 `@gmail.com`**, **0 personal phone numbers**, and **0 original password hashes** in the dump.

---

## 2. Table-by-Table Inventory & Relational Mapping

The synthetic demo database mirrors the exact 16-table relational schema (with 88 indexes and 32 foreign keys intact) while populating it with pristine demonstration records:

| # | Table Name | Synthetic Rows | Purpose & Demo Contents | Relational Integrity |
| :---: | :--- | :---: | :--- | :--- |
| 1 | `users` | **16** | 1 Platform Owner, 2 SuperAdmins, 2 Hospital Admins, 2 Receptionists, 4 Doctors, 5 Patients | Master user identities with role gating |
| 2 | `doctors` | **4** | Cardiology, Neurology, Orthopedics, Pediatrics consultants | Linked 1:1 to doctor users and hospitals |
| 3 | `hospitals` | **3** | Metropolitan General, Sunrise Apex Medical, Harmony River | Fictional tertiary and community hospitals |
| 4 | `specializations` | **12** | Cardiology, Neurology, Orthopedics, Pediatrics, Dermatology, General Medicine, Gynecology, ENT, Ophthalmology, Oncology, Psychiatry, Pulmonology | Clinical taxonomy with icons and images |
| 5 | `appointments` | **4** | Confirmed (tomorrow), Pending (next week), and 2 Completed appointments | Generated virtual slot key compatibility |
| 6 | `prescriptions` | **2** | 2 complete clinical digital prescriptions with JSON medication items | Linked to completed appointments and doctors |
| 7 | `ambulance_requests` | **2** | 1 Completed, 1 Dispatched emergency response request | Connected to users, ambulances, hospitals |
| 8 | `ambulances` | **3** | Advanced Cardiac Life Support, Basic Life Support, Mobile ICU | Operable emergency fleet |
| 9 | `superadmin_hospital_assignments` | **3** | Multi-hospital assignments for Regional SuperAdmins | Validates SuperAdmin portal ecosystem |
| 10 | `hospital_admin_assignments` | **2** | Primary Hospital Admin assignments | Validates Hospital Admin delegation |
| 11 | `invitations` | **1** | Sample pending doctor onboarding invitation with SHA-256 token | Doctor onboarding test workflow |
| 12 | `reviews` | **2** | 5-star clinical patient reviews | Doctor profile ratings |
| 13 | `favorites` | **2** | Patient saved doctor profiles | Patient portal feature demonstration |
| 14 | `audit_logs` | **5** | Platform bootstrapping, hospital onboarding, staff approvals | Demonstrates compliance audit trail |
| 15 | `schema_migrations` | **12** | Versions 001 through 012 recorded as applied | Guarantees backend migration sync |
| 16 | `migration_managed_objects` | **13** | Tracks managed triggers, constraints, and indexes | Schema versioning metadata |
| | **TOTAL** | **86 Rows** | **Complete Multi-Hospital Healthcare Ecosystem** | **32 Foreign Keys / 88 Indexes** |

---

## 3. Demo User Accounts Covering All Six Portals

All demo accounts share the single standardized demo password for ease of portfolio demonstration and clinical walkthroughs:

> **Standard Demo Password:** `Demo@MediConnect2026`

| Portal & Role | Demo Account Email | Assigned User Name | Assigned Hospital | Primary Dashboard Route |
| :--- | :--- | :--- | :--- | :--- |
| **1. Platform Owner** | `owner@demo.mediconnect.com` | Demo Platform Director | Global Oversight (All) | `/owner` |
| **2. SuperAdmin** | `superadmin.metro@demo.mediconnect.com` | Metro Regional SuperAdmin | Metropolitan General & Harmony | `/superadmin` |
| **2. SuperAdmin** | `superadmin.sunrise@demo.mediconnect.com` | Sunrise Regional SuperAdmin | Sunrise Apex Medical Center | `/superadmin` |
| **3. Hospital Admin** | `admin.metro@demo.mediconnect.com` | Metro Hospital Administrator | Metropolitan General Hospital | `/hospital-admin` |
| **3. Hospital Admin** | `admin.sunrise@demo.mediconnect.com` | Sunrise Hospital Administrator | Sunrise Apex Medical Center | `/hospital-admin` |
| **4. Receptionist** | `reception.metro@demo.mediconnect.com` | Metro Desk Receptionist | Metropolitan General Hospital | `/admin` |
| **4. Receptionist** | `reception.sunrise@demo.mediconnect.com` | Sunrise Desk Receptionist | Sunrise Apex Medical Center | `/admin` |
| **5. Doctor** | `dr.cross@demo.mediconnect.com` | Dr. Alexander Cross (Cardiology) | Metropolitan General Hospital | `/doctor` |
| **5. Doctor** | `dr.rostova@demo.mediconnect.com` | Dr. Elena Rostova (Neurology) | Metropolitan General Hospital | `/doctor` |
| **5. Doctor** | `dr.vance@demo.mediconnect.com` | Dr. Marcus Vance (Orthopedics) | Sunrise Apex Medical Center | `/doctor` |
| **5. Doctor** | `dr.lin@demo.mediconnect.com` | Dr. Maya Lin (Pediatrics) | Sunrise Apex Medical Center | `/doctor` |
| **6. Patient** | `patient.alpha@demo.mediconnect.com` | Demo Patient Alpha | Outpatient / Multi-Hospital | `/patient` |
| **6. Patient** | `patient.beta@demo.mediconnect.com` | Demo Patient Beta | Outpatient / Multi-Hospital | `/patient` |
| **6. Patient** | `patient.gamma@demo.mediconnect.com` | Demo Patient Gamma | Outpatient / Multi-Hospital | `/patient` |
| **6. Patient (Walk-in)** | `walkin.one@demo.mediconnect.com` | Demo Walkin Patient One | Temporary Triage Account | `/patient` |
| **6. Patient (Walk-in)** | `walkin.two@demo.mediconnect.com` | Demo Walkin Patient Two | Temporary Triage Account | `/patient` |

---

## 4. Offline Privacy & Security Audit Results

An automated offline scanner evaluated `mediconnect_demo_synthetic.sql` against the previous dump (`mediconnect_backup_20261122_175603.sql`):

```
+-----------------------------------------------------------------------------------+
| METRIC                                   | PREVIOUS DUMP | NEW SYNTHETIC DUMP     |
+-----------------------------------------------------------------------------------+
| Commercial Personal Emails (@gmail/etc) | 6 DETECTED    | 0 (ZERO LEAKS)         |
| Real Indian Mobile Phone Numbers        | 6 DETECTED    | 0 (ZERO LEAKS)         |
| Original Local Account Records          | 43 RECORDS    | 0 (ZERO COPIED)        |
| Cross-Contaminated Password Hashes      | 43 HASHES     | 0 (ZERO COPIED)        |
| All Accounts Authenticate with Demo Pwd | N/A           | 100% VERIFIED (True)   |
| Privacy Status                          | FAILED (RED)  | PASSED (GREEN)         |
+-----------------------------------------------------------------------------------+
```

---

## 5. MySQL 8.4 LTS Cloud Compatibility Verification

The exported dump adheres strictly to modern cloud database standards:
- **Charset & Collation:** `utf8mb4` with `utf8mb4_0900_ai_ci` (native default in MySQL 8.4).
- **GTID Safety:** Generated with `--set-gtid-purged=OFF` to prevent `SUPER` / `REPLICATION_CLIENT` privilege rejection on managed cloud databases.
- **Tablespace Safety:** Generated with `--no-tablespaces` to prevent cloud permission errors.
- **Transactional Consistency:** Exported using `--single-transaction` with `FOREIGN_KEY_CHECKS=0` toggle for order-independent table loading.
- **Generated Column Safety:** Handled virtual generated column `active_slot_key` safely without insert collision.

---

## 6. Migration Status & Next Steps

This new synthetic backup is **100% clean, privacy-compliant, and fully cloud-ready**.

> **Current Status:**  
> The file [backups/mediconnect_demo_synthetic.sql](file:///C:/Users/Lap12NOC/Desktop/DoctorApp/backups/mediconnect_demo_synthetic.sql) is prepared locally on your workstation.  
> In strict accordance with your safety instructions:
> - No connection to Enzonic or Render was made.
> - No files were uploaded or transferred.
> - The original `mediconnect` database remains 100% intact and untouched.
> - No Git commits or pushes were made.

**Awaiting your approval before performing any connection or import into Enzonic.**
