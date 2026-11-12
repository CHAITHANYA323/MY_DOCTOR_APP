"""
Verification test suite for MediConnect AP & Telangana Real Hospital & Doctor Integration.
Tests database counts, city coverage across AP & TS, verified doctor attributes,
demo profiles, search & filter API endpoints, and data idempotency.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import app
from models import db, Hospital, Specialization, Doctor, User, Appointment


class TestApTsDataIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()

    def test_01_hospital_cities_coverage(self):
        """Verify all 14 specified cities across AP and TS are present."""
        expected_ap_cities = {
            "Visakhapatnam", "Vijayawada", "Guntur", "Tirupati",
            "Kurnool", "Nellore", "Rajahmundry", "Kakinada"
        }
        expected_ts_cities = {
            "Hyderabad", "Secunderabad", "Warangal", "Karimnagar",
            "Nizamabad", "Khammam"
        }

        with app.app_context():
            ap_hospitals = Hospital.query.filter_by(state="Andhra Pradesh").all()
            ts_hospitals = Hospital.query.filter_by(state="Telangana").all()

            ap_cities = {h.city for h in ap_hospitals}
            ts_cities = {h.city for h in ts_hospitals}

            for city in expected_ap_cities:
                self.assertIn(city, ap_cities, f"Missing AP city: {city}")

            for city in expected_ts_cities:
                self.assertIn(city, ts_cities, f"Missing TS city: {city}")

            self.assertGreaterEqual(len(ap_hospitals), 12, "Should have at least 12 AP hospitals")
            self.assertGreaterEqual(len(ts_hospitals), 12, "Should have at least 12 TS hospitals")

    def test_02_specializations_count(self):
        """Verify all 12 core clinical specializations exist."""
        with app.app_context():
            total_specs = Specialization.query.count()
            self.assertGreaterEqual(total_specs, 12, "Should have at least 12 specializations")
            
            cardio = Specialization.query.filter((Specialization.name == "Cardiology") | (Specialization.slug == "cardiology")).first()
            self.assertIsNotNone(cardio, "Cardiology specialization must exist")
            neuro = Specialization.query.filter_by(slug="neurology").first()
            self.assertIsNotNone(neuro, "Neurology specialization must exist")

    def test_03_existing_data_preservation(self):
        """Verify pre-existing users (32), appointments (5), and doctors (1-6) are preserved."""
        with app.app_context():
            user_count = User.query.count()
            self.assertGreaterEqual(user_count, 32, f"Expected at least 32 preserved users, got {user_count}")

            appointment_count = Appointment.query.count()
            self.assertEqual(appointment_count, 5, f"Expected 5 preserved appointments, got {appointment_count}")

            for doc_id in range(1, 7):
                doc = db.session.get(Doctor, doc_id)
                self.assertIsNotNone(doc, f"Original Doctor id={doc_id} must be preserved")

    def test_04_real_verified_doctors_attributes(self):
        """Verify the 10 real doctors are marked verified with official profile and source URLs."""
        with app.app_context():
            verified_docs = Doctor.query.filter_by(is_verified=True).all()
            self.assertGreaterEqual(len(verified_docs), 10, "Should have at least 10 verified doctors")

            for doc in verified_docs:
                self.assertFalse(doc.is_demo, f"Verified doctor {doc.name} should not be marked demo")
                self.assertTrue(doc.profile_url or doc.source_url, f"Verified doctor {doc.name} must have profile/source citation")
                self.assertEqual(doc.verification_status, "Verified Clinician")

            # Check specific doctor Dr. Pratap Chandra Rath
            dr_rath = Doctor.query.filter(Doctor.name.ilike("%Pratap Chandra Rath%")).first()
            self.assertIsNotNone(dr_rath, "Dr. Pratap Chandra Rath must exist")
            self.assertTrue(dr_rath.is_verified)
            self.assertIn("apollohospitals.com", dr_rath.profile_url.lower())

            # Check Dr. B. Bhaskar Rao
            dr_rao = Doctor.query.filter(Doctor.name.ilike("%Bhaskar Rao%")).first()
            self.assertIsNotNone(dr_rao, "Dr. B. Bhaskar Rao must exist")
            self.assertTrue(dr_rao.is_verified)
            self.assertIn("kimshospitals.com", dr_rao.profile_url.lower())

    def test_05_demo_doctors_safety(self):
        """Verify demo doctors are marked unverified and have no fake government registration numbers."""
        with app.app_context():
            demo_docs = Doctor.query.filter_by(is_demo=True).all()
            self.assertGreaterEqual(len(demo_docs), 19, "Should have demo doctors for hospitals without public listings")

            for doc in demo_docs:
                self.assertFalse(doc.is_verified, f"Demo doctor {doc.name} cannot be marked is_verified=True")
                if doc.id > 6:
                    # Newly seeded demo doctors must have no fake registration number
                    self.assertFalse(doc.registration_number, f"New demo doctor {doc.name} should not have a registration number")
                    self.assertIn("Demo", doc.about, f"Demo doctor {doc.name} should have a demo notice in about field")

    def test_06_api_get_hospitals(self):
        """Test GET /api/hospitals endpoint with state and city filters."""
        res = self.client.get('/api/hospitals')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertGreaterEqual(data['total'], 24)
        self.assertIn('cities', data)
        self.assertIn('states', data)

        # Test state filter: Andhra Pradesh
        res_ap = self.client.get('/api/hospitals?state=Andhra+Pradesh')
        self.assertEqual(res_ap.status_code, 200)
        data_ap = res_ap.get_json()
        for h in data_ap['hospitals']:
            self.assertEqual(h['state'], 'Andhra Pradesh')

        # Test state filter: Telangana
        res_ts = self.client.get('/api/hospitals?state=Telangana')
        self.assertEqual(res_ts.status_code, 200)
        data_ts = res_ts.get_json()
        for h in data_ts['hospitals']:
            self.assertEqual(h['state'], 'Telangana')

    def test_07_api_get_doctors(self):
        """Test GET /api/doctors endpoint and search functionality."""
        res = self.client.get('/api/doctors?limit=50')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertGreaterEqual(data['total'], 30)

        # Search by AP city: Visakhapatnam
        res_vizag = self.client.get('/api/doctors?search=Visakhapatnam')
        self.assertEqual(res_vizag.status_code, 200)
        data_vizag = res_vizag.get_json()
        self.assertGreater(data_vizag['total'], 0, "Doctors should be found when searching Visakhapatnam")

        # Search by TS city: Hyderabad
        res_hyd = self.client.get('/api/doctors?search=Hyderabad')
        self.assertEqual(res_hyd.status_code, 200)
        data_hyd = res_hyd.get_json()
        self.assertGreater(data_hyd['total'], 0, "Doctors should be found when searching Hyderabad")

    def test_08_api_doctor_details_and_serialization(self):
        """Test GET /api/doctors/<id> serializes verification and affiliation properly."""
        with app.app_context():
            doc = Doctor.query.filter_by(is_verified=True).first()
            doc_id = doc.id

        res = self.client.get(f'/api/doctors/{doc_id}')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        doc_dict = data['doctor']
        self.assertTrue(doc_dict['is_verified'])
        self.assertFalse(doc_dict['is_demo'])
        self.assertEqual(doc_dict['verification_status'], 'Verified Clinician')
        self.assertTrue(doc_dict['profile_url'])
        self.assertIsNotNone(doc_dict.get('hospital_details'))


if __name__ == '__main__':
    unittest.main()

