import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaAmbulance, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaPhoneAlt, 
  FaMapMarkerAlt, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaCheck,
  FaTimesCircle,
  FaUndo
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { ambulanceService } from '../../services/ambulanceService';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export const ManageAmbulances = () => {
  const [ambulances, setAmbulances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fleet'); // 'fleet' or 'requests'

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

  // Assign & Dispatch / Reassign Modal State
  const [assignModal, setAssignModal] = useState({
    isOpen: false,
    request: null,
    mode: 'dispatch', // 'dispatch' or 'reassign'
    selectedAmbulanceId: ''
  });

  // Admin Request Cancellation Target
  const [cancelRequestTarget, setCancelRequestTarget] = useState(null);

  // Admin Unassignment Target
  const [unassignTarget, setUnassignTarget] = useState(null);

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      toast.error('Please fill all required vehicle fields.');
      return;
    }

    setActionLoading(true);
    try {
      if (editingId) {
        await ambulanceService.updateAmbulance(editingId, form);
        toast.success('Ambulance vehicle details updated!');
      } else {
        await ambulanceService.createAmbulance(form);
        toast.success('New emergency ambulance added to fleet!');
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving ambulance.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAmbulance = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await ambulanceService.deleteAmbulance(deleteTarget.id);
      toast.success(`Ambulance ${deleteTarget.vehicle_number} removed from fleet.`);
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete ambulance.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRequest = async (reqId, payload, successMsg) => {
    setActionLoading(true);
    try {
      const res = await ambulanceService.updateRequestStatus(reqId, payload);
      if (res.success) {
        toast.success(successMsg || res.message || 'Request status updated.');
        await fetchData();
      } else {
        toast.error(res.message || 'Could not update request.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAssignModal = (req, mode = 'dispatch') => {
    const available = ambulances.filter(a => a.status === 'Available');
    setAssignModal({
      isOpen: true,
      request: req,
      mode,
      selectedAmbulanceId: available.length > 0 ? String(available[0].id) : ''
    });
  };

  const handleConfirmAssign = async () => {
    if (!assignModal.request || !assignModal.selectedAmbulanceId) return;
    const ambId = Number(assignModal.selectedAmbulanceId);
    const reqId = assignModal.request.id;

    if (assignModal.mode === 'dispatch') {
      await handleUpdateRequest(
        reqId, 
        { status: 'Dispatched', assigned_ambulance_id: ambId },
        `Ambulance assigned and dispatched for Request #${reqId}!`
      );
    } else {
      await handleUpdateRequest(
        reqId, 
        { assigned_ambulance_id: ambId },
        `Ambulance reassigned for Request #${reqId}!`
      );
    }
    setAssignModal({ isOpen: false, request: null, mode: 'dispatch', selectedAmbulanceId: '' });
  };

  const handleConfirmUnassign = async () => {
    if (!unassignTarget) return;
    const reqId = unassignTarget.id;
    await handleUpdateRequest(
      reqId,
      { status: 'Pending', assigned_ambulance_id: null },
      `Ambulance unassigned. Request #${reqId} returned to Pending.`
    );
    setUnassignTarget(null);
  };

  const handleConfirmCancelRequest = async () => {
    if (!cancelRequestTarget) return;
    const reqId = cancelRequestTarget.id;
    await handleUpdateRequest(
      reqId,
      { status: 'Cancelled' },
      `Request #${reqId} cancelled.`
    );
    setCancelRequestTarget(null);
  };

  const availableAmbulances = ambulances.filter(a => a.status === 'Available');

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
                        req.status === 'Arrived' ? 'badge-arrived' :
                        req.status === 'Completed' ? 'badge-completed' :
                        req.status === 'Cancelled' ? 'badge-cancelled' : 'badge-pending'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {/* State-aware dispatch controls */}
                      {req.status === 'Pending' && (
                        <div className="flex items-center justify-end gap-2" style={{ flexWrap: 'wrap' }}>
                          <button 
                            type="button"
                            onClick={() => handleOpenAssignModal(req, 'dispatch')}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            <FaAmbulance size={11} style={{ marginRight: '3px' }} /> Assign & Dispatch
                          </button>
                          <button 
                            type="button"
                            onClick={() => setCancelRequestTarget(req)}
                            className="btn btn-sm"
                            style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {req.status === 'Dispatched' && (
                        <div className="flex items-center justify-end gap-2" style={{ flexWrap: 'wrap' }}>
                          <button 
                            type="button"
                            onClick={() => handleUpdateRequest(req.id, { status: 'Arrived' }, `Request #${req.id} marked as Arrived.`)}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            <FaCheck size={11} style={{ marginRight: '3px' }} /> Arrived
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleOpenAssignModal(req, 'reassign')}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            <FaEdit size={11} style={{ marginRight: '3px' }} /> Reassign
                          </button>
                          <button 
                            type="button"
                            onClick={() => setUnassignTarget(req)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            <FaUndo size={10} style={{ marginRight: '3px' }} /> Unassign
                          </button>
                          <button 
                            type="button"
                            onClick={() => setCancelRequestTarget(req)}
                            className="btn btn-sm"
                            style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {req.status === 'Arrived' && (
                        <div className="flex items-center justify-end gap-2" style={{ flexWrap: 'wrap' }}>
                          <button 
                            type="button"
                            onClick={() => handleUpdateRequest(req.id, { status: 'Completed' }, `Emergency request #${req.id} marked as Completed.`)}
                            className="btn btn-sm"
                            style={{ backgroundColor: '#10b981', color: 'white', fontWeight: 700, fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            <FaCheckCircle size={11} style={{ marginRight: '3px' }} /> Mark Completed
                          </button>
                          <button 
                            type="button"
                            onClick={() => setCancelRequestTarget(req)}
                            className="btn btn-sm"
                            style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {(req.status === 'Completed' || req.status === 'Cancelled') && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)', fontStyle: 'italic' }}>
                          Immutable ({req.status})
                        </span>
                      )}
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

              <div className="form-grid-2col" style={{ gap: '1rem' }}>
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

              <div className="form-grid-2col" style={{ gap: '1rem' }}>
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

      {/* Assign & Dispatch / Reassign Ambulance Modal */}
      {assignModal.isOpen && (
        <div className="modal-overlay" onClick={() => setAssignModal({ isOpen: false, request: null, mode: 'dispatch', selectedAmbulanceId: '' })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--slate-900)' }}>
              {assignModal.mode === 'reassign' ? 'Reassign Ambulance Vehicle' : 'Assign & Dispatch Ambulance'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>
              Request #{assignModal.request?.id} &bull; Patient: <strong>{assignModal.request?.patient_name}</strong>
            </p>

            <div style={{ backgroundColor: 'var(--slate-50)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div><strong>Pickup:</strong> {assignModal.request?.pickup_location}</div>
              <div style={{ marginTop: '0.25rem' }}><strong>Hospital:</strong> {assignModal.request?.destination_hospital}</div>
              <div style={{ marginTop: '0.25rem' }}><strong>Emergency:</strong> {assignModal.request?.emergency_type} ({assignModal.request?.patients_count} patient(s))</div>
            </div>

            {availableAmbulances.length === 0 ? (
              <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', color: '#991b1b', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                <FaExclamationTriangle style={{ marginRight: '0.4rem' }} />
                No fleet ambulances are currently <strong>Available</strong>. All vehicles are On Duty or in Maintenance.
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Select Available Ambulance Vehicle *</label>
                <select 
                  value={assignModal.selectedAmbulanceId}
                  onChange={(e) => setAssignModal({ ...assignModal, selectedAmbulanceId: e.target.value })}
                  className="form-select"
                >
                  {availableAmbulances.map((amb) => (
                    <option key={amb.id} value={amb.id}>
                      {amb.vehicle_number} - {amb.driver_name} ({amb.ambulance_type}) [{amb.current_location}]
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setAssignModal({ isOpen: false, request: null, mode: 'dispatch', selectedAmbulanceId: '' })}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="button" 
                disabled={actionLoading || availableAmbulances.length === 0 || !assignModal.selectedAmbulanceId}
                onClick={handleConfirmAssign}
                className="btn btn-primary"
              >
                {actionLoading ? 'Dispatching...' : assignModal.mode === 'reassign' ? 'Confirm Reassignment' : 'Confirm & Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unassign Confirmation Modal */}
      <ConfirmationModal 
        isOpen={!!unassignTarget}
        title="Unassign Ambulance Vehicle"
        message={`Are you sure you want to unassign ambulance from request #${unassignTarget?.id}? The vehicle will be released to Available status, and the request will return to Pending.`}
        confirmText="Yes, Unassign Vehicle"
        cancelText="Keep Dispatched"
        isDanger={false}
        loading={actionLoading}
        onConfirm={handleConfirmUnassign}
        onCancel={() => setUnassignTarget(null)}
      />

      {/* Cancel Request Confirmation Modal */}
      <ConfirmationModal 
        isOpen={!!cancelRequestTarget}
        title="Cancel Emergency Request"
        message={`Are you sure you want to cancel request #${cancelRequestTarget?.id}? This will transition the request to terminal Cancelled status and release any assigned ambulance back to Available.`}
        confirmText="Yes, Cancel Request"
        cancelText="Keep Active"
        isDanger={true}
        loading={actionLoading}
        onConfirm={handleConfirmCancelRequest}
        onCancel={() => setCancelRequestTarget(null)}
      />

      {/* Delete Ambulance Confirmation Modal */}
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
