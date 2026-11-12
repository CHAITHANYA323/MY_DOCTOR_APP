import os
import re
import secrets
from datetime import datetime, date, timezone, timedelta
from flask import Blueprint, request, jsonify, g
from sqlalchemy.exc import IntegrityError
from models import db, User, Appointment, Doctor, Hospital
from utils.auth_middleware import jwt_required, roles_required

reception_bp = Blueprint('reception', __name__, url_prefix='/api/reception')

EMAIL_REGEX = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'


# -------------------------------------------------------------------------
# 1. Reception Dashboard & Daily Statistics
# -------------------------------------------------------------------------
@reception_bp.route('/stats', methods=['GET'])
@jwt_required
@roles_required('RECEPTIONIST', 'HOSPITAL_SUPER_ADMIN', 'ADMIN')
def get_reception_stats():
    """
    Retrieves real-time daily operational statistics scoped strictly to
    the authenticated user's assigned hospital.
    """
    user = g.current_user
    if not user.hospital_id:
        return jsonify({'success': False, 'message': 'Staff user has no hospital assigned.'}), 403

    h_id = user.hospital_id
    today_str = date.today().isoformat()

    # Hospital details
    hospital = db.session.get(Hospital, h_id)
    hospital_name = hospital.name if hospital else 'Your Hospital'

    # Today's appointments scoped to this hospital
    today_query = Appointment.query.filter_by(hospital_id=h_id, appointment_date=today_str)
    today_total = today_query.count()
    pending_checkins = today_query.filter_by(status='Pending').count()
    checked_in = today_query.filter_by(status='Confirmed').count()
    completed = today_query.filter_by(status='Completed').count()
    cancelled = today_query.filter_by(status='Cancelled').count()

    # Total unique patients ever served by this hospital
    total_patients = Appointment.query.filter_by(hospital_id=h_id).with_entities(Appointment.user_id).distinct().count()

    # All-time hospital appointments count
    total_appointments = Appointment.query.filter_by(hospital_id=h_id).count()

    # Today's schedule
    today_schedule = today_query.order_by(Appointment.appointment_time.asc()).all()

    # Recent hospital appointments
    recent_appointments = Appointment.query.filter_by(hospital_id=h_id).order_by(
        Appointment.created_at.desc()
    ).limit(10).all()

    return jsonify({
        'success': True,
        'today_date': today_str,
        'hospital_id': h_id,
        'hospital_name': hospital_name,
        'metrics': {
            'today_appointments': today_total,
            'pending_checkins': pending_checkins,
            'checked_in': checked_in,
            'completed': completed,
            'cancelled': cancelled,
            'total_patients': total_patients,
            'total_appointments': total_appointments
        },
        'today_schedule': [a.to_dict() for a in today_schedule],
        'recent_appointments': [a.to_dict() for a in recent_appointments]
    }), 200


# -------------------------------------------------------------------------
# 2. Patient Search & Directory (Hospital-Scoped)
# -------------------------------------------------------------------------
@reception_bp.route('/patients', methods=['GET'])
@jwt_required
@roles_required('RECEPTIONIST', 'HOSPITAL_SUPER_ADMIN', 'ADMIN')
def list_or_search_patients():
    """
    Search and retrieve patient directory scoped strictly to patients who
    have visited or booked an appointment at the receptionist's assigned hospital.
    Cross-hospital patient directories are never exposed.
    """
    user = g.current_user
    if not user.hospital_id:
        return jsonify({'success': False, 'message': 'Staff user has no hospital assigned.'}), 403

    h_id = user.hospital_id
    search = (request.args.get('search') or request.args.get('q') or '').strip()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))

    # Select query: unique patient IDs who have appointments at this hospital
    patient_ids_select = db.session.query(Appointment.user_id).filter_by(
        hospital_id=h_id
    ).distinct()

    query = User.query.filter(
        User.id.in_(patient_ids_select),
        User.role.in_(['USER', 'PATIENT'])
    )

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.name.ilike(search_term)) |
            (User.email.ilike(search_term)) |
            (User.phone.ilike(search_term))
        )

    total = query.count()
    patients = query.order_by(User.name.asc()).offset((page - 1) * limit).limit(limit).all()

    # Format patient summaries with visit count at this hospital
    patient_list = []
    for p in patients:
        visit_count = Appointment.query.filter_by(user_id=p.id, hospital_id=h_id).count()
        last_appt = Appointment.query.filter_by(
            user_id=p.id,
            hospital_id=h_id
        ).order_by(Appointment.appointment_date.desc()).first()

        patient_list.append({
            'id': p.id,
            'name': p.name,
            'email': p.email,
            'phone': p.phone,
            'avatar': p.avatar or '',
            'created_at': p.created_at.isoformat() if p.created_at else None,
            'visits_at_hospital': visit_count,
            'last_visit_date': last_appt.appointment_date if last_appt else None,
            'last_doctor_name': last_appt.doctor.name if (last_appt and last_appt.doctor) else None
        })

    return jsonify({
        'success': True,
        'total': total,
        'page': page,
        'limit': limit,
        'patients': patient_list
    }), 200


# -------------------------------------------------------------------------
# 3. Patient Detail Record with Strict Hospital Boundary Check
# -------------------------------------------------------------------------
@reception_bp.route('/patients/<int:patient_id>', methods=['GET'])
@jwt_required
@roles_required('RECEPTIONIST', 'HOSPITAL_SUPER_ADMIN', 'ADMIN')
def get_patient_detail(patient_id):
    """
    Retrieves basic patient information and consultation history AT THIS HOSPITAL ONLY.
    If the patient exists but has no appointment record at the caller's hospital,
    access is rejected with 403 Forbidden to uphold cross-hospital privacy.
    """
    user = g.current_user
    if not user.hospital_id:
        return jsonify({'success': False, 'message': 'Staff user has no hospital assigned.'}), 403

    h_id = user.hospital_id

    patient = db.session.get(User, patient_id)
    if not patient or patient.role not in ('USER', 'PATIENT'):
        return jsonify({'success': False, 'message': 'Patient not found.'}), 404

    # Strict multi-tenant hospital privacy check:
    # Does this patient have any appointment at the caller's hospital?
    hospital_appts = Appointment.query.filter_by(
        user_id=patient.id,
        hospital_id=h_id
    ).order_by(Appointment.created_at.desc()).all()

    if not hospital_appts:
        return jsonify({
            'success': False,
            'message': 'Access denied. You do not have permission to view patient records belonging to other hospitals.'
        }), 403

    return jsonify({
        'success': True,
        'patient': {
            'id': patient.id,
            'name': patient.name,
            'email': patient.email,
            'phone': patient.phone,
            'avatar': patient.avatar or '',
            'created_at': patient.created_at.isoformat() if patient.created_at else None,
            'total_hospital_visits': len(hospital_appts),
            'appointments': [a.to_dict() for a in hospital_appts]
        }
    }), 200


# -------------------------------------------------------------------------
# 4. Front-Desk Walk-In Patient Registration
# -------------------------------------------------------------------------
@reception_bp.route('/patients', methods=['POST'])
@jwt_required
@roles_required('RECEPTIONIST', 'HOSPITAL_SUPER_ADMIN', 'ADMIN')
def register_walkin_patient():
    """
    Allows a Receptionist to register a new walk-in patient.
    Enforces format validation and duplicate email prevention.
    Creates account with role 'PATIENT'.
    """
    user = g.current_user
    if not user.hospital_id:
        return jsonify({'success': False, 'message': 'Staff user has no hospital assigned.'}), 403

    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    avatar = data.get('avatar', '')

    # 1. Required fields
    if not name or not email or not phone:
        return jsonify({'success': False, 'message': 'Name, email, and phone number are required.'}), 400

    if len(name) < 2:
        return jsonify({'success': False, 'message': 'Patient name must be at least 2 characters.'}), 400

    # 2. Email format validation
    if not re.match(EMAIL_REGEX, email):
        return jsonify({'success': False, 'message': 'Please enter a valid email address.'}), 400

    # 3. Phone format validation
    phone_digits = re.sub(r'\D', '', phone)
    if len(phone_digits) < 7 or len(phone_digits) > 15:
        return jsonify({'success': False, 'message': 'Please enter a valid phone number (7-15 digits).'}), 400

    # 4. Password validation: custom or secure cryptographically random temporary password
    custom_password = data.get('password')
    temp_password = None
    expiry_days = int(os.getenv("TEMPORARY_PASSWORD_EXPIRY_DAYS", "7"))
    temp_expires_at = datetime.now(timezone.utc) + timedelta(days=expiry_days)

    if custom_password:
        password = str(custom_password).strip()
        if len(password) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters.'}), 400
    else:
        temp_password = secrets.token_urlsafe(12)
        password = temp_password

    # 5. Duplicate email check
    existing_user = User.query.filter(User.email.ilike(email)).first()
    if existing_user:
        return jsonify({
            'success': False,
            'message': 'A user account with this email address already exists. Please search for the patient or use an alternate email.'
        }), 409

    new_patient = User(
        name=name,
        email=email,
        phone=phone,
        role='PATIENT',
        avatar=avatar,
        is_active=True,
        must_change_password=True,
        temporary_password_expires_at=temp_expires_at
    )
    new_patient.set_password(password)

    try:
        db.session.add(new_patient)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'A patient with this email already exists.'}), 409
    except Exception as err:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Failed to register patient. Please try again.'}), 500

    response_payload = {
        'success': True,
        'message': f'Patient {new_patient.name} registered successfully.',
        'patient': {
            'id': new_patient.id,
            'name': new_patient.name,
            'email': new_patient.email,
            'phone': new_patient.phone,
            'role': new_patient.role,
            'must_change_password': new_patient.must_change_password,
            'temporary_password_expires_at': new_patient.temporary_password_expires_at.isoformat() if new_patient.temporary_password_expires_at else None,
            'created_at': new_patient.created_at.isoformat() if new_patient.created_at else None
        }
    }
    if temp_password:
        response_payload['temporary_password'] = temp_password
        response_payload['patient']['temporary_password'] = temp_password

    return jsonify(response_payload), 201
