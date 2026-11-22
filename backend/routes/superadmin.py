import json
from datetime import datetime, timezone, date
from flask import Blueprint, request, jsonify, g
from models import (
    db,
    User,
    Hospital,
    Doctor,
    Appointment,
    AuditLog,
    SuperadminHospitalAssignment,
    HospitalAdminAssignment,
)
from utils.auth_middleware import (
    jwt_required,
    superadmin_required,
    can_access_hospital,
    get_accessible_hospital_ids,
)
from utils.audit import record_audit

superadmin_bp = Blueprint('superadmin', __name__, url_prefix='/api/superadmin')


def parse_notes(notes_str):
    if not notes_str:
        return {}
    try:
        return json.loads(notes_str)
    except Exception:
        return {'raw': notes_str}


# =============================================================================
# 1. Assigned Hospitals Management
# =============================================================================
@superadmin_bp.route('/assigned-hospitals', methods=['GET'])
@superadmin_required
def get_assigned_hospitals():
    """
    Returns all hospitals explicitly assigned to the authenticated SuperAdmin.
    Platform Owner receives all platform hospitals.
    """
    user = g.current_user
    accessible_ids = get_accessible_hospital_ids(user)

    if accessible_ids is None:
        hospitals = Hospital.query.order_by(Hospital.name.asc()).all()
    elif len(accessible_ids) == 0:
        hospitals = []
    else:
        hospitals = Hospital.query.filter(Hospital.id.in_(accessible_ids)).order_by(Hospital.name.asc()).all()

    result = []
    for h in hospitals:
        item = h.to_dict()
        # Count staff and appointments for this hospital
        item['doctors_count'] = Doctor.query.filter_by(hospital_id=h.id).count()
        item['receptionists_count'] = User.query.filter_by(hospital_id=h.id, role='RECEPTIONIST', is_active=True).count()
        item['appointments_count'] = Appointment.query.filter_by(hospital_id=h.id).count()

        # Primary Hospital Admin resolution
        primary_assignment = HospitalAdminAssignment.query.filter_by(
            hospital_id=h.id,
            is_primary=True,
            status='Active'
        ).first()

        if primary_assignment and primary_assignment.admin:
            item['primary_admin'] = {
                'id': primary_assignment.admin.id,
                'name': primary_assignment.admin.name,
                'email': primary_assignment.admin.email,
                'phone': primary_assignment.admin.phone,
                'designation': primary_assignment.designation,
                'assigned_at': primary_assignment.assigned_at.isoformat() if primary_assignment.assigned_at else None
            }
        elif h.primary_admin:
            item['primary_admin'] = {
                'id': h.primary_admin.id,
                'name': h.primary_admin.name,
                'email': h.primary_admin.email,
                'phone': h.primary_admin.phone,
                'designation': 'Primary Hospital Administrator',
                'assigned_at': None
            }
        else:
            item['primary_admin'] = None

        result.append(item)

    return jsonify({
        'success': True,
        'count': len(result),
        'hospitals': result
    }), 200


# =============================================================================
# 2. Multi-Hospital Aggregated & Scoped Dashboard Stats
# =============================================================================
@superadmin_bp.route('/dashboard-stats', methods=['GET'])
@superadmin_required
def get_dashboard_stats():
    """
    Returns operational statistics for the SuperAdmin.
    Can be aggregated across all assigned hospitals or filtered to a single assigned hospital (?hospital_id=X).
    """
    user = g.current_user
    accessible_ids = get_accessible_hospital_ids(user)
    requested_hosp_id = request.args.get('hospital_id')

    target_ids = []
    if requested_hosp_id:
        try:
            h_id = int(requested_hosp_id)
            if not can_access_hospital(user, h_id):
                return jsonify({
                    'success': False,
                    'message': f'Access denied: Hospital #{h_id} is not assigned to your account.'
                }), 403
            target_ids = [h_id]
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Invalid hospital_id parameter.'}), 400
    else:
        if accessible_ids is None:
            target_ids = [h.id for h in Hospital.query.all()]
        else:
            target_ids = accessible_ids

    if not target_ids:
        return jsonify({
            'success': True,
            'assigned_hospitals_count': 0,
            'total_doctors': 0,
            'total_receptionists': 0,
            'total_hospital_admins': 0,
            'total_appointments': 0,
            'today_appointments': 0,
            'upcoming_appointments': 0,
            'completed_appointments': 0,
            'pending_appointments': 0,
            'cancelled_appointments': 0,
            'pending_admin_registrations_count': 0,
            'pending_verification_count': 0,
            'hospital_summaries': [],
            'recent_activities': []
        }), 200

    today_str = date.today().isoformat()

    total_doctors = Doctor.query.filter(Doctor.hospital_id.in_(target_ids)).count()
    total_receptionists = User.query.filter(User.hospital_id.in_(target_ids), User.role == 'RECEPTIONIST', User.is_active == True).count()
    total_hospital_admins = User.query.filter(User.hospital_id.in_(target_ids), User.role.in_(['ADMIN', 'HOSPITAL_ADMIN'])).count()

    total_appointments = Appointment.query.filter(Appointment.hospital_id.in_(target_ids)).count()
    today_appointments = Appointment.query.filter(Appointment.hospital_id.in_(target_ids), Appointment.appointment_date == today_str).count()
    completed_appointments = Appointment.query.filter(Appointment.hospital_id.in_(target_ids), Appointment.status == 'Completed').count()
    pending_appointments = Appointment.query.filter(Appointment.hospital_id.in_(target_ids), Appointment.status == 'Pending').count()
    cancelled_appointments = Appointment.query.filter(Appointment.hospital_id.in_(target_ids), Appointment.status == 'Cancelled').count()
    upcoming_appointments = Appointment.query.filter(
        Appointment.hospital_id.in_(target_ids),
        Appointment.appointment_date >= today_str,
        Appointment.status.in_(['Pending', 'Confirmed'])
    ).count()

    pending_admin_registrations = User.query.filter(
        User.hospital_id.in_(target_ids),
        User.role.in_(['ADMIN', 'HOSPITAL_ADMIN']),
        User.approval_status == 'PENDING_APPROVAL'
    ).count()

    pending_verification_count = User.query.filter(
        User.hospital_id.in_(target_ids),
        User.role.in_(['DOCTOR', 'ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST']),
        User.approval_status == 'PENDING_APPROVAL'
    ).count()

    # Hospital performance breakdown
    hospital_summaries = []
    hospitals = Hospital.query.filter(Hospital.id.in_(target_ids)).all()
    for h in hospitals:
        doc_c = Doctor.query.filter_by(hospital_id=h.id).count()
        rec_c = User.query.filter_by(hospital_id=h.id, role='RECEPTIONIST', is_active=True).count()
        app_c = Appointment.query.filter_by(hospital_id=h.id).count()
        today_c = Appointment.query.filter_by(hospital_id=h.id, appointment_date=today_str).count()
        hospital_summaries.append({
            'id': h.id,
            'name': h.name,
            'city': h.city,
            'state': h.state,
            'doctors_count': doc_c,
            'receptionists_count': rec_c,
            'appointments_count': app_c,
            'today_appointments_count': today_c,
            'rating': h.rating,
            'verification_status': h.verification_status,
            'has_primary_admin': bool(h.primary_admin_id)
        })

    # Recent Audit Activities
    recent_logs = AuditLog.query.filter(
        AuditLog.hospital_id.in_(target_ids)
    ).order_by(AuditLog.created_at.desc()).limit(10).all()

    recent_activities = [log.to_dict() for log in recent_logs]

    target_hosp_name = hospital_summaries[0]['name'] if len(hospital_summaries) == 1 else None

    return jsonify({
        'success': True,
        'assigned_hospitals_count': len(target_ids),
        'target_hospital_name': target_hosp_name,
        'total_doctors': total_doctors,
        'total_receptionists': total_receptionists,
        'total_hospital_admins': total_hospital_admins,
        'total_appointments': total_appointments,
        'today_appointments': today_appointments,
        'upcoming_appointments': upcoming_appointments,
        'completed_appointments': completed_appointments,
        'pending_appointments': pending_appointments,
        'cancelled_appointments': cancelled_appointments,
        'pending_admin_registrations_count': pending_admin_registrations,
        'pending_verification_count': pending_verification_count,
        'hospital_summaries': hospital_summaries,
        'recent_activities': recent_activities
    }), 200


# =============================================================================
# 3. Hospital Admin Oversight & Primary Admin Management
# =============================================================================
@superadmin_bp.route('/hospital-admins', methods=['GET'])
@superadmin_required
def get_hospital_admins():
    """
    Lists all Hospital Admins across caller's assigned hospitals.
    Supports filtering by ?hospital_id=X and ?status=pending|approved|all.
    """
    user = g.current_user
    accessible_ids = get_accessible_hospital_ids(user)
    hosp_filter = request.args.get('hospital_id')
    status_filter = (request.args.get('status') or 'all').strip().lower()

    if hosp_filter:
        try:
            h_id = int(hosp_filter)
            if not can_access_hospital(user, h_id):
                return jsonify({'success': False, 'message': 'Access denied to requested hospital.'}), 403
            query = User.query.filter(User.hospital_id == h_id, User.role.in_(['ADMIN', 'HOSPITAL_ADMIN']))
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid hospital_id.'}), 400
    else:
        if accessible_ids is None:
            query = User.query.filter(User.role.in_(['ADMIN', 'HOSPITAL_ADMIN']))
        elif len(accessible_ids) == 0:
            return jsonify({'success': True, 'count': 0, 'hospital_admins': []}), 200
        else:
            query = User.query.filter(User.hospital_id.in_(accessible_ids), User.role.in_(['ADMIN', 'HOSPITAL_ADMIN']))

    if status_filter == 'pending':
        query = query.filter(User.approval_status == 'PENDING_APPROVAL')
    elif status_filter == 'approved':
        query = query.filter(User.approval_status == 'APPROVED')
    elif status_filter == 'rejected':
        query = query.filter(User.approval_status == 'REJECTED')

    admins = query.order_by(User.created_at.desc()).all()

    result = []
    for a in admins:
        item = a.to_dict()
        notes = parse_notes(a.registration_notes)
        item['designation'] = notes.get('designation') or notes.get('department') or 'Hospital Administrator'
        item['hospital_city'] = a.hospital.city if a.hospital else ''
        item['hospital_state'] = a.hospital.state if a.hospital else ''

        # Check if user is currently the active Primary Hospital Admin
        is_primary = False
        if a.hospital and a.hospital.primary_admin_id == a.id:
            is_primary = True
        else:
            assignment = HospitalAdminAssignment.query.filter_by(
                hospital_id=a.hospital_id,
                admin_id=a.id,
                is_primary=True,
                status='Active'
            ).first()
            if assignment:
                is_primary = True

        item['is_primary'] = is_primary
        result.append(item)

    return jsonify({
        'success': True,
        'count': len(result),
        'hospital_admins': result
    }), 200


@superadmin_bp.route('/hospital-admins/<int:user_id>/approve', methods=['POST'])
@superadmin_required
def approve_hospital_admin(user_id):
    """
    Approves a pending Hospital Admin applicant.
    Enforces hospital assignment verification and primary admin assignment.
    """
    caller = g.current_user
    target_user = db.session.get(User, user_id)
    if not target_user:
        return jsonify({'success': False, 'message': 'Target applicant not found.'}), 404

    if target_user.role not in ('ADMIN', 'HOSPITAL_ADMIN'):
        return jsonify({'success': False, 'message': 'Target user is not a Hospital Admin applicant.'}), 400

    if not can_access_hospital(caller, target_user.hospital_id):
        return jsonify({'success': False, 'message': 'Access denied: You do not manage this applicant\'s hospital.'}), 403

    if target_user.approval_status != 'PENDING_APPROVAL':
        return jsonify({'success': False, 'message': f'Applicant already processed ({target_user.approval_status}).'}), 400

    now_utc = datetime.now(timezone.utc)
    target_user.approval_status = 'APPROVED'
    target_user.is_active = True
    target_user.approved_by_id = caller.id
    target_user.approved_at = now_utc

    notes = parse_notes(target_user.registration_notes)
    designation = notes.get('designation') or notes.get('department') or 'Hospital Administrator'

    hospital = db.session.get(Hospital, target_user.hospital_id)
    is_first_primary = False
    if hospital and not hospital.primary_admin_id:
        hospital.primary_admin_id = target_user.id
        is_first_primary = True

    assignment = HospitalAdminAssignment(
        hospital_id=target_user.hospital_id,
        admin_id=target_user.id,
        designation=designation,
        is_primary=is_first_primary,
        status='Active',
        assigned_by_id=caller.id,
        assigned_at=now_utc
    )
    db.session.add(assignment)

    record_audit(
        caller.id,
        'APPROVE_HOSPITAL_ADMIN',
        'USER',
        target_user.id,
        hospital_id=target_user.hospital_id,
        details={
            'admin_email': target_user.email,
            'hospital': hospital.name if hospital else '',
            'is_primary': is_first_primary
        }
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Hospital Admin {target_user.name} approved successfully!',
        'is_primary': is_first_primary,
        'admin': target_user.to_dict()
    }), 200


@superadmin_bp.route('/hospital-admins/<int:user_id>/reject', methods=['POST'])
@superadmin_required
def reject_hospital_admin(user_id):
    """
    Rejects a pending Hospital Admin applicant with a documented reason.
    """
    caller = g.current_user
    target_user = db.session.get(User, user_id)
    if not target_user:
        return jsonify({'success': False, 'message': 'Target applicant not found.'}), 404

    if not can_access_hospital(caller, target_user.hospital_id):
        return jsonify({'success': False, 'message': 'Access denied: You do not manage this applicant\'s hospital.'}), 403

    if target_user.approval_status != 'PENDING_APPROVAL':
        return jsonify({'success': False, 'message': f'Applicant already processed ({target_user.approval_status}).'}), 400

    data = request.get_json() or {}
    reason = (data.get('reason') or '').strip() or 'Administrative verification criteria not met.'

    now_utc = datetime.now(timezone.utc)
    target_user.approval_status = 'REJECTED'
    target_user.is_active = False
    target_user.rejection_reason = reason
    target_user.approved_by_id = caller.id
    target_user.approved_at = now_utc

    record_audit(
        caller.id,
        'REJECT_HOSPITAL_ADMIN',
        'USER',
        target_user.id,
        hospital_id=target_user.hospital_id,
        details={'admin_email': target_user.email, 'reason': reason}
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Registration request for {target_user.name} was rejected.',
        'admin': target_user.to_dict()
    }), 200


@superadmin_bp.route('/hospital-admins/<int:user_id>/status', methods=['POST'])
@superadmin_required
def update_hospital_admin_status(user_id):
    """
    Suspends or reactivates a Hospital Admin account.
    """
    caller = g.current_user
    target_user = db.session.get(User, user_id)
    if not target_user:
        return jsonify({'success': False, 'message': 'Hospital Admin not found.'}), 404

    if not can_access_hospital(caller, target_user.hospital_id):
        return jsonify({'success': False, 'message': 'Access denied: You do not manage this user\'s hospital.'}), 403

    data = request.get_json() or {}
    is_active = bool(data.get('is_active', not target_user.is_active))
    reason = (data.get('reason') or '').strip() or ('Account reactivated' if is_active else 'Administrative suspension')

    target_user.is_active = is_active
    action = 'REACTIVATE_HOSPITAL_ADMIN' if is_active else 'SUSPEND_HOSPITAL_ADMIN'

    record_audit(
        caller.id,
        action,
        'USER',
        target_user.id,
        hospital_id=target_user.hospital_id,
        details={'admin_email': target_user.email, 'is_active': is_active, 'reason': reason}
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"Hospital Admin account has been {'reactivated' if is_active else 'suspended'}.",
        'admin': target_user.to_dict()
    }), 200


@superadmin_bp.route('/hospitals/<int:hospital_id>/replace-primary-admin', methods=['POST'])
@superadmin_required
def replace_primary_hospital_admin(hospital_id):
    """
    Controlled Primary Hospital Admin Replacement Workflow:
    1. Verifies caller manages the hospital.
    2. Identifies new admin (must be approved and belong to this hospital).
    3. Revokes existing primary assignment with documented replacement reason.
    4. Designates new admin as Primary Admin.
    5. Preserves complete historical audit trail.
    """
    caller = g.current_user
    if not can_access_hospital(caller, hospital_id):
        return jsonify({'success': False, 'message': 'Access denied: You do not manage this hospital.'}), 403

    hospital = db.session.get(Hospital, hospital_id)
    if not hospital:
        return jsonify({'success': False, 'message': 'Hospital not found.'}), 404

    data = request.get_json() or {}
    new_admin_id = data.get('new_admin_id')
    reason = (data.get('reason') or '').strip()

    if not new_admin_id:
        return jsonify({'success': False, 'message': 'Please select the replacement Hospital Admin.'}), 400

    if not reason:
        return jsonify({'success': False, 'message': 'A replacement reason is required for governance records.'}), 400

    new_admin = db.session.get(User, new_admin_id)
    if not new_admin or new_admin.hospital_id != hospital_id:
        return jsonify({'success': False, 'message': 'Selected user does not belong to this hospital.'}), 400

    if new_admin.approval_status != 'APPROVED' or not new_admin.is_active:
        return jsonify({'success': False, 'message': 'Only approved, active administrators can be appointed as Primary Admin.'}), 400

    now_utc = datetime.now(timezone.utc)

    # 1. Archive previous active primary assignments
    prev_assignments = HospitalAdminAssignment.query.filter_by(
        hospital_id=hospital_id,
        is_primary=True,
        status='Active'
    ).all()

    old_admin_names = []
    for prev in prev_assignments:
        prev.status = 'Replaced'
        prev.is_primary = False
        prev.revoked_at = now_utc
        prev.replacement_reason = reason
        if prev.admin:
            old_admin_names.append(prev.admin.name)

    # 2. Assign new Primary Admin
    new_assignment = HospitalAdminAssignment(
        hospital_id=hospital_id,
        admin_id=new_admin.id,
        designation='Primary Hospital Administrator',
        is_primary=True,
        status='Active',
        assigned_by_id=caller.id,
        assigned_at=now_utc
    )
    db.session.add(new_assignment)

    hospital.primary_admin_id = new_admin.id

    record_audit(
        caller.id,
        'REPLACE_PRIMARY_HOSPITAL_ADMIN',
        'HOSPITAL',
        hospital_id,
        hospital_id=hospital_id,
        details={
            'hospital_name': hospital.name,
            'previous_admins': old_admin_names,
            'new_primary_admin_id': new_admin.id,
            'new_primary_admin_email': new_admin.email,
            'reason': reason
        }
    )

    db.session.commit()

    admin_info = {
        'id': new_admin.id,
        'name': new_admin.name,
        'email': new_admin.email
    }

    return jsonify({
        'success': True,
        'message': f'Primary Hospital Administrator successfully updated to {new_admin.name}!',
        'hospital_id': hospital_id,
        'primary_admin': admin_info,
        'new_primary_admin': admin_info
    }), 200


@superadmin_bp.route('/hospitals/<int:hospital_id>/admin-history', methods=['GET'])
@superadmin_required
def get_hospital_admin_history(hospital_id):
    """
    Returns the complete assignment and replacement history of Hospital Admins for a hospital.
    """
    caller = g.current_user
    if not can_access_hospital(caller, hospital_id):
        return jsonify({'success': False, 'message': 'Access denied: You do not manage this hospital.'}), 403

    history = HospitalAdminAssignment.query.filter_by(
        hospital_id=hospital_id
    ).order_by(HospitalAdminAssignment.assigned_at.desc()).all()

    return jsonify({
        'success': True,
        'hospital_id': hospital_id,
        'count': len(history),
        'history': [h.to_dict() for h in history]
    }), 200


# =============================================================================
# 4. Verification and Approval Center
# =============================================================================
@superadmin_bp.route('/verification-center', methods=['GET'])
@superadmin_required
def get_verification_center():
    """
    Central review center returning all pending registration and affiliation requests
    across caller's assigned hospitals.
    """
    caller = g.current_user
    accessible_ids = get_accessible_hospital_ids(caller)

    if accessible_ids is None:
        pending_users = User.query.filter(
            User.approval_status == 'PENDING_APPROVAL',
            User.role.in_(['ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST'])
        ).order_by(User.created_at.desc()).all()
    elif len(accessible_ids) == 0:
        pending_users = []
    else:
        pending_users = User.query.filter(
            User.hospital_id.in_(accessible_ids),
            User.approval_status == 'PENDING_APPROVAL',
            User.role.in_(['ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST'])
        ).order_by(User.created_at.desc()).all()

    categorized = {
        'hospital_admins': [],
        'doctors': [],
        'receptionists': []
    }

    for u in pending_users:
        item = u.to_dict()
        item['parsed_notes'] = parse_notes(u.registration_notes)
        if u.role in ('ADMIN', 'HOSPITAL_ADMIN'):
            categorized['hospital_admins'].append(item)
        elif u.role == 'DOCTOR':
            categorized['doctors'].append(item)
        elif u.role == 'RECEPTIONIST':
            categorized['receptionists'].append(item)

    return jsonify({
        'success': True,
        'total_pending': len(pending_users),
        'requests': categorized
    }), 200
