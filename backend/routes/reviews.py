from flask import Blueprint, request, jsonify, g
from models import db, Review, Doctor, Favorite
from utils.auth_middleware import jwt_required

reviews_bp = Blueprint('reviews', __name__, url_prefix='/api')

@reviews_bp.route('/reviews', methods=['GET'])
def get_reviews():
    doctor_id = request.args.get('doctor_id')
    if not doctor_id:
        return jsonify({'success': False, 'message': 'Doctor ID is required.'}), 400

    reviews = Review.query.filter_by(doctor_id=int(doctor_id)).order_by(Review.created_at.desc()).all()
    return jsonify({
        'success': True,
        'count': len(reviews),
        'reviews': [r.to_dict() for r in reviews]
    }), 200

@reviews_bp.route('/reviews', methods=['POST'])
@jwt_required
def create_review():
    data = request.get_json() or {}
    doctor_id = data.get('doctor_id')
    rating = data.get('rating')
    comment = (data.get('comment') or '').strip()

    if not doctor_id or rating is None or not comment:
        return jsonify({'success': False, 'message': 'Doctor ID, rating (1-5), and feedback comment are required.'}), 400

    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            raise ValueError()
    except ValueError:
        return jsonify({'success': False, 'message': 'Rating must be an integer between 1 and 5.'}), 400

    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({'success': False, 'message': 'Doctor not found.'}), 404

    review = Review(
        user_id=g.current_user.id,
        doctor_id=doctor.id,
        rating=rating,
        comment=comment
    )
    db.session.add(review)

    # Recalculate doctor rating
    existing_reviews = Review.query.filter_by(doctor_id=doctor.id).all()
    total_rating = sum(r.rating for r in existing_reviews) + rating
    new_count = len(existing_reviews) + 1
    doctor.rating = round(total_rating / new_count, 1)
    doctor.total_reviews = new_count

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Thank you for your review!',
        'review': review.to_dict(),
        'doctor_new_rating': doctor.rating,
        'doctor_total_reviews': doctor.total_reviews
    }), 201

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

    doctor = Doctor.query.get(doctor_id)
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
