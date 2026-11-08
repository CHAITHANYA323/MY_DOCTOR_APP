#!/usr/bin/env python3
"""
MediConnect Demonstration Pre-Flight Verification Script
Checks all system dependencies, ports, and MySQL database connectivity
before launching the demonstration environment.
"""

import sys
import os
import socket
import subprocess
from pathlib import Path

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
sys.path.insert(0, str(BASE_DIR))

def print_status(component: str, status: str, message: str = ""):
    prefix = {
        "PASS": "[OK]",
        "WARN": "[WARN]",
        "FAIL": "[FAIL]",
        "INFO": "[INFO]"
    }.get(status, "[*]")
    details = f" - {message}" if message else ""
    print(f" {prefix} {component:<25} {details}")

def check_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        try:
            s.connect((host, port))
            return True
        except (socket.timeout, ConnectionRefusedError, OSError):
            return False

def run_preflight() -> int:
    print("=" * 70)
    print("      MEDICONNECT DEMO PRE-FLIGHT VERIFICATION")
    print("=" * 70)

    has_fatal = False

    # 1. Python Environment Check
    py_ver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    if sys.version_info >= (3, 9):
        print_status("Python Runtime", "PASS", f"Version {py_ver}")
    else:
        print_status("Python Runtime", "FAIL", f"Version {py_ver} (Python 3.9+ required)")
        has_fatal = True

    # 2. Python Dependencies Check
    required_pkgs = [
        ("flask", "Flask"),
        ("waitress", "Waitress"),
        ("pymysql", "PyMySQL"),
        ("sqlalchemy", "SQLAlchemy"),
        ("jwt", "PyJWT"),
        ("dotenv", "python-dotenv"),
        ("flask_cors", "Flask-Cors"),
        ("flask_sqlalchemy", "Flask-SQLAlchemy")
    ]
    missing_pkgs = []
    for mod_name, pkg_name in required_pkgs:
        try:
            __import__(mod_name)
        except ImportError:
            missing_pkgs.append(pkg_name)

    if not missing_pkgs:
        print_status("Python Dependencies", "PASS", "All core packages installed")
    else:
        print_status("Python Dependencies", "FAIL", f"Missing: {', '.join(missing_pkgs)}")
        print("        --> Fix: run 'pip install -r backend/requirements.txt'")
        has_fatal = True

    # 3. Backend Configuration Check
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        print_status("Backend .env", "PASS", "Found configuration file")
    else:
        print_status("Backend .env", "FAIL", "Missing backend/.env file")
        print("        --> Fix: copy 'backend/.env.example' to 'backend/.env' and configure MySQL")
        has_fatal = True

    # 4. MySQL Service & Database Reachability Check
    try:
        from config import Config
        from sqlalchemy import create_engine, text

        db_uri = Config.get_database_uri()
        engine = create_engine(db_uri, pool_pre_ping=True)
        with engine.connect() as conn:
            ver = conn.execute(text("SELECT VERSION()")).scalar()
            db_name = conn.execute(text("SELECT DATABASE()")).scalar()
            user_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
            print_status("MySQL Database", "PASS", f"Connected to '{db_name}' on MySQL {ver} ({user_count} users active)")
    except Exception as e:
        print_status("MySQL Database", "FAIL", "Cannot connect to MySQL server")
        print(f"        --> Error details: {str(e)[:120]}...")
        print("        --> Troubleshooting steps:")
        print("            1. Verify MySQL Service is running (run 'net start MySQL80' or open Services.msc).")
        print("            2. Confirm 'backend/.env' has correct MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DB.")
        print("            3. Verify database 'mediconnect' exists and has permissions granted.")
        has_fatal = True

    # 5. Node.js & npm Check
    try:
        import shutil
        node_cmd = shutil.which("node") or "node"
        npm_cmd = shutil.which("npm") or shutil.which("npm.cmd") or "npm"
        node_res = subprocess.run([node_cmd, "-v"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True, shell=(os.name == 'nt'))
        npm_res = subprocess.run([npm_cmd, "-v"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True, shell=(os.name == 'nt'))
        print_status("Node.js & npm", "PASS", f"Node {node_res.stdout.strip()} | npm {npm_res.stdout.strip()}")
    except Exception as e:
        print_status("Node.js & npm", "FAIL", f"Node.js or npm issue: {e}")
        print("        --> Fix: Install Node.js v18+ from https://nodejs.org/")
        has_fatal = True

    # 6. Frontend Node Modules Check
    fe_modules = ROOT_DIR / "frontend" / "node_modules"
    if fe_modules.exists():
        print_status("Frontend Modules", "PASS", "node_modules directory present")
    else:
        print_status("Frontend Modules", "FAIL", "frontend/node_modules missing")
        print("        --> Fix: run 'npm --prefix frontend install'")
        has_fatal = True

    # 7. Port Occupancy Warnings
    if check_port_in_use(5000):
        print_status("Port 5000 (Backend)", "WARN", "Port 5000 is already in use by another process")
        print("        --> If an older server instance is running, close it or run 'stop_demo.bat'")
    else:
        print_status("Port 5000 (Backend)", "PASS", "Port available")

    if check_port_in_use(5173):
        print_status("Port 5173 (Frontend)", "WARN", "Port 5173 is already in use by another process")
        print("        --> If an older frontend instance is running, close it or run 'stop_demo.bat'")
    else:
        print_status("Port 5173 (Frontend)", "PASS", "Port available")

    print("=" * 70)
    if has_fatal:
        print("[FATAL] Pre-flight checks failed. Please resolve the blockers above before launching.\n")
        return 1
    else:
        print("[SUCCESS] All pre-flight checks passed! System is ready to launch.\n")
        return 0

if __name__ == "__main__":
    sys.exit(run_preflight())
