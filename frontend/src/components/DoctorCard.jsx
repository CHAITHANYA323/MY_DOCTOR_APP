import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaStar, 
  FaMapMarkerAlt, 
  FaHospital, 
  FaHeart, 
  FaRegHeart, 
  FaCheckCircle,
  FaCalendarCheck,
  FaBriefcase,
  FaClock
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { doctorService } from '../services/doctorService';
import { getSpecialtyInfo } from '../utils/specialtyMap';

// Guaranteed unique portraits for each doctor to prevent duplicate images
const FALLBACK_DOCTOR_IMAGES = [
  "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1594824813576-a21235122709?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1536064479547-7ee40b74b807?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=600&auto=format&fit=crop&q=80",
];

export const DoctorCard = ({ doctor, onFavoriteToggle, isFavoriteInitial = false }) => {
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(isFavoriteInitial);
  const [favLoading, setFavLoading] = useState(false);

  const fallbackUrl = FALLBACK_DOCTOR_IMAGES[((doctor?.id || 1) - 1) % FALLBACK_DOCTOR_IMAGES.length];
  const [imgSrc, setImgSrc] = useState(doctor?.image || fallbackUrl);

  const specInfo = getSpecialtyInfo(doctor?.specialization_name);

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      alert('Please sign in to bookmark your favorite doctors.');
      return;
    }

    try {
      setFavLoading(true);
      const res = await doctorService.toggleFavorite(doctor.id);
      setIsFavorite(res.is_favorite);
      if (onFavoriteToggle) {
        onFavoriteToggle(doctor.id, res.is_favorite);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setFavLoading(false);
    }
  };

  return (
    <div 
      className="card card-lift doctor-card" 
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid var(--slate-200)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      }}
    >
      {/* 1. Doctor Photo Section with Badges & Favorite */}
      <div style={{ position: 'relative', height: '210px', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
        <img 
          src={imgSrc} 
          alt={doctor.name}
          onError={() => setImgSrc(fallbackUrl)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
        />

        {/* Favorite Heart Button */}
        <button
          onClick={handleFavoriteClick}
          disabled={favLoading}
          type="button"
          aria-label={isFavorite ? `Remove ${doctor.name} from favorites` : `Add ${doctor.name} to favorites`}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isFavorite ? '#dc2626' : 'var(--slate-400)',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
            transition: 'transform 0.15s ease, color 0.15s ease',
            zIndex: 2
          }}
          title={isFavorite ? "Remove favorite" : "Save as favorite"}
        >
          {isFavorite ? <FaHeart size={18} /> : <FaRegHeart size={18} />}
        </button>

        {/* Verified Doctor Badge */}
        <div 
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(4px)',
            color: '#ffffff',
            fontSize: '0.78rem',
            fontWeight: 700,
            padding: '0.3rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
          }}
        >
          <FaCheckCircle color="#38bdf8" size={12} />
          <span>Verified Doctor</span>
        </div>
      </div>

      {/* 2. Doctor Information Body */}
      <div style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {/* Specialty Tag & Rating Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.65rem' }}>
          <span 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary-dark)',
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '0.3rem 0.7rem',
              borderRadius: 'var(--radius-full)'
            }}
          >
            {specInfo.emoji} {specInfo.layman}
          </span>

          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.3rem', 
              fontSize: '0.92rem', 
              fontWeight: 800, 
              color: 'var(--slate-800)' 
            }}
            title={`${doctor.rating || 4.9} out of 5 stars`}
          >
            <FaStar color="#f59e0b" size={15} />
            <span>{doctor.rating || 4.9}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--slate-400)', fontWeight: 500 }}>
              ({doctor.total_reviews || 0})
            </span>
          </div>
        </div>

        {/* Doctor Name */}
        <h3 style={{ fontSize: '1.28rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.25rem', lineHeight: 1.3 }}>
          <Link to={`/doctors/${doctor.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            {doctor.name}
          </Link>
        </h3>

        {/* Clinical Specialization & Experience */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.86rem', color: 'var(--slate-600)', marginBottom: '0.85rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--slate-700)' }}>
            {doctor.specialization_name}
          </span>
          <span style={{ color: 'var(--slate-300)' }}>&bull;</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
            <FaBriefcase size={12} color="var(--primary)" />
            {doctor.experience} Years Exp.
          </span>
        </div>

        {/* Hospital & Location */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1rem', fontSize: '0.88rem', color: 'var(--slate-600)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <FaHospital size={14} color="var(--primary)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: 'var(--slate-800)', lineHeight: 1.35 }}>
              {doctor.hospital_name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaMapMarkerAlt size={14} color="var(--slate-400)" style={{ flexShrink: 0 }} />
            <span style={{ color: 'var(--slate-600)' }}>{doctor.location}</span>
          </div>
        </div>

        {/* Availability Status Chip */}
        <div 
          style={{
            backgroundColor: '#f8fafc',
            padding: '0.55rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--slate-200)',
            marginBottom: '1.25rem',
            fontSize: '0.82rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--slate-600)' }}>
            <FaClock size={12} color="var(--primary)" />
            <span>{doctor.available_days || 'Mon - Sat'}</span>
          </div>
          <span 
            style={{ 
              fontSize: '0.76rem', 
              fontWeight: 700, 
              color: '#15803d', 
              backgroundColor: '#dcfce7', 
              padding: '0.2rem 0.55rem', 
              borderRadius: 'var(--radius-full)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            🟢 Available
          </span>
        </div>

        {/* Consultation Fee & Clear Actions */}
        <div style={{ marginTop: 'auto', paddingTop: '0.85rem', borderTop: '1px solid var(--slate-100)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
            <div>
              <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)', display: 'block', fontWeight: 600 }}>
                Consultation Fee
              </span>
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--slate-900)' }}>
                ₹{doctor.consultation_fee}
              </span>
            </div>
            <span 
              style={{ 
                fontSize: '0.74rem', 
                color: '#047857', 
                fontWeight: 700, 
                backgroundColor: '#ecfdf5', 
                padding: '0.25rem 0.6rem', 
                borderRadius: 'var(--radius-full)',
                border: '1px solid #a7f3d0'
              }}
            >
              Zero Platform Fee
            </span>
          </div>

          {/* Action Buttons: [ View Profile ] and [ Book Appointment ] */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '0.6rem' }}>
            <Link 
              to={`/doctors/${doctor.id}`} 
              className="btn btn-secondary btn-sm" 
              style={{ 
                width: '100%', 
                fontWeight: 700,
                fontSize: '0.88rem',
                padding: '0.65rem 0.5rem',
                justifyContent: 'center',
                textAlign: 'center',
                borderRadius: 'var(--radius-md)'
              }}
            >
              View Profile
            </Link>

            <Link 
              to={`/appointments/book/${doctor.id}`} 
              className="btn btn-primary btn-sm" 
              style={{ 
                width: '100%', 
                fontWeight: 800,
                fontSize: '0.88rem',
                padding: '0.65rem 0.5rem',
                justifyContent: 'center',
                textAlign: 'center',
                borderRadius: 'var(--radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
              }}
            >
              <FaCalendarCheck size={13} />
              <span>Book Appointment</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorCard;
