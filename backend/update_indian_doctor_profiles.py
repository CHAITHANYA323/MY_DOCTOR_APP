"""
Safely updates existing fictional demo doctor records with realistic Indian physician names,
NMC/State council registration numbers, credentials, and professional portrait URLs.
Does not delete, drop, or recreate any records.
"""

import sys
from pathlib import Path

# Add backend to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from config import Config
from sqlalchemy import create_engine, text

INDIAN_DOCTOR_UPDATES = {
    1: {
        "name": "Dr. Ananya Sen",
        "gender": "Female",
        "qualification": "MBBS, MD (Medicine), DM (Neurology), FINR",
        "experience": 11,
        "registration_number": "DMC/R/05912",
        "council_name": "Delhi Medical Council",
        "designation": "Consultant Neurologist",
        "image": "https://images.unsplash.com/photo-1594824813576-a21235122709?w=600&auto=format&fit=crop&q=80",
        "languages": "English, Hindi, Bengali",
        "about": "Dr. Ananya Sen is an expert neurologist specializing in stroke intervention, epilepsy management, and neuromuscular care with over 11 years of clinical practice."
    },
    2: {
        "name": "Dr. Vikramaditya Rao",
        "gender": "Male",
        "qualification": "MBBS, MS (Orthopedics), MCh (Ortho - UK)",
        "experience": 16,
        "registration_number": "KMC-2008-01928",
        "council_name": "Karnataka Medical Council",
        "designation": "Chief Orthopedic Surgeon",
        "image": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&auto=format&fit=crop&q=80",
        "languages": "English, Kannada, Telugu, Hindi",
        "about": "Dr. Vikramaditya Rao has over 16 years of expertise in robotic joint replacement, computer-assisted arthroplasty, and complex trauma reconstruction."
    },
    3: {
        "name": "Dr. Suresh Reddy (On Leave)",
        "gender": "Male",
        "qualification": "MBBS, MD (General Medicine)",
        "experience": 5,
        "registration_number": "TSMC/2019/02841",
        "council_name": "Telangana State Medical Council",
        "designation": "Associate Consultant",
        "image": "https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=600&auto=format&fit=crop&q=80",
        "languages": "English, Telugu, Hindi",
        "about": "Dr. Suresh Reddy provides primary preventive healthcare, chronic lifestyle disease management, and internal medicine consultations."
    },
    4: {
        "name": "Dr. Rajesh Kumar",
        "gender": "Male",
        "qualification": "MBBS, MD (Medicine), DM (Cardiology)",
        "experience": 14,
        "registration_number": "NMC-2010-04829",
        "council_name": "National Medical Commission",
        "designation": "Senior Interventional Cardiologist",
        "image": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80",
        "languages": "English, Telugu, Hindi",
        "about": "Dr. Rajesh Kumar is a Senior Interventional Cardiologist with over 14 years of clinical excellence and more than 4,500 successful coronary interventions."
    },
    5: {
        "name": "Dr. Priya Nair",
        "gender": "Female",
        "qualification": "MBBS, MD (Dermatology, Venereology & Leprosy)",
        "experience": 9,
        "registration_number": "MMC-2015-08234",
        "council_name": "Maharashtra Medical Council",
        "designation": "Consultant Dermatologist",
        "image": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&auto=format&fit=crop&q=80",
        "languages": "English, Malayalam, Hindi",
        "about": "Dr. Priya Nair specializes in clinical dermatology, autoimmune skin disorders, pediatric dermatology, and advanced dermatological therapeutics."
    },
    6: {
        "name": "Dr. Arvind Swaminathan",
        "gender": "Male",
        "qualification": "MBBS, MD (Radiotherapy), DM (Medical Oncology)",
        "experience": 18,
        "registration_number": "TSMC/2006/01824",
        "council_name": "Telangana State Medical Council",
        "designation": "Senior Medical Oncologist",
        "image": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=600&auto=format&fit=crop&q=80",
        "languages": "English, Tamil, Hindi",
        "about": "Dr. Arvind Swaminathan has over 18 years of experience in medical oncology, immunotherapy, targeted cancer therapies, and multi-disciplinary tumor boards."
    }
}


def run_doctor_updates():
    engine = create_engine(Config.get_database_uri())
    print("\n[DOCTOR PROFILES] Enriching fictional demo doctor records with realistic Indian profiles...")

    with engine.begin() as conn:
        for doc_id, fields in INDIAN_DOCTOR_UPDATES.items():
            check = conn.execute(text("SELECT id, user_id FROM doctors WHERE id = :id"), {"id": doc_id}).fetchone()
            if not check:
                print(f"  [Notice] Doctor ID {doc_id} not found in database, skipping.")
                continue

            conn.execute(
                text("""
                    UPDATE doctors SET
                        name = :name,
                        gender = :gender,
                        qualification = :qualification,
                        experience = :experience,
                        registration_number = :registration_number,
                        council_name = :council_name,
                        designation = :designation,
                        image = :image,
                        languages = :languages,
                        about = :about
                    WHERE id = :id
                """),
                {"id": doc_id, **fields}
            )

            # If doctor has a linked user account, also keep User.name synchronized
            if check[1]:
                conn.execute(
                    text("UPDATE users SET name = :name WHERE id = :uid"),
                    {"name": fields["name"], "uid": check[1]}
                )

            print(f"  [OK] Updated Doctor ID {doc_id}: {fields['name']} ({fields['gender']}, {fields['qualification']}, Reg# {fields['registration_number']})")

    print("[SUCCESS] All demo doctor profiles updated cleanly.\n")


if __name__ == "__main__":
    run_doctor_updates()

