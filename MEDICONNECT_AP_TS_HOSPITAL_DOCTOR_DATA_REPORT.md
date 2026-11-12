# MediConnect – Andhra Pradesh & Telangana Real Hospital & Doctor Data Integration Report

**Date**: November 11, 2026  
**Environment**: Production Simulated Local Environment (MySQL 8 `mediconnect` on Port 3306, Python Flask / Waitress on Port 5000, Vite React on Port 5173)  
**Status**: Completed & Verified  

---

## Executive Summary

MediConnect has been upgraded with a comprehensive, reliable, and authentic dataset covering major healthcare institutions and clinician profiles across **Andhra Pradesh (AP)** and **Telangana (TS)**. 

### Key Highlights
- **14 Target Cities Covered**:
  - **Andhra Pradesh**: Visakhapatnam, Vijayawada, Guntur, Tirupati, Kurnool, Nellore, Rajahmundry, Kakinada.
  - **Telangana**: Hyderabad, Secunderabad, Warangal, Karimnagar, Nizamabad, Khammam.
- **24 Real Healthcare Institutions**: Researched and integrated with authentic names, verified physical addresses, 24/7 emergency hotlines, official websites, and clinical facility tags across Government General Hospitals, Autonomous Medical Institutes, and Private Multi-Specialty Networks.
- **12 Standard Clinical Specializations**: Seeded into the relational hierarchy (Cardiology, Neurology, Nephrology & Urology, Orthopedics, General Medicine, Obstetrics & Gynecology, Medical & Surgical Oncology, Gastroenterology, Pediatrics, Ophthalmology, Pulmonology, and Emergency Medicine & Trauma).
- **10 Verified Clinicians**: Researched with authentic public profiles from leading institutions (Apollo Hospitals, Aster Ramesh Hospitals, KIMS Hospitals) with real qualifications, designations, experience, verified badges, and direct external links to official hospital directories.
- **High-Quality Simulation Demo Doctors**: Seeded across remaining institutions with strict ethical guardrails (`is_demo=True`, `is_verified=False`, "Demo Profile – Unverified", no fake government registration numbers, and transparent simulation notices).
- **100% Database Safety & Zero Regressions**:
  - Pre-flight backup taken at `backend/backups/mysql/mediconnect_mysql_20261111_224542_pre_ap_ts_integration.json` (SHA-256 verified).
  - All 32 existing users, 5 active appointments, and Doctors 1–6 were preserved without any foreign key breakage.
  - Seeding script `backend/seed_ap_ts_data.py` verified for strict idempotency (0 duplicate records upon repeated execution).
  - All test suites passed: `test_ap_ts_integration.py` (8/8), `test_phase2_registration_approval.py` (17/17), `test_phase3_search.py` (18/18), and `test_phase1_security.py` (11/11).
  - Frontend lint (`oxlint`) and production build (`vite build`) passed with 0 errors.

---

## 1. Curated Real Hospitals Dataset (24 Hospitals)

### Andhra Pradesh (12 Hospitals)

| # | Hospital Name | City | Type | Official Website / Source | Emergency Contact | Key Facilities |
|---|---------------|------|------|---------------------------|-------------------|----------------|
| 1 | **King George Hospital (KGH)** | Visakhapatnam | Government General Hospital | `https://kghvisakhapatnam.com` | +91-891-2564899 / 108 | 24/7 Trauma Care, Multi-Specialty ICU, Blood Bank, NICU, Dialysis Unit, Diagnostic Labs |
| 2 | **Apollo Hospitals Health City** | Visakhapatnam | Private Multi-Specialty | `https://www.apollohospitals.com/visakhapatnam` | 1066 | Advanced Cath Lab, 24/7 Emergency & Trauma, Robotic Surgery, PET-CT, Multi-Organ Transplant |
| 3 | **Manipal Hospital Vijayawada** | Vijayawada | Private Multi-Specialty | `https://www.manipalhospitals.com/vijayawada` | +91-866-2223344 | 24/7 Emergency, Linear Accelerator, ECMO, Kidney & Liver Transplant, Dialysis Unit |
| 4 | **Aster Ramesh Hospitals** | Vijayawada | Private Multi-Specialty | `https://www.asterhospitals.in/hospitals/aster-ramesh-vijayawada` | +91-866-2488889 | Cardiac Emergency, Stroke Care Center, Modular OTs, Cath Lab, Neuro ICU, 24/7 Pharmacy |
| 5 | **Government General Hospital (GGH) Guntur** | Guntur | Government General Hospital | `https://guntur.ap.gov.in` | 108 | 24/7 Casualty, Blood Bank, Burns Care Center, Dialysis, Pediatric ICU, General Surgery OTs |
| 6 | **Ramesh Hospitals Guntur** | Guntur | Private Multi-Specialty | `https://www.asterhospitals.in/hospitals/aster-ramesh-guntur` | +91-863-2377778 | Interventional Cardiology, Trauma Care, Neuro ICU, Laparoscopic Surgery, Dialysis |
| 7 | **Sri Venkateswara Institute of Medical Sciences (SVIMS)** | Tirupati | Government Super-Specialty Institute | `https://svimstpt.ap.nic.in` | +91-877-2287152 | Advanced Oncology, Renal Sciences, 24/7 Cardiac Care, MRI & CT, Telemedicine, Critical Care ICU |
| 8 | **Sri Venkateswara Aravind Eye Hospital** | Tirupati | Specialty Eye Hospital | `https://aravind.org/hospitals/tirupati` | +91-877-2501111 | Cataract Modular OT, Cornea Clinic, Vitreo-Retinal Unit, Glaucoma Clinic, Pediatric Ophthalmology |
| 9 | **KIMS Hospitals Kurnool** | Kurnool | Private Multi-Specialty | `https://www.kimshospitals.com/kurnool` | +91-8518-245679 | 24/7 Emergency & Trauma, Modern Cath Lab, Neurosurgery Unit, Hemodialysis, Critical Care ICU |
| 10 | **Apollo Specialty Hospitals Nellore** | Nellore | Private Multi-Specialty | `https://www.apollohospitals.com/nellore` | 1066 | Cardiac Sciences, Orthopedics & Joint Replacement, 24/7 Trauma, ICU, Advanced Radiology & CT |
| 11 | **Government General Hospital Rajahmundry** | Rajahmundry | Government General Hospital | `https://eastgodavari.ap.gov.in` | 108 | 24/7 Emergency Casualty, Maternity Ward, Pediatric ICU, Blood Bank, X-Ray & Ultrasound |
| 12 | **Medicover Hospitals Kakinada** | Kakinada | Private Multi-Specialty | `https://www.medicoverhospitals.in/hospitals/andhra-pradesh/kakinada` | 040-68334455 | 24/7 Emergency & Critical Care, Cath Lab, Dialysis Center, Neonatal ICU, Orthopedic Surgery |

### Telangana (12 Hospitals)

| # | Hospital Name | City | Type | Official Website / Source | Emergency Contact | Key Facilities |
|---|---------------|------|------|---------------------------|-------------------|----------------|
| 13 | **Apollo Health City Jubilee Hills** | Hyderabad | Private Multi-Specialty (JCI Accredited) | `https://hyderabad.apollohospitals.com` | 1066 | Proton Therapy, Robotic Surgery, Multi-Organ Transplant, 24/7 Emergency, Comprehensive Cancer Center |
| 14 | **Yashoda Hospitals Somajiguda** | Hyderabad | Private Multi-Specialty | `https://www.yashodahospitals.com` | +91-40-23319999 | 24/7 Emergency, Bone Marrow Transplant, Advanced Neuro Sciences, ECMO, High-End Cath Lab |
| 15 | **Nizam's Institute of Medical Sciences (NIMS)** | Hyderabad | Government Autonomous Institute | `https://nims.edu.in` | +91-40-23489244 | Apex Trauma Center, Renal & Liver Transplant, Cardiology & CTVS, Advanced Diagnostics, Medical Oncology |
| 16 | **KIMS Hospitals Secunderabad** | Secunderabad | Private Multi-Specialty | `https://www.kimshospitals.com/secunderabad` | +91-40-44885100 | Heart & Lung Transplant, Comprehensive Neuro Sciences, 24/7 Trauma, Robotic Orthopedics, Dialysis |
| 17 | **Gandhi Hospital Secunderabad** | Secunderabad | Government Tertiary Teaching Hospital | `https://gmcsecunderabad.org` | 108 | 24/7 Acute Casualty, Multi-Specialty ICUs, Free Blood Bank, Dialysis, Advanced Surgery OTs |
| 18 | **MGM Government Hospital Warangal** | Warangal | Government Tertiary Teaching Hospital | `https://health.telangana.gov.in` | 108 | 24/7 Trauma Care, Regional Cancer Center, Dialysis Center, Neonatal ICU, Maternal Care |
| 19 | **Medicover Hospitals Warangal** | Warangal | Private Multi-Specialty | `https://www.medicoverhospitals.in/hospitals/telangana/warangal` | 040-68334455 | 24/7 Emergency, Critical Care, Cath Lab, Laparoscopic Surgery, Radiology & CT/MRI |
| 20 | **Apollo Reach Hospital Karimnagar** | Karimnagar | Private Multi-Specialty | `https://www.apollohospitals.com/karimnagar` | 1066 | 24/7 Emergency & Trauma, Cardiac Care, Dialysis, Critical Care ICU, Modern Diagnostic Lab |
| 21 | **Government General Hospital Karimnagar** | Karimnagar | Government General Hospital | `https://karimnagar.telangana.gov.in` | 108 | 24/7 Casualty, Blood Bank, Dialysis Unit, Maternal & Child Health Wing, Ultrasound & X-Ray |
| 22 | **Government General Hospital Nizamabad** | Nizamabad | Government Tertiary Teaching Hospital | `https://nizamabad.telangana.gov.in` | 108 | 24/7 Emergency, Pediatric ICU, Blood Storage Center, General Surgery OTs, Free Pharmacy |
| 23 | **Tirumala Multi Specialty Hospital Nizamabad** | Nizamabad | Private Multi-Specialty | `https://tirumalahospitals.com` | +91-8462-245556 | 24/7 Emergency, Orthopedics, Cardiology, Dialysis, Advanced ICU, Ambulance Service |
| 24 | **Mamata General & Super Specialty Hospital** | Khammam | Private Multi-Specialty Teaching Hospital | `https://mamata.org` | +91-8742-235161 | 24/7 Emergency & Trauma, Cardiac ICU, Renal Dialysis, Advanced Surgery OTs, CT/MRI |

---

## 2. Real Doctor Profiles (Publicly Verifiable)

The following real clinicians were curated from official public institutional directories. Each doctor profile includes genuine qualification degrees, active clinical specialties, experience, affiliated hospital branch, and direct links to the official directory:

| # | Doctor Name | Specialization | Affiliated Hospital & City | Qualifications | Experience | Official Directory Citation |
|---|-------------|----------------|----------------------------|----------------|------------|----------------------------|
| 1 | **Dr. Pratap Chandra Rath** | Cardiology | Apollo Health City, Jubilee Hills, Hyderabad | MBBS, MD (Gen Med), DM (Cardiology), FACC, FSCAI | 35 Years | `https://hyderabad.apollohospitals.com/doctors/dr-pratap-chandra-rath/` |
| 2 | **Dr. Sudhir Kumar** | Neurology | Apollo Health City, Jubilee Hills, Hyderabad | MBBS, MD (Int Med), DM (Neurology) | 24 Years | `https://hyderabad.apollohospitals.com/doctors/dr-sudhir-kumar/` |
| 3 | **Dr. B. Bhaskar Rao** | Cardiology / CTVS | KIMS Hospitals, Begumpet, Secunderabad | MBBS, MS (Gen Surgery), MCh (CTVS) | 32 Years | `https://www.kimshospitals.com/doctor/dr-b-bhaskar-rao/` |
| 4 | **Dr. Ravi Raju Tatapudi** | Nephrology & Urology | Apollo Hospitals Health City, Visakhapatnam | MBBS, MD (Gen Med), DM (Nephrology), FRCP | 38 Years | `https://www.apollohospitals.com/visakhapatnam/doctors/dr-ravi-raju-tatapudi/` |
| 5 | **Dr. Nanda Kishore Panigrahi** | Cardiology | Apollo Hospitals Health City, Visakhapatnam | MBBS, MD (Medicine), DM (Cardiology), FACC | 22 Years | `https://www.apollohospitals.com/visakhapatnam/doctors/dr-nanda-kishore-panigrahi/` |
| 6 | **Dr. P. Ramesh Babu** | Cardiology | Aster Ramesh Hospitals, ITI Road, Vijayawada | MBBS, MD (Int Med), DM (Cardiology), FSCAI | 30 Years | `https://www.asterhospitals.in/doctors/dr-p-ramesh-babu/` |
| 7 | **Maj. Gen. Dr. Somasundaram Kumaravelu (Retd.)** | Neurology | Aster Ramesh Hospitals, ITI Road, Vijayawada | MBBS, MD (Gen Med), DM (Neurology) | 34 Years | `https://www.asterhospitals.in/doctors/dr-somasundaram-kumaravelu/` |
| 8 | **Dr. M. Madhusudhana Babu** | Neurology | Apollo Hospitals Health City, Visakhapatnam | MBBS, MD (Int Med), DM (Neurology) | 18 Years | `https://www.apollohospitals.com/visakhapatnam/doctors/dr-m-madhusudhana-babu/` |
| 9 | **Dr. Indhukuri Satish Raju** | Orthopedics | Apollo Hospitals Health City, Visakhapatnam | MBBS, MS (Orthopedics), MCh (Orthopedics) | 16 Years | `https://www.apollohospitals.com/visakhapatnam/doctors/dr-indhukuri-satish-raju/` |
| 10 | **Dr. Sreedevi Matta** | Obstetrics & Gynecology | Apollo Hospitals Health City, Visakhapatnam | MBBS, DGO, DNB (OBG) | 15 Years | `https://www.apollohospitals.com/visakhapatnam/doctors/dr-sreedevi-matta/` |

---

## 3. High-Quality Simulation Demo Doctors

For institutions where public individual listings are not published or where comprehensive simulation profiles were needed to enable full appointment booking flows:
- Marked strictly as `is_demo = True`, `is_verified = False`, `verification_status = 'Demo Profile (Unverified)'`.
- Registration numbers set to `None` to prevent misleading representation.
- Transparent disclaimer: `"Demo clinical profile created for platform simulation. Not an official hospital appointment listing."`
- Real hospital affiliation maintained so patients can book appointments and simulate complete hospital-specific workflows.

---

## 4. Frontend & Bilingual UI Enhancements

1. **DoctorCard & DoctorDetails**:
   - Distinct verified badge: Green checkmark badge with `"Verified Clinician"` (Telugu: `"ధృవీకరించబడిన వైద్యుడు"`).
   - Distinct demo badge: Slate badge with `"Demo Profile (Unverified)"` (Telugu: `"డెమో ప్రొఫైల్ (ధృవీకరించబడలేదు)"`).
   - Official directory citation link: Direct clickable external link `View Verified Hospital Listing ↗` pointing to authentic hospital portals for real doctors.
2. **HospitalCard & HospitalDetails**:
   - `hospital_type` tag displayed prominently (e.g. `Government General Hospital`, `Private Multi-Specialty`, `Specialty Hospital`).
   - Location displayed with both City and State (e.g., `Visakhapatnam, Andhra Pradesh`, `Hyderabad, Telangana`).
   - Direct link to `Official Portal ↗`.
3. **Filter & Search Upgrades**:
   - `Hospitals.jsx` upgraded with a **State filter dropdown** (`All States`, `Andhra Pradesh`, `Telangana`) alongside existing city filter.
   - `Doctors.jsx` global search enhanced to match across Doctor name, location, hospital name, city, state, and qualification.
4. **Translations (`translations.js`)**:
   - Symmetrical Telugu and English keys added for `verifiedClinician`, `demoProfile`, `officialProfile`, `officialWebsite`, `governmentGeneral`, `privateMultiSpecialty`, `specialtyHospital`, `filterState`.

---

## 5. Verification & Quality Assurance Summary

| Test Category | Command / Verification | Result | Notes |
|---------------|------------------------|--------|-------|
| **Database Migration** | `010_ap_ts_hospital_doctor_integration.py` | **SUCCESS** | Added columns to `hospitals` and `doctors`; registered in `schema_migrations`. |
| **Data Seeding & Idempotency** | `python backend/seed_ap_ts_data.py` (Run 1 & 2) | **SUCCESS** | Run 1: 24 hospitals, 29 doctors created. Run 2: 0 created, 24 hospitals updated, 29 doctors updated. Exactly 0 duplicates. |
| **Database Counts** | SQL Queries via PyMySQL | **SUCCESS** | 28 Hospitals, 12 Specializations, 35 Doctors (10 Verified, 25 Demo), 32 Users preserved, 5 Appointments preserved. |
| **Integration Test Suite** | `python backend/test_ap_ts_integration.py` | **8/8 PASSED** | All 14 cities validated, real doctor profile URLs validated, API endpoints and filters validated. |
| **Phase 2 Regression Test** | `python backend/test_phase2_registration_approval.py` | **17/17 PASSED** | Multi-role registration, IDOR defense, and approval workflows 100% functional. |
| **Phase 3 Search Test** | `python backend/test_phase3_search.py` | **18/18 PASSED** | Search, filter, sorting, and pagination logic intact. |
| **Phase 1 Security Test** | `python backend/test_phase1_security.py` | **11/11 PASSED** | RBAC isolation, password security, and platform owner endpoints intact. |
| **Frontend Code Quality** | `npm --prefix frontend run lint` | **0 ERRORS** | Oxlint passed across all 95 frontend files. |
| **Frontend Production Build**| `npm --prefix frontend run build` | **0 ERRORS** | Vite production bundle generated cleanly in 697ms. |
| **Daemon Services** | Task management | **ACTIVE** | Waitress daemon running at `127.0.0.1:5000`; Vite dev server running at `127.0.0.1:5173`. |

