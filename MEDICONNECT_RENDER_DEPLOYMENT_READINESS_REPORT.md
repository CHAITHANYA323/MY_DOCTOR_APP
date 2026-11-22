# MediConnect – GitHub & Render Deployment Readiness Audit Report

**Document Title:** Cloud Deployment Preflight & Infrastructure Readiness Audit  
**Target Platform:** Render Cloud (Web Service + Static Site) + GitHub Remote  
**Cloud Database:** Enzonic MySQL 8.4 Free Tier (`main`) – Verified & Seeded  
**Audit Scope:** Read-Only Static Analysis & Pre-Deployment Verification  
**Execution Timestamp:** November 22, 2026 – 19:44 IST  
**Overall Readiness Verdict:** 🛑 **BLOCKED – RESOLUTION REQUIRED PRIOR TO PUSH/DEPLOY**  

---

## 1. Executive Summary & Audit Scorecard

A comprehensive, read-only audit of the MediConnect repository was performed to evaluate readiness for deploying the Flask backend and React frontend to Render.

### Audit Scorecard:

| # | Audit Check | Target Scope | Status | Key Finding |
| :-: | :--- | :--- | :---: | :--- |
| **1** | **Git Branch & Working Tree** | Local working copy state | 🛑 **BLOCKED** | Working tree contains 11 uncommitted modified files and 26 untracked files (ecosystem redesign, routes, services). |
| **2** | **Unpushed Commits** | Commits ahead of remote | 🛑 **BLOCKED** | Local `main` is ahead of `origin/main` by **11 commits** (including `fc3a6b5`). |
| **3** | **Remote HEAD Alignment** | GitHub remote comparison | 🛑 **BLOCKED** | GitHub `origin/main` is pinned to old commit `25037eb`. Render builds from GitHub and would deploy obsolete code. |
| **4** | **Build & Start Commands** | Frontend & Backend runtime | ✅ **PASSED** | Frontend: `npm run build` ➔ `dist/`.<br>Backend: Gunicorn WSGI command verified (`wsgi:app`). |
| **5** | **Environment Variables** | Configuration names (No secrets) | ✅ **PASSED** | All required environment variable names identified and documented for both services. |
| **6** | **Git-Ignore Protection** | Secret & credential isolation | ✅ **PASSED** | `.gitignore` strictly covers all `.env*` files, database backups, SQLite DBs, and logs. |
| **7** | **Frontend API URL Config** | Dynamic backend URL support | ✅ **PASSED** | `frontend/src/services/api.js` dynamically binds to `VITE_API_URL` with automatic `/api` suffix normalization. |
| **8** | **Deployment Blockers** | Redis & Free-Tier constraints | 🛑 **BLOCKED** | `FLASK_ENV=production` strictly enforces `REDIS_URL`. External Redis (e.g. Upstash) or staging fallback required. |

---

## 2. Detailed Audit Findings

### Check 1: Current Git Branch & Working Tree Status
- **Active Branch:** `main`
- **Upstream Remote:** `origin/main` (`https://github.com/CHAITHANYA323/MY_DOCTOR_APP.git`)
- **Working Tree State:**
  - **11 Modified Files:**
    - `backend/app.py`
    - `backend/config.py`
    - `backend/models.py`
    - `backend/routes/auth.py`
    - `backend/test_step4_8_patient_portal.py`
    - `backend/utils/auth_middleware.py`
    - `frontend/src/context/AuthContext.jsx`
    - `frontend/src/pages/owner/OwnerDashboard.jsx`
    - `frontend/src/pages/superadmin/SuperAdminDashboard.jsx`
    - `frontend/src/services/api.js`
    - `frontend/src/utils/roleUtils.js`
  - **26 Untracked Files:** Includes multi-hospital ecosystem routes (`hospital_admin.py`, `owner.py`, `superadmin.py`), ecosystem migrations (`012_multi_hospital_ecosystem.py`), and test suites.
- **Verdict:** 🛑 **BLOCKED** – Uncommitted application code cannot be deployed by Render.

---

### Check 2: Local Commits Not Yet Pushed
Local `main` is ahead of `origin/main` by **11 commits**:

```text
fc3a6b5 docs(migration): add Enzonic MySQL 8.4 synthetic database import and verification reports
53ee8e0 docs(pilot): author complete 11-part hospital clinical UAT and production infrastructure readiness package
f69614c test(uat): add automated hospital pilot browser UAT suite and complete clinical workflow validations
c3162ec fix(auth): protect directory routes with guest login redirect, preserve post-login path, and complete readiness audit
e89d48d feat(ui): fix navigation link blinking, add prominent ambulance 108 alert, and stabilize healthcare header
ae391a0 feat(branding): redesign header with animated heartbeat pulse line, rotating bilingual taglines, and subtle glow across all portals
084cb29 fix(layout): unify fixed sidebar positioning, scrolling stability and responsive drawer across all six portals matching hospital admin reference
1543a6d fix(ui): clean up footer backgrounds, eliminate sidebar horizontal scrollbars, and preserve vertical scrolling across all six portals
aa5c536 feat(ui): implement uniform sidebar collapse across all six portals and registration ux improvements
c1845c1 feat(ui): redesign login page and simplify hospital admin portal UX
c10dfb1 fix(backup,rbac): harden MySQL backup restore DDL safety and align unassigned admin test assertion
```
- **Verdict:** 🛑 **BLOCKED** – Render builds exclusively from GitHub remote commits. Deploying now would miss all 11 commits.

---

### Check 3: Remote HEAD vs Local HEAD Comparison
- **Remote HEAD (`origin/main`):** `25037eb` (Nov 21, 2026)
- **Local HEAD (`main`):** `fc3a6b5` (Nov 22, 2026)
- **Diff Magnitude:** 11 commits + 11 modified working tree files.
- **Verdict:** 🛑 **BLOCKED** – Syncing via `git push` is required before Render deployment (currently restricted by safety rules).

---

### Check 4: Build & Start Commands

#### A. Frontend Static Site (Render / Vercel):
- **Framework:** Vite 8.2 + React 19.2
- **Build Command:** `npm run build` (or `npm install && npm run build` if setting root directory to `frontend`)
- **Publish Directory:** `dist` (or `frontend/dist`)
- **Node Version:** 18.x or 20.x

#### B. Backend Web Service (Render Linux Container):
- **Runtime:** Python 3.11.x
- **Dependency File:** `backend/requirements.txt` (includes Flask 3.1.3, PyMySQL 1.2.0, Gunicorn 21.2+, cryptography 42.0+)
- **WSGI Entrypoint:** `backend/wsgi.py` exposes application instance `app`.
- **Render Configuration (Recommended - Root Directory = `backend`):**
  - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
  - **Start Command:** `gunicorn -w 2 -k gthread --threads 4 --timeout 120 wsgi:app`
- **Verdict:** ✅ **PASSED**

---

### Check 5: Required Render Environment Variable Names Only

*(Values omitted for security; names only)*

#### 1. Backend Web Service (Render Dashboard):
| Environment Variable Name | Purpose | Production Requirement |
| :--- | :--- | :---: |
| `FLASK_ENV` | Runtime environment tier | Required (`production` or `staging`) |
| `SECRET_KEY` | Cryptographic session & token signing key | **MANDATORY** (min 32 characters) |
| `DATABASE_URL` | Unified MySQL connection URI (takes precedence) | Required (or discrete variables below) |
| `MYSQL_HOST` | Enzonic MySQL host hostname | Required if `DATABASE_URL` unset |
| `MYSQL_PORT` | Enzonic MySQL port (`3306`) | Required if `DATABASE_URL` unset |
| `MYSQL_USER` | Enzonic MySQL authenticated username | Required if `DATABASE_URL` unset |
| `MYSQL_PASSWORD` | Enzonic MySQL user password | Required if `DATABASE_URL` unset |
| `MYSQL_DB` | Enzonic database name (`main`) | Required if `DATABASE_URL` unset |
| `REDIS_URL` | Redis URI for distributed rate limiting | **MANDATORY** if `FLASK_ENV=production` |
| `ALLOWED_ORIGINS` | Whitelisted frontend origins for CORS | **MANDATORY** (e.g. `https://<frontend>.onrender.com`) |
| `TRUST_PROXY_HEADERS` | Enables reverse-proxy IP handling | Recommended (`true` on Render) |
| `TRUSTED_PROXIES` | Trusted Render proxy CIDRs | Recommended (`10.0.0.0/8,127.0.0.1`) |
| `DB_POOL_PRE_PING` | SQLAlchemy stale connection guard | Recommended (`true`) |
| `DB_POOL_RECYCLE` | Connection recycle interval in seconds | Recommended (`300`) |

#### 2. Frontend Static Site (Render Dashboard):
| Environment Variable Name | Purpose | Production Requirement |
| :--- | :--- | :---: |
| `VITE_API_URL` | Remote Render backend URL | **MANDATORY** (e.g. `https://<backend>.onrender.com`) |

- **Verdict:** ✅ **PASSED**

---

### Check 6: `.gitignore` Protection Audit
- **Rule Verification:**
  - `.env`, `.env.local`, `.env.*.local`, `frontend/.env`, `backend/.env`, `*.env` ➔ **100% IGNORED**
  - `backups/` (contains all `.sql` dumps) ➔ **100% IGNORED**
  - `*.db`, `*.sqlite`, `*.sqlite3`, `*.db-wal` ➔ **100% IGNORED**
  - `logs/`, `*.log`, `scratch/`, `qa_reports/` ➔ **100% IGNORED**
- **Tested Verification:**
  - `git check-ignore -v backend/.env.enzonic.local` ➔ Verified ignored by line 20.
  - `git check-ignore -v backups/mediconnect_demo_synthetic.sql` ➔ Verified ignored by line 64.
- **Verdict:** ✅ **PASSED**

---

### Check 7: Frontend API URL Configuration
- **Inspected File:** `frontend/src/services/api.js`
- **Dynamic Resolution Logic:**
  ```javascript
  const getBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (!envUrl || !envUrl.trim()) return 'http://127.0.0.1:5000';
    let cleaned = envUrl.trim().replace(/\/+$/, '');
    if (cleaned.endsWith('/api')) cleaned = cleaned.slice(0, -4);
    return cleaned;
  };
  ```
- **Finding:** Seamlessly connects to any Render backend domain. If user supplies `https://mediconnect-backend.onrender.com` or `https://mediconnect-backend.onrender.com/api`, it auto-formats canonical `/api` sub-routes.
- **Verdict:** ✅ **PASSED**

---

### Check 8: Deployment Blockers & Free-Tier Constraints

#### 🛑 Blocker 1: Redis Requirement in Production Mode
- **Code Enforcement:** `backend/utils/rate_limiter.py` (lines 505–518) explicitly raises:
  `RuntimeError: CRITICAL: REDIS_URL is mandatory in production (FLASK_ENV=production).`
- **Context:** Render deprecated its free managed Redis service in 2024.
- **Options to Unblock:**
  1. **Option A (Recommended for Free Tier):** Provision a free **Upstash Serverless Redis** instance (free tier: 10,000 requests/day) and set `REDIS_URL=rediss://default:<password>@<host>:6379`.
  2. **Option B:** Set `FLASK_ENV=staging` and `RATE_LIMIT_STORAGE=memory`, which bypasses the mandatory Redis exception while maintaining security safeguards.

#### 🛑 Blocker 2: Unpushed Commits & Uncommitted Working Tree
- Render connects to GitHub. Because `git push` has not been executed, Render will deploy commit `25037eb`, which lacks:
  - 11 committed improvements (hospital clinical UAT package, UI navigation fixes, responsive sidebar layout, branding pulse animation).
  - Uncommitted ecosystem redesign routes (`owner.py`, `hospital_admin.py`, `superadmin.py`).

#### ℹ️ Free-Tier Limitation 1: Container Spindown (Cold Starts)
- Render Free Web Services spin down after 15 minutes of inactivity.
- The initial wake-up request takes **50–80 seconds**. Frontend axios timeouts must accommodate this initial delay.

#### ℹ️ Free-Tier Limitation 2: 512 MB RAM Ceiling
- Render Free instances provide 512 MB memory.
- Gunicorn must run with `-w 1 -k gthread --threads 4` or `-w 2 --threads 2`. Attempting 4+ worker processes will trigger an Out-Of-Memory (OOM) restart.

#### ℹ️ Free-Tier Limitation 3: Ephemeral Filesystem (Safe)
- Render filesystems are ephemeral.
- Audit confirms MediConnect stores zero uploads on disk:
  - Doctor avatars use `ui-avatars.com` URLs or Unsplash URLs.
  - Prescriptions store medication items as JSON text in the MySQL database.
  - No local media upload directory is needed.

---

## 3. Pre-Deployment Action Plan (When Authorized)

When you are ready to authorize deployment:

1. **Resolve Working Tree:** Commit intentional ecosystem changes to Git.
2. **Push to Remote:** Push `main` to `https://github.com/CHAITHANYA323/MY_DOCTOR_APP.git`.
3. **Configure Redis:** Obtain a free Upstash Redis URL or select the staging mode fallback.
4. **Deploy Backend to Render:**
   - Web Service, Python 3.11, Root Directory = `backend`.
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn -w 2 -k gthread --threads 4 --timeout 120 wsgi:app`
   - Add environment variables identified in Check 5.
5. **Deploy Frontend to Render / Vercel:**
   - Static Site, Root Directory = `frontend`.
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Set `VITE_API_URL` to the deployed backend URL.
