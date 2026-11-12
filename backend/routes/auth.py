import re
import json
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy.exc import IntegrityError
from models import db, User, Hospital, Doctor, Specialization
from utils.auth_middleware import generate_token, jwt_required, admin_required
from utils.audit import record_audit
from utils.rate_limiter import (
    get_client_ip,
    check_failed_password_limit,
    record_failed_password,
    clear_failed_passwords,
)

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


@auth_bp.route('/register-request', methods=['POST', 'OPTIONS'], strict_slashes=False)
def register_request():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    data = request.get_json() or {}
    role = (data.get('role') or 'PATIENT').strip().upper()
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = data.get('password') or ''
    confirm_password = data.get('confirm_password') or ''

    # 1. Platform Owner registration request is strictly forbidden
    if role == 'PLATFORM_OWNER':
        return jsonify({
            'success': False,
            'message': 'Public registration for Platform Owner is strictly prohibited.'
        }), 403

    # 2. Patient / User: delegate to standard public patient registration
    if role in ('PATIENT', 'USER'):
        return register()

    # 3. Validation for Doctor, Admin, Receptionist, Hospital Super Admin
    if not name or not email or not password or not confirm_password:
        return jsonify({'success': False, 'message': 'Please fill in all required fields.'}), 400

    if not re.match(EMAIL_REGEX, email):
        return jsonify({'success': False, 'message': 'Please enter a valid email address.'}), 400

    if phone:
        phone_digits = re.sub(r'\D', '', phone)
        if len(phone_digits) < 7 or len(phone_digits) > 15 or not re.match(r'^\+?[0-9\s\-()]+$', phone):
            return jsonify({'success': False, 'message': 'Please enter a valid phone number.'}), 400

    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters.'}), 400

    if password != confirm_password:
        return jsonify({'success': False, 'message': 'Passwords do not match.'}), 400

    # Duplicate email check
    existing_user = User.query.filter_by(email=email).first()
    if not existing_user:
        existing_user = User.query.filter(User.email.ilike(email)).first()
    if existing_user:
        return jsonify({'success': False, 'message': 'Email already registered.'}), 409

    # 4. Handle DOCTOR role registration request
    if role == 'DOCTOR':
        hospital_id = data.get('hospital_id')
        if not hospital_id:
            return jsonify({'success': False, 'message': 'Please select an associated hospital.'}), 400
        hospital = db.session.get(Hospital, hospital_id)
        if not hospital:
            return jsonify({'success': False, 'message': 'Selected hospital does not exist.'}), 404

        specialization_id = data.get('specialization_id')
        qualification = (data.get('qualification') or '').strip()
        experience = data.get('experience') or 1
        try:
            experience = int(experience)
        except (ValueError, TypeError):
            experience = 1

        registration_number = (data.get('registration_number') or '').strip()
        if not registration_number:
            return jsonify({'success': False, 'message': 'Medical Council Registration Number (NMC/SMC) is required.'}), 400

        council_name = (data.get('council_name') or 'State Medical Council').strip()
        designation = (data.get('designation') or 'Consultant').strip()

        # Check duplicate registration number if doctor already exists with it
        existing_doc = Doctor.query.filter_by(registration_number=registration_number).first()
        if existing_doc:
            return jsonify({'success': False, 'message': f"Medical registration number '{registration_number}' is already registered on file."}), 409

        # Ensure valid specialization
        if specialization_id:
            spec = db.session.get(Specialization, specialization_id)
        else:
            spec = Specialization.query.first()
            specialization_id = spec.id if spec else 1

        notes_payload = {
            'specialization_id': specialization_id,
            'specialization_name': spec.name if spec else '',
            'qualification': qualification or 'MBBS',
            'experience': experience,
            'registration_number': registration_number,
            'council_name': council_name,
            'designation': designation,
            'hospital_id': hospital_id,
            'hospital_name': hospital.name
        }

        user = User(
            name=name,
            email=email,
            phone=phone,
            role='DOCTOR',
            hospital_id=hospital_id,
            is_active=False,
            approval_status='PENDING_APPROVAL',
            registration_notes=json.dumps(notes_payload)
        )
        user.set_password(password)

        try:
            db.session.add(user)
            db.session.flush()

            # Create pre-linked Doctor record in Pending status
            doctor = Doctor(
                user_id=user.id,
                name=name,
                gender=data.get('gender', 'Not Specified'),
                image=data.get('image') or user.avatar or 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80',
                qualification=qualification or 'MBBS',
                experience=experience,
                specialization_id=specialization_id,
                hospital_id=hospital_id,
                location=hospital.city,
                phone=phone,
                email=email,
                registration_number=registration_number,
                council_name=council_name,
                designation=designation,
                consultation_fee=float(data.get('consultation_fee') or 600.0),
                status='Pending'
            )
            db.session.add(doctor)
            db.session.commit()

            record_audit(
                user.id,
                'DOCTOR_REGISTRATION_REQUESTED',
                'USER',
                user.id,
                hospital_id=hospital_id,
                details={'email': email, 'registration_number': registration_number, 'hospital': hospital.name}
            )
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Email or registration number already registered.'}), 409
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': f'Unable to submit request: {str(e)}'}), 500

        return jsonify({
            'success': True,
            'message': 'Doctor registration request submitted successfully! Your credentials will be verified by the hospital administration before your account is activated.',
            'approval_status': 'PENDING_APPROVAL',
            'user': user.to_dict()
        }), 201

    # 5. Handle RECEPTIONIST role registration request
    if role == 'RECEPTIONIST':
        hospital_id = data.get('hospital_id')
        if not hospital_id:
            return jsonify({'success': False, 'message': 'Please select an associated hospital.'}), 400
        hospital = db.session.get(Hospital, hospital_id)
        if not hospital:
            return jsonify({'success': False, 'message': 'Selected hospital does not exist.'}), 404

        notes_payload = {
            'hospital_id': hospital_id,
            'hospital_name': hospital.name,
            'department': data.get('department', 'Front Desk / Patient Reception'),
            'employee_id': data.get('employee_id', '')
        }

        user = User(
            name=name,
            email=email,
            phone=phone,
            role='RECEPTIONIST',
            hospital_id=hospital_id,
            is_active=False,
            approval_status='PENDING_APPROVAL',
            registration_notes=json.dumps(notes_payload)
        )
        user.set_password(password)

        try:
            db.session.add(user)
            db.session.commit()

            record_audit(
                user.id,
                'RECEPTIONIST_REGISTRATION_REQUESTED',
                'USER',
                user.id,
                hospital_id=hospital_id,
                details={'email': email, 'hospital': hospital.name}
            )
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Email already registered.'}), 409
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': f'Unable to submit request: {str(e)}'}), 500

        return jsonify({
            'success': True,
            'message': 'Receptionist registration request submitted successfully! The Hospital Super Admin will review and approve your account.',
            'approval_status': 'PENDING_APPROVAL',
            'user': user.to_dict()
        }), 201

    # 6. Handle ADMIN (Hospital Admin) role registration request
    if role == 'ADMIN':
        hospital_id = data.get('hospital_id')
        if not hospital_id:
            return jsonify({'success': False, 'message': 'Please select an associated hospital.'}), 400
        hospital = db.session.get(Hospital, hospital_id)
        if not hospital:
            return jsonify({'success': False, 'message': 'Selected hospital does not exist.'}), 404

        notes_payload = {
            'hospital_id': hospital_id,
            'hospital_name': hospital.name,
            'department': data.get('department', 'Hospital Administration / Management'),
            'employee_id': data.get('employee_id', '')
        }

        user = User(
            name=name,
            email=email,
            phone=phone,
            role='ADMIN',
            hospital_id=hospital_id,
            is_active=False,
            approval_status='PENDING_APPROVAL',
            registration_notes=json.dumps(notes_payload)
        )
        user.set_password(password)

        try:
            db.session.add(user)
            db.session.commit()

            record_audit(
                user.id,
                'ADMIN_REGISTRATION_REQUESTED',
                'USER',
                user.id,
                hospital_id=hospital_id,
                details={'email': email, 'hospital': hospital.name}
            )
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Email already registered.'}), 409
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': f'Unable to submit request: {str(e)}'}), 500

        return jsonify({
            'success': True,
            'message': 'Hospital Admin registration request submitted successfully! The Hospital Super Admin will review and approve your account.',
            'approval_status': 'PENDING_APPROVAL',
            'user': user.to_dict()
        }), 201

    # 7. Handle HOSPITAL_SUPER_ADMIN role registration request
    if role == 'HOSPITAL_SUPER_ADMIN':
        hospital_name = (data.get('hospital_name') or '').strip()
        hospital_city = (data.get('hospital_city') or '').strip()
        hospital_state = (data.get('hospital_state') or 'Telangana').strip()
        emergency_number = (data.get('emergency_number') or '').strip()

        if not hospital_name or not hospital_city or not emergency_number:
            return jsonify({'success': False, 'message': 'Hospital name, city, and emergency hotline are required.'}), 400

        # Prevent duplicate hospital claim / conflict
        existing_hosp = Hospital.query.filter_by(name=hospital_name, city=hospital_city).first()
        if existing_hosp:
            return jsonify({
                'success': False,
                'message': f"A hospital named '{hospital_name}' in {hospital_city} is already registered on the platform. Please contact platform governance."
            }), 409

        notes_payload = {
            'hospital_name': hospital_name,
            'hospital_city': hospital_city,
            'hospital_state': hospital_state,
            'emergency_number': emergency_number,
            'hospital_address': data.get('hospital_address', f'{hospital_city}, {hospital_state}'),
            'hospital_phone': data.get('hospital_phone', phone),
            'license_number': data.get('license_number', ''),
            'facilities': data.get('facilities', '24/7 Emergency, Pharmacy, Inpatient Care')
        }

        user = User(
            name=name,
            email=email,
            phone=phone,
            role='HOSPITAL_SUPER_ADMIN',
            hospital_id=None,  # Not linked to hospital until Platform Owner approves
            is_active=False,
            approval_status='PENDING_APPROVAL',
            registration_notes=json.dumps(notes_payload)
        )
        user.set_password(password)

        try:
            db.session.add(user)
            db.session.commit()

            record_audit(
                user.id,
                'SUPERADMIN_REGISTRATION_REQUESTED',
                'USER',
                user.id,
                details={'email': email, 'proposed_hospital': hospital_name, 'city': hospital_city}
            )
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Email already registered.'}), 409
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': f'Unable to submit request: {str(e)}'}), 500

        return jsonify({
            'success': True,
            'message': 'Hospital Super Admin registration request submitted successfully! The Platform Owner will verify your hospital details before activating your administration console.',
            'approval_status': 'PENDING_APPROVAL',
            'user': user.to_dict()
        }), 201

    return jsonify({'success': False, 'message': f"Unsupported registration role '{role}'."}), 400


@auth_bp.route('/login', methods=['POST', 'OPTIONS'], strict_slashes=False)
def login():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password are required.'}), 400

    client_ip = get_client_ip()

    # Rate limiting: 5 failed attempts per 15 minutes per (IP, email)
    is_limited, retry_after = check_failed_password_limit(client_ip, email)
    if is_limited:
        return jsonify({
            'success': False,
            'message': f'Too many failed login attempts. Please try again in {retry_after} seconds.'
        }), 429

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        record_failed_password(client_ip, email)
        return jsonify({'success': False, 'message': 'Invalid email or password. Please try again.'}), 401

    # Check pending / rejected registration status before active check
    approval_st = getattr(user, 'approval_status', 'APPROVED')
    if approval_st == 'PENDING_APPROVAL':
        return jsonify({
            'success': False,
            'code': 'ACCOUNT_PENDING_APPROVAL',
            'error_code': 'ACCOUNT_PENDING_APPROVAL',
            'message': 'Your account registration is currently pending administrative review. You will be able to log in once an authorized administrator approves your request.'
        }), 403

    if approval_st == 'REJECTED':
        reason = getattr(user, 'rejection_reason', None)
        reason_msg = f" Reason: {reason}" if reason else ""
        return jsonify({
            'success': False,
            'code': 'ACCOUNT_REJECTED',
            'error_code': 'ACCOUNT_REJECTED',
            'rejection_reason': reason,
            'message': f'Your account registration request was not approved.{reason_msg} Please contact hospital administration for further assistance.'
        }), 403

    if getattr(user, 'is_active', True) is False:
        return jsonify({'success': False, 'message': 'Your account has been deactivated. Please contact support.'}), 403

    # Check temporary password expiration
    if getattr(user, 'must_change_password', False) and getattr(user, 'temporary_password_expires_at', None):
        now_utc = datetime.now(timezone.utc)
        expiry = user.temporary_password_expires_at
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        if now_utc > expiry:
            record_failed_password(client_ip, email)
            return jsonify({
                'success': False,
                'code': 'TEMPORARY_PASSWORD_EXPIRED',
                'message': 'Your temporary password has expired. Please contact hospital reception to receive a new password.'
            }), 401

    clear_failed_passwords(client_ip, email)

    must_change = bool(getattr(user, 'must_change_password', False))
    token = generate_token(user)

    welcome_msg = 'Password change required before accessing platform features.' if must_change else f'Welcome back, {user.name}!'
    return jsonify({
        'success': True,
        'message': welcome_msg,
        'token': token,
        'must_change_password': must_change,
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
        user.must_change_password = False
        user.temporary_password_expires_at = None
    elif current_password:
        return jsonify({
            'success': False,
            'message': 'New password is required when providing current password.'
        }), 400

    db.session.commit()
    new_token = generate_token(user, is_restricted=False)
    return jsonify({
        'success': True,
        'message': 'Profile updated successfully.',
        'token': new_token,
        'must_change_password': False,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/change-password', methods=['POST', 'OPTIONS'], strict_slashes=False)
@jwt_required
def change_password():
    """
    Dedicated endpoint for changing temporary passwords and unblocking restricted sessions.
    Validates current password, minimum length, distinctness, and optional confirmation.
    Clears must_change_password and temporary_password_expires_at upon success.
    Issues a fresh, unrestricted JWT session token.
    """
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    data = request.get_json() or {}
    current_password = data.get('current_password') or ''
    new_password = (data.get('new_password') or data.get('password') or '').strip()
    confirm_password = (data.get('confirm_password') or '').strip()

    user = g.current_user

    if not current_password or not new_password:
        return jsonify({
            'success': False,
            'message': 'Current password and new password are required.'
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

    if confirm_password and new_password != confirm_password:
        return jsonify({
            'success': False,
            'message': 'New passwords do not match.'
        }), 400

    user.set_password(new_password)
    user.must_change_password = False
    user.temporary_password_expires_at = None

    db.session.commit()

    new_token = generate_token(user, is_restricted=False)
    return jsonify({
        'success': True,
        'message': 'Password changed successfully. Full account access granted.',
        'token': new_token,
        'must_change_password': False,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/users', methods=['GET', 'OPTIONS'], strict_slashes=False)
@jwt_required
def list_users():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    user = g.current_user
    if user.role == 'PLATFORM_OWNER':
        users = User.query.order_by(User.created_at.desc()).all()
    elif user.role == 'HOSPITAL_SUPER_ADMIN':
        if not user.hospital_id:
            return jsonify({'success': False, 'message': 'Admin has no hospital assigned.'}), 403
        users = User.query.filter_by(hospital_id=user.hospital_id).order_by(User.created_at.desc()).all()
    else:
        return jsonify({'success': False, 'message': 'Access denied. Administrator privileges required.'}), 403

    return jsonify({
        'success': True,
        'count': len(users),
        'users': [u.to_dict() for u in users]
    }), 200
