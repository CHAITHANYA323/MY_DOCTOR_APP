import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaUserMd, 
  FaPlus, 
  FaSearch, 
  FaEdit, 
  FaTrash, 
  FaStar
} from 'react-icons/fa';
import { doctorService } from '../../services/doctorService';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { notify } from '../../utils/toast';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const ManageDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notification, setNotification] = useState('');

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await doctorService.getDoctors({
        search,
        status: 'all', // Show active and inactive
        limit: 100
      });
      if (res.success) {
        setDoctors(res.doctors);
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [search]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await doctorService.deleteDoctor(deleteTarget.id);
      if (res.success) {
        notify.success(res.message || 'Doctor deleted successfully.');
        setNotification(res.message);
        setDeleteTarget(null);
        fetchDoctors();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to delete doctor.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleStatus = async (doctor) => {
    const newStatus = doctor.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await doctorService.updateDoctor(doctor.id, { status: newStatus });
      notify.success(`Dr. ${doctor.name} status updated to ${newStatus}`);
      fetchDoctors();
    } catch (err) {
      notify.error('Failed to update doctor status');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Doctor Management
          </h1>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>
            Manage medical staff directory, qualifications, fees and clinic schedules
          </p>
        </div>

        <Button as={Link} to="/admin/doctors/add" variant="primary">
          <FaPlus /> Add New Doctor
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

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
          <input 
            type="text" 
            placeholder="Filter by doctor name, specialty, hospital..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        <span style={{ fontSize: '0.88rem', color: 'var(--slate-500)', whiteSpace: 'nowrap' }}>
          Total: <strong>{doctors.length} Doctors</strong>
        </span>
      </div>

      {/* Table */}
      <div className="table-responsive card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading doctors...</div>
        ) : doctors.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <FaUserMd size={36} color="var(--slate-300)" style={{ marginBottom: '0.5rem' }} />
            <p>No doctors found matching "{search}".</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialization</th>
                <th>Hospital & City</th>
                <th>Exp.</th>
                <th>Fee</th>
                <th>Rating</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <img 
                        src={doc.image} 
                        alt={doc.name} 
                        style={{ width: 44, height: 44, borderRadius: '10px', objectFit: 'cover' }} 
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <Link to={`/doctors/${doc.id}`} target="_blank" style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                            {doc.name}
                          </Link>
                          {doc.is_verified ? (
                            <span style={{ fontSize: '0.68rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              Verified
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.68rem', backgroundColor: '#f1f5f9', color: '#64748b', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              Demo
                            </span>
                          )}
                        </div>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                          {doc.qualification}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-confirmed" style={{ fontSize: '0.75rem' }}>
                      {doc.specialization_name}
                    </span>
                  </td>
                  <td>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--slate-800)', display: 'block', fontSize: '0.85rem' }}>
                        {doc.hospital_name}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                        {doc.location}
                      </span>
                    </div>
                  </td>
                  <td>{doc.experience} yrs</td>
                  <td style={{ fontWeight: 700, color: 'var(--slate-900)' }}>₹{doc.consultation_fee}</td>
                  <td>
                    <div className="flex items-center gap-1" style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 700 }}>
                      <FaStar size={12} />
                      <span>{doc.rating}</span>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(doc)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      title="Click to toggle status"
                    >
                      <Badge variant={doc.status === 'Active' ? 'success' : 'neutral'}>
                        {doc.status}
                      </Badge>
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        as={Link}
                        to={`/admin/doctors/edit/${doc.id}`}
                        variant="secondary"
                        size="sm"
                      >
                        <FaEdit /> Edit
                      </Button>
                      <Button 
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteTarget(doc)}
                      >
                        <FaTrash /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={!!deleteTarget}
        title="Delete Doctor"
        message={`Are you sure you want to permanently delete ${deleteTarget?.name}? All associated appointments will also be removed.`}
        confirmText="Yes, Delete Doctor"
        cancelText="Cancel"
        isDanger={true}
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
