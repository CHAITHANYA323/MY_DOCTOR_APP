import re
from flask import Blueprint, request, jsonify, g
from sqlalchemy.exc import IntegrityError
from models import db, User
from utils.auth_middleware import generate_token, jwt_required, admin_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

EMAIL_REGEX = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'

@auth_bp.route('/register', methods=['POST', 'OPTIONS'], strict_slashes=False)
def register():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = data.get('password') or ''
    confirm_password = data.get('confirm_password') or ''

    # 1. Missing required fields
    if not name or not email or not password or not confirm_password:
        return jsonify({'success': False, 'message': 'Please fill in all required fields.'}), 400

    # 2. Invalid email
    if not re.match(EMAIL_REGEX, email):
        return jsonify({'success': False, 'message': 'Please enter a valid email address.'}), 400

    # 3. Invalid phone number (if provided)
    if phone:
        phone_digits = re.sub(r'\D', '', phone)
        if len(phone_digits) < 7 or len(phone_digits) > 15 or not re.match(r'^\+?[0-9\s\-()]+$', phone):
            return jsonify({'success': False, 'message': 'Please enter a valid phone number.'}), 400

    # 4. Password minimum length
    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters.'}), 400

    # 5. Password and Confirm Password mismatch
    if password != confirm_password:
        return jsonify({'success': False, 'message': 'Passwords do not match.'}), 400

    # 6. Duplicate email check
    existing_user = User.query.filter_by(email=email).first()
    if not existing_user:
        existing_user = User.query.filter(User.email.ilike(email)).first()
    if existing_user:
        return jsonify({'success': False, 'message': 'Email already registered.'}), 409

    # Public registration must ALWAYS create regular USER accounts.
    # Any role value provided by the client is strictly ignored.
    user = User(
        name=name,
        email=email,
        phone=phone,
        role='USER',
        avatar=data.get('avatar', '')
    )
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Email already registered.'}), 409
    except Exception as err:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Unable to create account. Please try again later.'}), 500

    token = generate_token(user)
    return jsonify({
        'success': True,
        'message': 'Account created successfully!',
        'token': token,
        'user': user.to_dict()
    }), 201


@auth_bp.route('/login', methods=['POST', 'OPTIONS'], strict_slashes=False)
def login():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password are required.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid email or password. Please try again.'}), 401

    token = generate_token(user)
    return jsonify({
        'success': True,
        'message': f'Welcome back, {user.name}!',
        'token': token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET', 'OPTIONS'], strict_slashes=False)
@jwt_required
def get_current_user():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200
    return jsonify({
        'success': True,
        'user': g.current_user.to_dict()
    }), 200


@auth_bp.route('/profile', methods=['PUT', 'OPTIONS'], strict_slashes=False)
@jwt_required
def update_profile():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200
    data = request.get_json() or {}
    user = g.current_user

    if 'name' in data and data['name'].strip():
        user.name = data['name'].strip()
    if 'phone' in data:
        user.phone = data['phone'].strip()
    if 'avatar' in data:
        user.avatar = data['avatar'].strip()

    # Secure Password Update: require and verify current_password
    new_password = (data.get('new_password') or data.get('password') or '').strip()
    current_password = data.get('current_password') or ''

    if new_password:
        if not current_password:
            return jsonify({
                'success': False,
                'message': 'Current password is required to set a new password.'
            }), 400

        if not user.check_password(current_password):
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect. Please try again.'
            }), 400

        if len(new_password) < 6:
            return jsonify({
                'success': False,
                'message': 'New password must be at least 6 characters long.'
            }), 400

        if current_password == new_password:
            return jsonify({
                'success': False,
                'message': 'New password must be different from current password.'
            }), 400

        user.set_password(new_password)
    elif current_password:
        return jsonify({
            'success': False,
            'message': 'New password is required when providing current password.'
        }), 400

    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Profile updated successfully.',
        'user': user.to_dict()
    }), 200


@auth_bp.route('/users', methods=['GET', 'OPTIONS'], strict_slashes=False)
@admin_required
def list_users():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({
        'success': True,
        'count': len(users),
        'users': [u.to_dict() for u in users]
    }), 200
