import React, { useState, useEffect } from 'react';
import { FaPlus } from 'react-icons/fa';
import { doctorService } from '../../services/doctorService';
import { notify } from '../../utils/toast';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const ManageSpecializations = () => {
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchSpecs = async () => {
    try {
      setLoading(true);
      const res = await doctorService.getSpecializations();
      if (res.success) {
        setSpecializations(res.specializations);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecs();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await doctorService.createSpecialization({ name, description });
      if (res.success) {
        notify.success(`Specialization "${name}" added successfully.`);
        setMsg(`Specialization "${name}" added successfully.`);
        setName('');
        setDescription('');
        fetchSpecs();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Error creating specialization.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
          Clinical Specializations
        </h1>
        <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>
          Configure medical departments and specialty classifications for doctor filtering
        </p>
      </div>

      {msg && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--success-light)', color: '#065f46', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontWeight: 600 }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2rem', alignItems: 'flex-start' }} className="admin-specializations-grid">
        {/* Table */}
        <div className="table-responsive card">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Specialization Name</th>
                <th>Description</th>
                <th>Assigned Doctors</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Loading specializations...</td>
                </tr>
              ) : specializations.map((spec) => (
                <tr key={spec.id}>
                  <td style={{ fontWeight: 700 }}>#{spec.id}</td>
                  <td style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{spec.name}</td>
                  <td style={{ maxWidth: '280px', fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                    {spec.description}
                  </td>
                  <td>
                    <Badge variant="info">
                      {spec.doctor_count || 0} Doctors
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add New Specialty Form */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            Add Medical Faculty
          </h3>

          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label className="form-label">Specialization Name *</label>
              <input 
                type="text" 
                placeholder="e.g. Rheumatologist"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Clinical Description</label>
              <textarea 
                rows="3"
                placeholder="Specialty overview and treated conditions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
              />
            </div>

            <Button 
              type="submit" 
              loading={submitting}
              variant="primary"
              style={{ width: '100%' }}
            >
              <FaPlus /> Add Department
            </Button>
          </form>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .admin-specializations-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
