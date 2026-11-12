# MediConnect — Pre-Deployment Manual Review Guide

**Target Environment:** Local Development & Review Host (Windows)  
**Project Path:** `C:\Users\Lap12NOC\Desktop\DoctorApp`  
**Frontend URL:** `http://localhost:5173`  
**Backend API:** `http://127.0.0.1:5000/api`  
**Database Status:** MySQL 8.0 `mediconnect` (13 tables verified intact) & SQLite WAL fallback (`backend/doctor_hospital.db`)  
**Security Status:** Zero unapproved mutations, zero credential leaks, all security and RBAC tests verified (100% pass)

---

## 1. Safety Rules & Review Scope

This is a **strictly read-only / local inspection workflow**.

- **No Deployment:** Do not execute cloud or hosting deployment commands.
- **No Git Commits or Pushes:** Do not push additional Git commits or alter history.
- **Data Protection:** MySQL database `mediconnect` and master SQLite `backend/doctor_hospital.db` must not be dropped, reset, or truncated.
- **Credential Safety:** Never share, export, or log database passwords, JWT secret keys, or live patient data.
- **Clean Execution:** All servers must be stopped cleanly following the shutdown instructions in Section 7.

---

## 2. Startup Instructions

You can start the MediConnect application using **Option A (One-Click Batch Script)** or **Option B (Two Separate Terminal Windows)**.

### Option A: One-Click Demo Launcher (Recommended)
From the project root (`C:\Users\Lap12NOC\Desktop\DoctorApp`):
```cmd
start_demo.bat
```
*What this does:*
1. Runs automated pre-flight checks (`backend/check_demo_prerequisites.py`).
2. Spawns the Waitress WSGI backend on port 5000 in a dedicated console window.
3. Spawns the Vite development frontend on port 5173 in a dedicated console window.
4. Automatically opens Google Chrome to `http://localhost:5173`.

---

### Option B: Manual Two-Terminal Startup

#### Terminal 1 — Backend API (Waitress WSGI)
```cmd
cd C:\Users\Lap12NOC\Desktop\DoctorApp\backend
python -m waitress --port=5000 --host=127.0.0.1 --threads=4 app:app
```
*Expected log:* `INFO:waitress:Serving on http://127.0.0.1:5000`

#### Terminal 2 — Frontend Dev Server (Vite)
```cmd
cd C:\Users\Lap12NOC\Desktop\DoctorApp\frontend
npm run dev -- --host 127.0.0.1
```
*Expected log:* `➜  Local:   http://127.0.0.1:5173/`

#### Browser Access
Open Google Chrome and navigate to:
**`http://localhost:5173`** (or `http://localhost:5173/login`)

---

## 3. Account Roles & Login Instructions

The MediConnect login page (`/login`) features **Dynamic Role Adaptation** and **1-Click Quick Demo Sign-In** buttons at the bottom of the form for rapid persona inspection without manual typing.

| Role Persona | Role Code | Account Email | UI Theme Accent | Primary Landing Page |
|---|---|---|---|---|
| **Platform Owner** | `PLATFORM_OWNER` | `owner@mediconnect.com` | Deep Slate / Red (`#b91c1c`) | `/owner` |
| **Hospital Super Admin** | `HOSPITAL_SUPER_ADMIN` | `admin.hosp1@medicare.com` | Operations Amber (`#ea580c`) | `/superadmin` |
| **Receptionist** | `RECEPTIONIST` | `reception.hosp1@medicare.com` | Front-Desk Violet (`#7c3aed`) | `/admin` |
| **Doctor** | `DOCTOR` | `dr.one@medicare.com` | Medical Teal (`#0d9488`) | `/doctor` |
| **Patient / User** | `PATIENT` | `patient.alpha@test.com` | Care Sky Blue (`#0284c7`) | `/patient` |

### Using 1-Click Quick Demo Sign-In
1. Navigate to `http://localhost:5173/login`.
2. Scroll to the **"⚡ 1-Click Demo Accounts"** section at the bottom of the sign-in card.
3. Click the desired persona button (e.g., **Demo Super Admin** or **Demo Doctor**).
4. Notice the form dynamically adapts the heading, color theme, and icon.
5. Click the primary sign-in button to enter that persona's portal.

---

## 4. Portal-by-Portal Manual Review Checklist

### 4.1 Platform Owner Portal (`/owner`)
- [ ] **Platform Overview (`/owner`):** Confirm summary KPI tiles display total affiliated hospitals, registered staff, active appointments, and platform health status.
- [ ] **Hospital Management (`/owner/hospitals`):**
  - Verify directory list of hospitals across cities (Hyderabad, Bangalore, etc.).
  - Test search bar filtering by hospital name or city.
  - Click **"Onboard New Hospital"** button to inspect the hospital branch onboarding modal and Super Admin assignment fields.
- [ ] **Invitation Monitoring (`/owner/invitations`):**
  - Verify table of platform-wide staff invitations.
  - Check status badges: `Pending`, `Accepted`, `Revoked`, `Expired`.
- [ ] **Security Audit Logs (`/owner/audit-logs`):**
  - Inspect chronological log of administrative security events (invitation issuances, logins, revocations).
- [ ] **Logout:** Click **Sign Out** in the sidebar to ensure clean session teardown.

---

### 4.2 Hospital Super Admin Portal (`/superadmin`)
- [ ] **Hospital Dashboard (`/superadmin`):**
  - Verify branch-specific KPIs: Active Doctors, Reception Staff, Daily Consultations, and Fleet readiness.
  - Notice the hospital name badge pinned to the top header indicating tenant scoping.
- [ ] **Hospital Staff Management (`/superadmin/staff`):**
  - **Staff Roster Tab:** Review doctors and receptionists assigned to this hospital.
  - **Invitations Tab:** View pending and accepted invitations.
  - Click **"Invite Staff Member"** button: verify role dropdown restricts choices strictly to `Doctor` and `Receptionist` (role escalation protection).
- [ ] **Doctor Management (`/superadmin/doctors`):**
  - Verify doctor list, specializations, consultation fees, and active status.
- [ ] **Departments (`/superadmin/departments`):**
  - Inspect configured clinical departments (Cardiology, Neurology, Pediatrics, Orthopedics, etc.).
- [ ] **Reports (`/superadmin/reports`):**
  - Review appointment metrics, completion ratios, and patient intake summaries.
- [ ] **Logout:** Verify logout returns to `/login`.

---

### 4.3 Receptionist Front-Desk Portal (`/admin`)
- [ ] **Front-Desk Theme:** Notice the distinct Front-Desk Violet (`#7c3aed`) visual branding.
- [ ] **Live Consultation Queue (`/admin`):**
  - Verify today's incoming patient appointments.
  - Check status progression pills (`Scheduled`, `Arrived`, `In-Consultation`, `Completed`).
- [ ] **Patient Arrival & Check-In Terminal (`/admin/check-in`):**
  - Search by patient name or appointment ID.
  - Test 1-click check-in action.
- [ ] **Front-Desk Appointments (`/admin/appointments`):**
  - Review comprehensive booking table and daily calendar triage.
- [ ] **Walk-in Patient Intake (`/admin/patients/new`):**
  - Fill walk-in patient registration form.
  - Verify smooth transition into the booking modal with hospital doctors pre-loaded.

---

### 4.4 Doctor Clinical Portal (`/doctor`)
- [ ] **Clinical Dashboard (`/doctor`):**
  - Check today's agenda, consultation queue count, and next attending patient card.
- [ ] **Daily Clinical Schedule (`/doctor/schedule`):**
  - Inspect appointment timeline and filter by status (`Confirmed`, `Pending`, `Completed`).
- [ ] **Patient Consultations & Notes (`/doctor/appointments`):**
  - Review scheduled visits.
  - Open clinical assessment modal on an appointment to review chief complaint, clinical notes, diagnosis, and prescription fields.
- [ ] **Attending Patient Roster (`/doctor/patients`):**
  - Confirm doctor can only view patient summaries for patients who have an active or attended appointment with this doctor.
- [ ] **Doctor Profile (`/doctor/profile`):**
  - Review doctor credentials, consultation fee, available hours, and specialization.

---

### 4.5 Patient Care Portal (`/patient`)
- [ ] **Patient Health Dashboard (`/patient`):**
  - Check upcoming medical appointments tile, quick links, and emergency hotline cards.
- [ ] **My Consultations (`/patient/appointments`):**
  - Review appointment history with attending doctors, dates, times, and status tags.
  - Check cancellation button on pending future appointments.
- [ ] **Medical Records & Prescriptions (`/patient/records`):**
  - Review clinical consultation notes and doctor prescriptions.
  - Confirm read-only, tamper-proof clinical integrity notice banner.
- [ ] **Specialist Discovery (`/patient/doctors`):**
  - Search specialists by name, medical specialty, or hospital facility.
- [ ] **Book Appointment (`/appointments/book/:doctorId`):**
  - Select doctor, pick an available day, choose a time slot, and submit booking.
- [ ] **Emergency Hotline (`/patient/emergency`):**
  - Verify 108 / 112 emergency contacts and ambulance dispatch options.

---

## 5. Key Workflows to Test

### Workflow 1: Dynamic Role Adaptation
1. Open `http://localhost:5173/login`.
2. Click through the role switcher tabs: **Patient**, **Doctor**, **Receptionist**, **Super Admin**, **Platform Owner**.
3. **Verify:**
   - Heading changes to match role.
   - Portal description and helper prompt update.
   - Accent colors transition smoothly.
   - Patient shows *"Register as a Patient"*; staff roles show *"Staff accounts are provisioned via secure hospital invitation"*.

### Workflow 2: Patient Arrival Check-In to Doctor Queue
1. Log in as **Receptionist** (`reception.hosp1@medicare.com`).
2. Navigate to `/admin/check-in`.
3. Locate a patient scheduled for today and click **Check In**.
4. Log out and log in as **Doctor** (`dr.one@medicare.com`).
5. Open `/doctor`.
6. **Verify:** The checked-in patient immediately reflects in the doctor's active clinical queue.

### Workflow 3: Route Protection & RBAC Enforcement
1. Log in as **Patient** (`patient.alpha@test.com`).
2. Type `http://localhost:5173/owner` into the browser URL address bar and press Enter.
3. **Verify:** You are intercepted by the route guard and safely redirected to `/patient` (or `/login`).
4. Type `http://localhost:5173/superadmin` into the address bar.
5. **Verify:** You are intercepted and prevented from accessing branch administrative operations.

### Workflow 4: Responsive Viewport Flexibility
1. Open Chrome DevTools (`F12` or `Ctrl+Shift+I`).
2. Toggle Device Toolbar (`Ctrl+Shift+M`).
3. Select **iPad Mini (768 × 1024)**: verify sidebar collapses cleanly into an accessible overlay drawer.
4. Select **iPhone 14 / Mobile (390 × 844)**: verify zero horizontal overflow (`scrollWidth === clientWidth`) with clean mobile header.

---

## 6. Known Considerations & Technical Notes

- **Production Secret Key:** In local review, development fallback keys are used. When deploying to production, specify a high-entropy 256-bit `SECRET_KEY` via environment variables.
- **SQLite Fallback:** If the MySQL service is ever stopped on Windows, the backend automatically switches to SQLite WAL fallback (`backend/doctor_hospital.db`) to ensure continuous application availability.
- **Port Conflict Safeguard:** If port 5000 or 5173 is already in use by another application, terminate the conflicting process or run `stop_demo.bat` before starting.

---

## 7. Safe Shutdown Instructions

When your manual review is complete, shut down all services cleanly using **Option A** or **Option B**.

### Option A: One-Click Shutdown (Recommended)
From the project root:
```cmd
stop_demo.bat
```
*What this does:*
- Safely terminates the Waitress WSGI backend process (port 5000).
- Safely terminates the Vite frontend process (port 5173).
- Ensures no orphaned node or python processes remain.
- Leaves MySQL and SQLite databases 100% intact.

---

### Option B: Manual Console Termination
1. In the **MediConnect Backend** terminal window, press `Ctrl + C` or close the window.
2. In the **MediConnect Frontend** terminal window, press `Ctrl + C` and confirm `Y` (or close the window).
3. To verify that all ports are idle, run in PowerShell:
   ```powershell
   Get-NetTCPConnection -LocalPort 5000,5173 -ErrorAction SilentlyContinue
   ```
   *(No output confirms all servers are completely stopped).*

