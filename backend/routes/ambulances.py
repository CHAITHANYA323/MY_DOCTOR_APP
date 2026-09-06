from flask import Blueprint, request, jsonify, g
from models import db, Ambulance, AmbulanceRequest
from utils.auth_middleware import admin_required, optional_jwt, jwt_required

ambulances_bp = Blueprint('ambulances', __name__, url_prefix='/api')

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

    ambulance = Ambulance(
        vehicle_number=vehicle_number,
        driver_name=driver_name,
        driver_phone=driver_phone,
        ambulance_type=ambulance_type,
        current_location=current_location,
        status=status
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
    patient_name = (data.get('patient_name') or '').strip()
    phone = (data.get('phone') or '').strip()
    emergency_type = (data.get('emergency_type') or 'Other').strip()
    pickup_location = (data.get('pickup_location') or '').strip()
    destination_hospital = (data.get('destination_hospital') or 'Nearest Available Hospital').strip()
    patients_count = int(data.get('patients_count', 1))
    additional_info = (data.get('additional_info') or '').strip()

    if not patient_name or not phone or not pickup_location:
        return jsonify({'success': False, 'message': 'Patient name, phone number, and pickup location are required for emergency dispatch.'}), 400

    user_id = g.current_user.id if getattr(g, 'current_user', None) else None

    # Try auto-assigning an available ambulance if possible
    assigned_amb = Ambulance.query.filter_by(status='Available').first()
    assigned_id = None
    initial_status = 'Pending'
    if assigned_amb:
        assigned_id = assigned_amb.id
        assigned_amb.status = 'On Duty'
        initial_status = 'Dispatched'

    req = AmbulanceRequest(
        user_id=user_id,
        patient_name=patient_name,
        phone=phone,
        emergency_type=emergency_type,
        pickup_location=pickup_location,
        destination_hospital=destination_hospital,
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

@ambulances_bp.route('/ambulance-requests', methods=['GET'])
@jwt_required
def get_ambulance_requests():
    user = g.current_user
    status = request.args.get('status', '').strip()

    query = AmbulanceRequest.query
    if user.role != 'ADMIN':
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
    req = AmbulanceRequest.query.get(req_id)
    if not req:
        return jsonify({'success': False, 'message': 'Ambulance request not found.'}), 404

    data = request.get_json() or {}
    new_status = data.get('status')
    ambulance_id = data.get('assigned_ambulance_id')

    if new_status:
        req.status = new_status
        # If completed or cancelled, free up assigned ambulance
        if new_status in ['Completed', 'Cancelled'] and req.assigned_ambulance:
            req.assigned_ambulance.status = 'Available'

    if ambulance_id is not None:
        if ambulance_id == 0 or ambulance_id == '':
            if req.assigned_ambulance:
                req.assigned_ambulance.status = 'Available'
            req.assigned_ambulance_id = None
        else:
            amb = Ambulance.query.get(ambulance_id)
            if amb:
                req.assigned_ambulance_id = amb.id
                amb.status = 'On Duty'
                if req.status == 'Pending':
                    req.status = 'Dispatched'

    db.session.commit()
    return jsonify({
        'success': True,
        'message': f'Ambulance request status updated to {req.status}.',
        'request': req.to_dict()
    }), 200
