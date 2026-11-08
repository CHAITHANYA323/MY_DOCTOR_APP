# MediConnect — Final Viva Voce Questions & Answers

This document contains **36 project-focused viva questions** categorized by technology, design, and implementation. Each answer is written in clear, simple English to help you confidently answer examiners during your final project defense.

---

## Category 1: Project Overview & System Architecture

### Q1: What is the core purpose of the MediConnect project?
**Answer**: MediConnect is a multi-tenant healthcare web platform that connects patients, doctors, receptionists, hospital super admins, and platform owners. It allows multiple independent hospitals to operate under one platform while keeping their patient, staff, and appointment records completely private and isolated from each other.

### Q2: What is the architectural style of MediConnect?
**Answer**: It follows a decoupled **Client-Server Architecture** (micro-monolith). The frontend is a Single-Page Application (SPA) built with React 19, and the backend is a RESTful API built with Python Flask and served using the Waitress WSGI server. The database is MySQL 8.

### Q3: What is "Multi-Tenancy" and how is it implemented in your project?
**Answer**: Multi-tenancy is an architecture where multiple organizations (tenants, i.e., different hospitals) share the same application and database infrastructure, but each hospital can only access its own data. In MediConnect, we store `hospital_id` on records (like doctors, appointments, receptionists) and enforce strict filtering in backend routes using our `@hospital_scoped` decorator so Hospital A never sees Hospital B's data.

### Q4: What are the five user roles in MediConnect?
**Answer**:
1. **Platform Owner**: Super administrator of the entire platform (manages all hospitals, views platform-wide metrics, checks audit logs).
2. **Hospital Super Admin**: Administrator of a single hospital (manages doctors, invites staff, views hospital analytics).
3. **Receptionist**: Front-desk staff for a specific hospital (checks in arriving patients, registers walk-in patients, views daily clinic queue).
4. **Doctor**: Medical clinician (views consultation queue, sets available working hours, checks past patient history).
5. **Patient**: Public healthcare user (searches doctors, books appointments, submits doctor ratings).

### Q5: How do the frontend and backend communicate?
**Answer**: They communicate over HTTP using **JSON-based REST APIs**. The React frontend makes asynchronous requests using the **Axios** HTTP client to endpoints like `/api/auth/login`, `/api/doctors`, and `/api/appointments`. In production and local development, the frontend passes a JWT token in the `Authorization: Bearer <token>` header.

### Q6: What happens when an unauthorized user attempts to access a protected portal?
**Answer**: Security is enforced at both layers:
- **On the Frontend**: A `ProtectedRoute` component checks the user's role from `AuthContext`. If the user is unauthenticated or lacks the required role, they are redirected to the login page or an unauthorized warning.
- **On the Backend**: The `@jwt_required` and `@roles_required` decorators inspect the token. If unauthorized, the API immediately returns HTTP 401 (Unauthorized) or HTTP 403 (Forbidden).

---

## Category 2: Backend & Python / Flask

### Q7: Why did you choose Flask over Django for the backend?
**Answer**: Flask is a lightweight micro-framework that provides granular control over routing, blueprints, and middleware without imposing rigid structures. For our API-first architecture, Flask allows clean separation of concerns using Flask Blueprints and pairs seamlessly with SQLAlchemy for database operations.

### Q8: What are Flask Blueprints and why did you use them?
**Answer**: Blueprints are Flask's way of organizing an application into modular components. Instead of writing all routes in a single file, we organized the API into 12 dedicated blueprints (e.g., `routes/auth.py`, `routes/doctors.py`, `routes/reception.py`, `routes/appointments.py`). This improves code readability, maintainability, and testing.

### Q9: What is WSGI and why do we use Waitress instead of Flask's built-in server?
**Answer**: WSGI stands for **Web Server Gateway Interface**, the standard calling convention for Python web servers to communicate with web applications. Flask's built-in `app.run()` server is single-threaded and intended only for development; it will block or crash under concurrent users. **Waitress** is a production-quality, multi-threaded WSGI server that runs natively on Windows and processes multiple incoming requests simultaneously using a thread pool.

### Q10: How does error handling work in your Flask backend?
**Answer**: We implement global error handlers using `@app.errorhandler()` in `backend/app.py` for HTTP 400, 404, 405, 500, and unhandled exceptions. Instead of exposing raw Python stack traces (which could leak database passwords or internal logic), the server logs the error internally and returns a clean, user-friendly JSON message: `{"success": false, "message": "An unexpected server error occurred."}`.

### Q11: How do you handle Cross-Origin Resource Sharing (CORS)?
**Answer**: We use the `Flask-Cors` extension along with custom origin-validation regex. In production, we strictly whitelist approved frontend URLs (e.g., `http://localhost:5173` or our production domain) and reject wildcard (`*`) origins or null origins to prevent cross-site request hijacking.

### Q12: How are pre-flight OPTIONS requests handled?
**Answer**: When a browser makes a cross-origin request with custom headers (like `Authorization: Bearer`), it first sends an `OPTIONS` pre-flight request. Our backend has an `@app.before_request` handler that responds to `OPTIONS` with appropriate CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`) and HTTP 200 without executing database queries prematurely.

---

## Category 3: Frontend & React 19

### Q13: What are the main advantages of using React 19 for this project?
**Answer**: React 19 offers component-based architecture, efficient virtual DOM diffing, improved concurrency, and lightweight client-side state management. It enables rich, fluid interfaces like instant doctor search filters, dynamic appointment modal popups, and real-time receptionist check-ins without full page reloads.

### Q14: What is Vite and why is it faster than Create-React-App (CRA)?
**Answer**: Vite is a modern frontend build tool that leverages native ES modules (ESM) in the browser during development and compiles with **Rollup** for production. Unlike Webpack-based tools that bundle the entire codebase before launching, Vite starts instantly and performs sub-second Hot Module Replacement (HMR).

### Q15: How is user state (login/logout) managed across React components?
**Answer**: We use the **React Context API** implemented in `frontend/src/context/AuthContext.jsx`. It holds the `currentUser`, `token`, and `isAuthenticated` status in memory and syncs them with browser `localStorage`. Any component can access auth state via the `useAuth()` custom hook.

### Q16: How does React Router v7 handle single-page application navigation?
**Answer**: React Router intercepts browser navigation and renders matching components dynamically without triggering a complete page refresh. For example, navigating from `/doctors` to `/patient/dashboard` updates only the main view component while preserving background network state.

### Q17: What is the purpose of the `_redirects` and `vercel.json` files in the frontend?
**Answer**: In a Single-Page Application, routing is managed on the client side. If a user refreshes their browser on `/patient/dashboard`, a standard web server looks for a physical file named `patient/dashboard/index.html` and returns a 404 error. The `_redirects` file (`/* /index.html 200`) and `vercel.json` rewrite tell the server to route all URL paths back to `index.html` so React Router can handle them.

### Q18: What is an Axios Interceptor and how do you use it?
**Answer**: An Axios interceptor is middleware that automatically inspects or alters requests and responses before they are processed:
- **Request Interceptor**: Automatically reads the token from `localStorage` and attaches `Authorization: Bearer <token>` to every outgoing API call, and ensures the `/api` prefix is present.
- **Response Interceptor**: Detects HTTP 401 (Unauthorized) responses, clears expired tokens, and automatically redirects the user to `/login?expired=true`.

---

## Category 4: Database & MySQL 8

### Q19: Why did you migrate the application from SQLite to MySQL 8?
**Answer**: SQLite uses file-level locking, which causes concurrency bottlenecks (`database is locked`) when multiple users attempt simultaneous writes. MySQL 8 is a enterprise client-server relational database providing row-level locking (InnoDB), ACID compliance, stored generated columns, high-concurrency connection pooling, and multi-user reliability.

### Q20: How many tables are in the MediConnect database, and what are they?
**Answer**: There are exactly **11 tables**:
1. `hospitals`
2. `specializations`
3. `users`
4. `doctors`
5. `ambulances`
6. `appointments`
7. `ambulance_requests`
8. `reviews`
9. `favorites`
10. `invitations`
11. `audit_logs`

### Q21: What is SQLAlchemy and what is its role in the project?
**Answer**: SQLAlchemy is a Python **Object-Relational Mapper (ORM)**. It allows us to define database tables as Python classes (`User`, `Appointment`, `Doctor`) in `models.py` and manipulate records using Python methods rather than writing raw SQL queries. This protects against SQL injection, provides database engine portability, and simplifies relationship management.

### Q22: How does connection pooling work in your application?
**Answer**: Opening and closing database connections for every HTTP request is slow. SQLAlchemy maintains a **connection pool** of pre-opened connections:
- `pool_size=10`: Keeps 10 active connections ready.
- `max_overflow=20`: Allows up to 20 additional burst connections under load.
- `pool_pre_ping=True`: Tests whether a connection is still alive before checkout, preventing `MySQL server has gone away` errors.
- `pool_recycle=300`: Refreshes idle connections every 5 minutes.

### Q23: What character set is used in MySQL and why is `utf8mb4` important?
**Answer**: We use the `utf8mb4` character set with `utf8mb4_unicode_ci` collation. Standard `utf8` in older MySQL versions only supports 3-byte characters. `utf8mb4` supports full 4-byte Unicode encoding, allowing names from international languages, accented characters, and emojis without corruption.

### Q24: How does your backup and disaster recovery utility work?
**Answer**: In `backend/backup_mysql.py`, we built a pure-Python backup utility that queries all 11 tables in foreign-key dependency order, serializes the data to a structured JSON snapshot with date/time encoders, computes a cryptographic **SHA-256 checksum**, and verifies record counts. During restore, it requires the user to type `RESTORE` to prevent accidental overwrites, temporarily disables foreign-key checks, truncates tables, inserts rows, and verifies 100% record parity.

---

## Category 5: Authentication, Security & RBAC

### Q25: How are user passwords stored securely?
**Answer**: Passwords are never stored in plain text. We hash them using the **PBKDF2** algorithm with **SHA-256** and a unique cryptographic salt via `werkzeug.security.generate_password_hash()`. Even if the database is compromised, original passwords cannot be derived from the stored hash.

### Q26: What is a JWT and how is it structured?
**Answer**: A **JSON Web Token (JWT)** is a compact, URL-safe token representing claims between two parties. It consists of three parts separated by dots:
1. **Header**: Specifies the algorithm (`HS256`) and token type (`JWT`).
2. **Payload**: Stores identity claims (`user_id`, `email`, `role`, `hospital_id`, `exp`).
3. **Signature**: Cryptographic hash of the header and payload generated using the server's private `SECRET_KEY`.

### Q27: How does MediConnect prevent brute-force login attacks?
**Answer**: In `backend/utils/rate_limiter.py`, we track failed login attempts per `(IP, email)` combination. If more than 5 failed attempts occur within a 15-minute window, the account is temporarily throttled, and the API returns HTTP 429 (Too Many Requests).

### Q28: What is an IDOR vulnerability and how did you prevent it?
**Answer**: **Insecure Direct Object Reference (IDOR)** occurs when a user manipulates an ID parameter (e.g., `PUT /api/appointments/5`) to access another tenant's data. We prevent this by verifying ownership: before modifying an appointment or doctor, the backend checks that the record's `hospital_id` matches the authenticated user's `g.current_user.hospital_id`. If it does not match, the server returns HTTP 403 Forbidden.

### Q29: How does the cryptographic invitation system work for hospital staff?
**Answer**: Instead of creating staff accounts with default passwords or open registration, an administrator generates an invitation:
1. The server generates a high-entropy random token (`secrets.token_urlsafe(32)`).
2. The SHA-256 hash of the token is saved in the `invitations` table with a 48-hour expiration.
3. The staff member visits the link (`/accept-invitation?token=...`), which verifies the hash and allows them to choose their own password.
4. The invitation is marked as used (`used_at = CURRENT_TIMESTAMP`), preventing replay attacks.

### Q30: What is stored in the `audit_logs` table?
**Answer**: Compliance and security actions are recorded in `audit_logs`:
- `user_id`: Who performed the action.
- `hospital_id`: Tenant context.
- `action`: What happened (e.g., `STAFF_INVITED`, `DOCTOR_PROFILE_LINKED`, `HOSPITAL_ONBOARDED`).
- `resource_type` and `resource_id`: The entity affected.
- `ip_address`: Client IP.
- `created_at`: Exact UTC timestamp.

---

## Category 6: Concurrency, Performance & Testing

### Q31: How do you prevent double-booking of doctors at the same time?
**Answer**: We enforce double-booking prevention at the database level using a **stored generated column** and a **unique index** on the `appointments` table:
- Stored Generated Column: `active_slot_key` concatenates `doctor_id`, `appointment_date`, `appointment_time`, and an active flag (`CASE WHEN status != 'CANCELLED' THEN 1 ELSE NULL END`).
- Unique Constraint: `UNIQUE KEY uq_active_doctor_slot (active_slot_key)`.
Because MySQL permits multiple `NULL` values in a unique index, cancelled appointments do not block the slot, but two active appointments for the same doctor at the same date and time trigger a database uniqueness error, preventing collisions even under simultaneous requests.

### Q32: What automated test suites were used to verify the application?
**Answer**: We executed three complementary test suites:
1. **Pytest Regression Suite**: `pytest backend` — 358 unit and integration tests verifying authentication, models, blueprints, and token middleware (100% pass).
2. **End-to-End Suite**: `python backend/verify_step6_end_to_end.py` — 72 automated API tests across 10 functional areas (100% pass).
3. **Live Demonstration Suite**: `python backend/verify_step8_demo.py` — 24 loopback tests validating Waitress on port 5000, Vite dev server on port 5173, five-role logins, and MySQL persistence (100% pass).

### Q33: How does the `start_demo.bat` script guarantee error-free presentation?
**Answer**: Before launching the servers, `start_demo.bat` invokes `backend/check_demo_prerequisites.py`, which validates:
- Python runtime (>= 3.9) and all required libraries (`flask`, `waitress`, `pymysql`, `sqlalchemy`, etc.).
- Active MySQL connectivity and database existence.
- Node.js runtime and `frontend/node_modules`.
- Port 5000 and 5173 availability.
If any check fails, it prints a clear, human-readable troubleshooting instruction and pauses, preventing cryptic server crashes during presentation.

### Q34: What does the `stop_demo.bat` script do?
**Answer**: It runs `backend/stop_demo.py`, which inspects system network connections via `netstat -ano`, identifies only the specific process IDs (PIDs) listening on ports 5000 and 5173, and terminates them via `taskkill`. It ensures that background Waitress or Vite processes are terminated without touching MySQL or any other computer services.

### Q35: If the examiner asks to see the database directly in MySQL, what commands do you run?
**Answer**:
```sql
-- 1. Connect to MySQL and switch to database
USE mediconnect;

-- 2. Show all 11 tables
SHOW TABLES;

-- 3. View total records in users
SELECT id, name, email, role, hospital_id, is_active FROM users;

-- 4. View multi-hospital directory
SELECT id, name, city, phone FROM hospitals;

-- 5. View doctor appointments
SELECT id, doctor_id, user_id, appointment_date, appointment_time, status FROM appointments;
```

### Q36: What is the most innovative technical feature of your project?
**Answer**: The combination of **true multi-tenancy** (where 5 distinct roles operate with isolated permissions on a shared MySQL database), paired with **stored generated unique constraints** for concurrency defense, and an **offline-capable production WSGI launcher** that enables a complete presentation without relying on unstable internet connections or cloud server cold starts.

