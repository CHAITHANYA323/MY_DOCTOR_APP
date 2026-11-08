import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaHospital,
  FaSearch,
  FaPhoneAlt,
  FaClock,
  FaStar,
  FaUserMd,
  FaMapMarkerAlt,
  FaSync
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { hospitalService } from '../../services/hospitalService';

export const SearchHospitals = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const fetchHospitals = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim(),
        city: selectedCity,
        limit: 50
      };
      const res = await hospitalService.getHospitals(params);
      if (res.success) {
        setHospitals(res.hospitals || []);
      } else {
        toast.error(res.message || 'Failed to load hospitals.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error searching hospitals.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHospitals();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchHospitals]);

  const uniqueCities = Array.from(new Set(hospitals.map(h => h.city).filter(Boolean)));

  return (
    <div>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>
            Hospital Facilities & Medical Centers
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Explore verified network hospitals, emergency trauma units, and clinical departments ({hospitals.length} facilities)
          </p>
        </div>

        <button
          onClick={fetchHospitals}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <FaSync size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        marginBottom: '1.75rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1rem'
      }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <FaSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by hospital name or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem 0.65rem 2.25rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.875rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* City Filter */}
        <div>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.875rem',
              background: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="">All Cities</option>
            {uniqueCities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Hospitals Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
          <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', margin: '0 auto 1rem auto' }} />
          <p>Loading hospital facilities...</p>
        </div>
      ) : hospitals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <FaHospital size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>No Hospitals Found</h3>
          <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
            No facilities match your search query. Try broadening your criteria.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1.5rem'
        }}>
          {hospitals.map((hosp) => (
            <div
              key={hosp.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                {/* Image Header */}
                <div style={{ height: '160px', width: '100%', background: '#e2e8f0', position: 'relative', overflow: 'hidden' }}>
                  {hosp.image ? (
                    <img src={hosp.image} alt={hosp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e0f2fe', color: '#0284c7' }}>
                      <FaHospital size={48} />
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <FaStar size={11} style={{ color: '#f59e0b' }} /> {hosp.rating || 4.8}
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
                    {hosp.name}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    <FaMapMarkerAlt size={13} style={{ color: '#0284c7', marginTop: '2px', flexShrink: 0 }} />
                    <span>{hosp.address}, {hosp.city}, {hosp.state}</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '0.2rem 0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FaClock size={10} /> 24/7 Emergency
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.2rem 0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FaUserMd size={10} /> {hosp.doctors ? hosp.doctors.length : 'Multiple'} Doctors
                    </span>
                  </div>

                  {/* Facilities */}
                  {hosp.facilities && (
                    <div style={{ fontSize: '0.78rem', color: '#64748b', background: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: '8px' }}>
                      <strong>Facilities:</strong> {hosp.facilities}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <a
                  href={`tel:${hosp.emergency_number || '108'}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#dc2626',
                    textDecoration: 'none'
                  }}
                >
                  <FaPhoneAlt size={11} /> {hosp.emergency_number || '108'}
                </a>

                <button
                  onClick={() => navigate(`/patient/doctors`)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#0284c7',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  View Specialists
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
