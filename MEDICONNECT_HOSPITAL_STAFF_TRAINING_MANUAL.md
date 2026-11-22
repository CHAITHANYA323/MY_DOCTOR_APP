# MediConnect – Hospital Staff Operational Training Manual & Role Permissions Matrix

**Target Audience:** Hospital Staff (All Six User Personas)  
**Target Facility:** Reliability General Hospital (Hospital ID: 1)  
**Classification:** Operational Workforce Training & Access Governance  
**Document Status:** Approved Training Curriculum  

---

## 1. Role-Specific Operational Modules

This manual provides practical, step-by-step training guidance for the six operational personas of the MediConnect platform.

---

### Module 1: Patient / Family Lead
- **Primary Portal URL:** `https://mediconnect.yourdomain.com/patient`
- **Login Credentials:** Registered email and password (or self-registration via `/register`).
- **Core Modules:**
  - **Specialist Discovery:** Search by specialty, hospital name, or doctor name (`/doctors`, `/hospitals`).
  - **Consultation Booking:** Select convenient time slot, specify reason, confirm appointment.
  - **Queue Tracking:** View scheduled appointment status (`Pending`, `Confirmed`, `Checked-In`, `Completed`).
  - **Digital Prescriptions:** Inspect prescribed medications, dosages, and download signed official PDF records (`/patient/prescriptions`).
  - **Emergency Assistance:** Click **Ambulance 108** on top navigation bar for immediate 24/7 hotline calling.
- **Restricted Actions:** Cannot view other patients' records; cannot access staff administrative consoles.
- **Security Responsibilities:** Never share account password; log out on public/shared devices.

---

### Module 2: Attending Doctor / Specialist
- **Primary Portal URL:** `https://mediconnect.yourdomain.com/doctor`
- **Login Credentials:** Institutional email (e.g. `dr.one@medicare.com`).
- **Core Modules:**
  - **Appointments Queue:** View today's scheduled and checked-in patient queue (`/doctor/appointments`).
  - **Clinical Consultation Review:** Review patient age, gender, consultation reason, and prior consultation notes.
  - **Digital Prescription Issuance:** Click **Issue Rx** to launch prescription builder. Add diagnosis, medications (dosage, frequency, instructions). Save prescription to finalize visit.
  - **Practice Profile:** Update consulting hours, bio, and OPD room location.
- **Permitted Actions:** View assigned patient records, create prescriptions, update visit status to Completed.
- **Restricted Actions:** Cannot access patient records of other doctors or other hospitals; cannot modify hospital billing settings.
- **Security Responsibilities:** Ensure clinical workstation screen locks when unattended; verify prescription accuracy before issuing.

---

### Module 3: Front-Desk Receptionist
- **Primary Portal URL:** `https://mediconnect.yourdomain.com/admin`
- **Login Credentials:** Front-office account (e.g. `reception.hosp1@medicare.com`).
- **Core Modules:**
  - **Daily Arrival Queue:** Inspect arriving patients scheduled for OPD consultations today.
  - **Patient Check-in:** Click **Check-In** when patient arrives at front desk to notify doctor.
  - **Walk-in Patient Intake:** Register walk-in patients via `/admin/checkin` and assign immediate queue tokens.
  - **Appointment Scheduling:** Book clinic visits on behalf of in-person patients.
- **Permitted Actions:** Check in patients, register walk-ins, schedule appointments for assigned hospital doctors.
- **Restricted Actions:** Cannot modify doctor clinical diagnoses or prescriptions; cannot view financial audit logs.
- **Security Responsibilities:** Verify patient identity before intake; maintain confidentiality of patient contact details.

---

### Module 4: Hospital Administrator
- **Primary Portal URL:** `https://mediconnect.yourdomain.com/hospital-admin`
- **Login Credentials:** Administrator credentials (e.g. `legacy.admin@medicare.com`).
- **Core Modules:**
  - **Simplified Operational Dashboard:** Non-technical view of hospital stats, today's appointments, doctor roster, and reception staff.
  - **Doctor Roster Management:** Review doctor availability, qualifications, and active consulting status.
  - **Receptionist Management:** Manage staff access accounts, toggle active/inactive status.
  - **Hospital Profile:** Update contact telephone, ambulance contact, and facility descriptions.
  - **Utilization Reports:** Review appointment completion rates and department workload.
- **Permitted Actions:** Manage hospital operational roster, update contact details, review department metrics.
- **Restricted Actions:** Cannot modify legal hospital name (locked); cannot access other hospitals in the platform.
- **Security Responsibilities:** Promptly deactivate accounts of departed staff; review monthly access audit logs.

---

### Module 5: Hospital Super Admin
- **Primary Portal URL:** `https://mediconnect.yourdomain.com/superadmin`
- **Login Credentials:** SuperAdmin credentials (e.g. `admin.hosp1@medicare.com`).
- **Core Modules:**
  - **Cluster Governance:** Manage assigned cluster of regional hospital facilities.
  - **Hospital Admin Assignments:** Assign and replace primary hospital administrators.
  - **Cross-Facility Analytics:** Compare OPD metrics and utilization across assigned hospital network.
- **Permitted Actions:** Assign hospital administrators, view cluster metrics.
- **Restricted Actions:** Cannot access hospitals outside assigned cluster; cannot modify platform owner billing.

---

### Module 6: Platform Owner
- **Primary Portal URL:** `https://mediconnect.yourdomain.com/owner`
- **Login Credentials:** Platform Owner credentials (`owner@mediconnect.com`).
- **Core Modules:**
  - **Global Ecosystem Oversight:** Platform-wide metrics across all registered hospitals (10 facilities).
  - **SuperAdmin Provisioning:** Create SuperAdmins and assign hospital clusters.
  - **Global Hospital Directory:** Approve new hospital registrations and maintain platform integrity.
- **Permitted Actions:** Global administration, system-wide configuration.

---

## 2. Role & Permission Governance Matrix

| Feature / Action | Patient | Doctor | Receptionist | Hospital Admin | Super Admin | Platform Owner |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Search Doctors & Hospitals | `YES` | `YES` | `YES` | `YES` | `YES` | `YES` |
| Book Personal Appointment | `YES` | `NO` | `NO` | `NO` | `NO` | `NO` |
| Book Appointment for Patient | `NO` | `NO` | `YES` (Assigned Hosp) | `YES` | `NO` | `NO` |
| View Assigned Daily Queue | `NO` | `YES` (Own) | `YES` (Hosp OPD) | `YES` (Hosp) | `YES` (Cluster) | `YES` (Global) |
| Check-in Arriving Patient | `NO` | `NO` | `YES` | `YES` | `NO` | `NO` |
| Issue Digital Clinical Rx | `NO` | `YES` | `NO` | `NO` | `NO` | `NO` |
| Download Prescription PDF | `YES` (Own) | `YES` (Issued) | `NO` | `YES` (Hosp) | `YES` (Cluster) | `YES` (Global) |
| Manage Doctor / Staff Accounts | `NO` | `NO` | `NO` | `YES` (Assigned Hosp) | `YES` (Cluster) | `YES` (Global) |
| Assign Hospital Admins | `NO` | `NO` | `NO` | `NO` | `YES` (Cluster) | `YES` (Global) |
| Provision SuperAdmins | `NO` | `NO` | `NO` | `NO` | `NO` | `YES` |

---

## 3. Staff Onboarding & Account Deactivation Checklists

### Staff Onboarding Checklist:
1. `[ ]` **HR Authorization:** Confirm employment and clinical credentialing (NMC Registration verified for doctors).
2. `[ ]` **Invitation Issuance:** Hospital Admin generates secure invitation token via platform portal.
3. `[ ]` **Account Registration:** Staff member completes password setup using institutional email.
4. `[ ]` **Role Assignment:** Hospital Admin assigns appropriate hospital role and department.
5. `[ ]` **Training Completion:** Staff member completes role-specific manual module and signs training sheet.

### Staff Offboarding & Immediate Account Deactivation:
1. `[ ]` **Deactivation Request:** HR or Department Head submits deactivation notice.
2. `[ ]` **Admin Status Toggle:** Hospital Admin opens `/hospital-admin/doctors` or `/receptionists` and sets status to **Inactive**.
3. `[ ]` **Immediate Session Revocation:** Database flags account inactive; JWT middleware rejects all subsequent requests (`403 Forbidden: Account is inactive`).
4. `[ ]` **Audit Confirmation:** Verify deactivation logged in `audit_logs`.
