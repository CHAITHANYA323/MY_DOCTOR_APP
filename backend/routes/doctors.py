from flask import Blueprint, request, jsonify
from models import db, Doctor, Specialization, Hospital, Review
from utils.auth_middleware import admin_required

doctors_bp = Blueprint('doctors', __name__, url_prefix='/api/doctors')

@doctors_bp.route('', methods=['GET'])
def get_doctors():
    # Query parameters
    search = request.args.get('search', '').strip()
    specialization_id = request.args.get('specialization_id')
    specialization_name = request.args.get('specialization', '').strip()
    hospital_id = request.args.get('hospital_id')
    hospital_name = request.args.get('hospital', '').strip()
    location = request.args.get('location', '').strip()
    gender = request.args.get('gender', '').strip()
    min_experience = request.args.get('min_experience')
    max_fee = request.args.get('max_fee')
    min_rating = request.args.get('min_rating')
    availability = request.args.get('availability', '').strip()
    status = request.args.get('status', 'Active') # default Active for public
    sort_by = request.args.get('sort_by', 'rating_desc')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 12))

    query = Doctor.query

    # Status filter (allow Admin to pass status='all' to see inactive too)
    if status != 'all':
        query = query.filter(Doctor.status == status)

    # Search filter (name, location, specialization name, hospital name)
    if search:
        search_pattern = f"%{search}%"
        query = query.join(Doctor.specialization).join(Doctor.hospital).filter(
            (Doctor.name.ilike(search_pattern)) |
            (Doctor.location.ilike(search_pattern)) |
            (Specialization.name.ilike(search_pattern)) |
            (Hospital.name.ilike(search_pattern)) |
            (Doctor.qualification.ilike(search_pattern))
        )
    else:
        # If no global search, still allow joined filters
        if specialization_name or hospital_name:
            if specialization_name:
                query = query.join(Doctor.specialization).filter(Specialization.name.ilike(f"%{specialization_name}%"))
            if hospital_name:
                query = query.join(Doctor.hospital).filter(Hospital.name.ilike(f"%{hospital_name}%"))

    if specialization_id and specialization_id.isdigit():
        query = query.filter(Doctor.specialization_id == int(specialization_id))

    if hospital_id and hospital_id.isdigit():
        query = query.filter(Doctor.hospital_id == int(hospital_id))

    if location:
        query = query.filter(Doctor.location.ilike(f"%{location}%"))

    if gender and gender.lower() != 'all':
        query = query.filter(Doctor.gender.ilike(gender))

    if min_experience and min_experience.isdigit():
        query = query.filter(Doctor.experience >= int(min_experience))

    if max_fee and max_fee.replace('.', '', 1).isdigit():
        query = query.filter(Doctor.consultation_fee <= float(max_fee))

    if min_rating and min_rating.replace('.', '', 1).isdigit():
        query = query.filter(Doctor.rating >= float(min_rating))

    if availability:
        query = query.filter(Doctor.available_days.ilike(f"%{availability}%"))

    # Sorting
    if sort_by == 'experience_desc':
        query = query.order_by(Doctor.experience.desc())
    elif sort_by == 'fee_asc':
        query = query.order_by(Doctor.consultation_fee.asc())
    elif sort_by == 'fee_desc':
        query = query.order_by(Doctor.consultation_fee.desc())
    elif sort_by == 'name_asc':
        query = query.order_by(Doctor.name.asc())
    elif sort_by == 'rating_asc':
        query = query.order_by(Doctor.rating.asc())
    else: # rating_desc default
        query = query.order_by(Doctor.rating.desc(), Doctor.experience.desc())

    total = query.count()
    doctors = query.offset((page - 1) * limit).limit(limit).all()

    # Get distinct locations/cities for filter sidebar
    locations = [l[0] for l in db.session.query(Doctor.location).distinct().all() if l[0]]

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

    # Fetch reviews
    reviews = Review.query.filter_by(doctor_id=doctor.id).order_by(Review.created_at.desc()).all()

    data = doctor.to_dict(brief=False)
    data['reviews'] = [r.to_dict() for r in reviews]
    return jsonify({
        'success': True,
        'doctor': data
    }), 200

@doctors_bp.route('', methods=['POST'])
@admin_required
def create_doctor():
    data = request.get_json() or {}

    name = (data.get('name') or '').strip()
    image = (data.get('image') or '').strip()
    qualification = (data.get('qualification') or '').strip()
    experience = data.get('experience')
    specialization_id = data.get('specialization_id')
    hospital_id = data.get('hospital_id')
    location = (data.get('location') or '').strip()
    consultation_fee = data.get('consultation_fee')
    email = (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip()

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

    if not Specialization.query.get(specialization_id):
        return jsonify({'success': False, 'message': 'Selected specialization does not exist.'}), 400

    if not Hospital.query.get(hospital_id):
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
@admin_required
def update_doctor(doctor_id):
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({'success': False, 'message': 'Doctor not found.'}), 404

    data = request.get_json() or {}

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
        if not Specialization.query.get(spec_id):
            return jsonify({'success': False, 'message': 'Specialization does not exist.'}), 400
        doctor.specialization_id = spec_id
    if 'hospital_id' in data:
        hosp_id = int(data['hospital_id'])
        if not Hospital.query.get(hosp_id):
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
@admin_required
def delete_doctor(doctor_id):
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({'success': False, 'message': 'Doctor not found.'}), 404

    doctor_name = doctor.name
    db.session.delete(doctor)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Doctor {doctor_name} has been removed successfully.'
    }), 200
