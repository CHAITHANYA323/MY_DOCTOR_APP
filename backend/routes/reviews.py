from flask import Blueprint, request, jsonify, g
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from models import db, Review, Doctor, Favorite, Appointment
from utils.auth_middleware import jwt_required, decode_token

reviews_bp = Blueprint('reviews', __name__, url_prefix='/api')


def acquire_doctor_lock(doctor_id: int):
    """
    Acquires database-level lock to prevent concurrent review update collisions:
    - SQLite: rolls back read-only session state from auth/lookup, then executes BEGIN IMMEDIATE.
    - MySQL / PostgreSQL: executes SELECT ... FROM doctors WHERE id=:id FOR UPDATE inside continuous tx.
    """
    if db.engine.name == 'sqlite':
        db.session.rollback()
        db.session.execute(text("BEGIN IMMEDIATE"))
    else:
        doc = Doctor.query.filter_by(id=doctor_id).with_for_update().one_or_none()
        if not doc:
            raise ValueError(f"Doctor with ID {doctor_id} not found for lock acquisition.")


@reviews_bp.route('/reviews', methods=['GET'])
def get_reviews():
    doctor_id = request.args.get('doctor_id')
    if not doctor_id:
        return jsonify({'success': False, 'message': 'Doctor ID is required.'}), 400

    try:
        doc_id = int(doctor_id)
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Doctor ID must be an integer.'}), 400

    # Extract optional caller identity from Authorization header
    auth_header = request.headers.get('Authorization')
    current_user_id = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        payload = decode_token(token)
        if payload:
            current_user_id = payload.get('user_id')

    reviews = Review.query.filter_by(doctor_id=doc_id).order_by(Review.created_at.desc()).all()
    return jsonify({
        'success': True,
        'count': len(reviews),
        'reviews': [r.to_dict(current_user_id=current_user_id) for r in reviews]
    }), 200


@reviews_bp.route('/reviews', methods=['POST'])
@jwt_required
def create_review():
    data = request.get_json() or {}

    # 1. Validate doctor_id
    doctor_id = data.get('doctor_id')
    if doctor_id is None or isinstance(doctor_id, bool):
        return jsonify({'success': False, 'message': 'Doctor ID is required.'}), 400
    try:
        doctor_id = int(doctor_id)
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Doctor ID must be an integer.'}), 400

    # 2. Validate appointment_id
    appointment_id = data.get('appointment_id')
    if appointment_id is None or isinstance(appointment_id, bool):
        return jsonify({'success': False, 'message': 'appointment_id is required.'}), 400
    try:
        appointment_id = int(appointment_id)
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'appointment_id must be an integer.'}), 400

    # 3. Validate rating (strict integer 1 to 5)
    rating = data.get('rating')
    if rating is None or isinstance(rating, bool) or not isinstance(rating, int):
        return jsonify({'success': False, 'message': 'Rating must be an integer between 1 and 5.'}), 400
    if rating < 1 or rating > 5:
        return jsonify({'success': False, 'message': 'Rating must be an integer between 1 and 5.'}), 400

    # 4. Validate comment (string, trimmed, 10 to 1000 characters)
    comment = data.get('comment')
    if comment is None or not isinstance(comment, str):
        return jsonify({'success': False, 'message': 'Comment must be a string.'}), 400
    cleaned_comment = comment.strip()
    if not cleaned_comment:
        return jsonify({'success': False, 'message': 'Comment cannot be empty or whitespace-only.'}), 400
    if len(cleaned_comment) < 10:
        return jsonify({'success': False, 'message': 'Comment must be at least 10 characters long.'}), 400
    if len(cleaned_comment) > 1000:
        return jsonify({'success': False, 'message': 'Comment cannot exceed 1000 characters.'}), 400

    # 5. Preliminary checks before lock acquisition
    doctor = db.session.get(Doctor, doctor_id)
    if not doctor:
        return jsonify({'success': False, 'message': 'Doctor not found.'}), 404

    appointment = db.session.get(Appointment, appointment_id)
    if not appointment:
        return jsonify({'success': False, 'message': 'Appointment not found.'}), 404

    if appointment.user_id != g.current_user.id:
        return jsonify({'success': False, 'message': 'You are not authorized to review this appointment.'}), 403

    if appointment.doctor_id != doctor.id:
        return jsonify({'success': False, 'message': 'Appointment does not belong to the specified doctor.'}), 400

    if appointment.status != 'Completed':
        return jsonify({
            'success': False,
            'message': f"Reviews are only allowed for completed appointments. Current status is '{appointment.status}'."
        }), 400

    existing_review = Review.query.filter_by(appointment_id=appointment_id).first()
    if existing_review:
        return jsonify({'success': False, 'message': 'A review has already been submitted for this appointment.'}), 409

    # 6. Concurrency lock and transactional write
    try:
        acquire_doctor_lock(doctor_id)

        # Re-fetch entities inside active lock boundary
        doctor = db.session.get(Doctor, doctor_id)
        if not doctor:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Doctor not found.'}), 404

        appointment = db.session.get(Appointment, appointment_id)
        if not appointment:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Appointment not found.'}), 404

        if appointment.user_id != g.current_user.id:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'You are not authorized to review this appointment.'}), 403

        if appointment.doctor_id != doctor.id:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Appointment does not belong to the specified doctor.'}), 400

        if appointment.status != 'Completed':
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f"Reviews are only allowed for completed appointments. Current status is '{appointment.status}'."
            }), 400

        existing_review = Review.query.filter_by(appointment_id=appointment_id).first()
        if existing_review:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'A review has already been submitted for this appointment.'}), 409

        review = Review(
            user_id=g.current_user.id,
            doctor_id=doctor.id,
            appointment_id=appointment_id,
            rating=rating,
            comment=cleaned_comment
        )
        db.session.add(review)
        db.session.flush()

        # Calculate aggregates directly from persisted review rows
        stats = db.session.query(
            func.count(Review.id),
            func.avg(Review.rating)
        ).filter(Review.doctor_id == doctor.id).first()

        total_count = stats[0] if stats and stats[0] is not None else 0
        avg_rating = float(stats[1]) if stats and stats[1] is not None else 4.9

        doctor.total_reviews = total_count
        doctor.rating = round(avg_rating, 1) if total_count > 0 else 4.9

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Thank you for your review!',
            'review': review.to_dict(current_user_id=g.current_user.id),
            'doctor_new_rating': doctor.rating,
            'doctor_total_reviews': doctor.total_reviews
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'A review has already been submitted for this appointment.'}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to submit review: {str(e)}'}), 500


@reviews_bp.route('/reviews/<int:review_id>', methods=['PUT', 'PATCH'])
@jwt_required
def update_review(review_id):
    review = db.session.get(Review, review_id)
    if not review:
        return jsonify({'success': False, 'message': 'Review not found.'}), 404

    # Only original review owner can edit their review
    if review.user_id != g.current_user.id:
        return jsonify({'success': False, 'message': 'You are not authorized to edit this review.'}), 403

    data = request.get_json() or {}

    # Validate rating (strict integer 1 to 5)
    rating = data.get('rating')
    if rating is None or isinstance(rating, bool) or not isinstance(rating, int):
        return jsonify({'success': False, 'message': 'Rating must be an integer between 1 and 5.'}), 400
    if rating < 1 or rating > 5:
        return jsonify({'success': False, 'message': 'Rating must be an integer between 1 and 5.'}), 400

    # Validate comment (string, trimmed, 10 to 1000 characters)
    comment = data.get('comment')
    if comment is None or not isinstance(comment, str):
        return jsonify({'success': False, 'message': 'Comment must be a string.'}), 400
    cleaned_comment = comment.strip()
    if not cleaned_comment:
        return jsonify({'success': False, 'message': 'Comment cannot be empty or whitespace-only.'}), 400
    if len(cleaned_comment) < 10:
        return jsonify({'success': False, 'message': 'Comment must be at least 10 characters long.'}), 400
    if len(cleaned_comment) > 1000:
        return jsonify({'success': False, 'message': 'Comment cannot exceed 1000 characters.'}), 400

    doctor_id = review.doctor_id

    try:
        acquire_doctor_lock(doctor_id)

        # Re-fetch review and doctor inside active lock boundary
        review = db.session.get(Review, review_id)
        if not review:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Review not found.'}), 404

        if review.user_id != g.current_user.id:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'You are not authorized to edit this review.'}), 403

        doctor = db.session.get(Doctor, doctor_id)
        if not doctor:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Doctor not found.'}), 404

        # Update mutable fields only (user_id, doctor_id, appointment_id are strictly immutable)
        review.rating = rating
        review.comment = cleaned_comment
        db.session.flush()

        # Recalculate aggregates from persisted reviews
        stats = db.session.query(
            func.count(Review.id),
            func.avg(Review.rating)
        ).filter(Review.doctor_id == doctor.id).first()

        total_count = stats[0] if stats and stats[0] is not None else 0
        avg_rating = float(stats[1]) if stats and stats[1] is not None else 4.9

        doctor.total_reviews = total_count
        doctor.rating = round(avg_rating, 1) if total_count > 0 else 4.9

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Review updated successfully.',
            'review': review.to_dict(current_user_id=g.current_user.id),
            'doctor_new_rating': doctor.rating,
            'doctor_total_reviews': doctor.total_reviews
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to update review: {str(e)}'}), 500


@reviews_bp.route('/reviews/<int:review_id>', methods=['DELETE'])
@jwt_required
def delete_review(review_id):
    review = db.session.get(Review, review_id)
    if not review:
        return jsonify({'success': False, 'message': 'Review not found.'}), 404

    # Review owner or ADMIN moderation
    is_owner = (review.user_id == g.current_user.id)
    is_admin = (getattr(g.current_user, 'role', '') == 'ADMIN')
    if not is_owner and not is_admin:
        return jsonify({'success': False, 'message': 'You are not authorized to delete this review.'}), 403

    doctor_id = review.doctor_id

    try:
        acquire_doctor_lock(doctor_id)

        # Re-fetch review and doctor inside active lock boundary
        review = db.session.get(Review, review_id)
        if not review:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Review not found.'}), 404

        is_owner = (review.user_id == g.current_user.id)
        is_admin = (getattr(g.current_user, 'role', '') == 'ADMIN')
        if not is_owner and not is_admin:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'You are not authorized to delete this review.'}), 403

        doctor = db.session.get(Doctor, doctor_id)
        if not doctor:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Doctor not found.'}), 404

        db.session.delete(review)
        db.session.flush()

        # Recalculate aggregates from remaining reviews
        stats = db.session.query(
            func.count(Review.id),
            func.avg(Review.rating)
        ).filter(Review.doctor_id == doctor.id).first()

        total_count = stats[0] if stats and stats[0] is not None else 0
        avg_rating = float(stats[1]) if stats and stats[1] is not None else 4.9

        doctor.total_reviews = total_count
        doctor.rating = round(avg_rating, 1) if total_count > 0 else 4.9

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Review deleted successfully.',
            'doctor_new_rating': doctor.rating,
            'doctor_total_reviews': doctor.total_reviews
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to delete review: {str(e)}'}), 500


# --- Favorites Endpoints ---

@reviews_bp.route('/favorites', methods=['GET'])
@jwt_required
def get_favorites():
    favs = Favorite.query.filter_by(user_id=g.current_user.id).order_by(Favorite.created_at.desc()).all()
    return jsonify({
        'success': True,
        'count': len(favs),
        'favorites': [f.to_dict() for f in favs]
    }), 200


@reviews_bp.route('/favorites/toggle', methods=['POST'])
@jwt_required
def toggle_favorite():
    data = request.get_json() or {}
    doctor_id = data.get('doctor_id')

    if not doctor_id:
        return jsonify({'success': False, 'message': 'Doctor ID is required.'}), 400

    doctor = db.session.get(Doctor, doctor_id)
    if not doctor:
        return jsonify({'success': False, 'message': 'Doctor not found.'}), 404

    fav = Favorite.query.filter_by(user_id=g.current_user.id, doctor_id=doctor.id).first()
    if fav:
        db.session.delete(fav)
        db.session.commit()
        return jsonify({
            'success': True,
            'is_favorite': False,
            'message': f'Dr. {doctor.name} removed from your favorites.'
        }), 200
    else:
        fav = Favorite(user_id=g.current_user.id, doctor_id=doctor.id)
        db.session.add(fav)
        db.session.commit()
        return jsonify({
            'success': True,
            'is_favorite': True,
            'message': f'Dr. {doctor.name} added to your saved favorites.'
        }), 201
