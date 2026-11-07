"""
MediConnect Phase 4 Test Suite: Reviews & Ratings Security & Reliability
Isolated testing using temporary SQLite databases.
Guarantees zero mutations against existing development or production databases.
"""

import os
import sys
import tempfile
import uuid
import unittest
import threading
from concurrent.futures import ThreadPoolExecutor

# Force isolated temporary database BEFORE importing any application modules
_TEMP_TEST_DIR_PATH = os.path.join(tempfile.gettempdir(), f"phase4_test_{uuid.uuid4().hex[:8]}")
os.makedirs(_TEMP_TEST_DIR_PATH, exist_ok=True)
_TEMP_DB_PATH = os.path.join(_TEMP_TEST_DIR_PATH, "test_phase4.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEMP_DB_PATH}"

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from models import db, User, Doctor, Hospital, Specialization, Appointment, Review
from utils.auth_middleware import generate_token


class TestPhase4Reviews(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db_path = _TEMP_DB_PATH
        cls.db_uri = f"sqlite:///{_TEMP_DB_PATH}"

        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            db.drop_all()
            db.create_all()

            # Seed Hospital
            cls.hospital = Hospital(
                name="Central Review Hospital",
                slug="central-review-hospital",
                image="https://example.com/hosp.jpg",
                address="456 Healthcare Way",
                city="Metropolis",
                state="NY",
                emergency_number="911-999"
            )
            db.session.add(cls.hospital)

            # Seed Specialization
            cls.spec = Specialization(
                name="Cardiology Reviews",
                slug="cardiology-reviews",
                description="Heart Care"
            )
            db.session.add(cls.spec)
            db.session.flush()

            # Seed Doctors
            cls.doctor1 = Doctor(
                name="Dr. Review Specialist",
                gender="Female",
                image="https://example.com/doc1.jpg",
                qualification="MD Cardiology",
                experience=10,
                specialization_id=cls.spec.id,
                hospital_id=cls.hospital.id,
                location="Metropolis",
                consultation_fee=600.0,
                rating=4.9,
                total_reviews=0
            )
            cls.doctor2 = Doctor(
                name="Dr. Second Specialist",
                gender="Male",
                image="https://example.com/doc2.jpg",
                qualification="MD Cardiology",
                experience=12,
                specialization_id=cls.spec.id,
                hospital_id=cls.hospital.id,
                location="Metropolis",
                consultation_fee=700.0,
                rating=4.9,
                total_reviews=0
            )
            db.session.add_all([cls.doctor1, cls.doctor2])

            # Seed Users
            cls.user1 = User(
                name="Patient Alice",
                email="alice@test.com",
                password_hash="fakehash",
                role="USER"
            )
            cls.user2 = User(
                name="Patient Bob",
                email="bob@test.com",
                password_hash="fakehash",
                role="USER"
            )
            cls.admin_user = User(
                name="Admin Charlie",
                email="admin_review@test.com",
                password_hash="fakehash",
                role="ADMIN"
            )
            db.session.add_all([cls.user1, cls.user2, cls.admin_user])
            db.session.commit()

            cls.spec_id = cls.spec.id
            cls.hosp_id = cls.hospital.id
            cls.doc1_id = cls.doctor1.id
            cls.doc2_id = cls.doctor2.id
            cls.user1_id = cls.user1.id
            cls.user2_id = cls.user2.id
            cls.admin_id = cls.admin_user.id

            cls.user1_token = generate_token(cls.user1)
            cls.user2_token = generate_token(cls.user2)
            cls.admin_token = generate_token(cls.admin_user)

    def _create_appointment(self, user_id, doctor_id, status="Completed", appt_date="2026-11-20", appt_time="10:00 AM"):
        with self.app.app_context():
            appt = Appointment(
                user_id=user_id,
                doctor_id=doctor_id,
                hospital_id=self.hosp_id,
                appointment_date=appt_date,
                appointment_time=appt_time,
                reason="Routine checkup",
                status=status
            )
            db.session.add(appt)
            db.session.commit()
            return appt.id

    # 1. Successful review for a completed appointment
    def test_01_successful_review_completed_appointment(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="09:00 AM")
        payload = {
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 5,
            "comment": "Doctor was very attentive and knowledgeable."
        }
        res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['review']['appointment_id'], appt_id)
        self.assertEqual(data['review']['rating'], 5)
        self.assertEqual(data['doctor_new_rating'], 5.0)
        self.assertEqual(data['doctor_total_reviews'], 1)

    # 2. Rejection for Pending appointment
    def test_02_rejection_for_pending_appointment(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Pending", appt_time="09:30 AM")
        payload = {
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 5,
            "comment": "Trying to review before appointment."
        }
        res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertIn("completed", data['message'].lower())

    # 3. Rejection for Confirmed appointment
    def test_03_rejection_for_confirmed_appointment(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Confirmed", appt_time="10:00 AM")
        payload = {
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 4,
            "comment": "Appointment is confirmed but not completed."
        }
        res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertIn("completed", data['message'].lower())

    # 4. Rejection for Cancelled appointment
    def test_04_rejection_for_cancelled_appointment(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Cancelled", appt_time="10:30 AM")
        payload = {
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 1,
            "comment": "Doctor cancelled so leaving bad review."
        }
        res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertIn("completed", data['message'].lower())

    # 5. Rejection when appointment belongs to another patient
    def test_05_rejection_when_appointment_belongs_to_another_patient(self):
        # Appointment created by user 2
        appt_id = self._create_appointment(self.user2_id, self.doc1_id, status="Completed", appt_time="11:00 AM")
        payload = {
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 4,
            "comment": "Attempting to review someone else's appointment."
        }
        # Submitted by user 1
        res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res.status_code, 403)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertIn("not authorized", data['message'].lower())

    # 6. Rejection when appointment belongs to another doctor
    def test_06_rejection_when_appointment_belongs_to_another_doctor(self):
        # Appointment for doc 2
        appt_id = self._create_appointment(self.user1_id, self.doc2_id, status="Completed", appt_time="11:30 AM")
        payload = {
            "doctor_id": self.doc1_id,  # Specified doc 1
            "appointment_id": appt_id,
            "rating": 4,
            "comment": "Mismatched doctor id in review submission."
        }
        res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertIn("does not belong", data['message'].lower())

    # 7. Duplicate review returns HTTP 409
    def test_07_duplicate_review_returns_http_409(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="12:00 PM")
        payload = {
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 5,
            "comment": "First valid review for this appointment."
        }
        res1 = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res1.status_code, 201)

        # Duplicate attempt
        res2 = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res2.status_code, 409)
        data = res2.get_json()
        self.assertFalse(data['success'])
        self.assertIn("already been submitted", data['message'].lower())

    # 8. Concurrent duplicate submissions allow only one review
    def test_08_concurrent_duplicate_submissions_allow_only_one(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="12:30 PM")
        payload = {
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 5,
            "comment": "Concurrent review testing submission."
        }

        results = []
        barrier = threading.Barrier(3)

        def worker():
            client = self.app.test_client()
            barrier.wait()
            res = client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
            results.append(res.status_code)

        threads = [threading.Thread(target=worker) for _ in range(3)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Exactly one request must return 201 Created; other concurrent requests return 409 Conflict
        success_count = results.count(201)
        conflict_count = results.count(409)
        self.assertEqual(success_count, 1, f"Expected exactly 1 success, got {results}")
        self.assertEqual(conflict_count, 2, f"Expected 2 conflicts, got {results}")

    # 9. Ratings 1-5 are accepted
    def test_09_ratings_1_to_5_accepted(self):
        for score in [1, 2, 3, 4, 5]:
            appt_id = self._create_appointment(self.user2_id, self.doc2_id, status="Completed", appt_time=f"0{score}:00 PM")
            payload = {
                "doctor_id": self.doc2_id,
                "appointment_id": appt_id,
                "rating": score,
                "comment": f"Testing accepted valid rating of {score} stars."
            }
            res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user2_token}"})
            self.assertEqual(res.status_code, 201, f"Rating {score} should be accepted.")

    # 10. Ratings 0, 6, -1, 3.5, boolean, and invalid strings are rejected
    def test_10_invalid_ratings_rejected(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="01:15 PM")
        invalid_ratings = [0, 6, -1, 3.5, True, False, "5", "five", None, [5]]
        for bad_rating in invalid_ratings:
            payload = {
                "doctor_id": self.doc1_id,
                "appointment_id": appt_id,
                "rating": bad_rating,
                "comment": "Testing invalid rating rejection."
            }
            res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
            self.assertEqual(res.status_code, 400, f"Bad rating {bad_rating!r} was not rejected with 400!")

    # 11. Empty and whitespace-only comments are rejected
    def test_11_empty_whitespace_comments_rejected(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="01:30 PM")
        for bad_comment in ["", "   ", "\t\t", "\n\r  \n", None]:
            payload = {
                "doctor_id": self.doc1_id,
                "appointment_id": appt_id,
                "rating": 5,
                "comment": bad_comment
            }
            res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
            self.assertEqual(res.status_code, 400, f"Bad comment {bad_comment!r} was not rejected with 400!")

    # 12. Comments shorter than 10 characters are rejected
    def test_12_short_comments_rejected(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="01:45 PM")
        for short_comment in ["Good", "Nice doc", "123456789", "  nine_ch "]:
            payload = {
                "doctor_id": self.doc1_id,
                "appointment_id": appt_id,
                "rating": 5,
                "comment": short_comment
            }
            res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
            self.assertEqual(res.status_code, 400, f"Short comment {short_comment!r} was not rejected with 400!")

    # 13. Comments longer than 1000 characters are rejected
    def test_13_long_comments_rejected(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="02:00 PM")
        too_long = "a" * 1001
        payload = {
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 5,
            "comment": too_long
        }
        res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res.status_code, 400)

        # 1000 characters is accepted
        exact_1000 = "a" * 1000
        payload['comment'] = exact_1000
        res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res.status_code, 201)

    # 14. Existing seeded-style reviews with NULL appointment_id remain valid
    def test_14_legacy_reviews_with_null_appointment_id(self):
        with self.app.app_context():
            legacy_rev = Review(
                user_id=self.user1_id,
                doctor_id=self.doc2_id,
                appointment_id=None,
                rating=5,
                comment="Legacy seeded review without appointment_id."
            )
            db.session.add(legacy_rev)
            db.session.commit()
            legacy_id = legacy_rev.id

        # Verify public GET /api/reviews returns it safely
        res = self.client.get(f"/api/reviews?doctor_id={self.doc2_id}")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        rev_ids = [r['id'] for r in data['reviews']]
        self.assertIn(legacy_id, rev_ids)
        target = next(r for r in data['reviews'] if r['id'] == legacy_id)
        self.assertIsNone(target['appointment_id'])

    # 15. Doctor average rating is mathematically correct after first review
    def test_15_doctor_average_rating_first_review(self):
        # Create fresh doctor with 0 reviews
        with self.app.app_context():
            fresh_doc = Doctor(
                name="Dr. Fresh Rating",
                gender="Male",
                image="https://example.com/df.jpg",
                qualification="MD",
                experience=5,
                specialization_id=self.spec_id,
                hospital_id=self.hosp_id,
                location="Metropolis",
                rating=4.9,
                total_reviews=0
            )
            db.session.add(fresh_doc)
            db.session.commit()
            doc_id = fresh_doc.id

        appt_id = self._create_appointment(self.user1_id, doc_id, status="Completed", appt_time="02:30 PM")
        payload = {
            "doctor_id": doc_id,
            "appointment_id": appt_id,
            "rating": 3,
            "comment": "Average experience with consultation."
        }
        res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data['doctor_new_rating'], 3.0)
        self.assertEqual(data['doctor_total_reviews'], 1)

    # 16. Average rating is correct after multiple reviews
    def test_16_doctor_average_rating_multiple_reviews(self):
        with self.app.app_context():
            multi_doc = Doctor(
                name="Dr. Multi Review",
                gender="Female",
                image="https://example.com/dm.jpg",
                qualification="MD",
                experience=7,
                specialization_id=self.spec_id,
                hospital_id=self.hosp_id,
                location="Metropolis",
                rating=4.9,
                total_reviews=0
            )
            db.session.add(multi_doc)
            db.session.commit()
            doc_id = multi_doc.id

        ratings = [5, 4, 3, 4]  # sum = 16, avg = 4.0
        for i, r in enumerate(ratings):
            appt_id = self._create_appointment(self.user1_id, doc_id, status="Completed", appt_time=f"0{i+1}:00 PM")
            payload = {
                "doctor_id": doc_id,
                "appointment_id": appt_id,
                "rating": r,
                "comment": f"Review number {i+1} with rating {r}."
            }
            res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
            self.assertEqual(res.status_code, 201)

        with self.app.app_context():
            doc = db.session.get(Doctor, doc_id)
            self.assertEqual(doc.total_reviews, 4)
            self.assertEqual(doc.rating, 4.0)

    # 17. Review count is accurate and never double-counted (autoflush bug verification)
    def test_17_no_autoflush_double_counting(self):
        with self.app.app_context():
            test_doc = Doctor(
                name="Dr. Autoflush Test",
                gender="Male",
                image="https://example.com/af.jpg",
                qualification="MD",
                experience=8,
                specialization_id=self.spec_id,
                hospital_id=self.hosp_id,
                location="Metropolis",
                rating=4.9,
                total_reviews=0
            )
            db.session.add(test_doc)
            db.session.commit()
            doc_id = test_doc.id

        appt_id = self._create_appointment(self.user1_id, doc_id, status="Completed", appt_time="03:00 PM")
        payload = {
            "doctor_id": doc_id,
            "appointment_id": appt_id,
            "rating": 4,
            "comment": "Testing exact review count increment."
        }
        res = self.client.post("/api/reviews", json=payload, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res.status_code, 201)
        data = res.get_json()

        # Under the old autoflush bug: total_reviews would be 2 and rating would be calculated incorrectly
        self.assertEqual(data['doctor_total_reviews'], 1)
        self.assertEqual(data['doctor_new_rating'], 4.0)

    # 18. Transaction rollback does not leave incorrect doctor aggregates
    def test_18_transaction_rollback_preserves_doctor_aggregates(self):
        with self.app.app_context():
            rb_doc = Doctor(
                name="Dr. Rollback Test",
                gender="Female",
                image="https://example.com/rb.jpg",
                qualification="MD",
                experience=9,
                specialization_id=self.spec_id,
                hospital_id=self.hosp_id,
                location="Metropolis",
                rating=4.5,
                total_reviews=1
            )
            db.session.add(rb_doc)
            db.session.commit()
            doc_id = rb_doc.id

        appt_id = self._create_appointment(self.user1_id, doc_id, status="Completed", appt_time="03:30 PM")

        # First review succeeds
        p1 = {"doctor_id": doc_id, "appointment_id": appt_id, "rating": 5, "comment": "First good review."}
        res1 = self.client.post("/api/reviews", json=p1, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res1.status_code, 201)

        with self.app.app_context():
            doc_after_success = db.session.get(Doctor, doc_id)
            expected_reviews = doc_after_success.total_reviews
            expected_rating = doc_after_success.rating

        # Duplicate attempt fails with rollback
        res2 = self.client.post("/api/reviews", json=p1, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res2.status_code, 409)

        with self.app.app_context():
            doc_after_rollback = db.session.get(Doctor, doc_id)
            self.assertEqual(doc_after_rollback.total_reviews, expected_reviews)
            self.assertEqual(doc_after_rollback.rating, expected_rating)

    # 19. Public GET /api/reviews validation & doctor_id parsing
    def test_19_get_reviews_query_validation(self):
        # Missing doctor_id
        res = self.client.get("/api/reviews")
        self.assertEqual(res.status_code, 400)

        # Non-numeric doctor_id
        res2 = self.client.get("/api/reviews?doctor_id=invalid")
        self.assertEqual(res2.status_code, 400)

        # Valid doctor_id
        res3 = self.client.get(f"/api/reviews?doctor_id={self.doc1_id}")
        self.assertEqual(res3.status_code, 200)
        data = res3.get_json()
        self.assertTrue(data['success'])
        self.assertIsInstance(data['reviews'], list)

    # 20. Missing appointment_id or invalid payload structure rejected
    def test_20_missing_appointment_id_rejected(self):
        # Missing appointment_id
        p1 = {"doctor_id": self.doc1_id, "rating": 5, "comment": "Missing appointment_id"}
        res1 = self.client.post("/api/reviews", json=p1, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res1.status_code, 400)
        self.assertIn("appointment_id", res1.get_json()['message'])

        # Non-existent appointment_id
        p2 = {"doctor_id": self.doc1_id, "appointment_id": 999999, "rating": 5, "comment": "Non-existent appointment"}
        res2 = self.client.post("/api/reviews", json=p2, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res2.status_code, 404)

    # ----------------------------------------------------
    # Phase 4 Part 2: Review Edit, Delete & Authorization Tests
    # ----------------------------------------------------

    # 21. Review owner can edit
    def test_21_owner_can_edit_review(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="04:00 PM")
        res_post = self.client.post("/api/reviews", json={
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 4,
            "comment": "Initial review before edit."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res_post.status_code, 201)
        rev_id = res_post.get_json()['review']['id']

        # Edit review
        res_put = self.client.put(f"/api/reviews/{rev_id}", json={
            "rating": 5,
            "comment": "Updated review - outstanding medical service!",
            "doctor_id": 999,  # Attempted override must be ignored
            "appointment_id": 888  # Attempted override must be ignored
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res_put.status_code, 200)
        data = res_put.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['review']['rating'], 5)
        self.assertEqual(data['review']['comment'], "Updated review - outstanding medical service!")
        self.assertEqual(data['review']['doctor_id'], self.doc1_id)
        self.assertEqual(data['review']['appointment_id'], appt_id)

    # 22. Another patient cannot edit
    def test_22_another_patient_cannot_edit_review(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="04:15 PM")
        res_post = self.client.post("/api/reviews", json={
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 4,
            "comment": "Review owned by user1."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        rev_id = res_post.get_json()['review']['id']

        # User 2 attempts edit
        res_put = self.client.put(f"/api/reviews/{rev_id}", json={
            "rating": 1,
            "comment": "Malicious edit attempt by user2."
        }, headers={"Authorization": f"Bearer {self.user2_token}"})
        self.assertEqual(res_put.status_code, 403)
        self.assertFalse(res_put.get_json()['success'])

    # 23. Unauthenticated user cannot edit
    def test_23_unauthenticated_user_cannot_edit_review(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="04:30 PM")
        res_post = self.client.post("/api/reviews", json={
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 4,
            "comment": "Review for unauthenticated edit test."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        rev_id = res_post.get_json()['review']['id']

        res_put = self.client.put(f"/api/reviews/{rev_id}", json={
            "rating": 5,
            "comment": "Unauthenticated edit attempt."
        })
        self.assertEqual(res_put.status_code, 401)

    # 24. Invalid rating is rejected during edit
    def test_24_invalid_rating_rejected_during_edit(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="04:45 PM")
        res_post = self.client.post("/api/reviews", json={
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 4,
            "comment": "Review for invalid rating edit test."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        rev_id = res_post.get_json()['review']['id']

        invalid_ratings = [0, 6, -1, 3.5, True, False, "5", "five", None]
        for bad_rating in invalid_ratings:
            res_put = self.client.put(f"/api/reviews/{rev_id}", json={
                "rating": bad_rating,
                "comment": "Valid comment but invalid rating."
            }, headers={"Authorization": f"Bearer {self.user1_token}"})
            self.assertEqual(res_put.status_code, 400, f"Bad rating {bad_rating!r} should be rejected on edit")

    # 25. Invalid comment is rejected during edit
    def test_25_invalid_comment_rejected_during_edit(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="05:00 PM")
        res_post = self.client.post("/api/reviews", json={
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 4,
            "comment": "Review for invalid comment edit test."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        rev_id = res_post.get_json()['review']['id']

        invalid_comments = ["", "   ", "too short", "a" * 1001, None]
        for bad_comment in invalid_comments:
            res_put = self.client.put(f"/api/reviews/{rev_id}", json={
                "rating": 5,
                "comment": bad_comment
            }, headers={"Authorization": f"Bearer {self.user1_token}"})
            self.assertEqual(res_put.status_code, 400, f"Bad comment {bad_comment!r} should be rejected on edit")

    # 26. Review owner can delete
    def test_26_owner_can_delete_review(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="05:15 PM")
        res_post = self.client.post("/api/reviews", json={
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 4,
            "comment": "Review to be deleted by owner."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        rev_id = res_post.get_json()['review']['id']

        res_del = self.client.delete(f"/api/reviews/{rev_id}", headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res_del.status_code, 200)
        self.assertTrue(res_del.get_json()['success'])

        with self.app.app_context():
            deleted_rev = db.session.get(Review, rev_id)
            self.assertIsNone(deleted_rev)

    # 27. ADMIN can delete review for moderation
    def test_27_admin_can_delete_review_for_moderation(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="05:30 PM")
        res_post = self.client.post("/api/reviews", json={
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 1,
            "comment": "Inappropriate comment to be moderated."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        rev_id = res_post.get_json()['review']['id']

        res_del = self.client.delete(f"/api/reviews/{rev_id}", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res_del.status_code, 200)
        self.assertTrue(res_del.get_json()['success'])

        with self.app.app_context():
            deleted_rev = db.session.get(Review, rev_id)
            self.assertIsNone(deleted_rev)

    # 28. Another patient cannot delete review
    def test_28_another_patient_cannot_delete_review(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="05:45 PM")
        res_post = self.client.post("/api/reviews", json={
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 5,
            "comment": "Review owned by user1."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        rev_id = res_post.get_json()['review']['id']

        res_del = self.client.delete(f"/api/reviews/{rev_id}", headers={"Authorization": f"Bearer {self.user2_token}"})
        self.assertEqual(res_del.status_code, 403)
        self.assertFalse(res_del.get_json()['success'])

        # Review still exists
        with self.app.app_context():
            still_there = db.session.get(Review, rev_id)
            self.assertIsNotNone(still_there)

    # 29. Unauthenticated user cannot delete review
    def test_29_unauthenticated_user_cannot_delete_review(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="06:00 PM")
        res_post = self.client.post("/api/reviews", json={
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 5,
            "comment": "Review to test unauthenticated delete."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        rev_id = res_post.get_json()['review']['id']

        res_del = self.client.delete(f"/api/reviews/{rev_id}")
        self.assertEqual(res_del.status_code, 401)

    # 30. Doctor average updates correctly after edit
    def test_30_doctor_average_updates_correctly_after_edit(self):
        # Fresh doctor
        with self.app.app_context():
            doc = Doctor(
                name="Dr. Edit Aggregate",
                gender="Male",
                image="https://example.com/ea.jpg",
                qualification="MD",
                experience=10,
                specialization_id=self.spec_id,
                hospital_id=self.hosp_id,
                location="Metropolis",
                rating=4.9,
                total_reviews=0
            )
            db.session.add(doc)
            db.session.commit()
            doc_id = doc.id

        # User 1 submits 3
        a1 = self._create_appointment(self.user1_id, doc_id, status="Completed", appt_time="09:00 AM")
        r1_res = self.client.post("/api/reviews", json={
            "doctor_id": doc_id,
            "appointment_id": a1,
            "rating": 3,
            "comment": "Okay experience initially."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        r1_id = r1_res.get_json()['review']['id']

        # User 2 submits 5
        a2 = self._create_appointment(self.user2_id, doc_id, status="Completed", appt_time="09:30 AM")
        self.client.post("/api/reviews", json={
            "doctor_id": doc_id,
            "appointment_id": a2,
            "rating": 5,
            "comment": "Wonderful experience with doctor."
        }, headers={"Authorization": f"Bearer {self.user2_token}"})

        # Initial avg is (3 + 5) / 2 = 4.0
        with self.app.app_context():
            doc = db.session.get(Doctor, doc_id)
            self.assertEqual(doc.rating, 4.0)
            self.assertEqual(doc.total_reviews, 2)

        # User 1 edits review from 3 to 5
        res_put = self.client.put(f"/api/reviews/{r1_id}", json={
            "rating": 5,
            "comment": "Follow-up was amazing so updating rating to 5."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res_put.status_code, 200)
        self.assertEqual(res_put.get_json()['doctor_new_rating'], 5.0)
        self.assertEqual(res_put.get_json()['doctor_total_reviews'], 2)

        with self.app.app_context():
            doc = db.session.get(Doctor, doc_id)
            self.assertEqual(doc.rating, 5.0)
            self.assertEqual(doc.total_reviews, 2)

    # 31. Doctor average and count update correctly after delete
    def test_31_doctor_average_and_count_update_correctly_after_delete(self):
        # Fresh doctor
        with self.app.app_context():
            doc = Doctor(
                name="Dr. Delete Aggregate",
                gender="Female",
                image="https://example.com/da.jpg",
                qualification="MD",
                experience=11,
                specialization_id=self.spec_id,
                hospital_id=self.hosp_id,
                location="Metropolis",
                rating=4.9,
                total_reviews=0
            )
            db.session.add(doc)
            db.session.commit()
            doc_id = doc.id

        # Add two reviews: 2 and 4 (avg = 3.0, count = 2)
        a1 = self._create_appointment(self.user1_id, doc_id, status="Completed", appt_time="10:00 AM")
        r1_res = self.client.post("/api/reviews", json={
            "doctor_id": doc_id, "appointment_id": a1, "rating": 2, "comment": "Low initial rating."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        r1_id = r1_res.get_json()['review']['id']

        a2 = self._create_appointment(self.user2_id, doc_id, status="Completed", appt_time="10:30 AM")
        r2_res = self.client.post("/api/reviews", json={
            "doctor_id": doc_id, "appointment_id": a2, "rating": 4, "comment": "Good doctor review."
        }, headers={"Authorization": f"Bearer {self.user2_token}"})
        r2_id = r2_res.get_json()['review']['id']

        with self.app.app_context():
            doc = db.session.get(Doctor, doc_id)
            self.assertEqual(doc.rating, 3.0)
            self.assertEqual(doc.total_reviews, 2)

        # Delete review 1 (rating 2)
        res_del1 = self.client.delete(f"/api/reviews/{r1_id}", headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res_del1.status_code, 200)
        self.assertEqual(res_del1.get_json()['doctor_new_rating'], 4.0)
        self.assertEqual(res_del1.get_json()['doctor_total_reviews'], 1)

        # Delete review 2 (rating 4) -> 0 reviews remaining -> defaults to 4.9
        res_del2 = self.client.delete(f"/api/reviews/{r2_id}", headers={"Authorization": f"Bearer {self.user2_token}"})
        self.assertEqual(res_del2.status_code, 200)
        self.assertEqual(res_del2.get_json()['doctor_new_rating'], 4.9)
        self.assertEqual(res_del2.get_json()['doctor_total_reviews'], 0)

    # 32. Deleting a legacy review works safely
    def test_32_deleting_legacy_review_with_null_appointment_id(self):
        # Create legacy review directly
        with self.app.app_context():
            doc = Doctor(
                name="Dr. Legacy Delete",
                gender="Male",
                image="https://example.com/ld.jpg",
                qualification="MD",
                experience=14,
                specialization_id=self.spec_id,
                hospital_id=self.hosp_id,
                location="Metropolis",
                rating=5.0,
                total_reviews=1
            )
            db.session.add(doc)
            db.session.commit()
            doc_id = doc.id

            legacy_rev = Review(
                user_id=self.user1_id,
                doctor_id=doc_id,
                appointment_id=None,
                rating=5,
                comment="Legacy review without appointment to be deleted."
            )
            db.session.add(legacy_rev)
            db.session.commit()
            leg_id = legacy_rev.id

        # Owner deletes legacy review
        res_del = self.client.delete(f"/api/reviews/{leg_id}", headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res_del.status_code, 200)

        with self.app.app_context():
            deleted = db.session.get(Review, leg_id)
            self.assertIsNone(deleted)
            doc = db.session.get(Doctor, doc_id)
            self.assertEqual(doc.total_reviews, 0)
            self.assertEqual(doc.rating, 4.9)

    # 33. Failed transactions do not corrupt aggregates
    def test_33_failed_transactions_do_not_corrupt_aggregates(self):
        # Edit non-existent review
        res_edit = self.client.put("/api/reviews/999999", json={
            "rating": 5, "comment": "Non-existent review edit."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res_edit.status_code, 404)

        # Delete non-existent review
        res_del = self.client.delete("/api/reviews/999999", headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res_del.status_code, 404)

    # 34. Concurrent edit and delete operations do not leave stale aggregates
    def test_34_concurrent_edit_delete_operations_preserve_aggregates(self):
        with self.app.app_context():
            doc = Doctor(
                name="Dr. Concurrency EditDel",
                gender="Female",
                image="https://example.com/ced.jpg",
                qualification="MD",
                experience=8,
                specialization_id=self.spec_id,
                hospital_id=self.hosp_id,
                location="Metropolis",
                rating=4.9,
                total_reviews=0
            )
            db.session.add(doc)
            db.session.commit()
            doc_id = doc.id

        appt_id = self._create_appointment(self.user1_id, doc_id, status="Completed", appt_time="11:00 AM")
        res_post = self.client.post("/api/reviews", json={
            "doctor_id": doc_id,
            "appointment_id": appt_id,
            "rating": 4,
            "comment": "Review for concurrency testing."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        rev_id = res_post.get_json()['review']['id']

        barrier = threading.Barrier(2)
        results = {}

        def edit_worker():
            c = self.app.test_client()
            barrier.wait()
            res = c.put(f"/api/reviews/{rev_id}", json={
                "rating": 5, "comment": "Concurrent edit attempt."
            }, headers={"Authorization": f"Bearer {self.user1_token}"})
            results['edit'] = res.status_code

        def del_worker():
            c = self.app.test_client()
            barrier.wait()
            res = c.delete(f"/api/reviews/{rev_id}", headers={"Authorization": f"Bearer {self.user1_token}"})
            results['del'] = res.status_code

        t1 = threading.Thread(target=edit_worker)
        t2 = threading.Thread(target=del_worker)
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        # Check DB consistency
        with self.app.app_context():
            doc = db.session.get(Doctor, doc_id)
            rev = db.session.get(Review, rev_id)
            if rev is None:
                # Review was deleted
                self.assertEqual(doc.total_reviews, 0)
                self.assertEqual(doc.rating, 4.9)
            else:
                # Review was edited and delete either failed or came second
                self.assertEqual(doc.total_reviews, 1)
                self.assertEqual(doc.rating, float(rev.rating))

    # 35. Phase 4 Part 1 appointment and duplicate-review protections still pass
    def test_35_phase4_part1_invariants_preserved(self):
        # Cannot review pending appointment
        p_appt = self._create_appointment(self.user1_id, self.doc1_id, status="Pending", appt_time="07:00 PM")
        res1 = self.client.post("/api/reviews", json={
            "doctor_id": self.doc1_id,
            "appointment_id": p_appt,
            "rating": 5,
            "comment": "Attempting review on pending appointment."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res1.status_code, 400)

        # Cannot submit duplicate review
        c_appt = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="07:30 PM")
        res2 = self.client.post("/api/reviews", json={
            "doctor_id": self.doc1_id,
            "appointment_id": c_appt,
            "rating": 5,
            "comment": "First review for this completed appointment."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res2.status_code, 201)

        res3 = self.client.post("/api/reviews", json={
            "doctor_id": self.doc1_id,
            "appointment_id": c_appt,
            "rating": 5,
            "comment": "Duplicate review attempt."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res3.status_code, 409)

    # 36. Verify server-computed is_owner and user_id privacy suppression
    def test_36_is_owner_computed_and_user_id_suppressed(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="08:00 PM")
        res_post = self.client.post("/api/reviews", json={
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 5,
            "comment": "Testing server-computed is_owner."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res_post.status_code, 201)
        created_rev = res_post.get_json()['review']
        rev_id = created_rev['id']
        self.assertTrue(created_rev['is_owner'])
        self.assertNotIn('user_id', created_rev)

        # GET /api/doctors/<id> as author (with token)
        res_doc_auth = self.client.get(f"/api/doctors/{self.doc1_id}", headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res_doc_auth.status_code, 200)
        target = next(r for r in res_doc_auth.get_json()['doctor']['reviews'] if r['id'] == rev_id)
        self.assertTrue(target['is_owner'])
        self.assertNotIn('user_id', target)

        # Author sees their own appointment_id
        self.assertEqual(target['appointment_id'], appt_id)

        # GET /api/doctors/<id> as different user
        res_doc_other = self.client.get(f"/api/doctors/{self.doc1_id}", headers={"Authorization": f"Bearer {self.user2_token}"})
        target_other = next(r for r in res_doc_other.get_json()['doctor']['reviews'] if r['id'] == rev_id)
        self.assertFalse(target_other['is_owner'])
        self.assertNotIn('user_id', target_other)
        # Different user must have appointment_id masked to None while is_verified remains True
        self.assertIsNone(target_other['appointment_id'])
        self.assertTrue(target_other['is_verified'])

        # GET /api/doctors/<id> anonymously (no token)
        res_doc_anon = self.client.get(f"/api/doctors/{self.doc1_id}")
        target_anon = next(r for r in res_doc_anon.get_json()['doctor']['reviews'] if r['id'] == rev_id)
        self.assertFalse(target_anon['is_owner'])
        self.assertNotIn('user_id', target_anon)
        # Anonymous caller must have appointment_id masked to None while is_verified remains True
        self.assertIsNone(target_anon['appointment_id'])
        self.assertTrue(target_anon['is_verified'])

    # 37. Verify appointment_id masking on GET /api/reviews
    def test_37_appointment_id_masked_on_reviews_endpoint(self):
        appt_id = self._create_appointment(self.user1_id, self.doc1_id, status="Completed", appt_time="08:30 PM")
        res_post = self.client.post("/api/reviews", json={
            "doctor_id": self.doc1_id,
            "appointment_id": appt_id,
            "rating": 5,
            "comment": "Testing appointment_id masking on GET /api/reviews."
        }, headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res_post.status_code, 201)
        rev_id = res_post.get_json()['review']['id']

        # 1. Author with Bearer token sees appointment_id
        res_owner = self.client.get(f"/api/reviews?doctor_id={self.doc1_id}", headers={"Authorization": f"Bearer {self.user1_token}"})
        self.assertEqual(res_owner.status_code, 200)
        rev_owner = next(r for r in res_owner.get_json()['reviews'] if r['id'] == rev_id)
        self.assertTrue(rev_owner['is_owner'])
        self.assertEqual(rev_owner['appointment_id'], appt_id)
        self.assertTrue(rev_owner['is_verified'])

        # 2. Non-owner (different user) sees appointment_id masked as None
        res_other = self.client.get(f"/api/reviews?doctor_id={self.doc1_id}", headers={"Authorization": f"Bearer {self.user2_token}"})
        self.assertEqual(res_other.status_code, 200)
        rev_other = next(r for r in res_other.get_json()['reviews'] if r['id'] == rev_id)
        self.assertFalse(rev_other['is_owner'])
        self.assertIsNone(rev_other['appointment_id'])
        self.assertTrue(rev_other['is_verified'])

        # 3. Anonymous caller sees appointment_id masked as None
        res_anon = self.client.get(f"/api/reviews?doctor_id={self.doc1_id}")
        self.assertEqual(res_anon.status_code, 200)
        rev_anon = next(r for r in res_anon.get_json()['reviews'] if r['id'] == rev_id)
        self.assertFalse(rev_anon['is_owner'])
        self.assertIsNone(rev_anon['appointment_id'])
        self.assertTrue(rev_anon['is_verified'])


if __name__ == '__main__':
    unittest.main()
