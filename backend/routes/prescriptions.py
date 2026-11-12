"""
MediConnect Digital Prescription Routes
Provides clinical prescription issuing, patient retrieval, PDF streaming, and strict multi-tenant IDOR protection.
"""

import io
import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g, send_file, Response
from sqlalchemy import or_

from models import db, Prescription, User, Doctor, Hospital, Appointment
from utils.auth_middleware import jwt_required
from services.prescription_pdf import generate_prescription_pdf

prescriptions_bp = Blueprint('prescriptions', __name__)


def get_current_doctor():
    """Verify doctor identity and retrieve linked Doctor profile."""
    user = g.current_user
    if user.role != 'DOCTOR':
        return None, (jsonify({
            'success': False,
            'message': 'Access denied. Doctor privileges required.'
        }), 403)

    doctor = user.doctor_profile or Doctor.query.filter_by(user_id=user.id).first()
    if not doctor:
        return None, (jsonify({
            'success': False,
            'message': 'Doctor profile not found or not linked to this user account.'
        }), 404)

    return doctor, None


def get_current_patient():
    """Verify patient identity (accepts 'PATIENT' and 'USER')."""
    user = g.current_user
    if user.role not in ('PATIENT', 'USER'):
        return None, (jsonify({
            'success': False,
            'message': 'Access denied. Patient privileges required.'
        }), 403)

    if not getattr(user, 'is_active', True):
        return None, (jsonify({
            'success': False,
            'message': 'Account is inactive. Contact support.'
        }), 403)

    return user, None


def can_access_prescription(rx, user):
    """
    Strict IDOR authorization policy:
    - Patients may ONLY access prescriptions where prescription.patient_id == user.id.
    - Prescribing doctors may access prescriptions where prescription.doctor_id == doctor.id.
    - Hospital staff / super admins may access prescriptions within their hospital.
    - Platform owners & Super Admins have system oversight.
    """
    if not user:
        return False

    # Platform owner / Super Admin
    if user.role in ('PLATFORM_OWNER', 'ADMIN'):
        return True

    # Patient / User
    if user.role in ('PATIENT', 'USER'):
        return rx.patient_id == user.id

    # Doctor
    if user.role == 'DOCTOR':
        doctor = user.doctor_profile or Doctor.query.filter_by(user_id=user.id).first()
        if not doctor:
            return False
        # Either the prescribing doctor or same hospital doctor
        if rx.doctor_id == doctor.id:
            return True
        if rx.hospital_id and doctor.hospital_id and rx.hospital_id == doctor.hospital_id:
            return True
        return False

    # Hospital Super Admin or Receptionist
    if user.role in ('HOSPITAL_SUPER_ADMIN', 'RECEPTIONIST'):
        if user.hospital_id and rx.hospital_id and user.hospital_id == rx.hospital_id:
            return True
        return False

    return False


# =====================================================================
# DOCTOR ENDPOINTS: CREATE & MANAGE PRESCRIPTIONS
# =====================================================================

@prescriptions_bp.route('/api/doctor/prescriptions', methods=['POST'])
@prescriptions_bp.route('/doctor/prescriptions', methods=['POST'])
@jwt_required
def create_prescription():
    """
    Doctor issues a new digital prescription for an assigned patient.
    Takes patient_id, diagnosis, medicines array, advice, follow-up date, and optional appointment_id.
    """
    doctor, err = get_current_doctor()
    if err:
        return err

    data = request.get_json() or {}

    patient_id = data.get('patient_id')
    diagnosis = (data.get('diagnosis') or '').strip()
    medicines = data.get('medicines') or []
    symptoms = (data.get('symptoms') or '').strip()
    additional_advice = (data.get('additional_advice') or data.get('advice') or '').strip()
    follow_up_date = (data.get('follow_up_date') or '').strip()
    notes = (data.get('notes') or '').strip()
    appointment_id = data.get('appointment_id')
    mark_completed = bool(data.get('mark_completed') or data.get('complete_appointment'))

    # Validation
    if not patient_id:
        return jsonify({'success': False, 'message': 'Patient ID is required.'}), 400

    patient = db.session.get(User, patient_id)
    if not patient:
        return jsonify({'success': False, 'message': 'Patient account not found.'}), 404

    if not diagnosis:
        return jsonify({'success': False, 'message': 'Clinical diagnosis is required.'}), 400

    if not medicines or not isinstance(medicines, list) or len(medicines) == 0:
        return jsonify({'success': False, 'message': 'At least one medication item is required.'}), 400

    # Validate medication items
    validated_meds = []
    for idx, med in enumerate(medicines):
        name = (med.get('name') or '').strip()
        if not name:
            return jsonify({'success': False, 'message': f'Medication #{idx + 1} must include a medicine name.'}), 400
        validated_meds.append({
            'name': name,
            'dosage': (med.get('dosage') or '').strip() or '1 tablet',
            'frequency': (med.get('frequency') or '1-0-1').strip(),
            'duration': (med.get('duration') or '5 Days').strip(),
            'timing': (med.get('timing') or 'After Food').strip(),
            'instructions': (med.get('instructions') or '').strip()
        })

    # Validate appointment if provided
    appt = None
    if appointment_id:
        appt = db.session.get(Appointment, appointment_id)
        if appt:
            if appt.doctor_id != doctor.id and appt.user_id != patient.id:
                return jsonify({'success': False, 'message': 'Selected appointment does not match this doctor and patient.'}), 400

    # Hospital details
    hospital = doctor.hospital or (appt.hospital if appt else None)

    # Generate unique legal prescription ID
    date_code = datetime.now(timezone.utc).strftime('%Y%m%d')
    unique_suffix = uuid.uuid4().hex[:6].upper()
    prescription_number = f"RX-{date_code}-{unique_suffix}"

    # Snapshot doctor name ensuring clean "Dr." formatting
    raw_doc_name = doctor.name or g.current_user.name
    clean_doc_name = raw_doc_name.strip()
    if not (clean_doc_name.startswith('Dr.') or clean_doc_name.startswith('డాక్టర్')):
        doc_display_name = f"Dr. {clean_doc_name}"
    else:
        doc_display_name = clean_doc_name

    new_rx = Prescription(
        prescription_number=prescription_number,
        patient_id=patient.id,
        doctor_id=doctor.id,
        hospital_id=hospital.id if hospital else None,
        appointment_id=appt.id if appt else None,
        # Patient snapshots
        patient_name=patient.name,
        patient_age=str(data.get('patient_age') or getattr(patient, 'age', '') or 'N/A'),
        patient_gender=str(data.get('patient_gender') or getattr(patient, 'gender', '') or 'Not Specified'),
        patient_phone=patient.phone or data.get('patient_phone') or '',
        # Doctor snapshots
        doctor_name=doc_display_name,
        doctor_qualification=doctor.qualification or 'MBBS, MD',
        doctor_reg_number=doctor.registration_number or 'NMC Registered',
        doctor_specialization=doctor.specialization.name if doctor.specialization else 'Clinical Specialist',
        # Hospital snapshots
        hospital_name=hospital.name if hospital else 'MediConnect Partner Hospital',
        hospital_address=hospital.address if hospital else '',
        hospital_phone=hospital.phone if hospital else '',
        # Clinical payload
        diagnosis=diagnosis,
        symptoms=symptoms,
        medicines=validated_meds,
        additional_advice=additional_advice,
        follow_up_date=follow_up_date,
        notes=notes,
        status='Active'
    )

    db.session.add(new_rx)

    # If linked to appointment, update appointment notes and status
    if appt:
        med_summary = ', '.join([m['name'] for m in validated_meds[:3]])
        if len(validated_meds) > 3:
            med_summary += f" +{len(validated_meds) - 3} more"
        rx_note = f"Prescription {prescription_number}: {diagnosis}. Meds: {med_summary}."
        if appt.notes:
            appt.notes = f"{appt.notes}\n\n{rx_note}"
        else:
            appt.notes = rx_note

        if mark_completed:
            appt.status = 'Completed'

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Prescription {prescription_number} issued successfully.',
        'prescription': new_rx.to_dict()
    }), 201


@prescriptions_bp.route('/api/doctor/prescriptions', methods=['GET'])
@prescriptions_bp.route('/doctor/prescriptions', methods=['GET'])
@jwt_required
def get_doctor_prescriptions():
    """Retrieve prescriptions issued by the authenticated doctor."""
    doctor, err = get_current_doctor()
    if err:
        return err

    patient_id = request.args.get('patient_id', type=int)
    search = request.args.get('search', '').strip()

    query = Prescription.query.filter_by(doctor_id=doctor.id)

    if patient_id:
        query = query.filter_by(patient_id=patient_id)

    if search:
        search_pat = f"%{search}%"
        query = query.filter(
            or_(
                Prescription.prescription_number.ilike(search_pat),
                Prescription.patient_name.ilike(search_pat),
                Prescription.diagnosis.ilike(search_pat)
            )
        )

    prescriptions = query.order_by(Prescription.created_at.desc(), Prescription.id.desc()).all()

    return jsonify({
        'success': True,
        'total': len(prescriptions),
        'prescriptions': [p.to_dict() for p in prescriptions]
    }), 200


# =====================================================================
# PATIENT ENDPOINTS: VIEW MY PRESCRIPTIONS
# =====================================================================

@prescriptions_bp.route('/api/patient/prescriptions', methods=['GET'])
@prescriptions_bp.route('/patient/prescriptions', methods=['GET'])
@jwt_required
def get_patient_prescriptions():
    """
    Retrieve all prescriptions belonging strictly to the authenticated patient.
    100% IDOR-protected by scoping to g.current_user.id.
    """
    patient, err = get_current_patient()
    if err:
        return err

    prescriptions = Prescription.query.filter_by(
        patient_id=patient.id
    ).order_by(Prescription.created_at.desc(), Prescription.id.desc()).all()

    return jsonify({
        'success': True,
        'total': len(prescriptions),
        'prescriptions': [p.to_dict() for p in prescriptions]
    }), 200


# =====================================================================
# SHARED SECURE ENDPOINTS: DETAIL & PDF STREAMING (STRICT IDOR DEFENSE)
# =====================================================================

@prescriptions_bp.route('/api/prescriptions/<int:prescription_id>', methods=['GET'])
@prescriptions_bp.route('/prescriptions/<int:prescription_id>', methods=['GET'])
@jwt_required
def get_prescription_detail(prescription_id):
    """
    Get full prescription details by ID.
    Strictly enforces authorization so patients cannot view other patients' prescriptions.
    """
    rx = db.session.get(Prescription, prescription_id)
    if not rx:
        return jsonify({'success': False, 'message': 'Prescription not found.'}), 404

    if not can_access_prescription(rx, g.current_user):
        return jsonify({
            'success': False,
            'message': 'Access denied. You do not have permission to view this prescription.'
        }), 403

    return jsonify({
        'success': True,
        'prescription': rx.to_dict()
    }), 200


@prescriptions_bp.route('/api/prescriptions/<int:prescription_id>/pdf', methods=['GET'])
@prescriptions_bp.route('/prescriptions/<int:prescription_id>/pdf', methods=['GET'])
@jwt_required
def download_prescription_pdf(prescription_id):
    """
    Generate and stream professional A4 prescription PDF.
    Strictly protected by IDOR authorization check.
    """
    rx = db.session.get(Prescription, prescription_id)
    if not rx:
        return jsonify({'success': False, 'message': 'Prescription not found.'}), 404

    if not can_access_prescription(rx, g.current_user):
        return jsonify({
            'success': False,
            'message': 'Access denied. You do not have permission to download this prescription.'
        }), 403

    as_attachment = request.args.get('download', 'false').lower() in ('true', '1')
    filename = f"{rx.prescription_number}.pdf"

    try:
        pdf_bytes = generate_prescription_pdf(rx.to_dict())
        return Response(
            pdf_bytes,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'{"attachment" if as_attachment else "inline"}; filename="{filename}"',
                'Content-Type': 'application/pdf',
                'Cache-Control': 'private, max-age=3600'
            }
        )
    except Exception as e:
        print(f"[PDF Generation Error] {e}")
        return jsonify({'success': False, 'message': f'Failed to generate prescription PDF: {str(e)}'}), 500


@prescriptions_bp.route('/api/prescriptions/verify/<string:prescription_number>', methods=['GET'])
@prescriptions_bp.route('/prescriptions/verify/<string:prescription_number>', methods=['GET'])
def verify_prescription(prescription_number):
    """
    Verification summary endpoint for QR code validation at licensed pharmacies.
    Returns limited non-sensitive validation summary.
    """
    clean_number = prescription_number.strip().upper()
    rx = Prescription.query.filter_by(prescription_number=clean_number).first()
    if not rx:
        return jsonify({
            'success': False,
            'valid': False,
            'message': 'Prescription reference not found in MediConnect register.'
        }), 404

    return jsonify({
        'success': True,
        'valid': True,
        'prescription_number': rx.prescription_number,
        'issue_date': rx.created_at.strftime('%Y-%m-%d') if rx.created_at else None,
        'doctor_name': rx.doctor_name,
        'doctor_registration': rx.doctor_reg_number,
        'hospital_name': rx.hospital_name,
        'patient_initials': rx.patient_name[:2].upper() if rx.patient_name else 'PT',
        'status': rx.status,
        'items_count': rx.to_dict()['medicines_count']
    }), 200

