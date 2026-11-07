import React, { useState, useEffect } from 'react';
import { FaCalendarCheck, FaSearch } from 'react-icons/fa';
import { appointmentService } from '../../services/appointmentService';
import { notify } from '../../utils/toast';
import { Badge } from '../../components/common/Badge';

export const ManageAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState('');

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = statusFilter === 'All' ? {} : { status: statusFilter };
      const res = await appointmentService.getAppointments(params);
      if (res.success) {
        setAppointments(res.appointments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await appointmentService.updateAppointmentStatus(id, newStatus);
      notify.success(`Appointment #${id} updated to ${newStatus}.`);
      setNotification(`Appointment #${id} updated to ${newStatus}.`);
      fetchAppointments();
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const filtered = appointments.filter((a) => {
    const term = search.toLowerCase();
    return (
      a.patient_name?.toLowerCase().includes(term) ||
      a.doctor_name?.toLowerCase().includes(term) ||
      a.hospital_name?.toLowerCase().includes(term) ||
      String(a.id).includes(term)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            All Patient Appointments
          </h1>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>
            Review, confirm, and update the status of patient consultations across all network hospitals
          </p>
        </div>
      </div>

      {notification && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--primary-light)',
          color: 'var(--primary-dark)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{notification}</span>
          <button onClick={() => setNotification('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
          <input 
            type="text" 
            placeholder="Search patient, doctor, hospital or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className="btn btn-sm"
              style={{
                backgroundColor: statusFilter === tab ? 'var(--primary)' : 'var(--slate-100)',
                color: statusFilter === tab ? 'white' : 'var(--slate-700)',
                fontWeight: 600
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading appointments...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <FaCalendarCheck size={36} color="var(--slate-300)" style={{ marginBottom: '0.5rem' }} />
            <p>No appointments found matching this filter.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Appt #</th>
                <th>Patient Details</th>
                <th>Doctor</th>
                <th>Hospital</th>
                <th>Date & Time</th>
                <th>Reason</th>
                <th>Fee</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Update Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((appt) => (
                <tr key={appt.id}>
                  <td style={{ fontWeight: 700 }}>#{appt.id}</td>
                  <td>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--slate-900)', display: 'block' }}>
                        {appt.patient_name}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                        {appt.patient_phone || appt.patient_email}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{appt.doctor_name}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--primary)' }}>
                      {appt.specialization}
                    </span>
                  </td>
                  <td>{appt.hospital_name}</td>
                  <td>
                    <span style={{ fontWeight: 600, display: 'block' }}>{appt.appointment_date}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>{appt.appointment_time}</span>
                  </td>
                  <td style={{ maxWidth: '200px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {appt.reason}
                  </td>
                  <td style={{ fontWeight: 700 }}>₹{appt.consultation_fee}</td>
                  <td>
                    <Badge status={appt.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <select 
                      value={appt.status}
                      onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                      className="form-select"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
