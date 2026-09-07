import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FaHospital, 
  FaMapMarkerAlt, 
  FaPhoneAlt, 
  FaEnvelope, 
  FaAmbulance, 
  FaClock, 
  FaCheckCircle, 
  FaUserMd, 
  FaStar,
  FaShieldAlt
} from 'react-icons/fa';
import { hospitalService } from '../services/hospitalService';
import { DoctorCard } from '../components/DoctorCard';
import { SkeletonGrid } from '../components/SkeletonLoader';

export const HospitalDetails = () => {
  const { id } = useParams();
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHospital = async () => {
      try {
        setLoading(true);
        const res = await hospitalService.getHospitalById(id);
        if (res.success) {
          setHospital(res.hospital);
        } else {
          setError(res.message || 'Hospital details not found.');
        }
      } catch (err) {
        setError('Failed to fetch hospital details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHospital();
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1.25rem' }}>
        <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-xl)', marginBottom: '2rem' }} />
        <SkeletonGrid count={3} />
      </div>
    );
  }

  if (error || !hospital) {
    return (
      <div className="container" style={{ padding: '5rem 1.25rem', textAlign: 'center' }}>
        <div className="empty-state">
          <FaHospital className="empty-state-icon" />
          <h2 className="empty-state-title">Hospital Not Found</h2>
          <p className="empty-state-desc">The hospital you requested is not listed in our database.</p>
          <Link to="/hospitals" className="btn btn-primary">Back to Hospitals</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem 0 4rem' }}>
      <div className="container">
        {/* Hospital Hero Banner */}
        <div className="card" style={{
          overflow: 'hidden',
          marginBottom: '2.5rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ position: 'relative', height: '340px', backgroundColor: 'var(--slate-900)' }}>
            <img 
              src={hospital.image} 
              alt={hospital.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} 
            />

            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.2) 80%, transparent 100%)',
              padding: '2rem',
              color: 'white'
            }}>
              <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem' }}>
                <span style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <FaAmbulance size={12} /> 24/7 Emergency Ward Active
                </span>

                <div className="flex items-center gap-1" style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: 700, marginLeft: '0.5rem' }}>
                  <FaStar size={14} />
                  <span style={{ color: 'white' }}>{hospital.rating}</span>
                  <span style={{ color: 'var(--slate-300)', fontSize: '0.8rem' }}>({hospital.total_reviews} reviews)</span>
                </div>
              </div>

              <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>
                {hospital.name}
              </h1>

              <div className="flex items-center gap-2" style={{ fontSize: '1rem', color: 'var(--slate-200)' }}>
                <FaMapMarkerAlt color="#38bdf8" />
                <span>{hospital.address}, {hospital.city}, {hospital.state}</span>
              </div>
            </div>
          </div>

          {/* Quick Contact Bar */}
          <div style={{
            padding: '1.25rem 2rem',
            backgroundColor: 'var(--white)',
            borderTop: '1px solid var(--slate-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
              <div className="flex items-center gap-2" style={{ fontSize: '0.92rem' }}>
                <FaClock color="var(--primary)" />
                <span style={{ color: 'var(--slate-600)' }}>Hours: <strong style={{ color: 'var(--slate-800)' }}>{hospital.working_hours}</strong></span>
              </div>
              <div className="flex items-center gap-2" style={{ fontSize: '0.92rem' }}>
                <FaEnvelope color="var(--primary)" />
                <span style={{ color: 'var(--slate-600)' }}>{hospital.email || 'care@hospital.com'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a 
                href={`tel:${hospital.emergency_number}`} 
                className="btn btn-emergency btn-sm"
              >
                <FaPhoneAlt /> Emergency: {hospital.emergency_number}
              </a>
              <a 
                href={`tel:${hospital.phone}`} 
                className="btn btn-secondary btn-sm"
              >
                <FaPhoneAlt /> Reception: {hospital.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Facilities & Overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '2.5rem',
          marginBottom: '3rem'
        }} className="hospital-details-layout">
          <div>
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--slate-900)' }}>
                Medical Facilities & Advanced Amenities
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem'
              }}>
                {(hospital.facilities || []).map((fac, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.85rem 1rem',
                      backgroundColor: 'var(--slate-50)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--slate-200)',
                      fontSize: '0.9rem',
                      color: 'var(--slate-800)',
                      fontWeight: 600
                    }}
                  >
                    <FaCheckCircle color="var(--success)" size={16} />
                    <span>{fac}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Emergency Support Card */}
          <div>
            <div className="card" style={{
              padding: '1.75rem',
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              color: 'white',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <FaAmbulance size={24} />
              </div>

              <h4 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                Emergency Ambulance & Trauma Care
              </h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--slate-300)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Need urgent patient transfer to {hospital.name}? Request an emergency ambulance now with trained paramedic team.
              </p>

              <Link 
                to="/emergency" 
                className="btn btn-emergency" 
                style={{ width: '100%', textDecoration: 'none', marginBottom: '0.75rem' }}
              >
                Request Ambulance Now
              </Link>
              <a 
                href={`tel:${hospital.emergency_number}`} 
                className="btn btn-secondary" 
                style={{ width: '100%', textDecoration: 'none', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }}
              >
                Direct Emergency Line
              </a>
            </div>
          </div>
        </div>

        {/* Affiliated Doctors Section */}
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                Doctors at {hospital.name} ({hospital.doctors?.length || 0})
              </h2>
              <p style={{ color: 'var(--slate-500)', fontSize: '0.95rem' }}>
                Book an appointment directly with hospital consultants
              </p>
            </div>
          </div>

          {(!hospital.doctors || hospital.doctors.length === 0) ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--slate-500)' }}>No doctors currently listed for this hospital.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.75rem'
            }}>
              {hospital.doctors.map((doc) => (
                <DoctorCard key={doc.id} doctor={doc} />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .hospital-details-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};
