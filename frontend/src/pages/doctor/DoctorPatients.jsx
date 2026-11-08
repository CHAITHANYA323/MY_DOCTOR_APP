import React, { useState, useEffect, useCallback } from 'react';
import {
  FaUsers,
  FaSearch,
  FaPhoneAlt,
  FaEnvelope,
  FaTimes,
  FaHistory,
  FaFileMedical,
  FaSync,
  FaCheckCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { doctorService } from '../../services/doctorService';

export const DoctorPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // History Modal states
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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
      console.error(err);
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

  return (
    <div>
      {/* Header */}
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
            Patient Directory
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Patients with consultation history in your clinical practice ({patients.length} total)
          </p>
        </div>

        <button
          onClick={fetchPatients}
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
            placeholder="Search patients by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Patients Table / Grid */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
            <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', margin: '0 auto 1rem auto' }} />
            <p>Loading patient directory...</p>
          </div>
        ) : patients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94a3b8' }}>
            <FaUsers size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>No Patients Found</h3>
            <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
              {searchQuery ? 'No patients matched your search query.' : 'You have not conducted consultations with any registered patients yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Patient Name</th>
                  <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Contact Info</th>
                  <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Demographics</th>
                  <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Consultations</th>
                  <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Last Visit & Notes</th>
                  <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: '#e0f2fe',
                          color: '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem'
                        }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Patient ID: #{p.id}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.8rem', color: '#475569' }}>
                        {p.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <FaPhoneAlt size={11} style={{ color: '#0284c7' }} /> {p.phone}
                          </div>
                        )}
                        {p.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <FaEnvelope size={11} style={{ color: '#0284c7' }} /> {p.email}
                          </div>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#475569' }}>
                      <div>Age: <strong>{p.age} yrs</strong></div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                        Gender: {p.gender} • Blood: {p.blood_group}
                      </div>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                        <FaCheckCircle size={10} />
                        {p.total_visits} Visit{p.total_visits !== 1 ? 's' : ''}
                      </div>
                    </td>

                    <td style={{ padding: '1rem', maxWidth: '280px' }}>
                      {p.last_visit_date ? (
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>
                            {p.last_visit_date}
                          </div>
                          {p.last_notes ? (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: 'italic' }}>
                              Notes: {p.last_notes}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                              Reason: {p.last_reason || 'Consultation'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>None</span>
                      )}
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={() => handleOpenPatientHistory(p.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.85rem',
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <FaHistory size={11} />
                        Consultation History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Consultation History Modal */}
      {selectedPatientId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaFileMedical size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Clinical Consultation History
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                    Past visits and recorded doctor notes with this physician
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
              >
                <FaTimes size={18} />
              </button>
            </div>

            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', margin: '0 auto 1rem auto' }} />
                <p>Loading patient clinical timeline...</p>
              </div>
            ) : patientDetails ? (
              <div>
                {/* Patient Profile Card */}
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem', marginBottom: '0.5rem' }}>
                    {patientDetails.patient.name}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                    <div>Email: <strong>{patientDetails.patient.email}</strong></div>
                    <div>Phone: <strong>{patientDetails.patient.phone}</strong></div>
                    <div>Age: <strong>{patientDetails.patient.age} yrs</strong></div>
                    <div>Gender: <strong>{patientDetails.patient.gender}</strong></div>
                    <div>Blood Group: <strong>{patientDetails.patient.blood_group}</strong></div>
                    <div>Emergency Contact: <strong>{patientDetails.patient.emergency_contact}</strong></div>
                  </div>
                </div>

                {/* Consultation Timeline */}
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
                  Consultation Records ({patientDetails.appointments?.length || 0})
                </h4>

                {patientDetails.appointments?.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No prior appointments recorded.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {patientDetails.appointments.map((appt, idx) => (
                      <div
                        key={appt.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '1rem',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                              Visit #{patientDetails.appointments.length - idx}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              • {appt.appointment_date} at {appt.appointment_time}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            background: appt.status === 'Completed' ? '#dcfce7' : '#e0f2fe',
                            color: appt.status === 'Completed' ? '#15803d' : '#0369a1'
                          }}>
                            {appt.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '0.5rem' }}>
                          <strong>Chief Complaint:</strong> {appt.reason}
                        </div>

                        {appt.notes ? (
                          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', borderLeft: '3px solid #0284c7', fontSize: '0.85rem', color: '#1e293b' }}>
                            <strong>Doctor Clinical Notes:</strong>
                            <div style={{ whiteSpace: 'pre-line', marginTop: '0.25rem' }}>
                              {appt.notes}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            No doctor clinical notes entered for this visit.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCloseModal}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
