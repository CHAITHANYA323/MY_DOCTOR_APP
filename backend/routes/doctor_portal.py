from datetime import datetime, date, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text, or_
from models import db, Doctor, Appointment, User, Hospital, Specialization, Review
from utils.auth_middleware import jwt_required

doctor_portal_bp = Blueprint('doctor_portal', __name__, url_prefix='/api/doctor')

def get_current_doctor():
    """
    Helper to verify doctor identity and retrieve linked doctor profile.
    Returns (doctor, error_response).
    """
    user = g.current_user
    if user.role != 'DOCTOR':
        return None, (jsonify({
            'success': False,
            'message': 'Access denied. Doctor privileges required.'
        }), 403)

    doctor = user.doctor_profile or Doctor.query.filter_by(user_id=user.id).first()
    if not doctor:
        return None, (jsonify({
            'success': False,
            'message': 'Doctor profile not found or not linked to this user account.'
        }), 404)

    return doctor, None


@doctor_portal_bp.route('/profile', methods=['GET'])
@doctor_portal_bp.route('/me', methods=['GET'])
@jwt_required
def get_doctor_profile():
    doctor, err = get_current_doctor()
    if err:
        return err

    data = doctor.to_dict(brief=False)
    # Include user account identity info
    data['account_email'] = g.current_user.email
    data['account_name'] = g.current_user.name

    return jsonify({
        'success': True,
        'doctor': data
    }), 200


@doctor_portal_bp.route('/profile', methods=['PUT'])
@doctor_portal_bp.route('/me', methods=['PUT'])
@jwt_required
def update_doctor_profile():
    doctor, err = get_current_doctor()
    if err:
        return err

    data = request.get_json() or {}

    # Multi-tenant IDOR protection: Non-administrators cannot tamper with hospital, specialization, or linked user
    restricted_fields = ['hospital_id', 'specialization_id', 'user_id', 'id']
    for field in restricted_fields:
        if field in data and str(data[field]) != str(getattr(doctor, field, '')):
            return jsonify({
                'success': False,
                'message': f"Access denied. Modifying '{field}' is restricted to hospital administrators."
            }), 403

    # Name is administrative
    if 'name' in data and data['name'].strip() and data['name'].strip() != doctor.name:
        return jsonify({
            'success': False,
            'message': 'Access denied. Doctor legal/credential name can only be updated by Hospital Administration.'
        }), 403

    # Editable self-service fields
    if 'about' in data:
        doctor.about = str(data['about']).strip()
    if 'languages' in data:
        doctor.languages = str(data['languages']).strip()
    if 'consultation_type' in data:
        doctor.consultation_type = str(data['consultation_type']).strip()
    if 'available_days' in data:
        doctor.available_days = str(data['available_days']).strip()
    if 'available_time' in data:
        doctor.available_time = str(data['available_time']).strip()
    if 'phone' in data:
        doctor.phone = str(data['phone']).strip()
    if 'email' in data:
        doctor.email = str(data['email']).strip()
    if 'status' in data:
        new_status = str(data['status']).capitalize()
        if new_status in ('Active', 'Inactive'):
            doctor.status = new_status

    if 'consultation_fee' in data:
        try:
            fee = float(data['consultation_fee'])
            if fee < 0:
                return jsonify({'success': False, 'message': 'Consultation fee cannot be negative.'}), 400
            doctor.consultation_fee = fee
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Invalid numeric value for consultation fee.'}), 400

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Doctor profile updated successfully.',
        'doctor': doctor.to_dict(brief=False)
    }), 200


@doctor_portal_bp.route('/stats', methods=['GET'])
@doctor_portal_bp.route('/dashboard', methods=['GET'])
@jwt_required
def get_doctor_stats():
    doctor, err = get_current_doctor()
    if err:
        return err

    today_str = date.today().isoformat()

    # Query appointments for this doctor only
    today_appts = Appointment.query.filter_by(
        doctor_id=doctor.id,
        appointment_date=today_str
    ).all()

    today_pending = sum(1 for a in today_appts if a.status == 'Pending')
    today_confirmed = sum(1 for a in today_appts if a.status == 'Confirmed')
    today_completed = sum(1 for a in today_appts if a.status == 'Completed')
    today_cancelled = sum(1 for a in today_appts if a.status == 'Cancelled')

    # All-time metrics for this doctor
    all_appts = Appointment.query.filter_by(doctor_id=doctor.id).all()
    total_appointments = len(all_appts)
    total_completed = sum(1 for a in all_appts if a.status == 'Completed')
    total_cancelled = sum(1 for a in all_appts if a.status == 'Cancelled')

    # Distinct unique patients treated by this doctor
    total_patients = db.session.query(Appointment.user_id).filter_by(doctor_id=doctor.id).distinct().count()

    # Sort today's schedule
    today_schedule = sorted(
        today_appts,
        key=lambda a: (a.appointment_time or '')
    )

    # Latest 6 appointments
    recent_appts = Appointment.query.filter_by(
        doctor_id=doctor.id
    ).order_by(Appointment.created_at.desc()).limit(6).all()

    return jsonify({
        'success': True,
        'metrics': {
            'today_appointments': len(today_appts),
            'today_pending': today_pending,
            'today_confirmed': today_confirmed,
            'today_completed': today_completed,
            'today_cancelled': today_cancelled,
            'total_appointments': total_appointments,
            'total_completed': total_completed,
            'total_cancelled': total_cancelled,
            'total_patients': total_patients,
            'rating': round(doctor.rating, 1) if doctor.rating else 4.9,
            'total_reviews': doctor.total_reviews or 0
        },
        'doctor': {
            'id': doctor.id,
            'name': doctor.name,
            'specialization': doctor.specialization.name if doctor.specialization else '',
            'hospital': doctor.hospital.name if doctor.hospital else '',
            'hospital_id': doctor.hospital_id,
            'status': doctor.status,
            'consultation_fee': doctor.consultation_fee,
            'available_days': doctor.available_days,
            'available_time': doctor.available_time,
            'image': doctor.image
        },
        'today_schedule': [a.to_dict() for a in today_schedule],
        'recent_appointments': [a.to_dict() for a in recent_appts]
    }), 200


@doctor_portal_bp.route('/patients', methods=['GET'])
@jwt_required
def get_doctor_patients():
    doctor, err = get_current_doctor()
    if err:
        return err

    search = request.args.get('search', '').strip()

    # 1. Scoped patient IDs: only patients who have at least one appointment with this doctor
    patient_ids_query = db.session.query(Appointment.user_id).filter_by(doctor_id=doctor.id).distinct()
    patient_ids = [r[0] for r in patient_ids_query.all()]

    if not patient_ids:
        return jsonify({
            'success': True,
            'total': 0,
            'patients': []
        }), 200

    query = User.query.filter(User.id.in_(patient_ids))

    if search:
        search_pat = f"%{search}%"
        query = query.filter(
            or_(
                User.name.ilike(search_pat),
                User.email.ilike(search_pat),
                User.phone.ilike(search_pat)
            )
        )

    users = query.all()

    # Construct patient summary records with consultation stats for this doctor
    patient_records = []
    for u in users:
        # Total visits with this doctor
        visits_count = Appointment.query.filter_by(
            doctor_id=doctor.id,
            user_id=u.id
        ).count()

        # Last appointment with this doctor
        last_appt = Appointment.query.filter_by(
            doctor_id=doctor.id,
            user_id=u.id
        ).order_by(Appointment.appointment_date.desc(), Appointment.id.desc()).first()

        patient_records.append({
            'id': u.id,
            'name': u.name,
            'email': u.email,
            'phone': u.phone or 'Not Provided',
            'gender': getattr(u, 'gender', 'Not Specified'),
            'age': getattr(u, 'age', 'N/A'),
            'blood_group': getattr(u, 'blood_group', 'N/A'),
            'emergency_contact': getattr(u, 'emergency_contact', 'N/A'),
            'total_visits': visits_count,
            'last_visit_date': last_appt.appointment_date if last_appt else None,
            'last_status': last_appt.status if last_appt else None,
            'last_notes': last_appt.notes if last_appt else '',
            'last_reason': last_appt.reason if last_appt else ''
        })

    # Sort by last_visit_date descending
    patient_records.sort(key=lambda p: (p['last_visit_date'] or ''), reverse=True)

    return jsonify({
        'success': True,
        'total': len(patient_records),
        'patients': patient_records
    }), 200


@doctor_portal_bp.route('/patients/<int:patient_id>', methods=['GET'])
@jwt_required
def get_doctor_patient_details(patient_id):
    doctor, err = get_current_doctor()
    if err:
        return err

    # Strict multi-tenant IDOR protection:
    # Doctor may ONLY view patient details if that patient has an appointment history with this doctor
    has_consultation = Appointment.query.filter_by(
        doctor_id=doctor.id,
        user_id=patient_id
    ).first()

    if not has_consultation:
        return jsonify({
            'success': False,
            'message': 'Access denied. You can only view clinical records of patients who have booked or attended appointments with you.'
        }), 403

    patient = db.session.get(User, patient_id)
    if not patient:
        return jsonify({'success': False, 'message': 'Patient record not found.'}), 404

    # Fetch all consultation records between this doctor and this patient
    appointments = Appointment.query.filter_by(
        doctor_id=doctor.id,
        user_id=patient_id
    ).order_by(Appointment.appointment_date.desc(), Appointment.id.desc()).all()

    return jsonify({
        'success': True,
        'patient': {
            'id': patient.id,
            'name': patient.name,
            'email': patient.email,
            'phone': patient.phone or 'Not Provided',
            'gender': getattr(patient, 'gender', 'Not Specified'),
            'age': getattr(patient, 'age', 'N/A'),
            'blood_group': getattr(patient, 'blood_group', 'N/A'),
            'emergency_contact': getattr(patient, 'emergency_contact', 'N/A'),
            'total_visits': len(appointments)
        },
        'appointments': [a.to_dict() for a in appointments]
    }), 200


@doctor_portal_bp.route('/appointments/<int:appointment_id>', methods=['PUT'])
@jwt_required
def update_doctor_appointment(appointment_id):
    doctor, err = get_current_doctor()
    if err:
        return err

    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        return jsonify({'success': False, 'message': 'Appointment not found.'}), 404

    # Strict ownership check
    if appt.doctor_id != doctor.id:
        return jsonify({
            'success': False,
            'message': 'Unauthorized. Doctor can only modify their own appointments.'
        }), 403

    data = request.get_json() or {}

    # Disallowed mutations
    unsupported = [k for k in ('doctor_id', 'hospital_id', 'user_id', 'patient_id') if k in data]
    if unsupported:
        return jsonify({
            'success': False,
            'message': f"Modifying {', '.join(unsupported)} is not supported."
        }), 400

    target_status = data.get('status')
    if target_status:
        target_status = str(target_status).capitalize()
        if target_status not in ('Confirmed', 'Completed', 'Cancelled'):
            return jsonify({
                'success': False,
                'message': 'Doctors can only mark consultations as Confirmed, Completed, or Cancelled.'
            }), 403
        appt.status = target_status

    if 'notes' in data:
        appt.notes = str(data['notes']).strip()

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Consultation updated successfully. Status: {appt.status}.',
        'appointment': appt.to_dict()
    }), 200
