# MediConnect – Staging Deployment & Isolation Guide

**Target Environment:** MediConnect Staging Tier  
**Pilot Hospital:** Reliability General Hospital (Hospital ID: `1`)  
**Document Classification:** DevOps / Engineering Standard Operating Procedure (SOP)  

---

## 1. Architectural Principles & Isolation Rule

> [!CAUTION]
> **STRICT DATABASE ISOLATION RULE:**  
> Staging MUST NEVER connect to the production database (`mediconnect`). Staging must run against its own isolated database schema (`mediconnect_staging`), isolated backend port (`5001`), and separate environment configuration. Any cross-environment connection will lead to catastrophic data contamination.

```mermaid
flowchart TD
    subgraph "Production Tier (Port 5000)"
        ProdAPI["Flask API (FLASK_PORT=5000)"]
        ProdDB[("MySQL: mediconnect")]
        ProdAPI --> ProdDB
    end

    subgraph "Staging Tier (Port 5001) - FULLY ISOLATED"
        StagingAPI["Flask API (FLASK_PORT=5001)"]
        StagingDB[("MySQL: mediconnect_staging")]
        StagingAPI --> StagingDB
    end

    ProdDB -. "FORBIDDEN CROSS-CONNECTION" .-> StagingAPI
```

---

## 2. Step 1: Provision the Staging Database

Execute the following commands in MySQL 8 to create an isolated staging database:

```sql
-- 1. Create dedicated staging schema
CREATE DATABASE IF NOT EXISTS `mediconnect_staging` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 2. Create isolated staging database user
CREATE USER IF NOT EXISTS 'mediconnect_staging_user'@'localhost' IDENTIFIED BY 'StagingSecurePassword2026!';
GRANT ALL PRIVILEGES ON `mediconnect_staging`.* TO 'mediconnect_staging_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## 3. Step 2: Seed Staging from Sanitized Production Snapshot

To allow realistic UAT without risking production integrity:

1. **Take a production snapshot (Tooling-verified):**
   ```powershell
   python backend/backup_mysql.py backup --tag=staging_baseline
   ```
2. **Restore snapshot into staging database using `--target-uri`:**
   ```powershell
   python backend/backup_mysql.py restore --file=backend/backups/mysql/mediconnect_mysql_YYYYMMDD_staging_baseline.json --target-uri="mysql+pymysql://mediconnect_staging_user:StagingSecurePassword2026!@localhost:3306/mediconnect_staging?charset=utf8mb4" --yes
   ```
3. **Verify staging database record count independently:**
   ```powershell
   python -c "from sqlalchemy import create_engine, text; e = create_engine('mysql+pymysql://mediconnect_staging_user:StagingSecurePassword2026!@localhost:3306/mediconnect_staging'); print('Staging Users:', e.connect().execute(text('SELECT count(*) FROM users')).scalar())"
   ```

---

## 4. Step 3: Staging Environment Configuration (`backend/.env.staging`)

Create `backend/.env.staging` (or inject into staging system environment variables):

```env
# =============================================================================
# MEDICONNECT STAGING ENVIRONMENT CONFIGURATION (.env.staging)
# =============================================================================
FLASK_ENV=staging
FLASK_DEBUG=false
FLASK_PORT=5001

# Distinct staging secret key (minimum 32 characters)
SECRET_KEY=staging_secret_key_mediconnect_hospital1_pilot_2026_xyz987654321
JWT_EXPIRATION_HOURS=24

# Dedicated Staging Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=mediconnect_staging_user
MYSQL_PASSWORD=StagingSecurePassword2026!
MYSQL_DB=mediconnect_staging

# Connection Pool Tuning
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=15
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=300
DB_POOL_PRE_PING=true

# Rate Limiting (Staging memory or local redis)
RATE_LIMIT_STORAGE=auto
RATE_LIMIT_FAIL_CLOSED=false

# CORS Allowed Origins
ALLOWED_ORIGINS=http://localhost:5173,https://staging.mediconnect.yourdomain.com
```

---

## 5. Step 4: Staging Service Execution

### A. Windows Staging Server (Waitress)
```powershell
# Set environment file and boot Waitress on port 5001
$env:ENV_FILE = "backend/.env.staging"
waitress-serve --listen=127.0.0.1:5001 --threads=4 wsgi:app
```

### B. Linux Staging Server (Gunicorn)
```bash
export ENV_FILE="backend/.env.staging"
gunicorn -w 2 -k gthread --threads 4 -b 127.0.0.1:5001 wsgi:app
```

### C. Frontend Staging Build
```powershell
# In frontend directory
$env:VITE_API_BASE_URL = "http://127.0.0.1:5001/api"
npm run build
npm run preview -- --port 4173
```

---

## 6. Step 5: Staging Verification Smoke Tests

Run the following smoke tests against the active staging server:

```powershell
# 1. Health Probe
curl -i http://127.0.0.1:5001/health
# Expected: HTTP/1.1 200 OK {"message": "Backend is running", "status": "ok", "success": true}

# 2. Database Connectivity Check
curl -i http://127.0.0.1:5001/api/hospitals/1
# Expected: HTTP/1.1 200 OK (Reliability General Hospital)

# 3. Security Boundary Check
curl -i http://127.0.0.1:5001/api/hospital-admin/dashboard
# Expected: HTTP/1.1 401 Unauthorized
```

---

## 7. Staging Teardown & Reset Procedure

When staging testing is complete or if staging data becomes corrupted during exploratory testing:

```sql
-- Clean reset of staging data
DROP DATABASE `mediconnect_staging`;
CREATE DATABASE `mediconnect_staging` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then re-execute Section 3 to re-seed from the clean baseline snapshot.
