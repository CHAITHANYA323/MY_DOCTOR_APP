import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaUserMd, 
  FaHospital, 
  FaUsers, 
  FaCalendarCheck, 
  FaClock, 
  FaAmbulance, 
  FaCheckCircle, 
  FaArrowRight, 
  FaPlus,
  FaStethoscope
} from 'react-icons/fa';
import { dashboardService } from '../../services/dashboardService';
import { appointmentService } from '../../services/appointmentService';
import { notify } from '../../utils/toast';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getAdminStats();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Error fetching admin statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await appointmentService.updateAppointmentStatus(appointmentId, newStatus);
      notify.success(`Appointment #${appointmentId} updated to ${newStatus}`);
      fetchStats();
    } catch (err) {
      notify.error(err.response?.data?.message || 'Error updating status');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading Admin Analytics...</div>;
  }

  const metrics = data?.metrics || {};

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            System Analytics & Operations
          </h1>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>
            Real-time medical network overview, appointment bookings, and emergency ambulance status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button as={Link} to="/admin/doctors/add" size="sm" variant="primary">
            <FaPlus /> Add Doctor
          </Button>
          <Button as={Link} to="/admin/hospitals" size="sm" variant="secondary">
            <FaHospital /> Manage Hospitals
          </Button>
        </div>
      </div>

      {/* 7 Key Metric Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem'
      }}>
        {/* Doctors */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600 }}>Total Doctors</span>
            <FaUserMd color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            {metrics.total_doctors || 0}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>Active specialists</span>
        </div>

        {/* Hospitals */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600 }}>Total Hospitals</span>
            <FaHospital color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            {metrics.total_hospitals || 0}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Partner institutions</span>
        </div>

        {/* Registered Patients */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600 }}>Registered Users</span>
            <FaUsers color="var(--secondary)" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            {metrics.total_users || 0}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Patient profiles</span>
        </div>

        {/* Appointments */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600 }}>Appointments</span>
            <FaCalendarCheck color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            {metrics.total_appointments || 0}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Total booked</span>
        </div>

        {/* Pending */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600 }}>Pending Review</span>
            <FaClock color="var(--warning)" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            {metrics.pending_appointments || 0}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>Awaiting action</span>
        </div>

        {/* Ambulances */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600 }}>Total Fleet</span>
            <FaAmbulance color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            {metrics.total_ambulances || 0}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Emergency vehicles</span>
        </div>

        {/* Available Ambulances */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600 }}>Available Fleet</span>
            <FaCheckCircle color="var(--success)" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            {metrics.available_ambulances || 0}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>Ready for dispatch</span>
        </div>
      </div>

      {/* Visual Charts & Breakdowns (2 Columns) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '1.75rem',
        marginBottom: '2.5rem'
      }} className="admin-charts-grid">

        {/* Chart 1: Appointment Status Distribution */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '1.25rem' }}>
            Appointment Status Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(data?.status_distribution || []).map((st, i) => {
              const totalAppts = metrics.total_appointments || 1;
              const pct = Math.round((st.count / totalAppts) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--slate-700)' }}>{st.status}</span>
                    <span style={{ color: 'var(--slate-500)', fontWeight: 700 }}>
                      {st.count} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'var(--slate-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: st.color,
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.8s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Specialization Distribution */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '1.25rem' }}>
            Specialization Distribution
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {(data?.specialization_stats || []).map((spec, i) => (
              <div key={i} className="flex items-center justify-between" style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: 'var(--slate-50)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem'
              }}>
                <div className="flex items-center gap-2">
                  <FaStethoscope color="var(--primary)" size={13} />
                  <span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{spec.name}</span>
                </div>
                <Badge variant="info">
                  {spec.count} Doctors
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Appointments Data Table */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              Recent Patient Appointments
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>Live booking triage and status updates</p>
          </div>
          <Button as={Link} to="/admin/appointments" size="sm" variant="outline">
            View All <FaArrowRight size={10} />
          </Button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Appt #</th>
                <th>Patient Name</th>
                <th>Doctor</th>
                <th>Hospital</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Update Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_appointments || []).map((appt) => (
                <tr key={appt.id}>
                  <td style={{ fontWeight: 700 }}>#{appt.id}</td>
                  <td style={{ fontWeight: 600 }}>{appt.patient_name}</td>
                  <td>{appt.doctor_name}</td>
                  <td>{appt.hospital_name}</td>
                  <td>{appt.appointment_date} at {appt.appointment_time}</td>
                  <td>
                    <Badge status={appt.status} />
                  </td>
                  <td>
                    <select
                      value={appt.status}
                      onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                      className="form-select"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
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
        </div>
      </div>

      {/* Recent Emergency Ambulance Requests Table */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              Emergency Ambulance Requests
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>Incoming SOS triage requests</p>
          </div>
          <Button as={Link} to="/admin/ambulances" size="sm" variant="outline">
            Manage Fleet & Requests
          </Button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Req ID</th>
                <th>Patient</th>
                <th>Contact</th>
                <th>Emergency Type</th>
                <th>Pickup Location</th>
                <th>Destination</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_ambulance_requests || []).map((req) => (
                <tr key={req.id}>
                  <td style={{ fontWeight: 700 }}>#{req.id}</td>
                  <td style={{ fontWeight: 600 }}>{req.patient_name}</td>
                  <td><a href={`tel:${req.phone}`} style={{ color: 'var(--primary)' }}>{req.phone}</a></td>
                  <td>
                    <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.82rem' }}>
                      {req.emergency_type}
                    </span>
                  </td>
                  <td style={{ maxWidth: '200px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {req.pickup_location}
                  </td>
                  <td>{req.destination_hospital}</td>
                  <td>
                    <Badge status={req.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .admin-charts-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};
