# MediConnect – Production Environment Configuration Specification

**Component:** Application Server, Runtime Environment & System Hardening  
**Target File:** `backend/.env` (Provisioned on secure production host)  
**Security Directives:** Zero plaintext secrets in Git; SQLite strictly prohibited; high-entropy cryptography  
**Document Status:** Production Configuration Reference  

---

## 1. Production Settings Template Review

The production environment configuration template is maintained at [backend/.env.production.example](file:///C:/Users/Lap12NOC/Desktop/DoctorApp/backend/.env.production.example). This file serves as the strict deployment contract validated at application startup by `Config.validate_production_config()`.

### Core Operational Parameters:
```ini
# -----------------------------------------------------------------------------
# 1. Core Production Settings
# -----------------------------------------------------------------------------
FLASK_ENV=production
FLASK_DEBUG=false
FLASK_PORT=5000

# High-entropy production SECRET_KEY (minimum 64 characters recommended).
# Generate using: python -c "import secrets; print(secrets.token_urlsafe(64))"
SECRET_KEY=REPLACE_WITH_CRYPTOGRAPHICALLY_SECURE_RANDOM_SECRET_KEY_MIN_64_CHARS

# JWT authentication token lifetime in hours (e.g. 72 hours for hospital staff)
JWT_EXPIRATION_HOURS=72

# -----------------------------------------------------------------------------
# 2. Production Database Configuration (MySQL 8.0+)
# -----------------------------------------------------------------------------
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=mediconnect_app
MYSQL_PASSWORD=REPLACE_WITH_STRONG_PRODUCTION_DB_PASSWORD
MYSQL_DB=mediconnect

# SQLAlchemy Connection Pool Tuning for Healthcare Concurrency
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=300
DB_POOL_PRE_PING=true

# -----------------------------------------------------------------------------
# 3. Distributed Redis Rate Limiting (OWASP Defense)
# -----------------------------------------------------------------------------
REDIS_URL=rediss://default:REPLACE_WITH_REDIS_PASSWORD@sample-endpoint.upstash.io:6379
RATE_LIMIT_STORAGE=auto
RATE_LIMIT_FAIL_CLOSED=true

# -----------------------------------------------------------------------------
# 4. Ingress Reverse Proxy & ProxyFix Hardening
# -----------------------------------------------------------------------------
TRUST_PROXY_HEADERS=true
TRUSTED_PROXIES=127.0.0.1,::1,10.0.0.0/8
PROXY_FIX_X_FOR=1
PROXY_FIX_X_PROTO=1
PROXY_FIX_X_HOST=1
PROXY_FIX_X_PORT=0
PROXY_FIX_X_PREFIX=0

# -----------------------------------------------------------------------------
# 5. CORS Hardened Production Origins
# -----------------------------------------------------------------------------
ALLOWED_ORIGINS=https://mediconnect.yourdomain.com,https://admin.mediconnect.yourdomain.com
```

---

## 2. Waitress Production WSGI Application Server

The production Python backend is served via Waitress (`backend/wsgi.py`), an enterprise multi-threaded WSGI server suitable for high-throughput Windows and Linux server environments.

### Waitress Service Unit (`/etc/systemd/system/mediconnect-backend.service` on Linux or Windows Service):
```ini
[Unit]
Description=MediConnect Healthcare Backend Application Service
After=network.target mysql.service

[Service]
Type=simple
User=mediconnect
Group=mediconnect
WorkingDirectory=/var/www/mediconnect/backend
EnvironmentFile=/var/www/mediconnect/backend/.env
ExecStart=/var/www/mediconnect/backend/venv/bin/python wsgi.py
Restart=always
RestartSec=5
StandardOutput=append:/var/log/mediconnect/access.log
StandardError=append:/var/log/mediconnect/error.log

# Security Sandboxing
ProtectSystem=full
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Tuning & Concurrency:
- **Threads:** 16 – 32 worker threads configured in `wsgi.py`.
- **Channel Timeout:** 120 seconds to support complex report generation and multi-page prescription PDF compilation.
- **Max Request Body Size:** 10 MB to allow diagnostic report uploads while mitigating buffer-exhaustion attacks.

---

## 3. Storage, File Handling & PDF Compilation

1. **Digital Prescription PDFs:**
   - Generated dynamically in-memory via ReportLab in `backend/services/prescription_pdf.py`.
   - Streamed directly to authenticated clients using `io.BytesIO` buffers.
   - Zero temporary clinical PDF files are persisted to disk, eliminating orphan patient record leakage on application storage volumes.
2. **Medical Documents & Clinical Attachments:**
   - In production, file storage paths are isolated outside the web server root.
   - Uploaded files are assigned random UUID filenames (`uuid.uuid4().hex`) to prevent path traversal attacks.

---

## 4. Health-Check & Monitoring Endpoints

- **Liveness Probe:** `GET /api/health`
  - Returns HTTP 200 with JSON payload `{"status": "healthy", "service": "MediConnect API"}`.
  - Used by load balancers and system monitors to route ingress traffic.
- **Database & System Readiness:**
  - Evaluated on backend bootstrap. If MySQL or required environment variables are invalid, application startup aborts with a clear configuration exception rather than serving degraded traffic.

---

## 5. Strict Database Separation & Isolation Enforcement

> [!CRITICAL]
> **Strict Operational Security Policy:**
> 1. Running with SQLite in production is strictly forbidden by `Config.validate_production_config()` (`BLK-01`).
> 2. The isolated demonstration database (`doctor_hospital.db`) is strictly reserved for local demonstrations and offline QA.
> 3. Production servers **MUST NOT** possess or reference SQLite demo databases.
> 4. Staging and production instances connect exclusively to dedicated MySQL 8.0+ clusters.
