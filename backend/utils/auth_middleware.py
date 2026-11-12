import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g
from config import Config
from models import db, User

def generate_token(user, is_restricted=None):
    """Generates an HS256 JWT token for an authenticated identity."""
    must_change = bool(getattr(user, 'must_change_password', False)) if is_restricted is None else bool(is_restricted)
    payload = {
        'user_id': user.id,
        'email': user.email,
        'role': user.role,
        'hospital_id': getattr(user, 'hospital_id', None),
        'approval_status': getattr(user, 'approval_status', 'APPROVED'),
        'must_change_password': must_change,
        'scope': 'password_change' if must_change else 'full',
        'exp': datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm='HS256')


def is_restricted_endpoint(path: str, endpoint: str) -> bool:
    """Checks whether the requested route is blocked during a restricted password-change session."""
    allowed_endpoints = {
        'auth.change_password',
        'auth.update_profile',
        'auth.get_current_user',
        'auth.login',
        'alias_api_login',
        'alias_auth_login',
        'alias_root_login',
        'alias_api_change_password',
        'alias_auth_change_password',
        'alias_root_change_password'
    }
    if endpoint in allowed_endpoints:
        return False
    p = (path or '').rstrip('/')
    if p.endswith('/auth/change-password') or p.endswith('/change-password') or p.endswith('/auth/profile') or p.endswith('/auth/me'):
        return False
    return True


def decode_token(token):
    """Decodes an HS256 JWT token, returning the payload or None if invalid/expired."""
    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def get_token_from_header():
    """Extracts the Bearer token from the HTTP Authorization header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == 'bearer':
        return parts[1]
    return None


def jwt_required(f):
    """Decorator ensuring request carries a valid token for an active user."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        if not token:
            return jsonify({'success': False, 'message': 'Authentication token is missing. Please log in.'}), 401

        payload = decode_token(token)
        if not payload:
            return jsonify({'success': False, 'message': 'Token has expired or is invalid. Please log in again.'}), 401

        user = db.session.get(User, payload['user_id'])
        if not user:
            return jsonify({'success': False, 'message': 'User associated with this token not found.'}), 401

        # Pending / Rejected registration security guard
        approval_st = getattr(user, 'approval_status', 'APPROVED')
        if approval_st == 'PENDING_APPROVAL':
            return jsonify({
                'success': False,
                'code': 'ACCOUNT_PENDING_APPROVAL',
                'error_code': 'ACCOUNT_PENDING_APPROVAL',
                'message': 'Your account registration is currently pending administrative review. Access to platform features is restricted.'
            }), 403
        if approval_st == 'REJECTED':
            return jsonify({
                'success': False,
                'code': 'ACCOUNT_REJECTED',
                'error_code': 'ACCOUNT_REJECTED',
                'message': 'Your account registration request was not approved.'
            }), 403

        # Deactivated user security guard
        if getattr(user, 'is_active', True) is False:
            return jsonify({'success': False, 'message': 'Your account has been deactivated. Please contact support.'}), 403

        # Mandatory password change restriction
        if (getattr(user, 'must_change_password', False) or payload.get('must_change_password')) and is_restricted_endpoint(request.path, request.endpoint):
            return jsonify({
                'success': False,
                'code': 'PASSWORD_CHANGE_REQUIRED',
                'must_change_password': True,
                'message': 'Your account requires an immediate password change. Access to platform features is restricted until your password is updated.'
            }), 403

        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function


def roles_required(*allowed_roles, custom_message=None):
    """
    Decorator enforcing that current_user has one of the allowed roles.
    Zero wildcard fallback: legacy ADMIN accounts without explicit assignment are denied.
    """
    # Normalize patient role variants
    normalized_allowed = set(allowed_roles)
    if 'PATIENT' in normalized_allowed:
        normalized_allowed.add('USER')
    if 'USER' in normalized_allowed:
        normalized_allowed.add('PATIENT')

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = get_token_from_header()
            if not token:
                return jsonify({'success': False, 'message': 'Authentication token is missing.'}), 401

            payload = decode_token(token)
            if not payload:
                return jsonify({'success': False, 'message': 'Token has expired or is invalid.'}), 401

            user = db.session.get(User, payload['user_id'])
            if not user:
                return jsonify({'success': False, 'message': 'User associated with this token not found.'}), 401

            if getattr(user, 'is_active', True) is False:
                return jsonify({'success': False, 'message': 'Your account has been deactivated. Please contact support.'}), 403

            # Pending / Rejected registration security guard
            approval_st = getattr(user, 'approval_status', 'APPROVED')
            if approval_st == 'PENDING_APPROVAL':
                return jsonify({
                    'success': False,
                    'code': 'ACCOUNT_PENDING_APPROVAL',
                    'message': 'Your account registration is currently pending administrative review. Access to platform features is restricted.'
                }), 403
            if approval_st == 'REJECTED':
                return jsonify({
                    'success': False,
                    'code': 'ACCOUNT_REJECTED',
                    'message': 'Your account registration request was not approved.'
                }), 403

            # Mandatory password change restriction
            if (getattr(user, 'must_change_password', False) or payload.get('must_change_password')) and is_restricted_endpoint(request.path, request.endpoint):
                return jsonify({
                    'success': False,
                    'code': 'PASSWORD_CHANGE_REQUIRED',
                    'must_change_password': True,
                    'message': 'Your account requires an immediate password change. Access to platform features is restricted until your password is updated.'
                }), 403

            if user.role not in normalized_allowed:
                msg = custom_message or f"Access denied. Role '{user.role}' lacks required permissions. Target roles: {', '.join(sorted(allowed_roles))}."
                return jsonify({
                    'success': False,
                    'message': msg
                }), 403

            g.current_user = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def platform_owner_required(f):
    """Restricted strictly to PLATFORM_OWNER."""
    return roles_required('PLATFORM_OWNER')(f)


def hospital_admin_required(f):
    """Permits PLATFORM_OWNER or HOSPITAL_SUPER_ADMIN."""
    return roles_required('PLATFORM_OWNER', 'HOSPITAL_SUPER_ADMIN')(f)


def staff_required(f):
    """Permits PLATFORM_OWNER, HOSPITAL_SUPER_ADMIN, or RECEPTIONIST."""
    return roles_required('PLATFORM_OWNER', 'HOSPITAL_SUPER_ADMIN', 'RECEPTIONIST')(f)


def doctor_required(f):
    """Permits authenticated DOCTOR role."""
    return roles_required('DOCTOR')(f)


def admin_required(f):
    """
    Administrative guard for hospital operations.
    Permits PLATFORM_OWNER and HOSPITAL_SUPER_ADMIN.
    Unassigned legacy ADMIN accounts receive 403 Forbidden until assigned.
    """
    return roles_required(
        'PLATFORM_OWNER',
        'HOSPITAL_SUPER_ADMIN',
        custom_message='Access denied. Administrator privileges required.'
    )(f)


def optional_jwt(f):
    """Optional JWT decorator: populates g.current_user if token is valid, otherwise None."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        g.current_user = None
        if token:
            payload = decode_token(token)
            if payload:
                user = db.session.get(User, payload.get('user_id'))
                if user and getattr(user, 'is_active', True) is not False and getattr(user, 'approval_status', 'APPROVED') == 'APPROVED':
                    g.current_user = user
        return f(*args, **kwargs)
    return decorated_function
