import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaUserMd, 
  FaPlus, 
  FaSearch, 
  FaEdit, 
  FaTrash, 
  FaCheck, 
  FaTimes, 
  FaStar,
  FaHospital
} from 'react-icons/fa';
import { doctorService } from '../../services/doctorService';
import { ConfirmationModal } from '../../components/ConfirmationModal';

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
        setNotification(res.message);
        setDeleteTarget(null);
        fetchDoctors();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete doctor.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleStatus = async (doctor) => {
    const newStatus = doctor.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await doctorService.updateDoctor(doctor.id, { status: newStatus });
      fetchDoctors();
    } catch (err) {
      alert('Failed to update doctor status');
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

        <Link to="/admin/doctors/add" className="btn btn-primary">
          <FaPlus /> Add New Doctor
        </Link>
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
                        <Link to={`/doctors/${doc.id}`} target="_blank" style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                          {doc.name}
                        </Link>
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
                      onClick={() => handleToggleStatus(doc)}
                      style={{
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-full)',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: doc.status === 'Active' ? 'var(--success-light)' : 'var(--slate-200)',
                        color: doc.status === 'Active' ? '#047857' : 'var(--slate-600)'
                      }}
                      title="Click to toggle status"
                    >
                      {doc.status}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        to={`/admin/doctors/edit/${doc.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.35rem 0.65rem' }}
                      >
                        <FaEdit /> Edit
                      </Link>
                      <button 
                        onClick={() => setDeleteTarget(doc)}
                        className="btn btn-sm"
                        style={{
                          padding: '0.35rem 0.65rem',
                          backgroundColor: 'var(--emergency-light)',
                          color: 'var(--emergency)',
                          border: '1px solid var(--emergency-border)'
                        }}
                      >
                        <FaTrash /> Delete
                      </button>
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
