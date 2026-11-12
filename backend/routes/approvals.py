import re
import json
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy.exc import IntegrityError
from models import db, User, Hospital, Doctor, Specialization, AuditLog
from utils.auth_middleware import (
    jwt_required,
    hospital_admin_required,
    platform_owner_required,
)
from utils.audit import record_audit

approvals_bp = Blueprint('approvals', __name__, url_prefix='/api')


def slugify(text: str) -> str:
    """Generates a clean URL slug from string."""
    text = (text or '').lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text)


def parse_notes(notes_str):
    """Safely decodes JSON notes or returns empty dict."""
    if not notes_str:
        return {}
    try:
        return json.loads(notes_str)
    except Exception:
        return {'raw': notes_str}


# -----------------------------------------------------------------------------
# 1. Hospital Super Admin Approval Management
# -----------------------------------------------------------------------------
@approvals_bp.route('/hospital/approvals', methods=['GET'])
@hospital_admin_required
def get_hospital_approvals():
    """
    Lists registration requests for the authenticated Hospital Super Admin's hospital.
    Filtered to DOCTOR, ADMIN, and RECEPTIONIST roles.
    """
    hospital_id = g.current_user.hospital_id
    if not hospital_id:
        return jsonify({
            'success': False,
            'message': 'Access denied: caller is not assigned to a valid hospital.'
        }), 403

    status_filter = request.args.get('status', 'pending').strip().lower()

    query = User.query.filter(
        User.hospital_id == hospital_id,
        User.role.in_(['DOCTOR', 'ADMIN', 'RECEPTIONIST'])
    )

    if status_filter == 'pending':
        query = query.filter(User.approval_status == 'PENDING_APPROVAL')
    elif status_filter == 'approved':
        query = query.filter(User.approval_status == 'APPROVED')
    elif status_filter == 'rejected':
        query = query.filter(User.approval_status == 'REJECTED')
    # 'all' applies no extra approval_status filter

    requests = query.order_by(User.created_at.desc()).all()

    formatted = []
    for u in requests:
        item = u.to_dict()
        item['parsed_notes'] = parse_notes(u.registration_notes)
        formatted.append(item)

    return jsonify({
        'success': True,
        'hospital_id': hospital_id,
        'total': len(formatted),
        'requests': formatted
    }), 200


@approvals_bp.route('/hospital/approvals/<int:user_id>/approve', methods=['POST'])
@hospital_admin_required
def approve_hospital_staff(user_id):
    """
    Approves a pending Doctor or Receptionist registration request.
    Strictly verifies hospital tenant isolation, role constraints, and pending state.
    """
    caller_hospital_id = g.current_user.hospital_id
    if not caller_hospital_id:
        return jsonify({'success': False, 'message': 'Administrator hospital assignment missing.'}), 403

    target_user = db.session.get(User, user_id)
    if not target_user:
        return jsonify({'success': False, 'message': 'Target applicant record not found.'}), 404

    # SEC-01: Cross-hospital IDOR defense
    if target_user.hospital_id != caller_hospital_id:
        return jsonify({
            'success': False,
            'message': 'Access denied: You cannot approve staff for another hospital.'
        }), 403

    # SEC-02: Prevent role escalation
    if target_user.role not in ('DOCTOR', 'ADMIN', 'RECEPTIONIST'):
        return jsonify({
            'success': False,
            'message': f"Access denied: Hospital Super Admin cannot approve role '{target_user.role}'."
        }), 403

    # SEC-03: Repeated / Duplicate approval prevention
    if target_user.approval_status != 'PENDING_APPROVAL':
        return jsonify({
            'success': False,
            'message': f"Request has already been processed with status '{target_user.approval_status}'."
        }), 400

    now_utc = datetime.now(timezone.utc)
    target_user.approval_status = 'APPROVED'
    target_user.is_active = True
    target_user.approved_by_id = g.current_user.id
    target_user.approved_at = now_utc
    target_user.rejection_reason = None

    # Doctor specific activation & profile linking
    if target_user.role == 'DOCTOR':
        doctor = Doctor.query.filter_by(user_id=target_user.id).first()
        notes = parse_notes(target_user.registration_notes)
        spec_id = notes.get('specialization_id') or 1
        hosp = g.current_user.hospital

        if doctor:
            doctor.status = 'Active'
            if notes.get('registration_number'):
                doctor.registration_number = notes['registration_number']
            if notes.get('council_name'):
                doctor.council_name = notes['council_name']
            if notes.get('designation'):
                doctor.designation = notes['designation']
        else:
            doctor = Doctor(
                user_id=target_user.id,
                name=target_user.name,
                gender='Not Specified',
                image=target_user.avatar or 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80',
                qualification=notes.get('qualification') or 'MBBS',
                experience=int(notes.get('experience') or 5),
                specialization_id=spec_id,
                hospital_id=caller_hospital_id,
                location=hosp.city if hosp else 'General',
                phone=target_user.phone or '',
                email=target_user.email,
                registration_number=notes.get('registration_number') or '',
                council_name=notes.get('council_name') or 'State Medical Council',
                designation=notes.get('designation') or 'Consultant',
                consultation_fee=float(notes.get('consultation_fee') or 600.0),
                status='Active'
            )
            db.session.add(doctor)

    record_audit(
        g.current_user.id,
        'APPROVE_STAFF_REGISTRATION',
        'USER',
        target_user.id,
        hospital_id=caller_hospital_id,
        details={'approved_user_email': target_user.email, 'role': target_user.role}
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"Successfully approved {target_user.role} registration for {target_user.name}.",
        'user': target_user.to_dict()
    }), 200


@approvals_bp.route('/hospital/approvals/<int:user_id>/reject', methods=['POST'])
@hospital_admin_required
def reject_hospital_staff(user_id):
    """
    Rejects a pending Doctor or Receptionist registration request with an institutional reason.
    """
    caller_hospital_id = g.current_user.hospital_id
    if not caller_hospital_id:
        return jsonify({'success': False, 'message': 'Administrator hospital assignment missing.'}), 403

    target_user = db.session.get(User, user_id)
    if not target_user:
        return jsonify({'success': False, 'message': 'Target applicant record not found.'}), 404

    # SEC-01: Cross-hospital IDOR defense
    if target_user.hospital_id != caller_hospital_id:
        return jsonify({
            'success': False,
            'message': 'Access denied: You cannot reject staff for another hospital.'
        }), 403

    # SEC-02: Prevent role escalation
    if target_user.role not in ('DOCTOR', 'ADMIN', 'RECEPTIONIST'):
        return jsonify({
            'success': False,
            'message': f"Access denied: Hospital Super Admin cannot reject role '{target_user.role}'."
        }), 403

    # SEC-03: Repeated processing defense
    if target_user.approval_status != 'PENDING_APPROVAL':
        return jsonify({
            'success': False,
            'message': f"Request has already been processed with status '{target_user.approval_status}'."
        }), 400

    data = request.get_json() or {}
    reason = (data.get('reason') or '').strip() or 'Eligibility or credential criteria not met.'

    now_utc = datetime.now(timezone.utc)
    target_user.approval_status = 'REJECTED'
    target_user.is_active = False
    target_user.rejection_reason = reason
    target_user.approved_by_id = g.current_user.id
    target_user.approved_at = now_utc

    # If Doctor record was created in Pending status, mark Inactive
    if target_user.role == 'DOCTOR':
        doctor = Doctor.query.filter_by(user_id=target_user.id).first()
        if doctor:
            doctor.status = 'Inactive'

    record_audit(
        g.current_user.id,
        'REJECT_STAFF_REGISTRATION',
        'USER',
        target_user.id,
        hospital_id=caller_hospital_id,
        details={'rejected_user_email': target_user.email, 'role': target_user.role, 'reason': reason}
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"Registration request for {target_user.name} has been rejected.",
        'user': target_user.to_dict()
    }), 200


# -----------------------------------------------------------------------------
# 2. Platform Owner Super Admin Approval Management
# -----------------------------------------------------------------------------
@approvals_bp.route('/platform/approvals', methods=['GET'])
@platform_owner_required
def get_platform_approvals():
    """
    Lists all pending Hospital Super Admin registration requests across the platform.
    """
    status_filter = request.args.get('status', 'pending').strip().lower()

    query = User.query.filter(User.role == 'HOSPITAL_SUPER_ADMIN')

    if status_filter == 'pending':
        query = query.filter(User.approval_status == 'PENDING_APPROVAL')
    elif status_filter == 'approved':
        query = query.filter(User.approval_status == 'APPROVED')
    elif status_filter == 'rejected':
        query = query.filter(User.approval_status == 'REJECTED')

    requests = query.order_by(User.created_at.desc()).all()

    formatted = []
    for u in requests:
        item = u.to_dict()
        item['parsed_notes'] = parse_notes(u.registration_notes)
        formatted.append(item)

    return jsonify({
        'success': True,
        'total': len(formatted),
        'requests': formatted
    }), 200


@approvals_bp.route('/platform/approvals/<int:user_id>/approve', methods=['POST'])
@platform_owner_required
def approve_superadmin_request(user_id):
    """
    Approves a Hospital Super Admin registration request.
    Platform Owner either:
    1. Creates the proposed hospital and assigns the Super Admin.
    2. Assigns the applicant to an existing verified hospital.
    """
    target_user = db.session.get(User, user_id)
    if not target_user:
        return jsonify({'success': False, 'message': 'Target applicant record not found.'}), 404

    if target_user.role != 'HOSPITAL_SUPER_ADMIN':
        return jsonify({
            'success': False,
            'message': f"Target applicant is not a HOSPITAL_SUPER_ADMIN (current role: {target_user.role})."
        }), 400

    if target_user.approval_status != 'PENDING_APPROVAL':
        return jsonify({
            'success': False,
            'message': f"Request has already been processed with status '{target_user.approval_status}'."
        }), 400

    data = request.get_json() or {}
    notes = parse_notes(target_user.registration_notes)

    target_hospital_id = data.get('assign_hospital_id')

    if target_hospital_id:
        hospital = db.session.get(Hospital, target_hospital_id)
        if not hospital:
            return jsonify({'success': False, 'message': 'Assigned hospital does not exist.'}), 404
    else:
        # Create hospital based on verified details
        hosp_name = (data.get('hospital_name') or notes.get('hospital_name') or '').strip()
        hosp_city = (data.get('hospital_city') or notes.get('hospital_city') or '').strip()
        hosp_state = (data.get('hospital_state') or notes.get('hospital_state') or 'Telangana').strip()
        emergency_number = (data.get('emergency_number') or notes.get('emergency_number') or '').strip()
        address = (data.get('hospital_address') or notes.get('hospital_address') or f"{hosp_city}, {hosp_state}").strip()
        phone = (data.get('hospital_phone') or notes.get('hospital_phone') or target_user.phone or '').strip()

        if not hosp_name or not hosp_city or not emergency_number:
            return jsonify({
                'success': False,
                'message': 'Hospital name, city, and emergency number are required to create a hospital.'
            }), 400

        # Unique slug generation
        slug = slugify(hosp_name)
        base_slug = slug
        counter = 1
        while Hospital.query.filter_by(slug=slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1

        hospital = Hospital(
            name=hosp_name,
            slug=slug,
            image=data.get('image') or 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80',
            address=address,
            city=hosp_city,
            state=hosp_state,
            phone=phone,
            email=target_user.email,
            emergency_number=emergency_number,
            facilities=notes.get('facilities', '24/7 Emergency, Inpatient, Pharmacy'),
            working_hours='24 Hours / 7 Days'
        )
        db.session.add(hospital)
        db.session.flush()

    now_utc = datetime.now(timezone.utc)
    target_user.hospital_id = hospital.id
    target_user.approval_status = 'APPROVED'
    target_user.is_active = True
    target_user.approved_by_id = g.current_user.id
    target_user.approved_at = now_utc
    target_user.rejection_reason = None

    record_audit(
        g.current_user.id,
        'APPROVE_SUPERADMIN_REGISTRATION',
        'USER',
        target_user.id,
        hospital_id=hospital.id,
        details={'approved_admin_email': target_user.email, 'hospital_name': hospital.name}
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"Super Admin request approved. {target_user.name} is now the Super Administrator of {hospital.name}.",
        'user': target_user.to_dict(),
        'hospital': hospital.to_dict()
    }), 200


@approvals_bp.route('/platform/approvals/<int:user_id>/reject', methods=['POST'])
@platform_owner_required
def reject_superadmin_request(user_id):
    """
    Rejects a Hospital Super Admin registration request with a recorded justification.
    """
    target_user = db.session.get(User, user_id)
    if not target_user:
        return jsonify({'success': False, 'message': 'Target applicant record not found.'}), 404

    if target_user.role != 'HOSPITAL_SUPER_ADMIN':
        return jsonify({
            'success': False,
            'message': f"Target applicant is not a HOSPITAL_SUPER_ADMIN (current role: {target_user.role})."
        }), 400

    if target_user.approval_status != 'PENDING_APPROVAL':
        return jsonify({
            'success': False,
            'message': f"Request has already been processed with status '{target_user.approval_status}'."
        }), 400

    data = request.get_json() or {}
    reason = (data.get('reason') or '').strip() or 'Institutional verification could not be completed.'

    now_utc = datetime.now(timezone.utc)
    target_user.approval_status = 'REJECTED'
    target_user.is_active = False
    target_user.rejection_reason = reason
    target_user.approved_by_id = g.current_user.id
    target_user.approved_at = now_utc

    record_audit(
        g.current_user.id,
        'REJECT_SUPERADMIN_REGISTRATION',
        'USER',
        target_user.id,
        details={'rejected_admin_email': target_user.email, 'reason': reason}
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"Super Admin registration request for {target_user.name} has been rejected.",
        'user': target_user.to_dict()
    }), 200

