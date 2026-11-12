import re
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from models import db, User, Doctor, Hospital, Invitation, AuditLog
from utils.auth_middleware import (
    jwt_required,
    roles_required,
    platform_owner_required,
    hospital_admin_required,
)
from utils.audit import record_audit
from utils.rate_limiter import (
    is_rate_limited,
    get_client_ip,
    check_failed_password_limit,
    record_failed_password,
    clear_failed_passwords,
    VERIFY_LIMIT,
    VERIFY_WINDOW,
    ACCEPT_LIMIT,
    ACCEPT_WINDOW,
)

invitations_bp = Blueprint('invitations', __name__, url_prefix='/api')

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text)


def _generate_crypto_token():
    """Generates a cryptographically secure random token and its SHA-256 hash."""
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    return raw_token, token_hash


def _hash_token(raw_token: str) -> str:
    """Hashes a raw token with SHA-256 for lookup."""
    return hashlib.sha256(raw_token.strip().encode('utf-8')).hexdigest()


# -------------------------------------------------------------------------
# 1. Platform Owner: Create Hospital & Invite Initial Super Admin
# -------------------------------------------------------------------------
@invitations_bp.route('/platform/hospitals', methods=['POST'])
@platform_owner_required
def create_hospital_with_admin():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    address = (data.get('address') or '').strip()
    city = (data.get('city') or '').strip()
    state = (data.get('state') or 'Andhra Pradesh').strip()
    emergency_number = (data.get('emergency_number') or '').strip()
    facilities = data.get('facilities', '')
    if isinstance(facilities, list):
        facilities = ', '.join(facilities)
    admin_email = (data.get('admin_email') or '').strip().lower()
    admin_name = (data.get('admin_name') or 'Hospital Super Administrator').strip()

    if not name or not address or not city or not emergency_number:
        return jsonify({'success': False, 'message': 'Name, address, city, and emergency number are required.'}), 400

    if not admin_email or not EMAIL_REGEX.match(admin_email):
        return jsonify({'success': False, 'message': 'A valid admin email address is required.'}), 400

    # Ensure no existing hospital conflict
    if Hospital.query.filter_by(name=name, city=city).first():
        return jsonify({'success': False, 'message': f"A hospital named '{name}' already exists in {city}."}), 409

    # SEC-02: Check whether target user already belongs to another hospital
    existing_user = User.query.filter_by(email=admin_email).first()
    if existing_user:
        if existing_user.role == 'PLATFORM_OWNER':
            return jsonify({'success': False, 'message': 'Platform Owner accounts cannot be targeted by staff invitations.'}), 403
        if existing_user.hospital_id is not None:
            return jsonify({
                'success': False,
                'message': f"Account is already assigned to another hospital (Hospital ID: {existing_user.hospital_id}). Cross-hospital staff transfer through invitations is not permitted."
            }), 403

    # Generate hospital slug
    slug = slugify(name)
    base_slug = slug
    counter = 1
    while Hospital.query.filter_by(slug=slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Create Hospital
    hospital = Hospital(
        name=name,
        slug=slug,
        image=data.get('image') or 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80',
        address=address,
        city=city,
        state=state,
        phone=data.get('phone') or emergency_number,
        email=data.get('email') or admin_email,
        emergency_number=emergency_number,
        facilities=facilities,
        working_hours=data.get('working_hours') or '24 Hours / 7 Days',
        rating=float(data.get('rating', 4.8)),
        total_reviews=int(data.get('total_reviews', 0))
    )
    db.session.add(hospital)
    db.session.flush()

    record_audit(
        user_id=g.current_user.id,
        action='HOSPITAL_CREATE',
        resource_type='HOSPITAL',
        resource_id=hospital.id,
        hospital_id=hospital.id,
        details={'name': hospital.name, 'city': hospital.city}
    )

    # Generate cryptographic invitation token
    raw_token, token_hash = _generate_crypto_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    invitation = Invitation(
        email=admin_email,
        role='HOSPITAL_SUPER_ADMIN',
        hospital_id=hospital.id,
        doctor_profile_id=None,
        token_hash=token_hash,
        invited_by_id=g.current_user.id,
        expires_at=expires_at
    )
    db.session.add(invitation)
    db.session.flush()

    record_audit(
        user_id=g.current_user.id,
        action='INVITATION_CREATE',
        resource_type='INVITATION',
        resource_id=invitation.id,
        hospital_id=hospital.id,
        details={'email': admin_email, 'role': 'HOSPITAL_SUPER_ADMIN', 'expires_at': expires_at.isoformat()}
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Hospital created and Super Admin invitation generated successfully.',
        'hospital': hospital.to_dict(),
        'invitation': {
            'id': invitation.id,
            'email': invitation.email,
            'role': invitation.role,
            'hospital_id': hospital.id,
            'hospital_name': hospital.name,
            'expires_at': invitation.expires_at.isoformat(),
            'token': raw_token,
            'invite_link': f"/invite/accept/{raw_token}"
        }
    }), 201


# -------------------------------------------------------------------------
# 2. Platform Owner: Invite Super Admin for Existing Hospital
# -------------------------------------------------------------------------
@invitations_bp.route('/platform/invitations', methods=['POST'])
@platform_owner_required
def platform_create_invitation():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    role = (data.get('role') or 'HOSPITAL_SUPER_ADMIN').strip()
    hospital_id = data.get('hospital_id')

    if not email or not EMAIL_REGEX.match(email):
        return jsonify({'success': False, 'message': 'A valid email address is required.'}), 400

    # Role escalation guard: Platform Owner cannot invite another Platform Owner
    if role == 'PLATFORM_OWNER':
        return jsonify({'success': False, 'message': 'Platform Owners cannot be created via invitation. Use the secure CLI tool.'}), 403

    if role != 'HOSPITAL_SUPER_ADMIN':
        return jsonify({'success': False, 'message': 'Platform invitations can only be issued for Hospital Super Admins.'}), 400

    if not hospital_id:
        return jsonify({'success': False, 'message': 'hospital_id is required.'}), 400

    hospital = db.session.get(Hospital, hospital_id)
    if not hospital:
        return jsonify({'success': False, 'message': 'Hospital not found.'}), 404

    # SEC-02: Check whether target user already belongs to another hospital
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        if existing_user.role == 'PLATFORM_OWNER':
            return jsonify({'success': False, 'message': 'Platform Owner accounts cannot be targeted by staff invitations.'}), 403
        if existing_user.hospital_id is not None and existing_user.hospital_id != hospital_id:
            return jsonify({
                'success': False,
                'message': f"Account is already assigned to another hospital (Hospital ID: {existing_user.hospital_id}). Cross-hospital staff transfer through invitations is not permitted."
            }), 403

    # Check for active unexpired invitation
    active_inv = Invitation.query.filter_by(email=email, hospital_id=hospital_id, used_at=None, revoked_at=None).first()
    if active_inv and not active_inv.is_expired():
        return jsonify({'success': False, 'message': 'An active invitation is already pending for this email at this hospital.'}), 409

    raw_token, token_hash = _generate_crypto_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    invitation = Invitation(
        email=email,
        role=role,
        hospital_id=hospital_id,
        doctor_profile_id=None,
        token_hash=token_hash,
        invited_by_id=g.current_user.id,
        expires_at=expires_at
    )
    db.session.add(invitation)
    db.session.flush()

    record_audit(
        user_id=g.current_user.id,
        action='INVITATION_CREATE',
        resource_type='INVITATION',
        resource_id=invitation.id,
        hospital_id=hospital_id,
        details={'email': email, 'role': role, 'expires_at': expires_at.isoformat()}
    )

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Super Admin invitation created successfully.',
        'invitation': {
            'id': invitation.id,
            'email': invitation.email,
            'role': invitation.role,
            'hospital_id': hospital.id,
            'hospital_name': hospital.name,
            'expires_at': invitation.expires_at.isoformat(),
            'token': raw_token,
            'invite_link': f"/invite/accept/{raw_token}"
        }
    }), 201


# -------------------------------------------------------------------------
# 3. Hospital Super Admin: Invite Staff (Doctor / Receptionist)
# -------------------------------------------------------------------------
@invitations_bp.route('/hospital/invitations', methods=['POST'])
@roles_required('HOSPITAL_SUPER_ADMIN')
def hospital_create_invitation():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    role = (data.get('role') or '').strip().upper()
    doctor_profile_id = data.get('doctor_profile_id')

    if not email or not EMAIL_REGEX.match(email):
        return jsonify({'success': False, 'message': 'A valid email address is required.'}), 400

    # Role escalation guard: Hospital Super Admins can only invite DOCTOR or RECEPTIONIST
    if role not in ('DOCTOR', 'RECEPTIONIST'):
        return jsonify({
            'success': False,
            'message': "Access denied. Hospital Super Admins can only invite Doctors or Receptionists. Target roles: DOCTOR, RECEPTIONIST."
        }), 403

    # Hospital ID spoofing guard: Always strictly bind to caller's hospital_id
    scoped_hospital_id = g.current_user.hospital_id
    if not scoped_hospital_id:
        return jsonify({'success': False, 'message': 'Current user is not assigned to a hospital.'}), 403

    # If payload provided a conflicting hospital_id, reject
    if 'hospital_id' in data and data['hospital_id'] != scoped_hospital_id:
        return jsonify({'success': False, 'message': 'Cannot create invitations for another hospital.'}), 403

    # SEC-02: Prevent cross-hospital staff reassignment / poaching
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        if existing_user.role == 'PLATFORM_OWNER':
            return jsonify({'success': False, 'message': 'Platform Owner accounts cannot be targeted by staff invitations.'}), 403
        if existing_user.hospital_id is not None and existing_user.hospital_id != scoped_hospital_id:
            return jsonify({
                'success': False,
                'message': f"Account is already assigned to another hospital (Hospital ID: {existing_user.hospital_id}). Cross-hospital staff transfer through invitations is not permitted."
            }), 403

    # SEC-03: Doctor profile linking verification (Mandatory for DOCTOR role)
    if role == 'DOCTOR':
        if not doctor_profile_id:
            return jsonify({'success': False, 'message': 'doctor_profile_id is required when inviting a Doctor.'}), 400

        doctor = db.session.get(Doctor, doctor_profile_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found.'}), 404

        # Cross-hospital doctor linking guard
        if doctor.hospital_id != scoped_hospital_id:
            return jsonify({'success': False, 'message': 'Cannot link a doctor profile belonging to another hospital.'}), 403

        # One-to-one doctor account mapping guard
        if doctor.user_id is not None:
            return jsonify({'success': False, 'message': 'Doctor profile is already linked to an active user account.'}), 409

        # Check if an active invitation is already pending for this doctor profile
        pending_doc_inv = Invitation.query.filter_by(
            doctor_profile_id=doctor.id,
            used_at=None,
            revoked_at=None
        ).first()
        if pending_doc_inv and not pending_doc_inv.is_expired():
            return jsonify({'success': False, 'message': 'An active invitation is already pending for this doctor profile.'}), 409

    # Check if an active invitation is already pending for this email at this hospital
    existing_inv = Invitation.query.filter_by(
        email=email,
        hospital_id=scoped_hospital_id,
        used_at=None,
        revoked_at=None
    ).first()
    if existing_inv and not existing_inv.is_expired():
        return jsonify({'success': False, 'message': 'An active invitation is already pending for this email.'}), 409

    raw_token, token_hash = _generate_crypto_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    invitation = Invitation(
        email=email,
        role=role,
        hospital_id=scoped_hospital_id,
        doctor_profile_id=doctor_profile_id if role == 'DOCTOR' else None,
        token_hash=token_hash,
        invited_by_id=g.current_user.id,
        expires_at=expires_at
    )
    db.session.add(invitation)
    db.session.flush()

    record_audit(
        user_id=g.current_user.id,
        action='INVITATION_CREATE',
        resource_type='INVITATION',
        resource_id=invitation.id,
        hospital_id=scoped_hospital_id,
        details={
            'email': email,
            'role': role,
            'doctor_profile_id': doctor_profile_id if role == 'DOCTOR' else None,
            'expires_at': expires_at.isoformat()
        }
    )

    db.session.commit()

    hospital = db.session.get(Hospital, scoped_hospital_id)
    return jsonify({
        'success': True,
        'message': 'Invitation created successfully.',
        'invitation': {
            'id': invitation.id,
            'email': invitation.email,
            'role': invitation.role,
            'hospital_id': scoped_hospital_id,
            'hospital_name': hospital.name if hospital else None,
            'doctor_profile_id': invitation.doctor_profile_id,
            'expires_at': invitation.expires_at.isoformat(),
            'token': raw_token,
            'invite_link': f"/invite/accept/{raw_token}"
        }
    }), 201


# -------------------------------------------------------------------------
# 4. List Invitations (Hospital Super Admin: scoped, Platform Owner: global)
# -------------------------------------------------------------------------
@invitations_bp.route('/hospital/invitations', methods=['GET'])
@roles_required('PLATFORM_OWNER', 'HOSPITAL_SUPER_ADMIN')
def list_invitations():
    user = g.current_user
    if user.role == 'PLATFORM_OWNER':
        invitations = Invitation.query.order_by(Invitation.created_at.desc()).all()
    else:
        invitations = Invitation.query.filter_by(hospital_id=user.hospital_id).order_by(Invitation.created_at.desc()).all()

    return jsonify({
        'success': True,
        'count': len(invitations),
        'invitations': [inv.to_dict() for inv in invitations]
    }), 200


# -------------------------------------------------------------------------
# 5. Revoke Invitation
# -------------------------------------------------------------------------
@invitations_bp.route('/hospital/invitations/<int:inv_id>/revoke', methods=['POST', 'DELETE'])
@roles_required('PLATFORM_OWNER', 'HOSPITAL_SUPER_ADMIN')
def revoke_invitation(inv_id):
    user = g.current_user
    invitation = db.session.get(Invitation, inv_id)
    if not invitation:
        return jsonify({'success': False, 'message': 'Invitation not found.'}), 404

    # Hospital scoping guard
    if user.role != 'PLATFORM_OWNER' and invitation.hospital_id != user.hospital_id:
        return jsonify({'success': False, 'message': 'Access denied. Cannot revoke an invitation belonging to another hospital.'}), 403

    if invitation.used_at is not None:
        return jsonify({'success': False, 'message': 'Cannot revoke an invitation that has already been accepted.'}), 400

    if invitation.revoked_at is not None:
        return jsonify({'success': False, 'message': 'Invitation is already revoked.'}), 400

    invitation.revoked_at = datetime.now(timezone.utc)
    record_audit(
        user_id=user.id,
        action='INVITATION_REVOKE',
        resource_type='INVITATION',
        resource_id=invitation.id,
        hospital_id=invitation.hospital_id,
        details={'email': invitation.email, 'role': invitation.role, 'revoked_at': invitation.revoked_at.isoformat()}
    )
    db.session.commit()

    return jsonify({'success': True, 'message': 'Invitation revoked successfully.'}), 200


# -------------------------------------------------------------------------
# 5b. Resend / Regenerate Invitation
# -------------------------------------------------------------------------
@invitations_bp.route('/hospital/invitations/<int:inv_id>/resend', methods=['POST'])
@roles_required('PLATFORM_OWNER', 'HOSPITAL_SUPER_ADMIN')
def resend_invitation(inv_id):
    user = g.current_user
    invitation = db.session.get(Invitation, inv_id)
    if not invitation:
        return jsonify({'success': False, 'message': 'Invitation not found.'}), 404

    # Hospital scoping guard
    if user.role != 'PLATFORM_OWNER' and invitation.hospital_id != user.hospital_id:
        return jsonify({'success': False, 'message': 'Access denied. Cannot resend an invitation belonging to another hospital.'}), 403

    if invitation.used_at is not None:
        return jsonify({'success': False, 'message': 'Cannot resend an invitation that has already been accepted.'}), 400

    raw_token, token_hash = _generate_crypto_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    invitation.token_hash = token_hash
    invitation.expires_at = expires_at
    invitation.revoked_at = None  # Clear revoked state if previously revoked

    record_audit(
        user_id=user.id,
        action='INVITATION_RESEND',
        resource_type='INVITATION',
        resource_id=invitation.id,
        hospital_id=invitation.hospital_id,
        details={'email': invitation.email, 'role': invitation.role, 'expires_at': expires_at.isoformat()}
    )
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Invitation resent successfully with new activation link.',
        'invitation': {
            'id': invitation.id,
            'email': invitation.email,
            'role': invitation.role,
            'hospital_id': invitation.hospital_id,
            'doctor_profile_id': invitation.doctor_profile_id,
            'expires_at': invitation.expires_at.isoformat(),
            'token': raw_token,
            'invite_link': f"/invite/accept/{raw_token}"
        }
    }), 200


# -------------------------------------------------------------------------
# 6. Public Invitation Verification (SEC-06: Rate Limited & Minimal Safe Metadata)
# -------------------------------------------------------------------------
@invitations_bp.route('/invitations/verify/<token>', methods=['GET'])
@invitations_bp.route('/invitations/<token>', methods=['GET'])
def verify_invitation(token):
    # SEC-06: Rate limit check on verification
    client_ip = get_client_ip()
    limited, retry_after = is_rate_limited(f"verify:{client_ip}", VERIFY_LIMIT, VERIFY_WINDOW)
    if limited:
        response = jsonify({'success': False, 'message': 'Too many verification attempts. Please try again later.'})
        response.status_code = 429
        response.headers['Retry-After'] = str(retry_after)
        return response

    if not token or len(token.strip()) < 10:
        return jsonify({'success': False, 'message': 'Invalid invitation token.'}), 400

    token_hash = _hash_token(token)
    invitation = Invitation.query.filter_by(token_hash=token_hash).first()

    if not invitation:
        return jsonify({'success': False, 'message': 'Invalid invitation token.'}), 400

    if invitation.revoked_at is not None:
        return jsonify({'success': False, 'message': 'This invitation has been revoked.'}), 400

    if invitation.used_at is not None:
        return jsonify({'success': False, 'message': 'This invitation has already been accepted.'}), 400

    if invitation.is_expired():
        record_audit(
            user_id=invitation.invited_by_id,
            action='INVITATION_EXPIRED_ATTEMPT',
            resource_type='INVITATION',
            resource_id=invitation.id,
            hospital_id=invitation.hospital_id,
            details={'email': invitation.email, 'role': invitation.role, 'client_ip': client_ip}
        )
        db.session.commit()
        return jsonify({'success': False, 'message': 'This invitation has expired.'}), 400

    # Minimal Safe Metadata response (Zero internal database keys or raw secrets)
    hospital_name = invitation.hospital.name if invitation.hospital else None
    doctor_name = invitation.doctor_profile.name if invitation.doctor_profile else None

    # Check whether an account already exists for this email
    existing_user = User.query.filter_by(email=invitation.email).first()

    return jsonify({
        'success': True,
        'invitation': {
            'email': invitation.email,
            'role': invitation.role,
            'hospital_name': hospital_name,
            'doctor_name': doctor_name,
            'expires_at': invitation.expires_at.isoformat(),
            'requires_password_verification': existing_user is not None
        }
    }), 200


# -------------------------------------------------------------------------
# 7. Public Invitation Acceptance & Account Setup
#    SEC-01: Database-Level Atomic Conditional Claiming in Single Transaction
#    SEC-02: Prevent Unauthorized Cross-Hospital Staff Transfers
#    SEC-03: Doctor Profile Enforced
#    SEC-04: Prevent Dual Doctor Profile Linking
#    SEC-06: Rate Limited
# -------------------------------------------------------------------------
@invitations_bp.route('/invitations/accept', methods=['POST'])
def accept_invitation():
    # SEC-06: Rate limit check on overall acceptance requests per IP
    client_ip = get_client_ip()
    limited, retry_after = is_rate_limited(f"accept:{client_ip}", ACCEPT_LIMIT, ACCEPT_WINDOW)
    if limited:
        response = jsonify({'success': False, 'message': 'Too many acceptance requests. Please try again later.'})
        response.status_code = 429
        response.headers['Retry-After'] = str(retry_after)
        return response

    data = request.get_json() or {}
    token = (data.get('token') or '').strip()

    if not token:
        return jsonify({'success': False, 'message': 'Invitation token is required.'}), 400

    token_hash = _hash_token(token)

    # 1. Initial lookup to validate token existence and read properties
    invitation = Invitation.query.filter_by(token_hash=token_hash).first()
    if not invitation:
        return jsonify({'success': False, 'message': 'Invalid invitation token.'}), 400

    if invitation.revoked_at is not None:
        return jsonify({'success': False, 'message': 'This invitation has been revoked.'}), 400

    if invitation.used_at is not None:
        return jsonify({'success': False, 'message': 'This invitation has already been accepted.'}), 400

    if invitation.is_expired():
        return jsonify({'success': False, 'message': 'This invitation has expired.'}), 400

    invited_email = invitation.email
    existing_user = User.query.filter_by(email=invited_email).first()

    # ---------------------------------------------------------------------
    # Validation A: Existing User Identity & Permission Guards
    # ---------------------------------------------------------------------
    if existing_user:
        # SEC-06: Check rate limit on repeated failed password verification attempts
        pwd_limited, pwd_retry = check_failed_password_limit(client_ip, invited_email)
        if pwd_limited:
            response = jsonify({
                'success': False,
                'message': 'Too many failed password attempts. Account temporarily locked from linking. Please try again later.'
            })
            response.status_code = 429
            response.headers['Retry-After'] = str(pwd_retry)
            return response

        current_password = data.get('current_password')
        if not current_password:
            return jsonify({
                'success': False,
                'message': 'An account with this email already exists. Please provide your current password to verify ownership and link your account.'
            }), 400

        if not existing_user.check_password(current_password):
            record_failed_password(client_ip, invited_email)
            return jsonify({'success': False, 'message': 'Current password is incorrect. Verification failed.'}), 401

        # Clear failed password counter upon success
        clear_failed_passwords(client_ip, invited_email)

        # Privilege guards
        if existing_user.role == 'PLATFORM_OWNER':
            return jsonify({'success': False, 'message': 'Platform Owner accounts cannot be modified through staff invitations.'}), 403

        # SEC-02: Prevent unauthorized cross-hospital staff transfers
        if existing_user.hospital_id is not None and existing_user.hospital_id != invitation.hospital_id:
            return jsonify({
                'success': False,
                'message': f"Account is already assigned to another hospital (Hospital ID: {existing_user.hospital_id}). Cross-hospital staff transfer through invitations is not permitted."
            }), 403

        if existing_user.role == 'HOSPITAL_SUPER_ADMIN' and invitation.role != 'HOSPITAL_SUPER_ADMIN':
            return jsonify({'success': False, 'message': 'Hospital Super Admin accounts cannot be demoted via staff invitations.'}), 403

        # SEC-04: Prevent dual doctor profile linking for existing user
        if invitation.role == 'DOCTOR':
            existing_linked_profile = Doctor.query.filter_by(user_id=existing_user.id).first()
            if existing_linked_profile and existing_linked_profile.id != invitation.doctor_profile_id:
                return jsonify({
                    'success': False,
                    'message': f"Account is already linked to doctor profile '{existing_linked_profile.name}'. An account can only be linked to one doctor profile."
                }), 409

    # ---------------------------------------------------------------------
    # Validation B: New User Input Validation
    # ---------------------------------------------------------------------
    else:
        name = (data.get('name') or '').strip()
        password = data.get('password') or ''
        confirm_password = data.get('confirm_password') or ''
        phone = (data.get('phone') or '').strip()

        if not name:
            return jsonify({'success': False, 'message': 'Full name is required.'}), 400

        if not password or len(password) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters long.'}), 400

        if password != confirm_password:
            return jsonify({'success': False, 'message': 'Passwords do not match.'}), 400

    # ---------------------------------------------------------------------
    # Validation C: Doctor Profile Linking Validation (SEC-03 & SEC-04)
    # ---------------------------------------------------------------------
    target_doctor = None
    if invitation.role == 'DOCTOR':
        if not invitation.doctor_profile_id:
            return jsonify({'success': False, 'message': 'Doctor invitation is missing required doctor profile link.'}), 400

        target_doctor = db.session.get(Doctor, invitation.doctor_profile_id)
        if not target_doctor:
            return jsonify({'success': False, 'message': 'Assigned doctor profile not found.'}), 404

        if target_doctor.hospital_id != invitation.hospital_id:
            return jsonify({'success': False, 'message': 'Doctor profile belongs to a different hospital.'}), 403

        if target_doctor.user_id is not None:
            if existing_user and target_doctor.user_id != existing_user.id:
                return jsonify({'success': False, 'message': 'Doctor profile is already linked to another account.'}), 409
            elif not existing_user:
                return jsonify({'success': False, 'message': 'Doctor profile is already linked to another account.'}), 409

    # ---------------------------------------------------------------------
    # SEC-01: Single-Transaction Atomic Claiming & Provisioning Engine
    # ---------------------------------------------------------------------
    try:
        now_utc = datetime.now(timezone.utc)

        # 1. Database-level atomic conditional update: Claim invitation token
        #    Ensures only ONE process or thread can successfully claim the token.
        claim_result = db.session.execute(
            text("""
                UPDATE invitations
                SET used_at = :now
                WHERE id = :inv_id
                  AND used_at IS NULL
                  AND revoked_at IS NULL
                  AND expires_at > :now
            """),
            {"inv_id": invitation.id, "now": now_utc}
        )

        if claim_result.rowcount == 0:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'This invitation has already been accepted, revoked, expired, or claimed by another request.'
            }), 400

        # 2. Within the same transaction: create or link account
        if existing_user:
            previous_role = existing_user.role
            existing_user.role = invitation.role
            existing_user.hospital_id = invitation.hospital_id
            existing_user.is_active = True
            existing_user.approval_status = 'APPROVED'
            existing_user.approved_by_id = invitation.invited_by_id
            existing_user.approved_at = now_utc
            existing_user.rejection_reason = None

            if data.get('name'):
                existing_user.name = data.get('name').strip()
            if data.get('phone'):
                existing_user.phone = data.get('phone').strip()

            new_password = data.get('new_password')
            if new_password:
                if len(new_password) < 6:
                    db.session.rollback()
                    return jsonify({'success': False, 'message': 'New password must be at least 6 characters long.'}), 400
                confirm_new = data.get('confirm_new_password')
                if confirm_new and confirm_new != new_password:
                    db.session.rollback()
                    return jsonify({'success': False, 'message': 'New passwords do not match.'}), 400
                existing_user.set_password(new_password)

            target_user = existing_user

            record_audit(
                user_id=target_user.id,
                action='ACCOUNT_LINKED',
                resource_type='USER',
                resource_id=target_user.id,
                hospital_id=invitation.hospital_id,
                details={'invitation_id': invitation.id, 'previous_role': previous_role, 'new_role': target_user.role}
            )

        else:
            target_user = User(
                name=name,
                email=invited_email,
                phone=phone or '+91 00000 00000',
                role=invitation.role,
                hospital_id=invitation.hospital_id,
                is_active=True,
                approval_status='APPROVED',
                approved_by_id=invitation.invited_by_id,
                approved_at=now_utc
            )
            target_user.set_password(password)
            db.session.add(target_user)
            db.session.flush()

        # 3. Within the same transaction: link doctor profile
        if target_doctor:
            target_doctor.user_id = target_user.id

        # 4. Within the same transaction: write audit record
        record_audit(
            user_id=target_user.id,
            action='INVITATION_ACCEPT',
            resource_type='USER',
            resource_id=target_user.id,
            hospital_id=invitation.hospital_id,
            details={
                'invitation_id': invitation.id,
                'email': target_user.email,
                'role': target_user.role,
                'linked_doctor_id': invitation.doctor_profile_id
            }
        )

        # 5. Commit all changes atomically: token consumption + user update + doctor link + audit
        #    If any failure occurs, rollback restores used_at to NULL!
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Account successfully activated! Please log in to your portal.',
            'user': target_user.to_dict()
        }), 201

    except IntegrityError as ie:
        db.session.rollback()
        err_str = str(ie)
        if 'doctors.user_id' in err_str:
            return jsonify({'success': False, 'message': 'Doctor profile is already linked to another account.'}), 409
        return jsonify({'success': False, 'message': 'Database integrity conflict. Operation rolled back.'}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error accepting invitation: {str(e)}'}), 500


# -------------------------------------------------------------------------
# 8. Platform Owner: Query Platform Audit Logs
# -------------------------------------------------------------------------
@invitations_bp.route('/platform/audit-logs', methods=['GET'])
@platform_owner_required
def get_platform_audit_logs():
    action = request.args.get('action')
    resource_type = request.args.get('resource_type')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))

    query = AuditLog.query

    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if resource_type:
        query = query.filter_by(resource_type=resource_type)

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'success': True,
        'count': total,
        'page': page,
        'logs': [log.to_dict() for log in logs]
    }), 200
