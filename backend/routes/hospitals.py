import re
from flask import Blueprint, request, jsonify, g
from models import db, Hospital, Doctor
from utils.auth_middleware import admin_required, jwt_required, roles_required

hospitals_bp = Blueprint('hospitals', __name__, url_prefix='/api/hospitals')

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text)

@hospitals_bp.route('', methods=['GET'])
def get_hospitals():
    search = request.args.get('search', '').strip()
    city = request.args.get('city', '').strip()
    sort_by = request.args.get('sort_by', 'rating_desc')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))

    query = Hospital.query

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Hospital.name.ilike(search_term)) |
            (Hospital.city.ilike(search_term)) |
            (Hospital.address.ilike(search_term)) |
            (Hospital.facilities.ilike(search_term))
        )

    if city:
        query = query.filter(Hospital.city.ilike(f"%{city}%"))

    # Sorting
    if sort_by == 'name_asc':
        query = query.order_by(Hospital.name.asc())
    elif sort_by == 'name_desc':
        query = query.order_by(Hospital.name.desc())
    elif sort_by == 'rating_asc':
        query = query.order_by(Hospital.rating.asc())
    else:  # rating_desc default
        query = query.order_by(Hospital.rating.desc(), Hospital.name.asc())

    total = query.count()
    hospitals = query.offset((page - 1) * limit).limit(limit).all()

    # Get distinct cities for filter dropdowns
    cities = [c[0] for c in db.session.query(Hospital.city).distinct().order_by(Hospital.city.asc()).all() if c[0]]

    return jsonify({
        'success': True,
        'total': total,
        'page': page,
        'limit': limit,
        'cities': cities,
        'hospitals': [h.to_dict() for h in hospitals]
    }), 200

@hospitals_bp.route('/<int:hospital_id>', methods=['GET'])
def get_hospital(hospital_id):
    hospital = Hospital.query.get(hospital_id)
    if not hospital:
        return jsonify({'success': False, 'message': 'Hospital not found.'}), 404
    return jsonify({
        'success': True,
        'hospital': hospital.to_dict(include_doctors=True)
    }), 200

@hospitals_bp.route('', methods=['POST'])
@roles_required('PLATFORM_OWNER')
def create_hospital():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    image = (data.get('image') or '').strip()
    address = (data.get('address') or '').strip()
    city = (data.get('city') or '').strip()
    state = (data.get('state') or '').strip()
    phone = (data.get('phone') or '').strip()
    email = (data.get('email') or '').strip()
    emergency_number = (data.get('emergency_number') or '').strip()
    facilities = data.get('facilities', '')
    if isinstance(facilities, list):
        facilities = ', '.join(facilities)
    working_hours = (data.get('working_hours') or '24 Hours / 7 Days').strip()
    rating = float(data.get('rating', 4.8))

    if not name or not address or not city or not emergency_number:
        return jsonify({'success': False, 'message': 'Name, address, city, and emergency number are required.'}), 400

    slug = slugify(name)
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while Hospital.query.filter_by(slug=slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    hospital = Hospital(
        name=name,
        slug=slug,
        image=image or 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80',
        address=address,
        city=city,
        state=state or 'Andhra Pradesh',
        phone=phone,
        email=email,
        emergency_number=emergency_number,
        facilities=facilities,
        working_hours=working_hours,
        rating=rating,
        total_reviews=int(data.get('total_reviews', 120))
    )
    db.session.add(hospital)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Hospital added successfully.',
        'hospital': hospital.to_dict()
    }), 201

@hospitals_bp.route('/<int:hospital_id>', methods=['PUT'])
@jwt_required
def update_hospital(hospital_id):
    user = g.current_user
    if user.role == 'PLATFORM_OWNER':
        pass
    elif user.role == 'HOSPITAL_SUPER_ADMIN':
        if not user.hospital_id or hospital_id != user.hospital_id:
            return jsonify({'success': False, 'message': 'Access denied. You can only update your assigned hospital.'}), 403
    else:
        return jsonify({'success': False, 'message': 'Access denied. Insufficient permissions.'}), 403

    hospital = db.session.get(Hospital, hospital_id)
    if not hospital:
        return jsonify({'success': False, 'message': 'Hospital not found.'}), 404

    data = request.get_json() or {}
    if 'name' in data and data['name'].strip():
        hospital.name = data['name'].strip()
    if 'image' in data:
        hospital.image = data['image'].strip()
    if 'address' in data:
        hospital.address = data['address'].strip()
    if 'city' in data:
        hospital.city = data['city'].strip()
    if 'state' in data:
        hospital.state = data['state'].strip()
    if 'phone' in data:
        hospital.phone = data['phone'].strip()
    if 'email' in data:
        hospital.email = data['email'].strip()
    if 'emergency_number' in data:
        hospital.emergency_number = data['emergency_number'].strip()
    if 'facilities' in data:
        fac = data['facilities']
        hospital.facilities = ', '.join(fac) if isinstance(fac, list) else str(fac)
    if 'working_hours' in data:
        hospital.working_hours = data['working_hours'].strip()
    if 'rating' in data:
        hospital.rating = float(data['rating'])

    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Hospital updated successfully.',
        'hospital': hospital.to_dict()
    }), 200

@hospitals_bp.route('/<int:hospital_id>', methods=['DELETE'])
@roles_required('PLATFORM_OWNER')
def delete_hospital(hospital_id):
    hospital = db.session.get(Hospital, hospital_id)
    if not hospital:
        return jsonify({'success': False, 'message': 'Hospital not found.'}), 404

    if hospital.doctors:
        return jsonify({
            'success': False,
            'message': f'Cannot delete hospital. {len(hospital.doctors)} doctors are affiliated with this hospital.'
        }), 400

    db.session.delete(hospital)
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Hospital deleted successfully.'
    }), 200
