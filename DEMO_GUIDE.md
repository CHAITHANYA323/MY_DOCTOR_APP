# MediConnect — Student Viva & Demonstration Guide

This guide provides a step-by-step presentation script for demonstrating the MediConnect Multi-Hospital Healthcare System to college evaluators, external examiners, and professors during a project evaluation or viva voce.

---

## 1. Quick Demonstration Setup (Before Evaluator Arrives)

### Step 1: Confirm System Prerequisites
1. Open PowerShell or Command Prompt.
2. Ensure MySQL Server is running:
   ```powershell
   net start MySQL80
   ```
3. Navigate to the project root directory:
   ```cmd
   cd C:\Users\Lap12NOC\Desktop\DoctorApp
   ```

### Step 2: Launch with One-Click
Double-click [`start_demo.bat`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/start_demo.bat) (or run `.\start_demo.bat` in the terminal).

**What to Observe**:
- The launcher runs `backend/check_demo_prerequisites.py` and displays green `[OK]` marks for Python, packages, MySQL connection (showing 27 active users), and Node.js.
- Two console windows open:
  - `MediConnect Backend (Waitress:5000)`
  - `MediConnect Frontend (Vite:5173)`
- Your web browser automatically opens to `http://localhost:5173`.

---

## 2. Recommended 10-Minute Presentation Script

### Part 1: Project Overview & Homepage (1 Minute)
* **Goal**: Introduce the core concept and multi-hospital capability.
* **Script**:
  > *"Good morning, sir/madam. Today I am demonstrating **MediConnect**, a multi-hospital healthcare platform that connects patients, doctors, receptionists, hospital administrators, and platform owners. Unlike legacy single-hospital systems, MediConnect provides a unified platform hosting multiple independent hospitals while maintaining strict data privacy between them."*
* **Actions on Screen**:
  - Show the **Hero Banner**: "Your Health, Our Priority — Discover Trusted Doctors & Hospitals".
  - Scroll down to show:
    - **Find Doctors & Hospitals**: Search input and quick specialty badges (Cardiology, Neurology, Pediatrics, etc.).
    - **Featured Hospitals**: Cards for *City Health Hospital*, *Apollo Hospital*, *Fortis Hospital*, and *Max Healthcare*.
    - **Emergency Section**: Fast-dial ambulance hotlines (108, 112) and online request button.

---

### Part 2: Patient Experience (2 Minutes)
* **Login Credentials**: `patient.alpha@test.com` | `Patient@123`
* **Goal**: Show public doctor discovery, filtering, and booking.
* **Actions on Screen**:
  1. Click **"Login"** in the top navigation bar.
  2. Enter Patient credentials (`patient.alpha@test.com` / `Patient@123`).
  3. Show the **Patient Dashboard** (`/patient/dashboard`):
     - Displays upcoming appointments, completed consultations, and active medical records.
  4. Click **"Find Doctors"** (`/doctors`):
     - Filter doctors by specialty (select **Cardiology**).
     - Filter by hospital (select **City Health Hospital**).
     - Notice instant filtering without page reloads.
  5. Click **"Book Appointment"** on a doctor card (e.g., Dr. Rajesh Kumar):
     - Select a consultation date and time slot.
     - Add a reason for visit: *"Routine cardiac checkup"*.
     - Click **"Confirm Appointment"**.
     - Notice the toast confirmation and new appointment appearing in the patient's schedule.
  6. Click **"Logout"** in the user menu.

---

### Part 3: Receptionist Patient Intake & Check-In (2 Minutes)
* **Login Credentials**: `reception.hosp1@medicare.com` | `Reception@123`
* **Goal**: Show front-desk outpatient triage and multi-tenant scoping.
* **Actions on Screen**:
  1. Click **"Login"** and sign in as the Receptionist.
  2. The system automatically redirects to the **Receptionist Portal** (`/reception/dashboard`).
  3. Point out the hospital badge: Notice the receptionist is scoped strictly to **City Health Hospital**.
  4. Show the **Today's Check-In Queue**:
     - Locate the patient who just booked an appointment.
     - Click the green **"Check-In"** button.
     - The status instantly changes to **"CONFIRMED"**, notifying the consulting doctor.
  5. Click **"Register Walk-In Patient"** (`/reception/register-patient`):
     - Demonstrate registering an on-site patient who does not have a smartphone.
     - Enter Name, Phone, and create a quick consultation slot.
  6. Click **"Logout"**.

---

### Part 4: Doctor Consultation Portal (2 Minutes)
* **Login Credentials**: `dr.one@medicare.com` | `Doctor@123`
* **Goal**: Demonstrate doctor schedule management and clinical queue.
* **Actions on Screen**:
  1. Log in as the Doctor (`dr.one@medicare.com` / `Doctor@123`).
  2. System directs to the **Doctor Portal** (`/doctor/dashboard`).
  3. Show the **Consultation Queue**:
     - View checked-in patients waiting for consultation.
     - Click on a patient record to view their past visits and clinical reason for consultation.
  4. Click **"My Schedule"** (`/doctor/schedule`):
     - Show the availability toggle: Doctors can turn days or time slots active/inactive.
  5. Point out data isolation: The doctor sees **only** their own consultations and patients; other doctors' schedules remain completely private.
  6. Click **"Logout"**.

---

### Part 5: Hospital Super Administrator Portal (1.5 Minutes)
* **Login Credentials**: `admin.hosp1@medicare.com` | `Admin@123`
* **Goal**: Demonstrate hospital-level administration and staff invitations.
* **Actions on Screen**:
  1. Log in as the Hospital Super Admin (`admin.hosp1@medicare.com` / `Admin@123`).
  2. System directs to **Hospital Admin Dashboard** (`/hospital-admin/dashboard`).
  3. Show the analytics: Active doctors, hospital staff count, and weekly appointment volume.
  4. Click **"Staff Management"** (`/hospital-admin/staff`):
     - View all registered receptionists and doctors for this facility.
     - Show the **"Invite New Staff"** modal: Staff members are invited securely via email without exposing registration backdoors.
  5. Show **Ambulance Fleet** (`/hospital-admin/ambulances`):
     - View ambulances assigned to City Health Hospital and dispatch status.
  6. Click **"Logout"**.

---

### Part 6: Platform Owner Governance (1.5 Minutes)
* **Login Credentials**: `owner@mediconnect.com` | `Owner@123`
* **Goal**: Demonstrate top-tier governance across all hospitals.
* **Actions on Screen**:
  1. Log in as Platform Owner (`owner@mediconnect.com` / `Owner@123`).
  2. System directs to the **Platform Governance Dashboard** (`/owner/dashboard`).
  3. Point out the global metrics: Total hospitals across the network (4), total doctors (6), total registered users (27), total platform appointments.
  4. Click **"Hospitals"** (`/owner/hospitals`):
     - Show the multi-hospital registry: City Health, Apollo, Fortis, Max.
     - Demonstrate the **"Onboard Hospital"** modal (adding a new hospital to the network).
  5. Click **"Audit Logs"** (`/owner/audit-logs`):
     - Highlight compliance: Every administrative action (doctor invitation, status change, hospital creation) is timestamped with the actor's ID and IP address.
  6. Click **"Logout"**.

---

## 3. Key Architectural Points to Highlight in Your Viva

When the examiner asks questions, emphasize these strong technical aspects:

1. **Strict Multi-Tenancy**:
   - *"Each hospital has its own isolated data space. A Hospital Super Admin from Hospital 1 cannot see or modify records belonging to Hospital 2. This is enforced at the database query level using SQLAlchemy filters and `@hospital_scoped` decorators."*

2. **Concurrency & Double-Booking Prevention**:
   - *"We prevent two patients from booking the same doctor at the same minute by using a stored generated column in MySQL (`active_slot_key`) combined with database unique constraints and transaction isolation."*

3. **Production Server Architecture**:
   - *"On Windows, we run the backend on **Waitress WSGI**, a multi-threaded production application server, instead of Flask's default single-threaded development server. On the frontend, **Vite** proxies `/api` calls directly to port 5000."*

4. **Zero-Loss Data Safety**:
   - *"We migrated from SQLite to MySQL 8 with 100% data parity across 11 tables and 55 records without a single foreign key orphan. We also built an in-house backup tool (`backup_mysql.py`) that exports cryptographic JSON snapshots."*

---

## 4. How to Stop the Demonstration Safely

When the presentation concludes:
1. Double-click [`stop_demo.bat`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/stop_demo.bat) in the project folder.
2. The script finds the processes running on ports 5000 and 5173 and terminates them cleanly.
3. Your database and files remain completely safe on disk for future demonstrations.

---

## 5. Visual Verification & Screenshot Index

All eleven primary user interfaces have been verified and captured as high-resolution (1366x768) desktop screenshots located in the [`docs/screenshots/`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/docs/screenshots/) folder. Students can embed these directly into their final project report or presentation slides:

| # | Screenshot File | Role / Feature | Route | Description & Key UI Elements |
| :-: | :--- | :--- | :--- | :--- |
| 1 | [`login-page.png`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/docs/screenshots/login-page.png) | Unified Authentication | `/login` | Multi-role tabbed login switcher (Patient, Doctor, Receptionist, Super Admin, Owner), branding header, email & password form controls. |
| 2 | [`platform-owner-dashboard.png`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/docs/screenshots/platform-owner-dashboard.png) | Platform Owner | `/owner` | System-wide governance overview: registered hospitals count (4), active doctors (6), platform patients, and invitation analytics cards. |
| 3 | [`platform-owner-hospitals.png`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/docs/screenshots/platform-owner-hospitals.png) | Platform Owner | `/owner/hospitals` | Platform hospital registry with search filtering, city chips (Hyderabad, Secunderabad), hospital cards, and onboarding modal trigger. |
| 4 | [`hospital-admin-dashboard.png`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/docs/screenshots/hospital-admin-dashboard.png) | Hospital Super Admin | `/superadmin` | Hospital executive dashboard: on-duty doctors, department count, patient admissions, and hospital-scoped KPI metric counters. |
| 5 | [`hospital-admin-staff.png`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/docs/screenshots/hospital-admin-staff.png) | Hospital Super Admin | `/superadmin/staff` | Hospital staff management table: active staff roster, role badges (Receptionist, Doctor), department allocation, and invite controls. |
| 6 | [`receptionist-dashboard.png`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/docs/screenshots/receptionist-dashboard.png) | Receptionist | `/admin` | Hospital front-desk queue management: today's appointments, token issuance stats, patient check-in counter, and doctor availability. |
| 7 | [`receptionist-checkin.png`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/docs/screenshots/receptionist-checkin.png) | Receptionist | `/admin/check-in` | Rapid patient check-in interface: patient search by phone/MRN, arrival status confirmation, and consultation token generation. |
| 8 | [`doctor-dashboard.png`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/docs/screenshots/doctor-dashboard.png) | Doctor | `/doctor` | Clinical physician portal: daily consultation agenda, patient queue with appointment status badges, and total consultations count. |
| 9 | [`doctor-schedule.png`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/docs/screenshots/doctor-schedule.png) | Doctor | `/doctor/schedule` | Doctor availability manager: weekly consultation timetable, active slot toggles, on-call emergency readiness, and timing controls. |
| 10 | [`patient-dashboard.png`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/docs/screenshots/patient-dashboard.png) | Patient | `/patient` | Patient personal healthcare hub: upcoming appointments, recent consultation history, doctor booking shortcuts, and emergency hotline bar. |
| 11 | [`patient-appointments.png`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/docs/screenshots/patient-appointments.png) | Patient | `/patient/appointments` | Patient appointment records list: booking history with doctor specialty badges, appointment status indicators, and booking cancellation tools. |


