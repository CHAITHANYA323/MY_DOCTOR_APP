import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUsers,
  FaSearch,
  FaUser,
  FaPhoneAlt,
  FaEnvelope,
  FaCalendarAlt,
  FaUserPlus,
  FaHospital,
  FaTimes,
  FaEye,
  FaCalendarPlus,
  FaClock,
  FaCheckCircle,
  FaArrowLeft
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { receptionService } from '../../services/receptionService';
import { getApiErrorMessage } from '../../services/api';

export const PatientSearch = () => {
  const { hospitalName } = useAuth();
  const { t, isTelugu } = useLanguage();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Patient detail modal
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [patientDetail, setPatientDetail] = useState(null);
  const [detailError, setDetailError] = useState('');

  const fetchPatients = useCallback(async (query = '') => {
    try {
      setLoading(true);
      setError('');
      const res = await receptionService.getPatients({ search: query, page, limit: 25 });
      if (res && res.success) {
        setPatients(res.patients || []);
        setTotal(res.total || 0);
      } else {
        setPatients([]);
      }
    } catch (err) {
      console.error('Failed to load patient directory:', err);
      setError(getApiErrorMessage(err, isTelugu ? 'రోగుల వివరాలు లోడ్ చేయడం సాధ్యం కాలేదు.' : 'Unable to load patient records.'));
    } finally {
      setLoading(false);
    }
  }, [page, isTelugu]);

  useEffect(() => {
    fetchPatients(searchTerm);
  }, [fetchPatients, searchTerm]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPatients(searchTerm);
  };

  const handleOpenDetail = async (patientId) => {
    setSelectedPatientId(patientId);
    setDetailLoading(true);
    setDetailError('');
    setPatientDetail(null);

    try {
      const res = await receptionService.getPatientById(patientId);
      if (res && res.success) {
        setPatientDetail(res.patient);
      } else {
        setDetailError(res.message || (isTelugu ? 'రోగి ప్రొఫైల్ వివరాలు పొందడం సాధ్యం కాలేదు.' : 'Unable to retrieve patient profile.'));
      }
    } catch (err) {
      console.error('Failed to fetch patient detail:', err);
      setDetailError(getApiErrorMessage(err, isTelugu ? 'ఈ ఆసుపత్రిలో రోగి రికార్డు కనుగొనబడలేదు.' : 'Access denied or patient record not found at this facility.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBookForPatient = (patient) => {
    navigate('/admin/appointments', {
      state: { preselectedPatient: patient }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Page Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '1.25rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {t('receptionPortal.patientListTitle')}
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#ccfbf1',
              color: '#0f766e'
            }}>
              <FaHospital size={11} /> {hospitalName || (isTelugu ? 'విశ్వసనీయ ఆసుపత్రి' : 'Hospital Facility')}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            {t('receptionPortal.patientListSubtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/admin/register-patient')}
          style={{
            padding: '0.65rem 1.15rem',
            borderRadius: '8px',
            border: 'none',
            background: '#0f766e',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <FaUserPlus size={13} /> {t('receptionPortal.registerNewPatient')}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '0.9rem 1.25rem',
          borderRadius: '8px',
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#991b1b',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* 2. Search Toolbar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '420px' }}>
          <FaSearch style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8'
          }} />
          <input
            type="text"
            placeholder={t('receptionPortal.searchPatientsPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem 0.6rem 2.4rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none',
              background: '#ffffff'
            }}
          />
        </form>

        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
          {isTelugu ? `మొత్తం రోగులు: ${total}` : `Total Patients: ${total}`}
        </div>
      </div>

      {/* 3. Patients Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <FaClock size={28} style={{ animation: 'spin 1s linear infinite', color: '#0f766e', marginBottom: '0.5rem' }} />
            <div>{isTelugu ? 'రోగుల వివరాలు లోడ్ అవుతున్నాయి...' : 'Loading patient records...'}</div>
          </div>
        ) : patients.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
            <FaUsers size={36} style={{ color: '#cbd5e1', marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#334155' }}>
              {t('receptionPortal.noPatientsTitle')}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              {t('receptionPortal.noPatientsDesc')}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>{t('receptionPortal.colPatientId')}</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>{t('receptionPortal.colPatient')}</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>{t('receptionPortal.colRegistrationDate')}</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>{t('receptionPortal.colVisitsCount')}</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>{t('receptionPortal.colLastVisit')}</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>{t('receptionPortal.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Patient ID */}
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      <strong style={{ color: '#0f766e' }}>#{p.id}</strong>
                    </td>

                    {/* Patient Name & Contact */}
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                        <FaPhoneAlt size={10} style={{ color: '#94a3b8' }} />
                        {p.phone || (isTelugu ? 'ఫోన్ లేదు' : 'No phone')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                        {p.email}
                      </div>
                    </td>

                    {/* Registration Date */}
                    <td style={{ padding: '0.95rem 1.25rem', color: '#475569', fontSize: '0.8125rem' }}>
                      {p.created_at ? p.created_at.split('T')[0] : 'N/A'}
                    </td>

                    {/* Visits Count */}
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      <span style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: '#ccfbf1',
                        color: '#0f766e'
                      }}>
                        {p.visits_at_hospital || 0} {isTelugu ? 'సందర్శనలు' : 'visits'}
                      </span>
                    </td>

                    {/* Last Visit Date */}
                    <td style={{ padding: '0.95rem 1.25rem', color: '#64748b', fontSize: '0.8125rem' }}>
                      {p.last_visit_date ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.last_visit_date}</div>
                          {p.last_doctor_name && (
                            <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                              Dr. {p.last_doctor_name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>{isTelugu ? 'ఇంకా లేదు' : 'None yet'}</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td style={{ padding: '0.95rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(p.id)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#475569',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <FaEye size={12} /> {t('receptionPortal.btnViewDetails')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBookForPatient(p)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#0f766e',
                            color: '#ffffff',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <FaCalendarPlus size={12} /> {t('receptionPortal.btnBookVisit')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Patient Detail Profile Modal */}
      {selectedPatientId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#ccfbf1',
                  color: '#0f766e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaUser size={14} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {t('receptionPortal.modalPatientProfile')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatientId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {detailLoading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  <FaClock size={24} style={{ animation: 'spin 1s linear infinite', color: '#0f766e', marginBottom: '0.5rem' }} />
                  <div>{isTelugu ? 'రోగి వివరాలు లోడ్ అవుతున్నాయి...' : 'Retrieving patient details...'}</div>
                </div>
              ) : detailError ? (
                <div style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  fontSize: '0.85rem'
                }}>
                  {detailError}
                </div>
              ) : patientDetail ? (
                <>
                  {/* Summary Details */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                    border: '1px solid #e2e8f0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '0.85rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        {t('receptionPortal.fullNameLabel')}
                      </span>
                      <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
                        {patientDetail.name}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        {t('receptionPortal.phoneLabel')}
                      </span>
                      <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '0.15rem' }}>
                        {patientDetail.phone || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        {t('receptionPortal.emailLabel')}
                      </span>
                      <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '0.15rem', wordBreak: 'break-all' }}>
                        {patientDetail.email}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        {t('receptionPortal.totalHospitalVisits')}
                      </span>
                      <div style={{ fontWeight: 800, color: '#0f766e', marginTop: '0.15rem' }}>
                        {patientDetail.total_hospital_visits || 0}
                      </div>
                    </div>
                  </div>

                  {/* Consultation History */}
                  <div>
                    <h4 style={{ margin: '0 0 0.65rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                      {t('receptionPortal.consultationHistory')}
                    </h4>

                    {patientDetail.appointments && patientDetail.appointments.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {patientDetail.appointments.map((appt) => (
                          <div
                            key={appt.id}
                            style={{
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.85rem'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                #{appt.id} • {appt.appointment_date} at {appt.appointment_time}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                                Dr. {appt.doctor_name || 'Specialist'} ({appt.specialization_name || 'General'})
                              </div>
                              {appt.reason && (
                                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.15rem', fontStyle: 'italic' }}>
                                  {appt.reason}
                                </div>
                              )}
                            </div>
                            <span style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: appt.status === 'Completed' ? '#dcfce7' : appt.status === 'Confirmed' ? '#ccfbf1' : appt.status === 'Pending' ? '#fef3c7' : '#fee2e2',
                              color: appt.status === 'Completed' ? '#15803d' : appt.status === 'Confirmed' ? '#0f766e' : appt.status === 'Pending' ? '#b45309' : '#b91c1c'
                            }}>
                              {appt.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', background: '#f8fafc', borderRadius: '8px' }}>
                        {t('receptionPortal.noHistoryYet')}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              {patientDetail && (
                <button
                  type="button"
                  onClick={() => {
                    handleBookForPatient(patientDetail);
                    setSelectedPatientId(null);
                  }}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0f766e',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <FaCalendarPlus size={12} /> {t('receptionPortal.btnBookVisit')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedPatientId(null)}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  marginLeft: 'auto'
                }}
              >
                {t('receptionPortal.closeModal')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientSearch;
