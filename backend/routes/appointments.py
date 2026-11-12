import re
import sqlite3
from datetime import datetime, date, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, IntegrityError
from models import db, Appointment, Doctor, Hospital, User
from utils.auth_middleware import jwt_required

appointments_bp = Blueprint('appointments', __name__, url_prefix='/api/appointments')

VALID_STATUSES = {'Pending', 'Confirmed', 'Cancelled', 'Completed'}
ACTIVE_STATUSES = {'Pending', 'Confirmed'}

TIME_12H_REGEX = re.compile(r'^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$', re.IGNORECASE)
TIME_24H_REGEX = re.compile(r'^([01]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$')

def normalize_appointment_time(time_str: str) -> str:
    """
    Validates and normalizes appointment time into canonical 12-hour format: 'hh:mm AM|PM'.
    Rejects invalid values (e.g. 25:00, 13:75, 00:30 AM, 13:00 PM).
    """
    if not time_str or not isinstance(time_str, str):
        raise ValueError("Appointment time is required.")

    cleaned = time_str.strip()

    # 1. Match 12-hour format: hour 1-12, minute 00-59, AM/PM
    m12 = TIME_12H_REGEX.match(cleaned)
    if m12:
        hour, minute, period = m12.groups()
        return f"{int(hour):02d}:{int(minute):02d} {period.upper()}"

    # 2. Match 24-hour format: hour 00-23, minute 00-59
    m24 = TIME_24H_REGEX.match(cleaned)
    if m24:
        hour, minute, _ = m24.groups()
        dt = datetime.strptime(f"{int(hour):02d}:{int(minute):02d}", "%H:%M")
        return dt.strftime("%I:%M %p")

    raise ValueError(
        f"Invalid appointment time '{time_str}'. Time must be in valid 12-hour (e.g., '09:30 AM') or 24-hour (e.g., '14:30') format."
    )

def acquire_doctor_lock(doctor_id: int):
    """
    Acquires database-level lock to prevent concurrent double bookings:
    - SQLite: rolls back read-only session state from auth/lookup, then executes BEGIN IMMEDIATE.
    - MySQL / PostgreSQL: executes SELECT ... FROM doctors WHERE id=:id FOR UPDATE inside continuous tx.
    """
    if db.engine.name == 'sqlite':
        db.session.rollback()
        db.session.execute(text("BEGIN IMMEDIATE"))
    else:
        doc = Doctor.query.filter_by(id=doctor_id).with_for_update().one_or_none()
        if not doc:
            raise ValueError(f"Doctor with ID {doctor_id} not found for lock acquisition.")


@appointments_bp.route('/booked-slots', methods=['GET'])
def get_booked_slots():
    """
    Returns a list of occupied appointment time slots for a given doctor and date.
    Only 'Pending' and 'Confirmed' appointments occupy slots.
    'Cancelled' and 'Completed' do not block availability.
    Times are normalized into canonical 'hh:mm AM|PM' format to guarantee frontend match.
    """
    doctor_id = request.args.get('doctor_id')
    appt_date = (request.args.get('date') or request.args.get('appointment_date') or '').strip()

    if not doctor_id or not doctor_id.isdigit():
        return jsonify({'success': False, 'message': 'Valid numeric doctor_id is required.'}), 400

    if not appt_date:
        return jsonify({'success': False, 'message': 'Date (YYYY-MM-DD) is required.'}), 400

    try:
        datetime.strptime(appt_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    active_appts = Appointment.query.filter(
        Appointment.doctor_id == int(doctor_id),
        Appointment.appointment_date == appt_date,
        Appointment.status.in_(['Pending', 'Confirmed'])
    ).all()

    booked_slots = []
    for a in active_appts:
        try:
            booked_slots.append(normalize_appointment_time(a.appointment_time))
        except ValueError:
            booked_slots.append(a.appointment_time)

    # Unique list preserving order
    unique_slots = list(dict.fromkeys(booked_slots))

    return jsonify({
        'success': True,
        'doctor_id': int(doctor_id),
        'date': appt_date,
        'booked_slots': unique_slots
    }), 200


@appointments_bp.route('', methods=['GET'])
@jwt_required
def get_appointments():
    user = g.current_user
    status = request.args.get('status', '').strip()
    doctor_id = request.args.get('doctor_id')
    hospital_id_param = request.args.get('hospital_id')
    view_mode = request.args.get('view', '').strip().lower()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))

    query = Appointment.query

    # Multi-tenant hospital isolation with SEC-05 dual-context personal view
    if view_mode in ('patient', 'personal') or user.role in ('PATIENT', 'USER'):
        # Strict ownership check: personal view is strictly scoped to the caller's own user_id
        query = query.filter_by(user_id=user.id)
    elif user.role == 'PLATFORM_OWNER':
        if hospital_id_param and hospital_id_param.isdigit():
            query = query.filter_by(hospital_id=int(hospital_id_param))
    elif user.role in ('HOSPITAL_SUPER_ADMIN', 'RECEPTIONIST', 'ADMIN'):
        if not user.hospital_id:
            return jsonify({'success': False, 'message': 'Staff user has no hospital assigned.'}), 403
        query = query.filter_by(hospital_id=user.hospital_id)
    elif user.role == 'DOCTOR':
        if not user.doctor_profile:
            return jsonify({'success': True, 'total': 0, 'page': page, 'limit': limit, 'appointments': []}), 200
        query = query.filter_by(doctor_id=user.doctor_profile.id)
    else:
        # Unassigned legacy ADMIN or unknown role has no wildcard bypass
        return jsonify({'success': False, 'message': 'Access denied. Account must be assigned to an authorized role.'}), 403

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
    appointment = db.session.get(Appointment, appointment_id)
    if not appointment:
        return jsonify({'success': False, 'message': 'Appointment not found.'}), 404

    user = g.current_user
    # Multi-tenant authorization check
    authorized = False
    if appointment.user_id == user.id:
        # User is the patient who booked this appointment
        authorized = True
    elif user.role == 'PLATFORM_OWNER':
        authorized = True
    elif user.role in ('HOSPITAL_SUPER_ADMIN', 'RECEPTIONIST', 'ADMIN'):
        authorized = (user.hospital_id is not None and appointment.hospital_id == user.hospital_id)
    elif user.role == 'DOCTOR':
        authorized = (user.doctor_profile is not None and appointment.doctor_id == user.doctor_profile.id)
    elif user.role in ('PATIENT', 'USER'):
        authorized = (appointment.user_id == user.id)

    if not authorized:
        return jsonify({'success': False, 'message': 'Unauthorized access to appointment details.'}), 403

    return jsonify({
        'success': True,
        'appointment': appointment.to_dict()
    }), 200


@appointments_bp.route('', methods=['POST'])
@jwt_required
def create_appointment():
    current_user_id = g.current_user.id
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

    # Role-based hospital scoping and patient identity resolution
    user = g.current_user
    booking_user_id = current_user_id

    if user.role in ('RECEPTIONIST', 'ADMIN'):
        if not user.hospital_id:
            return jsonify({'success': False, 'message': 'Staff user has no hospital assigned.'}), 403
        if doctor.hospital_id != user.hospital_id:
            return jsonify({'success': False, 'message': 'Receptionists can only book appointments for doctors in their assigned hospital.'}), 403
        # Strict tenant override: force hospital_id to receptionist's hospital
        hospital_id = user.hospital_id

        target_patient_id = data.get('patient_id') or data.get('user_id')
        if not target_patient_id:
            return jsonify({'success': False, 'message': 'Patient selection is required for reception appointment booking.'}), 400
        patient_record = db.session.get(User, target_patient_id)
        if not patient_record:
            return jsonify({'success': False, 'message': 'Specified patient account does not exist.'}), 404
        if patient_record.role not in ('USER', 'PATIENT'):
            return jsonify({'success': False, 'message': 'Appointments can only be booked for patients.'}), 400
        booking_user_id = patient_record.id
    elif user.role in ('PATIENT', 'USER'):
        hospital_id = doctor.hospital_id
    elif user.role in ('HOSPITAL_SUPER_ADMIN',):
        if not user.hospital_id:
            return jsonify({'success': False, 'message': 'Hospital Admin has no hospital assigned.'}), 403
        if doctor.hospital_id != user.hospital_id:
            return jsonify({'success': False, 'message': 'Hospital Admins can only book appointments for their assigned hospital.'}), 403
        hospital_id = user.hospital_id
        target_patient_id = data.get('patient_id') or data.get('user_id')
        if target_patient_id:
            patient_record = db.session.get(User, target_patient_id)
            if not patient_record:
                return jsonify({'success': False, 'message': 'Patient account not found.'}), 404
            booking_user_id = patient_record.id
    else:
        # Auto-resolve hospital if not provided
        if not hospital_id:
            hospital_id = doctor.hospital_id
        else:
            hospital = Hospital.query.get(hospital_id)
            if not hospital:
                hospital_id = doctor.hospital_id

    # Date validation: format and must not be in past
    try:
        appt_d = datetime.strptime(appointment_date, '%Y-%m-%d').date()
        if appt_d < date.today():
            return jsonify({'success': False, 'message': 'Appointment date cannot be in the past.'}), 400
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    # Strict time canonicalization
    try:
        canonical_time = normalize_appointment_time(appointment_time)
    except ValueError as val_err:
        return jsonify({'success': False, 'message': str(val_err)}), 400

    try:
        # Acquire transaction-level lock
        acquire_doctor_lock(doctor.id)

        # Conflict check inside lock: only 'Pending' and 'Confirmed' occupy slots
        # Query active appointments for this doctor and date
        active_existing = Appointment.query.filter(
            Appointment.doctor_id == doctor.id,
            Appointment.appointment_date == appointment_date,
            Appointment.status.in_(['Pending', 'Confirmed'])
        ).all()

        conflict_exists = False
        for ex in active_existing:
            try:
                ex_canonical = normalize_appointment_time(ex.appointment_time)
            except ValueError:
                ex_canonical = ex.appointment_time
            if ex_canonical == canonical_time:
                conflict_exists = True
                break

        if conflict_exists:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f'This appointment slot ({canonical_time} on {appointment_date}) has already been booked. Please choose another time.'
            }), 409

        appointment = Appointment(
            user_id=booking_user_id,
            doctor_id=doctor.id,
            hospital_id=hospital_id,
            appointment_date=appointment_date,
            appointment_time=canonical_time,
            reason=reason,
            status='Pending',
            notes=data.get('notes', '')
        )

        db.session.add(appointment)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Appointment booked successfully with Dr. {doctor.name} on {appointment_date} at {canonical_time}.',
            'appointment': appointment.to_dict()
        }), 201

    except OperationalError as oe:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'The booking system is currently experiencing high demand. Please retry your request in a moment.'
        }), 503
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'This appointment slot ({canonical_time} on {appointment_date}) has already been booked.'
        }), 409
    except Exception:
        db.session.rollback()
        raise


@appointments_bp.route('/<int:appointment_id>', methods=['PUT'])
@jwt_required
def update_appointment(appointment_id):
    user = g.current_user
    current_user_id = user.id
    role = user.role

    is_platform_owner = (role == 'PLATFORM_OWNER')
    is_hospital_admin = (role == 'HOSPITAL_SUPER_ADMIN')
    is_receptionist = (role in ('RECEPTIONIST', 'ADMIN'))
    is_doctor = (role == 'DOCTOR')
    is_patient = (role in ('PATIENT', 'USER'))
    is_staff = (is_platform_owner or is_hospital_admin or is_receptionist)

    data = request.get_json() or {}

    # 1. Guard against unsupported mutations: doctor_id, hospital_id, user_id
    unsupported_fields = [k for k in ('doctor_id', 'hospital_id', 'user_id', 'patient_id') if k in data]
    if unsupported_fields:
        return jsonify({
            'success': False,
            'message': f"Modifying {', '.join(unsupported_fields)} is not supported. To reassign a doctor or hospital, please cancel this appointment and create a new booking."
        }), 400

    # 2. Status value validation
    raw_status = data.get('status')
    target_status = raw_status.capitalize() if isinstance(raw_status, str) and raw_status.strip() else None
    if target_status and target_status not in VALID_STATUSES:
        return jsonify({
            'success': False,
            'message': f"Invalid status '{raw_status}'. Allowed statuses: {', '.join(sorted(VALID_STATUSES))}."
        }), 400

    # 3. Date & time input validation
    new_date = (data.get('appointment_date') or '').strip()
    new_time = (data.get('appointment_time') or '').strip()

    if new_date:
        try:
            d_obj = datetime.strptime(new_date, '%Y-%m-%d').date()
            if d_obj < date.today():
                return jsonify({'success': False, 'message': 'Appointment date cannot be in the past.'}), 400
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    if new_time:
        try:
            normalized_new_time = normalize_appointment_time(new_time)
        except ValueError as e:
            return jsonify({'success': False, 'message': str(e)}), 400
    else:
        normalized_new_time = None

    # 4. Role capability restrictions
    if is_patient:
        if target_status != 'Cancelled' or new_date or new_time:
            return jsonify({
                'success': False,
                'message': 'Patients can only cancel appointments. Rescheduling or modifying details requires administrative support.'
            }), 403
    elif is_receptionist:
        if target_status and target_status not in ('Confirmed', 'Cancelled'):
            return jsonify({
                'success': False,
                'message': 'Receptionists can only confirm (check-in) or cancel appointments.'
            }), 403
    elif is_doctor:
        if target_status and target_status not in ('Completed', 'Confirmed', 'Cancelled'):
            return jsonify({
                'success': False,
                'message': 'Doctors can only mark consultations as Completed, Confirmed, or Cancelled.'
            }), 403

    # 5. Initial read and multi-tenant authorization
    initial_appt = Appointment.query.filter_by(id=appointment_id).first()
    if not initial_appt:
        return jsonify({'success': False, 'message': 'Appointment not found.'}), 404

    # Hospital boundary isolation check
    if is_platform_owner:
        pass
    elif is_hospital_admin or is_receptionist:
        if not user.hospital_id or initial_appt.hospital_id != user.hospital_id:
            return jsonify({'success': False, 'message': 'Unauthorized. Cross-hospital mutation is blocked.'}), 403
    elif is_doctor:
        if not user.doctor_profile or initial_appt.doctor_id != user.doctor_profile.id:
            return jsonify({'success': False, 'message': 'Unauthorized. Doctor can only modify their own appointments.'}), 403
    elif is_patient:
        if initial_appt.user_id != current_user_id:
            return jsonify({'success': False, 'message': 'Unauthorized to update this appointment.'}), 403
    else:
        return jsonify({'success': False, 'message': 'Access denied. Account must be assigned an authorized role.'}), 403

    target_doctor_id = initial_appt.doctor_id

    # 6. Acquire doctor lock and perform all operations within the active lock boundary
    try:
        acquire_doctor_lock(target_doctor_id)

        # Re-fetch fresh appointment object inside locked transaction
        appointment = Appointment.query.filter_by(id=appointment_id).first()
        if not appointment:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Appointment was deleted by another request.'}), 404

        # Re-verify ownership on fresh record
        if is_patient and appointment.user_id != current_user_id:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Unauthorized.'}), 403
        elif (is_hospital_admin or is_receptionist) and (not user.hospital_id or appointment.hospital_id != user.hospital_id):
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Unauthorized. Cross-hospital mutation is blocked.'}), 403

        # Guard: Completed appointments are terminal historical records
        if appointment.status == 'Completed':
            if target_status and target_status != 'Completed':
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'message': 'Completed appointments are historical terminal records and cannot be reopened or cancelled.'
                }), 400
            if new_date or normalized_new_time:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'message': 'Slot parameters of completed consultations are immutable.'
                }), 400
            # Allow authorized staff or doctor note append
            if 'notes' in data and (is_staff or is_doctor):
                new_note = str(data['notes']).strip()
                existing_notes = (appointment.notes or '').strip()
                if new_note and new_note != existing_notes:
                    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
                    appointment.notes = f"{existing_notes}\n[{role} Note {timestamp}]: {new_note}".strip()
                    db.session.commit()
                    return jsonify({
                        'success': True,
                        'message': 'Clinical/administrative note appended to completed appointment.',
                        'appointment': appointment.to_dict()
                    }), 200
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'Completed appointments cannot be modified.'
            }), 400

        # Patient cancellation workflow
        if is_patient and target_status == 'Cancelled':
            appointment.status = 'Cancelled'
            db.session.commit()
            return jsonify({
                'success': True,
                'message': 'Appointment cancelled successfully.',
                'appointment': appointment.to_dict()
            }), 200

        # Admin workflows: compute targets using fresh object values
        target_date = new_date if new_date else appointment.appointment_date
        target_time = normalized_new_time if normalized_new_time else appointment.appointment_time
        target_effective_status = target_status or appointment.status

        # Conflict check if reactivating or rescheduling
        is_reactivating = (appointment.status == 'Cancelled' and target_effective_status in ACTIVE_STATUSES)
        is_rescheduling = (target_effective_status in ACTIVE_STATUSES and
                           (target_date != appointment.appointment_date or target_time != appointment.appointment_time))

        if is_reactivating or is_rescheduling:
            active_others = Appointment.query.filter(
                Appointment.doctor_id == appointment.doctor_id,
                Appointment.appointment_date == target_date,
                Appointment.id != appointment.id,
                Appointment.status.in_(['Pending', 'Confirmed'])
            ).all()

            conflict_exists = False
            for oth in active_others:
                try:
                    oth_canonical = normalize_appointment_time(oth.appointment_time)
                except ValueError:
                    oth_canonical = oth.appointment_time
                if oth_canonical == target_time:
                    conflict_exists = True
                    break

            if conflict_exists:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'message': f'Cannot update appointment: slot ({target_time} on {target_date}) is already occupied by another active appointment.'
                }), 409

        if target_status:
            appointment.status = target_status
        if 'notes' in data:
            appointment.notes = data['notes']
        appointment.appointment_date = target_date
        appointment.appointment_time = target_time

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Appointment updated successfully. Status: {appointment.status}.',
            'appointment': appointment.to_dict()
        }), 200

    except OperationalError:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'The booking system is currently experiencing high demand. Please retry your request in a moment.'}), 503
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Slot ({target_time} on {target_date}) has already been reserved.'
        }), 409
    except Exception:
        db.session.rollback()
        raise


@appointments_bp.route('/<int:appointment_id>', methods=['DELETE'])
@jwt_required
def delete_appointment(appointment_id):
    # Hard deletion is strictly restricted to PLATFORM_OWNER role.
    if g.current_user.role != 'PLATFORM_OWNER':
        return jsonify({
            'success': False,
            'message': 'Access denied. Patients cannot delete appointment records. Hard deletion is restricted strictly to Platform Owners.'
        }), 403

    initial_appt = db.session.get(Appointment, appointment_id)
    if not initial_appt:
        return jsonify({'success': False, 'message': 'Appointment not found.'}), 404

    target_doctor_id = initial_appt.doctor_id

    try:
        acquire_doctor_lock(target_doctor_id)

        appointment = db.session.get(Appointment, appointment_id)
        if not appointment:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Appointment not found or already deleted.'}), 404

        if appointment.status == 'Completed':
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'Completed medical visits cannot be deleted.'
            }), 400

        db.session.delete(appointment)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Appointment record removed by administrator.'
        }), 200

    except OperationalError:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'System busy. Please retry.'}), 503
    except Exception:
        db.session.rollback()
        raise
