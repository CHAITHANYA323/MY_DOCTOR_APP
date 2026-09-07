import React, { useState, useEffect } from 'react';
import { 
  FaAmbulance, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaPhoneAlt, 
  FaMapMarkerAlt, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaCheck
} from 'react-icons/fa';
import { ambulanceService } from '../../services/ambulanceService';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export const ManageAmbulances = () => {
  const [ambulances, setAmbulances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fleet'); // 'fleet' or 'requests'
  const [notification, setNotification] = useState('');

  // Add / Edit Ambulance State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    ambulance_type: 'Basic Life Support',
    current_location: '',
    status: 'Available'
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fleetRes, reqsRes] = await Promise.all([
        ambulanceService.getAmbulances(),
        ambulanceService.getAmbulanceRequests()
      ]);
      if (fleetRes.success) setAmbulances(fleetRes.ambulances);
      if (reqsRes.success) setRequests(reqsRes.requests);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      vehicle_number: '',
      driver_name: '',
      driver_phone: '',
      ambulance_type: 'Basic Life Support',
      current_location: 'Health City, Visakhapatnam',
      status: 'Available'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (amb) => {
    setEditingId(amb.id);
    setForm({
      vehicle_number: amb.vehicle_number || '',
      driver_name: amb.driver_name || '',
      driver_phone: amb.driver_phone || '',
      ambulance_type: amb.ambulance_type || 'Basic Life Support',
      current_location: amb.current_location || '',
      status: amb.status || 'Available'
    });
    setIsModalOpen(true);
  };

  const handleSaveAmbulance = async (e) => {
    e.preventDefault();
    if (!form.vehicle_number || !form.driver_name || !form.driver_phone || !form.current_location) {
      alert('Please fill all required vehicle fields.');
      return;
    }

    setActionLoading(true);
    try {
      if (editingId) {
        await ambulanceService.updateAmbulance(editingId, form);
        setNotification('Ambulance vehicle details updated!');
      } else {
        await ambulanceService.createAmbulance(form);
        setNotification('New emergency ambulance added to fleet!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving ambulance.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAmbulance = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await ambulanceService.deleteAmbulance(deleteTarget.id);
      setNotification(`Ambulance ${deleteTarget.vehicle_number} removed.`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      alert('Failed to delete ambulance.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestStatusChange = async (reqId, newStatus) => {
    try {
      await ambulanceService.updateRequestStatus(reqId, newStatus);
      setNotification(`Request #${reqId} status updated to ${newStatus}.`);
      fetchData();
    } catch (err) {
      alert('Failed to update request status.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Ambulance & Emergency Dispatch
          </h1>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>
            Manage ambulance fleet, monitor live driver stations, and handle incoming emergency SOS calls
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('fleet')}
            className={`btn btn-sm ${activeTab === 'fleet' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <FaAmbulance /> Fleet Vehicles ({ambulances.length})
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`btn btn-sm ${activeTab === 'requests' ? 'btn-emergency' : 'btn-secondary'}`}
          >
            🚨 Emergency Requests ({requests.length})
          </button>
          <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
            <FaPlus /> Add Vehicle
          </button>
        </div>
      </div>

      {notification && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--success-light)',
          color: '#065f46',
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

      {/* Tab 1: Fleet Management */}
      {activeTab === 'fleet' && (
        <div className="table-responsive card">
          {loading ? (
            <div style={{ padding: '2rem' }}>Loading ambulance fleet...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle Number</th>
                  <th>Type</th>
                  <th>Driver Name</th>
                  <th>Driver Phone</th>
                  <th>Current Base Location</th>
                  <th>Fleet Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ambulances.map((amb) => (
                  <tr key={amb.id}>
                    <td style={{ fontWeight: 800, color: 'var(--slate-900)' }}>
                      {amb.vehicle_number}
                    </td>
                    <td>{amb.ambulance_type}</td>
                    <td>{amb.driver_name}</td>
                    <td>
                      <a href={`tel:${amb.driver_phone}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        {amb.driver_phone}
                      </a>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <FaMapMarkerAlt size={12} color="var(--primary)" />
                        <span>{amb.current_location}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        amb.status === 'Available' ? 'badge-available' :
                        amb.status === 'On Duty' ? 'badge-on-duty' : 'badge-maintenance'
                      }`}>
                        {amb.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEdit(amb)}
                          className="btn btn-secondary btn-sm"
                        >
                          <FaEdit /> Edit
                        </button>
                        <button 
                          onClick={() => setDeleteTarget(amb)}
                          className="btn btn-sm"
                          style={{ backgroundColor: 'var(--emergency-light)', color: 'var(--emergency)', border: '1px solid var(--emergency-border)' }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Incoming Emergency Requests */}
      {activeTab === 'requests' && (
        <div className="table-responsive card">
          {loading ? (
            <div style={{ padding: '2rem' }}>Loading emergency requests...</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <FaAmbulance size={36} color="var(--slate-300)" style={{ marginBottom: '0.5rem' }} />
              <p>No active ambulance requests at this moment.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Req #</th>
                  <th>Patient Details</th>
                  <th>Emergency Type</th>
                  <th>Pickup Location</th>
                  <th>Destination Hospital</th>
                  <th>Dispatched Vehicle</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 800 }}>#{req.id}</td>
                    <td>
                      <span style={{ fontWeight: 700, display: 'block' }}>{req.patient_name}</span>
                      <a href={`tel:${req.phone}`} style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                        {req.phone}
                      </a>
                    </td>
                    <td>
                      <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.85rem' }}>
                        {req.emergency_type}
                      </span>
                    </td>
                    <td style={{ maxWidth: '220px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {req.pickup_location}
                    </td>
                    <td>{req.destination_hospital}</td>
                    <td>
                      {req.assigned_ambulance ? (
                        <span style={{ fontWeight: 700, color: 'var(--slate-800)' }}>
                          {req.assigned_ambulance.vehicle_number} ({req.assigned_ambulance.driver_name})
                        </span>
                      ) : (
                        <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>None Assigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${
                        req.status === 'Dispatched' ? 'badge-on-duty' :
                        req.status === 'Completed' ? 'badge-completed' :
                        req.status === 'Cancelled' ? 'badge-cancelled' : 'badge-pending'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <select 
                        value={req.status}
                        onChange={(e) => handleRequestStatusChange(req.id, e.target.value)}
                        className="form-select"
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Dispatched">Dispatched</option>
                        <option value="Arrived">Arrived</option>
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
      )}

      {/* Add / Edit Ambulance Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--slate-900)' }}>
              {editingId ? 'Edit Fleet Vehicle' : 'Add Emergency Ambulance'}
            </h3>

            <form onSubmit={handleSaveAmbulance}>
              <div className="form-group">
                <label className="form-label">Vehicle Registration Number *</label>
                <input 
                  type="text" 
                  placeholder="e.g. AP31-AB-1080"
                  value={form.vehicle_number}
                  onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                  required
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Driver Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Ramesh Babu"
                    value={form.driver_name}
                    onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Driver Contact Phone *</label>
                  <input 
                    type="tel" 
                    placeholder="+91 94401 23456"
                    value={form.driver_phone}
                    onChange={(e) => setForm({ ...form, driver_phone: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Ambulance Category</label>
                  <select 
                    value={form.ambulance_type}
                    onChange={(e) => setForm({ ...form, ambulance_type: e.target.value })}
                    className="form-select"
                  >
                    <option value="Basic Life Support">Basic Life Support (BLS)</option>
                    <option value="Advanced Life Support">Advanced Life Support (ALS)</option>
                    <option value="ICU Ambulance">ICU Mobile Ambulance</option>
                    <option value="Patient Transport">Patient Transport</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="form-select"
                  >
                    <option value="Available">Available</option>
                    <option value="On Duty">On Duty</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Current Base Location / Landmark *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Health City, Visakhapatnam"
                  value={form.current_location}
                  onChange={(e) => setForm({ ...form, current_location: e.target.value })}
                  required
                  className="form-input"
                />
              </div>

              <div className="flex items-center justify-end gap-3" style={{ marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="btn btn-primary"
                >
                  {actionLoading ? 'Saving...' : 'Save Ambulance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal 
        isOpen={!!deleteTarget}
        title="Remove Vehicle"
        message={`Are you sure you want to delete ambulance ${deleteTarget?.vehicle_number} from the emergency fleet?`}
        confirmText="Yes, Delete Vehicle"
        cancelText="Cancel"
        isDanger={true}
        loading={actionLoading}
        onConfirm={handleDeleteAmbulance}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
