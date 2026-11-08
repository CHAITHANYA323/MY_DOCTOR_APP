"""
MediConnect Phase 3 Test Suite: Doctor Search, Filtering, Sorting, and Discovery
Isolated testing using temporary SQLite databases.
Guarantees zero access/mutations against existing development/production databases.
"""

import os
import sys
import tempfile
import uuid
import shutil
import unittest
import json

# Force isolated temporary database BEFORE importing any application modules
_TEMP_TEST_DIR_PATH = os.path.join(tempfile.gettempdir(), f"phase3_test_{uuid.uuid4().hex[:8]}")
os.makedirs(_TEMP_TEST_DIR_PATH, exist_ok=True)
_TEMP_DB_PATH = os.path.join(_TEMP_TEST_DIR_PATH, "test_phase3.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEMP_DB_PATH}"

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app, initialize_database
from models import db, Doctor, Specialization, Hospital, User, Appointment, Review


class TestPhase3DoctorSearchAndFilter(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from config import Config
        Config.DATABASE_URL = f"sqlite:///{_TEMP_DB_PATH}"
        os.environ["DATABASE_URL"] = f"sqlite:///{_TEMP_DB_PATH}"
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            db.drop_all()
            db.create_all()
            from seed import run_seed
            run_seed()

            # The seeder creates 14 doctors, 20 specializations, 6 hospitals, and patient user
            # Let's add an Inactive doctor to verify inactive doctor filtering
            apollo = Hospital.query.filter_by(slug="apollo-hospitals-visakhapatnam").first()
            cardio = Specialization.query.filter_by(slug="cardiologist").first()

            inactive_doc = Doctor(
                name="Dr. Inactive Doctor",
                gender="Male",
                image="inactive.jpg",
                qualification="MBBS",
                experience=5,
                specialization_id=cardio.id if cardio else 1,
                hospital_id=apollo.id if apollo else 1,
                location="Visakhapatnam",
                consultation_fee=500.0,
                available_days="Monday",
                status="Inactive",
                rating=4.0,
                total_reviews=2
            )
            db.session.add(inactive_doc)
            db.session.commit()

            rajesh = Doctor.query.filter_by(name="Dr. Rajesh Kumar").first()
            cls.rajesh_id = rajesh.id if rajesh else 1
            cls.apollo_id = apollo.id if apollo else 1

            patient = User.query.filter_by(email="patient@medicare.com").first()
            cls.patient_id = patient.id if patient else 2

    @classmethod
    def tearDownClass(cls):
        with cls.app.app_context():
            db.session.remove()
            db.engine.dispose()
        os.environ.pop("DATABASE_URL", None)
        try:
            shutil.rmtree(_TEMP_TEST_DIR_PATH, ignore_errors=True)
        except Exception:
            pass

    # 1. Doctor Name Search
    def test_01_doctor_name_search(self):
        res = self.client.get('/api/doctors?search=Rajesh')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        names = [d['name'] for d in data['doctors']]
        self.assertIn("Dr. Rajesh Kumar", names)
        self.assertNotIn("Dr. Ananya Sen", names)

    # 2. Case-Insensitive Search
    def test_02_case_insensitive_search(self):
        res_lower = self.client.get('/api/doctors?search=rajesh')
        res_upper = self.client.get('/api/doctors?search=RAJESH')
        self.assertEqual(res_lower.status_code, 200)
        self.assertEqual(res_upper.status_code, 200)
        data_lower = res_lower.get_json()
        data_upper = res_upper.get_json()
        self.assertEqual(data_lower['total'], data_upper['total'])
        self.assertTrue(any(d['name'] == "Dr. Rajesh Kumar" for d in data_lower['doctors']))

    # 3. Specialization Search
    def test_03_specialization_search(self):
        # By global search text
        res = self.client.get('/api/doctors?search=Neurologist')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        names = [d['name'] for d in data['doctors']]
        self.assertIn("Dr. Ananya Sen", names)
        self.assertNotIn("Dr. Rajesh Kumar", names)

        # By specialization filter parameter
        res_filter = self.client.get('/api/doctors?specialization=Neurologist')
        self.assertEqual(res_filter.status_code, 200)
        data_filter = res_filter.get_json()
        self.assertTrue(any(d['name'] == "Dr. Ananya Sen" for d in data_filter['doctors']))

    # 4. Hospital Search
    def test_04_hospital_search(self):
        # By global search text
        res = self.client.get('/api/doctors?search=Fortis')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(any(d['name'] == "Dr. Ananya Sen" for d in data['doctors']))

        # By hospital filter parameter
        res_filter = self.client.get('/api/doctors?hospital=Fortis')
        self.assertEqual(res_filter.status_code, 200)
        data_filter = res_filter.get_json()
        names = [d['name'] for d in data_filter['doctors']]
        self.assertIn("Dr. Ananya Sen", names)
        self.assertNotIn("Dr. Rajesh Kumar", names)

    # 5. Location Search
    def test_05_location_search(self):
        res = self.client.get('/api/doctors?location=Visakhapatnam')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        names = [d['name'] for d in data['doctors']]
        self.assertIn("Dr. Rajesh Kumar", names)
        self.assertNotIn("Dr. Ananya Sen", names)

    # 6. Combined Search + Specialization (Regression for Shadowing Bug-1)
    def test_06_combined_search_plus_specialization(self):
        # Searching 'Rajesh' while filtering by 'Dentist' must return 0 results (Rajesh is a Cardiologist)
        res_conflict = self.client.get('/api/doctors?search=Rajesh&specialization=Dentist')
        self.assertEqual(res_conflict.status_code, 200)
        data_conflict = res_conflict.get_json()
        self.assertEqual(data_conflict['total'], 0)
        self.assertEqual(len(data_conflict['doctors']), 0)

        # Searching 'Rajesh' with 'Cardiologist' must return Dr. Rajesh Kumar
        res_match = self.client.get('/api/doctors?search=Rajesh&specialization=Cardiologist')
        self.assertEqual(res_match.status_code, 200)
        data_match = res_match.get_json()
        self.assertEqual(data_match['total'], 1)
        self.assertEqual(data_match['doctors'][0]['name'], "Dr. Rajesh Kumar")

    # 7. Combined Search + Hospital (Regression for Shadowing Bug-1)
    def test_07_combined_search_plus_hospital(self):
        # Searching 'Rajesh' while filtering by 'Fortis Hospital' must return 0 (Rajesh is at Apollo)
        res_conflict = self.client.get('/api/doctors?search=Rajesh&hospital=Fortis')
        self.assertEqual(res_conflict.status_code, 200)
        data_conflict = res_conflict.get_json()
        self.assertEqual(data_conflict['total'], 0)

        # Searching 'Rajesh' with 'Apollo Hospitals' must return Dr. Rajesh Kumar
        res_match = self.client.get('/api/doctors?search=Rajesh&hospital=Apollo')
        self.assertEqual(res_match.status_code, 200)
        data_match = res_match.get_json()
        self.assertEqual(data_match['total'], 1)
        self.assertEqual(data_match['doctors'][0]['name'], "Dr. Rajesh Kumar")

    # 8. Specialization + Hospital + Location Combined
    def test_08_combined_spec_hosp_location(self):
        res = self.client.get('/api/doctors?specialization=Cardiologist&hospital=Apollo&location=Visakhapatnam')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['total'], 1)
        self.assertEqual(data['doctors'][0]['name'], "Dr. Rajesh Kumar")

    # 9. Minimum and Maximum Fee Range
    def test_09_fee_range_filtering(self):
        # Fee between 750 and 850 (Should match Rajesh Kumar at 800)
        res = self.client.get('/api/doctors?min_fee=750&max_fee=850')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        fees = [d['consultation_fee'] for d in data['doctors']]
        for f in fees:
            self.assertTrue(750 <= f <= 850)
        names = [d['name'] for d in data['doctors']]
        self.assertIn("Dr. Rajesh Kumar", names)

        # Max fee only (<= 500)
        res_max = self.client.get('/api/doctors?max_fee=500')
        self.assertEqual(res_max.status_code, 200)
        data_max = res_max.get_json()
        fees_max = [d['consultation_fee'] for d in data_max['doctors']]
        for f in fees_max:
            self.assertTrue(f <= 500)

    # 10. Invalid Page and Limit Values (Never HTTP 500)
    def test_10_invalid_page_and_limit(self):
        res = self.client.get('/api/doctors?page=invalid&limit=abc')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['page'], 1)
        self.assertEqual(data['limit'], 12)

    # 11. Very Large Limit Clamped to 100
    def test_11_large_limit_clamped(self):
        res = self.client.get('/api/doctors?limit=999999')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['limit'], 100)

    # 12. Negative Numeric Parameters Handled Safely
    def test_12_negative_numeric_parameters(self):
        # Negative page and limit clamped to defaults
        res_page = self.client.get('/api/doctors?page=-5&limit=-10')
        self.assertEqual(res_page.status_code, 200)
        data_page = res_page.get_json()
        self.assertEqual(data_page['page'], 1)
        self.assertEqual(data_page['limit'], 12)

        # Negative fee returns clear 400 Bad Request
        res_fee = self.client.get('/api/doctors?min_fee=-100')
        self.assertEqual(res_fee.status_code, 400)
        self.assertFalse(res_fee.get_json()['success'])

        # Negative experience returns clear 400 Bad Request
        res_exp = self.client.get('/api/doctors?min_experience=-3')
        self.assertEqual(res_exp.status_code, 400)
        self.assertFalse(res_exp.get_json()['success'])

    # 13. Invalid Fee Range (min_fee > max_fee returns HTTP 400)
    def test_13_invalid_fee_range(self):
        res = self.client.get('/api/doctors?min_fee=1000&max_fee=500')
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertIn("cannot be greater than", data['message'])

    # 14. All Sorting Options
    def test_14_all_sorting_options(self):
        # fee_asc: lowest to highest
        res_fee_asc = self.client.get('/api/doctors?sort_by=fee_asc')
        self.assertEqual(res_fee_asc.status_code, 200)
        fees_asc = [d['consultation_fee'] for d in res_fee_asc.get_json()['doctors']]
        self.assertEqual(fees_asc, sorted(fees_asc))

        # fee_desc: highest to lowest
        res_fee_desc = self.client.get('/api/doctors?sort_by=fee_desc')
        self.assertEqual(res_fee_desc.status_code, 200)
        fees_desc = [d['consultation_fee'] for d in res_fee_desc.get_json()['doctors']]
        self.assertEqual(fees_desc, sorted(fees_desc, reverse=True))

        # experience_desc: most experienced first
        res_exp = self.client.get('/api/doctors?sort_by=experience_desc')
        self.assertEqual(res_exp.status_code, 200)
        exps = [d['experience'] for d in res_exp.get_json()['doctors']]
        self.assertEqual(exps, sorted(exps, reverse=True))

        # name_asc: alphabetical
        res_name = self.client.get('/api/doctors?sort_by=name_asc')
        self.assertEqual(res_name.status_code, 200)
        names = [d['name'] for d in res_name.get_json()['doctors']]
        self.assertEqual(names, sorted(names))

        # rating_asc: lowest rating first
        res_rating = self.client.get('/api/doctors?sort_by=rating_asc')
        self.assertEqual(res_rating.status_code, 200)
        ratings = [d['rating'] for d in res_rating.get_json()['doctors']]
        self.assertEqual(ratings, sorted(ratings))

    # 15. Stable Pagination with Duplicate Values (Tied secondary key)
    def test_15_stable_pagination_tied_values(self):
        # Fetch page 1 with limit 4, sorted by fee_asc
        res_p1 = self.client.get('/api/doctors?sort_by=fee_asc&page=1&limit=4')
        self.assertEqual(res_p1.status_code, 200)
        ids_p1 = [d['id'] for d in res_p1.get_json()['doctors']]

        # Fetch page 2 with limit 4
        res_p2 = self.client.get('/api/doctors?sort_by=fee_asc&page=2&limit=4')
        self.assertEqual(res_p2.status_code, 200)
        ids_p2 = [d['id'] for d in res_p2.get_json()['doctors']]

        # Ensure no duplicate records appear on both page 1 and page 2
        overlap = set(ids_p1).intersection(set(ids_p2))
        self.assertEqual(len(overlap), 0, f"Pagination overlap found: {overlap}")

    # 16. Empty Search Results
    def test_16_empty_search_results(self):
        res = self.client.get('/api/doctors?search=ZzzNonExistentString12345')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['total'], 0)
        self.assertEqual(len(data['doctors']), 0)
        self.assertEqual(data['total_pages'], 0)

    # 17. Doctor Details API Regression
    def test_17_doctor_details_api(self):
        res = self.client.get(f'/api/doctors/{self.rajesh_id}')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        doc = data['doctor']
        self.assertEqual(doc['name'], "Dr. Rajesh Kumar")
        self.assertEqual(doc['specialization_name'], "Cardiologist")
        self.assertEqual(doc['hospital_name'], "Apollo Hospitals")
        self.assertIn('reviews', doc)

    # 18. Appointment Booking Regression
    def test_18_appointment_booking_regression(self):
        import jwt
        from datetime import datetime, timezone, timedelta
        from config import Config

        token = jwt.encode({
            'user_id': self.patient_id,
            'email': 'patient@medicare.com',
            'role': 'USER',
            'exp': datetime.now(timezone.utc) + timedelta(hours=1)
        }, Config.SECRET_KEY, algorithm='HS256')

        res_book = self.client.post('/api/appointments',
            headers={'Authorization': f'Bearer {token}'},
            json={
                'doctor_id': self.rajesh_id,
                'hospital_id': self.apollo_id,
                'appointment_date': '2027-02-15',
                'appointment_time': '10:00 AM',
                'reason': 'Routine heart checkup'
            }
        )
        self.assertEqual(res_book.status_code, 201)
        data = res_book.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['appointment']['appointment_time'], "10:00 AM")

        # Slot availability check
        res_slots = self.client.get(f'/api/appointments/booked-slots?doctor_id={self.rajesh_id}&date=2027-02-15')
        self.assertEqual(res_slots.status_code, 200)
        slots_data = res_slots.get_json()
        self.assertIn("10:00 AM", slots_data['booked_slots'])

    @classmethod
    def tearDownClass(cls):
        try:
            with cls.app.app_context():
                db.session.remove()
                db.engine.dispose()
        except Exception:
            pass
        os.environ.pop("DATABASE_URL", None)
        from config import Config
        Config.DATABASE_URL = None
        if os.path.exists(_TEMP_TEST_DIR_PATH):
            try:
                shutil.rmtree(_TEMP_TEST_DIR_PATH)
            except Exception:
                pass


if __name__ == '__main__':
    unittest.main()
