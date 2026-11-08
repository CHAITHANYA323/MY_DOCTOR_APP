from datetime import datetime, date
from flask import Blueprint, jsonify, g
from models import db, User, Doctor, Hospital, Specialization, Appointment, Ambulance, AmbulanceRequest
from utils.auth_middleware import admin_required, jwt_required

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api')

@dashboard_bp.route('/admin/stats', methods=['GET'])
@jwt_required
def get_admin_stats():
    user = g.current_user
    if user.role not in ('PLATFORM_OWNER', 'HOSPITAL_SUPER_ADMIN', 'RECEPTIONIST'):
        return jsonify({'success': False, 'message': 'Access denied. Hospital administrative privileges required.'}), 403

    if user.role == 'PLATFORM_OWNER':
        total_doctors = Doctor.query.count()
        total_hospitals = Hospital.query.count()
        total_users = User.query.filter(User.role.in_(['USER', 'PATIENT'])).count()
        total_appointments = Appointment.query.count()
        pending_appointments = Appointment.query.filter_by(status='Pending').count()
        confirmed_appointments = Appointment.query.filter_by(status='Confirmed').count()
        completed_appointments = Appointment.query.filter_by(status='Completed').count()
        cancelled_appointments = Appointment.query.filter_by(status='Cancelled').count()
        today_str = date.today().isoformat()
        today_appointments = Appointment.query.filter_by(appointment_date=today_str).count()
        today_pending = Appointment.query.filter_by(appointment_date=today_str, status='Pending').count()
        today_confirmed = Appointment.query.filter_by(appointment_date=today_str, status='Confirmed').count()
        today_completed = Appointment.query.filter_by(appointment_date=today_str, status='Completed').count()
        total_ambulances = Ambulance.query.count()
        available_ambulances = Ambulance.query.filter_by(status='Available').count()
        total_ambulance_requests = AmbulanceRequest.query.count()
        pending_ambulance_requests = AmbulanceRequest.query.filter_by(status='Pending').count()

        # Specialization distribution
        specs = Specialization.query.all()
        specialization_stats = [
            {'name': s.name, 'count': len(s.doctors)} for s in specs if len(s.doctors) > 0
        ]
        specialization_stats.sort(key=lambda x: x['count'], reverse=True)

        # Hospital doctor distribution
        hospitals = Hospital.query.all()
        hospital_stats = [
            {'name': h.name, 'city': h.city, 'doctors': len(h.doctors), 'rating': h.rating}
            for h in hospitals
        ]

        recent_appointments = Appointment.query.order_by(Appointment.created_at.desc()).limit(6).all()
        recent_requests = AmbulanceRequest.query.order_by(AmbulanceRequest.created_at.desc()).limit(6).all()
    else:
        # Strictly hospital-scoped metrics
        if not user.hospital_id:
            return jsonify({'success': False, 'message': 'Staff user has no hospital assigned.'}), 403
        h_id = user.hospital_id

        total_doctors = Doctor.query.filter_by(hospital_id=h_id).count()
        total_hospitals = 1
        total_users = Appointment.query.filter_by(hospital_id=h_id).with_entities(Appointment.user_id).distinct().count()
        total_appointments = Appointment.query.filter_by(hospital_id=h_id).count()
        pending_appointments = Appointment.query.filter_by(hospital_id=h_id, status='Pending').count()
        confirmed_appointments = Appointment.query.filter_by(hospital_id=h_id, status='Confirmed').count()
        completed_appointments = Appointment.query.filter_by(hospital_id=h_id, status='Completed').count()
        cancelled_appointments = Appointment.query.filter_by(hospital_id=h_id, status='Cancelled').count()
        today_str = date.today().isoformat()
        today_appointments = Appointment.query.filter_by(hospital_id=h_id, appointment_date=today_str).count()
        today_pending = Appointment.query.filter_by(hospital_id=h_id, appointment_date=today_str, status='Pending').count()
        today_confirmed = Appointment.query.filter_by(hospital_id=h_id, appointment_date=today_str, status='Confirmed').count()
        today_completed = Appointment.query.filter_by(hospital_id=h_id, appointment_date=today_str, status='Completed').count()
        hosp = db.session.get(Hospital, h_id)
        hospital_stats = [
            {'name': hosp.name, 'city': hosp.city, 'doctors': total_doctors, 'rating': hosp.rating}
        ] if hosp else []

        total_ambulances = Ambulance.query.count()
        available_ambulances = Ambulance.query.filter_by(status='Available').count()
        if hosp:
            total_ambulance_requests = AmbulanceRequest.query.filter(AmbulanceRequest.destination_hospital.ilike(f"%{hosp.name}%")).count()
            pending_ambulance_requests = AmbulanceRequest.query.filter(
                AmbulanceRequest.destination_hospital.ilike(f"%{hosp.name}%"),
                AmbulanceRequest.status == 'Pending'
            ).count()
            recent_requests = AmbulanceRequest.query.filter(
                AmbulanceRequest.destination_hospital.ilike(f"%{hosp.name}%")
            ).order_by(AmbulanceRequest.created_at.desc()).limit(6).all()
        else:
            total_ambulance_requests = 0
            pending_ambulance_requests = 0
            recent_requests = []

        hosp_docs = Doctor.query.filter_by(hospital_id=h_id).all()
        spec_counts = {}
        for d in hosp_docs:
            if d.specialization:
                spec_counts[d.specialization.name] = spec_counts.get(d.specialization.name, 0) + 1
        specialization_stats = [{'name': k, 'count': v} for k, v in spec_counts.items()]
        specialization_stats.sort(key=lambda x: x['count'], reverse=True)

        recent_appointments = Appointment.query.filter_by(hospital_id=h_id).order_by(Appointment.created_at.desc()).limit(6).all()

    status_distribution = [
        {'status': 'Pending', 'count': pending_appointments, 'color': '#f59e0b'},
        {'status': 'Confirmed', 'count': confirmed_appointments, 'color': '#0284c7'},
        {'status': 'Completed', 'count': completed_appointments, 'color': '#10b981'},
        {'status': 'Cancelled', 'count': cancelled_appointments, 'color': '#ef4444'}
    ]

    return jsonify({
        'success': True,
        'metrics': {
            'total_doctors': total_doctors,
            'total_hospitals': total_hospitals,
            'total_users': total_users,
            'total_appointments': total_appointments,
            'pending_appointments': pending_appointments,
            'confirmed_appointments': confirmed_appointments,
            'completed_appointments': completed_appointments,
            'cancelled_appointments': cancelled_appointments,
            'today_appointments': today_appointments,
            'today_pending': today_pending,
            'today_confirmed': today_confirmed,
            'today_completed': today_completed,
            'total_ambulances': total_ambulances,
            'available_ambulances': available_ambulances,
            'total_ambulance_requests': total_ambulance_requests,
            'pending_ambulance_requests': pending_ambulance_requests
        },
        'status_distribution': status_distribution,
        'specialization_stats': specialization_stats[:8],
        'hospital_stats': hospital_stats,
        'recent_appointments': [a.to_dict() for a in recent_appointments],
        'recent_ambulance_requests': [r.to_dict() for r in recent_requests]
    }), 200


@dashboard_bp.route('/user/stats', methods=['GET'])
@jwt_required
def get_user_stats():
    user = g.current_user
    today_str = date.today().isoformat()

    all_user_appts = Appointment.query.filter_by(user_id=user.id).all()
    upcoming = [a for a in all_user_appts if a.status in ['Pending', 'Confirmed'] and a.appointment_date >= today_str]
    completed = [a for a in all_user_appts if a.status == 'Completed']
    cancelled = [a for a in all_user_appts if a.status == 'Cancelled']

    ambulance_requests = AmbulanceRequest.query.filter_by(user_id=user.id).order_by(AmbulanceRequest.created_at.desc()).limit(5).all()

    return jsonify({
        'success': True,
        'metrics': {
            'total_appointments': len(all_user_appts),
            'upcoming_count': len(upcoming),
            'completed_count': len(completed),
            'cancelled_count': len(cancelled),
            'total_ambulance_requests': len(ambulance_requests)
        },
        'upcoming_appointments': [a.to_dict() for a in upcoming[:3]],
        'recent_ambulance_requests': [r.to_dict() for r in ambulance_requests]
    }), 200
