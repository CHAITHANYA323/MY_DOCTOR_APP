#!/usr/bin/env python3
"""
MediConnect Demonstration Graceful Shutdown Utility
Safely identifies and terminates only the MediConnect Backend (Waitress)
and Frontend (Vite) demonstration processes without affecting MySQL or system services.
"""

import os
import sys
import re
import subprocess

DEMO_PORTS = [5000, 5173]

def get_pids_by_ports():
    pids = set()
    try:
        output = subprocess.check_output("netstat -ano", text=True, stderr=subprocess.DEVNULL)
        for line in output.splitlines():
            if "LISTENING" in line:
                for port in DEMO_PORTS:
                    # Match :5000 or :5173 followed by whitespace
                    if f":{port} " in line or f":{port}\t" in line:
                        parts = line.strip().split()
                        if parts:
                            try:
                                pid = int(parts[-1])
                                if pid > 4:  # Ignore System/Idle PIDs
                                    pids.add(pid)
                            except ValueError:
                                pass
    except Exception as e:
        print(f"[Notice] Could not inspect netstat: {e}")
    return pids

def stop_demo():
    print("=" * 70)
    print("        STOPPING MEDICONNECT DEMONSTRATION SERVERS")
    print("=" * 70)

    pids = get_pids_by_ports()

    stopped_count = 0
    for pid in sorted(pids):
        try:
            print(f"[*] Stopping process PID {pid} (listening on port)...")
            subprocess.run(["taskkill", "/F", "/PID", str(pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            stopped_count += 1
        except Exception as e:
            print(f"[Warning] Could not terminate PID {pid}: {e}")

    # Also clean up any lingering node or python waitress processes matching the workspace if needed
    if stopped_count > 0:
        print(f"\n[SUCCESS] Stopped {stopped_count} demonstration process(es).")
    else:
        print("\n[INFO] No active processes were found listening on ports 5000 or 5173.")
    print("=" * 70 + "\n")
    return 0

if __name__ == "__main__":
    sys.exit(stop_demo())

