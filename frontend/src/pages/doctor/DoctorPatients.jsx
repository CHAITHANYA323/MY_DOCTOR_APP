import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FaUsers,
  FaSearch,
  FaPhoneAlt,
  FaEnvelope,
  FaTimes,
  FaHistory,
  FaSync,
  FaCalendarAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useLanguage } from '../../context/LanguageContext';
import { doctorService } from '../../services/doctorService';

export const DoctorPatients = () => {
  const { t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // History Modal states
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const getLabel = useCallback((key, fallback) => {
    const val = t(key);
    if (!val || val === key) return fallback;
    return val;
  }, [t]);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await doctorService.getDoctorPatients({ search: searchQuery });
      if (res.success) {
        setPatients(res.patients || []);
      } else {
        toast.error(res.message || 'Failed to load patient records.');
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      toast.error(err.response?.data?.message || 'Error loading doctor patients.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  const handleOpenPatientHistory = async (patientId) => {
    try {
      setSelectedPatientId(patientId);
      setLoadingDetails(true);
      const res = await doctorService.getDoctorPatientDetails(patientId);
      if (res.success) {
        setPatientDetails(res);
      } else {
        toast.error(res.message || 'Failed to load patient consultation history.');
        setSelectedPatientId(null);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error loading clinical records.');
      setSelectedPatientId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedPatientId(null);
    setPatientDetails(null);
  };

  const getInitials = (name) => {
    if (!name) return 'PT';
    const clean = name.replace(/^Dr\.?\s*/i, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0C2328', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>
            {getLabel('doctorPortal.patientsTitle', 'Patients Directory')}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.88rem', margin: 0 }}>
            {getLabel('doctorPortal.patientsSubtitle', 'Comprehensive registry of patients who have consulted with you')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            background: 'rgba(13, 148, 136, 0.1)',
            color: '#0D9488',
            fontSize: '0.8rem',
            fontWeight: 800,
            padding: '0.4rem 0.85rem',
            borderRadius: '999px',
            border: '1px solid rgba(13, 148, 136, 0.2)'
          }}>
            {getLabel('doctorPortal.totalPatientsCount', `Total Patients: ${patients.length}`).replace('{count}', patients.length)}
          </span>

          <button
            onClick={fetchPatients}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              padding: '0.6rem 1.15rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <FaSync size={12} className={loading ? 'animate-spin' : ''} />
            {getLabel('doctorPortal.refresh', 'Refresh')}
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        padding: '1.25rem',
        boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)'
      }}>
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <FaSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder={getLabel('doctorPortal.searchPatientsPlaceholder', 'Search by patient name, phone, or email...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem 0.65rem 2.25rem',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '0.85rem',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Patient Directory Grid / Cards */}
      {loading && patients.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem' }}>
          <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTopColor: '#0D9488', borderRadius: '50%' }} />
          <p style={{ color: '#64748B', fontSize: '0.88rem' }}>Loading patient registry...</p>
        </div>
      ) : patients.length === 0 ? (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          padding: '3rem 1.5rem',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)'
        }}>
          <FaUsers size={42} style={{ margin: '0 auto 0.75rem auto', color: '#94A3B8' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0C2328', margin: '0 0 0.35rem 0' }}>
            {getLabel('doctorPortal.noPatientsFoundTitle', 'No Patients Found')}
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '420px', margin: '0 auto 1.25rem auto' }}>
            {getLabel('doctorPortal.noPatientsFoundSub', 'No patients match your search criteria or no consultations recorded yet.')}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                padding: '0.5rem 1rem',
                background: '#0D9488',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1.25rem'
        }}>
          {patients.map((patient) => {
            return (
              <div
                key={patient.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  padding: '1.4rem',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease'
                }}
              >
                <div>
                  {/* Top card info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      backgroundColor: '#0C2328',
                      color: '#2DD4BF',
                      border: '2px solid #0D9488',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                      flexShrink: 0
                    }}>
                      {getInitials(patient.name)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: '#0C2328',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {patient.name}
                      </h3>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                        <span>ID: #{patient.id}</span>
                        {patient.gender && patient.gender !== 'Not Specified' && (
                          <span>• {patient.gender}</span>
                        )}
                        {patient.age && patient.age !== 'N/A' && (
                          <span>• {patient.age} yrs</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    fontSize: '0.78rem',
                    color: '#475569',
                    backgroundColor: '#F8FAFC',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    marginBottom: '0.85rem'
                  }}>
                    {patient.phone && patient.phone !== 'Not Provided' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FaPhoneAlt size={10} style={{ color: '#0D9488' }} />
                        <span style={{ fontWeight: 600 }}>{patient.phone}</span>
                      </div>
                    )}
                    {patient.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FaEnvelope size={10} style={{ color: '#0D9488' }} />
                        <span>{patient.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Visit Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <span style={{ color: '#64748B', display: 'block' }}>{getLabel('doctorPortal.totalVisits', 'Total Visits')}</span>
                      <strong style={{ fontSize: '0.95rem', color: '#0C2328' }}>{patient.total_visits || 1}</strong>
                    </div>
                    <div style={{ padding: '0.5rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <span style={{ color: '#64748B', display: 'block' }}>{getLabel('doctorPortal.lastVisitDate', 'Last Visit')}</span>
                      <strong style={{ fontSize: '0.82rem', color: '#0C2328' }}>{patient.last_visit_date || 'N/A'}</strong>
                    </div>
                  </div>

                  {/* Last complaint */}
                  {patient.last_reason && (
                    <div style={{ fontSize: '0.74rem', color: '#475569', margin: '0.35rem 0' }}>
                      <span style={{ fontWeight: 700, color: '#334155' }}>Last Complaint:</span> {patient.last_reason}
                    </div>
                  )}
                </div>

                {/* View History Button */}
                <button
                  type="button"
                  onClick={() => handleOpenPatientHistory(patient.id)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)'
                  }}
                >
                  <FaHistory size={12} />
                  {getLabel('doctorPortal.viewClinicalHistory', 'View Clinical History')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Patient History Modal */}
      {selectedPatientId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(12, 35, 40, 0.7)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.25rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '750px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaHistory size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0C2328', margin: 0 }}>
                    {getLabel('doctorPortal.clinicalHistoryTitle', 'Patient Clinical History')}
                  </h3>
                  <p style={{ color: '#64748B', fontSize: '0.78rem', margin: 0 }}>
                    {patientDetails?.patient?.name || 'Patient Records'} (ID: #{selectedPatientId})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.25rem' }}
              >
                <FaTimes size={18} />
              </button>
            </div>

            {loadingDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem' }}>
                <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTopColor: '#0D9488', borderRadius: '50%' }} />
                <p style={{ color: '#64748B', fontSize: '0.88rem' }}>Loading patient medical records...</p>
              </div>
            ) : patientDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Demographics Summary Card */}
                <div style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '1.25rem'
                }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0C2328', margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {getLabel('doctorPortal.demographicsTitle', 'Patient Profile & Demographics')}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>{getLabel('doctorPortal.patient', 'Full Name')}</span>
                      <strong style={{ color: '#0C2328' }}>{patientDetails.patient?.name}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>{getLabel('doctorPortal.patientContact', 'Phone')}</span>
                      <strong style={{ color: '#0C2328' }}>{patientDetails.patient?.phone || 'N/A'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>{getLabel('doctorPortal.patientEmail', 'Email')}</span>
                      <strong style={{ color: '#0C2328' }}>{patientDetails.patient?.email}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>{getLabel('doctorPortal.gender', 'Gender')}</span>
                      <strong style={{ color: '#0C2328' }}>{patientDetails.patient?.gender || 'N/A'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>{getLabel('doctorPortal.age', 'Age')}</span>
                      <strong style={{ color: '#0C2328' }}>{patientDetails.patient?.age || 'N/A'} yrs</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>{getLabel('doctorPortal.bloodGroup', 'Blood Group')}</span>
                      <strong style={{ color: '#0C2328' }}>{patientDetails.patient?.blood_group || 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                {/* Consultation History Timeline */}
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0C2328', margin: '0 0 0.85rem 0' }}>
                    {getLabel('doctorPortal.consultationHistoryTitle', 'Past Consultations History')}
                  </h4>

                  {(!patientDetails.appointments || patientDetails.appointments.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '10px' }}>
                      {getLabel('doctorPortal.noHistoryRecorded', 'No previous consultations recorded for this patient.')}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {patientDetails.appointments.map((appt) => (
                        <div
                          key={appt.id}
                          style={{
                            background: '#FFFFFF',
                            borderRadius: '10px',
                            border: '1px solid #E2E8F0',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#0C2328', fontSize: '0.88rem' }}>
                              <FaCalendarAlt size={12} style={{ color: '#0D9488' }} />
                              {appt.appointment_date}
                              <span style={{ color: '#64748B', fontWeight: 600, fontSize: '0.78rem' }}>
                                ({appt.appointment_time})
                              </span>
                            </div>
                            <span style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              backgroundColor: appt.status === 'Completed' ? '#D1FAE5' : '#E0F2FE',
                              color: appt.status === 'Completed' ? '#047857' : '#0369A1'
                            }}>
                              {appt.status}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                            <strong>Reason:</strong> {appt.reason || 'General Consultation'}
                          </div>

                          {appt.notes ? (
                            <div style={{
                              padding: '0.5rem 0.75rem',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              color: '#0F766E',
                              whiteSpace: 'pre-line'
                            }}>
                              <strong>Clinical Notes & Advice:</strong>
                              <br />
                              {appt.notes}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontStyle: 'italic' }}>
                              No clinical notes entered for this visit.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  padding: '0.65rem 1.4rem',
                  background: '#0D9488',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {getLabel('doctorPortal.closeModal', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
