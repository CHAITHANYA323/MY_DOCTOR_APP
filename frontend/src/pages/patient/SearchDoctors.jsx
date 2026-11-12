import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaSearch,
  FaUserMd,
  FaHospital,
  FaStar,
  FaClock,
  FaCalendarCheck,
  FaTimes,
  FaSync,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaShieldAlt,
  FaCalendarAlt,
  FaStethoscope,
  FaUserCheck,
  FaInfoCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useLanguage } from '../../context/LanguageContext';
import { doctorService } from '../../services/doctorService';
import { hospitalService } from '../../services/hospitalService';
import { patientService } from '../../services/patientService';

export const SearchDoctors = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('');
  const [selectedHosp, setSelectedHosp] = useState('');
  const [sortBy, setSortBy] = useState('rating_desc');

  // Booking Modal States
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00 AM');
  const [reason, setReason] = useState('');
  const [booking, setBooking] = useState(false);

  // Doctor Details Modal State
  const [detailsDoctor, setDetailsDoctor] = useState(null);

  const timeSlots = [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM'
  ];

  const fetchFilters = useCallback(async () => {
    try {
      const [specRes, hospRes] = await Promise.all([
        doctorService.getSpecializations(),
        hospitalService.getHospitals({ limit: 50 })
      ]);
      if (specRes.success) setSpecializations(specRes.specializations || []);
      if (hospRes.success) setHospitals(hospRes.hospitals || []);
    } catch (err) {
      console.error('Error fetching doctor filter options:', err);
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim(),
        specialization: selectedSpec,
        hospital_id: selectedHosp,
        sort_by: sortBy,
        limit: 50
      };
      const res = await doctorService.getDoctors(params);
      if (res.success) {
        setDoctors(res.doctors || []);
      } else {
        toast.error(res.message || 'Failed to load doctors.');
      }
    } catch (err) {
      console.error('Error searching doctors:', err);
      toast.error(err.response?.data?.message || 'Error searching doctors.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedSpec, selectedHosp, sortBy]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoctors();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchDoctors]);

  const minDateStr = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  const handleOpenBooking = (doc) => {
    setBookingDoctor(doc);
    setAppointmentDate(minDateStr);
    setAppointmentTime('10:00 AM');
    setReason('');
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!bookingDoctor) return;
    if (!appointmentDate || !appointmentTime || !reason.trim()) {
      toast.error('Please specify appointment date, slot time, and consultation symptoms.');
      return;
    }

    try {
      setBooking(true);
      const payload = {
        doctor_id: bookingDoctor.id,
        hospital_id: bookingDoctor.hospital_id,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        reason: reason.trim()
      };

      const res = await patientService.bookAppointment(payload);
      if (res.success) {
        toast.success(t('patientPortal.bookingSuccess') || 'Appointment booked successfully!');
        setBookingDoctor(null);
        navigate('/patient/appointments');
      } else {
        toast.error(res.message || 'Booking failed. Please try an alternate slot.');
      }
    } catch (err) {
      console.error('Appointment booking error:', err);
      toast.error(err.response?.data?.message || 'Failed to book appointment.');
    } finally {
      setBooking(false);
    }
  };

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
            {t('patientPortal.findDoctorsTitle') || 'Find Verified Doctors & Specialists'}
          </h1>
          <p style={{ color: '#718096', fontSize: '0.88rem', margin: 0 }}>
            {t('patientPortal.findDoctorsSubtitle') || 'Consult experienced clinicians across leading hospitals in Andhra Pradesh and Telangana'} ({doctors.length} specialists)
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDoctors}
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
        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <FaSearch style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('patientPortal.searchDoctorsPlaceholder') || 'Search by doctor name, specialty, or condition...'}
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

        {/* Filter Dropdowns Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {/* Specialty Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Specialization
            </label>
            <select
              value={selectedSpec}
              onChange={(e) => setSelectedSpec(e.target.value)}
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
              <option value="">{t('patientPortal.allSpecialties') || 'All Specializations'}</option>
              {specializations.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Hospital Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Hospital Center
            </label>
            <select
              value={selectedHosp}
              onChange={(e) => setSelectedHosp(e.target.value)}
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
              <option value="">{t('patientPortal.allHospitals') || 'All 24 Network Hospitals'}</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>{h.name} ({h.city})</option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              {t('patientPortal.sortBy') || 'Sort By'}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
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
              <option value="rating_desc">{t('patientPortal.highestRated') || 'Highest Rated (4.9★)'}</option>
              <option value="experience_desc">{t('patientPortal.mostExperienced') || 'Most Experienced'}</option>
              <option value="fee_asc">Consultation Fee (Low to High)</option>
              <option value="name_asc">Doctor Name (A to Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Doctor Cards Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.25rem'
        }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: '240px', borderRadius: '16px', backgroundColor: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3.5rem 1.5rem',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(16, 42, 67, 0.03)'
        }}>
          <FaUserMd size={44} style={{ color: '#9FB3C8', margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#102A43', marginBottom: '0.4rem' }}>
            No Doctors Found
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#718096', maxWidth: '360px', margin: '0 auto 1.25rem auto' }}>
            Try broadening your search criteria or resetting filters.
          </p>
          <button
            type="button"
            onClick={() => { setSearch(''); setSelectedSpec(''); setSelectedHosp(''); setSortBy('rating_desc'); }}
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
          {doctors.map((doc) => (
            <div
              key={doc.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '1.5rem',
                boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                {/* Doctor Avatar & Basic Info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(22, 119, 200, 0.1)',
                    color: '#1677C8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.4rem',
                    flexShrink: 0,
                    overflow: 'hidden',
                    border: '2px solid rgba(22, 119, 200, 0.2)'
                  }}>
                    {doc.image ? (
                      <img src={doc.image} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      doc.name ? doc.name.replace(/^Dr\.\s*/i, '').charAt(0) : 'D'
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#102A43', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.name}
                      </h3>
                      <FaCheckCircle size={13} style={{ color: '#16A36A', flexShrink: 0 }} title="Verified Clinician" />
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#13B8A6', fontWeight: 700, marginBottom: '0.2rem' }}>
                      {doc.specialization_name || 'Medical Specialist'} &bull; <span style={{ color: '#718096' }}>{doc.qualification || 'MBBS, MD'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', color: '#64748b' }}>
                      <FaHospital size={11} style={{ color: '#1677C8' }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.hospital_name || 'Network Hospital'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Badges / Metrics Strip */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                  padding: '0.65rem',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  textAlign: 'center',
                  marginBottom: '0.85rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#718096', fontWeight: 700 }}>RATING</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#E9A23B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                      <FaStar size={10} />
                      <span>{doc.rating || 4.9}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#718096', fontWeight: 700 }}>EXPERIENCE</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#102A43' }}>
                      {doc.experience || 5}+ yrs
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#718096', fontWeight: 700 }}>FEE</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#16A36A' }}>
                      ₹{doc.consultation_fee || 500}
                    </div>
                  </div>
                </div>

                {/* Availability info */}
                <div style={{ fontSize: '0.76rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FaClock size={11} style={{ color: '#13B8A6' }} />
                  <span>{doc.available_days || 'Monday - Saturday'} &bull; {doc.available_time || '09:00 AM - 05:00 PM'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #F0F4F8'
              }}>
                <button
                  type="button"
                  onClick={() => setDetailsDoctor(doc)}
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
                  {t('patientPortal.doctorProfile') || 'View Profile'}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenBooking(doc)}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1677C8',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 2px 8px rgba(22, 119, 200, 0.25)'
                  }}
                >
                  <FaCalendarCheck size={11} />
                  <span>{t('patientPortal.bookConsultation') || 'Book Visit'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Doctor Profile Details Modal */}
      {detailsDoctor && (
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
            maxWidth: '540px',
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
                <FaUserMd size={20} style={{ color: '#1677C8' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#102A43', margin: 0 }}>
                  Doctor Professional Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsDoctor(null)}
                style={{ background: 'none', border: 'none', color: '#718096', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(22, 119, 200, 0.1)',
                  color: '#1677C8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.3rem'
                }}>
                  {detailsDoctor.name ? detailsDoctor.name.charAt(0) : 'D'}
                </div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#102A43', margin: 0 }}>
                    {detailsDoctor.name}
                  </h4>
                  <div style={{ color: '#13B8A6', fontWeight: 700, fontSize: '0.82rem' }}>
                    {detailsDoctor.specialization_name} &bull; {detailsDoctor.qualification}
                  </div>
                  <div style={{ color: '#718096', fontSize: '0.78rem' }}>
                    {detailsDoctor.hospital_name}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Clinical Council Registration</span>
                <strong style={{ color: '#102A43' }}>{detailsDoctor.registration_number || 'APMC/TSMC-Verified'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Experience</span>
                <span style={{ color: '#102A43', fontWeight: 600 }}>{detailsDoctor.experience || 5} Years Clinical Practice</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Consultation Fee</span>
                <strong style={{ color: '#16A36A' }}>₹{detailsDoctor.consultation_fee || 500}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Available Schedule</span>
                <span style={{ color: '#1677C8', fontWeight: 600 }}>{detailsDoctor.available_days || 'Monday - Saturday'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Languages Spoken</span>
                <span style={{ color: '#243447' }}>{detailsDoctor.languages || 'Telugu, English, Hindi'}</span>
              </div>

              {detailsDoctor.about && (
                <div style={{ padding: '0.85rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#718096', marginBottom: '0.25rem' }}>
                    ABOUT CLINICAL BACKGROUND
                  </div>
                  <div style={{ color: '#334155', lineHeight: 1.5 }}>{detailsDoctor.about}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setDetailsDoctor(null)}
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
              <button
                type="button"
                onClick={() => { const d = detailsDoctor; setDetailsDoctor(null); handleOpenBooking(d); }}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#1677C8',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Booking Modal */}
      {bookingDoctor && (
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
            maxWidth: '540px',
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
                <FaCalendarCheck size={18} style={{ color: '#1677C8' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#102A43', margin: 0 }}>
                  {t('patientPortal.bookConsultation') || 'Book Medical Consultation'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBookingDoctor(null)}
                style={{ background: 'none', border: 'none', color: '#718096', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Doctor Summary Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '0.85rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: 'rgba(22, 119, 200, 0.1)',
                color: '#1677C8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: 800
              }}>
                <FaUserMd />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#102A43' }}>
                  {bookingDoctor.name}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#13B8A6', fontWeight: 700 }}>
                  {bookingDoctor.specialization_name} &bull; {bookingDoctor.hospital_name}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#16A36A', fontWeight: 700 }}>
                  Fee: ₹{bookingDoctor.consultation_fee || 500}
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmBooking} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#102A43', marginBottom: '0.35rem' }}>
                  {t('patientPortal.selectDate') || 'Select Appointment Date'} *
                </label>
                <input
                  type="date"
                  min={minDateStr}
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    backgroundColor: '#FFFFFF',
                    color: '#243447',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#102A43', marginBottom: '0.35rem' }}>
                  {t('patientPortal.selectTime') || 'Select Time Slot'} *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '0.45rem' }}>
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setAppointmentTime(slot)}
                      style={{
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: appointmentTime === slot ? '2px solid #1677C8' : '1px solid #CBD5E1',
                        backgroundColor: appointmentTime === slot ? '#EFF6FF' : '#FFFFFF',
                        color: appointmentTime === slot ? '#1677C8' : '#475569',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#102A43', marginBottom: '0.35rem' }}>
                  {t('patientPortal.reasonForVisit') || 'Reason for Visit / Symptoms'} *
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('patientPortal.reasonPlaceholder') || 'Describe your symptoms, questions, or medical concerns...'}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    backgroundColor: '#FFFFFF',
                    color: '#243447',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setBookingDoctor(null)}
                  disabled={booking}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={booking}
                  style={{
                    padding: '0.65rem 1.4rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1677C8',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(22, 119, 200, 0.25)'
                  }}
                >
                  {booking && <FaSync size={12} className="animate-spin" />}
                  <span>{t('patientPortal.confirmBooking') || 'Confirm Booking'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
