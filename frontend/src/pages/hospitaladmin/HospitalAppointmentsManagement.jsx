import React, { useState, useEffect } from 'react';
import {
  FaCalendarCheck,
  FaClock,
  FaUserMd,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaFilter,
  FaSearch
} from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import { ecosystemService } from '../../services/ecosystemService';
import { notify } from '../../utils/toast';

export const HospitalAppointmentsManagement = () => {
  const { isTelugu } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [search, setSearch] = useState('');

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedDoctor) params.doctor_id = selectedDoctor;
      if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedDate) params.date = selectedDate;

      const [apptRes, docRes] = await Promise.all([
        ecosystemService.getHospitalAdminAppointments(params),
        ecosystemService.getHospitalAdminDoctors()
      ]);

      if (apptRes.success) {
        setAppointments(apptRes.appointments || []);
      }
      if (docRes.success) {
        setDoctors(docRes.doctors || []);
      }
    } catch (err) {
      console.error('Error loading appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDoctor, selectedStatus, selectedDate]);

  const handleUpdateStatus = async (apptId, newStatus) => {
    try {
      const res = await ecosystemService.updateHospitalAdminAppointmentStatus(apptId, newStatus);
      if (res.success) {
        notify.success(res.message || `Appointment status updated to ${newStatus}`);
        fetchAppointments();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const filtered = appointments.filter(a =>
    (a.patient_name || a.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.doctor_name || a.doctor?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.reason || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
            {isTelugu ? 'అపాయింట్‌మెంట్ల నిర్వహణ' : 'Manage Appointments'}
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem' }}>
            {isTelugu
              ? 'రోగుల అపాయింట్‌మెంట్లు, స్థితి నిర్ధారణ మరియు డాక్టర్ కేటాయింపులను నిర్వహించండి.'
              : 'View, confirm, and update patient appointments across all hospital departments.'}
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder={isTelugu ? 'రోగి / కారణం శోధించండి...' : 'Search patient or reason...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
          />
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '0.85rem 1rem',
        border: '1px solid #e2e8f0',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.82rem', fontWeight: 700 }}>
          <FaFilter /> <span>{isTelugu ? 'ఫిల్టర్లు:' : 'Filters:'}</span>
        </div>

        {/* Doctor Filter */}
        <select
          value={selectedDoctor}
          onChange={(e) => setSelectedDoctor(e.target.value)}
          style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', backgroundColor: '#f8fafc' }}
        >
          <option value="">{isTelugu ? 'అన్ని వైద్యుల బృందాలు' : 'All Doctors'}</option>
          {doctors.map(d => (
            <option key={d.id} value={d.id}>{d.name} ({d.specialization_name || 'Doctor'})</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', backgroundColor: '#f8fafc' }}
        >
          <option value="all">{isTelugu ? 'అన్ని అపాయింట్‌మెంట్లు' : 'All Appointments'}</option>
          <option value="Pending">{isTelugu ? 'ఆమోదం కోసం వేచి ఉన్నవి (పెండింగ్)' : 'Waiting for Approval (Pending)'}</option>
          <option value="Confirmed">{isTelugu ? 'ధృవీకరించబడినవి' : 'Confirmed'}</option>
          <option value="Completed">{isTelugu ? 'పూర్తయినవి' : 'Completed'}</option>
          <option value="Cancelled">{isTelugu ? 'రద్దయినవి' : 'Cancelled'}</option>
        </select>

        {/* Date Filter */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }}
        />

        {(selectedDoctor || selectedStatus !== 'all' || selectedDate) && (
          <button
            onClick={() => { setSelectedDoctor(''); setSelectedStatus('all'); setSelectedDate(''); }}
            style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
          >
            {isTelugu ? 'రీసెట్' : 'Reset'}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#1d4ed8' }}>Loading Consultations...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          {isTelugu ? 'అపాయింట్‌మెంట్లు కనుగొనబడలేదు.' : 'No appointments matching selected filters.'}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 780 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.9rem 1.25rem' }}>{isTelugu ? 'రోగి వివరాలు' : 'Patient'}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{isTelugu ? 'వైద్యుడు' : 'Clinician'}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{isTelugu ? 'తేదీ & సమయం' : 'Date & Time'}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{isTelugu ? 'సమస్య / కారణం' : 'Chief Complaint'}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{isTelugu ? 'స్థితి' : 'Status'}</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>{isTelugu ? 'చర్య' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const statusColors = {
                    Pending: { bg: '#fff7ed', text: '#ea580c' },
                    Confirmed: { bg: '#eff6ff', text: '#2563eb' },
                    Completed: { bg: '#f0fdf4', text: '#16a34a' },
                    Cancelled: { bg: '#fef2f2', text: '#dc2626' }
                  }[a.status] || { bg: '#f1f5f9', text: '#475569' };

                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>
                          {a.patient_name || a.user?.name || `Patient #${a.user_id}`}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          ID: #{a.id}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                          {a.doctor_name || a.doctor?.name || `Doctor #${a.doctor_id}`}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#0284c7' }}>
                          {a.specialization_name || a.doctor?.specialization_name || ''}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                          📅 {a.appointment_date}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          ⏰ {a.appointment_time}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.82rem', color: '#334155', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.reason || 'General checkup'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          backgroundColor: statusColors.bg,
                          color: statusColors.text,
                          padding: '0.2rem 0.65rem',
                          borderRadius: '100px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          {a.status === 'Pending' && (
                            <button
                              onClick={() => handleUpdateStatus(a.id, 'Confirmed')}
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              Confirm
                            </button>
                          )}
                          {a.status !== 'Completed' && a.status !== 'Cancelled' && (
                            <button
                              onClick={() => handleUpdateStatus(a.id, 'Completed')}
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              Complete
                            </button>
                          )}
                          {a.status !== 'Cancelled' && a.status !== 'Completed' && (
                            <button
                              onClick={() => handleUpdateStatus(a.id, 'Cancelled')}
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
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
        </div>
      )}
    </div>
  );
};
