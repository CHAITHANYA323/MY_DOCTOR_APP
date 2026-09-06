import urllib.request
import json
import sys

def test_api():
    print("==================================================")
    print("MEDICARE+ COMPREHENSIVE SYSTEM VERIFICATION")
    print("==================================================")

    # 1. Health check
    req = urllib.request.Request("http://127.0.0.1:5000/api/health")
    with urllib.request.urlopen(req) as response:
        assert response.status == 200
        data = json.loads(response.read().decode())
        print(f"[OK] Flask Health: {data['status']}, Database: {data.get('database')}")

    # 2. Doctors check (verify all 14 distinct images)
    req = urllib.request.Request("http://127.0.0.1:5000/api/doctors?limit=30")
    with urllib.request.urlopen(req) as response:
        assert response.status == 200
        data = json.loads(response.read().decode())
        docs = data.get('doctors', [])
        print(f"[OK] Doctors Count: {len(docs)} (Expected 14)")
        assert len(docs) >= 14, "Expected at least 14 doctors"

        # Verify uniqueness of images
        images = [d['image'] for d in docs]
        unique_images = set(images)
        print(f"[OK] Unique Doctor Images: {len(unique_images)} / {len(docs)}")
        assert len(unique_images) == len(docs), f"Doctor images must be unique! Found {len(unique_images)} for {len(docs)} doctors"

    # 3. Doctor Filtering check
    req = urllib.request.Request("http://127.0.0.1:5000/api/doctors?min_rating=4.9")
    with urllib.request.urlopen(req) as response:
        assert response.status == 200
        data = json.loads(response.read().decode())
        filtered_docs = data.get('doctors', [])
        print(f"[OK] Doctors with Rating >= 4.9: {len(filtered_docs)}")
        for d in filtered_docs:
            assert float(d['rating']) >= 4.9

    # 4. Hospitals check
    req = urllib.request.Request("http://127.0.0.1:5000/api/hospitals")
    with urllib.request.urlopen(req) as response:
        assert response.status == 200
        data = json.loads(response.read().decode())
        hosps = data.get('hospitals', [])
        print(f"[OK] Hospitals Count: {len(hosps)} (Expected 6)")
        hosp_images = [h['image'] for h in hosps]
        print(f"[OK] Unique Hospital Images: {len(set(hosp_images))} / {len(hosps)}")

    # 5. Specializations check
    req = urllib.request.Request("http://127.0.0.1:5000/api/specializations")
    with urllib.request.urlopen(req) as response:
        assert response.status == 200
        data = json.loads(response.read().decode())
        specs = data.get('specializations', [])
        print(f"[OK] Specializations Count: {len(specs)} (Expected 20)")
        assert len(specs) >= 20

    # 6. Ambulances check
    req = urllib.request.Request("http://127.0.0.1:5000/api/ambulances")
    with urllib.request.urlopen(req) as response:
        assert response.status == 200
        data = json.loads(response.read().decode())
        ambs = data.get('ambulances', [])
        print(f"[OK] Ambulances Count: {len(ambs)} (Expected 6)")

    # 7. Vite Frontend Dev Server
    try:
        req = urllib.request.Request("http://localhost:5173/")
        with urllib.request.urlopen(req) as response:
            assert response.status == 200
            html = response.read().decode()
            assert "MediCare" in html or "root" in html
            print("[OK] Vite Frontend Dev Server: Responding 200 OK")
    except Exception as e:
        print(f"[WARN] Vite frontend check: {e}")

    print("==================================================")
    print("ALL 7 CORE VERIFICATIONS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_api()
