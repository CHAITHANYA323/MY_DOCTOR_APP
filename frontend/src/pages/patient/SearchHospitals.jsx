import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FaHospital,
  FaSearch,
  FaPhoneAlt,
  FaClock,
  FaStar,
  FaUserMd,
  FaMapMarkerAlt,
  FaSync,
  FaAmbulance,
  FaCheckCircle,
  FaTimes,
  FaExternalLinkAlt,
  FaShieldAlt,
  FaFilter
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useLanguage } from '../../context/LanguageContext';
import { hospitalService } from '../../services/hospitalService';

export const SearchHospitals = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [hospitals, setHospitals] = useState([]);
  const [cities, setCities] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Details Modal
  const [selectedHospital, setSelectedHospital] = useState(null);

  const fetchHospitals = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim(),
        state: selectedState,
        city: selectedCity,
        limit: 50
      };
      const res = await hospitalService.getHospitals(params);
      if (res.success) {
        setHospitals(res.hospitals || []);
        if (Array.isArray(res.cities)) setCities(res.cities);
        if (Array.isArray(res.states)) setStates(res.states);
      } else {
        toast.error(res.message || 'Failed to load hospitals.');
      }
    } catch (err) {
      console.error('Error searching hospitals:', err);
      toast.error(err.response?.data?.message || 'Error searching hospitals.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedState, selectedCity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHospitals();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchHospitals]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            {t('patientPortal.hospitalsTitle') || 'Hospitals & Medical Centers'}
          </h1>
          <p style={{ color: '#718096', fontSize: '0.88rem', margin: 0 }}>
            {t('patientPortal.hospitalsSubtitle') || 'Explore premier healthcare institutions and emergency trauma centers across AP & Telangana'} ({hospitals.length} accredited facilities)
          </p>
        </div>

        <button
          type="button"
          onClick={fetchHospitals}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#334155',
            padding: '0.6rem 1.15rem',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer'
          }}
        >
          <FaSync size={12} className={loading ? 'animate-spin' : ''} />
          <span>{t('patientPortal.refresh') || 'Refresh'}</span>
        </button>
      </div>

      {/* Filter and Search Bar Card */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '1.35rem',
        boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* Search input */}
        <div style={{ position: 'relative' }}>
          <FaSearch style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('patientPortal.searchHospitalsPlaceholder') || 'Search hospitals by name, city, or facility...'}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.6rem',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#F8FAFC'
            }}
          />
        </div>

        {/* State and City Filters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}>
          {/* State Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              State (AP / Telangana)
            </label>
            <select
              value={selectedState}
              onChange={(e) => { setSelectedState(e.target.value); setSelectedCity(''); }}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.85rem',
                backgroundColor: '#FFFFFF',
                color: '#243447',
                outline: 'none'
              }}
            >
              <option value="">{t('patientPortal.allStates') || 'All States (Andhra Pradesh & Telangana)'}</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              City / Region
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.85rem',
                backgroundColor: '#FFFFFF',
                color: '#243447',
                outline: 'none'
              }}
            >
              <option value="">{t('patientPortal.allCities') || 'All Cities'}</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Hospital Cards Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '1.25rem'
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: '240px', borderRadius: '16px', backgroundColor: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : hospitals.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3.5rem 1.5rem',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(16, 42, 67, 0.03)'
        }}>
          <FaHospital size={44} style={{ color: '#9FB3C8', margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#102A43', marginBottom: '0.4rem' }}>
            No Hospitals Found
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#718096', maxWidth: '360px', margin: '0 auto 1.25rem auto' }}>
            Try resetting your search query or city selection.
          </p>
          <button
            type="button"
            onClick={() => { setSearch(''); setSelectedState(''); setSelectedCity(''); }}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#1677C8',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.35rem'
        }}>
          {hospitals.map((hosp) => (
            <div
              key={hosp.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '1.5rem',
                boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1.1rem',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                {/* Header: Name, City, Type */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(233, 162, 59, 0.12)',
                      color: '#E9A23B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      <FaHospital />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.15rem 0' }}>
                        {hosp.name}
                      </h3>
                      <div style={{ fontSize: '0.76rem', color: '#1677C8', fontWeight: 700 }}>
                        {hosp.hospital_type || 'Accredited Facility'} &bull; <span style={{ color: '#718096' }}>{hosp.city}, {hosp.state}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    color: '#B45309',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '999px',
                    flexShrink: 0
                  }}>
                    <FaStar size={10} style={{ color: '#E9A23B' }} />
                    <span>{hosp.rating || 4.8}</span>
                  </div>
                </div>

                {/* Address & Emergency Phone */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  padding: '0.75rem',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.8rem',
                  color: '#475569',
                  marginBottom: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                    <FaMapMarkerAlt size={12} style={{ color: '#1677C8', marginTop: '0.15rem', flexShrink: 0 }} />
                    <span style={{ color: '#243447', lineHeight: 1.4 }}>{hosp.address}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.35rem', borderTop: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FaPhoneAlt size={11} style={{ color: '#16A36A' }} />
                      <span style={{ fontWeight: 700, color: '#102A43' }}>{hosp.phone || hosp.emergency_number || '108'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#13B8A6', fontWeight: 700 }}>
                      <FaUserMd size={12} />
                      <span>{hosp.doctor_count || 0} Doctors</span>
                    </div>
                  </div>
                </div>

                {/* Facilities Tags */}
                {Array.isArray(hosp.facilities) && hosp.facilities.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {hosp.facilities.slice(0, 4).map((f, i) => (
                      <span
                        key={i}
                        style={{
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '6px'
                        }}
                      >
                        {f}
                      </span>
                    ))}
                    {hosp.facilities.length > 4 && (
                      <span style={{ fontSize: '0.68rem', color: '#718096', fontWeight: 600, padding: '0.15rem 0.2rem' }}>
                        +{hosp.facilities.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #F0F4F8'
              }}>
                <button
                  type="button"
                  onClick={() => setSelectedHospital(hosp)}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {t('patientPortal.viewHospitalDetails') || 'View Details'}
                </button>

                <Link
                  to={`/patient/doctors?hospital_id=${hosp.id}`}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1677C8',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 2px 8px rgba(22, 119, 200, 0.25)'
                  }}
                >
                  <FaUserMd size={11} />
                  <span>Doctors</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hospital Details Modal */}
      {selectedHospital && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(16, 42, 67, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <FaHospital size={20} style={{ color: '#E9A23B' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#102A43', margin: 0 }}>
                  Hospital Information
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHospital(null)}
                style={{ background: 'none', border: 'none', color: '#718096', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.86rem' }}>
              <div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.2rem 0' }}>
                  {selectedHospital.name}
                </h4>
                <div style={{ color: '#1677C8', fontWeight: 700, fontSize: '0.84rem' }}>
                  {selectedHospital.hospital_type} &bull; {selectedHospital.city}, {selectedHospital.state}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Address</span>
                <strong style={{ color: '#102A43', maxWidth: '300px', textAlign: 'right' }}>{selectedHospital.address}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Emergency Contact</span>
                <strong style={{ color: '#DC5252' }}>{selectedHospital.emergency_number || '108'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>General Phone</span>
                <span style={{ color: '#243447', fontWeight: 600 }}>{selectedHospital.phone || 'Available via Reception'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Working Hours</span>
                <span style={{ color: '#16A36A', fontWeight: 700 }}>{selectedHospital.working_hours || '24 Hours / 7 Days'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Accreditation Status</span>
                <span style={{ color: '#16A36A', fontWeight: 800 }}>Verified Network Hospital</span>
              </div>

              {Array.isArray(selectedHospital.facilities) && selectedHospital.facilities.length > 0 && (
                <div style={{ padding: '0.85rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#718096', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                    Available Medical Facilities & Departments
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {selectedHospital.facilities.map((fac, i) => (
                      <span key={i} style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', color: '#243447', fontSize: '0.74rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                        {fac}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setSelectedHospital(null)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <Link
                to={`/patient/doctors?hospital_id=${selectedHospital.id}`}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#1677C8',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <FaUserMd size={12} />
                <span>View Hospital Doctors</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
