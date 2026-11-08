# MediConnect — Five-Portal Demonstration Script

**Guide Purpose:** Exact click-by-click instructions for presenting all five role portals to college evaluators during live demonstration.  
**System URL:** `http://localhost:5173`  
**API Health Check:** `http://127.0.0.1:5000/api/health`

---

## Demonstration Sequence Overview

```
[Start Launcher] -> [Portal 1: Platform Owner] -> [Portal 2: Hospital Super Admin]
                          -> [Portal 3: Receptionist] -> [Portal 4: Doctor] -> [Portal 5: Patient] -> [Stop Launcher]
```

---

## Pre-Demo Quick Launch

1. Double-click [`start_demo.bat`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/start_demo.bat) in the project folder.
2. Watch the console run pre-flight checks: green `[OK]` marks will verify Python, MySQL connection, and Node.js.
3. Two console windows open:
   - `MediConnect Backend (Waitress:5000)`
   - `MediConnect Frontend (Vite:5173)`
4. The browser opens automatically to `http://localhost:5173`.

---

## Portal 1: Platform Owner Demonstration (2 Minutes)

### Login Credentials:
- **Email:** `owner@mediconnect.com`
- **Password:** `Owner@123`
- **Dashboard URL:** `/owner`

### Step-by-Step Actions:

1. **Navigate to Login:**
   - Click the **"Login"** button in the top navigation bar.
   - Click the **"Platform Owner"** tab in the role switcher.
   - Enter `owner@mediconnect.com` and `Owner@123`, then click **"Sign In as Platform Owner"**.

2. **Demonstrate Platform Overview (`/owner`):**
   - **What Appears:**
     - Overview header: *"Platform Governance & Global Administration"*.
     - Metric cards: **Total Hospitals: 4**, **Registered Doctors: 6**, **Active Users: 27**, and **Platform Invitations**.
   - **What to Say:**
     > *"Sir/Madam, this is the top-level Platform Owner portal. The Platform Owner oversees the entire multi-hospital network. These cards display aggregate, network-wide statistics fetched directly from our MySQL database."*

3. **Demonstrate Hospital Network Management (`/owner/hospitals`):**
   - Click **"Hospitals"** in the left sidebar.
   - **What Appears:**
     - A search bar and city filter buttons: *"All Cities"*, *"Hyderabad"*, *"Secunderabad"*.
     - Hospital cards for **City Health Hospital**, **Apollo Hospital**, **Fortis Hospital**, and **Max Healthcare**.
     - Each card displays hospital address, phone, emergency hotline (108), and facilities tags (ICU, Emergency, Pharmacy).
   - Click on the city filter chip **"Hyderabad"** to show instant client-side filtering.
   - Click the blue **"+ Onboard Hospital"** button:
     - Show the onboarding modal form where a new hospital name, address, emergency contact, and initial Super Admin email can be registered.
     - Click **"Cancel"** to close the modal.
   - **What to Say:**
     > *"Here the Platform Owner can onboard new hospital partners to the network and issue administrative invitations. Notice that city filtering and search operate seamlessly."*

4. **Demonstrate Audit Logs (`/owner/audit-logs`):**
   - Click **"Audit Logs"** in the sidebar.
   - **What Appears:** A chronological table of security and administrative actions with Action Type, User ID, Timestamp, and Client IP address.
   - **What to Say:**
     > *"To comply with healthcare audit standards, every major administrative action is permanently recorded in the `audit_logs` table."*

5. **Logout:**
   - Click **"Logout"** at the bottom of the sidebar. The system returns to the login screen.

---

## Portal 2: Hospital Super Admin Demonstration (2 Minutes)

### Login Credentials:
- **Email:** `admin.hosp1@medicare.com`
- **Password:** `Admin@123`
- **Hospital:** City Health Hospital (Hospital ID: 1)
- **Dashboard URL:** `/superadmin`

### Step-by-Step Actions:

1. **Log In:**
   - Select the **"Super Admin"** tab on `/login`.
   - Enter `admin.hosp1@medicare.com` and `Admin@123`, then click **"Sign In as Super Admin"**.

2. **Demonstrate Hospital Command Center (`/superadmin`):**
   - **What Appears:**
     - Hospital header: *"City Health Hospital — Super Admin Control Center"*.
     - KPI cards: Active Clinical Departments, On-Duty Doctors, Hospital Staff Count, and Today's Consultations.
   - **What to Say:**
     > *"This is the Hospital Super Admin portal. Unlike the Platform Owner who sees all hospitals, this Super Admin's access is strictly scoped to City Health Hospital. Under the hood, our `@hospital_scoped` decorator ensures this admin can never see or mutate data from Apollo or Fortis Hospital."*

3. **Demonstrate Staff Management (`/superadmin/staff`):**
   - Click **"Staff Management"** in the sidebar.
   - **What Appears:**
     - The hospital staff roster table displaying Name, Email, Assigned Role (Receptionist, Doctor), Department, and Status badges.
     - Action button: **"+ Invite Staff Member"**.
   - **What to Say:**
     > *"The Super Admin can invite clinical practitioners and front-desk receptionists to their specific facility, assigning permissions dynamically."*

4. **Demonstrate Doctors Directory (`/superadmin/doctors`):**
   - Click **"Doctors"** in the sidebar.
   - **What Appears:** Active doctors affiliated with City Health Hospital (e.g., Dr. Rajesh Kumar, Dr. Sneha Sharma), their specialties, consultation fees, and active statuses.

5. **Logout:**
   - Click **"Logout"** in the sidebar.

---

## Portal 3: Receptionist Demonstration (2 Minutes)

### Login Credentials:
- **Email:** `reception.hosp1@medicare.com`
- **Password:** `Reception@123`
- **Hospital:** City Health Hospital (Front Desk)
- **Dashboard URL:** `/admin`

### Step-by-Step Actions:

1. **Log In:**
   - Select the **"Reception / Admin"** tab on `/login`.
   - Enter `reception.hosp1@medicare.com` and `Reception@123`, then click **"Sign In"**.

2. **Demonstrate Reception Dashboard (`/admin`):**
   - **What Appears:**
     - Header: *"City Health Hospital — Front Desk & Reception Portal"*.
     - Live KPI cards: **Appointments Today**, **Patients Checked In**, **Pending Arrival**, and **Doctors Available**.
     - Today's appointment consultation table with Patient Name, Doctor, Slot Time, and Status badges (Confirmed, Checked-In).
   - **What to Say:**
     > *"This is the Receptionist portal, optimized for rapid front-desk hospital workflows. Notice the interface is streamlined for speed, showing today's immediate queue and doctor availability."*

3. **Demonstrate Patient Check-In Flow (`/admin/check-in`):**
   - Click **"Patient Check-In"** in the sidebar.
   - **What Appears:**
     - Patient Search bar (Search by Patient Name or Phone).
     - The check-in arrival queue.
     - A button to confirm patient physical arrival and issue consultation tokens.
   - **What to Say:**
     > *"When a patient walks into the hospital clinic, the receptionist searches their name or phone number, confirms their arrival, and marks them as checked in, immediately alerting the doctor's queue."*

4. **Logout:**
   - Click **"Logout"** in the sidebar.

---

## Portal 4: Doctor Portal Demonstration (2 Minutes)

### Login Credentials:
- **Email:** `dr.one@medicare.com`
- **Password:** `Doctor@123`
- **Doctor:** Dr. Rajesh Kumar (Cardiology, City Health Hospital)
- **Dashboard URL:** `/doctor`

### Step-by-Step Actions:

1. **Log In:**
   - Select the **"Doctor"** tab on `/login`.
   - Enter `dr.one@medicare.com` and `Doctor@123`, then click **"Sign In as Doctor"**.

2. **Demonstrate Clinical Agenda (`/doctor`):**
   - **What Appears:**
     - Welcome banner: *"Welcome, Dr. Rajesh Kumar (Cardiologist)"*.
     - Metrics: **Today's Patients**, **Completed Consultations**, **Pending Patients**.
     - Active patient queue with scheduled time slots and consultation status badges.
   - **What to Say:**
     > *"This is the Doctor Portal. Dr. Rajesh Kumar sees only his assigned consultations. The doctor can review which patients are waiting in reception and prepare for the consultation."*

3. **Demonstrate Schedule & Slot Availability (`/doctor/schedule`):**
   - Click **"My Schedule"** in the sidebar.
   - **What Appears:**
     - Consultation timetable showing available days (Monday – Saturday) and hours (09:00 AM – 05:00 PM).
     - Slot management toggles enabling the doctor to open or block specific consultation hours.
   - **What to Say:**
     > *"Doctors can configure their working hours and availability. Our system uses these schedules combined with the MySQL `active_slot_key` constraint to ensure patients can only book genuine, unreserved time slots."*

4. **Logout:**
   - Click **"Logout"** in the sidebar.

---

## Portal 5: Patient Experience Demonstration (2 Minutes)

### Login Credentials:
- **Email:** `patient.alpha@test.com`
- **Password:** `Patient@123`
- **Dashboard URL:** `/patient`

### Step-by-Step Actions:

1. **Log In:**
   - Select the **"Patient / User"** tab on `/login`.
   - Enter `patient.alpha@test.com` and `Patient@123`, then click **"Sign In"**.

2. **Demonstrate Patient Healthcare Hub (`/patient`):**
   - **What Appears:**
     - Greeting: *"Hello, Patient Alpha"*.
     - Healthcare quick actions: **Book Appointment**, **Find Doctors**, **Medical Records**, and **Emergency Ambulance**.
     - Upcoming appointments card displaying doctor name, hospital, and date.
   - **What to Say:**
     > *"Finally, this is the Patient Portal. Patients have a centralized dashboard to manage appointments across any hospital on the platform, view their medical history, and book consultations."*

3. **Demonstrate Doctor Search & Filtering (`/doctors`):**
   - Click **"Find Doctors"** in the top navigation bar.
   - **What Appears:** Doctor directory cards with doctor photos, qualifications, experience, hospital affiliation, and consultation fees.
   - Select **"Cardiology"** in the Specialty dropdown:
     - The list instantly updates to show only Cardiologists.
   - Select **"City Health Hospital"** in the Hospital dropdown:
     - Dr. Rajesh Kumar is displayed with verified credentials.
   - Click **"Book Appointment"** on the card:
     - Demonstrates the interactive booking modal with calendar date selection and time slot pickers.
   - **What to Say:**
     > *"Notice how the patient can filter across both specialties and hospitals simultaneously. When an appointment is submitted, the backend acquires a lock on that slot, preventing any other patient from reserving the same minute."*

4. **Demonstrate Emergency Services (`/emergency`):**
   - Click **"Emergency"** in the top navigation bar.
   - Show the quick ambulance dispatch section with one-touch emergency hotline calling (108, 112).

---

## Post-Demo Clean Shutdown

When the examiner signals completion:
1. Double-click [`stop_demo.bat`](file:///c:/Users/Lap12NOC/Desktop/DoctorApp/stop_demo.bat).
2. The script cleanly halts both Waitress and Vite processes on ports 5000 and 5173.
3. Your database and all 55 records remain safely stored on disk.

