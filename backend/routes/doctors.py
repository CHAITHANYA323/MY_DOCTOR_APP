from flask import Blueprint, request, jsonify, g
from sqlalchemy.orm import joinedload
from models import db, Doctor, Specialization, Hospital, Review
from utils.auth_middleware import admin_required, jwt_required, roles_required, decode_token

doctors_bp = Blueprint('doctors', __name__, url_prefix='/api/doctors')

@doctors_bp.route('', methods=['GET'])
def get_doctors():
    # Safe Pagination Parsing (never throw uncaught ValueError; clamp limit between 1 and 100)
    try:
        page = int(request.args.get('page', 1))
    except (ValueError, TypeError):
        page = 1
    if page < 1:
        page = 1

    try:
        limit = int(request.args.get('limit', 12))
    except (ValueError, TypeError):
        limit = 12
    if limit < 1:
        limit = 12
    elif limit > 100:
        limit = 100

    # Query parameters
    search = request.args.get('search', '').strip()
    specialization_id = request.args.get('specialization_id')
    specialization_name = request.args.get('specialization', '').strip()
    hospital_id = request.args.get('hospital_id')
    hospital_name = request.args.get('hospital', '').strip()
    location = request.args.get('location', '').strip()
    gender = request.args.get('gender', '').strip()
    availability = request.args.get('availability', '').strip()
    status = request.args.get('status', 'Active') # default Active for public
    sort_by = request.args.get('sort_by', 'rating_desc')

    # Safe Numeric & Range Parameter Validation
    parsed_min_fee = None
    min_fee_str = request.args.get('min_fee')
    if min_fee_str is not None and min_fee_str.strip() != '':
        try:
            parsed_min_fee = float(min_fee_str.strip())
            if parsed_min_fee < 0:
                return jsonify({'success': False, 'message': 'Consultation fee cannot be negative.'}), 400
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid numeric value for min_fee.'}), 400

    parsed_max_fee = None
    max_fee_str = request.args.get('max_fee')
    if max_fee_str is not None and max_fee_str.strip() != '':
        try:
            parsed_max_fee = float(max_fee_str.strip())
            if parsed_max_fee < 0:
                return jsonify({'success': False, 'message': 'Consultation fee cannot be negative.'}), 400
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid numeric value for max_fee.'}), 400

    if parsed_min_fee is not None and parsed_max_fee is not None:
        if parsed_min_fee > parsed_max_fee:
            return jsonify({
                'success': False,
                'message': 'Minimum consultation fee cannot be greater than maximum consultation fee.'
            }), 400

    parsed_min_exp = None
    min_exp_str = request.args.get('min_experience')
    if min_exp_str is not None and min_exp_str.strip() != '':
        try:
            parsed_min_exp = int(min_exp_str.strip())
            if parsed_min_exp < 0:
                return jsonify({'success': False, 'message': 'Experience cannot be negative.'}), 400
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid numeric value for min_experience.'}), 400

    parsed_min_rating = None
    min_rating_str = request.args.get('min_rating')
    if min_rating_str is not None and min_rating_str.strip() != '':
        try:
            parsed_min_rating = float(min_rating_str.strip())
            if parsed_min_rating < 0 or parsed_min_rating > 5:
                return jsonify({'success': False, 'message': 'Rating must be between 0 and 5.'}), 400
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid numeric value for min_rating.'}), 400

    query = Doctor.query

    # Status filter (allow Admin to pass status='all' to see inactive too)
    if status != 'all':
        query = query.filter(Doctor.status == status)

    # Clean Join Management: Join tables once without duplication
    needs_spec_join = bool(search or specialization_name)
    needs_hosp_join = bool(search or hospital_name)

    if needs_spec_join:
        query = query.join(Doctor.specialization)

    if needs_hosp_join:
        query = query.join(Doctor.hospital)

    # Global text search filter (OR logic across doctor name, location, specialization, hospital, qualification)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Doctor.name.ilike(search_pattern)) |
            (Doctor.location.ilike(search_pattern)) |
            (Specialization.name.ilike(search_pattern)) |
            (Hospital.name.ilike(search_pattern)) |
            (Doctor.qualification.ilike(search_pattern))
        )

    # Independent Relational & Attribute Filters (Conjunctive AND logic)
    if specialization_name:
        query = query.filter(Specialization.name.ilike(f"%{specialization_name}%"))

    if hospital_name:
        query = query.filter(Hospital.name.ilike(f"%{hospital_name}%"))

    if specialization_id and str(specialization_id).strip().isdigit():
        query = query.filter(Doctor.specialization_id == int(str(specialization_id).strip()))

    if hospital_id and str(hospital_id).strip().isdigit():
        query = query.filter(Doctor.hospital_id == int(str(hospital_id).strip()))

    if location:
        query = query.filter(Doctor.location.ilike(f"%{location}%"))

    if gender and gender.lower() != 'all':
        query = query.filter(Doctor.gender.ilike(gender))

    if parsed_min_exp is not None:
        query = query.filter(Doctor.experience >= parsed_min_exp)

    if parsed_min_fee is not None:
        query = query.filter(Doctor.consultation_fee >= parsed_min_fee)

    if parsed_max_fee is not None:
        query = query.filter(Doctor.consultation_fee <= parsed_max_fee)

    if parsed_min_rating is not None:
        query = query.filter(Doctor.rating >= parsed_min_rating)

    if availability:
        query = query.filter(Doctor.available_days.ilike(f"%{availability}%"))

    # Sorting with secondary deterministic tiebreaker (Doctor.id.asc()) to guarantee stable pagination
    if sort_by == 'experience_desc':
        query = query.order_by(Doctor.experience.desc(), Doctor.id.asc())
    elif sort_by == 'fee_asc':
        query = query.order_by(Doctor.consultation_fee.asc(), Doctor.id.asc())
    elif sort_by == 'fee_desc':
        query = query.order_by(Doctor.consultation_fee.desc(), Doctor.id.asc())
    elif sort_by == 'name_asc':
        query = query.order_by(Doctor.name.asc(), Doctor.id.asc())
    elif sort_by == 'rating_asc':
        query = query.order_by(Doctor.rating.asc(), Doctor.id.asc())
    else: # rating_desc default
        query = query.order_by(Doctor.rating.desc(), Doctor.experience.desc(), Doctor.id.asc())

    total = query.count()

    # Eager load specialization and hospital relationships to eliminate N+1 queries during to_dict() serialization
    doctors = (
        query.options(joinedload(Doctor.specialization), joinedload(Doctor.hospital))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    # Get distinct locations/cities for filter sidebar (Active doctors only)
    locations = [
        l[0] for l in db.session.query(Doctor.location)
        .filter(Doctor.status == 'Active')
        .distinct()
        .all()
        if l[0]
    ]

    return jsonify({
        'success': True,
        'total': total,
        'page': page,
        'limit': limit,
        'total_pages': (total + limit - 1) // limit if limit > 0 else 1,
        'available_locations': sorted(list(set(locations))),
        'doctors': [d.to_dict() for d in doctors]
    }), 200

@doctors_bp.route('/featured', methods=['GET'])
def get_featured_doctors():
    limit = int(request.args.get('limit', 6))
    featured = Doctor.query.filter_by(status='Active').order_by(Doctor.rating.desc(), Doctor.experience.desc()).limit(limit).all()
    return jsonify({
        'success': True,
        'doctors': [d.to_dict() for d in featured]
    }), 200

@doctors_bp.route('/<int:doctor_id>', methods=['GET'])
def get_doctor(doctor_id):
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({'success': False, 'message': 'Doctor not found.'}), 404

    # Extract optional caller identity from Authorization header
    auth_header = request.headers.get('Authorization')
    current_user_id = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        payload = decode_token(token)
        if payload:
            current_user_id = payload.get('user_id')

    # Fetch reviews
    reviews = Review.query.filter_by(doctor_id=doctor.id).order_by(Review.created_at.desc()).all()

    data = doctor.to_dict(brief=False)
    data['reviews'] = [r.to_dict(current_user_id=current_user_id) for r in reviews]
    return jsonify({
        'success': True,
        'doctor': data
    }), 200

@doctors_bp.route('', methods=['POST'])
@jwt_required
def create_doctor():
    user = g.current_user
    if user.role not in ('PLATFORM_OWNER', 'HOSPITAL_SUPER_ADMIN'):
        return jsonify({'success': False, 'message': 'Access denied. Insufficient permissions to add doctors.'}), 403

    data = request.get_json() or {}

    name = (data.get('name') or '').strip()
    image = (data.get('image') or '').strip()
    qualification = (data.get('qualification') or '').strip()
    experience = data.get('experience')
    specialization_id = data.get('specialization_id')
    location = (data.get('location') or '').strip()
    consultation_fee = data.get('consultation_fee')
    email = (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip()

    # Hospital ID spoofing defense:
    # If caller is HOSPITAL_SUPER_ADMIN, strictly force hospital_id to caller's assigned hospital!
    if user.role == 'HOSPITAL_SUPER_ADMIN':
        if not user.hospital_id:
            return jsonify({'success': False, 'message': 'Hospital Admin has no hospital assigned.'}), 403
        hospital_id = user.hospital_id
    else:
        hospital_id = data.get('hospital_id')

    # Validations
    if not name or not qualification or not location or experience is None or not specialization_id or not hospital_id or consultation_fee is None:
        return jsonify({'success': False, 'message': 'Name, qualification, experience, specialization, hospital, location, and fee are required.'}), 400

    try:
        experience = int(experience)
        consultation_fee = float(consultation_fee)
        specialization_id = int(specialization_id)
        hospital_id = int(hospital_id)
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Invalid numeric value for experience, fee, specialization, or hospital.'}), 400

    if not db.session.get(Specialization, specialization_id):
        return jsonify({'success': False, 'message': 'Selected specialization does not exist.'}), 400

    if not db.session.get(Hospital, hospital_id):
        return jsonify({'success': False, 'message': 'Selected hospital does not exist.'}), 400

    default_image = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80'

    doctor = Doctor(
        name=name,
        gender=data.get('gender', 'Not Specified'),
        image=image or default_image,
        qualification=qualification,
        experience=experience,
        specialization_id=specialization_id,
        hospital_id=hospital_id,
        location=location,
        phone=phone,
        email=email,
        consultation_fee=consultation_fee,
        available_days=data.get('available_days', 'Monday - Saturday'),
        available_time=data.get('available_time', '09:00 AM - 05:00 PM'),
        languages=data.get('languages', 'English, Hindi'),
        about=data.get('about', ''),
        consultation_type=data.get('consultation_type', 'In-Person & Video'),
        status=data.get('status', 'Active'),
        rating=float(data.get('rating', 4.9)),
        total_reviews=int(data.get('total_reviews', 0))
    )

    db.session.add(doctor)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Doctor {doctor.name} added successfully.',
        'doctor': doctor.to_dict()
    }), 201


@doctors_bp.route('/<int:doctor_id>', methods=['PUT'])
@jwt_required
def update_doctor(doctor_id):
    doctor = db.session.get(Doctor, doctor_id)
    if not doctor:
        return jsonify({'success': False, 'message': 'Doctor not found.'}), 404

    user = g.current_user
    # Multi-tenant scoping checks:
    if user.role == 'PLATFORM_OWNER':
        pass
    elif user.role == 'HOSPITAL_SUPER_ADMIN':
        if not user.hospital_id or doctor.hospital_id != user.hospital_id:
            return jsonify({'success': False, 'message': 'Access denied. You can only manage doctors in your own hospital.'}), 403
    elif user.role == 'DOCTOR':
        if not doctor.user_id or doctor.user_id != user.id:
            return jsonify({'success': False, 'message': 'Access denied. Doctors can only update their own profile.'}), 403
    else:
        return jsonify({'success': False, 'message': 'Access denied.'}), 403

    data = request.get_json() or {}

    # Disallow hospital_id tampering by non-platform-owners
    if 'hospital_id' in data and user.role != 'PLATFORM_OWNER':
        return jsonify({'success': False, 'message': 'Reassigning doctor hospital is restricted to Platform Owners.'}), 403

    if user.role == 'DOCTOR':
        # Limited fields for doctor self-service
        if 'about' in data:
            doctor.about = data['about']
        if 'languages' in data:
            doctor.languages = data['languages']
        if 'consultation_type' in data:
            doctor.consultation_type = data['consultation_type']
        if 'consultation_fee' in data:
            doctor.consultation_fee = float(data['consultation_fee'])
        if 'available_days' in data:
            doctor.available_days = data['available_days']
        if 'available_time' in data:
            doctor.available_time = data['available_time']
        if 'phone' in data:
            doctor.phone = data['phone'].strip()
        if 'email' in data:
            doctor.email = data['email'].strip()
        if 'status' in data and data['status'] in ('Active', 'Inactive'):
            doctor.status = data['status']
    else:
        # Full administrative fields
        if 'name' in data and data['name'].strip():
            doctor.name = data['name'].strip()
        if 'gender' in data:
            doctor.gender = data['gender']
        if 'image' in data and data['image'].strip():
            doctor.image = data['image'].strip()
        if 'qualification' in data and data['qualification'].strip():
            doctor.qualification = data['qualification'].strip()
        if 'experience' in data:
            doctor.experience = int(data['experience'])
        if 'specialization_id' in data:
            spec_id = int(data['specialization_id'])
            if not db.session.get(Specialization, spec_id):
                return jsonify({'success': False, 'message': 'Specialization does not exist.'}), 400
            doctor.specialization_id = spec_id
        if 'hospital_id' in data and user.role == 'PLATFORM_OWNER':
            hosp_id = int(data['hospital_id'])
            if not db.session.get(Hospital, hosp_id):
                return jsonify({'success': False, 'message': 'Hospital does not exist.'}), 400
            doctor.hospital_id = hosp_id
        if 'location' in data and data['location'].strip():
            doctor.location = data['location'].strip()
        if 'phone' in data:
            doctor.phone = data['phone'].strip()
        if 'email' in data:
            doctor.email = data['email'].strip()
        if 'consultation_fee' in data:
            doctor.consultation_fee = float(data['consultation_fee'])
        if 'available_days' in data:
            doctor.available_days = data['available_days']
        if 'available_time' in data:
            doctor.available_time = data['available_time']
        if 'languages' in data:
            doctor.languages = data['languages']
        if 'about' in data:
            doctor.about = data['about']
        if 'consultation_type' in data:
            doctor.consultation_type = data['consultation_type']
        if 'status' in data:
            doctor.status = data['status']

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Doctor {doctor.name} updated successfully.',
        'doctor': doctor.to_dict()
    }), 200


@doctors_bp.route('/<int:doctor_id>', methods=['DELETE'])
@jwt_required
def delete_doctor(doctor_id):
    doctor = db.session.get(Doctor, doctor_id)
    if not doctor:
        return jsonify({'success': False, 'message': 'Doctor not found.'}), 404

    user = g.current_user
    if user.role == 'PLATFORM_OWNER':
        pass
    elif user.role == 'HOSPITAL_SUPER_ADMIN':
        if not user.hospital_id or doctor.hospital_id != user.hospital_id:
            return jsonify({'success': False, 'message': 'Access denied. You can only delete doctors from your own hospital.'}), 403
    else:
        return jsonify({'success': False, 'message': 'Access denied. Insufficient permissions.'}), 403

    doctor_name = doctor.name
    db.session.delete(doctor)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Doctor {doctor_name} has been removed successfully.'
    }), 200

    return jsonify({
        'success': True,
        'message': f'Doctor {doctor_name} has been removed successfully.'
    }), 200
