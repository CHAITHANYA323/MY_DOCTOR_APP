# MediConnect — Multi-Hospital Healthcare Management System

MediConnect is a comprehensive, multi-tenant healthcare web platform that connects patients, doctors, hospital staff, and platform administrators. It provides distinct role-based portals for hospital governance, staff administration, receptionist patient check-in, doctor consultation queues, and patient appointment booking.

The system is built with a high-performance **React 19** frontend, a **Flask 3** Python backend served using the production **Waitress WSGI** server, and a persistent **MySQL 8** relational database.

---

## Key Features

1. **Multi-Tenant Hospital Architecture**:
   - Single unified platform serving multiple independent hospitals (e.g., City Health Hospital, Apollo Hospital, Fortis Hospital).
   - Strict tenant boundary isolation ensuring hospital administrators and receptionists access only their own hospital's patients, doctors, and appointments.

2. **Five Dedicated Role-Based Portals**:
   - **Platform Owner Portal**: Complete governance across all affiliated hospitals, global platform metrics, hospital onboarding, staff invitations, and compliance audit logs.
   - **Hospital Super Admin Portal**: Hospital-scoped operations, doctor profile management, hospital staff directory, department configuration, appointment oversight, and hospital ambulance tracking.
   - **Receptionist Portal**: Daily patient intake queue, real-time patient check-in, search patient directory, and on-site walk-in patient registration.
   - **Doctor Portal**: Daily consultation queue, clinical patient history lookup, consultation notes, and schedule/availability toggling.
   - **Patient Portal**: Multi-hospital doctor search with specialty and location filters, online appointment booking, personal appointment history, and doctor reviews.

3. **Emergency & Ambulance Dispatch**:
   - 24/7 emergency hotline directory (108, 112).
   - Online ambulance booking with idempotency protection and status tracking (Requested, Dispatched, Arrived, Completed).

4. **Cryptographic Staff Onboarding**:
   - Invitation-based staff onboarding with single-use, hashed verification tokens.
   - Enforced temporary password expiration and mandatory password reset on first login.

5. **Production Stability on Windows & Linux**:
   - Standardized multi-threaded **Waitress WSGI** server on Windows.
   - Pre-flight automated prerequisite checks before startup.
   - One-click launch (`start_demo.bat`) and clean shutdown (`stop_demo.bat`).
   - Native Python MySQL backup and disaster recovery utility (`backend/backup_mysql.py`).

---

## Technology Stack

| Layer | Technologies Used | Description |
| :--- | :--- | :--- |
| **Frontend UI** | React 19, JavaScript (ES6+), CSS3 | Component-driven responsive single-page application (SPA). |
| **Build & Tooling** | Vite 8, Oxlint | High-speed frontend development server, static analysis, and minified production bundler. |
| **Routing & HTTP** | React Router v7, Axios | Client-side declarative routing and centralized API interceptors for JWT Bearer tokens. |
| **Backend API** | Python 3.11, Flask 3.1, Werkzeug 3.1 | Modular RESTful API structured with Flask Blueprints. |
| **WSGI Server** | Waitress 3.0 (Windows), Gunicorn 21+ (Linux) | Production-grade multi-threaded WSGI application server. |
| **ORM & Database** | SQLAlchemy 2.0, Flask-SQLAlchemy 3.1, PyMySQL 1.2 | Object-Relational Mapping, connection pooling, and MySQL 8 driver. |
| **Database Engine** | MySQL 8.0.46 (`utf8mb4`) | Relational database with stored generated columns, unique constraints, and ACID transactions. |
| **Authentication** | PyJWT 2.13, PBKDF2 (SHA-256) | Stateless HS256 JWT tokens and salted password hashing. |

---

## Project Folder Structure

```text
DoctorApp/
├── backend/                             # Flask RESTful API Backend
│   ├── backups/                         # Database backup repository
│   │   └── mysql/                       # Timestamped JSON MySQL snapshots
│   ├── routes/                          # 12 Modular Flask Blueprints
│   │   ├── ambulances.py                # Emergency ambulance booking and tracking
│   │   ├── appointments.py              # Patient appointments & concurrency control
│   │   ├── auth.py                      # Registration, login, password change
│   │   ├── dashboard.py                 # Platform & Hospital KPIs
│   │   ├── doctor_portal.py             # Doctor schedule & patient consultation
│   │   ├── doctors.py                   # Public doctor directory & search
│   │   ├── hospitals.py                 # Hospital directory & management
│   │   ├── invitations.py               # Cryptographic staff onboarding
│   │   ├── patient_portal.py            # Patient dashboard & booking history
│   │   ├── reception.py                 # Receptionist check-in & walk-in intake
│   │   ├── reviews.py                   # Patient doctor reviews & ratings
│   │   └── specializations.py           # Medical clinical specialties
│   ├── utils/                           # Middleware & rate limiting utilities
│   │   ├── auth_middleware.py           # JWT token generation & role verification
│   │   └── rate_limiter.py              # In-memory & Redis rate limiting
│   ├── app.py                           # Application factory & WSGI handler
│   ├── backup_mysql.py                  # Safe MySQL backup & restore utility
│   ├── check_demo_prerequisites.py      # Automated pre-flight system check
│   ├── config.py                        # Centralized configuration & DB pooling
│   ├── models.py                        # 11 SQLAlchemy database models
│   ├── requirements.txt                 # Backend Python package requirements
│   ├── seed.py                          # Sample database seeding script
│   └── stop_demo.py                     # Demo process cleanup script
│
├── frontend/                            # React 19 + Vite Frontend Application
│   ├── public/                          # Static icons & SPA redirect rules
│   │   └── _redirects                   # SPA routing fallback for web servers
│   ├── src/
│   │   ├── components/                  # Navbar, Footer, Cards, Modals, ProtectedRoute
│   │   ├── context/                     # React AuthContext (JWT & User state)
│   │   ├── pages/                       # Application Views
│   │   │   ├── admin/                   # Legacy admin & Receptionist views
│   │   │   ├── auth/                    # AcceptInvitation view
│   │   │   ├── doctor/                  # Doctor portal views
│   │   │   ├── owner/                   # Platform owner views
│   │   │   ├── patient/                 # Patient portal views
│   │   │   └── superadmin/              # Hospital super admin views
│   │   ├── services/                    # Axios API client (api.js) & service modules
│   │   ├── App.jsx                      # Client route definitions
│   │   └── main.jsx                     # React root mount
│   ├── package.json                     # Frontend npm packages
│   └── vite.config.js                   # Vite configuration & /api reverse proxy
│
├── start_demo.bat                       # One-click Windows presentation launcher
├── stop_demo.bat                        # One-click Windows presentation shutdown
├── README.md                            # Main project documentation
├── PROJECT_REPORT.md                    # Comprehensive academic project report
├── DEMO_GUIDE.md                        # Step-by-step viva presentation guide
└── VIVA_QUESTIONS.md                    # 30+ Viva questions and answers
```

---

## Five User Roles & Responsibilities

| Role Name | Scope | Portal Route | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **Platform Owner** | Global (All Hospitals) | `/owner/dashboard` | Onboards new hospitals, issues hospital administrator invitations, inspects global system KPIs, and audits compliance logs. |
| **Hospital Super Admin** | Single Hospital | `/hospital-admin/dashboard` | Manages doctors in their hospital, invites medical and reception staff, configures departments, and monitors facility appointments. |
| **Receptionist** | Single Hospital | `/reception/dashboard` | Manages daily outpatient intake, checks in arriving patients, searches patient medical history, and registers walk-in patients. |
| **Doctor** | Personal & Clinical | `/doctor/dashboard` | Views scheduled patient consultations, inspects past patient visit history, records medical notes, and sets available working hours. |
| **Patient** | Personal & Citizen | `/patient/dashboard` | Searches doctors across all hospitals, filters by specialty and consultation fee, books appointments, and submits ratings. |

---

## Demonstration Credentials (Safe Test Data)

The system includes pre-seeded demonstration accounts for all 5 roles:

| Role | Email Address | Password | Scoped Hospital |
| :--- | :--- | :---: | :--- |
| **Platform Owner** | `owner@mediconnect.com` | `Owner@123` | *All Hospitals (Global)* |
| **Hospital Super Admin** | `admin.hosp1@medicare.com` | `Admin@123` | City Health Hospital (ID: 1) |
| **Receptionist** | `reception.hosp1@medicare.com` | `Reception@123` | City Health Hospital (ID: 1) |
| **Doctor** | `dr.one@medicare.com` | `Doctor@123` | City Health Hospital (ID: 1) |
| **Patient** | `patient.alpha@test.com` | `Patient@123` | *Public Access* |

---

## Quick Start: Running the Demonstration

### Prerequisites
- **Windows OS** (Windows 10 / 11)
- **Python 3.10+** (Python 3.11 recommended)
- **Node.js 18+** & **npm**
- **MySQL Server 8.0+** running on port 3306 with database `mediconnect`

### Step 1: Start the Demonstration (One-Click)
Double-click `start_demo.bat` in the project root:
```cmd
.\start_demo.bat
```
The launcher automatically:
1. Runs pre-flight checks against Python, Node, MySQL, and port availability.
2. Starts the **Waitress WSGI Backend** on `http://127.0.0.1:5000`.
3. Starts the **Vite Frontend Server** on `http://localhost:5173`.
4. Opens your default web browser to the MediConnect homepage.

### Step 2: Stop the Demonstration (Clean Shutdown)
When your demonstration is complete, double-click `stop_demo.bat` in the project root:
```cmd
.\stop_demo.bat
```
This safely identifies and terminates only the demo backend and frontend processes, keeping MySQL and your computer services running normally.

---

## Manual Installation & Setup

If you prefer running commands manually in separate terminal windows:

### 1. Database Configuration
1. Open MySQL command line client and ensure database `mediconnect` exists:
   ```sql
   CREATE DATABASE IF NOT EXISTS mediconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Configure `backend/.env` with your MySQL credentials:
   ```env
   FLASK_ENV=development
   FLASK_PORT=5000
   SECRET_KEY=medicare-secret-key-healthcare-pro-2026
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DB=mediconnect
   ```

### 2. Backend Setup
```powershell
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Run with Waitress WSGI
python -m waitress --port=5000 --threads=4 app:app
```

### 3. Frontend Setup
```powershell
# Navigate to frontend (in a second terminal)
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

---

## MySQL Database Backup and Disaster Recovery

A dedicated backup tool is included in `backend/backup_mysql.py`:

```powershell
# 1. Create a timestamped backup snapshot
python backend/backup_mysql.py backup --tag=my_backup

# 2. List all available backups
python backend/backup_mysql.py list

# 3. Verify backup file integrity
python backend/backup_mysql.py verify --file=mediconnect_mysql_20261108_210021_pre_demo.json

# 4. Safely restore from a backup (requires explicit confirmation)
python backend/backup_mysql.py restore --file=mediconnect_mysql_20261108_210021_pre_demo.json
```

---

## Automated Verification Suite

The repository contains automated test suites verifying all workflows:
- **Pytest Suite**: `pytest backend` (358 unit and integration tests)
- **End-to-End Suite**: `python backend/verify_step6_end_to_end.py` (72 comprehensive API integration tests)
- **Live Demo Verification**: `python backend/verify_step8_demo.py` (24 live HTTP loopback tests)

---

## License

This project is created for academic and educational demonstration purposes. All rights reserved.
