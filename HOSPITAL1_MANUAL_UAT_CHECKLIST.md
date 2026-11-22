# MediConnect – Hospital 1 Manual User Acceptance Testing (UAT) Checklist

**Pilot Target:** Reliability General Hospital (Hospital ID: `1`, Metropolis, NY)  
**Document Status:** **PENDING HUMAN UAT EXECUTION**  
**Classification:** Operational Acceptance Document  
**Instructions:** Human testers must execute each test scenario in the MediConnect web application UI, observe actual behavior, record notes, and sign off in the designated fields. **No test item may be marked PASS without actual human verification.**

---

## 1. Test Environment & Credentials Reference

> [!IMPORTANT]
> All credentials listed below are designated for the controlled Hospital 1 pilot environment. Ensure the browser points to the authorized local or staging frontend instance (`http://localhost:5173` or staging URL).

| Role | Designated User Email | Role in Platform | Scope of Access |
| :--- | :--- | :--- | :--- |
| **Hospital Admin** | `legacy.admin@medicare.com` | Primary Hospital Administrator | Reliability General Hospital (ID: 1) only |
| **Doctor** | `dr.one@medicare.com` | Attending Cardiologist (Dr. Rajesh Kumar) | Own appointments, patients, and prescriptions |
| **Receptionist** | `reception.hosp1@medicare.com` | Front-Desk Receptionist | Hospital 1 queue, check-in, walk-in registration |
| **Patient** | `patient.alpha@test.com` (or self-registered) | Registered Patient | Personal bookings, medical records, prescriptions |

---

## 2. Role 1 — Hospital Admin UAT Scenarios

**Tester Name:** ___________________________  
**Date of Execution:** _______________________  

| Scenario ID | Test Scenario | Step-by-Step Actions | Expected Behavior | Status | Tester Notes |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **HA-01** | Admin Authentication & Dashboard Loading | 1. Navigate to `/login`.<br>2. Select role **Hospital Admin**.<br>3. Enter `legacy.admin@medicare.com` and password.<br>4. Submit login. | Successfully redirects to `/hospital-admin/dashboard`. Displays hospital metrics: 5 Doctors, 3 Staff, and today's appointments. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **HA-02** | Hospital Profile Immutability Protection | 1. Open **Hospital Profile** (`/hospital-admin/hospital-profile`).<br>2. Verify name `Reliability General Hospital` is displayed.<br>3. Attempt to edit the hospital name field.<br>4. Click Save. | Hospital name field is locked/disabled or save rejects name modification. Profile contact details update successfully without altering registered hospital name. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **HA-03** | Doctors Roster Inspection | 1. Open **Doctors** (`/hospital-admin/doctors`).<br>2. Inspect doctor list.<br>3. Verify doctor specializations and status. | Lists all 5 Cardiology doctors. Dr. Rajesh Kumar is linked with active status. No unassigned hospital doctors appear. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **HA-04** | Receptionist Staff Management | 1. Open **Receptionists** (`/hospital-admin/receptionists`).<br>2. View active receptionists.<br>3. Toggle status of a test staff member. | Active receptionists (ID 9, 30, 31) are visible. Status toggle reflects immediately in UI and persists on page reload. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **HA-05** | Hospital Appointments Filter | 1. Open **Appointments** (`/hospital-admin/appointments`).<br>2. Filter by status (Pending, Completed).<br>3. Search by patient name. | Displays only Hospital 1 appointments. Filters update table dynamically. No cross-hospital appointments leaked. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **HA-06** | Departmental Utilization Reports | 1. Open **Reports** (`/hospital-admin/reports`).<br>2. Inspect Cardiology utilization and appointment completion rates. | Charts and summaries load cleanly with zero HTTP 500 errors. Metrics reflect Hospital 1 data only. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **HA-07** | SuperAdmin Route Restriction (Negative) | 1. Manually navigate URL to `/superadmin/dashboard` or `/owner/dashboard`. | System denies access immediately. Redirects to `/hospital-admin/dashboard` or displays 403 Forbidden message. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |

**Hospital Admin Section Sign-off:**  
Signature: ___________________________________ Date: _______________ Result: `[ ] APPROVED` `[ ] REJECTED`

---

## 3. Role 2 — Doctor Portal UAT Scenarios

**Tester Name:** ___________________________  
**Date of Execution:** _______________________  

| Scenario ID | Test Scenario | Step-by-Step Actions | Expected Behavior | Status | Tester Notes |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **DOC-01** | Doctor Authentication & Daily Queue | 1. Navigate to `/login`.<br>2. Select role **Doctor**.<br>3. Enter `dr.one@medicare.com` and credentials.<br>4. Submit login. | Redirects to `/doctor/dashboard`. Shows assigned appointments, today's schedule, and patient statistics. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **DOC-02** | Appointment Patient Consultation View | 1. Open **Appointments** (`/doctor/appointments`).<br>2. Select an active appointment.<br>3. View patient age, gender, consultation reason. | Patient clinical summary opens. Patient history is visible for attending doctor only. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **DOC-03** | Digital Prescription Generation | 1. Click **Create Prescription** on an active appointment.<br>2. Enter diagnosis, medication name, dosage (e.g. 500mg), frequency, and duration.<br>3. Save prescription. | Prescription generates with unique ID, timestamp, and doctor signature. Status transitions to Completed. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **DOC-04** | Working Hours & Availability Update | 1. Open **Doctor Profile** (`/doctor/profile`).<br>2. Update availability hours (e.g., 09:00 AM – 04:00 PM).<br>3. Save changes. | Availability updates successfully. Updated hours reflect on public appointment booking schedule. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **DOC-05** | Cross-Hospital Appointment Boundary (Negative) | 1. Attempt to view an appointment ID belonging to Hospital 2. | Access denied with 403/404. Doctor cannot inspect or prescribe for appointments outside Hospital 1. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |

**Doctor Section Sign-off:**  
Signature: ___________________________________ Date: _______________ Result: `[ ] APPROVED` `[ ] REJECTED`

---

## 4. Role 3 — Receptionist UAT Scenarios

**Tester Name:** ___________________________  
**Date of Execution:** _______________________  

| Scenario ID | Test Scenario | Step-by-Step Actions | Expected Behavior | Status | Tester Notes |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REC-01** | Receptionist Login & Queue View | 1. Navigate to `/login`.<br>2. Select role **Receptionist**.<br>3. Enter `reception.hosp1@medicare.com`.<br>4. Submit login. | Redirects to `/reception/dashboard`. Displays current day queue, scheduled check-ins, and pending arrivals. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **REC-02** | Walk-in Patient Registration | 1. Open **Patient Check-in / Registration**.<br>2. Enter walk-in patient name, phone, age, gender.<br>3. Submit walk-in form. | Temporary walk-in record created. Patient ID generated and added to today's queue. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **REC-03** | In-Person Appointment Booking | 1. Select registered patient.<br>2. Select Doctor (Dr. Rajesh Kumar).<br>3. Pick available future date and time slot.<br>4. Confirm booking. | Appointment booked successfully. Active slot key is locked; slot no longer appears available to other callers. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **REC-04** | Patient Check-in Execution | 1. Locate arriving patient in queue.<br>2. Click **Check-In**.<br>3. Confirm arrival. | Appointment status changes to `Checked-In`. Notification updates on Doctor's active dashboard. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **REC-05** | Unauthorized Cross-Hospital Booking (Negative) | 1. Attempt to force booking for a doctor in Hospital 2. | System returns error message: "Receptionists can only book appointments for doctors in their assigned hospital." | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |

**Receptionist Section Sign-off:**  
Signature: ___________________________________ Date: _______________ Result: `[ ] APPROVED` `[ ] REJECTED`

---

## 5. Role 4 — Patient UAT Scenarios

**Tester Name:** ___________________________  
**Date of Execution:** _______________________  

| Scenario ID | Test Scenario | Step-by-Step Actions | Expected Behavior | Status | Tester Notes |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **PAT-01** | Patient Account Registration | 1. Navigate to `/register`.<br>2. Enter name, email, phone, age, gender, password, and confirm password.<br>3. Submit registration. | Registration succeeds (201 Created). Auto-logs in or prompts for login with clear success alert. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **PAT-02** | Hospital Discovery & Selection | 1. Navigate to `/hospitals`.<br>2. Search for "Reliability General Hospital".<br>3. Open hospital profile. | Hospital card loads with address (100 Quality Way, Metropolis, NY), facilities, and emergency contact (108). | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **PAT-03** | Doctor Selection & Slot Booking | 1. View Cardiology doctors at Reliability General Hospital.<br>2. Select Dr. Rajesh Kumar.<br>3. Pick an open date and time slot.<br>4. Enter consultation reason and confirm. | Booking confirmed. Appointment appears immediately under `/patient/appointments` with status `Pending` or `Confirmed`. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **PAT-04** | Duplicate Slot Collision (Negative) | 1. In a second browser tab, attempt to book the exact same doctor and slot. | System prevents duplicate booking with error: "This slot is already booked. Please choose another time." | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **PAT-05** | Digital Prescription Access | 1. After doctor marks appointment completed, navigate to **My Prescriptions** (`/patient/prescriptions`).<br>2. Click view/download on the issued prescription. | Prescription modal opens displaying medication names, dosage, instructions, and doctor signature. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |
| **PAT-06** | Patient IDOR Boundary (Negative) | 1. Attempt to open `/api/appointments/<id>` of an appointment belonging to another patient. | Request returns `403 Forbidden` or `404 Not Found`. Other patients' health data cannot be viewed. | `[ ] PENDING`<br>`[ ] PASS`<br>`[ ] FAIL` | |

**Patient Section Sign-off:**  
Signature: ___________________________________ Date: _______________ Result: `[ ] APPROVED` `[ ] REJECTED`

---

## 6. Final Human UAT Summary Sign-Off

All four stakeholder roles must successfully sign off before Hospital 1 pilot traffic is enabled:

| Role | Tester Name | Sign-Off Date | Verification Verdict | Signature |
| :--- | :--- | :---: | :---: | :--- |
| **Hospital Administrator** | | | `[ ] PASS` `[ ] FAIL` | |
| **Lead Doctor (Cardiology)**| | | `[ ] PASS` `[ ] FAIL` | |
| **Head Receptionist** | | | `[ ] PASS` `[ ] FAIL` | |
| **Patient Experience Lead** | | | `[ ] PASS` `[ ] FAIL` | |

**Final UAT Acceptance Decision:**  
`[ ] ACCEPTED FOR PILOT LAUNCH`  
`[ ] REJECTED — DEFECTS REQUIRING REMEDIATION`  

**Quality Assurance Lead:** _______________________________ **Date:** ___________________
