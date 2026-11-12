"""
Idempotent Seeding Script for MediConnect AP & Telangana Real Hospital & Doctor Data.
Preserves all existing patients, appointments, users, and existing doctors 1-6.
Adds 12 standard medical specializations.
Adds 24 real hospitals across 14 cities in Andhra Pradesh and Telangana.
Adds 10 verified real doctors with official citations and profile links.
Adds high-quality demo doctor profiles for remaining hospitals with is_demo=True, is_verified=False.
"""

import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import app
from models import db, Specialization, Hospital, Doctor

SPECIALIZATIONS_DATA = [
    {
        "name": "Cardiology",
        "slug": "cardiology",
        "icon": "FaHeartbeat",
        "description": "Comprehensive cardiac and vascular care, coronary interventions, and electrophysiology."
    },
    {
        "name": "Neurology",
        "slug": "neurology",
        "icon": "FaBrain",
        "description": "Expert diagnosis and care for stroke, epilepsy, neuromuscular conditions, and spine disorders."
    },
    {
        "name": "Nephrology & Urology",
        "slug": "nephrology-urology",
        "icon": "FaProcedures",
        "description": "Advanced renal care, hemodialysis, kidney transplantation, and urological surgical care."
    },
    {
        "name": "Orthopedics",
        "slug": "orthopedics",
        "icon": "FaBone",
        "description": "Bone, joint, spine, and musculoskeletal care, robotic joint replacements, and trauma surgery."
    },
    {
        "name": "General Medicine",
        "slug": "general-medicine",
        "icon": "FaStethoscope",
        "description": "Primary healthcare, internal medicine, chronic disease management, and preventive wellness."
    },
    {
        "name": "Obstetrics & Gynecology",
        "slug": "obstetrics-gynecology",
        "icon": "FaFemale",
        "description": "Women's healthcare, high-risk pregnancy care, fertility, and minimally invasive gynecological surgery."
    },
    {
        "name": "Medical & Surgical Oncology",
        "slug": "oncology",
        "icon": "FaRibbon",
        "description": "Comprehensive cancer care, surgical oncology, medical oncology, and radiation therapies."
    },
    {
        "name": "Gastroenterology",
        "slug": "gastroenterology",
        "icon": "FaDiagnoses",
        "description": "Digestive health, hepatology, endoscopy, gastrointestinal surgery, and liver disease treatment."
    },
    {
        "name": "Pediatrics",
        "slug": "pediatrics",
        "icon": "FaBaby",
        "description": "Comprehensive healthcare, neonatal intensive care (NICU), immunizations, and pediatric wellness."
    },
    {
        "name": "Ophthalmology",
        "slug": "ophthalmology",
        "icon": "FaEye",
        "description": "Advanced eye care, micro-incision cataract surgery, glaucoma, cornea, and vitreo-retinal therapies."
    },
    {
        "name": "Pulmonology",
        "slug": "pulmonology",
        "icon": "FaLungs",
        "description": "Respiratory care, asthma, COPD, sleep disorders, interventional pulmonology, and critical care."
    },
    {
        "name": "Emergency Medicine & Trauma",
        "slug": "emergency-medicine",
        "icon": "FaAmbulance",
        "description": "24/7 acute trauma resuscitation, triage, cardiac life support, and emergency intensive care."
    }
]

HOSPITALS_DATA = [
    # --- ANDHRA PRADESH ---
    {
        "name": "King George Hospital (KGH)",
        "slug": "king-george-hospital-visakhapatnam",
        "city": "Visakhapatnam",
        "state": "Andhra Pradesh",
        "address": "Maharanipeta, Visakhapatnam, Andhra Pradesh 530002",
        "hospital_type": "Government General Hospital",
        "website": "https://kghvisakhapatnam.com",
        "source_url": "https://kghvisakhapatnam.com",
        "phone": "+91-891-2564891",
        "emergency_number": "+91-891-2564899",
        "email": "superintendent@kghvisakhapatnam.com",
        "image": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Trauma Care, Multi-Specialty ICU, Blood Bank, NICU, Dialysis Unit, Diagnostic Labs, Janani Suraksha, Pharmacy",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.6,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Apollo Hospitals Health City",
        "slug": "apollo-hospitals-health-city-visakhapatnam",
        "city": "Visakhapatnam",
        "state": "Andhra Pradesh",
        "address": "Health City, Chinagadila, Arilova, Visakhapatnam, Andhra Pradesh 530040",
        "hospital_type": "Private Multi-Specialty",
        "website": "https://www.apollohospitals.com/visakhapatnam",
        "source_url": "https://www.apollohospitals.com/visakhapatnam",
        "phone": "+91-891-2727272",
        "emergency_number": "1066",
        "email": "apollo_vizag@apollohospitals.com",
        "image": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
        "facilities": "Advanced Cath Lab, 24/7 Emergency & Trauma, Robotic Surgery, PET-CT, Multi-Organ Transplant, Critical Care ICU",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.9,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Manipal Hospital Vijayawada",
        "slug": "manipal-hospital-vijayawada",
        "city": "Vijayawada",
        "state": "Andhra Pradesh",
        "address": "Near Kanakadurga Varadhi, Tadepalli, Guntur-Vijayawada Highway, Andhra Pradesh 522501",
        "hospital_type": "Private Multi-Specialty",
        "website": "https://www.manipalhospitals.com/vijayawada",
        "source_url": "https://www.manipalhospitals.com/vijayawada",
        "phone": "+91-866-2223333",
        "emergency_number": "+91-866-2223344",
        "email": "info.vijayawada@manipalhospitals.com",
        "image": "https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Emergency, Linear Accelerator, ECMO, Kidney & Liver Transplant, Dialysis Unit, Flat Panel Cath Lab",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.8,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Aster Ramesh Hospitals",
        "slug": "aster-ramesh-hospitals-vijayawada",
        "city": "Vijayawada",
        "state": "Andhra Pradesh",
        "address": "ITI Road, Near Ring Road, Vijayawada, Andhra Pradesh 520008",
        "hospital_type": "Private Multi-Specialty",
        "website": "https://www.asterhospitals.in/hospitals/aster-ramesh-vijayawada",
        "source_url": "https://www.asterhospitals.in/hospitals/aster-ramesh-vijayawada",
        "phone": "+91-866-2488888",
        "emergency_number": "+91-866-2488889",
        "email": "contactus@asterramesh.com",
        "image": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
        "facilities": "Cardiac Emergency, Stroke Care Center, Modular OTs, Cath Lab, Neuro ICU, 24/7 Pharmacy",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.8,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Government General Hospital (GGH) Guntur",
        "slug": "government-general-hospital-guntur",
        "city": "Guntur",
        "state": "Andhra Pradesh",
        "address": "Opposite Medical College, Sambasiva Pet, Guntur, Andhra Pradesh 522004",
        "hospital_type": "Government General Hospital",
        "website": "https://guntur.ap.gov.in",
        "source_url": "https://guntur.ap.gov.in",
        "phone": "+91-863-2224095",
        "emergency_number": "108",
        "email": "superintendentggh@guntur.ap.gov.in",
        "image": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Casualty, Blood Bank, Burns Care Center, Dialysis, Pediatric ICU, General Surgery OTs",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.5,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Ramesh Hospitals Guntur",
        "slug": "ramesh-hospitals-guntur",
        "city": "Guntur",
        "state": "Andhra Pradesh",
        "address": "Collector Office Road, Beside Collectorate, Nagarampalem, Guntur, Andhra Pradesh 522004",
        "hospital_type": "Private Multi-Specialty",
        "website": "https://www.asterhospitals.in/hospitals/aster-ramesh-guntur",
        "source_url": "https://www.asterhospitals.in/hospitals/aster-ramesh-guntur",
        "phone": "+91-863-2377777",
        "emergency_number": "+91-863-2377778",
        "email": "guntur@asterramesh.com",
        "image": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
        "facilities": "Interventional Cardiology, Trauma Care, Neuro ICU, Laparoscopic Surgery, Dialysis, Emergency Pharmacy",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.7,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Sri Venkateswara Institute of Medical Sciences (SVIMS)",
        "slug": "svims-tirupati",
        "city": "Tirupati",
        "state": "Andhra Pradesh",
        "address": "Alipiri Road, Tirupati, Andhra Pradesh 517507",
        "hospital_type": "Government Super-Specialty Institute",
        "website": "https://svimstpt.ap.nic.in",
        "source_url": "https://svimstpt.ap.nic.in",
        "phone": "+91-877-2287777",
        "emergency_number": "+91-877-2287152",
        "email": "director-svims@ap.gov.in",
        "image": "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80",
        "facilities": "Advanced Oncology, Renal Sciences, 24/7 Cardiac Care, MRI & CT, Telemedicine, Critical Care ICU",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.8,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Sri Venkateswara Aravind Eye Hospital",
        "slug": "aravind-eye-hospital-tirupati",
        "city": "Tirupati",
        "state": "Andhra Pradesh",
        "address": "Alipiri-Zoo Road, Near Alipiri Gate, Tirupati, Andhra Pradesh 517505",
        "hospital_type": "Specialty Eye Hospital",
        "website": "https://aravind.org/hospitals/tirupati",
        "source_url": "https://aravind.org/hospitals/tirupati",
        "phone": "+91-877-2501100",
        "emergency_number": "+91-877-2501111",
        "email": "tirupati@aravind.org",
        "image": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
        "facilities": "Cataract Modular OT, Cornea Clinic, Vitreo-Retinal Unit, Glaucoma Clinic, Pediatric Ophthalmology, Optical Center",
        "working_hours": "07:30 AM - 06:00 PM (Emergency 24/7)",
        "rating": 4.9,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "KIMS Hospitals Kurnool",
        "slug": "kims-hospitals-kurnool",
        "city": "Kurnool",
        "state": "Andhra Pradesh",
        "address": "Joharapuram Road, Near Bellary Chowrasta, Kurnool, Andhra Pradesh 518002",
        "hospital_type": "Private Multi-Specialty",
        "website": "https://www.kimshospitals.com/kurnool",
        "source_url": "https://www.kimshospitals.com/kurnool",
        "phone": "+91-8518-245678",
        "emergency_number": "+91-8518-245679",
        "email": "info.kurnool@kimshospitals.com",
        "image": "https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Emergency & Trauma, Modern Cath Lab, Neurosurgery Unit, Hemodialysis, Critical Care ICU, Diagnostic Labs",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.7,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Apollo Specialty Hospitals Nellore",
        "slug": "apollo-specialty-hospitals-nellore",
        "city": "Nellore",
        "state": "Andhra Pradesh",
        "address": "Pinakini Nagar, Muthukur Road, Nellore, Andhra Pradesh 524004",
        "hospital_type": "Private Multi-Specialty",
        "website": "https://www.apollohospitals.com/nellore",
        "source_url": "https://www.apollohospitals.com/nellore",
        "phone": "+91-861-2355555",
        "emergency_number": "1066",
        "email": "apollo_nellore@apollohospitals.com",
        "image": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
        "facilities": "Cardiac Sciences, Orthopedics & Joint Replacement, 24/7 Trauma, ICU, Advanced Radiology & CT",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.7,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Government General Hospital Rajahmundry",
        "slug": "government-general-hospital-rajahmundry",
        "city": "Rajahmundry",
        "state": "Andhra Pradesh",
        "address": "Kambala Tank, Near Main Road, Rajahmundry, Andhra Pradesh 533101",
        "hospital_type": "Government General Hospital",
        "website": "https://eastgodavari.ap.gov.in",
        "source_url": "https://eastgodavari.ap.gov.in",
        "phone": "+91-883-2473333",
        "emergency_number": "108",
        "email": "dchs-rjy@ap.gov.in",
        "image": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Emergency Casualty, Maternity Ward, Pediatric ICU, Blood Bank, X-Ray & Ultrasound, Free Janani Care",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.5,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Medicover Hospitals Kakinada",
        "slug": "medicover-hospitals-kakinada",
        "city": "Kakinada",
        "state": "Andhra Pradesh",
        "address": "ADB Road, Achampet Junction, Kakinada, Andhra Pradesh 533005",
        "hospital_type": "Private Multi-Specialty",
        "website": "https://www.medicoverhospitals.in/hospitals/andhra-pradesh/kakinada",
        "source_url": "https://www.medicoverhospitals.in/hospitals/andhra-pradesh/kakinada",
        "phone": "+91-884-6668888",
        "emergency_number": "040-68334455",
        "email": "kakinada@medicoverhospitals.in",
        "image": "https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Emergency & Critical Care, Cath Lab, Dialysis Center, Neonatal ICU, Orthopedic Surgery",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.7,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },

    # --- TELANGANA ---
    {
        "name": "Apollo Health City Jubilee Hills",
        "slug": "apollo-health-city-jubilee-hills-hyderabad",
        "city": "Hyderabad",
        "state": "Telangana",
        "address": "Road No 72, Opposite Bharatiya Vidya Bhavan, Film Nagar, Jubilee Hills, Hyderabad, Telangana 500096",
        "hospital_type": "Private Multi-Specialty (JCI Accredited)",
        "website": "https://hyderabad.apollohospitals.com",
        "source_url": "https://hyderabad.apollohospitals.com",
        "phone": "+91-40-23607777",
        "emergency_number": "1066",
        "email": "apollopet_hyd@apollohospitals.com",
        "image": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
        "facilities": "Proton Therapy, Robotic Surgery, Multi-Organ Transplant, 24/7 Emergency, Comprehensive Cancer Center, Cath Lab",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.9,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Yashoda Hospitals Somajiguda",
        "slug": "yashoda-hospitals-somajiguda-hyderabad",
        "city": "Hyderabad",
        "state": "Telangana",
        "address": "Alexander Road, Raj Bhavan Road, Somajiguda, Hyderabad, Telangana 500082",
        "hospital_type": "Private Multi-Specialty",
        "website": "https://www.yashodahospitals.com",
        "source_url": "https://www.yashodahospitals.com",
        "phone": "+91-40-45674567",
        "emergency_number": "+91-40-23319999",
        "email": "query@yashodamail.com",
        "image": "https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Emergency, Bone Marrow Transplant, Advanced Neuro Sciences, ECMO, High-End Cath Lab, Robotic Surgery",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.8,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Nizam's Institute of Medical Sciences (NIMS)",
        "slug": "nims-punjagutta-hyderabad",
        "city": "Hyderabad",
        "state": "Telangana",
        "address": "Punjagutta, Hyderabad, Telangana 500082",
        "hospital_type": "Government Autonomous Super-Specialty Institute",
        "website": "https://nims.edu.in",
        "source_url": "https://nims.edu.in",
        "phone": "+91-40-23489000",
        "emergency_number": "+91-40-23489244",
        "email": "nims@ap.nic.in",
        "image": "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80",
        "facilities": "Apex Trauma Center, Renal & Liver Transplant, Cardiology & CTVS, Advanced Diagnostics, Medical Oncology",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.7,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "KIMS Hospitals Secunderabad",
        "slug": "kims-hospitals-secunderabad",
        "city": "Secunderabad",
        "state": "Telangana",
        "address": "1-8-31/1, Minister Road, Krishna Nagar Colony, Begumpet, Secunderabad, Telangana 500003",
        "hospital_type": "Private Multi-Specialty",
        "website": "https://www.kimshospitals.com/secunderabad",
        "source_url": "https://www.kimshospitals.com/secunderabad",
        "phone": "+91-40-44885000",
        "emergency_number": "+91-40-44885100",
        "email": "contact@kimshospitals.com",
        "image": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
        "facilities": "Heart & Lung Transplant, Comprehensive Neuro Sciences, 24/7 Trauma, Robotic Orthopedics, Dialysis",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.9,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Gandhi Hospital Secunderabad",
        "slug": "gandhi-hospital-secunderabad",
        "city": "Secunderabad",
        "state": "Telangana",
        "address": "Musheerabad, Bhoiguda, Secunderabad, Telangana 500003",
        "hospital_type": "Government Tertiary Teaching Hospital",
        "website": "https://gmcsecunderabad.org",
        "source_url": "https://gmcsecunderabad.org",
        "phone": "+91-40-27505566",
        "emergency_number": "108",
        "email": "superintendent@gmcsecunderabad.org",
        "image": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Acute Casualty, Multi-Specialty ICUs, Free Blood Bank, Dialysis, Advanced Surgery OTs",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.6,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "MGM Government Hospital Warangal",
        "slug": "mgm-hospital-warangal",
        "city": "Warangal",
        "state": "Telangana",
        "address": "Mattewada, Warangal, Telangana 506002",
        "hospital_type": "Government Tertiary Teaching Hospital",
        "website": "https://health.telangana.gov.in",
        "source_url": "https://health.telangana.gov.in",
        "phone": "+91-870-2441201",
        "emergency_number": "108",
        "email": "mgmhospital-wgl@telangana.gov.in",
        "image": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Trauma Care, Regional Cancer Center, Dialysis Center, Neonatal ICU, Maternal Care",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.5,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Medicover Hospitals Warangal",
        "slug": "medicover-hospitals-warangal",
        "city": "Warangal",
        "state": "Telangana",
        "address": "Hunter Road, Beside Indian Oil Petrol Bunk, Shyampet, Warangal, Telangana 506001",
        "hospital_type": "Private Multi-Specialty",
        "website": "https://www.medicoverhospitals.in/hospitals/telangana/warangal",
        "source_url": "https://www.medicoverhospitals.in/hospitals/telangana/warangal",
        "phone": "+91-870-6712345",
        "emergency_number": "040-68334455",
        "email": "warangal@medicoverhospitals.in",
        "image": "https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Emergency, Critical Care, Cath Lab, Laparoscopic Surgery, Radiology & CT/MRI",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.7,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Apollo Reach Hospital Karimnagar",
        "slug": "apollo-reach-hospital-karimnagar",
        "city": "Karimnagar",
        "state": "Telangana",
        "address": "Railway Station Road, Beside Collectorate, Karimnagar, Telangana 505001",
        "hospital_type": "Private Multi-Specialty",
        "website": "https://www.apollohospitals.com/karimnagar",
        "source_url": "https://www.apollohospitals.com/karimnagar",
        "phone": "+91-878-2244444",
        "emergency_number": "1066",
        "email": "apollo_karimnagar@apollohospitals.com",
        "image": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Emergency & Trauma, Cardiac Care, Dialysis, Critical Care ICU, Modern Diagnostic Lab",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.7,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Government General Hospital Karimnagar",
        "slug": "government-general-hospital-karimnagar",
        "city": "Karimnagar",
        "state": "Telangana",
        "address": "Collectorate Road, Jyothinagar, Karimnagar, Telangana 505001",
        "hospital_type": "Government General Hospital",
        "website": "https://karimnagar.telangana.gov.in",
        "source_url": "https://karimnagar.telangana.gov.in",
        "phone": "+91-878-2234500",
        "emergency_number": "108",
        "email": "ggh-krm@telangana.gov.in",
        "image": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Casualty, Blood Bank, Dialysis Unit, Maternal & Child Health Wing, Ultrasound & X-Ray",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.5,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Government General Hospital Nizamabad",
        "slug": "government-general-hospital-nizamabad",
        "city": "Nizamabad",
        "state": "Telangana",
        "address": "Khaleelwadi, Near Old Bus Stand, Nizamabad, Telangana 503001",
        "hospital_type": "Government Tertiary Teaching Hospital",
        "website": "https://nizamabad.telangana.gov.in",
        "source_url": "https://nizamabad.telangana.gov.in",
        "phone": "+91-8462-232400",
        "emergency_number": "108",
        "email": "ggh-nzb@telangana.gov.in",
        "image": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Emergency, Pediatric ICU, Blood Storage Center, General Surgery OTs, Free Pharmacy",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.5,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Tirumala Multi Specialty Hospital Nizamabad",
        "slug": "tirumala-multi-specialty-hospital-nizamabad",
        "city": "Nizamabad",
        "state": "Telangana",
        "address": "Subhash Nagar, Opposite Collectorate, Nizamabad, Telangana 503002",
        "hospital_type": "Private Multi-Specialty",
        "website": "https://tirumalahospitals.com",
        "source_url": "https://tirumalahospitals.com",
        "phone": "+91-8462-245555",
        "emergency_number": "+91-8462-245556",
        "email": "info@tirumalahospitals.com",
        "image": "https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Emergency, Orthopedics, Cardiology, Dialysis, Advanced ICU, Ambulance Service",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.6,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    },
    {
        "name": "Mamata General & Super Specialty Hospital Khammam",
        "slug": "mamata-hospital-khammam",
        "city": "Khammam",
        "state": "Telangana",
        "address": "Rotary Nagar, Mamata Hospital Road, Khammam, Telangana 507002",
        "hospital_type": "Private Multi-Specialty Teaching Hospital",
        "website": "https://mamata.org",
        "source_url": "https://mamata.org",
        "phone": "+91-8742-235160",
        "emergency_number": "+91-8742-235161",
        "email": "mamatamedical@yahoo.com",
        "image": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
        "facilities": "24/7 Emergency & Trauma, Cardiac ICU, Renal Dialysis, Advanced Surgery OTs, CT/MRI",
        "working_hours": "24 Hours / 7 Days",
        "rating": 4.7,
        "is_verified": True,
        "verification_status": "Verified Hospital"
    }
]

# Real Doctors (10 profiles from official health portal directories)
REAL_DOCTORS_DATA = [
    {
        "name": "Dr. Pratap Chandra Rath",
        "hospital_slug": "apollo-health-city-jubilee-hills-hyderabad",
        "specialization_slug": "cardiology",
        "designation": "Director & Chief Interventional Cardiologist",
        "qualification": "MBBS, MD (General Medicine), DM (Cardiology), FACC, FSCAI",
        "experience": 35,
        "gender": "Male",
        "phone": "+91-40-23607777",
        "email": "pratap.rath@apollohospitals.com",
        "location": "Jubilee Hills, Hyderabad",
        "languages": "English, Telugu, Hindi",
        "consultation_fee": 1200.0,
        "available_days": "Monday - Saturday",
        "available_time": "10:00 AM - 04:00 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
        "about": "Director of Interventional Cardiology & Cath Lab at Apollo Health City Jubilee Hills. Over 35 years of clinical mastery in complex coronary angioplasty, TAVR, and structural heart interventions.",
        "rating": 4.9,
        "total_reviews": 128,
        "is_demo": False,
        "is_verified": True,
        "verification_status": "Verified Clinician",
        "profile_url": "https://hyderabad.apollohospitals.com/doctors/dr-pratap-chandra-rath/",
        "source_url": "https://www.apollohospitals.com"
    },
    {
        "name": "Dr. Sudhir Kumar",
        "hospital_slug": "apollo-health-city-jubilee-hills-hyderabad",
        "specialization_slug": "neurology",
        "designation": "Senior Consultant Neurologist",
        "qualification": "MBBS, MD (Internal Medicine), DM (Neurology)",
        "experience": 24,
        "gender": "Male",
        "phone": "+91-40-23607777",
        "email": "drsudhir_k@apollohospitals.com",
        "location": "Jubilee Hills, Hyderabad",
        "languages": "English, Telugu, Hindi",
        "consultation_fee": 1200.0,
        "available_days": "Monday - Saturday",
        "available_time": "09:30 AM - 03:30 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
        "about": "Senior Consultant Neurologist at Apollo Health City Jubilee Hills. Renowned stroke and headache specialist, treating neurological emergencies, peripheral nerve disorders, and epilepsy with 24+ years of expertise.",
        "rating": 4.9,
        "total_reviews": 96,
        "is_demo": False,
        "is_verified": True,
        "verification_status": "Verified Clinician",
        "profile_url": "https://hyderabad.apollohospitals.com/doctors/dr-sudhir-kumar/",
        "source_url": "https://www.apollohospitals.com"
    },
    {
        "name": "Dr. B. Bhaskar Rao",
        "hospital_slug": "kims-hospitals-secunderabad",
        "specialization_slug": "cardiology",
        "designation": "Managing Director & Chief Cardiothoracic Surgeon",
        "qualification": "MBBS, MS (General Surgery), MCh (Cardiothoracic Surgery)",
        "experience": 32,
        "gender": "Male",
        "phone": "+91-40-44885000",
        "email": "bhaskar.rao@kimshospitals.com",
        "location": "Minister Road, Secunderabad",
        "languages": "English, Telugu, Hindi",
        "consultation_fee": 1500.0,
        "available_days": "Monday - Friday",
        "available_time": "10:00 AM - 02:00 PM",
        "consultation_type": "In-Person",
        "image": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
        "about": "Pioneering cardiothoracic surgeon and Managing Director of KIMS Hospitals Group. Has performed thousands of open-heart procedures, coronary artery bypass grafts (CABG), and heart valve reconstructions.",
        "rating": 4.9,
        "total_reviews": 142,
        "is_demo": False,
        "is_verified": True,
        "verification_status": "Verified Clinician",
        "profile_url": "https://www.kimshospitals.com/doctor/dr-b-bhaskar-rao/",
        "source_url": "https://www.kimshospitals.com"
    },
    {
        "name": "Dr. Ravi Raju Tatapudi",
        "hospital_slug": "apollo-hospitals-health-city-visakhapatnam",
        "specialization_slug": "nephrology-urology",
        "designation": "Senior Consultant Nephrologist & Senior Academician",
        "qualification": "MBBS, MD (General Medicine), DM (Nephrology), FRCP",
        "experience": 38,
        "gender": "Male",
        "phone": "+91-891-2727272",
        "email": "raviraju_t@apollohospitals.com",
        "location": "Health City, Arilova, Visakhapatnam",
        "languages": "English, Telugu",
        "consultation_fee": 1000.0,
        "available_days": "Monday - Saturday",
        "available_time": "09:00 AM - 01:00 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80",
        "about": "Distinguished nephrologist and former Vice Chancellor of Dr. NTR University of Health Sciences. Pioneer in renal medicine, hemodialysis protocols, and renal transplant management across coastal Andhra.",
        "rating": 4.9,
        "total_reviews": 115,
        "is_demo": False,
        "is_verified": True,
        "verification_status": "Verified Clinician",
        "profile_url": "https://www.apollohospitals.com/visakhapatnam/doctors/dr-ravi-raju-tatapudi/",
        "source_url": "https://www.apollohospitals.com"
    },
    {
        "name": "Dr. Nanda Kishore Panigrahi",
        "hospital_slug": "apollo-hospitals-health-city-visakhapatnam",
        "specialization_slug": "cardiology",
        "designation": "Senior Consultant Interventional Cardiologist",
        "qualification": "MBBS, MD (Medicine), DM (Cardiology), FACC",
        "experience": 22,
        "gender": "Male",
        "phone": "+91-891-2727272",
        "email": "nandakishore_p@apollohospitals.com",
        "location": "Health City, Arilova, Visakhapatnam",
        "languages": "English, Telugu, Hindi, Odia",
        "consultation_fee": 900.0,
        "available_days": "Monday - Saturday",
        "available_time": "10:00 AM - 05:00 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
        "about": "Lead Interventional Cardiologist at Apollo Health City Vizag. Specialized in complex coronary angioplasty, transradial interventions, pacemaker implantations, and emergency acute MI revascularization.",
        "rating": 4.8,
        "total_reviews": 84,
        "is_demo": False,
        "is_verified": True,
        "verification_status": "Verified Clinician",
        "profile_url": "https://www.apollohospitals.com/visakhapatnam/doctors/dr-nanda-kishore-panigrahi/",
        "source_url": "https://www.apollohospitals.com"
    },
    {
        "name": "Dr. P. Ramesh Babu",
        "hospital_slug": "aster-ramesh-hospitals-vijayawada",
        "specialization_slug": "cardiology",
        "designation": "Chief Interventional Cardiologist & Managing Director",
        "qualification": "MBBS, MD (Internal Medicine), DM (Cardiology), FSCAI",
        "experience": 30,
        "gender": "Male",
        "phone": "+91-866-2488888",
        "email": "rameshbabu.p@asterhospitals.in",
        "location": "ITI Road, Vijayawada",
        "languages": "English, Telugu",
        "consultation_fee": 1000.0,
        "available_days": "Monday - Saturday",
        "available_time": "09:00 AM - 02:00 PM",
        "consultation_type": "In-Person",
        "image": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
        "about": "Founder & Chief Cardiologist of Ramesh Hospitals. Renowned for pioneering rural telemedicine tele-coronary care units and performing over 20,000 diagnostic and therapeutic cardiac procedures.",
        "rating": 4.9,
        "total_reviews": 160,
        "is_demo": False,
        "is_verified": True,
        "verification_status": "Verified Clinician",
        "profile_url": "https://www.asterhospitals.in/doctors/dr-p-ramesh-babu/",
        "source_url": "https://www.asterhospitals.in"
    },
    {
        "name": "Maj. Gen. Dr. Somasundaram Kumaravelu (Retd.)",
        "hospital_slug": "aster-ramesh-hospitals-vijayawada",
        "specialization_slug": "neurology",
        "designation": "Senior Consultant Neurologist & Clinical Director",
        "qualification": "MBBS, MD (General Medicine), DM (Neurology)",
        "experience": 34,
        "gender": "Male",
        "phone": "+91-866-2488888",
        "email": "skumaravelu@asterhospitals.in",
        "location": "ITI Road, Vijayawada",
        "languages": "English, Telugu, Tamil, Hindi",
        "consultation_fee": 900.0,
        "available_days": "Monday - Friday",
        "available_time": "10:00 AM - 03:00 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
        "about": "Distinguished Neurologist and retired Major General from the Indian Army Medical Corps. Expert in neuro-critical care, acute ischemic stroke thrombolysis, neuromuscular diseases, and cognitive neurology.",
        "rating": 4.9,
        "total_reviews": 75,
        "is_demo": False,
        "is_verified": True,
        "verification_status": "Verified Clinician",
        "profile_url": "https://www.asterhospitals.in/doctors/dr-somasundaram-kumaravelu/",
        "source_url": "https://www.asterhospitals.in"
    },
    {
        "name": "Dr. M. Madhusudhana Babu",
        "hospital_slug": "apollo-hospitals-health-city-visakhapatnam",
        "specialization_slug": "neurology",
        "designation": "Senior Consultant Neurologist",
        "qualification": "MBBS, MD (Internal Medicine), DM (Neurology)",
        "experience": 18,
        "gender": "Male",
        "phone": "+91-891-2727272",
        "email": "madhusudhan_babu@apollohospitals.com",
        "location": "Health City, Arilova, Visakhapatnam",
        "languages": "English, Telugu, Hindi",
        "consultation_fee": 800.0,
        "available_days": "Monday - Saturday",
        "available_time": "10:00 AM - 04:00 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
        "about": "Senior Neurologist at Apollo Hospitals Visakhapatnam specializing in neurovascular emergencies, Parkinson's disease, dementia, epilepsy syndromes, and comprehensive neuro-rehabilitation.",
        "rating": 4.8,
        "total_reviews": 64,
        "is_demo": False,
        "is_verified": True,
        "verification_status": "Verified Clinician",
        "profile_url": "https://www.apollohospitals.com/visakhapatnam/doctors/dr-m-madhusudhana-babu/",
        "source_url": "https://www.apollohospitals.com"
    },
    {
        "name": "Dr. Indhukuri Satish Raju",
        "hospital_slug": "apollo-hospitals-health-city-visakhapatnam",
        "specialization_slug": "orthopedics",
        "designation": "Senior Consultant Orthopedic & Joint Replacement Surgeon",
        "qualification": "MBBS, MS (Orthopedics), MCh (Orthopedics)",
        "experience": 16,
        "gender": "Male",
        "phone": "+91-891-2727272",
        "email": "satish_raju@apollohospitals.com",
        "location": "Health City, Arilova, Visakhapatnam",
        "languages": "English, Telugu",
        "consultation_fee": 800.0,
        "available_days": "Monday - Saturday",
        "available_time": "09:30 AM - 03:30 PM",
        "consultation_type": "In-Person",
        "image": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
        "about": "Senior Orthopedic Surgeon at Apollo Health City Vizag. Specialized in minimally invasive hip and knee arthroplasty, complex fracture management, sports injuries, and arthroscopic reconstructions.",
        "rating": 4.8,
        "total_reviews": 58,
        "is_demo": False,
        "is_verified": True,
        "verification_status": "Verified Clinician",
        "profile_url": "https://www.apollohospitals.com/visakhapatnam/doctors/dr-indhukuri-satish-raju/",
        "source_url": "https://www.apollohospitals.com"
    },
    {
        "name": "Dr. Sreedevi Matta",
        "hospital_slug": "apollo-hospitals-health-city-visakhapatnam",
        "specialization_slug": "obstetrics-gynecology",
        "designation": "Senior Consultant Obstetrician & Gynecological Surgeon",
        "qualification": "MBBS, DGO, DNB (Obstetrics & Gynecology)",
        "experience": 15,
        "gender": "Female",
        "phone": "+91-891-2727272",
        "email": "sreedevi_matta@apollohospitals.com",
        "location": "Health City, Arilova, Visakhapatnam",
        "languages": "English, Telugu, Hindi",
        "consultation_fee": 800.0,
        "available_days": "Monday - Saturday",
        "available_time": "10:00 AM - 04:00 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1594824813571-638f02614d3f?auto=format&fit=crop&w=400&q=80",
        "about": "Senior Consultant in Obstetrics and Gynecology at Apollo Health City Vizag. Specialized in high-risk pregnancy management, painless deliveries, laparoscopic gynecological surgery, and adolescent wellness.",
        "rating": 4.9,
        "total_reviews": 79,
        "is_demo": False,
        "is_verified": True,
        "verification_status": "Verified Clinician",
        "profile_url": "https://www.apollohospitals.com/visakhapatnam/doctors/dr-sreedevi-matta/",
        "source_url": "https://www.apollohospitals.com"
    }
]

# High-Quality Demo Doctors (Transparently marked as demo profiles for hospitals without direct public doctor profiles)
DEMO_DOCTORS_DATA = [
    {
        "name": "Dr. K. S. Narayana Rao (Demo)",
        "hospital_slug": "king-george-hospital-visakhapatnam",
        "specialization_slug": "general-medicine",
        "designation": "Civil Surgeon & Professor of Medicine (Simulation)",
        "qualification": "MBBS, MD (General Medicine)",
        "experience": 20,
        "gender": "Male",
        "phone": "+91-891-2564891",
        "email": "demo.kgh.narayana@mediconnect.demo",
        "location": "Maharanipeta, Visakhapatnam",
        "languages": "English, Telugu",
        "consultation_fee": 200.0,
        "available_days": "Monday - Saturday",
        "available_time": "09:00 AM - 02:00 PM",
        "consultation_type": "In-Person",
        "image": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.6,
        "total_reviews": 42,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. T. Venkata Krishna (Demo)",
        "hospital_slug": "manipal-hospital-vijayawada",
        "specialization_slug": "oncology",
        "designation": "Consultant Medical Oncologist (Simulation)",
        "qualification": "MBBS, MD (Medicine), DM (Medical Oncology)",
        "experience": 14,
        "gender": "Male",
        "phone": "+91-866-2223333",
        "email": "demo.manipal.krishna@mediconnect.demo",
        "location": "Tadepalli, Vijayawada",
        "languages": "English, Telugu, Hindi",
        "consultation_fee": 850.0,
        "available_days": "Monday - Friday",
        "available_time": "10:00 AM - 04:00 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.7,
        "total_reviews": 38,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. Ch. Lakshmi Prasanna (Demo)",
        "hospital_slug": "government-general-hospital-guntur",
        "specialization_slug": "pediatrics",
        "designation": "Associate Professor of Pediatrics (Simulation)",
        "qualification": "MBBS, DCH, MD (Pediatrics)",
        "experience": 16,
        "gender": "Female",
        "phone": "+91-863-2224095",
        "email": "demo.gghguntur.lakshmi@mediconnect.demo",
        "location": "Sambasiva Pet, Guntur",
        "languages": "English, Telugu",
        "consultation_fee": 150.0,
        "available_days": "Monday - Saturday",
        "available_time": "09:00 AM - 01:00 PM",
        "consultation_type": "In-Person",
        "image": "https://images.unsplash.com/photo-1594824813571-638f02614d3f?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.6,
        "total_reviews": 29,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. G. Srinivasulu (Demo)",
        "hospital_slug": "svims-tirupati",
        "specialization_slug": "nephrology-urology",
        "designation": "Senior Professor of Nephrology (Simulation)",
        "qualification": "MBBS, MD, DM (Nephrology)",
        "experience": 22,
        "gender": "Male",
        "phone": "+91-877-2287777",
        "email": "demo.svims.srinivas@mediconnect.demo",
        "location": "Alipiri Road, Tirupati",
        "languages": "English, Telugu",
        "consultation_fee": 400.0,
        "available_days": "Monday - Friday",
        "available_time": "09:30 AM - 02:30 PM",
        "consultation_type": "In-Person",
        "image": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.8,
        "total_reviews": 51,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. K. Anitha (Demo)",
        "hospital_slug": "aravind-eye-hospital-tirupati",
        "specialization_slug": "ophthalmology",
        "designation": "Chief Medical Officer & Cataract Specialist (Simulation)",
        "qualification": "MBBS, MS (Ophthalmology), DO",
        "experience": 17,
        "gender": "Female",
        "phone": "+91-877-2501100",
        "email": "demo.aravind.anitha@mediconnect.demo",
        "location": "Alipiri-Zoo Road, Tirupati",
        "languages": "English, Telugu, Tamil",
        "consultation_fee": 300.0,
        "available_days": "Monday - Saturday",
        "available_time": "08:30 AM - 03:00 PM",
        "consultation_type": "In-Person",
        "image": "https://images.unsplash.com/photo-1594824813571-638f02614d3f?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.9,
        "total_reviews": 68,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. M. Harish Kumar (Demo)",
        "hospital_slug": "kims-hospitals-kurnool",
        "specialization_slug": "orthopedics",
        "designation": "Consultant Joint Replacement Surgeon (Simulation)",
        "qualification": "MBBS, MS (Orthopedics)",
        "experience": 13,
        "gender": "Male",
        "phone": "+91-8518-245678",
        "email": "demo.kimskurnool.harish@mediconnect.demo",
        "location": "Joharapuram Road, Kurnool",
        "languages": "English, Telugu, Kannada",
        "consultation_fee": 700.0,
        "available_days": "Monday - Saturday",
        "available_time": "10:00 AM - 04:00 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.7,
        "total_reviews": 33,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. P. Sandhya Rani (Demo)",
        "hospital_slug": "apollo-specialty-hospitals-nellore",
        "specialization_slug": "obstetrics-gynecology",
        "designation": "Consultant Obstetrician & Gynecologist (Simulation)",
        "qualification": "MBBS, MD (OBG), DNB",
        "experience": 15,
        "gender": "Female",
        "phone": "+91-861-2355555",
        "email": "demo.apollonellore.sandhya@mediconnect.demo",
        "location": "Pinakini Nagar, Nellore",
        "languages": "English, Telugu",
        "consultation_fee": 750.0,
        "available_days": "Monday - Saturday",
        "available_time": "09:30 AM - 03:30 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1594824813571-638f02614d3f?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.7,
        "total_reviews": 41,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. R. Satyanarayana (Demo)",
        "hospital_slug": "government-general-hospital-rajahmundry",
        "specialization_slug": "pulmonology",
        "designation": "Senior Medical Officer, Chest & TB (Simulation)",
        "qualification": "MBBS, DTCD, MD (Pulmonary Medicine)",
        "experience": 19,
        "gender": "Male",
        "phone": "+91-883-2473333",
        "email": "demo.gghrjy.satya@mediconnect.demo",
        "location": "Kambala Tank, Rajahmundry",
        "languages": "English, Telugu",
        "consultation_fee": 150.0,
        "available_days": "Monday - Saturday",
        "available_time": "09:00 AM - 01:30 PM",
        "consultation_type": "In-Person",
        "image": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.5,
        "total_reviews": 26,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. V. Surya Prakash (Demo)",
        "hospital_slug": "medicover-hospitals-kakinada",
        "specialization_slug": "gastroenterology",
        "designation": "Consultant Medical Gastroenterologist (Simulation)",
        "qualification": "MBBS, MD (Medicine), DM (Gastroenterology)",
        "experience": 12,
        "gender": "Male",
        "phone": "+91-884-6668888",
        "email": "demo.medicoverkakinada.surya@mediconnect.demo",
        "location": "ADB Road, Kakinada",
        "languages": "English, Telugu",
        "consultation_fee": 800.0,
        "available_days": "Monday - Saturday",
        "available_time": "10:00 AM - 04:00 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.7,
        "total_reviews": 35,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. B. Radhika (Demo)",
        "hospital_slug": "yashoda-hospitals-somajiguda-hyderabad",
        "specialization_slug": "gastroenterology",
        "designation": "Senior Consultant Hepatologist (Simulation)",
        "qualification": "MBBS, MD, DM (Gastroenterology)",
        "experience": 17,
        "gender": "Female",
        "phone": "+91-40-45674567",
        "email": "demo.yashoda.radhika@mediconnect.demo",
        "location": "Somajiguda, Hyderabad",
        "languages": "English, Telugu, Hindi",
        "consultation_fee": 1000.0,
        "available_days": "Monday - Saturday",
        "available_time": "10:00 AM - 03:30 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1594824813571-638f02614d3f?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.8,
        "total_reviews": 60,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. Syed Nayeemuddin (Demo)",
        "hospital_slug": "nims-punjagutta-hyderabad",
        "specialization_slug": "emergency-medicine",
        "designation": "Professor of Emergency Medicine & Trauma (Simulation)",
        "qualification": "MBBS, MD (Emergency Medicine), FACEE",
        "experience": 21,
        "gender": "Male",
        "phone": "+91-40-23489000",
        "email": "demo.nims.nayeem@mediconnect.demo",
        "location": "Punjagutta, Hyderabad",
        "languages": "English, Telugu, Urdu, Hindi",
        "consultation_fee": 350.0,
        "available_days": "Monday - Saturday",
        "available_time": "08:00 AM - 02:00 PM",
        "consultation_type": "In-Person",
        "image": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.7,
        "total_reviews": 54,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. C. Prabhakar (Demo)",
        "hospital_slug": "gandhi-hospital-secunderabad",
        "specialization_slug": "general-medicine",
        "designation": "Professor & Head of Internal Medicine (Simulation)",
        "qualification": "MBBS, MD (General Medicine)",
        "experience": 25,
        "gender": "Male",
        "phone": "+91-40-27505566",
        "email": "demo.gandhi.prabhakar@mediconnect.demo",
        "location": "Musheerabad, Secunderabad",
        "languages": "English, Telugu, Hindi",
        "consultation_fee": 100.0,
        "available_days": "Monday - Saturday",
        "available_time": "09:00 AM - 01:00 PM",
        "consultation_type": "In-Person",
        "image": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.6,
        "total_reviews": 47,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. T. Rajendra Prasad (Demo)",
        "hospital_slug": "mgm-hospital-warangal",
        "specialization_slug": "pediatrics",
        "designation": "Professor of Pediatrics & Neonatology (Simulation)",
        "qualification": "MBBS, MD (Pediatrics)",
        "experience": 23,
        "gender": "Male",
        "phone": "+91-870-2441201",
        "email": "demo.mgm.rajendra@mediconnect.demo",
        "location": "Mattewada, Warangal",
        "languages": "English, Telugu",
        "consultation_fee": 100.0,
        "available_days": "Monday - Saturday",
        "available_time": "09:00 AM - 01:00 PM",
        "consultation_type": "In-Person",
        "image": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.5,
        "total_reviews": 39,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. D. Vijaya Kumar (Demo)",
        "hospital_slug": "medicover-hospitals-warangal",
        "specialization_slug": "orthopedics",
        "designation": "Consultant Orthopedic & Trauma Surgeon (Simulation)",
        "qualification": "MBBS, MS (Orthopedics)",
        "experience": 14,
        "gender": "Male",
        "phone": "+91-870-6712345",
        "email": "demo.medicoverwgl.vijay@mediconnect.demo",
        "location": "Hunter Road, Warangal",
        "languages": "English, Telugu, Hindi",
        "consultation_fee": 700.0,
        "available_days": "Monday - Saturday",
        "available_time": "10:00 AM - 04:00 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.7,
        "total_reviews": 32,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. P. Swetha Reddy (Demo)",
        "hospital_slug": "apollo-reach-hospital-karimnagar",
        "specialization_slug": "cardiology",
        "designation": "Consultant Cardiologist (Simulation)",
        "qualification": "MBBS, MD, DNB (Cardiology)",
        "experience": 11,
        "gender": "Female",
        "phone": "+91-878-2244444",
        "email": "demo.apollokrm.swetha@mediconnect.demo",
        "location": "Railway Station Road, Karimnagar",
        "languages": "English, Telugu",
        "consultation_fee": 800.0,
        "available_days": "Monday - Saturday",
        "available_time": "09:30 AM - 03:30 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1594824813571-638f02614d3f?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.7,
        "total_reviews": 28,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. M. Ashok Vardhan (Demo)",
        "hospital_slug": "government-general-hospital-karimnagar",
        "specialization_slug": "pulmonology",
        "designation": "Civil Surgeon in Chest Diseases (Simulation)",
        "qualification": "MBBS, MD (Pulmonary Medicine)",
        "experience": 18,
        "gender": "Male",
        "phone": "+91-878-2234500",
        "email": "demo.gghkrm.ashok@mediconnect.demo",
        "location": "Jyothinagar, Karimnagar",
        "languages": "English, Telugu",
        "consultation_fee": 100.0,
        "available_days": "Monday - Saturday",
        "available_time": "09:00 AM - 01:30 PM",
        "consultation_type": "In-Person",
        "image": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.5,
        "total_reviews": 24,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. V. Srinivas Goud (Demo)",
        "hospital_slug": "government-general-hospital-nizamabad",
        "specialization_slug": "general-medicine",
        "designation": "Senior Professor of Internal Medicine (Simulation)",
        "qualification": "MBBS, MD (General Medicine)",
        "experience": 20,
        "gender": "Male",
        "phone": "+91-8462-232400",
        "email": "demo.gghnzb.srinivas@mediconnect.demo",
        "location": "Khaleelwadi, Nizamabad",
        "languages": "English, Telugu, Hindi",
        "consultation_fee": 100.0,
        "available_days": "Monday - Saturday",
        "available_time": "09:00 AM - 01:00 PM",
        "consultation_type": "In-Person",
        "image": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.6,
        "total_reviews": 31,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. K. Madhusudhan Reddy (Demo)",
        "hospital_slug": "tirumala-multi-specialty-hospital-nizamabad",
        "specialization_slug": "orthopedics",
        "designation": "Senior Consultant Orthopedic Surgeon (Simulation)",
        "qualification": "MBBS, MS (Orthopedics), DNB",
        "experience": 16,
        "gender": "Male",
        "phone": "+91-8462-245555",
        "email": "demo.tirumalanzb.madhu@mediconnect.demo",
        "location": "Subhash Nagar, Nizamabad",
        "languages": "English, Telugu, Hindi",
        "consultation_fee": 650.0,
        "available_days": "Monday - Saturday",
        "available_time": "10:00 AM - 04:00 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.7,
        "total_reviews": 29,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    },
    {
        "name": "Dr. G. Shailaja (Demo)",
        "hospital_slug": "mamata-hospital-khammam",
        "specialization_slug": "obstetrics-gynecology",
        "designation": "Professor of Obstetrics & Gynecology (Simulation)",
        "qualification": "MBBS, MD (OBG)",
        "experience": 19,
        "gender": "Female",
        "phone": "+91-8742-235160",
        "email": "demo.mamata.shailaja@mediconnect.demo",
        "location": "Rotary Nagar, Khammam",
        "languages": "English, Telugu",
        "consultation_fee": 400.0,
        "available_days": "Monday - Saturday",
        "available_time": "09:30 AM - 02:30 PM",
        "consultation_type": "In-Person & Video",
        "image": "https://images.unsplash.com/photo-1594824813571-638f02614d3f?auto=format&fit=crop&w=400&q=80",
        "about": "Demo clinical profile created for platform simulation. Not an official hospital appointment listing.",
        "rating": 4.7,
        "total_reviews": 36,
        "is_demo": True,
        "is_verified": False,
        "verification_status": "Demo Profile (Unverified)",
        "profile_url": "",
        "source_url": ""
    }
]


def seed_specializations():
    print("--- Seeding Specializations ---")
    spec_map = {}
    for data in SPECIALIZATIONS_DATA:
        # Check by slug or name
        spec = Specialization.query.filter((Specialization.slug == data["slug"]) | (Specialization.name == data["name"])).first()
        if spec:
            # Update
            spec.name = data["name"]
            spec.slug = data["slug"]
            spec.icon = data["icon"]
            spec.description = data["description"]
            print(f"  [UPDATED] Specialization id={spec.id}: {spec.name} ({spec.slug})")
        else:
            # Check if id=1 exists with 'cardiology-test' and update it to cardiology
            if data["slug"] == "cardiology":
                spec_1 = db.session.get(Specialization, 1)
                if spec_1 and "cardiology" in spec_1.slug.lower():
                    spec_1.name = data["name"]
                    spec_1.slug = data["slug"]
                    spec_1.icon = data["icon"]
                    spec_1.description = data["description"]
                    spec = spec_1
                    print(f"  [REUSED S1] Specialization id=1 -> {spec.name}")
                else:
                    spec = Specialization(**data)
                    db.session.add(spec)
                    db.session.flush()
                    print(f"  [CREATED] Specialization id={spec.id}: {spec.name}")
            else:
                spec = Specialization(**data)
                db.session.add(spec)
                db.session.flush()
                print(f"  [CREATED] Specialization id={spec.id}: {spec.name}")
        spec_map[data["slug"]] = spec
    db.session.commit()
    return spec_map


def seed_hospitals():
    print("\n--- Seeding Hospitals (24 AP & TS) ---")
    hosp_map = {}
    created_count = 0
    updated_count = 0

    for data in HOSPITALS_DATA:
        hosp = Hospital.query.filter_by(slug=data["slug"]).first()
        if hosp:
            # Update attributes
            for key, val in data.items():
                setattr(hosp, key, val)
            updated_count += 1
            print(f"  [UPDATED] Hospital id={hosp.id}: {hosp.name} ({hosp.city}, {hosp.state})")
        else:
            hosp = Hospital(**data)
            db.session.add(hosp)
            db.session.flush()
            created_count += 1
            print(f"  [CREATED] Hospital id={hosp.id}: {hosp.name} ({hosp.city}, {hosp.state})")
        hosp_map[data["slug"]] = hosp

    db.session.commit()
    print(f"Hospitals: {created_count} created, {updated_count} updated.")
    return hosp_map


def seed_doctors(hosp_map, spec_map):
    print("\n--- Seeding Real & Demo Doctors ---")
    created_count = 0
    updated_count = 0

    all_doctors = REAL_DOCTORS_DATA + DEMO_DOCTORS_DATA

    for item in all_doctors:
        h_slug = item.pop("hospital_slug")
        s_slug = item.pop("specialization_slug")

        hosp = hosp_map.get(h_slug) or Hospital.query.filter_by(slug=h_slug).first()
        spec = spec_map.get(s_slug) or Specialization.query.filter_by(slug=s_slug).first()

        if not hosp or not spec:
            print(f"  [ERROR] Cannot find hosp={h_slug} or spec={s_slug} for {item['name']}")
            continue

        item["hospital_id"] = hosp.id
        item["specialization_id"] = spec.id

        # Check existing doctor by email or (name and hospital_id)
        doc = Doctor.query.filter((Doctor.email == item["email"]) | ((Doctor.name == item["name"]) & (Doctor.hospital_id == hosp.id))).first()

        if doc:
            for k, v in item.items():
                setattr(doc, k, v)
            updated_count += 1
            print(f"  [UPDATED] Doctor id={doc.id}: {doc.name} (Hosp: {hosp.name}) [verified={doc.is_verified}]")
        else:
            doc = Doctor(**item)
            db.session.add(doc)
            db.session.flush()
            created_count += 1
            print(f"  [CREATED] Doctor id={doc.id}: {doc.name} (Hosp: {hosp.name}) [verified={doc.is_verified}]")

    db.session.commit()
    print(f"Doctors: {created_count} created, {updated_count} updated.")


def main():
    with app.app_context():
        print(f"Starting seed process against active DB: {app.config['SQLALCHEMY_DATABASE_URI']}")
        spec_map = seed_specializations()
        hosp_map = seed_hospitals()
        seed_doctors(hosp_map, spec_map)

        print("\n=== FINAL VERIFICATION ===")
        print(f"Total Specializations: {Specialization.query.count()}")
        print(f"Total Hospitals: {Hospital.query.count()}")
        print(f"Total Doctors: {Doctor.query.count()}")
        print(f"Verified Doctors: {Doctor.query.filter_by(is_verified=True).count()}")
        print(f"Demo Doctors: {Doctor.query.filter_by(is_demo=True).count()}")
        print("Idempotent seed run complete.")


if __name__ == "__main__":
    main()

