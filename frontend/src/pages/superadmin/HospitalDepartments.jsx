import React, { useState, useEffect, useCallback } from 'react';
import {
  FaStethoscope,
  FaPlusCircle,
  FaSearch,
  FaUserMd,
  FaCheckCircle,
  FaTimes,
  FaExclamationTriangle
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { doctorService } from '../../services/doctorService';
import { getApiErrorMessage } from '../../services/api';
import api from '../../services/api';
import { Button } from '../../components/common/Button';

export const HospitalDepartments = () => {
  const { user, hospitalName } = useAuth();

  const [departments, setDepartments] = useState([]);
  const [hospitalDoctors, setHospitalDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Add Specialization Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchDepartmentsData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [specsRes, docsRes] = await Promise.all([
        api.get('/api/specializations'),
        doctorService.getDoctors({ hospital_id: user?.hospital_id, limit: 100 })
      ]);

      if (specsRes.data?.success && Array.isArray(specsRes.data.specializations)) {
        setDepartments(specsRes.data.specializations);
      }
      if (docsRes.success && Array.isArray(docsRes.doctors)) {
        setHospitalDoctors(docsRes.doctors);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch hospital departments.'));
    } finally {
      setLoading(false);
    }
  }, [user?.hospital_id]);

  useEffect(() => {
    fetchDepartmentsData();
  }, [fetchDepartmentsData]);

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!name.trim()) {
      setCreateError('Department name is required.');
      return;
    }

    setCreating(true);
    try {
      const res = await api.post('/api/specializations', {
        name: name.trim(),
        description: description.trim() || `${name.trim()} Department`
      });

      if (res.data?.success) {
        setIsAddModalOpen(false);
        setName('');
        setDescription('');
        fetchDepartmentsData();
      } else {
        setCreateError(res.data?.message || 'Failed to create department.');
      }
    } catch (err) {
      setCreateError(getApiErrorMessage(err, 'Unable to create department.'));
    } finally {
      setCreating(false);
    }
  };

  // Compute doctor count per department in this hospital
  const departmentCards = departments.map((dept) => {
    const assignedDoctors = hospitalDoctors.filter(
      (doc) => doc.specialization_id === dept.id || doc.specialization_name === dept.name
    );
    return {
      ...dept,
      doctorCount: assignedDoctors.length,
      doctors: assignedDoctors
    };
  });

  const filteredDepartments = departmentCards.filter((dept) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return dept.name.toLowerCase().includes(term) ||
           (dept.description && dept.description.toLowerCase().includes(term));
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        borderBottom: '1px solid var(--slate-200)',
        paddingBottom: '1.25rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
            Hospital Departments & Specializations
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '0.25rem', marginBottom: 0 }}>
            Clinical medical departments operating at {hospitalName || 'your hospital branch'}
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={() => { setIsAddModalOpen(true); setCreateError(''); }}
          icon={<FaPlusCircle aria-hidden="true" />}
        >
          Add Specialization
        </Button>
      </div>

      {/* Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        padding: '0.85rem 1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--slate-200)'
      }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
          <input
            type="text"
            placeholder="Search departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.4rem', fontSize: '0.84rem' }}
          />
        </div>

        <span style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
          Showing <strong>{filteredDepartments.length}</strong> departments
        </span>
      </div>

      {error && (
        <div className="card" style={{ padding: '1.5rem', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--emergency)' }}>
            <FaExclamationTriangle />
            <span style={{ fontWeight: 600 }}>{error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: '180px', borderRadius: '12px' }} />
          ))}
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <FaStethoscope size={40} color="var(--slate-300)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>No Departments Match Query</h3>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem' }}>Try clearing your search terms.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {filteredDepartments.map((dept) => (
            <div
              key={dept.id}
              className="card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.15rem'
                  }}>
                    <FaStethoscope />
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: dept.doctorCount > 0 ? '#dcfce7' : 'var(--slate-100)',
                    color: dept.doctorCount > 0 ? '#15803d' : 'var(--slate-500)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '12px'
                  }}>
                    {dept.doctorCount} {dept.doctorCount === 1 ? 'Doctor' : 'Doctors'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 0.4rem' }}>
                  {dept.name}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', lineHeight: 1.5, margin: 0 }}>
                  {dept.description || 'Comprehensive clinical department providing outpatient and inpatient care.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '0.75rem', marginTop: '1rem', fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                {dept.doctorCount > 0 ? (
                  <span>Active Specialists: <strong>{dept.doctors.map(d => d.name).join(', ')}</strong></span>
                ) : (
                  <span>No doctors assigned to this hospital yet.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Specialization Modal */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '1rem'
          }}
        >
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                  Add Medical Specialization
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', margin: '0.2rem 0 0' }}>
                  Register a clinical department for hospital appointments
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}
                aria-label="Close dialog"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment}>
              {createError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--emergency-light)',
                  color: 'var(--emergency)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '1.25rem'
                }}>
                  {createError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Specialization Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Neurology, Pediatrics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department Description</label>
                <textarea
                  placeholder="Brief clinical description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input"
                  rows="3"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={creating}
                >
                  Create Specialization
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalDepartments;
