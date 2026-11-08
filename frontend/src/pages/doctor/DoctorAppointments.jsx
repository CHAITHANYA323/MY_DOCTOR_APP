import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FaCalendarCheck,
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaNotesMedical,
  FaClock,
  FaPhoneAlt,
  FaEnvelope,
  FaTimes,
  FaSync
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { doctorService } from '../../services/doctorService';

export const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, upcoming, past, custom
  const [customDate, setCustomDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await doctorService.getDoctorAppointments({ limit: 100 });
      if (res.success) {
        setAppointments(res.appointments || []);
      } else {
        toast.error(res.message || 'Failed to fetch consultations.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error loading appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleOpenConsultationModal = (appt) => {
    setSelectedAppt(appt);
    setNotes(appt.notes || '');
  };

  const handleSaveConsultation = async (targetStatus = null) => {
    if (!selectedAppt) return;
    try {
      setSavingNotes(true);
      const payload = {
        notes: notes
      };
      if (targetStatus) {
        payload.status = targetStatus;
      }

      const res = await doctorService.updateDoctorAppointment(selectedAppt.id, payload);
      if (res.success) {
        toast.success(`Consultation record saved${targetStatus ? ` and marked ${targetStatus}` : ''}.`);
        setSelectedAppt(null);
        setNotes('');
        fetchAppointments();
      } else {
        toast.error(res.message || 'Failed to update consultation.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error updating consultation.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleQuickStatusChange = async (apptId, newStatus) => {
    try {
      const res = await doctorService.updateDoctorAppointment(apptId, { status: newStatus });
      if (res.success) {
        toast.success(`Consultation marked as ${newStatus}.`);
        fetchAppointments();
      } else {
        toast.error(res.message || 'Status update failed.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error updating status.');
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // Status Filter
      if (statusFilter !== 'all' && appt.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Date Filter
      if (dateFilter === 'today' && appt.appointment_date !== todayStr) {
        return false;
      }
      if (dateFilter === 'upcoming' && appt.appointment_date < todayStr) {
        return false;
      }
      if (dateFilter === 'past' && appt.appointment_date >= todayStr) {
        return false;
      }
      if (dateFilter === 'custom' && customDate && appt.appointment_date !== customDate) {
        return false;
      }

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = (appt.patient_name || (appt.user && appt.user.name) || '').toLowerCase();
        const reason = (appt.reason || '').toLowerCase();
        const email = (appt.user?.email || '').toLowerCase();
        const phone = (appt.user?.phone || '').toLowerCase();
        if (!pName.includes(q) && !reason.includes(q) && !email.includes(q) && !phone.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, statusFilter, dateFilter, customDate, searchQuery, todayStr]);

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
            Consultation Agenda
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Manage appointments, conduct patient consultations, and update clinical notes
          </p>
        </div>

        <button
          onClick={fetchAppointments}
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
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <FaSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by patient name, phone, reason..."
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

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaFilter size={13} style={{ color: '#64748b' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                flex: 1,
                padding: '0.65rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.875rem',
                background: '#ffffff',
                color: '#334155'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
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
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="upcoming">Upcoming (Today & Future)</option>
              <option value="past">Past Consultations</option>
              <option value="custom">Specific Date...</option>
            </select>
          </div>

          {/* Custom Date Picker (conditional) */}
          {dateFilter === 'custom' && (
            <div>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}
        </div>

        {/* Quick Filter Counts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
          {[
            { label: 'All', val: 'all', count: appointments.length },
            { label: 'Pending', val: 'pending', count: appointments.filter(a => a.status === 'Pending').length },
            { label: 'Confirmed', val: 'confirmed', count: appointments.filter(a => a.status === 'Confirmed').length },
            { label: 'Completed', val: 'completed', count: appointments.filter(a => a.status === 'Completed').length },
            { label: 'Cancelled', val: 'cancelled', count: appointments.filter(a => a.status === 'Cancelled').length }
          ].map(pill => (
            <button
              key={pill.val}
              onClick={() => setStatusFilter(pill.val)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: statusFilter === pill.val ? '1px solid #0284c7' : '1px solid #e2e8f0',
                background: statusFilter === pill.val ? '#e0f2fe' : '#ffffff',
                color: statusFilter === pill.val ? '#0369a1' : '#64748b',
                cursor: 'pointer'
              }}
            >
              {pill.label} ({pill.count})
            </button>
          ))}
        </div>
      </div>

      {/* Consultations List / Table */}
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
            <p>Loading consultations...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94a3b8' }}>
            <FaCalendarCheck size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>No Consultations Found</h3>
            <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
              No consultations match your selected status and date filters. Try modifying your criteria.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Date & Time</th>
                  <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Patient Details</th>
                  <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Reason / Notes</th>
                  <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appt) => {
                  const statusColors = {
                    Pending: { bg: '#fef3c7', text: '#b45309' },
                    Confirmed: { bg: '#e0f2fe', text: '#0369a1' },
                    Completed: { bg: '#dcfce7', text: '#15803d' },
                    Cancelled: { bg: '#fee2e2', text: '#b91c1c' }
                  }[appt.status] || { bg: '#f1f5f9', text: '#475569' };

                  const isToday = appt.appointment_date === todayStr;

                  return (
                    <tr key={appt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#0f172a' }}>
                          <FaClock size={12} style={{ color: '#0284c7' }} />
                          {appt.appointment_time}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: isToday ? '#0284c7' : '#64748b', marginTop: '0.2rem', fontWeight: isToday ? 700 : 500 }}>
                          {appt.appointment_date} {isToday && '(Today)'}
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {appt.patient_name || (appt.user && appt.user.name) || 'Patient'}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                          {appt.user?.phone && <span>{appt.user.phone}</span>}
                          {appt.user?.age && <span>• {appt.user.age} yrs</span>}
                          {appt.user?.gender && <span>• {appt.user.gender}</span>}
                        </div>
                      </td>

                      <td style={{ padding: '1rem', maxWidth: '320px' }}>
                        <div style={{ color: '#334155', fontSize: '0.875rem', fontWeight: 500 }}>
                          {appt.reason}
                        </div>
                        {appt.notes ? (
                          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: 'italic' }}>
                            Notes: {appt.notes}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                            No clinical notes yet
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: statusColors.bg,
                          color: statusColors.text,
                          display: 'inline-block'
                        }}>
                          {appt.status}
                        </span>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {/* Consult / Notes Button */}
                          <button
                            onClick={() => handleOpenConsultationModal(appt)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.45rem 0.8rem',
                              background: appt.status === 'Completed' ? '#f8fafc' : '#0284c7',
                              color: appt.status === 'Completed' ? '#334155' : '#ffffff',
                              border: appt.status === 'Completed' ? '1px solid #cbd5e1' : 'none',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <FaNotesMedical size={11} />
                            {appt.status === 'Completed' ? 'View / Edit Notes' : 'Consult'}
                          </button>

                          {/* Quick Confirm */}
                          {appt.status === 'Pending' && (
                            <button
                              onClick={() => handleQuickStatusChange(appt.id, 'Confirmed')}
                              style={{
                                padding: '0.45rem 0.75rem',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Confirm
                            </button>
                          )}

                          {/* Quick Cancel */}
                          {appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to cancel this consultation?')) {
                                  handleQuickStatusChange(appt.id, 'Cancelled');
                                }
                              }}
                              style={{
                                padding: '0.45rem 0.65rem',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clinical Consultation Modal */}
      {selectedAppt && (
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
            maxWidth: '640px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaNotesMedical size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Clinical Consultation
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                    Appointment #{selectedAppt.id} • {selectedAppt.appointment_date} at {selectedAppt.appointment_time}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppt(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Patient Header Card */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', marginBottom: '0.5rem' }}>
                {selectedAppt.patient_name || (selectedAppt.user && selectedAppt.user.name) || 'Patient'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                {selectedAppt.user?.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaPhoneAlt size={10} style={{ color: '#0284c7' }} /> {selectedAppt.user.phone}
                  </div>
                )}
                {selectedAppt.user?.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaEnvelope size={10} style={{ color: '#0284c7' }} /> {selectedAppt.user.email}
                  </div>
                )}
                <div>Age: <strong>{selectedAppt.user?.age || 'N/A'} yrs</strong></div>
                <div>Gender: <strong>{selectedAppt.user?.gender || 'N/A'}</strong></div>
              </div>
              <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>Reason for Visit:</span> {selectedAppt.reason}
              </div>
            </div>

            {/* Notes editor */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
                Doctor's Clinical Notes, Diagnosis & Prescriptions:
              </label>
              <textarea
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter diagnosis, clinical observations, prescribed medications with dosages, test orders, and next follow-up date..."
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Current Status: <strong>{selectedAppt.status}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedAppt(null)}
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
                  Cancel
                </button>

                {/* Just save notes without completing */}
                <button
                  type="button"
                  disabled={savingNotes}
                  onClick={() => handleSaveConsultation(null)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    background: '#ffffff',
                    border: '1px solid #0284c7',
                    borderRadius: '8px',
                    color: '#0284c7',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: savingNotes ? 'not-allowed' : 'pointer'
                  }}
                >
                  Save Notes
                </button>

                {/* Mark as completed and save */}
                {selectedAppt.status !== 'Completed' && (
                  <button
                    type="button"
                    disabled={savingNotes}
                    onClick={() => handleSaveConsultation('Completed')}
                    style={{
                      padding: '0.65rem 1.5rem',
                      background: '#10b981',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: savingNotes ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <FaCheckCircle size={14} />
                    {savingNotes ? 'Saving...' : 'Mark Completed'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
