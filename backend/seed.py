import re
from datetime import datetime, date, timedelta, timezone
from models import db, User, Specialization, Hospital, Doctor, Ambulance, AmbulanceRequest, Appointment, Review, Favorite

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text)

def run_seed():
    print("[Seeder] Starting seed process...")

    # 1. Seed Users
    if User.query.count() == 0:
        admin = User(
            name="Super Administrator",
            email="admin@medicare.com",
            phone="+91 98765 43210",
            role="ADMIN",
            avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
        )
        admin.set_password("Admin@123")
        db.session.add(admin)

        patient1 = User(
            name="Rahul Sharma",
            email="patient@medicare.com",
            phone="+91 91234 56789",
            role="USER",
            avatar="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80"
        )
        patient1.set_password("Patient@123")
        db.session.add(patient1)

        patient2 = User(
            name="Sarah Jenkins",
            email="sarah@medicare.com",
            phone="+91 99887 76655",
            role="USER",
            avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80"
        )
        patient2.set_password("Sarah@123")
        db.session.add(patient2)

        db.session.commit()
        print("[Seeder] Created Admin and Patient demo users.")

    # 2. Seed Specializations (20 requested)
    specializations_data = [
        ("Cardiologist", "FaHeartbeat", "Specialists in diagnosing and treating heart, blood vessel, and cardiovascular disorders.", "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=500&auto=format&fit=crop&q=80"),
        ("Neurologist", "FaBrain", "Expert care for brain, spinal cord, nerves, and neurological conditions.", "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=500&auto=format&fit=crop&q=80"),
        ("Orthopedic", "FaBone", "Comprehensive bone, joint, ligament, and musculoskeletal surgical care.", "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500&auto=format&fit=crop&q=80"),
        ("Dermatologist", "FaSpa", "Specialized skin, hair, nail treatments, and advanced cosmetic dermatology.", "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&auto=format&fit=crop&q=80"),
        ("Pediatrician", "FaBaby", "Compassionate pediatric healthcare, child immunization, and newborn care.", "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500&auto=format&fit=crop&q=80"),
        ("Gynecologist", "FaFemale", "Women's reproductive health, obstetric care, maternity, and prenatal guidance.", "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500&auto=format&fit=crop&q=80"),
        ("ENT Specialist", "FaHeadSideCough", "Ear, nose, throat, sinuses, and head & neck medical/surgical treatments.", "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=500&auto=format&fit=crop&q=80"),
        ("Dentist", "FaTooth", "Preventative dental health, root canals, oral surgery, and smile aesthetics.", "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=500&auto=format&fit=crop&q=80"),
        ("Ophthalmologist", "FaEye", "Eye examinations, cataract surgery, glaucoma therapy, and vision care.", "https://images.unsplash.com/photo-1584515933487-779824d29309?w=500&auto=format&fit=crop&q=80"),
        ("Psychiatrist", "FaSmileBeam", "Mental wellness, therapy, behavioral health, and psychiatric counseling.", "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=500&auto=format&fit=crop&q=80"),
        ("General Physician", "FaUserMd", "Primary preventive healthcare, general medical diagnosis, and routine wellness.", "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80"),
        ("Gastroenterologist", "FaProcedures", "Digestive system disorders, liver care, endoscopy, and stomach treatments.", "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=500&auto=format&fit=crop&q=80"),
        ("Urologist", "FaSyringe", "Urinary tract, kidney stone therapy, and male reproductive health.", "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500&auto=format&fit=crop&q=80"),
        ("Oncologist", "FaRibbon", "Comprehensive cancer diagnosis, chemotherapy, surgical oncology, and care.", "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500&auto=format&fit=crop&q=80"),
        ("Pulmonologist", "FaLungs", "Respiratory care, asthma, COPD, lung infection management, and critical care.", "https://images.unsplash.com/photo-1584515933487-779824d29309?w=500&auto=format&fit=crop&q=80"),
        ("Nephrologist", "FaFilter", "Kidney diseases, dialysis supervision, hypertension, and renal transplantation.", "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=500&auto=format&fit=crop&q=80"),
        ("Endocrinologist", "FaCapsules", "Hormonal imbalances, diabetes management, thyroid disorders, and metabolism.", "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80"),
        ("Radiologist", "FaXRay", "Diagnostic medical imaging, MRI, CT scans, ultrasound, and X-ray interpretation.", "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500&auto=format&fit=crop&q=80"),
        ("General Surgeon", "FaCut", "Abdominal surgery, minimally invasive laparoscopy, trauma, and hernia repair.", "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=500&auto=format&fit=crop&q=80"),
        ("Physiotherapist", "FaRunning", "Physical rehabilitation, mobility restoration, sports injury, and post-surgery therapy.", "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&auto=format&fit=crop&q=80")
    ]

    for name, icon, desc, img in specializations_data:
        slug = slugify(name)
        if not Specialization.query.filter_by(slug=slug).first():
            db.session.add(Specialization(
                name=name,
                slug=slug,
                description=desc,
                icon=icon,
                image=img
            ))
    db.session.commit()
    print("[Seeder] Seeded 20 Specializations.")

    # 3. Seed Hospitals
    hospitals_data = [
        {
            "name": "Apollo Hospitals",
            "slug": "apollo-hospitals-visakhapatnam",
            "image": "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80",
            "address": "Health City, Arilova, Chinagadila",
            "city": "Visakhapatnam",
            "state": "Andhra Pradesh",
            "phone": "+91 891 272 7272",
            "email": "info_vizag@apollohospitals.com",
            "emergency_number": "+91 891 1066",
            "facilities": "24/7 Emergency, Cardiac Catheterization Lab, Modern ICU, Advanced Radiology, Dialysis Unit, Helipad Ambulance",
            "working_hours": "24 Hours / 7 Days",
            "rating": 4.9,
            "total_reviews": 340
        },
        {
            "name": "Fortis Escorts Hospital",
            "slug": "fortis-hospital-delhi",
            "image": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80",
            "address": "Okhla Road, Sukhdev Vihar Metro Station",
            "city": "New Delhi",
            "state": "Delhi NCR",
            "phone": "+91 11 4713 5000",
            "email": "contactus.delhi@fortishealthcare.com",
            "emergency_number": "+91 11 105010",
            "facilities": "Advanced Heart Institute, 24x7 Stroke Unit, Robotic Surgery, Level-1 Trauma Care, Blood Bank, Pharmacy",
            "working_hours": "24 Hours / 7 Days",
            "rating": 4.8,
            "total_reviews": 412
        },
        {
            "name": "Manipal Super Speciality Hospital",
            "slug": "manipal-hospital-bengaluru",
            "image": "https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?w=800&auto=format&fit=crop&q=80",
            "address": "98, HAL Old Airport Road, Kodihalli",
            "city": "Bengaluru",
            "state": "Karnataka",
            "phone": "+91 80 2502 4444",
            "email": "info@manipalhospitals.com",
            "emergency_number": "+91 80 2526 6666",
            "facilities": "Comprehensive Cancer Center, Organ Transplant Wing, Pediatric ICU, 24/7 Trauma, Advanced Neuro-Navigation",
            "working_hours": "24 Hours / 7 Days",
            "rating": 4.9,
            "total_reviews": 520
        },
        {
            "name": "Max Super Speciality Hospital",
            "slug": "max-hospital-mumbai",
            "image": "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80",
            "address": "1, 2, Press Enclave Marg, Saket District Centre",
            "city": "Mumbai",
            "state": "Maharashtra",
            "phone": "+91 22 2655 5555",
            "email": "mumbai@maxhealthcare.com",
            "emergency_number": "+91 22 4055 4055",
            "facilities": "Critical Care Unit, Comprehensive Maternity, Linear Accelerator, Neonatal ICU, Digital Pathology",
            "working_hours": "24 Hours / 7 Days",
            "rating": 4.7,
            "total_reviews": 290
        },
        {
            "name": "AIIMS Multi-Speciality Medical Center",
            "slug": "aiims-hospital-delhi",
            "image": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&auto=format&fit=crop&q=80",
            "address": "Sri Aurobindo Marg, Ansari Nagar",
            "city": "New Delhi",
            "state": "Delhi",
            "phone": "+91 11 2658 8500",
            "email": "care@aiims.edu",
            "emergency_number": "+91 11 2659 3444",
            "facilities": "National Referral Center, Super-Speciality Surgeries, High Dependency Units, Research Diagnostics, 24/7 Ambulance",
            "working_hours": "24 Hours / 7 Days",
            "rating": 4.9,
            "total_reviews": 890
        },
        {
            "name": "Care Hospitals",
            "slug": "care-hospitals-hyderabad",
            "image": "https://images.unsplash.com/photo-1629909615184-74f495363b67?w=800&auto=format&fit=crop&q=80",
            "address": "Road No. 1, Banjara Hills",
            "city": "Hyderabad",
            "state": "Telangana",
            "phone": "+91 40 6165 6565",
            "email": "care.banjara@carehospitals.com",
            "emergency_number": "+91 40 105711",
            "facilities": "Cardio-Thoracic Surgery, Minimally Invasive Surgery, Emergency Cath Lab, Bone Marrow Transplant, 24/7 Pharmacy",
            "working_hours": "24 Hours / 7 Days",
            "rating": 4.8,
            "total_reviews": 310
        }
    ]

    for h_data in hospitals_data:
        if not Hospital.query.filter_by(slug=h_data['slug']).first():
            db.session.add(Hospital(**h_data))
    db.session.commit()
    print("[Seeder] Seeded 6 Major Hospitals.")

    # Fetch references
    apollo = Hospital.query.filter_by(slug="apollo-hospitals-visakhapatnam").first()
    fortis = Hospital.query.filter_by(slug="fortis-hospital-delhi").first()
    manipal = Hospital.query.filter_by(slug="manipal-hospital-bengaluru").first()
    max_hosp = Hospital.query.filter_by(slug="max-hospital-mumbai").first()
    aiims = Hospital.query.filter_by(slug="aiims-hospital-delhi").first()
    care = Hospital.query.filter_by(slug="care-hospitals-hyderabad").first()

    cardio = Specialization.query.filter_by(slug="cardiologist").first()
    neuro = Specialization.query.filter_by(slug="neurologist").first()
    ortho = Specialization.query.filter_by(slug="orthopedic").first()
    derm = Specialization.query.filter_by(slug="dermatologist").first()
    pedia = Specialization.query.filter_by(slug="pediatrician").first()
    gynae = Specialization.query.filter_by(slug="gynecologist").first()
    ent = Specialization.query.filter_by(slug="ent-specialist").first()
    dent = Specialization.query.filter_by(slug="dentist").first()
    eye = Specialization.query.filter_by(slug="ophthalmologist").first()
    psych = Specialization.query.filter_by(slug="psychiatrist").first()
    gen_phys = Specialization.query.filter_by(slug="general-physician").first()
    gastro = Specialization.query.filter_by(slug="gastroenterologist").first()
    onco = Specialization.query.filter_by(slug="oncologist").first()
    pulmo = Specialization.query.filter_by(slug="pulmonologist").first()

    # 4. Seed Doctors
    if Doctor.query.count() == 0:
        doctors_data = [
            {
                "name": "Dr. Rajesh Kumar",
                "gender": "Male",
                "image": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80",
                "qualification": "MBBS, MD (Internal Medicine), DM (Cardiology)",
                "experience": 14,
                "specialization_id": cardio.id if cardio else 1,
                "hospital_id": apollo.id if apollo else 1,
                "location": "Visakhapatnam",
                "phone": "+91 891 2233 441",
                "email": "dr.rajesh.kumar@apollohospitals.com",
                "consultation_fee": 800.0,
                "available_days": "Monday - Saturday",
                "available_time": "09:00 AM - 01:00 PM, 05:00 PM - 08:00 PM",
                "languages": "English, Telugu, Hindi",
                "about": "Dr. Rajesh Kumar is a Senior Interventional Cardiologist with over 14 years of clinical excellence. He has performed more than 4,500 coronary angiographies and angioplasties with special focus on primary angioplasty in acute myocardial infarction and pacemaker implantation.",
                "consultation_type": "In-Person & Video",
                "status": "Active",
                "rating": 4.9,
                "total_reviews": 128
            },
            {
                "name": "Dr. Ananya Sen",
                "gender": "Female",
                "image": "https://images.unsplash.com/photo-1594824813576-a21235122709?w=600&auto=format&fit=crop&q=80",
                "qualification": "MBBS, MD (Medicine), DM (Neurology), FINR",
                "experience": 11,
                "specialization_id": neuro.id if neuro else 2,
                "hospital_id": fortis.id if fortis else 2,
                "location": "New Delhi",
                "phone": "+91 11 4455 6677",
                "email": "dr.ananya.sen@fortishealthcare.com",
                "consultation_fee": 900.0,
                "available_days": "Monday - Friday",
                "available_time": "10:00 AM - 04:00 PM",
                "languages": "English, Hindi, Bengali",
                "about": "Dr. Ananya Sen is a leading Neurologist specializing in comprehensive stroke management, epilepsy management, neuromuscular disorders, Parkinson's disease, and neuro-critical care.",
                "consultation_type": "In-Person & Video",
                "status": "Active",
                "rating": 4.8,
                "total_reviews": 95
            },
            {
                "name": "Dr. Vikramaditya Rao",
                "gender": "Male",
                "image": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&auto=format&fit=crop&q=80",
                "qualification": "MBBS, MS (Orthopedics), MCh (Ortho - UK)",
                "experience": 16,
                "specialization_id": ortho.id if ortho else 3,
                "hospital_id": manipal.id if manipal else 3,
                "location": "Bengaluru",
                "phone": "+91 80 4321 8899",
                "email": "dr.vikram.rao@manipalhospitals.com",
                "consultation_fee": 850.0,
                "available_days": "Monday - Saturday",
                "available_time": "09:30 AM - 02:00 PM",
                "languages": "English, Kannada, Telugu, Hindi",
                "about": "Dr. Vikramaditya Rao has over 16 years of expertise in robotic joint replacements, computer-assisted knee & hip arthroplasty, complex trauma management, and sports medicine arthroscopy.",
                "consultation_type": "In-Person & Video",
                "status": "Active",
                "rating": 4.9,
                "total_reviews": 164
            },
            {
                "name": "Dr. Priya Nair",
                "gender": "Female",
                "image": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&auto=format&fit=crop&q=80",
                "qualification": "MBBS, MD (Dermatology, Venereology & Leprosy)",
                "experience": 9,
                "specialization_id": derm.id if derm else 4,
                "hospital_id": max_hosp.id if max_hosp else 4,
                "location": "Mumbai",
                "phone": "+91 22 3344 5566",
                "email": "dr.priya.nair@maxhealthcare.com",
                "consultation_fee": 700.0,
                "available_days": "Tuesday - Sunday",
                "available_time": "11:00 AM - 06:00 PM",
                "languages": "English, Hindi, Malayalam, Marathi",
                "about": "Dr. Priya Nair is a celebrated consultant dermatologist with advanced training in laser therapy, clinical dermatology, hair loss therapies, and scar revision procedures.",
                "consultation_type": "In-Person & Video",
                "status": "Active",
                "rating": 4.8,
                "total_reviews": 84
            },
            {
                "name": "Dr. Amitav Ghosh",
                "gender": "Male",
                "image": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=600&auto=format&fit=crop&q=80",
                "qualification": "MBBS, MD (Pediatrics), DNB (Pediatrics)",
                "experience": 12,
                "specialization_id": pedia.id if pedia else 5,
                "hospital_id": aiims.id if aiims else 5,
                "location": "New Delhi",
                "phone": "+91 11 8899 7766",
                "email": "dr.amitav.ghosh@aiims.edu",
                "consultation_fee": 600.0,
                "available_days": "Monday - Friday",
                "available_time": "08:30 AM - 01:30 PM",
                "languages": "English, Hindi, Bengali",
                "about": "Dr. Amitav Ghosh is a dedicated pediatrician focused on newborn care, neonatal resuscitation, developmental milestones, childhood asthma, and preventive pediatric vaccinations.",
                "consultation_type": "In-Person",
                "status": "Active",
                "rating": 4.9,
                "total_reviews": 110
            },
            {
                "name": "Dr. Sunita Mehra",
                "gender": "Female",
                "image": "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=600&auto=format&fit=crop&q=80",
                "qualification": "MBBS, MS (Obstetrics & Gynecology), FMAS",
                "experience": 15,
                "specialization_id": gynae.id if gynae else 6,
                "hospital_id": care.id if care else 6,
                "location": "Hyderabad",
                "phone": "+91 40 5566 7788",
                "email": "dr.sunita.mehra@carehospitals.com",
                "consultation_fee": 750.0,
                "available_days": "Monday - Saturday",
                "available_time": "09:00 AM - 03:00 PM",
                "languages": "English, Telugu, Hindi, Urdu",
                "about": "Dr. Sunita Mehra is an expert gynecologist, high-risk pregnancy specialist, and laparoscopic surgeon with over 15 years handling painless deliveries and reproductive wellness.",
                "consultation_type": "In-Person & Video",
                "status": "Active",
                "rating": 4.9,
                "total_reviews": 142
            },
            {
                "name": "Dr. Arvind Swamy",
                "gender": "Male",
                "image": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600&auto=format&fit=crop&q=80",
                "qualification": "MBBS, MS (ENT), DLO",
                "experience": 10,
                "specialization_id": ent.id if ent else 7,
                "hospital_id": apollo.id if apollo else 1,
                "location": "Visakhapatnam",
                "phone": "+91 891 4455 112",
                "email": "dr.arvind.swamy@apollohospitals.com",
                "consultation_fee": 650.0,
                "available_days": "Monday - Saturday",
                "available_time": "10:00 AM - 02:00 PM, 04:00 PM - 07:00 PM",
                "languages": "English, Telugu, Hindi",
                "about": "Dr. Arvind Swamy specializes in microscopic ear surgeries, endoscopic sinus surgeries (FESS), snoring and sleep apnea treatments, and pediatric ENT care.",
                "consultation_type": "In-Person",
                "status": "Active",
                "rating": 4.7,
                "total_reviews": 72
            },
            {
                "name": "Dr. Meenakshi Sundaram",
                "gender": "Female",
                "image": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&auto=format&fit=crop&q=80",
                "qualification": "BDS, MDS (Conservative Dentistry & Endodontics)",
                "experience": 8,
                "specialization_id": dent.id if dent else 8,
                "hospital_id": manipal.id if manipal else 3,
                "location": "Bengaluru",
                "phone": "+91 80 6677 8811",
                "email": "dr.meenakshi@manipalhospitals.com",
                "consultation_fee": 500.0,
                "available_days": "Monday - Friday",
                "available_time": "09:00 AM - 05:00 PM",
                "languages": "English, Kannada, Tamil, Hindi",
                "about": "Dr. Meenakshi Sundaram is an experienced dental surgeon specializing in pain-free single-sitting root canals, cosmetic smile designing, dental crowns, and teeth whitening.",
                "consultation_type": "In-Person",
                "status": "Active",
                "rating": 4.8,
                "total_reviews": 65
            },
            {
                "name": "Dr. Farhan Akhtar",
                "gender": "Male",
                "image": "https://images.unsplash.com/photo-1536064479547-7ee40b74b807?w=600&auto=format&fit=crop&q=80",
                "qualification": "MBBS, MS (Ophthalmology), FICO (UK)",
                "experience": 13,
                "specialization_id": eye.id if eye else 9,
                "hospital_id": fortis.id if fortis else 2,
                "location": "New Delhi",
                "phone": "+91 11 9900 1122",
                "email": "dr.farhan@fortishealthcare.com",
                "consultation_fee": 750.0,
                "available_days": "Tuesday - Saturday",
                "available_time": "10:00 AM - 04:00 PM",
                "languages": "English, Hindi, Urdu",
                "about": "Dr. Farhan Akhtar is a renowned eye specialist with over 13 years of expertise in robotic blade-free LASIK, micro-incision cataract surgery (MICS), and diabetic retinopathy.",
                "consultation_type": "In-Person",
                "status": "Active",
                "rating": 4.9,
                "total_reviews": 98
            },
            {
                "name": "Dr. Shalini Verma",
                "gender": "Female",
                "image": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
                "qualification": "MBBS, MD (Psychiatry)",
                "experience": 10,
                "specialization_id": psych.id if psych else 10,
                "hospital_id": max_hosp.id if max_hosp else 4,
                "location": "Mumbai",
                "phone": "+91 22 8899 4433",
                "email": "dr.shalini.verma@maxhealthcare.com",
                "consultation_fee": 900.0,
                "available_days": "Monday - Friday",
                "available_time": "11:00 AM - 05:00 PM",
                "languages": "English, Hindi, Marathi",
                "about": "Dr. Shalini Verma is a compassionate psychiatrist dealing with stress management, anxiety disorders, depression therapy, insomnia, and cognitive behavioral psychotherapy.",
                "consultation_type": "In-Person & Video",
                "status": "Active",
                "rating": 4.8,
                "total_reviews": 76
            },
            {
                "name": "Dr. Suresh Varma",
                "gender": "Male",
                "image": "https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=600&auto=format&fit=crop&q=80",
                "qualification": "MBBS, MD (General Medicine)",
                "experience": 18,
                "specialization_id": gen_phys.id if gen_phys else 11,
                "hospital_id": apollo.id if apollo else 1,
                "location": "Visakhapatnam",
                "phone": "+91 891 9988 771",
                "email": "dr.suresh.varma@apollohospitals.com",
                "consultation_fee": 500.0,
                "available_days": "Monday - Saturday",
                "available_time": "08:00 AM - 12:00 PM, 04:00 PM - 08:00 PM",
                "languages": "English, Telugu, Hindi",
                "about": "Dr. Suresh Varma brings 18 years of comprehensive clinical diagnosis in diabetes management, hypertension, seasonal infectious fevers, thyroid disease, and elder care.",
                "consultation_type": "In-Person & Video",
                "status": "Active",
                "rating": 4.9,
                "total_reviews": 210
            },
            {
                "name": "Dr. Deepa Chawla",
                "gender": "Female",
                "image": "https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=600&auto=format&fit=crop&q=80",
                "qualification": "MBBS, MD (Medicine), DM (Medical Gastroenterology)",
                "experience": 12,
                "specialization_id": gastro.id if gastro else 12,
                "hospital_id": care.id if care else 6,
                "location": "Hyderabad",
                "phone": "+91 40 4433 2211",
                "email": "dr.deepa.chawla@carehospitals.com",
                "consultation_fee": 850.0,
                "available_days": "Monday - Friday",
                "available_time": "09:30 AM - 03:30 PM",
                "languages": "English, Telugu, Hindi",
                "about": "Dr. Deepa Chawla is a senior gastroenterologist specializing in therapeutic endoscopy, fatty liver disease, irritable bowel syndrome (IBS), acidity, and pancreas disorders.",
                "consultation_type": "In-Person & Video",
                "status": "Active",
                "rating": 4.8,
                "total_reviews": 88
            },
            {
                "name": "Dr. K. Ramanathan",
                "gender": "Male",
                "image": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80",
                "qualification": "MBBS, MD (Medicine), DM (Medical Oncology), ECMO",
                "experience": 20,
                "specialization_id": onco.id if onco else 14,
                "hospital_id": aiims.id if aiims else 5,
                "location": "New Delhi",
                "phone": "+91 11 3322 1100",
                "email": "dr.k.ramanathan@aiims.edu",
                "consultation_fee": 1200.0,
                "available_days": "Monday, Wednesday, Friday",
                "available_time": "09:00 AM - 02:00 PM",
                "languages": "English, Tamil, Hindi",
                "about": "Dr. K. Ramanathan has two decades of distinguished medical oncology leadership in targeted immunotherapy, precision cancer therapeutics, breast and lung oncology.",
                "consultation_type": "In-Person & Video",
                "status": "Active",
                "rating": 4.9,
                "total_reviews": 175
            },
            {
                "name": "Dr. Nidhi Bansal",
                "gender": "Female",
                "image": "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=600&auto=format&fit=crop&q=80",
                "qualification": "MBBS, MD (Pulmonary Medicine), FACP",
                "experience": 11,
                "specialization_id": pulmo.id if pulmo else 15,
                "hospital_id": fortis.id if fortis else 2,
                "location": "New Delhi",
                "phone": "+91 11 5544 3322",
                "email": "dr.nidhi.bansal@fortishealthcare.com",
                "consultation_fee": 800.0,
                "available_days": "Tuesday - Saturday",
                "available_time": "10:00 AM - 04:00 PM",
                "languages": "English, Hindi, Punjabi",
                "about": "Dr. Nidhi Bansal is an acclaimed pulmonologist specializing in chronic obstructive pulmonary disease (COPD), bronchial asthma, sleep apnea, post-viral respiratory fibrosis, and allergy care.",
                "consultation_type": "In-Person & Video",
                "status": "Active",
                "rating": 4.8,
                "total_reviews": 92
            }
        ]

        for doc_item in doctors_data:
            db.session.add(Doctor(**doc_item))
        db.session.commit()
        print("[Seeder] Seeded 14 Doctors across multiple specializations.")

    # 5. Seed Ambulances
    if Ambulance.query.count() == 0:
        ambulances_data = [
            {
                "vehicle_number": "AP31-AB-1080",
                "driver_name": "Ramesh Babu",
                "driver_phone": "+91 94401 23456",
                "ambulance_type": "Basic Life Support",
                "current_location": "Health City, Visakhapatnam",
                "status": "Available"
            },
            {
                "vehicle_number": "AP31-EM-2020",
                "driver_name": "Satish Kumar",
                "driver_phone": "+91 94402 34567",
                "ambulance_type": "Advanced Life Support",
                "current_location": "Gajuwaka Junction, Visakhapatnam",
                "status": "Available"
            },
            {
                "vehicle_number": "DL01-ICU-9901",
                "driver_name": "Harish Singh",
                "driver_phone": "+91 98110 98765",
                "ambulance_type": "ICU Ambulance",
                "current_location": "Okhla Phase 3, New Delhi",
                "status": "Available"
            },
            {
                "vehicle_number": "KA03-EM-4500",
                "driver_name": "Manjunath K",
                "driver_phone": "+91 98450 11223",
                "ambulance_type": "Advanced Life Support",
                "current_location": "Indiranagar, Bengaluru",
                "status": "On Duty"
            },
            {
                "vehicle_number": "MH02-BLS-7788",
                "driver_name": "Dilip Patil",
                "driver_phone": "+91 98200 44556",
                "ambulance_type": "Basic Life Support",
                "current_location": "Bandra West, Mumbai",
                "status": "Available"
            },
            {
                "vehicle_number": "TS09-ICU-1122",
                "driver_name": "Mohammed Raheem",
                "driver_phone": "+91 98490 66778",
                "ambulance_type": "ICU Ambulance",
                "current_location": "Banjara Hills, Hyderabad",
                "status": "Available"
            }
        ]

        for amb_item in ambulances_data:
            db.session.add(Ambulance(**amb_item))
        db.session.commit()
        print("[Seeder] Seeded 6 Emergency Ambulances.")

    # 6. Seed Sample Appointments
    if Appointment.query.count() == 0:
        patient = User.query.filter_by(email="patient@medicare.com").first()
        doc1 = Doctor.query.filter_by(name="Dr. Rajesh Kumar").first()
        doc2 = Doctor.query.filter_by(name="Dr. Ananya Sen").first()
        doc3 = Doctor.query.filter_by(name="Dr. Suresh Varma").first()

        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        next_week = (date.today() + timedelta(days=5)).isoformat()
        yesterday = (date.today() - timedelta(days=3)).isoformat()

        if patient and doc1 and doc2 and doc3:
            appts = [
                Appointment(
                    user_id=patient.id,
                    doctor_id=doc1.id,
                    hospital_id=doc1.hospital_id,
                    appointment_date=tomorrow,
                    appointment_time="10:30 AM",
                    reason="Routine cardiovascular health checkup and hypertension review.",
                    status="Confirmed",
                    notes="Please carry recent ECG and blood test reports."
                ),
                Appointment(
                    user_id=patient.id,
                    doctor_id=doc2.id,
                    hospital_id=doc2.hospital_id,
                    appointment_date=next_week,
                    appointment_time="11:30 AM",
                    reason="Frequent migraine episodes and tension headaches.",
                    status="Pending",
                    notes=""
                ),
                Appointment(
                    user_id=patient.id,
                    doctor_id=doc3.id,
                    hospital_id=doc3.hospital_id,
                    appointment_date=yesterday,
                    appointment_time="04:30 PM",
                    reason="Annual physical examination and fasting lipid profile.",
                    status="Completed",
                    notes="Patient advised mild cardio exercises and dietary modifications."
                )
            ]
            for a in appts:
                db.session.add(a)
            db.session.commit()
            print("[Seeder] Seeded sample appointments.")

    # 7. Seed Reviews
    if Review.query.count() == 0:
        p1 = User.query.filter_by(email="patient@medicare.com").first()
        p2 = User.query.filter_by(email="sarah@medicare.com").first()
        d1 = Doctor.query.filter_by(name="Dr. Rajesh Kumar").first()
        d2 = Doctor.query.filter_by(name="Dr. Ananya Sen").first()

        if p1 and p2 and d1 and d2:
            reviews = [
                Review(
                    user_id=p1.id,
                    doctor_id=d1.id,
                    rating=5,
                    comment="Dr. Rajesh Kumar was exceptionally patient and thorough. He explained the cardiac angiography report clearly and relieved all my worries!"
                ),
                Review(
                    user_id=p2.id,
                    doctor_id=d1.id,
                    rating=5,
                    comment="Very polite, highly skilled doctor and outstanding medical facility at Apollo. Zero waiting time with online booking."
                ),
                Review(
                    user_id=p1.id,
                    doctor_id=d2.id,
                    rating=5,
                    comment="Dr. Ananya Sen solved my recurring migraine issues within 2 weeks. Very knowledgeable neurologist."
                )
            ]
            for r in reviews:
                db.session.add(r)
            db.session.commit()
            print("[Seeder] Seeded sample doctor reviews.")

    # 8. Seed Sample Ambulance Request
    if AmbulanceRequest.query.count() == 0:
        p = User.query.filter_by(email="patient@medicare.com").first()
        amb_duty = Ambulance.query.filter_by(status="On Duty").first()

        req = AmbulanceRequest(
            user_id=p.id if p else None,
            patient_name="Venkatesh Rao",
            phone="+91 94403 99887",
            emergency_type="Heart Emergency",
            pickup_location="Flat 302, Green Meadows, Siripuram, Visakhapatnam",
            destination_hospital="Apollo Hospitals, Health City",
            patients_count=1,
            additional_info="Patient experiencing severe sudden chest pain and shortness of breath.",
            status="Dispatched",
            assigned_ambulance_id=amb_duty.id if amb_duty else 1
        )
        db.session.add(req)
        db.session.commit()
        print("[Seeder] Seeded sample ambulance request.")

    print("[Seeder] Seed process finished successfully!")

if __name__ == "__main__":
    from app import create_app
    app = create_app()
    with app.app_context():
        db.create_all()
        run_seed()
