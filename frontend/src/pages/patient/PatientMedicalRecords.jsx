import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaNotesMedical,
  FaSearch,
  FaClock,
  FaShieldAlt,
  FaCheckCircle,
  FaPills,
  FaFileMedical,
  FaSync
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { patientService } from '../../services/patientService';

export const PatientMedicalRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
      console.error(err);
      toast.error(err.response?.data?.message || 'Error loading clinical records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter((r) => {
      const doc = (r.doctor_name || '').toLowerCase();
      const hosp = (r.hospital_name || '').toLowerCase();
      const spec = (r.specialization || '').toLowerCase();
      const complaint = (r.chief_complaint || '').toLowerCase();
      const notes = (r.clinical_notes || '').toLowerCase();
      return doc.includes(q) || hosp.includes(q) || spec.includes(q) || complaint.includes(q) || notes.includes(q);
    });
  }, [records, search]);

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
            Medical Records & Prescriptions
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Review doctor clinical assessments, diagnosis reports, and prescribed treatment plans ({records.length} records)
          </p>
        </div>

        <button
          onClick={fetchRecords}
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

      {/* Clinical Governance Safety Notice */}
      <div style={{
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <FaShieldAlt size={18} style={{ color: '#16a34a', marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: '#166534', lineHeight: 1.5 }}>
          <strong>Clinical Integrity & Patient Privacy:</strong> Medical consultation notes and prescriptions are authored and digitally verified by your attending healthcare specialist. In compliance with medical record regulations, records are tamper-proof and read-only.
        </div>
      </div>

      {/* Search Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        marginBottom: '1.75rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <FaSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search records by doctor, hospital, symptom, or medication..."
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
      </div>

      {/* Records Timeline / Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
          <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', margin: '0 auto 1rem auto' }} />
          <p>Loading medical consultation records...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <FaFileMedical size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>No Clinical Records Found</h3>
          <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.25rem auto' }}>
            {search ? 'No records match your search criteria.' : 'When you complete consultations with attending physicians, their notes and prescriptions will be archived here.'}
          </p>
          <Link
            to="/patient/doctors"
            style={{
              display: 'inline-block',
              background: '#0284c7',
              color: '#ffffff',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
          >
            Find a Doctor
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredRecords.map((rec) => (
            <div
              key={rec.appointment_id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              {/* Record Header */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FaNotesMedical size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.15rem 0' }}>
                      {rec.doctor_name}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 600 }}>
                      {rec.specialization} • {rec.hospital_name}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {rec.has_prescription && (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.2rem 0.6rem',
                      background: '#fef3c7',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      <FaPills size={10} /> Rx Prescribed
                    </span>
                  )}
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.2rem 0.6rem',
                    background: '#dcfce7',
                    color: '#15803d',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    <FaCheckCircle size={10} /> Completed Visit
                  </span>
                </div>
              </div>

              {/* Consultation Details */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.85rem', color: '#475569', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <FaClock size={12} style={{ color: '#0284c7' }} />
                  <span><strong>Visit Date:</strong> {rec.visit_date} at {rec.visit_time}</span>
                </div>
                <div>
                  <strong>Chief Complaint:</strong> {rec.chief_complaint}
                </div>
              </div>

              {/* Clinical Notes Body */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #0284c7',
                borderRadius: '8px',
                padding: '1rem',
                fontSize: '0.9rem',
                color: '#1e293b'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Attending Doctor's Clinical Assessment & Recommendations
                </div>
                {rec.clinical_notes ? (
                  <div style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                    {rec.clinical_notes}
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                    Consultation conducted. Detailed electronic prescription notes are being compiled by the clinic.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
