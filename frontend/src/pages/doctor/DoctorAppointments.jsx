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
  FaSync,
  FaCheck,
  FaBan,
  FaPrescriptionBottleAlt,
  FaPlus,
  FaTrash
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useLanguage } from '../../context/LanguageContext';
import { doctorService } from '../../services/doctorService';
import { DigitalPrescriptionModal } from '../../components/prescriptions/DigitalPrescriptionModal';

export const DoctorAppointments = () => {
  const { t } = useLanguage();
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
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Digital Prescription items within modal (legacy inline builder)
  const [prescriptions, setPrescriptions] = useState([]);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('1-0-1');
  const [medTiming, setMedTiming] = useState('After Food');

  // Digital Prescription Modal – full Rx issuance system
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [rxInitialData, setRxInitialData] = useState({});

  const getLabel = useCallback((key, fallback) => {
    const val = t(key);
    if (!val || val === key) return fallback;
    return val;
  }, [t]);

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
      console.error('Error fetching appointments:', err);
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
    setPrescriptions([]);
    setMedName('');
    setMedDosage('');
  };

  const handleAddMedicine = () => {
    if (!medName.trim()) {
      toast.warning('Please enter medication name.');
      return;
    }
    const item = {
      id: Date.now(),
      name: medName.trim(),
      dosage: medDosage.trim() || '1 tablet',
      frequency: medFrequency,
      timing: medTiming
    };
    setPrescriptions((prev) => [...prev, item]);
    setMedName('');
    setMedDosage('');
  };

  const handleRemoveMedicine = (id) => {
    setPrescriptions((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveConsultation = async (targetStatus = null) => {
    if (!selectedAppt) return;
    try {
      setSavingNotes(true);

      let finalNotes = notes.trim();
      if (prescriptions.length > 0) {
        const rxText = prescriptions
          .map((p, idx) => `${idx + 1}. ${p.name} - ${p.dosage} [${p.frequency}, ${p.timing}]`)
          .join('\n');
        finalNotes = finalNotes ? `${finalNotes}\n\nPrescriptions:\n${rxText}` : `Prescriptions:\n${rxText}`;
      }

      const payload = {
        notes: finalNotes
      };
      if (targetStatus) {
        payload.status = targetStatus;
      }

      const res = await doctorService.updateDoctorAppointment(selectedAppt.id, payload);
      if (res.success) {
        toast.success(
          targetStatus
            ? `Consultation record saved and marked ${targetStatus}.`
            : 'Clinical consultation notes saved successfully.'
        );
        setSelectedAppt(null);
        setNotes('');
        setPrescriptions([]);
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
      setActionLoadingId(apptId);
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
    } finally {
      setActionLoadingId(null);
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const handleOpenRxModal = (appt) => {
    setRxInitialData({
      patient_id: appt.user_id || appt.user?.id,
      patient_name: appt.patient_name || appt.user?.name || '',
      patient_phone: appt.user?.phone || '',
      appointment_id: appt.id,
      reason: appt.reason || ''
    });
    setRxModalOpen(true);
  };

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

  // Aggregate Counts
  const counts = useMemo(() => {
    const res = { total: appointments.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    appointments.forEach((a) => {
      const s = (a.status || '').toLowerCase();
      if (s === 'pending') res.pending += 1;
      else if (s === 'confirmed') res.confirmed += 1;
      else if (s === 'completed') res.completed += 1;
      else if (s === 'cancelled') res.cancelled += 1;
    });
    return res;
  }, [appointments]);

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
            {getLabel('doctorPortal.appointmentsTitle', 'Appointments & Consultations')}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.88rem', margin: 0 }}>
            {getLabel('doctorPortal.appointmentsSubtitle', 'Manage patient visits, update consultation statuses, and document medical outcomes')}
          </p>
        </div>

        <button
          onClick={fetchAppointments}
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

      {/* Aggregate Status Pills Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center'
      }}>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          style={{
            padding: '0.45rem 0.9rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            border: '1px solid',
            borderColor: statusFilter === 'all' ? '#0D9488' : '#E2E8F0',
            backgroundColor: statusFilter === 'all' ? '#0D9488' : '#FFFFFF',
            color: statusFilter === 'all' ? '#FFFFFF' : '#475569',
            cursor: 'pointer'
          }}
        >
          {getLabel('doctorPortal.allStatuses', 'All')} ({counts.total})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          style={{
            padding: '0.45rem 0.9rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            border: '1px solid',
            borderColor: statusFilter === 'pending' ? '#D97706' : '#FEF3C7',
            backgroundColor: statusFilter === 'pending' ? '#FEF3C7' : '#FFFFFF',
            color: '#B45309',
            cursor: 'pointer'
          }}
        >
          {getLabel('doctorPortal.statusPending', 'Pending')} ({counts.pending})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('confirmed')}
          style={{
            padding: '0.45rem 0.9rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            border: '1px solid',
            borderColor: statusFilter === 'confirmed' ? '#059669' : '#D1FAE5',
            backgroundColor: statusFilter === 'confirmed' ? '#D1FAE5' : '#FFFFFF',
            color: '#047857',
            cursor: 'pointer'
          }}
        >
          {getLabel('doctorPortal.statusConfirmed', 'Confirmed')} ({counts.confirmed})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          style={{
            padding: '0.45rem 0.9rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            border: '1px solid',
            borderColor: statusFilter === 'completed' ? '#0284C7' : '#E0F2FE',
            backgroundColor: statusFilter === 'completed' ? '#E0F2FE' : '#FFFFFF',
            color: '#0369A1',
            cursor: 'pointer'
          }}
        >
          {getLabel('doctorPortal.statusCompleted', 'Completed')} ({counts.completed})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('cancelled')}
          style={{
            padding: '0.45rem 0.9rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            border: '1px solid',
            borderColor: statusFilter === 'cancelled' ? '#DC2626' : '#FEE2E2',
            backgroundColor: statusFilter === 'cancelled' ? '#FEE2E2' : '#FFFFFF',
            color: '#B91C1C',
            cursor: 'pointer'
          }}
        >
          {getLabel('doctorPortal.statusCancelled', 'Cancelled')} ({counts.cancelled})
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        padding: '1.25rem',
        boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          alignItems: 'center'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <FaSearch size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder={getLabel('doctorPortal.searchAppointmentsPlaceholder', 'Search by patient name, email, or consultation reason...')}
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

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaFilter size={12} style={{ color: '#64748B' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                flex: 1,
                padding: '0.65rem 0.75rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.85rem',
                background: '#FFFFFF',
                color: '#334155'
              }}
            >
              <option value="all">{getLabel('doctorPortal.allStatuses', 'All Statuses')}</option>
              <option value="pending">{getLabel('doctorPortal.statusPending', 'Pending')}</option>
              <option value="confirmed">{getLabel('doctorPortal.statusConfirmed', 'Confirmed')}</option>
              <option value="completed">{getLabel('doctorPortal.statusCompleted', 'Completed')}</option>
              <option value="cancelled">{getLabel('doctorPortal.statusCancelled', 'Cancelled')}</option>
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
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.85rem',
                background: '#FFFFFF',
                color: '#334155'
              }}
            >
              <option value="all">{getLabel('doctorPortal.dateAll', 'All Dates')}</option>
              <option value="today">{getLabel('doctorPortal.dateToday', 'Today Only')}</option>
              <option value="upcoming">{getLabel('doctorPortal.dateUpcoming', 'Upcoming')}</option>
              <option value="past">{getLabel('doctorPortal.datePast', 'Past Consultations')}</option>
              <option value="custom">{getLabel('doctorPortal.customDate', 'Specific Date...')}</option>
            </select>
          </div>

          {/* Specific Custom Date Picker */}
          {dateFilter === 'custom' && (
            <div>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Consultations Table */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        padding: '1.25rem',
        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
      }}>
        {loading && appointments.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem' }}>
            <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTopColor: '#0D9488', borderRadius: '50%' }} />
            <p style={{ color: '#64748B', fontSize: '0.88rem' }}>Loading consultation records...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B' }}>
            <FaCalendarCheck size={40} style={{ margin: '0 auto 0.75rem auto', color: '#94A3B8' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#334155', margin: '0 0 0.35rem 0' }}>
              {getLabel('doctorPortal.noAppointmentsFound', 'No consultation records found matching your filters.')}
            </h3>
            <p style={{ fontSize: '0.82rem', maxWidth: '420px', margin: '0 auto 1.25rem auto' }}>
              Try adjusting your date or status filters, or clear your search term.
            </p>
            <button
              onClick={() => { setStatusFilter('all'); setDateFilter('all'); setCustomDate(''); setSearchQuery(''); }}
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
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    {getLabel('doctorPortal.timeSlot', 'Schedule / Slot')}
                  </th>
                  <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    {getLabel('doctorPortal.patient', 'Patient Information')}
                  </th>
                  <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    {getLabel('doctorPortal.reasonForVisit', 'Chief Complaint & Notes')}
                  </th>
                  <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    {getLabel('doctorPortal.status', 'Status')}
                  </th>
                  <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    {getLabel('doctorPortal.actions', 'Clinical Actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appt) => {
                  const statusStyles = {
                    Pending: { bg: '#FEF3C7', color: '#B45309' },
                    Confirmed: { bg: '#D1FAE5', color: '#047857' },
                    Completed: { bg: '#E0F2FE', color: '#0369A1' },
                    Cancelled: { bg: '#FEE2E2', color: '#B91C1C' }
                  }[appt.status] || { bg: '#F1F5F9', color: '#475569' };

                  return (
                    <tr key={appt.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '0.85rem 0.75rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, color: '#0C2328', fontSize: '0.88rem' }}>
                          {appt.appointment_date}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0D9488', fontSize: '0.78rem', marginTop: '0.2rem', fontWeight: 700 }}>
                          <FaClock size={11} /> {appt.appointment_time}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                          ID: #{appt.id}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 0.75rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 800, color: '#0C2328', fontSize: '0.9rem' }}>
                          {appt.patient_name || appt.user?.name || 'Patient'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.25rem', fontSize: '0.76rem', color: '#64748B' }}>
                          {appt.user?.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <FaPhoneAlt size={10} style={{ color: '#0D9488' }} /> {appt.user.phone}
                            </div>
                          )}
                          {appt.user?.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <FaEnvelope size={10} style={{ color: '#0D9488' }} /> {appt.user.email}
                            </div>
                          )}
                          {appt.user?.gender && (
                            <div>
                              {appt.user.gender}{appt.user.age ? `, ${appt.user.age} yrs` : ''}
                            </div>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 0.75rem', verticalAlign: 'top', maxWidth: '280px' }}>
                        <div style={{ fontSize: '0.84rem', color: '#1E293B', fontWeight: 600 }}>
                          {appt.reason || 'General Consultation'}
                        </div>
                        {appt.notes ? (
                          <div style={{
                            marginTop: '0.35rem',
                            padding: '0.35rem 0.55rem',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            color: '#0F766E',
                            whiteSpace: 'pre-line'
                          }}>
                            {appt.notes}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.25rem', fontStyle: 'italic' }}>
                            No clinical notes recorded yet
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 0.75rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          backgroundColor: statusStyles.bg,
                          color: statusStyles.color,
                          display: 'inline-block'
                        }}>
                          {getLabel(`doctorPortal.status${appt.status}`, appt.status)}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 0.75rem', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenConsultationModal(appt)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.4rem 0.75rem',
                              backgroundColor: '#0D9488',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <FaNotesMedical size={11} />
                            {getLabel('doctorPortal.updateNotes', 'Notes / Rx')}
                          </button>

                          {/* Issue Digital Prescription Button */}
                          {(appt.status === 'Confirmed' || appt.status === 'Pending' || appt.status === 'Completed') && (
                            <button
                              type="button"
                              onClick={() => handleOpenRxModal(appt)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.4rem 0.75rem',
                                backgroundColor: '#5B21B6',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title={getLabel('doctorPortal.issuePrescription', 'Issue Digital Clinical Prescription')}
                            >
                              <FaPrescriptionBottleAlt size={11} />
                              {getLabel('doctorPortal.issueRx', 'Issue Rx')}
                            </button>
                          )}

                          {appt.status === 'Pending' && (
                            <button
                              type="button"
                              disabled={actionLoadingId === appt.id}
                              onClick={() => handleQuickStatusChange(appt.id, 'Confirmed')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.4rem 0.65rem',
                                backgroundColor: '#D1FAE5',
                                color: '#047857',
                                border: '1px solid #A7F3D0',
                                borderRadius: '6px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <FaCheck size={10} />
                              {getLabel('doctorPortal.confirmVisit', 'Confirm')}
                            </button>
                          )}

                          {appt.status === 'Confirmed' && (
                            <button
                              type="button"
                              disabled={actionLoadingId === appt.id}
                              onClick={() => handleQuickStatusChange(appt.id, 'Completed')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.4rem 0.65rem',
                                backgroundColor: '#E0F2FE',
                                color: '#0369A1',
                                border: '1px solid #BAE6FD',
                                borderRadius: '6px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <FaCheckCircle size={11} />
                              {getLabel('doctorPortal.completeVisit', 'Complete')}
                            </button>
                          )}

                          {appt.status !== 'Cancelled' && appt.status !== 'Completed' && (
                            <button
                              type="button"
                              disabled={actionLoadingId === appt.id}
                              onClick={() => {
                                if (window.confirm('Are you sure you want to cancel this consultation?')) {
                                  handleQuickStatusChange(appt.id, 'Cancelled');
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.4rem 0.65rem',
                                backgroundColor: '#FEE2E2',
                                color: '#B91C1C',
                                border: '1px solid #FECACA',
                                borderRadius: '6px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <FaBan size={10} />
                              {getLabel('doctorPortal.cancelVisit', 'Cancel')}
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

      {/* Clinical Notes & Prescription Builder Modal */}
      {selectedAppt && (
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
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0'
          }}>
            {/* Header */}
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
                  <FaNotesMedical size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0C2328', margin: 0 }}>
                    {getLabel('doctorPortal.consultationNotes', 'Clinical Notes & Prescription')}
                  </h3>
                  <p style={{ color: '#64748B', fontSize: '0.78rem', margin: 0 }}>
                    {selectedAppt.appointment_date} • {selectedAppt.appointment_time} (ID: #{selectedAppt.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.25rem' }}
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Patient Demographics */}
            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, color: '#0C2328', fontSize: '1rem' }}>
                  {selectedAppt.patient_name || selectedAppt.user?.name || 'Patient'}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0D9488', backgroundColor: '#CCFBF1', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                  {selectedAppt.status}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                {selectedAppt.user?.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaPhoneAlt size={10} style={{ color: '#0D9488' }} /> {selectedAppt.user.phone}
                  </div>
                )}
                {selectedAppt.user?.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaEnvelope size={10} style={{ color: '#0D9488' }} /> {selectedAppt.user.email}
                  </div>
                )}
                {selectedAppt.user?.gender && (
                  <div>{getLabel('doctorPortal.gender', 'Gender')}: <strong>{selectedAppt.user.gender}</strong></div>
                )}
                {selectedAppt.user?.age && (
                  <div>{getLabel('doctorPortal.age', 'Age')}: <strong>{selectedAppt.user.age} yrs</strong></div>
                )}
              </div>
              <div style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid #E2E8F0', fontSize: '0.82rem' }}>
                <strong style={{ color: '#0C2328' }}>{getLabel('doctorPortal.reasonForVisit', 'Chief Complaint')}:</strong> {selectedAppt.reason || 'General Health Consultation'}
              </div>
            </div>

            {/* Assessment Notes */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0C2328', marginBottom: '0.4rem' }}>
                {getLabel('doctorPortal.clinicalAssessment', 'Clinical Assessment & Notes')}:
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={getLabel('doctorPortal.notesPlaceholder', 'Document diagnosis, physical findings, clinical impression, and advice...')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Digital Prescription Builder */}
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.5rem',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <FaPrescriptionBottleAlt size={14} style={{ color: '#0D9488' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0C2328' }}>
                  {getLabel('doctorPortal.prescriptionTitle', 'Digital Prescription')}
                </span>
              </div>

              {/* Add Medicine Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder={getLabel('doctorPortal.medicineNamePlaceholder', 'Medicine name')}
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  style={{ padding: '0.5rem', fontSize: '0.8rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                />
                <input
                  type="text"
                  placeholder="Dosage"
                  value={medDosage}
                  onChange={(e) => setMedDosage(e.target.value)}
                  style={{ padding: '0.5rem', fontSize: '0.8rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                />
                <select
                  value={medFrequency}
                  onChange={(e) => setMedFrequency(e.target.value)}
                  style={{ padding: '0.5rem', fontSize: '0.8rem', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF' }}
                >
                  <option value="1-0-0">1-0-0 (Morning)</option>
                  <option value="1-0-1">1-0-1 (Twice)</option>
                  <option value="1-1-1">1-1-1 (Thrice)</option>
                  <option value="0-0-1">0-0-1 (Night)</option>
                  <option value="SOS">SOS (As needed)</option>
                </select>
                <select
                  value={medTiming}
                  onChange={(e) => setMedTiming(e.target.value)}
                  style={{ padding: '0.5rem', fontSize: '0.8rem', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF' }}
                >
                  <option value="After Food">After Food</option>
                  <option value="Before Food">Before Food</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddMedicine}
                  style={{
                    padding: '0.5rem 0.85rem',
                    background: '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <FaPlus size={10} /> Add
                </button>
              </div>

              {/* Added Medicines List */}
              {prescriptions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {prescriptions.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.75rem',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div>
                        <strong>{p.name}</strong> • {p.dosage} • {p.frequency} • {p.timing}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(p.id)}
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.2rem' }}
                      >
                        <FaTrash size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic' }}>
                  {getLabel('doctorPortal.noMedicinesAdded', 'No medications added yet. Click Add to prescribe drugs.')}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {getLabel('doctorPortal.closeModal', 'Close')}
              </button>

              <button
                type="button"
                disabled={savingNotes}
                onClick={() => handleSaveConsultation(null)}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: '#FFFFFF',
                  border: '1px solid #0D9488',
                  borderRadius: '8px',
                  color: '#0D9488',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: savingNotes ? 'not-allowed' : 'pointer'
                }}
              >
                {getLabel('doctorPortal.saveConsultationRecord', 'Save Clinical Notes')}
              </button>

              {selectedAppt.status !== 'Completed' && (
                <button
                  type="button"
                  disabled={savingNotes}
                  onClick={() => handleSaveConsultation('Completed')}
                  style={{
                    padding: '0.65rem 1.5rem',
                    background: '#0D9488',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: savingNotes ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
                  }}
                >
                  <FaCheckCircle size={14} />
                  {savingNotes
                    ? getLabel('doctorPortal.savingSchedule', 'Saving...')
                    : getLabel('doctorPortal.markAsCompleted', 'Mark as Completed')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Digital Prescription Modal */}
      <DigitalPrescriptionModal
        isOpen={rxModalOpen}
        onClose={() => setRxModalOpen(false)}
        initialData={rxInitialData}
        onSuccess={() => {
          setRxModalOpen(false);
          fetchAppointments();
          toast.success(getLabel('doctorPortal.pdfSuccess', 'Prescription issued successfully.'));
        }}
      />
    </div>
  );
};
