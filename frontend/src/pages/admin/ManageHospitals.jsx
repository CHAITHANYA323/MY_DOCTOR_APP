import React, { useState, useEffect } from 'react';
import { FaHospital, FaPlus, FaEdit, FaTrash, FaMapMarkerAlt, FaStar } from 'react-icons/fa';
import { hospitalService } from '../../services/hospitalService';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { notify } from '../../utils/toast';

export const ManageHospitals = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notification, setNotification] = useState('');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalForm, setModalForm] = useState({
    name: '',
    image: '',
    address: '',
    city: '',
    state: 'Andhra Pradesh',
    phone: '',
    email: '',
    emergency_number: '',
    facilities: '',
    working_hours: '24 Hours / 7 Days',
    rating: 4.8
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const res = await hospitalService.getHospitals({ limit: 100 });
      if (res.success) {
        setHospitals(res.hospitals);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setModalForm({
      name: '',
      image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80',
      address: '',
      city: '',
      state: 'Andhra Pradesh',
      phone: '',
      email: '',
      emergency_number: '',
      facilities: '24/7 Emergency, Cardiac Catheterization Lab, Modern ICU, Advanced Radiology',
      working_hours: '24 Hours / 7 Days',
      rating: 4.8
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (hosp) => {
    setEditingId(hosp.id);
    setModalForm({
      name: hosp.name || '',
      image: hosp.image || '',
      address: hosp.address || '',
      city: hosp.city || '',
      state: hosp.state || '',
      phone: hosp.phone || '',
      email: hosp.email || '',
      emergency_number: hosp.emergency_number || '',
      facilities: Array.isArray(hosp.facilities) ? hosp.facilities.join(', ') : (hosp.facilities || ''),
      working_hours: hosp.working_hours || '24 Hours / 7 Days',
      rating: hosp.rating || 4.8
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.name || !modalForm.address || !modalForm.city || !modalForm.emergency_number) {
      notify.warning('Hospital name, address, city, and emergency number are required.');
      return;
    }

    setFormLoading(true);
    try {
      if (editingId) {
        await hospitalService.updateHospital(editingId, modalForm);
        notify.success('Hospital details updated successfully!');
        setNotification('Hospital details updated successfully!');
      } else {
        await hospitalService.createHospital(modalForm);
        notify.success('New hospital registered in MediConnect network!');
        setNotification('New hospital registered in MediConnect network!');
      }
      setIsModalOpen(false);
      fetchHospitals();
    } catch (err) {
      notify.error(err.response?.data?.message || 'Error saving hospital.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await hospitalService.deleteHospital(deleteTarget.id);
      if (res.success) {
        notify.success(res.message || 'Hospital deleted successfully.');
        setNotification(res.message);
        setDeleteTarget(null);
        fetchHospitals();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to delete hospital.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Hospital Management
          </h1>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>
            Manage network partner hospitals, trauma centers, and clinical facilities
          </p>
        </div>

        <Button onClick={handleOpenAdd} variant="primary">
          <FaPlus /> Register New Hospital
        </Button>
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

      {/* Table */}
      <div className="table-responsive card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading hospitals...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Hospital Name</th>
                <th>Location</th>
                <th>Emergency Number</th>
                <th>Doctors</th>
                <th>Rating</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map((hosp) => (
                <tr key={hosp.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <img 
                        src={hosp.image} 
                        alt={hosp.name} 
                        style={{ width: 44, height: 44, borderRadius: '8px', objectFit: 'cover' }} 
                      />
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--slate-900)', display: 'block' }}>
                          {hosp.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                          {hosp.working_hours}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <FaMapMarkerAlt size={12} color="var(--primary)" />
                      <span>{hosp.city}, {hosp.state}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.85rem' }}>
                      {hosp.emergency_number}
                    </span>
                  </td>
                  <td>
                    <Badge variant="info">
                      {hosp.doctor_count || 0} Doctors
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center gap-1" style={{ color: '#f59e0b', fontWeight: 700 }}>
                      <FaStar size={12} />
                      <span>{hosp.rating}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenEdit(hosp)}
                      >
                        <FaEdit /> Edit
                      </Button>
                      <Button 
                        size="sm"
                        variant="danger"
                        onClick={() => setDeleteTarget(hosp)}
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Hospital Add / Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Hospital Details' : 'Register New Hospital'}
        size="md"
      >
        <form onSubmit={handleFormSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Hospital Name *</label>
              <input 
                type="text" 
                value={modalForm.name}
                onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">City *</label>
              <input 
                type="text" 
                value={modalForm.city}
                onChange={(e) => setModalForm({ ...modalForm, city: e.target.value })}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Complete Street Address *</label>
            <input 
              type="text" 
              value={modalForm.address}
              onChange={(e) => setModalForm({ ...modalForm, address: e.target.value })}
              required
              className="form-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Emergency Number *</label>
              <input 
                type="text" 
                value={modalForm.emergency_number}
                onChange={(e) => setModalForm({ ...modalForm, emergency_number: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">General Reception Phone</label>
              <input 
                type="text" 
                value={modalForm.phone}
                onChange={(e) => setModalForm({ ...modalForm, phone: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Image URL</label>
            <input 
              type="url" 
              value={modalForm.image}
              onChange={(e) => setModalForm({ ...modalForm, image: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Facilities (Comma Separated)</label>
            <textarea 
              rows="2"
              value={modalForm.facilities}
              onChange={(e) => setModalForm({ ...modalForm, facilities: e.target.value })}
              className="form-textarea"
            />
          </div>

          <div className="flex items-center justify-end gap-3" style={{ marginTop: '1.5rem' }}>
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              loading={formLoading}
            >
              Save Hospital
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationModal 
        isOpen={!!deleteTarget}
        title="Delete Hospital"
        message={`Are you sure you want to delete ${deleteTarget?.name}? All affiliated doctors should be reassigned first.`}
        confirmText="Yes, Delete Hospital"
        cancelText="Cancel"
        isDanger={true}
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
