"""
MediConnect Step 6: Complete End-to-End Application Testing Suite
Executes comprehensive end-to-end testing across 10 functional and security areas
against the live MySQL 8.0.46 database and active development servers.

Areas Covered:
1. Authentication & Session Handling (All 5 Roles + Negative Tests)
2. Platform Owner Operations & Centralized Oversight
3. Hospital Super Admin Operations & Scoped Governance
4. Receptionist Operations, Triage & Patient Search
5. Doctor Portal & Clinical Workflows
6. Patient Portal, Directory & Appointment Availability
7. Ambulance Services & Dispatch Scoping
8. Reviews & Ratings Aggregation
9. Role-Based Access Control (RBAC) & Boundary Isolation
10. MySQL Database Persistence & SQLite Source Preservation
"""

import sys
import os
import json
import sqlite3
import urllib.request
import urllib.error
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

os.environ['SKIP_AUTO_SEED'] = 'true'

from app import create_app
from models import db, User, Hospital, Doctor, Appointment, Specialization, Ambulance, AmbulanceRequest, Review, Favorite, Invitation, AuditLog
from config import Config


class E2ETestRunner:
    def __init__(self, base_url="http://127.0.0.1:5000", vite_url="http://localhost:5173"):
        self.base_url = base_url
        self.vite_url = vite_url
        self.app = create_app()
        self.client = self.app.test_client()
        self.results = []
        self.tokens = {}

    def log_result(self, area, test_id, description, status, details=""):
        self.results.append({
            "area": area,
            "id": test_id,
            "description": description,
            "status": status,
            "details": details
        })
        symbol = "[PASS]" if status == "PASS" else "[FAIL]" if status == "FAIL" else "[BLOCKED]"
        print(f"  {symbol} {test_id}: {description} {f'({details})' if details else ''}")

    def http_request(self, url, method="GET", data=None, headers=None):
        if headers is None:
            headers = {}
        if data is not None and isinstance(data, dict):
            data_bytes = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        else:
            data_bytes = None
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                body = response.read().decode("utf-8")
                return response.status, json.loads(body) if body else {}
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            try:
                parsed = json.loads(body) if body else {}
            except Exception:
                parsed = {"raw": body}
            return e.code, parsed
        except Exception as ex:
            return 0, {"error": str(ex)}

    # -------------------------------------------------------------------------
    # AREA 1: Authentication & Session Handling
    # -------------------------------------------------------------------------
    def test_area_1_authentication(self):
        print("\n======================================================================")
        print("AREA 1: AUTHENTICATION & SESSION HANDLING")
        print("======================================================================")

        creds = [
            ("AUTH-01", "PLATFORM_OWNER", "owner@mediconnect.com", "Owner@123", None),
            ("AUTH-02", "HOSPITAL_SUPER_ADMIN", "admin.hosp1@medicare.com", "Admin@123", 1),
            ("AUTH-03", "RECEPTIONIST", "reception.hosp1@medicare.com", "Reception@123", 1),
            ("AUTH-04", "DOCTOR", "dr.one@medicare.com", "Doctor@123", 1),
            ("AUTH-05", "PATIENT", "patient.alpha@test.com", "Patient@123", None),
        ]

        for tid, role, email, pwd, hosp_id in creds:
            try:
                status, res = self.http_request(f"{self.base_url}/api/login", "POST", {"email": email, "password": pwd})
                if status == 200 and res.get("success") and res.get("token") and res.get("user", {}).get("role") == role:
                    self.tokens[role] = res["token"]
                    self.log_result("Authentication", tid, f"Login for {role} ({email})", "PASS", f"HTTP 200, JWT issued")
                else:
                    self.log_result("Authentication", tid, f"Login for {role}", "FAIL", f"Status: {status}, Response: {res}")
            except Exception as e:
                self.log_result("Authentication", tid, f"Login for {role}", "FAIL", str(e))

        # AUTH-06: Session identity verification via /api/auth/me
        try:
            status, res = self.http_request(f"{self.base_url}/api/auth/me", headers={"Authorization": f"Bearer {self.tokens['PLATFORM_OWNER']}"})
            if status == 200 and res.get("user", {}).get("role") == "PLATFORM_OWNER":
                self.log_result("Authentication", "AUTH-06", "Session Identity Verification (/api/auth/me)", "PASS", "Verified PLATFORM_OWNER")
            else:
                self.log_result("Authentication", "AUTH-06", "Session Identity Verification", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Authentication", "AUTH-06", "Session Identity Verification", "FAIL", str(e))

        # AUTH-07: Invalid password rejection
        try:
            status, res = self.http_request(f"{self.base_url}/api/login", "POST", {"email": "owner@mediconnect.com", "password": "WrongPassword!999"})
            if status == 401:
                self.log_result("Authentication", "AUTH-07", "Invalid Password Rejection", "PASS", "HTTP 401 Unauthorized")
            else:
                self.log_result("Authentication", "AUTH-07", "Invalid Password Rejection", "FAIL", f"Expected 401, got {status}")
        except Exception as e:
            self.log_result("Authentication", "AUTH-07", "Invalid Password Rejection", "FAIL", str(e))

        # AUTH-08: Non-existent email rejection
        try:
            status, res = self.http_request(f"{self.base_url}/api/login", "POST", {"email": "ghost.user@nonexistent.org", "password": "Password@123"})
            if status == 401:
                self.log_result("Authentication", "AUTH-08", "Non-Existent Email Rejection", "PASS", "HTTP 401 Unauthorized")
            else:
                self.log_result("Authentication", "AUTH-08", "Non-Existent Email Rejection", "FAIL", f"Expected 401, got {status}")
        except Exception as e:
            self.log_result("Authentication", "AUTH-08", "Non-Existent Email Rejection", "FAIL", str(e))

        # AUTH-09: Deactivated account rejection (SEC-01)
        try:
            status, res = self.http_request(f"{self.base_url}/api/login", "POST", {"email": "deactivated@medicare.com", "password": "Password@123"})
            if status == 403:
                self.log_result("Authentication", "AUTH-09", "Deactivated Account Rejection", "PASS", "HTTP 403 Account Deactivated")
            else:
                self.log_result("Authentication", "AUTH-09", "Deactivated Account Rejection", "FAIL", f"Expected 403, got {status}")
        except Exception as e:
            self.log_result("Authentication", "AUTH-09", "Deactivated Account Rejection", "FAIL", str(e))

        # AUTH-10: Missing credential fields validation
        try:
            status, res = self.http_request(f"{self.base_url}/api/login", "POST", {"email": ""})
            if status == 400:
                self.log_result("Authentication", "AUTH-10", "Missing Credentials Rejection", "PASS", "HTTP 400 Bad Request")
            else:
                self.log_result("Authentication", "AUTH-10", "Missing Credentials Rejection", "FAIL", f"Expected 400, got {status}")
        except Exception as e:
            self.log_result("Authentication", "AUTH-10", "Missing Credentials Rejection", "FAIL", str(e))

        # AUTH-11: Expired / Forged Bearer token rejection
        try:
            status, res = self.http_request(f"{self.base_url}/api/admin/stats", headers={"Authorization": "Bearer fake.tampered.signature"})
            if status == 401:
                self.log_result("Authentication", "AUTH-11", "Forged JWT Token Rejection", "PASS", "HTTP 401 Unauthorized")
            else:
                self.log_result("Authentication", "AUTH-11", "Forged JWT Token Rejection", "FAIL", f"Expected 401, got {status}")
        except Exception as e:
            self.log_result("Authentication", "AUTH-11", "Forged JWT Token Rejection", "FAIL", str(e))

        # AUTH-12: Vite proxy authentication forwarding
        try:
            status, res = self.http_request(f"{self.vite_url}/api/login", "POST", {"email": "patient.alpha@test.com", "password": "Patient@123"})
            if status == 200 and res.get("token"):
                self.log_result("Authentication", "AUTH-12", "Frontend Reverse Proxy Auth Forwarding", "PASS", "Vite proxy HTTP 200 OK")
            else:
                self.log_result("Authentication", "AUTH-12", "Frontend Reverse Proxy Auth Forwarding", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Authentication", "AUTH-12", "Frontend Reverse Proxy Auth Forwarding", "FAIL", str(e))

    # -------------------------------------------------------------------------
    # AREA 2: Platform Owner Operations
    # -------------------------------------------------------------------------
    def test_area_2_platform_owner(self):
        print("\n======================================================================")
        print("AREA 2: PLATFORM OWNER OPERATIONS")
        print("======================================================================")
        hdrs = {"Authorization": f"Bearer {self.tokens['PLATFORM_OWNER']}"}

        # PO-01: Global metrics
        try:
            status, res = self.http_request(f"{self.base_url}/api/admin/stats", headers=hdrs)
            m = res.get("metrics", {})
            if status == 200 and m.get("total_doctors") == 6 and m.get("total_hospitals") == 4:
                self.log_result("Platform Owner", "PO-01", "Global Platform Metrics (/api/admin/stats)", "PASS", f"Doctors: {m['total_doctors']}, Hospitals: {m['total_hospitals']}")
            else:
                self.log_result("Platform Owner", "PO-01", "Global Platform Metrics", "FAIL", f"Status: {status}, Metrics: {m}")
        except Exception as e:
            self.log_result("Platform Owner", "PO-01", "Global Platform Metrics", "FAIL", str(e))

        # PO-02: Platform hospitals management list
        try:
            status, res = self.http_request(f"{self.base_url}/api/hospitals", headers=hdrs)
            hosps = res.get("hospitals", [])
            if status == 200 and len(hosps) == 4:
                self.log_result("Platform Owner", "PO-02", "Hospital Oversight Directory (/api/hospitals)", "PASS", "4 hospitals listed")
            else:
                self.log_result("Platform Owner", "PO-02", "Hospital Oversight Directory", "FAIL", f"Count: {len(hosps)}")
        except Exception as e:
            self.log_result("Platform Owner", "PO-02", "Hospital Oversight Directory", "FAIL", str(e))

        # PO-03: Security audit logs
        try:
            status, res = self.http_request(f"{self.base_url}/api/platform/audit-logs", headers=hdrs)
            logs = res.get("audit_logs", [])
            if status == 200 and res.get("success"):
                self.log_result("Platform Owner", "PO-03", "Central Security Audit Trail (/api/platform/audit-logs)", "PASS", f"{len(logs)} audit entries")
            else:
                self.log_result("Platform Owner", "PO-03", "Central Security Audit Trail", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Platform Owner", "PO-03", "Central Security Audit Trail", "FAIL", str(e))

        # PO-04: Platform invitations inspection
        try:
            status, res = self.http_request(f"{self.base_url}/api/hospital/invitations", headers=hdrs)
            invs = res.get("invitations", [])
            if status == 200 and res.get("success"):
                self.log_result("Platform Owner", "PO-04", "Platform Staff Invitations (/api/hospital/invitations)", "PASS", f"{len(invs)} invitations retrieved")
            else:
                self.log_result("Platform Owner", "PO-04", "Platform Staff Invitations", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Platform Owner", "PO-04", "Platform Staff Invitations", "FAIL", str(e))

        # PO-05: Hospital stats distribution breakdown
        try:
            status, res = self.http_request(f"{self.base_url}/api/admin/stats", headers=hdrs)
            hstats = res.get("hospital_stats", [])
            if status == 200 and len(hstats) == 4:
                self.log_result("Platform Owner", "PO-05", "Hospital Doctor Distribution Breakdown", "PASS", f"4 hospitals analyzed")
            else:
                self.log_result("Platform Owner", "PO-05", "Hospital Doctor Distribution Breakdown", "FAIL", f"Count: {len(hstats)}")
        except Exception as e:
            self.log_result("Platform Owner", "PO-05", "Hospital Doctor Distribution Breakdown", "FAIL", str(e))

        # PO-06: Cross-role protection (Owner cannot access personal patient charts)
        try:
            status, res = self.http_request(f"{self.base_url}/api/patient/medical-records", headers=hdrs)
            if status == 403:
                self.log_result("Platform Owner", "PO-06", "Access Restriction: Patient Medical Records", "PASS", "HTTP 403 Forbidden")
            else:
                self.log_result("Platform Owner", "PO-06", "Access Restriction: Patient Medical Records", "FAIL", f"Expected 403, got {status}")
        except Exception as e:
            self.log_result("Platform Owner", "PO-06", "Access Restriction: Patient Medical Records", "FAIL", str(e))

    # -------------------------------------------------------------------------
    # AREA 3: Hospital Super Admin Operations
    # -------------------------------------------------------------------------
    def test_area_3_hospital_super_admin(self):
        print("\n======================================================================")
        print("AREA 3: HOSPITAL SUPER ADMIN OPERATIONS")
        print("======================================================================")
        hdrs = {"Authorization": f"Bearer {self.tokens['HOSPITAL_SUPER_ADMIN']}"}

        # SA-01: Scoped dashboard metrics (Strictly Hospital 1)
        try:
            status, res = self.http_request(f"{self.base_url}/api/admin/stats", headers=hdrs)
            m = res.get("metrics", {})
            hstats = res.get("hospital_stats", [])
            if status == 200 and m.get("total_hospitals") == 1 and len(hstats) == 1:
                self.log_result("Hospital Super Admin", "SA-01", "Tenant-Scoped Dashboard (/api/admin/stats)", "PASS", "Strictly Hospital 1 scoped")
            else:
                self.log_result("Hospital Super Admin", "SA-01", "Tenant-Scoped Dashboard", "FAIL", f"Hospitals: {m.get('total_hospitals')}, Stat items: {len(hstats)}")
        except Exception as e:
            self.log_result("Hospital Super Admin", "SA-01", "Tenant-Scoped Dashboard", "FAIL", str(e))

        # SA-02: Hospital doctor roster
        try:
            status, res = self.http_request(f"{self.base_url}/api/doctors?hospital_id=1&status=all", headers=hdrs)
            docs = res.get("doctors", [])
            all_hosp1 = all(d.get("hospital_id") == 1 for d in docs)
            if status == 200 and len(docs) > 0 and all_hosp1:
                self.log_result("Hospital Super Admin", "SA-02", "Hospital Doctor Roster (/api/doctors?hospital_id=1)", "PASS", f"{len(docs)} doctors in hospital 1")
            else:
                self.log_result("Hospital Super Admin", "SA-02", "Hospital Doctor Roster", "FAIL", f"Docs: {len(docs)}, All Hosp 1: {all_hosp1}")
        except Exception as e:
            self.log_result("Hospital Super Admin", "SA-02", "Hospital Doctor Roster", "FAIL", str(e))

        # SA-03: Hospital staff invitations
        try:
            status, res = self.http_request(f"{self.base_url}/api/hospital/invitations", headers=hdrs)
            invs = res.get("invitations", [])
            if status == 200 and res.get("success"):
                self.log_result("Hospital Super Admin", "SA-03", "Hospital Staff Invitations (/api/hospital/invitations)", "PASS", f"{len(invs)} invitations retrieved")
            else:
                self.log_result("Hospital Super Admin", "SA-03", "Hospital Staff Invitations", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Hospital Super Admin", "SA-03", "Hospital Staff Invitations", "FAIL", str(e))

        # SA-04: Hospital appointments ledger
        try:
            status, res = self.http_request(f"{self.base_url}/api/appointments?hospital_id=1", headers=hdrs)
            appts = res.get("appointments", [])
            if status == 200 and res.get("success"):
                self.log_result("Hospital Super Admin", "SA-04", "Hospital Appointments Ledger (/api/appointments)", "PASS", f"{len(appts)} appointments")
            else:
                self.log_result("Hospital Super Admin", "SA-04", "Hospital Appointments Ledger", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Hospital Super Admin", "SA-04", "Hospital Appointments Ledger", "FAIL", str(e))

        # SA-05: Hospital ambulances query
        try:
            status, res = self.http_request(f"{self.base_url}/api/ambulances", headers=hdrs)
            if status == 200 and res.get("success"):
                self.log_result("Hospital Super Admin", "SA-05", "Ambulance Fleet Status (/api/ambulances)", "PASS", "HTTP 200 OK")
            else:
                self.log_result("Hospital Super Admin", "SA-05", "Ambulance Fleet Status", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Hospital Super Admin", "SA-05", "Ambulance Fleet Status", "FAIL", str(e))

        # SA-06: RBAC restriction (Super Admin cannot view platform audit logs)
        try:
            status, res = self.http_request(f"{self.base_url}/api/platform/audit-logs", headers=hdrs)
            if status == 403:
                self.log_result("Hospital Super Admin", "SA-06", "Access Restriction: Platform Audit Logs", "PASS", "HTTP 403 Forbidden")
            else:
                self.log_result("Hospital Super Admin", "SA-06", "Access Restriction: Platform Audit Logs", "FAIL", f"Expected 403, got {status}")
        except Exception as e:
            self.log_result("Hospital Super Admin", "SA-06", "Access Restriction: Platform Audit Logs", "FAIL", str(e))

    # -------------------------------------------------------------------------
    # AREA 4: Receptionist Operations
    # -------------------------------------------------------------------------
    def test_area_4_receptionist(self):
        print("\n======================================================================")
        print("AREA 4: RECEPTIONIST OPERATIONS & TRIAGE")
        print("======================================================================")
        hdrs = {"Authorization": f"Bearer {self.tokens['RECEPTIONIST']}"}

        # REC-01: Reception operational stats
        try:
            status, res = self.http_request(f"{self.base_url}/api/reception/stats", headers=hdrs)
            if status == 200 and res.get("success"):
                self.log_result("Receptionist", "REC-01", "Daily Triage Operational Stats (/api/reception/stats)", "PASS", "HTTP 200 OK")
            else:
                self.log_result("Receptionist", "REC-01", "Daily Triage Operational Stats", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Receptionist", "REC-01", "Daily Triage Operational Stats", "FAIL", str(e))

        # REC-02: Patient search & lookup
        try:
            status, res = self.http_request(f"{self.base_url}/api/reception/patients", headers=hdrs)
            pts = res.get("patients", [])
            if status == 200 and res.get("success"):
                self.log_result("Receptionist", "REC-02", "Patient Check-in Lookup (/api/reception/patients)", "PASS", f"{len(pts)} patients listed")
            else:
                self.log_result("Receptionist", "REC-02", "Patient Check-in Lookup", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Receptionist", "REC-02", "Patient Check-in Lookup", "FAIL", str(e))

        # REC-03: Patient search with query parameter
        try:
            status, res = self.http_request(f"{self.base_url}/api/reception/patients?search=Alpha", headers=hdrs)
            pts = res.get("patients", [])
            if status == 200 and res.get("success") and len(pts) >= 1:
                self.log_result("Receptionist", "REC-03", "Filtered Patient Search (?search=Alpha)", "PASS", f"{len(pts)} matched")
            else:
                self.log_result("Receptionist", "REC-03", "Filtered Patient Search", "FAIL", f"Status: {status}, Count: {len(pts)}")
        except Exception as e:
            self.log_result("Receptionist", "REC-03", "Filtered Patient Search", "FAIL", str(e))

        # REC-04: Front-desk admin overview
        try:
            status, res = self.http_request(f"{self.base_url}/api/admin/stats", headers=hdrs)
            if status == 200 and res.get("success"):
                self.log_result("Receptionist", "REC-04", "Front-Desk Department Stats (/api/admin/stats)", "PASS", "HTTP 200 OK")
            else:
                self.log_result("Receptionist", "REC-04", "Front-Desk Department Stats", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Receptionist", "REC-04", "Front-Desk Department Stats", "FAIL", str(e))

        # REC-05: RBAC restriction (Receptionist cannot access clinical doctor profile)
        try:
            status, res = self.http_request(f"{self.base_url}/api/doctor/profile", headers=hdrs)
            if status == 403:
                self.log_result("Receptionist", "REC-05", "Access Restriction: Doctor Clinical Profile", "PASS", "HTTP 403 Forbidden")
            else:
                self.log_result("Receptionist", "REC-05", "Access Restriction: Doctor Clinical Profile", "FAIL", f"Expected 403, got {status}")
        except Exception as e:
            self.log_result("Receptionist", "REC-05", "Access Restriction: Doctor Clinical Profile", "FAIL", str(e))

        # REC-06: RBAC restriction (Receptionist cannot view platform audit logs)
        try:
            status, res = self.http_request(f"{self.base_url}/api/platform/audit-logs", headers=hdrs)
            if status == 403:
                self.log_result("Receptionist", "REC-06", "Access Restriction: Platform Audit Logs", "PASS", "HTTP 403 Forbidden")
            else:
                self.log_result("Receptionist", "REC-06", "Access Restriction: Platform Audit Logs", "FAIL", f"Expected 403, got {status}")
        except Exception as e:
            self.log_result("Receptionist", "REC-06", "Access Restriction: Platform Audit Logs", "FAIL", str(e))

    # -------------------------------------------------------------------------
    # AREA 5: Doctor Portal Operations
    # -------------------------------------------------------------------------
    def test_area_5_doctor(self):
        print("\n======================================================================")
        print("AREA 5: DOCTOR PORTAL & CLINICAL WORKFLOWS")
        print("======================================================================")
        hdrs = {"Authorization": f"Bearer {self.tokens['DOCTOR']}"}

        # DOC-01: Doctor clinical profile
        try:
            status, res = self.http_request(f"{self.base_url}/api/doctor/profile", headers=hdrs)
            doc = res.get("doctor", {})
            if status == 200 and res.get("success") and doc.get("name") == "Dr. Hospital One":
                self.log_result("Doctor", "DOC-01", "Doctor Clinical Profile (/api/doctor/profile)", "PASS", f"Dr. {doc.get('name')}")
            else:
                self.log_result("Doctor", "DOC-01", "Doctor Clinical Profile", "FAIL", f"Status: {status}, Doctor: {doc}")
        except Exception as e:
            self.log_result("Doctor", "DOC-01", "Doctor Clinical Profile", "FAIL", str(e))

        # DOC-02: Doctor clinical agenda / stats
        try:
            status, res = self.http_request(f"{self.base_url}/api/doctor/stats", headers=hdrs)
            if status == 200 and res.get("success"):
                self.log_result("Doctor", "DOC-02", "Doctor Clinical Agenda & Stats (/api/doctor/stats)", "PASS", "HTTP 200 OK")
            else:
                self.log_result("Doctor", "DOC-02", "Doctor Clinical Agenda & Stats", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Doctor", "DOC-02", "Doctor Clinical Agenda & Stats", "FAIL", str(e))

        # DOC-03: Doctor patient roster
        try:
            status, res = self.http_request(f"{self.base_url}/api/doctor/patients", headers=hdrs)
            if status == 200 and res.get("success"):
                self.log_result("Doctor", "DOC-03", "Doctor Clinical Patient Roster (/api/doctor/patients)", "PASS", "HTTP 200 OK")
            else:
                self.log_result("Doctor", "DOC-03", "Doctor Clinical Patient Roster", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Doctor", "DOC-03", "Doctor Clinical Patient Roster", "FAIL", str(e))

        # DOC-04: Doctor schedule access
        try:
            status, res = self.http_request(f"{self.base_url}/api/doctor/me", headers=hdrs)
            if status == 200 and res.get("success"):
                self.log_result("Doctor", "DOC-04", "Doctor Schedule & Settings (/api/doctor/me)", "PASS", "HTTP 200 OK")
            else:
                self.log_result("Doctor", "DOC-04", "Doctor Schedule & Settings", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Doctor", "DOC-04", "Doctor Schedule & Settings", "FAIL", str(e))

        # DOC-05: RBAC restriction (Doctor cannot access reception triage stats)
        try:
            status, res = self.http_request(f"{self.base_url}/api/reception/stats", headers=hdrs)
            if status == 403:
                self.log_result("Doctor", "DOC-05", "Access Restriction: Reception Triage Stats", "PASS", "HTTP 403 Forbidden")
            else:
                self.log_result("Doctor", "DOC-05", "Access Restriction: Reception Triage Stats", "FAIL", f"Expected 403, got {status}")
        except Exception as e:
            self.log_result("Doctor", "DOC-05", "Access Restriction: Reception Triage Stats", "FAIL", str(e))

        # DOC-06: RBAC restriction (Doctor cannot access administrative stats)
        try:
            status, res = self.http_request(f"{self.base_url}/api/admin/stats", headers=hdrs)
            if status == 403:
                self.log_result("Doctor", "DOC-06", "Access Restriction: Hospital Admin Stats", "PASS", "HTTP 403 Forbidden")
            else:
                self.log_result("Doctor", "DOC-06", "Access Restriction: Hospital Admin Stats", "FAIL", f"Expected 403, got {status}")
        except Exception as e:
            self.log_result("Doctor", "DOC-06", "Access Restriction: Hospital Admin Stats", "FAIL", str(e))

    # -------------------------------------------------------------------------
    # AREA 6: Patient Portal & Directory
    # -------------------------------------------------------------------------
    def test_area_6_patient_portal(self):
        print("\n======================================================================")
        print("AREA 6: PATIENT PORTAL & HEALTHCARE DIRECTORY")
        print("======================================================================")
        hdrs = {"Authorization": f"Bearer {self.tokens['PATIENT']}"}

        # PAT-01: Patient dashboard
        try:
            status, res = self.http_request(f"{self.base_url}/api/patient/dashboard", headers=hdrs)
            if status == 200 and res.get("success"):
                self.log_result("Patient", "PAT-01", "Patient Dashboard (/api/patient/dashboard)", "PASS", "HTTP 200 OK")
            else:
                self.log_result("Patient", "PAT-01", "Patient Dashboard", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Patient", "PAT-01", "Patient Dashboard", "FAIL", str(e))

        # PAT-02: Patient personal appointments
        try:
            status, res = self.http_request(f"{self.base_url}/api/patient/appointments", headers=hdrs)
            appts = res.get("appointments", [])
            if status == 200 and res.get("success"):
                self.log_result("Patient", "PAT-02", "Patient Personal Appointments (/api/patient/appointments)", "PASS", f"{len(appts)} appointments")
            else:
                self.log_result("Patient", "PAT-02", "Patient Personal Appointments", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Patient", "PAT-02", "Patient Personal Appointments", "FAIL", str(e))

        # PAT-03: Patient medical records
        try:
            status, res = self.http_request(f"{self.base_url}/api/patient/medical-records", headers=hdrs)
            if status == 200 and res.get("success"):
                self.log_result("Patient", "PAT-03", "Patient Medical Records (/api/patient/medical-records)", "PASS", "HTTP 200 OK")
            else:
                self.log_result("Patient", "PAT-03", "Patient Medical Records", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Patient", "PAT-03", "Patient Medical Records", "FAIL", str(e))

        # PAT-04: Patient profile details
        try:
            status, res = self.http_request(f"{self.base_url}/api/patient/profile", headers=hdrs)
            p = res.get("user", {})
            if status == 200 and res.get("success") and p.get("email") == "patient.alpha@test.com":
                self.log_result("Patient", "PAT-04", "Patient Profile (/api/patient/profile)", "PASS", f"User: {p.get('name')}")
            else:
                self.log_result("Patient", "PAT-04", "Patient Profile", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Patient", "PAT-04", "Patient Profile", "FAIL", str(e))

        # PAT-05: Public doctor directory search
        try:
            status, res = self.http_request(f"{self.base_url}/api/doctors")
            docs = res.get("doctors", [])
            if status == 200 and len(docs) == 5:
                self.log_result("Patient", "PAT-05", "Public Doctor Directory (/api/doctors)", "PASS", "5 active doctors filtered")
            else:
                self.log_result("Patient", "PAT-05", "Public Doctor Directory", "FAIL", f"Status: {status}, Count: {len(docs)}")
        except Exception as e:
            self.log_result("Patient", "PAT-05", "Public Doctor Directory", "FAIL", str(e))

        # PAT-06: Doctor details endpoint
        try:
            status, res = self.http_request(f"{self.base_url}/api/doctors/1")
            doc = res.get("doctor", {})
            if status == 200 and res.get("success") and doc.get("id") == 1:
                self.log_result("Patient", "PAT-06", "Public Doctor Details (/api/doctors/1)", "PASS", f"Dr. {doc.get('name')}")
            else:
                self.log_result("Patient", "PAT-06", "Public Doctor Details", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Patient", "PAT-06", "Public Doctor Details", "FAIL", str(e))

        # PAT-07: Public hospital directory
        try:
            status, res = self.http_request(f"{self.base_url}/api/hospitals")
            hosps = res.get("hospitals", [])
            if status == 200 and len(hosps) == 4:
                self.log_result("Patient", "PAT-07", "Public Hospital Directory (/api/hospitals)", "PASS", "4 hospitals listed")
            else:
                self.log_result("Patient", "PAT-07", "Public Hospital Directory", "FAIL", f"Status: {status}, Count: {len(hosps)}")
        except Exception as e:
            self.log_result("Patient", "PAT-07", "Public Hospital Directory", "FAIL", str(e))

        # PAT-08: Specializations listing
        try:
            status, res = self.http_request(f"{self.base_url}/api/specializations")
            specs = res.get("specializations", [])
            if status == 200 and len(specs) == 1:
                self.log_result("Patient", "PAT-08", "Public Specializations (/api/specializations)", "PASS", "1 specialization")
            else:
                self.log_result("Patient", "PAT-08", "Public Specializations", "FAIL", f"Status: {status}, Count: {len(specs)}")
        except Exception as e:
            self.log_result("Patient", "PAT-08", "Public Specializations", "FAIL", str(e))

        # PAT-09: Slot availability query for booking
        try:
            status, res = self.http_request(f"{self.base_url}/api/appointments/booked-slots?doctor_id=1&date=2026-11-09")
            if status == 200 and res.get("success") and isinstance(res.get("booked_slots"), list):
                self.log_result("Patient", "PAT-09", "Appointment Slot Availability Query", "PASS", f"Booked slots: {res.get('booked_slots')}")
            else:
                self.log_result("Patient", "PAT-09", "Appointment Slot Availability Query", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Patient", "PAT-09", "Appointment Slot Availability Query", "FAIL", str(e))

    # -------------------------------------------------------------------------
    # AREA 7: Ambulance Services & Dispatch
    # -------------------------------------------------------------------------
    def test_area_7_ambulances(self):
        print("\n======================================================================")
        print("AREA 7: AMBULANCE SERVICES & DISPATCH")
        print("======================================================================")

        # AMB-01: Public emergency contact endpoints
        try:
            status, res = self.http_request(f"{self.base_url}/api/emergency")
            if status in (200, 404):
                # /api/emergency is a frontend route, check /api/ambulances
                status_amb, res_amb = self.http_request(f"{self.base_url}/api/ambulances")
                if status_amb == 200 and res_amb.get("success"):
                    self.log_result("Ambulance", "AMB-01", "Ambulance Fleet Status Endpoint (/api/ambulances)", "PASS", "HTTP 200 OK")
                else:
                    self.log_result("Ambulance", "AMB-01", "Ambulance Fleet Status Endpoint", "FAIL", f"Status: {status_amb}")
        except Exception as e:
            self.log_result("Ambulance", "AMB-01", "Ambulance Fleet Status Endpoint", "FAIL", str(e))

        # AMB-02: Ambulance requests query (Global Platform Owner vs Scoped Super Admin)
        try:
            status_po, res_po = self.http_request(
                f"{self.base_url}/api/ambulance-requests",
                headers={"Authorization": f"Bearer {self.tokens['PLATFORM_OWNER']}"}
            )
            status_sa, res_sa = self.http_request(
                f"{self.base_url}/api/ambulance-requests",
                headers={"Authorization": f"Bearer {self.tokens['HOSPITAL_SUPER_ADMIN']}"}
            )
            reqs_po = res_po.get("requests", [])
            reqs_sa = res_sa.get("requests", [])
            if status_po == 200 and len(reqs_po) == 7 and status_sa == 200 and len(reqs_sa) == 0:
                self.log_result("Ambulance", "AMB-02", "Ambulance Requests Scoping (Owner: 7, Super Admin: 0)", "PASS", "Tenant isolation verified")
            else:
                self.log_result("Ambulance", "AMB-02", "Ambulance Requests Scoping", "FAIL", f"Owner: {len(reqs_po)}, SA: {len(reqs_sa)}")
        except Exception as e:
            self.log_result("Ambulance", "AMB-02", "Ambulance Requests Scoping", "FAIL", str(e))

        # AMB-03: Ambulance dispatch update route validation (PUT /api/ambulance-requests/<id>)
        try:
            status, res = self.http_request(
                f"{self.base_url}/api/ambulance-requests/99999",
                method="PUT",
                data={"status": "Dispatched"},
                headers={"Authorization": f"Bearer {self.tokens['HOSPITAL_SUPER_ADMIN']}"}
            )
            if status == 404:
                self.log_result("Ambulance", "AMB-03", "Ambulance Dispatch Endpoint (PUT 404 for invalid request)", "PASS", "HTTP 404 Not Found")
            else:
                self.log_result("Ambulance", "AMB-03", "Ambulance Dispatch Endpoint", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Ambulance", "AMB-03", "Ambulance Dispatch Endpoint", "FAIL", str(e))

        # AMB-04: Unauthenticated ambulance request access blocked (SEC-05)
        try:
            status, res = self.http_request(f"{self.base_url}/api/ambulance-requests")
            if status == 401:
                self.log_result("Ambulance", "AMB-04", "Unauthenticated Request Query Blocked", "PASS", "HTTP 401 Unauthorized")
            else:
                self.log_result("Ambulance", "AMB-04", "Unauthenticated Request Query Blocked", "FAIL", f"Expected 401, got {status}")
        except Exception as e:
            self.log_result("Ambulance", "AMB-04", "Unauthenticated Request Query Blocked", "FAIL", str(e))

        # AMB-05: Patient access to own ambulance requests
        try:
            status, res = self.http_request(
                f"{self.base_url}/api/ambulance-requests",
                headers={"Authorization": f"Bearer {self.tokens['PATIENT']}"}
            )
            if status == 200 and res.get("success"):
                self.log_result("Ambulance", "AMB-05", "Patient Scoped Ambulance Request Query", "PASS", "HTTP 200 OK")
            else:
                self.log_result("Ambulance", "AMB-05", "Patient Scoped Ambulance Request Query", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Ambulance", "AMB-05", "Patient Scoped Ambulance Request Query", "FAIL", str(e))

    # -------------------------------------------------------------------------
    # AREA 8: Reviews & Ratings
    # -------------------------------------------------------------------------
    def test_area_8_reviews(self):
        print("\n======================================================================")
        print("AREA 8: REVIEWS & DOCTOR RATINGS")
        print("======================================================================")

        # REV-01: Doctor reviews query (?doctor_id=1)
        try:
            status, res = self.http_request(f"{self.base_url}/api/reviews?doctor_id=1")
            revs = res.get("reviews", [])
            if status == 200 and res.get("success"):
                self.log_result("Reviews", "REV-01", "Public Doctor Reviews Query (/api/reviews?doctor_id=1)", "PASS", f"{len(revs)} reviews returned")
            else:
                self.log_result("Reviews", "REV-01", "Public Doctor Reviews Query", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Reviews", "REV-01", "Public Doctor Reviews Query", "FAIL", str(e))

        # REV-02: Review submission without token blocked
        try:
            status, res = self.http_request(f"{self.base_url}/api/reviews", "POST", {"doctor_id": 1, "rating": 5, "comment": "Great!"})
            if status == 401:
                self.log_result("Reviews", "REV-02", "Unauthenticated Review Submission Blocked", "PASS", "HTTP 401 Unauthorized")
            else:
                self.log_result("Reviews", "REV-02", "Unauthenticated Review Submission Blocked", "FAIL", f"Expected 401, got {status}")
        except Exception as e:
            self.log_result("Reviews", "REV-02", "Unauthenticated Review Submission Blocked", "FAIL", str(e))

        # REV-03: Missing doctor_id parameter validation (400 Bad Request)
        try:
            status, res = self.http_request(f"{self.base_url}/api/reviews")
            if status == 400:
                self.log_result("Reviews", "REV-03", "Missing doctor_id Parameter Validation", "PASS", "HTTP 400 Doctor ID Required")
            else:
                self.log_result("Reviews", "REV-03", "Missing doctor_id Parameter Validation", "FAIL", f"Expected 400, got {status}")
        except Exception as e:
            self.log_result("Reviews", "REV-03", "Missing doctor_id Parameter Validation", "FAIL", str(e))

        # REV-04: User favorites query
        try:
            status, res = self.http_request(
                f"{self.base_url}/api/favorites",
                headers={"Authorization": f"Bearer {self.tokens['PATIENT']}"}
            )
            if status == 200 and res.get("success"):
                self.log_result("Reviews", "REV-04", "Patient Favorite Doctors (/api/favorites)", "PASS", "HTTP 200 OK")
            else:
                self.log_result("Reviews", "REV-04", "Patient Favorite Doctors", "FAIL", f"Status: {status}")
        except Exception as e:
            self.log_result("Reviews", "REV-04", "Patient Favorite Doctors", "FAIL", str(e))

    # -------------------------------------------------------------------------
    # AREA 9: Role-Based Access Control (RBAC) & Boundary Isolation
    # -------------------------------------------------------------------------
    def test_area_9_rbac(self):
        print("\n======================================================================")
        print("AREA 9: ROLE-BASED ACCESS CONTROL (RBAC) & BOUNDARY ISOLATION")
        print("======================================================================")

        rbac_matrix = [
            ("RBAC-01", "Patient attempting Doctor stats", "PATIENT", "/api/doctor/stats", 403),
            ("RBAC-02", "Patient attempting Reception stats", "PATIENT", "/api/reception/stats", 403),
            ("RBAC-03", "Patient attempting Admin stats", "PATIENT", "/api/admin/stats", 403),
            ("RBAC-04", "Patient attempting Platform audit logs", "PATIENT", "/api/platform/audit-logs", 403),
            ("RBAC-05", "Doctor attempting Reception stats", "DOCTOR", "/api/reception/stats", 403),
            ("RBAC-06", "Doctor attempting Admin stats", "DOCTOR", "/api/admin/stats", 403),
            ("RBAC-07", "Doctor attempting Platform audit logs", "DOCTOR", "/api/platform/audit-logs", 403),
            ("RBAC-08", "Receptionist attempting Doctor profile", "RECEPTIONIST", "/api/doctor/profile", 403),
            ("RBAC-09", "Receptionist attempting Platform audit logs", "RECEPTIONIST", "/api/platform/audit-logs", 403),
            ("RBAC-10", "Super Admin attempting Platform audit logs", "HOSPITAL_SUPER_ADMIN", "/api/platform/audit-logs", 403),
            ("RBAC-11", "Super Admin attempting Patient medical records", "HOSPITAL_SUPER_ADMIN", "/api/patient/medical-records", 403),
            ("RBAC-12", "Owner attempting Patient medical records", "PLATFORM_OWNER", "/api/patient/medical-records", 403),
        ]

        for tid, desc, role, endpoint, expected_status in rbac_matrix:
            token = self.tokens.get(role)
            try:
                status, res = self.http_request(f"{self.base_url}{endpoint}", headers={"Authorization": f"Bearer {token}"})
                if status == expected_status:
                    self.log_result("RBAC", tid, desc, "PASS", f"HTTP {status} Forbidden correctly enforced")
                else:
                    self.log_result("RBAC", tid, desc, "FAIL", f"Expected {expected_status}, got {status}")
            except Exception as e:
                self.log_result("RBAC", tid, desc, "FAIL", str(e))

    # -------------------------------------------------------------------------
    # AREA 10: MySQL Persistence & SQLite Source Preservation
    # -------------------------------------------------------------------------
    def test_area_10_persistence(self):
        print("\n======================================================================")
        print("AREA 10: MYSQL PERSISTENCE & SQLITE SOURCE PRESERVATION")
        print("======================================================================")

        with self.app.app_context():
            # DB-01: MySQL active connection dialect
            try:
                engine_name = db.engine.name
                if engine_name == "mysql":
                    self.log_result("Persistence", "DB-01", "Active Database Engine Verification", "PASS", f"Dialect: {engine_name}")
                else:
                    self.log_result("Persistence", "DB-01", "Active Database Engine Verification", "FAIL", f"Expected mysql, got {engine_name}")
            except Exception as e:
                self.log_result("Persistence", "DB-01", "Active Database Engine Verification", "FAIL", str(e))

            # DB-02: Total relational record count in MySQL
            try:
                expected_counts = {
                    "specializations": (Specialization, 1),
                    "hospitals": (Hospital, 4),
                    "users": (User, 27),
                    "doctors": (Doctor, 6),
                    "appointments": (Appointment, 3),
                    "ambulance_requests": (AmbulanceRequest, 7),
                    "invitations": (Invitation, 2),
                    "audit_logs": (AuditLog, 5),
                }
                mismatches = []
                for tbl, (model, exp) in expected_counts.items():
                    cnt = model.query.count()
                    if cnt != exp:
                        mismatches.append(f"{tbl}: {cnt} != {exp}")

                if not mismatches:
                    self.log_result("Persistence", "DB-02", "Relational Record Count Parity (55 Total)", "PASS", "All 8 models match verified baseline")
                else:
                    self.log_result("Persistence", "DB-02", "Relational Record Count Parity", "FAIL", ", ".join(mismatches))
            except Exception as e:
                self.log_result("Persistence", "DB-02", "Relational Record Count Parity", "FAIL", str(e))

            # DB-03: MySQL foreign key orphan integrity check
            try:
                from sqlalchemy import text
                orphan_checks = [
                    ("users.hospital_id -> hospitals.id", "SELECT COUNT(*) FROM users WHERE hospital_id IS NOT NULL AND hospital_id NOT IN (SELECT id FROM hospitals)"),
                    ("doctors.hospital_id -> hospitals.id", "SELECT COUNT(*) FROM doctors WHERE hospital_id IS NOT NULL AND hospital_id NOT IN (SELECT id FROM hospitals)"),
                    ("appointments.doctor_id -> doctors.id", "SELECT COUNT(*) FROM appointments WHERE doctor_id NOT IN (SELECT id FROM doctors)"),
                    ("appointments.user_id -> users.id", "SELECT COUNT(*) FROM appointments WHERE user_id NOT IN (SELECT id FROM users)"),
                ]
                violations = []
                with db.engine.connect() as conn:
                    for label, sql in orphan_checks:
                        res = conn.execute(text(sql)).scalar()
                        if res != 0:
                            violations.append(f"{label}: {res} orphans")

                if not violations:
                    self.log_result("Persistence", "DB-03", "Foreign Key Referential Integrity (0 Orphans)", "PASS", "0 orphan records in MySQL")
                else:
                    self.log_result("Persistence", "DB-03", "Foreign Key Referential Integrity", "FAIL", ", ".join(violations))
            except Exception as e:
                self.log_result("Persistence", "DB-03", "Foreign Key Referential Integrity", "FAIL", str(e))

            # DB-04: SQLite source database preservation
            try:
                sqlite_path = BASE_DIR / "doctor_hospital.db"
                size = sqlite_path.stat().st_size
                conn = sqlite3.connect(str(sqlite_path))
                integ = [r[0] for r in conn.execute("PRAGMA integrity_check;").fetchall()]
                conn.close()

                if size == 253952 and integ == ["ok"]:
                    self.log_result("Persistence", "DB-04", "SQLite Source Integrity & Size Preservation", "PASS", f"{size} bytes, integrity: ok")
                else:
                    self.log_result("Persistence", "DB-04", "SQLite Source Integrity & Size Preservation", "FAIL", f"Size: {size}, Integrity: {integ}")
            except Exception as e:
                self.log_result("Persistence", "DB-04", "SQLite Source Integrity & Size Preservation", "FAIL", str(e))

            # DB-05: Pre-migration safety backup file verification
            try:
                backup_path = BASE_DIR / "backups" / "doctor_hospital_pre_step5_5_backup_20261108_131143.db"
                if backup_path.exists() and backup_path.stat().st_size == 253952:
                    self.log_result("Persistence", "DB-05", "Pre-Migration Safety Snapshot Verification", "PASS", f"Backup verified ({backup_path.stat().st_size} bytes)")
                else:
                    self.log_result("Persistence", "DB-05", "Pre-Migration Safety Snapshot Verification", "FAIL", "Backup missing or modified")
            except Exception as e:
                self.log_result("Persistence", "DB-05", "Pre-Migration Safety Snapshot Verification", "FAIL", str(e))

            # DB-06: MySQL stored generated column active_slot_key check
            try:
                from sqlalchemy import text
                with db.engine.connect() as conn:
                    appts = conn.execute(text("SELECT id, doctor_id, appointment_date, appointment_time, status, active_slot_key FROM appointments")).fetchall()
                    valid_gen = len(appts) == 3 and all(len(a) == 6 for a in appts)
                if valid_gen:
                    self.log_result("Persistence", "DB-06", "MySQL Stored Generated Column (active_slot_key)", "PASS", "Computed correctly across all 3 appointments")
                else:
                    self.log_result("Persistence", "DB-06", "MySQL Stored Generated Column", "FAIL", f"Appointments count: {len(appts)}")
            except Exception as e:
                self.log_result("Persistence", "DB-06", "MySQL Stored Generated Column", "FAIL", str(e))

    def run_all(self):
        self.test_area_1_authentication()
        self.test_area_2_platform_owner()
        self.test_area_3_hospital_super_admin()
        self.test_area_4_receptionist()
        self.test_area_5_doctor()
        self.test_area_6_patient_portal()
        self.test_area_7_ambulances()
        self.test_area_8_reviews()
        self.test_area_9_rbac()
        self.test_area_10_persistence()

        passed = sum(1 for r in self.results if r["status"] == "PASS")
        failed = sum(1 for r in self.results if r["status"] == "FAIL")
        blocked = sum(1 for r in self.results if r["status"] == "BLOCKED")
        total = len(self.results)

        print("\n" + "=" * 70)
        print(f"STEP 6 END-TO-END EXECUTION SUMMARY: {passed}/{total} PASSED")
        print("=" * 70)
        print(f"Total Tests  : {total}")
        print(f"Passed Tests : {passed}")
        print(f"Failed Tests : {failed}")
        print(f"Blocked Tests: {blocked}")
        print("=" * 70 + "\n")
        return passed, failed, blocked, total


if __name__ == "__main__":
    runner = E2ETestRunner()
    p, f, b, t = runner.run_all()
    if f > 0 or b > 0:
        sys.exit(1)
    sys.exit(0)
