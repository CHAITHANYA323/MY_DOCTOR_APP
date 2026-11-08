import re
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError
from models import db, Ambulance, AmbulanceRequest, Hospital
from utils.auth_middleware import admin_required, optional_jwt, jwt_required

ambulances_bp = Blueprint('ambulances', __name__, url_prefix='/api')

VALID_DISPATCH_TRANSITIONS = {
    'Pending': {'Dispatched', 'Cancelled'},
    'Dispatched': {'Arrived', 'Cancelled', 'Pending'},
    'Arrived': {'Completed', 'Cancelled'},
    'Completed': set(),
    'Cancelled': set()
}


def safe_release_ambulance(ambulance_id: int, exclude_request_id: int = None):
    """
    Safely releases an ambulance back to 'Available' ONLY when:
    1. Zero other active requests (status 'Dispatched' or 'Arrived') reference this ambulance.
    2. The ambulance current status is 'On Duty' (does NOT overwrite 'Maintenance').
    """
    if not ambulance_id:
        return
    amb = Ambulance.query.get(ambulance_id)
    if not amb:
        return
    query = AmbulanceRequest.query.filter(
        AmbulanceRequest.assigned_ambulance_id == ambulance_id,
        AmbulanceRequest.status.in_(['Dispatched', 'Arrived'])
    )
    if exclude_request_id:
        query = query.filter(AmbulanceRequest.id != exclude_request_id)

    active_count = query.count()
    if active_count == 0 and amb.status == 'On Duty':
        amb.status = 'Available'



def normalize_and_validate_phone(phone_raw: str) -> tuple[bool, str, str]:
    """
    Validates and normalizes emergency phone number:
    - Strips whitespace.
    - Checks character set (digits, optional leading +, spaces, hyphens, parentheses).
    - Checks extracted digit length (between 7 and 15 digits).
    Returns (is_valid, normalized_phone, error_message).
    """
    if not phone_raw or not isinstance(phone_raw, str):
        return False, "", "Phone number is required for emergency dispatch."

    cleaned = phone_raw.strip()
    if not cleaned:
        return False, "", "Phone number cannot be blank."

    if not re.match(r'^\+?[0-9\s\-()]+$', cleaned):
        return False, "", "Please enter a valid emergency contact phone number."

    digits = re.sub(r'\D', '', cleaned)
    if len(digits) < 7 or len(digits) > 15:
        return False, "", "Phone number must contain between 7 and 15 digits."

    if len(cleaned) > 30:
        return False, "", "Phone number cannot exceed 30 characters."

    return True, cleaned, ""


def parse_and_validate_patients_count(raw_count) -> tuple[bool, int, str]:
    """
    Safely parses patients_count and validates range 1 to 10.
    Returns (is_valid, count, error_message).
    """
    if raw_count is None or raw_count == '':
        return True, 1, ""

    if isinstance(raw_count, bool):
        return False, 0, "Patients count must be a valid number between 1 and 10."

    try:
        if isinstance(raw_count, float) and not raw_count.is_integer():
            return False, 0, "Patients count must be a whole number between 1 and 10."
        val = int(raw_count)
    except (ValueError, TypeError):
        return False, 0, "Patients count must be a valid number between 1 and 10."

    if val < 1 or val > 10:
        return False, 0, "Patients count must be between 1 and 10."

    return True, val, ""


def payloads_match(req: AmbulanceRequest, patient_name: str, phone: str, emergency_type: str, pickup_location: str, destination_hospital: str, patients_count: int) -> bool:
    """Checks whether existing request matches the incoming payload for idempotency replay."""
    if req.patient_name != patient_name:
        return False
    req_digits = re.sub(r'\D', '', req.phone or '')
    inc_digits = re.sub(r'\D', '', phone or '')
    if req_digits != inc_digits:
        return False
    if req.emergency_type != emergency_type:
        return False
    if req.pickup_location != pickup_location:
        return False
    if req.destination_hospital != destination_hospital:
        return False
    if req.patients_count != patients_count:
        return False
    return True


def acquire_fleet_lock():
    """
    Acquires database-level lock to prevent concurrent double dispatches:
    - SQLite: rolls back read-only session state from auth/lookup, then executes BEGIN IMMEDIATE.
    - MySQL / PostgreSQL: executes query with with_for_update() inside continuous transaction.
    """
    if db.engine.name == 'sqlite':
        db.session.rollback()
        db.session.execute(text("BEGIN IMMEDIATE"))

# --- Ambulance Fleet Endpoints ---

@ambulances_bp.route('/ambulances', methods=['GET'])
def get_ambulances():
    status = request.args.get('status', '').strip()
    ambulance_type = request.args.get('type', '').strip()

    query = Ambulance.query
    if status and status.lower() != 'all':
        query = query.filter(Ambulance.status.ilike(status))
    if ambulance_type and ambulance_type.lower() != 'all':
        query = query.filter(Ambulance.ambulance_type.ilike(ambulance_type))

    ambulances = query.order_by(Ambulance.status.asc(), Ambulance.vehicle_number.asc()).all()

    # Summary count
    total = len(ambulances)
    available_count = Ambulance.query.filter_by(status='Available').count()
    on_duty_count = Ambulance.query.filter_by(status='On Duty').count()

    return jsonify({
        'success': True,
        'total': total,
        'available_count': available_count,
        'on_duty_count': on_duty_count,
        'ambulances': [a.to_dict() for a in ambulances]
    }), 200

@ambulances_bp.route('/ambulances/<int:amb_id>', methods=['GET'])
def get_ambulance(amb_id):
    ambulance = Ambulance.query.get(amb_id)
    if not ambulance:
        return jsonify({'success': False, 'message': 'Ambulance vehicle not found.'}), 404
    return jsonify({
        'success': True,
        'ambulance': ambulance.to_dict()
    }), 200

@ambulances_bp.route('/ambulances', methods=['POST'])
@admin_required
def create_ambulance():
    data = request.get_json() or {}
    vehicle_number = (data.get('vehicle_number') or '').strip().upper()
    driver_name = (data.get('driver_name') or '').strip()
    driver_phone = (data.get('driver_phone') or '').strip()
    ambulance_type = (data.get('ambulance_type') or 'Basic Life Support').strip()
    current_location = (data.get('current_location') or '').strip()
    status = (data.get('status') or 'Available').strip()

    if not vehicle_number or not driver_name or not driver_phone or not current_location:
        return jsonify({'success': False, 'message': 'Vehicle number, driver name, contact, and current location are required.'}), 400

    if Ambulance.query.filter_by(vehicle_number=vehicle_number).first():
        return jsonify({'success': False, 'message': f'Ambulance with vehicle number {vehicle_number} already exists.'}), 409

    user = getattr(g, 'current_user', None)
    target_hospital_id = data.get('hospital_id')
    if user and user.role == 'HOSPITAL_SUPER_ADMIN':
        target_hospital_id = user.hospital_id

    ambulance = Ambulance(
        vehicle_number=vehicle_number,
        driver_name=driver_name,
        driver_phone=driver_phone,
        ambulance_type=ambulance_type,
        current_location=current_location,
        status=status,
        hospital_id=target_hospital_id
    )
    db.session.add(ambulance)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Ambulance {vehicle_number} added to fleet.',
        'ambulance': ambulance.to_dict()
    }), 201

@ambulances_bp.route('/ambulances/<int:amb_id>', methods=['PUT'])
@admin_required
def update_ambulance(amb_id):
    ambulance = Ambulance.query.get(amb_id)
    if not ambulance:
        return jsonify({'success': False, 'message': 'Ambulance vehicle not found.'}), 404

    user = getattr(g, 'current_user', None)
    if user and user.role == 'HOSPITAL_SUPER_ADMIN':
        if ambulance.hospital_id and ambulance.hospital_id != user.hospital_id:
            return jsonify({'success': False, 'message': 'Access denied: You cannot modify ambulances belonging to other hospitals.'}), 403

    data = request.get_json() or {}
    if 'vehicle_number' in data and data['vehicle_number'].strip():
        new_veh = data['vehicle_number'].strip().upper()
        existing = Ambulance.query.filter(Ambulance.vehicle_number == new_veh, Ambulance.id != amb_id).first()
        if existing:
            return jsonify({'success': False, 'message': 'Vehicle number already taken.'}), 409
        ambulance.vehicle_number = new_veh

    if 'driver_name' in data and data['driver_name'].strip():
        ambulance.driver_name = data['driver_name'].strip()
    if 'driver_phone' in data and data['driver_phone'].strip():
        ambulance.driver_phone = data['driver_phone'].strip()
    if 'ambulance_type' in data and data['ambulance_type'].strip():
        ambulance.ambulance_type = data['ambulance_type'].strip()
    if 'current_location' in data and data['current_location'].strip():
        ambulance.current_location = data['current_location'].strip()
    if 'status' in data and data['status'].strip():
        ambulance.status = data['status'].strip()

    db.session.commit()
    return jsonify({
        'success': True,
        'message': f'Ambulance {ambulance.vehicle_number} updated.',
        'ambulance': ambulance.to_dict()
    }), 200

@ambulances_bp.route('/ambulances/<int:amb_id>', methods=['DELETE'])
@admin_required
def delete_ambulance(amb_id):
    ambulance = Ambulance.query.get(amb_id)
    if not ambulance:
        return jsonify({'success': False, 'message': 'Ambulance vehicle not found.'}), 404

    user = getattr(g, 'current_user', None)
    if user and user.role == 'HOSPITAL_SUPER_ADMIN':
        if ambulance.hospital_id and ambulance.hospital_id != user.hospital_id:
            return jsonify({'success': False, 'message': 'Access denied: You cannot delete ambulances belonging to other hospitals.'}), 403

    veh = ambulance.vehicle_number
    db.session.delete(ambulance)
    db.session.commit()
    return jsonify({
        'success': True,
        'message': f'Ambulance {veh} deleted successfully.'
    }), 200


# --- Ambulance Emergency Request Endpoints ---

@ambulances_bp.route('/ambulance-requests', methods=['POST'])
@optional_jwt
def create_ambulance_request():
    data = request.get_json() or {}

    # 1. Idempotency Key extraction and length check
    raw_key = request.headers.get('Idempotency-Key') or data.get('idempotency_key')
    idempotency_key = None
    if raw_key:
        idempotency_key = str(raw_key).strip()
        if len(idempotency_key) > 64:
            return jsonify({'success': False, 'message': 'Idempotency-Key cannot exceed 64 characters.'}), 400
        if not idempotency_key:
            idempotency_key = None

    # 2. Patient Name validation
    patient_name = (data.get('patient_name') or '').strip()
    if not patient_name:
        return jsonify({'success': False, 'message': 'Patient name is required for emergency dispatch.'}), 400
    if len(patient_name) < 2:
        return jsonify({'success': False, 'message': 'Patient name must be at least 2 characters.'}), 400
    if len(patient_name) > 100:
        return jsonify({'success': False, 'message': 'Patient name cannot exceed 100 characters.'}), 400

    # 3. Emergency Phone validation
    phone_raw = (data.get('phone') or '').strip()
    is_valid_phone, phone, phone_err = normalize_and_validate_phone(phone_raw)
    if not is_valid_phone:
        return jsonify({'success': False, 'message': phone_err}), 400

    # 4. Pickup Location validation
    pickup_location = (data.get('pickup_location') or '').strip()
    if not pickup_location:
        return jsonify({'success': False, 'message': 'Pickup location is required for emergency dispatch.'}), 400
    if len(pickup_location) < 5:
        return jsonify({'success': False, 'message': 'Pickup location must be at least 5 characters.'}), 400
    if len(pickup_location) > 255:
        return jsonify({'success': False, 'message': 'Pickup location cannot exceed 255 characters.'}), 400

    # 5. Destination Hospital validation
    destination_hospital = (data.get('destination_hospital') or 'Nearest Available Hospital').strip()
    if not destination_hospital:
        destination_hospital = 'Nearest Available Hospital'
    if len(destination_hospital) > 150:
        return jsonify({'success': False, 'message': 'Destination hospital cannot exceed 150 characters.'}), 400

    # 6. Emergency Type validation
    emergency_type = (data.get('emergency_type') or 'Other').strip()
    if not emergency_type:
        emergency_type = 'Other'
    if len(emergency_type) > 100:
        return jsonify({'success': False, 'message': 'Emergency type cannot exceed 100 characters.'}), 400

    # 7. Patients Count validation
    raw_count = data.get('patients_count', 1)
    is_valid_count, patients_count, count_err = parse_and_validate_patients_count(raw_count)
    if not is_valid_count:
        return jsonify({'success': False, 'message': count_err}), 400

    # 8. Additional Info validation
    additional_info = (data.get('additional_info') or '').strip()
    if len(additional_info) > 1000:
        return jsonify({'success': False, 'message': 'Additional information cannot exceed 1000 characters.'}), 400

    user_id = g.current_user.id if getattr(g, 'current_user', None) else None

    # Safe atomic auto-assignment inside locked transaction boundary
    try:
        acquire_fleet_lock()

        # Idempotency Check: if key provided, check if already exists
        if idempotency_key:
            existing = AmbulanceRequest.query.filter_by(idempotency_key=idempotency_key).first()
            if existing:
                if not payloads_match(existing, patient_name, phone, emergency_type, pickup_location, destination_hospital, patients_count):
                    return jsonify({
                        'success': False,
                        'message': f"Idempotency key '{idempotency_key}' was already used for a different emergency request payload."
                    }), 409

                resp = jsonify({
                    'success': True,
                    'message': 'Ambulance request already registered (idempotent replay).',
                    'request': existing.to_dict()
                })
                resp.headers['Idempotent-Replay'] = 'true'
                return resp, 200

        # Query next available ambulance inside active lock boundary
        if db.engine.name == 'sqlite':
            assigned_amb = Ambulance.query.filter_by(status='Available').order_by(Ambulance.id.asc()).first()
        else:
            assigned_amb = Ambulance.query.filter_by(status='Available').order_by(Ambulance.id.asc()).with_for_update().first()

        assigned_id = None
        initial_status = 'Pending'
        if assigned_amb:
            assigned_id = assigned_amb.id
            assigned_amb.status = 'On Duty'
            initial_status = 'Dispatched'

        # Resolve destination hospital to hospital_id if available
        target_hospital = None
        if destination_hospital:
            target_hospital = Hospital.query.filter(
                (Hospital.name.ilike(destination_hospital)) |
                (Hospital.slug.ilike(destination_hospital))
            ).first()
        dest_hospital_id = target_hospital.id if target_hospital else None

        req = AmbulanceRequest(
            idempotency_key=idempotency_key,
            user_id=user_id,
            patient_name=patient_name,
            phone=phone,
            emergency_type=emergency_type,
            pickup_location=pickup_location,
            destination_hospital=destination_hospital,
            hospital_id=dest_hospital_id,
            patients_count=patients_count,
            additional_info=additional_info,
            status=initial_status,
            assigned_ambulance_id=assigned_id
        )

        db.session.add(req)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Ambulance request received. Our emergency medical team will contact you immediately.',
            'request': req.to_dict()
        }), 201

    except IntegrityError:
        db.session.rollback()
        # Race condition handling:
        # 1. Did another concurrent thread insert the exact same idempotency_key?
        if idempotency_key:
            existing = AmbulanceRequest.query.filter_by(idempotency_key=idempotency_key).first()
            if existing:
                if not payloads_match(existing, patient_name, phone, emergency_type, pickup_location, destination_hospital, patients_count):
                    return jsonify({
                        'success': False,
                        'message': f"Idempotency key '{idempotency_key}' was already used for a different emergency request payload."
                    }), 409

                resp = jsonify({
                    'success': True,
                    'message': 'Ambulance request already registered (idempotent replay).',
                    'request': existing.to_dict()
                })
                resp.headers['Idempotent-Replay'] = 'true'
                return resp, 200

        # 2. Or did concurrent dispatch conflict trigger partial unique index constraint on assigned_ambulance_id?
        # Safe fallback: preserve emergency request with status='Pending' without crashing
        try:
            req = AmbulanceRequest(
                idempotency_key=idempotency_key,
                user_id=user_id,
                patient_name=patient_name,
                phone=phone,
                emergency_type=emergency_type,
                pickup_location=pickup_location,
                destination_hospital=destination_hospital,
                hospital_id=dest_hospital_id,
                patients_count=patients_count,
                additional_info=additional_info,
                status='Pending',
                assigned_ambulance_id=None
            )
            db.session.add(req)
            db.session.commit()
            return jsonify({
                'success': True,
                'message': 'Ambulance request received and queued for dispatch. Emergency coordinator will contact you immediately.',
                'request': req.to_dict()
            }), 201
        except Exception:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Failed to process emergency request. Please dial 108 immediately.'}), 500

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to process emergency request: {str(e)}'}), 500

@ambulances_bp.route('/ambulance-requests', methods=['GET'])
@jwt_required
def get_ambulance_requests():
    user = g.current_user
    status = request.args.get('status', '').strip()

    query = AmbulanceRequest.query
    if user.role in ('ADMIN', 'PLATFORM_OWNER'):
        pass
    elif user.role == 'HOSPITAL_SUPER_ADMIN':
        query = query.filter(AmbulanceRequest.hospital_id == user.hospital_id)
    else:
        query = query.filter_by(user_id=user.id)

    if status and status.lower() != 'all':
        query = query.filter(AmbulanceRequest.status.ilike(status))

    requests_list = query.order_by(AmbulanceRequest.created_at.desc()).all()
    return jsonify({
        'success': True,
        'count': len(requests_list),
        'requests': [r.to_dict() for r in requests_list]
    }), 200

@ambulances_bp.route('/ambulance-requests/<int:req_id>', methods=['PUT'])
@admin_required
def update_ambulance_request(req_id):
    try:
        acquire_fleet_lock()
        if db.engine.name == 'sqlite':
            req = AmbulanceRequest.query.get(req_id)
        else:
            req = AmbulanceRequest.query.filter_by(id=req_id).with_for_update().first()

        if not req:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Ambulance request not found.'}), 404

        # Multi-tenant scoping: Only PLATFORM_OWNER/ADMIN or assigned HOSPITAL_SUPER_ADMIN can modify
        user = g.current_user
        if user.role not in ('PLATFORM_OWNER', 'ADMIN'):
            if req.hospital_id is None:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'message': 'Access denied: Emergency requests without an assigned hospital can only be managed by Platform Owners.'
                }), 403
            if req.hospital_id != getattr(user, 'hospital_id', None):
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'message': 'Access denied: You cannot modify emergency requests belonging to other hospitals.'
                }), 403

        # Terminal state immutability check
        if req.status in ['Completed', 'Cancelled']:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f"Cannot modify emergency request. Status '{req.status}' is an immutable terminal state."
            }), 400

        data = request.get_json() or {}
        new_status = data.get('status')
        has_amb_param = 'assigned_ambulance_id' in data
        target_amb_id = data.get('assigned_ambulance_id') if has_amb_param else None

        if new_status is None and not has_amb_param:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'No valid update fields provided.'}), 400

        # Validate status value if provided
        if new_status is not None and new_status not in VALID_DISPATCH_TRANSITIONS:
            db.session.rollback()
            return jsonify({'success': False, 'message': f"Invalid status '{new_status}'."}), 400

        # Detect unassignment request
        is_unassign_request = has_amb_param and target_amb_id in (0, '', None)
        if new_status == 'Pending' and req.status == 'Dispatched':
            is_unassign_request = True

        # Unassignment validation rules
        if is_unassign_request:
            if req.status in ['Arrived', 'Completed', 'Cancelled']:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'message': f"Cannot unassign ambulance from request in '{req.status}' status."
                }), 400

            if new_status and new_status not in ['Pending', 'Cancelled']:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'message': f"Conflicting update: cannot unassign ambulance while transitioning to '{new_status}'."
                }), 400

            if target_amb_id not in (0, '', None) and new_status == 'Pending':
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'message': "Conflicting update: cannot assign an ambulance while resetting request to Pending."
                }), 400

            old_amb_id = req.assigned_ambulance_id
            req.assigned_ambulance_id = None
            if new_status == 'Cancelled':
                req.status = 'Cancelled'
            else:
                req.status = 'Pending'

            if old_amb_id:
                safe_release_ambulance(old_amb_id, exclude_request_id=req.id)

            db.session.commit()
            return jsonify({
                'success': True,
                'message': f'Ambulance unassigned. Request updated to {req.status}.',
                'request': req.to_dict()
            }), 200

        # If setting to Pending with an ambulance assigned, reject
        if new_status == 'Pending' and target_amb_id not in (0, '', None):
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': "Conflicting update: cannot assign an ambulance while setting request status to 'Pending'."
            }), 400

        # If not unassigning, check status transition validity
        if new_status is not None and new_status != req.status:
            allowed = VALID_DISPATCH_TRANSITIONS.get(req.status, set())
            if new_status not in allowed:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'message': f"Cannot transition request from '{req.status}' to '{new_status}'."
                }), 400

        # Handle ambulance assignment or reassignment
        if has_amb_param and target_amb_id not in (0, '', None):
            # Cannot reassign if Arrived
            if req.status == 'Arrived' and target_amb_id != req.assigned_ambulance_id:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'message': "Cannot reassign ambulance for a request that has already arrived on scene."
                }), 400

            target_amb = Ambulance.query.get(target_amb_id)
            if not target_amb:
                db.session.rollback()
                return jsonify({'success': False, 'message': f'Ambulance vehicle with ID {target_amb_id} not found.'}), 404

            if target_amb.status == 'Maintenance':
                db.session.rollback()
                return jsonify({'success': False, 'message': 'Cannot assign ambulance currently under Maintenance.'}), 400

            # If target ambulance is different from current assignment
            if target_amb.id != req.assigned_ambulance_id:
                # Check if busy serving another active request
                busy_request = AmbulanceRequest.query.filter(
                    AmbulanceRequest.assigned_ambulance_id == target_amb.id,
                    AmbulanceRequest.status.in_(['Dispatched', 'Arrived']),
                    AmbulanceRequest.id != req.id
                ).first()
                if busy_request or target_amb.status == 'On Duty':
                    db.session.rollback()
                    return jsonify({
                        'success': False,
                        'message': f"Ambulance {target_amb.vehicle_number} is already serving another active request."
                    }), 409

                old_amb_id = req.assigned_ambulance_id
                req.assigned_ambulance_id = target_amb.id
                target_amb.status = 'On Duty'

                if old_amb_id:
                    safe_release_ambulance(old_amb_id, exclude_request_id=req.id)

            # If request was Pending and now has an assigned ambulance, transition to Dispatched if new_status was not specified
            if req.status == 'Pending' and new_status is None:
                req.status = 'Dispatched'

        # Now handle target status updates
        effective_status = new_status if new_status is not None else req.status

        # Rule checks based on target status:
        if effective_status == 'Dispatched':
            if not req.assigned_ambulance_id:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'message': "Cannot dispatch request without an assigned ambulance."
                }), 400

        elif effective_status == 'Arrived':
            if not req.assigned_ambulance_id:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'message': "Cannot transition to 'Arrived' without an assigned ambulance."
                }), 400

        elif effective_status == 'Completed':
            if not req.assigned_ambulance_id:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'message': "Cannot complete request without an assigned ambulance."
                }), 400
            # Release assigned ambulance
            safe_release_ambulance(req.assigned_ambulance_id, exclude_request_id=req.id)

        elif effective_status == 'Cancelled':
            # Release assigned ambulance if any
            if req.assigned_ambulance_id:
                safe_release_ambulance(req.assigned_ambulance_id, exclude_request_id=req.id)

        if new_status is not None:
            req.status = new_status

        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'Ambulance request status updated to {req.status}.',
            'request': req.to_dict()
        }), 200

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Database constraint conflict while updating ambulance request.'
        }), 409
    except OperationalError:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Database service temporarily unavailable. Please retry.'
        }), 503
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to update ambulance request: {str(e)}'
        }), 500


@ambulances_bp.route('/ambulance-requests/<int:req_id>/cancel', methods=['POST'])
@jwt_required
def cancel_ambulance_request(req_id):
    """
    Dedicated patient cancellation endpoint:
    - Only authenticated user who created the request (or admin) can cancel.
    - Can only cancel requests in 'Pending' or 'Dispatched' status.
    - Requests in 'Arrived', 'Completed', or 'Cancelled' cannot be cancelled (400).
    - Safely releases any assigned ambulance back to Available using safe_release_ambulance().
    """
    try:
        acquire_fleet_lock()
        if db.engine.name == 'sqlite':
            req = AmbulanceRequest.query.get(req_id)
        else:
            req = AmbulanceRequest.query.filter_by(id=req_id).with_for_update().first()

        if not req:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Ambulance request not found.'}), 404

        # Authorization & multi-tenant scoping for cancellation:
        user = g.current_user
        is_creator = (req.user_id is not None and req.user_id == user.id)

        if not is_creator:
            if user.role not in ('ADMIN', 'PLATFORM_OWNER', 'HOSPITAL_SUPER_ADMIN'):
                db.session.rollback()
                return jsonify({'success': False, 'message': 'You are not authorized to cancel this emergency request.'}), 403

            if user.role == 'HOSPITAL_SUPER_ADMIN':
                if req.hospital_id is None:
                    db.session.rollback()
                    return jsonify({
                        'success': False,
                        'message': 'Access denied: Emergency requests without an assigned hospital can only be managed by Platform Owners.'
                    }), 403
                if req.hospital_id != user.hospital_id:
                    db.session.rollback()
                    return jsonify({
                        'success': False,
                        'message': 'Access denied: You cannot modify emergency requests belonging to other hospitals.'
                    }), 403

        if req.status in ['Completed', 'Cancelled']:
            db.session.rollback()
            return jsonify({'success': False, 'message': f"Emergency request is already {req.status.lower()}."}), 400

        if req.status == 'Arrived':
            db.session.rollback()
            return jsonify({'success': False, 'message': "Cannot cancel request once ambulance has arrived on scene."}), 400

        if req.status not in ['Pending', 'Dispatched']:
            db.session.rollback()
            return jsonify({'success': False, 'message': f"Cannot cancel request in '{req.status}' status."}), 400

        req.status = 'Cancelled'
        if req.assigned_ambulance_id:
            safe_release_ambulance(req.assigned_ambulance_id, exclude_request_id=req.id)

        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Ambulance request cancelled successfully.',
            'request': req.to_dict()
        }), 200

    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Database constraint conflict while cancelling ambulance request.'}), 409
    except OperationalError:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Database service temporarily unavailable. Please retry.'}), 503
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to cancel emergency request: {str(e)}'}), 500
