import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g
from config import Config
from models import User

def generate_token(user):
    payload = {
        'user_id': user.id,
        'email': user.email,
        'role': user.role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm='HS256')


def decode_token(token):
    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def get_token_from_header():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == 'bearer':
        return parts[1]
    return None


def jwt_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        if not token:
            return jsonify({'success': False, 'message': 'Authentication token is missing. Please log in.'}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({'success': False, 'message': 'Token has expired or is invalid. Please log in again.'}), 401
        
        user = User.query.get(payload['user_id'])
        if not user:
            return jsonify({'success': False, 'message': 'User associated with this token not found.'}), 401
        
        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        if not token:
            return jsonify({'success': False, 'message': 'Admin authentication token is missing.'}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({'success': False, 'message': 'Token has expired or is invalid.'}), 401
        
        user = User.query.get(payload['user_id'])
        if not user or user.role != 'ADMIN':
            return jsonify({'success': False, 'message': 'Access denied. Administrator privileges required.'}), 403
        
        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function


def optional_jwt(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        g.current_user = None
        if token:
            payload = decode_token(token)
            if payload:
                g.current_user = User.query.get(payload.get('user_id'))
        return f(*args, **kwargs)
    return decorated_function
