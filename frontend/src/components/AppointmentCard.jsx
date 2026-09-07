import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaCalendarAlt, 
  FaClock, 
  FaHospital, 
  FaUserMd, 
  FaTimesCircle, 
  FaCheckCircle, 
  FaHourglassHalf, 
  FaBan,
  FaFileAlt
} from 'react-icons/fa';

export const AppointmentCard = ({ appointment, onCancel, isAdmin = false, onStatusChange }) => {
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return (
          <span className="badge badge-confirmed">
            <FaCheckCircle size={11} /> Confirmed
          </span>
        );
      case 'completed':
        return (
          <span className="badge badge-completed">
            <FaCheckCircle size={11} /> Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="badge badge-cancelled">
            <FaBan size={11} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="badge badge-pending">
            <FaHourglassHalf size={11} /> Pending Confirmation
          </span>
        );
    }
  };

  const isCancellable = appointment.status === 'Pending' || appointment.status === 'Confirmed';

  return (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Top Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.85rem' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '0.82rem', color: 'var(--slate-500)', fontWeight: 600 }}>
            Appointment #{appointment.id}
          </span>
          <span style={{ color: 'var(--slate-300)' }}>&bull;</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
            Booked on {appointment.created_at ? new Date(appointment.created_at).toLocaleDateString() : 'Recent'}
          </span>
        </div>
        <div>
          {getStatusBadge(appointment.status)}
        </div>
      </div>

      {/* Doctor & Hospital Row */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <img 
          src={appointment.doctor_image || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80'} 
          alt={appointment.doctor_name}
          style={{ width: 60, height: 60, borderRadius: '12px', objectFit: 'cover', border: '2px solid var(--primary-light)' }} 
        />
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '0.2rem' }}>
            <Link to={`/doctors/${appointment.doctor_id}`} style={{ color: 'inherit' }}>
              {appointment.doctor_name}
            </Link>
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.35rem' }}>
            {appointment.specialization || 'Medical Specialist'}
          </p>
          <div className="flex items-center gap-1" style={{ fontSize: '0.82rem', color: 'var(--slate-600)' }}>
            <FaHospital size={12} color="var(--slate-400)" />
            <span>{appointment.hospital_name}</span>
          </div>
        </div>

        {/* Date & Time Highlight Box */}
        <div style={{
          backgroundColor: 'var(--primary-ultralight)',
          border: '1px solid var(--primary-light)',
          padding: '0.65rem 1rem',
          borderRadius: 'var(--radius-md)',
          textAlign: 'right',
          alignSelf: 'center'
        }}>
          <div className="flex items-center gap-1 justify-end" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
            <FaCalendarAlt size={13} />
            <span>{appointment.appointment_date}</span>
          </div>
          <div className="flex items-center gap-1 justify-end" style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginTop: '0.2rem' }}>
            <FaClock size={11} />
            <span>{appointment.appointment_time}</span>
          </div>
        </div>
      </div>

      {/* Reason for visit & Patient details if admin */}
      <div style={{
        backgroundColor: 'var(--slate-50)',
        padding: '0.85rem 1rem',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.88rem',
        border: '1px solid var(--slate-100)'
      }}>
        <strong style={{ color: 'var(--slate-700)' }}>Reason for Visit: </strong>
        <span style={{ color: 'var(--slate-600)' }}>{appointment.reason}</span>
        {appointment.notes && (
          <div style={{ marginTop: '0.4rem', color: 'var(--primary-dark)', fontSize: '0.82rem' }}>
            <strong>Clinic Note: </strong> {appointment.notes}
          </div>
        )}
        {isAdmin && (
          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--slate-200)', fontSize: '0.82rem' }}>
            <strong>Patient Info: </strong> {appointment.patient_name} ({appointment.patient_phone || appointment.patient_email})
          </div>
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="flex items-center justify-between" style={{ marginTop: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.88rem', color: 'var(--slate-600)' }}>
          Consultation Fee: <strong style={{ color: 'var(--slate-900)' }}>₹{appointment.consultation_fee}</strong>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <select 
                value={appointment.status}
                onChange={(e) => onStatusChange && onStatusChange(appointment.id, e.target.value)}
                className="form-select"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem', width: 'auto' }}
              >
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          ) : (
            <>
              {isCancellable && onCancel && (
                <button 
                  onClick={() => onCancel(appointment)}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: 'var(--emergency-light)',
                    color: 'var(--emergency)',
                    border: '1px solid var(--emergency-border)',
                    fontWeight: 600
                  }}
                >
                  <FaTimesCircle /> Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
