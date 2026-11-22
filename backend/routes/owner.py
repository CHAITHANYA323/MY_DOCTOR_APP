import json
from datetime import datetime, timezone, timedelta
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
    platform_owner_required,
)
from utils.audit import record_audit

owner_bp = Blueprint('owner', __name__, url_prefix='/api/owner')


def parse_notes(notes_str):
    if not notes_str:
        return {}
    try:
        return json.loads(notes_str)
    except Exception:
        return {'raw': notes_str}


# =============================================================================
# 1. Platform Executive Overview
# =============================================================================
@owner_bp.route('/overview', methods=['GET'])
@platform_owner_required
def get_platform_overview():
    """
    Global platform statistics for Platform Owner executive dashboard.
    Calculated exclusively from live database records.
    """
    total_hospitals = Hospital.query.count()
    verified_hospitals = Hospital.query.filter_by(is_verified=True).count()
    pending_hospitals = Hospital.query.filter_by(is_verified=False).count()

    total_superadmins = User.query.filter(User.role.in_(['HOSPITAL_SUPER_ADMIN', 'SUPERADMIN'])).count()
    active_superadmins = User.query.filter(User.role.in_(['HOSPITAL_SUPER_ADMIN', 'SUPERADMIN']), User.is_active == True).count()

    total_hospital_admins = User.query.filter(User.role.in_(['ADMIN', 'HOSPITAL_ADMIN'])).count()
    pending_admin_applications = User.query.filter(
        User.role.in_(['ADMIN', 'HOSPITAL_ADMIN']),
        User.approval_status == 'PENDING_APPROVAL'
    ).count()

    total_doctors = Doctor.query.count()
    total_receptionists = User.query.filter_by(role='RECEPTIONIST').count()
    total_patients = User.query.filter(User.role.in_(['USER', 'PATIENT'])).count()
    total_appointments = Appointment.query.count()

    # Hospitals without an active Primary Hospital Admin
    hospitals_without_primary = Hospital.query.filter(
        (Hospital.primary_admin_id.is_(None)) | (Hospital.primary_admin_id == 0)
    ).count()

    # Platform Activity (last 10 global actions)
    recent_logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(12).all()
    recent_activities = [log.to_dict() for log in recent_logs]

    return jsonify({
        'success': True,
        'metrics': {
            'total_hospitals': total_hospitals,
            'verified_hospitals': verified_hospitals,
            'pending_hospitals': pending_hospitals,
            'suspended_hospitals': total_hospitals - (verified_hospitals + pending_hospitals),
            'total_superadmins': total_superadmins,
            'active_superadmins': active_superadmins,
            'total_hospital_admins': total_hospital_admins,
            'pending_admin_applications': pending_admin_applications,
            'total_doctors': total_doctors,
            'total_receptionists': total_receptionists,
            'total_patients': total_patients,
            'total_appointments': total_appointments,
            'hospitals_without_primary_admin': hospitals_without_primary
        },
        'recent_activities': recent_activities
    }), 200


# =============================================================================
# 2. SuperAdmin Oversight and Assignment Management (CRITICAL)
# =============================================================================
@owner_bp.route('/superadmins', methods=['GET'])
@platform_owner_required
def get_all_superadmins():
    """
    Lists every SuperAdmin across the platform with assigned hospitals,
    total administrators, doctors, appointments under them, and activity status.
    """
    superadmins = User.query.filter(
        User.role.in_(['HOSPITAL_SUPER_ADMIN', 'SUPERADMIN'])
    ).order_by(User.created_at.desc()).all()

    result = []
    for sa in superadmins:
        # Resolve active assigned hospitals from SuperadminHospitalAssignment
        assignments = SuperadminHospitalAssignment.query.filter_by(
            superadmin_id=sa.id,
            status='Active'
        ).all()

        assigned_hospital_ids = [a.hospital_id for a in assignments if a.hospital_id]
        if not assigned_hospital_ids and sa.hospital_id:
            assigned_hospital_ids = [sa.hospital_id]

        assigned_hospitals = []
        if assigned_hospital_ids:
            hosps = Hospital.query.filter(Hospital.id.in_(assigned_hospital_ids)).all()
            assigned_hospitals = [{
                'id': h.id,
                'name': h.name,
                'city': h.city,
                'state': h.state,
                'image': h.image,
                'primary_admin_id': h.primary_admin_id,
                'primary_admin_name': h.primary_admin.name if h.primary_admin else None
            } for h in hosps]

        # Calculate subordinate counts under assigned hospitals
        total_admins = 0
        total_docs = 0
        total_apps = 0
        if assigned_hospital_ids:
            total_admins = User.query.filter(
                User.hospital_id.in_(assigned_hospital_ids),
                User.role.in_(['ADMIN', 'HOSPITAL_ADMIN'])
            ).count()
            total_docs = Doctor.query.filter(Doctor.hospital_id.in_(assigned_hospital_ids)).count()
            total_apps = Appointment.query.filter(Appointment.hospital_id.in_(assigned_hospital_ids)).count()

        # Last logged activity
        last_log = AuditLog.query.filter_by(user_id=sa.id).order_by(AuditLog.created_at.desc()).first()

        item = sa.to_dict()
        item['assigned_hospitals'] = assigned_hospitals
        item['assigned_hospitals_count'] = len(assigned_hospitals)
        item['total_hospital_admins'] = total_admins
        item['total_doctors'] = total_docs
        item['total_appointments'] = total_apps
        item['last_activity'] = last_log.to_dict() if last_log else None

        result.append(item)

    return jsonify({
        'success': True,
        'count': len(result),
        'superadmins': result
    }), 200


@owner_bp.route('/superadmins/<int:user_id>', methods=['GET'])
@platform_owner_required
def get_superadmin_details(user_id):
    """
    Returns complete profile, assigned hospitals, and action audit trail for a SuperAdmin.
    """
    sa = db.session.get(User, user_id)
    if not sa or sa.role not in ('HOSPITAL_SUPER_ADMIN', 'SUPERADMIN'):
        return jsonify({'success': False, 'message': 'SuperAdmin account not found.'}), 404

    # Assigned hospitals
    assignments = SuperadminHospitalAssignment.query.filter_by(
        superadmin_id=sa.id
    ).order_by(SuperadminHospitalAssignment.assigned_at.desc()).all()

    assigned_list = [a.to_dict() for a in assignments]

    # Activity audit history performed by this SuperAdmin
    activities = AuditLog.query.filter_by(
        user_id=sa.id
    ).order_by(AuditLog.created_at.desc()).limit(50).all()

    return jsonify({
        'success': True,
        'superadmin': sa.to_dict(),
        'assignments': assigned_list,
        'activities': [act.to_dict() for act in activities]
    }), 200


@owner_bp.route('/superadmins', methods=['POST'])
@platform_owner_required
def create_superadmin():
    """
    Platform Owner creates a new SuperAdmin account and assigns initial hospitals.
    """
    caller = g.current_user
    data = request.get_json() or {}

    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = data.get('password') or ''
    hospital_ids = data.get('hospital_ids') or []

    if not name or not email or not password:
        return jsonify({'success': False, 'message': 'Name, email, and password are required.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email address already in use.'}), 409

    now_utc = datetime.now(timezone.utc)
    new_sa = User(
        name=name,
        email=email,
        phone=phone,
        role='HOSPITAL_SUPER_ADMIN',
        hospital_id=hospital_ids[0] if hospital_ids else None,
        is_active=True,
        approval_status='APPROVED',
        approved_by_id=caller.id,
        approved_at=now_utc
    )
    new_sa.set_password(password)

    db.session.add(new_sa)
    db.session.flush()

    # Create assignments for each specified hospital
    assigned_hospitals = []
    for h_id in hospital_ids:
        hosp = db.session.get(Hospital, h_id)
        if hosp:
            assignment = SuperadminHospitalAssignment(
                superadmin_id=new_sa.id,
                hospital_id=hosp.id,
                assigned_by_id=caller.id,
                status='Active',
                assigned_at=now_utc,
                notes='Assigned during SuperAdmin account creation'
            )
            db.session.add(assignment)
            assigned_hospitals.append(hosp.name)

    record_audit(
        caller.id,
        'CREATE_SUPERADMIN_ACCOUNT',
        'USER',
        new_sa.id,
        details={
            'superadmin_email': email,
            'assigned_hospitals': assigned_hospitals
        }
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'SuperAdmin account for {new_sa.name} created successfully!',
        'superadmin': new_sa.to_dict()
    }), 201


@owner_bp.route('/superadmins/<int:user_id>/assign-hospitals', methods=['POST'])
@platform_owner_required
def assign_hospitals_to_superadmin(user_id):
    """
    Assigns one or more hospitals to a SuperAdmin.
    """
    caller = g.current_user
    sa = db.session.get(User, user_id)
    if not sa or sa.role not in ('HOSPITAL_SUPER_ADMIN', 'SUPERADMIN'):
        return jsonify({'success': False, 'message': 'SuperAdmin not found.'}), 404

    data = request.get_json() or {}
    hospital_ids = data.get('hospital_ids') or []
    notes = data.get('notes', 'Administrative hospital assignment')

    if not hospital_ids:
        return jsonify({'success': False, 'message': 'Please provide at least one hospital ID to assign.'}), 400

    now_utc = datetime.now(timezone.utc)
    assigned_names = []

    for h_id in hospital_ids:
        hosp = db.session.get(Hospital, h_id)
        if not hosp:
            continue

        existing = SuperadminHospitalAssignment.query.filter_by(
            superadmin_id=sa.id,
            hospital_id=hosp.id,
            status='Active'
        ).first()

        if not existing:
            assignment = SuperadminHospitalAssignment(
                superadmin_id=sa.id,
                hospital_id=hosp.id,
                assigned_by_id=caller.id,
                status='Active',
                assigned_at=now_utc,
                notes=notes
            )
            db.session.add(assignment)
            assigned_names.append(hosp.name)

    # Synchronize primary hospital_id if null
    if not sa.hospital_id and hospital_ids:
        sa.hospital_id = hospital_ids[0]

    record_audit(
        caller.id,
        'ASSIGN_HOSPITALS_TO_SUPERADMIN',
        'USER',
        sa.id,
        details={
            'superadmin_email': sa.email,
            'newly_assigned': assigned_names
        }
    )

    db.session.commit()

    total_assigned = SuperadminHospitalAssignment.query.filter_by(
        superadmin_id=sa.id,
        status='Active'
    ).count()

    return jsonify({
        'success': True,
        'message': f'Successfully assigned {len(assigned_names)} hospital(s) to {sa.name}.',
        'assigned_hospitals': assigned_names,
        'newly_assigned_count': len(assigned_names),
        'total_assigned_count': total_assigned,
        'assigned_count': total_assigned
    }), 200


@owner_bp.route('/superadmins/<int:user_id>/remove-hospital', methods=['POST'])
@platform_owner_required
def remove_hospital_from_superadmin(user_id):
    """
    Removes a hospital assignment from a SuperAdmin.
    """
    caller = g.current_user
    sa = db.session.get(User, user_id)
    if not sa:
        return jsonify({'success': False, 'message': 'SuperAdmin not found.'}), 404

    data = request.get_json() or {}
    hospital_id = data.get('hospital_id')
    reason = (data.get('reason') or '').strip() or 'Platform Owner revoked assignment'

    if not hospital_id:
        return jsonify({'success': False, 'message': 'hospital_id is required.'}), 400

    hosp = db.session.get(Hospital, hospital_id)

    assignment = SuperadminHospitalAssignment.query.filter_by(
        superadmin_id=sa.id,
        hospital_id=hospital_id,
        status='Active'
    ).first()

    if assignment:
        assignment.status = 'Revoked'
        assignment.notes = f"Revoked by {caller.name}: {reason}"

    # If this was their primary hospital_id, clear or set to another assigned
    if sa.hospital_id == hospital_id:
        remaining = SuperadminHospitalAssignment.query.filter_by(
            superadmin_id=sa.id,
            status='Active'
        ).first()
        sa.hospital_id = remaining.hospital_id if remaining else None

    record_audit(
        caller.id,
        'REVOKE_HOSPITAL_FROM_SUPERADMIN',
        'USER',
        sa.id,
        hospital_id=hospital_id,
        details={
            'superadmin_email': sa.email,
            'hospital': hosp.name if hosp else hospital_id,
            'reason': reason
        }
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"Hospital assignment removed from {sa.name}."
    }), 200


@owner_bp.route('/superadmins/reassign-hospital', methods=['POST'])
@platform_owner_required
def reassign_hospital():
    """
    Reassigns a hospital from one SuperAdmin to another.
    """
    caller = g.current_user
    data = request.get_json() or {}

    hospital_id = data.get('hospital_id')
    from_superadmin_id = data.get('from_superadmin_id')
    to_superadmin_id = data.get('to_superadmin_id')
    reason = (data.get('reason') or '').strip() or 'Administrative hospital transfer'

    if not hospital_id or not to_superadmin_id:
        return jsonify({'success': False, 'message': 'hospital_id and to_superadmin_id are required.'}), 400

    hosp = db.session.get(Hospital, hospital_id)
    if not hosp:
        return jsonify({'success': False, 'message': 'Hospital not found.'}), 404

    to_sa = db.session.get(User, to_superadmin_id)
    if not to_sa or to_sa.role not in ('HOSPITAL_SUPER_ADMIN', 'SUPERADMIN'):
        return jsonify({'success': False, 'message': 'Target user is not an active SuperAdmin.'}), 400

    now_utc = datetime.now(timezone.utc)

    # 1. Revoke existing active assignments for this hospital
    if from_superadmin_id:
        from_assignments = SuperadminHospitalAssignment.query.filter_by(
            superadmin_id=from_superadmin_id,
            hospital_id=hospital_id,
            status='Active'
        ).all()
        for fa in from_assignments:
            fa.status = 'Transferred'
            fa.notes = f"Transferred to {to_sa.name}: {reason}"

    # 2. Create new assignment for to_sa
    new_assignment = SuperadminHospitalAssignment(
        superadmin_id=to_sa.id,
        hospital_id=hospital_id,
        assigned_by_id=caller.id,
        status='Active',
        assigned_at=now_utc,
        notes=f"Transferred by Platform Owner: {reason}"
    )
    db.session.add(new_assignment)

    record_audit(
        caller.id,
        'REASSIGN_HOSPITAL_SUPERADMIN',
        'HOSPITAL',
        hospital_id,
        hospital_id=hospital_id,
        details={
            'hospital_name': hosp.name,
            'from_superadmin_id': from_superadmin_id,
            'to_superadmin_id': to_sa.id,
            'to_superadmin_email': to_sa.email,
            'reason': reason
        }
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"Hospital '{hosp.name}' successfully reassigned to {to_sa.name}."
    }), 200


@owner_bp.route('/superadmins/<int:user_id>/status', methods=['POST'])
@platform_owner_required
def update_superadmin_status(user_id):
    """
    Suspends or reactivates a SuperAdmin account.
    """
    caller = g.current_user
    sa = db.session.get(User, user_id)
    if not sa or sa.role not in ('HOSPITAL_SUPER_ADMIN', 'SUPERADMIN'):
        return jsonify({'success': False, 'message': 'SuperAdmin account not found.'}), 404

    data = request.get_json() or {}
    is_active = bool(data.get('is_active', not sa.is_active))
    reason = (data.get('reason') or '').strip() or ('Reactivated by Platform Owner' if is_active else 'Suspended by Platform Owner')

    sa.is_active = is_active
    action = 'REACTIVATE_SUPERADMIN' if is_active else 'SUSPEND_SUPERADMIN'

    record_audit(
        caller.id,
        action,
        'USER',
        sa.id,
        details={'superadmin_email': sa.email, 'is_active': is_active, 'reason': reason}
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"SuperAdmin {sa.name} account has been {'reactivated' if is_active else 'suspended'}.",
        'superadmin': sa.to_dict()
    }), 200


# =============================================================================
# 3. Global Hospital Admin Directory & Oversight
# =============================================================================
@owner_bp.route('/hospital-admins', methods=['GET'])
@platform_owner_required
def get_all_hospital_admins():
    """
    Complete directory of ALL Hospital Admins across ALL hospitals in the platform.
    Includes filtering by hospital, status, approval status, and identifies hospitals
    without an active Primary Hospital Admin.
    """
    hospital_id = request.args.get('hospital_id')
    status = request.args.get('status')
    approval = request.args.get('approval_status')
    search = (request.args.get('search') or '').strip().lower()

    query = User.query.filter(User.role.in_(['ADMIN', 'HOSPITAL_ADMIN']))

    if hospital_id:
        try:
            query = query.filter(User.hospital_id == int(hospital_id))
        except ValueError:
            pass

    if status == 'active':
        query = query.filter(User.is_active == True)
    elif status == 'inactive':
        query = query.filter(User.is_active == False)

    if approval:
        query = query.filter(User.approval_status == approval.upper())

    if search:
        query = query.filter((User.name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")))

    admins = query.order_by(User.created_at.desc()).all()

    # Find which hospitals lack an active Primary Hospital Admin
    all_hospitals = Hospital.query.all()
    missing_primary_hospitals = []
    for h in all_hospitals:
        if not h.primary_admin_id:
            missing_primary_hospitals.append({
                'id': h.id,
                'name': h.name,
                'city': h.city,
                'state': h.state
            })

    result = []
    for a in admins:
        item = a.to_dict()
        notes = parse_notes(a.registration_notes)
        item['designation'] = notes.get('designation') or notes.get('department') or 'Hospital Administrator'
        item['hospital_city'] = a.hospital.city if a.hospital else ''
        item['hospital_state'] = a.hospital.state if a.hospital else ''
        item['is_primary'] = bool(a.hospital and a.hospital.primary_admin_id == a.id)
        result.append(item)

    return jsonify({
        'success': True,
        'count': len(result),
        'missing_primary_hospitals': missing_primary_hospitals,
        'hospitals_without_primary': missing_primary_hospitals,
        'missing_primary_count': len(missing_primary_hospitals),
        'hospital_admins': result,
        'admins': result
    }), 200


# =============================================================================
# 4. Global Audit Logs
# =============================================================================
@owner_bp.route('/audit-logs', methods=['GET'])
@platform_owner_required
def get_global_audit_logs():
    """
    Platform Owner-only global audit trail of all sensitive administrative actions.
    Immutable log record.
    """
    user_id = request.args.get('user_id')
    hospital_id = request.args.get('hospital_id')
    action = request.args.get('action')
    limit = int(request.args.get('limit', 100))

    query = AuditLog.query

    if user_id:
        query = query.filter(AuditLog.user_id == int(user_id))
    if hospital_id:
        query = query.filter(AuditLog.hospital_id == int(hospital_id))
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()

    return jsonify({
        'success': True,
        'count': len(logs),
        'logs': [l.to_dict() for l in logs]
    }), 200


# =============================================================================
# 5. Advanced Platform Analytics
# =============================================================================
@owner_bp.route('/analytics', methods=['GET'])
@platform_owner_required
def get_platform_analytics():
    """
    Executive platform performance comparisons and registration trends.
    """
    # Hospital breakdown by state
    hospitals = Hospital.query.all()
    state_breakdown = {}
    for h in hospitals:
        st = h.state or 'Telangana'
        state_breakdown[st] = state_breakdown.get(st, 0) + 1

    # SuperAdmin performance: hospitals count and total appointments per SuperAdmin
    superadmins = User.query.filter(User.role.in_(['HOSPITAL_SUPER_ADMIN', 'SUPERADMIN'])).all()
    sa_performance = []
    for sa in superadmins:
        assignments = SuperadminHospitalAssignment.query.filter_by(superadmin_id=sa.id, status='Active').all()
        h_ids = [a.hospital_id for a in assignments]
        app_count = Appointment.query.filter(Appointment.hospital_id.in_(h_ids)).count() if h_ids else 0
        doc_count = Doctor.query.filter(Doctor.hospital_id.in_(h_ids)).count() if h_ids else 0
        sa_performance.append({
            'id': sa.id,
            'name': sa.name,
            'email': sa.email,
            'assigned_hospitals_count': len(h_ids),
            'doctors_count': doc_count,
            'appointments_count': app_count
        })

    return jsonify({
        'success': True,
        'state_breakdown': state_breakdown,
        'superadmin_performance': sa_performance
    }), 200
