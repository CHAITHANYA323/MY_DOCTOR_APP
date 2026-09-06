from app import create_app
from models import db, Doctor

app = create_app()

unique_images = {
    "Dr. Meenakshi Sundaram": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&auto=format&fit=crop&q=80",
    "Dr. Farhan Akhtar": "https://images.unsplash.com/photo-1536064479547-7ee40b74b807?w=600&auto=format&fit=crop&q=80",
    "Dr. Shalini Verma": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
    "Dr. Suresh Varma": "https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=600&auto=format&fit=crop&q=80",
    "Dr. Deepa Chawla": "https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=600&auto=format&fit=crop&q=80",
    "Dr. K. Ramanathan": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80",
    "Dr. Nidhi Bansal": "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=600&auto=format&fit=crop&q=80"
}

with app.app_context():
    updated = 0
    for name, img_url in unique_images.items():
        doc = Doctor.query.filter_by(name=name).first()
        if doc:
            doc.image = img_url
            updated += 1
    db.session.commit()
    print(f"[OK] Updated {updated} doctors with distinct unique portraits.")

    # Verify all 14 doctor images are unique
    docs = Doctor.query.all()
    images = [d.image for d in docs]
    print(f"[INFO] Total Doctors: {len(docs)}, Unique Images: {len(set(images))}")
    if len(docs) == len(set(images)):
        print("[SUCCESS] All doctors have distinct, unique images!")
    else:
        print("[WARNING] Some images are still duplicated.")
