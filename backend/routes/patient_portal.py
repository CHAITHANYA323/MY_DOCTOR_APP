from datetime import datetime, date, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import or_
from models import db, Appointment, Doctor, Hospital, User, AmbulanceRequest
from utils.auth_middleware import jwt_required

patient_portal_bp = Blueprint('patient_portal', __name__, url_prefix='/api/patient')

def get_current_patient():
    """
    Helper to verify patient identity.
    Accepts standard 'PATIENT' and legacy 'USER' accounts.
    Enforces active account state.
    """
    user = g.current_user
    if user.role not in ('PATIENT', 'USER'):
        return None, (jsonify({
            'success': False,
            'message': 'Access denied. Patient privileges required.'
        }), 403)

    if not getattr(user, 'is_active', True):
        return None, (jsonify({
            'success': False,
            'message': 'Your account has been deactivated. Please contact support.'
        }), 403)

    return user, None


@patient_portal_bp.route('/stats', methods=['GET'])
@patient_portal_bp.route('/dashboard', methods=['GET'])
@jwt_required
def get_patient_dashboard():
    user, err = get_current_patient()
    if err:
        return err

    today_str = date.today().isoformat()

    # Query strictly scoped to caller's own user_id
    all_appts = Appointment.query.filter_by(user_id=user.id).order_by(Appointment.appointment_date.desc()).all()

    upcoming = [a for a in all_appts if a.status in ('Pending', 'Confirmed') and a.appointment_date >= today_str]
    completed = [a for a in all_appts if a.status == 'Completed']
    cancelled = [a for a in all_appts if a.status == 'Cancelled']

    ambulance_requests = AmbulanceRequest.query.filter_by(user_id=user.id).order_by(AmbulanceRequest.created_at.desc()).limit(5).all()

    return jsonify({
        'success': True,
        'metrics': {
            'total_appointments': len(all_appts),
            'upcoming_count': len(upcoming),
            'completed_count': len(completed),
            'cancelled_count': len(cancelled),
            'total_ambulance_requests': len(ambulance_requests)
        },
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'phone': user.phone or '',
            'role': user.role
        },
        'upcoming_appointments': [a.to_dict() for a in upcoming[:5]],
        'recent_consultations': [a.to_dict() for a in completed[:5]],
        'recent_ambulance_requests': [r.to_dict() for r in ambulance_requests]
    }), 200


@patient_portal_bp.route('/appointments', methods=['GET'])
@jwt_required
def get_patient_appointments():
    user, err = get_current_patient()
    if err:
        return err

    status_filter = request.args.get('status', '').strip().lower()
    search = request.args.get('search', '').strip().lower()
    today_str = date.today().isoformat()

    query = Appointment.query.filter_by(user_id=user.id)

    appts = query.order_by(Appointment.appointment_date.desc(), Appointment.id.desc()).all()

    # Filter in Python for robust composite status (e.g. 'upcoming')
    filtered = []
    for a in appts:
        if status_filter == 'upcoming':
            if a.status not in ('Pending', 'Confirmed') or a.appointment_date < today_str:
                continue
        elif status_filter and status_filter != 'all':
            if a.status.lower() != status_filter:
                continue

        if search:
            doc_name = (a.doctor.name if a.doctor else '').lower()
            hosp_name = (a.hospital.name if a.hospital else '').lower()
            reason = (a.reason or '').lower()
            if search not in doc_name and search not in hosp_name and search not in reason:
                continue

        filtered.append(a)

    return jsonify({
        'success': True,
        'total': len(filtered),
        'appointments': [a.to_dict() for a in filtered]
    }), 200


@patient_portal_bp.route('/appointments/<int:appointment_id>', methods=['GET'])
@jwt_required
def get_patient_appointment_detail(appointment_id):
    user, err = get_current_patient()
    if err:
        return err

    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        return jsonify({'success': False, 'message': 'Appointment not found.'}), 404

    # Strict ownership check (IDOR defense)
    if appt.user_id != user.id:
        return jsonify({
            'success': False,
            'message': 'Unauthorized access to appointment details.'
        }), 403

    return jsonify({
        'success': True,
        'appointment': appt.to_dict()
    }), 200


@patient_portal_bp.route('/appointments/<int:appointment_id>/cancel', methods=['PUT', 'POST'])
@jwt_required
def cancel_patient_appointment(appointment_id):
    user, err = get_current_patient()
    if err:
        return err

    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        return jsonify({'success': False, 'message': 'Appointment not found.'}), 404

    # Strict ownership check (IDOR defense)
    if appt.user_id != user.id:
        return jsonify({
            'success': False,
            'message': 'Unauthorized to cancel this appointment.'
        }), 403

    if appt.status == 'Completed':
        return jsonify({
            'success': False,
            'message': 'Completed medical visits cannot be cancelled.'
        }), 400

    if appt.status == 'Cancelled':
        return jsonify({
            'success': False,
            'message': 'This appointment is already cancelled.'
        }), 400

    appt.status = 'Cancelled'
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Appointment cancelled successfully.',
        'appointment': appt.to_dict()
    }), 200


@patient_portal_bp.route('/medical-records', methods=['GET'])
@jwt_required
def get_patient_medical_records():
    user, err = get_current_patient()
    if err:
        return err

    # Completed visits represent clinical consultation records
    completed_appts = Appointment.query.filter_by(
        user_id=user.id,
        status='Completed'
    ).order_by(Appointment.appointment_date.desc(), Appointment.id.desc()).all()

    records = []
    for a in completed_appts:
        records.append({
            'appointment_id': a.id,
            'visit_date': a.appointment_date,
            'visit_time': a.appointment_time,
            'doctor_name': a.doctor.name if a.doctor else 'Medical Specialist',
            'doctor_id': a.doctor_id,
            'specialization': a.doctor.specialization.name if (a.doctor and a.doctor.specialization) else 'General',
            'hospital_name': a.hospital.name if a.hospital else 'Hospital Center',
            'hospital_id': a.hospital_id,
            'chief_complaint': a.reason,
            'clinical_notes': a.notes or '',
            'has_prescription': bool(a.notes and ('rx' in a.notes.lower() or 'mg' in a.notes.lower() or 'prescrib' in a.notes.lower())),
            'status': a.status
        })

    return jsonify({
        'success': True,
        'total': len(records),
        'records': records
    }), 200


@patient_portal_bp.route('/profile', methods=['GET'])
@jwt_required
def get_patient_profile():
    user, err = get_current_patient()
    if err:
        return err

    return jsonify({
        'success': True,
        'user': user.to_dict()
    }), 200


@patient_portal_bp.route('/profile', methods=['PUT'])
@jwt_required
def update_patient_profile():
    user, err = get_current_patient()
    if err:
        return err

    data = request.get_json() or {}

    # Disallow role and administrative tampering
    restricted = ['role', 'id', 'hospital_id']
    for field in restricted:
        if field in data and str(data[field]) != str(getattr(user, field, '')):
            return jsonify({
                'success': False,
                'message': f"Access denied. Tampering with account '{field}' is strictly prohibited."
            }), 403

    if 'name' in data and data['name'].strip():
        user.name = data['name'].strip()
    if 'phone' in data:
        user.phone = data['phone'].strip()
    if 'avatar' in data:
        user.avatar = data['avatar'].strip()

    # Password update with verification
    new_password = (data.get('new_password') or data.get('password') or '').strip()
    current_password = data.get('current_password') or ''
    if new_password:
        if not current_password:
            return jsonify({'success': False, 'message': 'Current password is required to update password.'}), 400
        if not user.check_password(current_password):
            return jsonify({'success': False, 'message': 'Current password is incorrect.'}), 400
        if len(new_password) < 6:
            return jsonify({'success': False, 'message': 'New password must be at least 6 characters long.'}), 400
        user.set_password(new_password)

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Profile updated successfully.',
        'user': user.to_dict()
    }), 200
