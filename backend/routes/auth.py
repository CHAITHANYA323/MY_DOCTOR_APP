from flask import Blueprint, request, jsonify, g
from models import db, User
from utils.auth_middleware import generate_token, jwt_required, admin_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = data.get('password') or ''
    confirm_password = data.get('confirm_password') or ''

    # Validations
    if not name or not email or not password:
        return jsonify({'success': False, 'message': 'Full name, email and password are required.'}), 400
    
    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters long.'}), 400

    if confirm_password and password != confirm_password:
        return jsonify({'success': False, 'message': 'Passwords do not match.'}), 400

    if '@' not in email or '.' not in email:
        return jsonify({'success': False, 'message': 'Please enter a valid email address.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'An account with this email already exists.'}), 409

    role = data.get('role', 'USER').upper()
    if role not in ['USER', 'ADMIN']:
        role = 'USER'

    user = User(
        name=name,
        email=email,
        phone=phone,
        role=role,
        avatar=data.get('avatar', '')
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    token = generate_token(user)
    return jsonify({
        'success': True,
        'message': 'Account registered successfully!',
        'token': token,
        'user': user.to_dict()
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
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


@auth_bp.route('/me', methods=['GET'])
@jwt_required
def get_current_user():
    return jsonify({
        'success': True,
        'user': g.current_user.to_dict()
    }), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required
def update_profile():
    data = request.get_json() or {}
    user = g.current_user

    if 'name' in data and data['name'].strip():
        user.name = data['name'].strip()
    if 'phone' in data:
        user.phone = data['phone'].strip()
    if 'avatar' in data:
        user.avatar = data['avatar'].strip()
    if 'password' in data and data['password']:
        if len(data['password']) < 6:
            return jsonify({'success': False, 'message': 'New password must be at least 6 characters long.'}), 400
        user.set_password(data['password'])

    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Profile updated successfully.',
        'user': user.to_dict()
    }), 200


@auth_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({
        'success': True,
        'count': len(users),
        'users': [u.to_dict() for u in users]
    }), 200
