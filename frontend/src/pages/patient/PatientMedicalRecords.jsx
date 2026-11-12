import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaNotesMedical,
  FaSearch,
  FaShieldAlt,
  FaFilePrescription,
  FaFileMedical,
  FaSync,
  FaUserMd,
  FaTimes,
  FaCalendarAlt,
  FaPlus
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useLanguage } from '../../context/LanguageContext';
import { patientService } from '../../services/patientService';

export const PatientMedicalRecords = () => {
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all'); // 'all', 'prescriptions', 'consultations'
  const [selectedRecord, setSelectedRecord] = useState(null);

  const getLabel = useCallback((key, fallback) => {
    const val = t(key);
    if (!val || val === key) return fallback;
    return val;
  }, [t]);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientService.getMedicalRecords();
      if (res.success) {
        setRecords(res.records || []);
      } else {
        toast.error(res.message || 'Failed to load medical records.');
      }
    } catch (err) {
      console.error('Error fetching clinical records:', err);
      toast.error(err.response?.data?.message || 'Error loading clinical records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Category filter
      if (category === 'prescriptions' && !r.has_prescription) return false;
      if (category === 'consultations' && r.has_prescription) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const doc = (r.doctor_name || '').toLowerCase();
        const hosp = (r.hospital_name || '').toLowerCase();
        const spec = (r.specialization || '').toLowerCase();
        const complaint = (r.chief_complaint || '').toLowerCase();
        const notes = (r.clinical_notes || '').toLowerCase();
        if (!doc.includes(q) && !hosp.includes(q) && !spec.includes(q) && !complaint.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [records, category, search]);

  const prescriptionCount = useMemo(() => records.filter(r => r.has_prescription).length, [records]);

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
            {getLabel('patientPortal.recordsTitle', 'Medical Records & Prescriptions')}
          </h1>
          <p style={{ color: '#718096', fontSize: '0.88rem', margin: 0 }}>
            {getLabel('patientPortal.recordsSubtitle', 'Review doctor clinical assessments, diagnosis reports, and prescribed treatment plans')} ({records.length} records)
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRecords}
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
          <span>{getLabel('patientPortal.refresh', 'Refresh')}</span>
        </button>
      </div>

      {/* Clinical Governance & Confidentiality Card */}
      <div style={{
        backgroundColor: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderRadius: '14px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: '#DCFCE7',
          color: '#16A36A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <FaShieldAlt size={16} />
        </div>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#166534', marginBottom: '0.2rem' }}>
            Confidential Healthcare History
          </div>
          <p style={{ fontSize: '0.82rem', color: '#15803D', margin: 0, lineHeight: 1.45 }}>
            {getLabel('patientPortal.clinicalSafetyNotice', 'Clinical records are digitally certified by attending physicians. Your medical history is strictly confidential and protected.')}
          </p>
        </div>
      </div>

      {/* Filters & Search Control Card */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '1.25rem',
        boxShadow: '0 2px 8px rgba(16, 42, 67, 0.03)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        {/* Category Filter Pills */}
        <div
          role="tablist"
          aria-label="Medical Records Categories"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            maxWidth: '100%'
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={category === 'all'}
            onClick={() => setCategory('all')}
            style={{
              padding: '0.52rem 0.95rem',
              borderRadius: '9px',
              border: category === 'all' ? '1px solid #102A43' : '1px solid #E2E8F0',
              backgroundColor: category === 'all' ? '#102A43' : '#F8FAFC',
              color: category === 'all' ? '#FFFFFF' : '#475569',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              lineHeight: 1.2
            }}
          >
            <span>{getLabel('patientPortal.allCategories', 'All Records')}</span>
            <span style={{ opacity: category === 'all' ? 0.95 : 0.75 }}>
              ({records.length})
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={category === 'prescriptions'}
            onClick={() => setCategory('prescriptions')}
            style={{
              padding: '0.52rem 0.95rem',
              borderRadius: '9px',
              border: category === 'prescriptions' ? '1px solid #1677C8' : '1px solid #E2E8F0',
              backgroundColor: category === 'prescriptions' ? '#1677C8' : '#F8FAFC',
              color: category === 'prescriptions' ? '#FFFFFF' : '#475569',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              lineHeight: 1.2
            }}
          >
            <span>{getLabel('patientPortal.prescriptions', 'My Prescriptions')}</span>
            <span style={{ opacity: category === 'prescriptions' ? 0.95 : 0.75 }}>
              ({prescriptionCount})
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={category === 'consultations'}
            onClick={() => setCategory('consultations')}
            style={{
              padding: '0.52rem 0.95rem',
              borderRadius: '9px',
              border: category === 'consultations' ? '1px solid #13B8A6' : '1px solid #E2E8F0',
              backgroundColor: category === 'consultations' ? '#13B8A6' : '#F8FAFC',
              color: category === 'consultations' ? '#FFFFFF' : '#475569',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              lineHeight: 1.2
            }}
          >
            <span>{getLabel('patientPortal.consultations', 'Visit Summaries')}</span>
            <span style={{ opacity: category === 'consultations' ? 0.95 : 0.75 }}>
              ({records.length - prescriptionCount})
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div style={{
          position: 'relative',
          minWidth: '260px',
          flex: '1 1 280px',
          maxWidth: '420px',
          width: '100%'
        }}>
          <FaSearch style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94A3B8',
            pointerEvents: 'none'
          }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={getLabel('patientPortal.searchRecords', 'Search doctor, hospital, or medication...')}
            style={{
              width: '100%',
              padding: '0.58rem 1rem 0.58rem 2.45rem',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              fontSize: '0.84rem',
              outline: 'none',
              backgroundColor: '#F8FAFC',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#1677C8';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22, 119, 200, 0.12)';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.backgroundColor = '#F8FAFC';
            }}
          />
        </div>
      </div>

      {/* Records Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.25rem'
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: '220px', borderRadius: '16px', backgroundColor: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3.5rem 1.5rem',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(16, 42, 67, 0.03)'
        }}>
          <FaFileMedical size={44} style={{ color: '#9FB3C8', margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#102A43', marginBottom: '0.4rem' }}>
            {getLabel('patientPortal.noRecordsTitle', 'No Medical Records Available Yet')}
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#718096', maxWidth: '380px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
            {getLabel('patientPortal.noRecordsSub', 'Your clinical summaries, diagnosis reports, and digital prescriptions will appear here following completed visits.')}
          </p>
          <Link
            to="/patient/doctors"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#1677C8',
              color: '#FFFFFF',
              padding: '0.65rem 1.4rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.86rem',
              textDecoration: 'none',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1362A8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1677C8'; }}
          >
            <FaPlus size={11} />
            <span>{getLabel('patientPortal.bookAppointment', 'Book an Appointment')}</span>
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredRecords.map((r, idx) => (
            <div
              key={r.appointment_id || idx}
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
                transition: 'box-shadow 0.2s ease'
              }}
            >
              <div>
                {/* Header: Date & Prescription Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#718096', fontWeight: 600 }}>
                    <FaCalendarAlt size={12} style={{ color: '#1677C8' }} />
                    <span>{r.visit_date} {r.visit_time ? `&bull; ${r.visit_time}` : ''}</span>
                  </div>

                  {r.has_prescription ? (
                    <span style={{
                      backgroundColor: 'rgba(22, 119, 200, 0.12)',
                      border: '1px solid rgba(22, 119, 200, 0.3)',
                      color: '#1677C8',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <FaFilePrescription size={11} />
                      <span>{getLabel('patientPortal.prescriptionAvailable', 'Rx Prescription')}</span>
                    </span>
                  ) : (
                    <span style={{
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      color: '#16A36A',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px'
                    }}>
                      Clinical Record
                    </span>
                  )}
                </div>

                {/* Doctor and Hospital Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(22, 119, 200, 0.1)',
                    color: '#1677C8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    <FaUserMd />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.15rem 0' }}>
                      {r.doctor_name}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#13B8A6', fontWeight: 700 }}>
                      {r.specialization} &bull; <span style={{ color: '#718096' }}>{r.hospital_name}</span>
                    </div>
                  </div>
                </div>

                {/* Chief Complaint */}
                {r.chief_complaint && (
                  <div style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.82rem',
                    marginBottom: '0.85rem'
                  }}>
                    <strong style={{ color: '#102A43', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                      {getLabel('patientPortal.chiefComplaint', 'Chief Complaint / Reason')}
                    </strong>
                    <div style={{ color: '#334155' }}>{r.chief_complaint}</div>
                  </div>
                )}

                {/* Clinical Notes Summary */}
                {r.clinical_notes && (
                  <div style={{
                    padding: '0.75rem 0.85rem',
                    backgroundColor: '#EFF6FF',
                    borderRadius: '10px',
                    border: '1px solid #BFDBFE',
                    fontSize: '0.82rem'
                  }}>
                    <strong style={{ color: '#1E40AF', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                      {getLabel('patientPortal.doctorObservations', "Doctor's Assessment & Advice")}
                    </strong>
                    <div style={{ color: '#1E3A8A', lineHeight: 1.45 }}>
                      {r.clinical_notes.length > 140 ? `${r.clinical_notes.substring(0, 140)}...` : r.clinical_notes}
                    </div>
                  </div>
                )}
              </div>

              {/* View Full Summary Action */}
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #F0F4F8' }}>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(r)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    backgroundColor: 'rgba(22, 119, 200, 0.08)',
                    border: '1px solid rgba(22, 119, 200, 0.25)',
                    borderRadius: '8px',
                    color: '#1677C8',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FaNotesMedical size={13} />
                  <span>{getLabel('patientPortal.viewDetails', 'View Complete Clinical Record')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Details Modal */}
      {selectedRecord && (
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
                <FaNotesMedical size={20} style={{ color: '#1677C8' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#102A43', margin: 0 }}>
                  Clinical Record & Prescription
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                style={{ background: 'none', border: 'none', color: '#718096', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Attending Doctor</span>
                <strong style={{ color: '#102A43' }}>{selectedRecord.doctor_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Specialization</span>
                <span style={{ color: '#13B8A6', fontWeight: 700 }}>{selectedRecord.specialization}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Hospital Facility</span>
                <span style={{ color: '#102A43', fontWeight: 600 }}>{selectedRecord.hospital_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Consultation Date</span>
                <strong style={{ color: '#1677C8' }}>{selectedRecord.visit_date} {selectedRecord.visit_time ? `(${selectedRecord.visit_time})` : ''}</strong>
              </div>

              {selectedRecord.chief_complaint && (
                <div style={{ padding: '0.85rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#718096', marginBottom: '0.25rem' }}>
                    PATIENT PRESENTING COMPLAINT
                  </div>
                  <div style={{ color: '#243447' }}>{selectedRecord.chief_complaint}</div>
                </div>
              )}

              {selectedRecord.clinical_notes && (
                <div style={{ padding: '1rem', backgroundColor: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E40AF', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FaFilePrescription size={14} />
                    <span>CLINICAL DIAGNOSIS & PRESCRIPTION NOTES</span>
                  </div>
                  <div style={{ color: '#1E3A8A', whiteSpace: 'pre-line', lineHeight: 1.55 }}>
                    {selectedRecord.clinical_notes}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
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
                {getLabel('patientPortal.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
