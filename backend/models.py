from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(25))
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='USER', nullable=False)  # 'USER' or 'ADMIN'
    avatar = db.Column(db.String(255), default='')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    appointments = db.relationship('Appointment', back_populates='user', cascade='all, delete-orphan')
    reviews = db.relationship('Review', back_populates='user', cascade='all, delete-orphan')
    favorites = db.relationship('Favorite', back_populates='user', cascade='all, delete-orphan')
    ambulance_requests = db.relationship('AmbulanceRequest', back_populates='user')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'role': self.role,
            'avatar': self.avatar or f"https://ui-avatars.com/api/?name={self.name.replace(' ', '+')}&background=0284c7&color=fff",
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Specialization(db.Model):
    __tablename__ = 'specializations'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    icon = db.Column(db.String(50), default='FaStethoscope')
    image = db.Column(db.String(255), default='')

    doctors = db.relationship('Doctor', back_populates='specialization')

    def to_dict(self, include_doctor_count=True):
        data = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'icon': self.icon,
            'image': self.image
        }
        if include_doctor_count:
            data['doctor_count'] = len(self.doctors)
        return data


class Hospital(db.Model):
    __tablename__ = 'hospitals'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, index=True)
    slug = db.Column(db.String(150), unique=True, nullable=False)
    image = db.Column(db.String(255), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    city = db.Column(db.String(100), nullable=False, index=True)
    state = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(30))
    email = db.Column(db.String(120))
    emergency_number = db.Column(db.String(30), nullable=False)
    facilities = db.Column(db.Text)  # Comma separated or json array string
    working_hours = db.Column(db.String(100), default='24 Hours / 7 Days')
    rating = db.Column(db.Float, default=4.8)
    total_reviews = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    doctors = db.relationship('Doctor', back_populates='hospital')
    appointments = db.relationship('Appointment', back_populates='hospital')

    def to_dict(self, include_doctors=False):
        data = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'image': self.image,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'phone': self.phone,
            'email': self.email,
            'emergency_number': self.emergency_number,
            'facilities': [f.strip() for f in (self.facilities or '').split(',') if f.strip()],
            'working_hours': self.working_hours,
            'rating': round(self.rating, 1) if self.rating else 4.8,
            'total_reviews': self.total_reviews,
            'doctor_count': len(self.doctors),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_doctors:
            data['doctors'] = [doc.to_dict(brief=True) for doc in self.doctors]
        return data


class Doctor(db.Model):
    __tablename__ = 'doctors'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, index=True)
    gender = db.Column(db.String(20), default='Not Specified')
    image = db.Column(db.String(255), nullable=False)
    qualification = db.Column(db.String(150), nullable=False)
    experience = db.Column(db.Integer, nullable=False, default=1)  # Years
    specialization_id = db.Column(db.Integer, db.ForeignKey('specializations.id'), nullable=False, index=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey('hospitals.id'), nullable=False, index=True)
    location = db.Column(db.String(150), nullable=False, index=True)
    phone = db.Column(db.String(30))
    email = db.Column(db.String(120))
    consultation_fee = db.Column(db.Float, nullable=False, default=500.0)
    available_days = db.Column(db.String(100), default='Monday - Saturday')
    available_time = db.Column(db.String(100), default='09:00 AM - 05:00 PM')
    languages = db.Column(db.String(150), default='English, Hindi')
    about = db.Column(db.Text)
    consultation_type = db.Column(db.String(50), default='In-Person & Video')
    status = db.Column(db.String(20), default='Active', index=True)  # 'Active' or 'Inactive'
    rating = db.Column(db.Float, default=4.9)
    total_reviews = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    specialization = db.relationship('Specialization', back_populates='doctors')
    hospital = db.relationship('Hospital', back_populates='doctors')
    appointments = db.relationship('Appointment', back_populates='doctor', cascade='all, delete-orphan')
    reviews = db.relationship('Review', back_populates='doctor', cascade='all, delete-orphan')
    favorites = db.relationship('Favorite', back_populates='doctor', cascade='all, delete-orphan')

    def to_dict(self, brief=False):
        data = {
            'id': self.id,
            'name': self.name,
            'gender': self.gender,
            'image': self.image,
            'qualification': self.qualification,
            'experience': self.experience,
            'specialization_id': self.specialization_id,
            'specialization_name': self.specialization.name if self.specialization else '',
            'hospital_id': self.hospital_id,
            'hospital_name': self.hospital.name if self.hospital else '',
            'hospital_image': self.hospital.image if self.hospital else '',
            'location': self.location,
            'phone': self.phone,
            'email': self.email,
            'consultation_fee': self.consultation_fee,
            'available_days': self.available_days,
            'available_time': self.available_time,
            'languages': self.languages,
            'consultation_type': self.consultation_type,
            'status': self.status,
            'rating': round(self.rating, 1) if self.rating else 4.9,
            'total_reviews': self.total_reviews,
        }
        if not brief:
            data.update({
                'about': self.about,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'hospital_details': self.hospital.to_dict() if self.hospital else None,
                'specialization_details': self.specialization.to_dict(include_doctor_count=False) if self.specialization else None,
            })
        return data


class Appointment(db.Model):
    __tablename__ = 'appointments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False, index=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey('hospitals.id'), nullable=False, index=True)
    appointment_date = db.Column(db.String(20), nullable=False) # Format: YYYY-MM-DD
    appointment_time = db.Column(db.String(30), nullable=False) # e.g. "10:30 AM"
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), default='Pending', index=True) # 'Pending', 'Confirmed', 'Completed', 'Cancelled'
    notes = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', back_populates='appointments')
    doctor = db.relationship('Doctor', back_populates='appointments')
    hospital = db.relationship('Hospital', back_populates='appointments')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'patient_name': self.user.name if self.user else 'Unknown Patient',
            'patient_email': self.user.email if self.user else '',
            'patient_phone': self.user.phone if self.user else '',
            'doctor_id': self.doctor_id,
            'doctor_name': self.doctor.name if self.doctor else 'Unknown Doctor',
            'doctor_image': self.doctor.image if self.doctor else '',
            'specialization': self.doctor.specialization.name if (self.doctor and self.doctor.specialization) else '',
            'consultation_fee': self.doctor.consultation_fee if self.doctor else 0,
            'hospital_id': self.hospital_id,
            'hospital_name': self.hospital.name if self.hospital else 'Unknown Hospital',
            'hospital_location': self.hospital.city if self.hospital else '',
            'appointment_date': self.appointment_date,
            'appointment_time': self.appointment_time,
            'reason': self.reason,
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Ambulance(db.Model):
    __tablename__ = 'ambulances'

    id = db.Column(db.Integer, primary_key=True)
    vehicle_number = db.Column(db.String(50), unique=True, nullable=False)
    driver_name = db.Column(db.String(100), nullable=False)
    driver_phone = db.Column(db.String(30), nullable=False)
    ambulance_type = db.Column(db.String(60), default='Basic Life Support') # 'Basic Life Support', 'Advanced Life Support', 'ICU Ambulance', 'Patient Transport'
    current_location = db.Column(db.String(150), nullable=False)
    status = db.Column(db.String(30), default='Available', index=True) # 'Available', 'On Duty', 'Maintenance'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    requests = db.relationship('AmbulanceRequest', back_populates='assigned_ambulance')

    def to_dict(self):
        return {
            'id': self.id,
            'vehicle_number': self.vehicle_number,
            'driver_name': self.driver_name,
            'driver_phone': self.driver_phone,
            'ambulance_type': self.ambulance_type,
            'current_location': self.current_location,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AmbulanceRequest(db.Model):
    __tablename__ = 'ambulance_requests'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    patient_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(30), nullable=False)
    emergency_type = db.Column(db.String(100), nullable=False) # 'Accident', 'Heart Emergency', 'Breathing Problem', etc.
    pickup_location = db.Column(db.String(255), nullable=False)
    destination_hospital = db.Column(db.String(150), nullable=False)
    patients_count = db.Column(db.Integer, default=1)
    additional_info = db.Column(db.Text, default='')
    status = db.Column(db.String(30), default='Pending', index=True) # 'Pending', 'Dispatched', 'Arrived', 'Completed', 'Cancelled'
    assigned_ambulance_id = db.Column(db.Integer, db.ForeignKey('ambulances.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', back_populates='ambulance_requests')
    assigned_ambulance = db.relationship('Ambulance', back_populates='requests')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'patient_name': self.patient_name,
            'phone': self.phone,
            'emergency_type': self.emergency_type,
            'pickup_location': self.pickup_location,
            'destination_hospital': self.destination_hospital,
            'patients_count': self.patients_count,
            'additional_info': self.additional_info,
            'status': self.status,
            'assigned_ambulance_id': self.assigned_ambulance_id,
            'assigned_ambulance': self.assigned_ambulance.to_dict() if self.assigned_ambulance else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Review(db.Model):
    __tablename__ = 'reviews'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False, index=True)
    rating = db.Column(db.Integer, nullable=False) # 1 to 5
    comment = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', back_populates='reviews')
    doctor = db.relationship('Doctor', back_populates='reviews')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else 'Anonymous Patient',
            'user_avatar': self.user.avatar if self.user else '',
            'doctor_id': self.doctor_id,
            'rating': self.rating,
            'comment': self.comment,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Favorite(db.Model):
    __tablename__ = 'favorites'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', back_populates='favorites')
    doctor = db.relationship('Doctor', back_populates='favorites')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'doctor_id': self.doctor_id,
            'doctor': self.doctor.to_dict(brief=True) if self.doctor else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
