from datetime import datetime, timezone, date, timedelta
from flask import Blueprint, request, jsonify, g
from models import (
    db,
    User,
    Hospital,
    Doctor,
    Specialization,
    Appointment,
    AuditLog,
    HospitalAdminAssignment,
)
from utils.auth_middleware import (
    jwt_required,
    only_hospital_admin_required,
    hospital_admin_required,
)
from utils.audit import record_audit

hospital_admin_bp = Blueprint('hospital_admin', __name__, url_prefix='/api/hospital-admin')


def get_caller_hospital():
    """Resolves and validates the caller's assigned hospital."""
    user = g.current_user
    h_id = user.hospital_id
    if not h_id:
        return None
    return db.session.get(Hospital, h_id)


# =============================================================================
# 1. Hospital Admin Operational Dashboard
# =============================================================================
@hospital_admin_bp.route('/dashboard', methods=['GET'])
@hospital_admin_required
def get_hospital_admin_dashboard():
    """
    Returns operational metrics strictly scoped to the authenticated Hospital Admin's assigned hospital.
    All figures calculated exclusively from live database records.
    """
    hospital = get_caller_hospital()
    if not hospital:
        return jsonify({
            'success': False,
            'message': 'Access denied: caller does not have an active hospital assignment.'
        }), 403

    h_id = hospital.id
    today_str = date.today().isoformat()

    total_doctors = Doctor.query.filter_by(hospital_id=h_id).count()
    active_doctors = Doctor.query.filter_by(hospital_id=h_id, status='Active').count()

    total_receptionists = User.query.filter_by(hospital_id=h_id, role='RECEPTIONIST', is_active=True).count()

    total_patients = Appointment.query.filter_by(
        hospital_id=h_id
    ).with_entities(Appointment.user_id).distinct().count()

    total_appointments = Appointment.query.filter_by(hospital_id=h_id).count()
    today_appointments = Appointment.query.filter_by(hospital_id=h_id, appointment_date=today_str).count()
    pending_appointments = Appointment.query.filter_by(hospital_id=h_id, status='Pending').count()
    completed_appointments = Appointment.query.filter_by(hospital_id=h_id, status='Completed').count()
    cancelled_appointments = Appointment.query.filter_by(hospital_id=h_id, status='Cancelled').count()

    upcoming_appointments = Appointment.query.filter(
        Appointment.hospital_id == h_id,
        Appointment.appointment_date >= today_str,
        Appointment.status.in_(['Pending', 'Confirmed'])
    ).count()

    # Calculate 7-day appointment trend
    appointment_trends = []
    for i in range(6, -1, -1):
        target_day = (date.today() - timedelta(days=i)).isoformat()
        cnt = Appointment.query.filter_by(hospital_id=h_id, appointment_date=target_day).count()
        appointment_trends.append({
            'date': target_day,
            'count': cnt
        })

    # Recent Audit Activity for this hospital
    recent_logs = AuditLog.query.filter_by(
        hospital_id=h_id
    ).order_by(AuditLog.created_at.desc()).limit(8).all()

    return jsonify({
        'success': True,
        'hospital': {
            'id': hospital.id,
            'name': hospital.name,
            'city': hospital.city,
            'state': hospital.state,
            'address': hospital.address,
            'emergency_number': hospital.emergency_number,
            'rating': hospital.rating,
            'image': hospital.image,
            'working_hours': hospital.working_hours,
            'is_verified': hospital.is_verified,
            'verification_status': hospital.verification_status
        },
        'metrics': {
            'total_doctors': total_doctors,
            'active_doctors': active_doctors,
            'total_receptionists': total_receptionists,
            'active_receptionists': total_receptionists,
            'total_patients': total_patients,
            'total_appointments': total_appointments,
            'today_appointments': today_appointments,
            'upcoming_appointments': upcoming_appointments,
            'pending_appointments': pending_appointments,
            'completed_appointments': completed_appointments,
            'cancelled_appointments': cancelled_appointments
        },
        'appointment_trends': appointment_trends,
        'recent_activity': [log.to_dict() for log in recent_logs]
    }), 200


# =============================================================================
# 2. Permitted Hospital Profile Management
# =============================================================================
@hospital_admin_bp.route('/hospital-profile', methods=['GET', 'PUT'])
@hospital_admin_required
def manage_hospital_profile():
    """
    GET: Returns assigned hospital profile details.
    PUT: Allows editing only permitted operational fields (address, phone, emergency, hours, facilities, website).
    """
    hospital = get_caller_hospital()
    if not hospital:
        return jsonify({'success': False, 'message': 'Hospital assignment missing.'}), 403

    if request.method == 'GET':
        return jsonify({
            'success': True,
            'hospital': hospital.to_dict(include_doctors=False)
        }), 200

    data = request.get_json() or {}
    caller = g.current_user

    # Only permitted operational fields can be edited by Hospital Admin
    if 'address' in data:
        hospital.address = str(data['address']).strip()
    if 'phone' in data:
        hospital.phone = str(data['phone']).strip()
    if 'emergency_number' in data:
        hospital.emergency_number = str(data['emergency_number']).strip()
    if 'working_hours' in data:
        hospital.working_hours = str(data['working_hours']).strip()
    if 'facilities' in data:
        facilities_val = data['facilities']
        if isinstance(facilities_val, list):
            hospital.facilities = ', '.join([str(f).strip() for f in facilities_val if str(f).strip()])
        else:
            hospital.facilities = str(facilities_val).strip()
    if 'website' in data:
        hospital.website = str(data['website']).strip()

    record_audit(
        caller.id,
        'UPDATE_HOSPITAL_PROFILE',
        'HOSPITAL',
        hospital.id,
        hospital_id=hospital.id,
        details={'hospital_name': hospital.name, 'updated_by': caller.email}
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Hospital operational details updated successfully!',
        'hospital': hospital.to_dict(include_doctors=False)
    }), 200


# =============================================================================
# 3. Doctor Affiliation & Rostering
# =============================================================================
@hospital_admin_bp.route('/doctors', methods=['GET'])
@hospital_admin_required
def get_hospital_doctors():
    """
    Returns doctors belonging exclusively to the caller's assigned hospital.
    """
    hospital = get_caller_hospital()
    if not hospital:
        return jsonify({'success': False, 'message': 'Hospital assignment missing.'}), 403

    doctors = Doctor.query.filter_by(
        hospital_id=hospital.id
    ).order_by(Doctor.name.asc()).all()

    return jsonify({
        'success': True,
        'hospital_id': hospital.id,
        'count': len(doctors),
        'doctors': [d.to_dict() for d in doctors]
    }), 200


# =============================================================================
# 4. Receptionist Team Management
# =============================================================================
@hospital_admin_bp.route('/receptionists', methods=['GET', 'POST'])
@hospital_admin_required
def manage_receptionists():
    """
    GET: Lists receptionists assigned to this hospital.
    POST: Onboards a receptionist account for this hospital.
    """
    hospital = get_caller_hospital()
    if not hospital:
        return jsonify({'success': False, 'message': 'Hospital assignment missing.'}), 403

    caller = g.current_user

    if request.method == 'GET':
        receptionists = User.query.filter_by(
            hospital_id=hospital.id,
            role='RECEPTIONIST'
        ).order_by(User.name.asc()).all()

        return jsonify({
            'success': True,
            'hospital_id': hospital.id,
            'count': len(receptionists),
            'receptionists': [r.to_dict() for r in receptionists]
        }), 200

    # POST: Add new receptionist
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = data.get('password') or ''

    if not name or not email or not password:
        return jsonify({'success': False, 'message': 'Name, email, and password are required.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email address is already registered.'}), 409

    now_utc = datetime.now(timezone.utc)
    new_recep = User(
        name=name,
        email=email,
        phone=phone,
        role='RECEPTIONIST',
        hospital_id=hospital.id,
        is_active=True,
        approval_status='APPROVED',
        approved_by_id=caller.id,
        approved_at=now_utc
    )
    new_recep.set_password(password)

    db.session.add(new_recep)
    db.session.commit()

    record_audit(
        caller.id,
        'ADD_RECEPTIONIST',
        'USER',
        new_recep.id,
        hospital_id=hospital.id,
        details={'receptionist_email': email, 'hospital': hospital.name}
    )
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Receptionist {name} successfully added to {hospital.name}!',
        'receptionist': new_recep.to_dict()
    }), 201


@hospital_admin_bp.route('/receptionists/<int:user_id>/status', methods=['POST'])
@hospital_admin_required
def update_receptionist_status(user_id):
    """
    Suspends or reactivates a receptionist in the caller's hospital.
    """
    hospital = get_caller_hospital()
    if not hospital:
        return jsonify({'success': False, 'message': 'Hospital assignment missing.'}), 403

    caller = g.current_user
    recep = db.session.get(User, user_id)
    if not recep or recep.hospital_id != hospital.id or recep.role != 'RECEPTIONIST':
        return jsonify({'success': False, 'message': 'Receptionist not found for this hospital.'}), 404

    data = request.get_json() or {}
    is_active = bool(data.get('is_active', not recep.is_active))

    recep.is_active = is_active
    record_audit(
        caller.id,
        'UPDATE_RECEPTIONIST_STATUS',
        'USER',
        recep.id,
        hospital_id=hospital.id,
        details={'receptionist_email': recep.email, 'is_active': is_active}
    )
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"Receptionist account has been {'reactivated' if is_active else 'deactivated'}.",
        'receptionist': recep.to_dict()
    }), 200


# =============================================================================
# 5. Hospital Appointments Visibility & Status Updates
# =============================================================================
@hospital_admin_bp.route('/appointments', methods=['GET'])
@hospital_admin_required
def get_hospital_appointments():
    """
    Returns appointments belonging exclusively to the caller's assigned hospital.
    Filters by doctor_id, date, status, patient search.
    """
    hospital = get_caller_hospital()
    if not hospital:
        return jsonify({'success': False, 'message': 'Hospital assignment missing.'}), 403

    doctor_id = request.args.get('doctor_id')
    status = request.args.get('status')
    appt_date = request.args.get('date')

    query = Appointment.query.filter_by(hospital_id=hospital.id)

    if doctor_id:
        try:
            query = query.filter_by(doctor_id=int(doctor_id))
        except ValueError:
            pass

    if status and status != 'all':
        query = query.filter_by(status=status)

    if appt_date:
        query = query.filter_by(appointment_date=appt_date)

    appointments = query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.asc()).all()

    return jsonify({
        'success': True,
        'hospital_id': hospital.id,
        'count': len(appointments),
        'appointments': [a.to_dict() for a in appointments]
    }), 200


@hospital_admin_bp.route('/appointments/<int:appointment_id>/status', methods=['PUT'])
@hospital_admin_required
def update_appointment_status(appointment_id):
    """
    Updates the operational status of an appointment in this hospital.
    """
    hospital = get_caller_hospital()
    if not hospital:
        return jsonify({'success': False, 'message': 'Hospital assignment missing.'}), 403

    caller = g.current_user
    appt = db.session.get(Appointment, appointment_id)
    if not appt or appt.hospital_id != hospital.id:
        return jsonify({'success': False, 'message': 'Appointment not found in this hospital.'}), 404

    data = request.get_json() or {}
    new_status = (data.get('status') or '').strip()
    if new_status not in ('Pending', 'Confirmed', 'Completed', 'Cancelled'):
        return jsonify({'success': False, 'message': 'Invalid appointment status.'}), 400

    old_status = appt.status
    appt.status = new_status

    record_audit(
        caller.id,
        'UPDATE_APPOINTMENT_STATUS',
        'APPOINTMENT',
        appt.id,
        hospital_id=hospital.id,
        details={'old_status': old_status, 'new_status': new_status}
    )
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Appointment #{appt.id} status updated to {new_status}.',
        'appointment': appt.to_dict()
    }), 200


# =============================================================================
# 6. Operational Reports & Analytics
# =============================================================================
@hospital_admin_bp.route('/reports', methods=['GET'])
@hospital_admin_required
def get_hospital_reports():
    """
    Returns operational performance reports (completion rate, cancellation rate,
    daily/weekly/monthly breakdown, doctor-wise counts) for this hospital.
    """
    hospital = get_caller_hospital()
    if not hospital:
        return jsonify({'success': False, 'message': 'Hospital assignment missing.'}), 403

    h_id = hospital.id
    total_appts = Appointment.query.filter_by(hospital_id=h_id).count()
    completed_appts = Appointment.query.filter_by(hospital_id=h_id, status='Completed').count()
    cancelled_appts = Appointment.query.filter_by(hospital_id=h_id, status='Cancelled').count()

    completion_rate = round((completed_appts / total_appts * 100), 1) if total_appts > 0 else 0
    cancellation_rate = round((cancelled_appts / total_appts * 100), 1) if total_appts > 0 else 0

    # Doctor-wise appointment count
    doctors = Doctor.query.filter_by(hospital_id=h_id).all()
    doctor_breakdown = []
    for doc in doctors:
        d_cnt = Appointment.query.filter_by(doctor_id=doc.id).count()
        doctor_breakdown.append({
            'doctor_id': doc.id,
            'name': doc.name,
            'specialization': doc.specialization.name if doc.specialization else '',
            'appointments_count': d_cnt
        })

    return jsonify({
        'success': True,
        'hospital_name': hospital.name,
        'total_appointments': total_appts,
        'completed_appointments': completed_appts,
        'cancelled_appointments': cancelled_appts,
        'completion_rate_percentage': completion_rate,
        'cancellation_rate_percentage': cancellation_rate,
        'doctor_breakdown': doctor_breakdown
    }), 200


# =============================================================================
# 7. Admin Profile & Assigned Hospital Details
# =============================================================================
@hospital_admin_bp.route('/profile', methods=['GET'])
@hospital_admin_required
def get_hospital_admin_profile():
    """
    Returns Hospital Admin profile and assigned hospital information.
    """
    caller = g.current_user
    hospital = get_caller_hospital()

    # Get Primary Admin status
    assignment = HospitalAdminAssignment.query.filter_by(
        hospital_id=caller.hospital_id,
        admin_id=caller.id,
        status='Active'
    ).first()

    return jsonify({
        'success': True,
        'admin': caller.to_dict(),
        'designation': assignment.designation if assignment else 'Hospital Administrator',
        'is_primary': assignment.is_primary if assignment else False,
        'hospital': hospital.to_dict(include_doctors=False) if hospital else None
    }), 200
