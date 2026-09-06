from datetime import datetime, date
from flask import Blueprint, request, jsonify, g
from models import db, Appointment, Doctor, Hospital
from utils.auth_middleware import jwt_required

appointments_bp = Blueprint('appointments', __name__, url_prefix='/api/appointments')

@appointments_bp.route('', methods=['GET'])
@jwt_required
def get_appointments():
    user = g.current_user
    status = request.args.get('status', '').strip()
    doctor_id = request.args.get('doctor_id')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))

    query = Appointment.query

    # If not admin, restrict to current user's appointments
    if user.role != 'ADMIN':
        query = query.filter_by(user_id=user.id)

    if status and status.lower() != 'all':
        query = query.filter(Appointment.status.ilike(status))

    if doctor_id and doctor_id.isdigit():
        query = query.filter_by(doctor_id=int(doctor_id))

    total = query.count()
    appointments = query.order_by(Appointment.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'success': True,
        'total': total,
        'page': page,
        'limit': limit,
        'appointments': [a.to_dict() for a in appointments]
    }), 200

@appointments_bp.route('/<int:appointment_id>', methods=['GET'])
@jwt_required
def get_appointment(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({'success': False, 'message': 'Appointment not found.'}), 404

    # Permission check: either owner or admin
    if g.current_user.role != 'ADMIN' and appointment.user_id != g.current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized access to appointment details.'}), 403

    return jsonify({
        'success': True,
        'appointment': appointment.to_dict()
    }), 200

@appointments_bp.route('', methods=['POST'])
@jwt_required
def create_appointment():
    data = request.get_json() or {}
    doctor_id = data.get('doctor_id')
    hospital_id = data.get('hospital_id')
    appointment_date = (data.get('appointment_date') or '').strip()
    appointment_time = (data.get('appointment_time') or '').strip()
    reason = (data.get('reason') or '').strip()

    if not doctor_id or not appointment_date or not appointment_time or not reason:
        return jsonify({'success': False, 'message': 'Doctor, appointment date, time, and consultation reason are required.'}), 400

    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({'success': False, 'message': 'Selected doctor does not exist.'}), 400

    # Auto-resolve hospital if not provided
    if not hospital_id:
        hospital_id = doctor.hospital_id
    else:
        hospital = Hospital.query.get(hospital_id)
        if not hospital:
            hospital_id = doctor.hospital_id

    # Date validation: should not be in the past
    try:
        appt_d = datetime.strptime(appointment_date, '%Y-%m-%d').date()
        if appt_d < date.today():
            return jsonify({'success': False, 'message': 'Appointment date cannot be in the past.'}), 400
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    appointment = Appointment(
        user_id=g.current_user.id,
        doctor_id=doctor.id,
        hospital_id=hospital_id,
        appointment_date=appointment_date,
        appointment_time=appointment_time,
        reason=reason,
        status='Pending',
        notes=data.get('notes', '')
    )

    db.session.add(appointment)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Appointment booked successfully with Dr. {doctor.name} on {appointment_date} at {appointment_time}.',
        'appointment': appointment.to_dict()
    }), 201

@appointments_bp.route('/<int:appointment_id>', methods=['PUT'])
@jwt_required
def update_appointment(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({'success': False, 'message': 'Appointment not found.'}), 404

    is_admin = g.current_user.role == 'ADMIN'
    is_owner = appointment.user_id == g.current_user.id

    if not is_admin and not is_owner:
        return jsonify({'success': False, 'message': 'Unauthorized to update this appointment.'}), 403

    data = request.get_json() or {}
    new_status = data.get('status')

    # Regular patients can only cancel their own pending/confirmed appointment
    if not is_admin:
        if new_status and new_status.capitalize() == 'Cancelled':
            appointment.status = 'Cancelled'
        else:
            return jsonify({'success': False, 'message': 'Patients can only cancel appointments.'}), 403
    else:
        # Admin can update status to Confirmed, Completed, Cancelled, Pending
        if new_status:
            appointment.status = new_status.capitalize()
        if 'notes' in data:
            appointment.notes = data['notes']
        if 'appointment_date' in data:
            appointment.appointment_date = data['appointment_date']
        if 'appointment_time' in data:
            appointment.appointment_time = data['appointment_time']

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Appointment status updated to {appointment.status}.',
        'appointment': appointment.to_dict()
    }), 200

@appointments_bp.route('/<int:appointment_id>', methods=['DELETE'])
@jwt_required
def delete_appointment(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({'success': False, 'message': 'Appointment not found.'}), 404

    if g.current_user.role != 'ADMIN' and appointment.user_id != g.current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized.'}), 403

    db.session.delete(appointment)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Appointment record removed.'
    }), 200
