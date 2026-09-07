import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaStar, 
  FaMapMarkerAlt, 
  FaPhoneAlt, 
  FaUserMd, 
  FaAmbulance, 
  FaClock, 
  FaCheck,
  FaHospital
} from 'react-icons/fa';

export const HospitalCard = ({ hospital }) => {
  return (
    <div className="card card-lift" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Image */}
      <div style={{ position: 'relative', height: '200px', backgroundColor: 'var(--slate-100)', overflow: 'hidden' }}>
        <img 
          src={hospital.image || 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80'} 
          alt={hospital.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
        />

        {/* 24/7 Emergency Badge */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          backgroundColor: '#dc2626',
          color: 'white',
          fontSize: '0.72rem',
          fontWeight: 700,
          padding: '0.25rem 0.65rem',
          borderRadius: 'var(--radius-full)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)'
        }}>
          <FaAmbulance size={12} />
          <span>24/7 Emergency</span>
        </div>

        {/* Rating */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(4px)',
          color: 'white',
          fontSize: '0.8rem',
          fontWeight: 700,
          padding: '0.25rem 0.65rem',
          borderRadius: 'var(--radius-full)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem'
        }}>
          <FaStar color="#f59e0b" size={13} />
          <span>{hospital.rating || 4.8}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--slate-300)' }}>
            ({hospital.total_reviews || 100}+)
          </span>
        </div>
      </div>

      {/* Body Info */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '0.35rem' }}>
          <Link to={`/hospitals/${hospital.id}`} style={{ color: 'inherit' }}>
            {hospital.name}
          </Link>
        </h3>

        {/* Address */}
        <div className="flex items-center gap-2" style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '0.85rem' }}>
          <FaMapMarkerAlt size={13} color="var(--primary)" />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hospital.address}, {hospital.city}
          </span>
        </div>

        {/* Facilities Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
          {(hospital.facilities || []).slice(0, 3).map((facility, index) => (
            <span 
              key={index}
              style={{
                fontSize: '0.72rem',
                backgroundColor: 'var(--slate-100)',
                color: 'var(--slate-700)',
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <FaCheck size={9} color="var(--success)" />
              {facility}
            </span>
          ))}
          {(hospital.facilities?.length || 0) > 3 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--slate-400)', alignSelf: 'center' }}>
              +{hospital.facilities.length - 3} more
            </span>
          )}
        </div>

        {/* Doctor Count & Working hours */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '0.85rem',
          borderTop: '1px solid var(--slate-100)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          fontSize: '0.82rem',
          color: 'var(--slate-600)'
        }}>
          <div className="flex items-center gap-1" style={{ fontWeight: 600, color: 'var(--slate-800)' }}>
            <FaUserMd color="var(--primary)" size={13} />
            <span>{hospital.doctor_count || 0} Doctors Available</span>
          </div>
          <div className="flex items-center gap-1" style={{ color: 'var(--slate-500)' }}>
            <FaClock size={11} />
            <span>{hospital.working_hours || '24x7 Open'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.5rem' }}>
          <a 
            href={`tel:${hospital.emergency_number}`} 
            className="btn btn-sm"
            style={{ 
              backgroundColor: '#fee2e2', 
              color: '#b91c1c', 
              border: '1px solid #fca5a5',
              fontWeight: 700 
            }}
          >
            <FaPhoneAlt size={11} /> Emergency
          </a>
          <Link to={`/hospitals/${hospital.id}`} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
            View Hospital
          </Link>
        </div>
      </div>
    </div>
  );
};
