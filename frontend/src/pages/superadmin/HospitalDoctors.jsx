import React, { useState, useEffect, useCallback } from 'react';
import {
  FaUserMd,
  FaPlusCircle,
  FaSearch,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaStethoscope,
  FaMoneyBillWave,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaEnvelope
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { doctorService } from '../../services/doctorService';
import { getApiErrorMessage } from '../../services/api';
import api from '../../services/api';
import { Button } from '../../components/common/Button';

export const HospitalDoctors = () => {
  const { user, hospitalName } = useAuth();

  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'LINKED' | 'UNLINKED'

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailsDoctor, setDetailsDoctor] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Not Specified');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('5');
  const [specializationId, setSpecializationId] = useState('');
  const [location, setLocation] = useState('Hyderabad');
  const [consultationFee, setConsultationFee] = useState('500');
  const [phone, setPhone] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [about, setAbout] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [addModalError, setAddModalError] = useState('');

  const fetchHospitalDoctors = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [docsRes, specsRes] = await Promise.all([
        doctorService.getDoctors({ hospital_id: user?.hospital_id, limit: 100 }),
        api.get('/api/specializations').catch(() => ({ data: { success: false, specializations: [] } }))
      ]);

      if (docsRes.success && Array.isArray(docsRes.doctors)) {
        setDoctors(docsRes.doctors);
      } else {
        setError(docsRes.message || 'Unable to load doctor roster.');
      }

      if (specsRes.data?.success && Array.isArray(specsRes.data.specializations)) {
        setSpecializations(specsRes.data.specializations);
        if (specsRes.data.specializations.length > 0) {
          setSpecializationId(String(specsRes.data.specializations[0].id));
        }
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to retrieve hospital doctors.'));
    } finally {
      setLoading(false);
    }
  }, [user?.hospital_id]);

  useEffect(() => {
    fetchHospitalDoctors();
  }, [fetchHospitalDoctors]);

  const handleOpenAddModal = () => {
    setAddModalError('');
    setName('');
    setGender('Not Specified');
    setQualification('');
    setExperience('5');
    setLocation('Hyderabad');
    setConsultationFee('500');
    setPhone('');
    setDocEmail('');
    setAbout('');
    if (specializations.length > 0) {
      setSpecializationId(String(specializations[0].id));
    }
    setIsAddModalOpen(true);
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setAddModalError('');

    if (!name.trim() || !qualification.trim() || !specializationId || !consultationFee) {
      setAddModalError('Name, qualification, specialization, and consultation fee are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        gender,
        qualification: qualification.trim(),
        experience: Number(experience) || 1,
        specialization_id: Number(specializationId),
        hospital_id: user?.hospital_id,
        location: location.trim() || 'Hospital Branch',
        consultation_fee: Number(consultationFee),
        phone: phone.trim(),
        email: docEmail.trim(),
        about: about.trim()
      };

      const res = await doctorService.createDoctor(payload);
      if (res.success) {
        setIsAddModalOpen(false);
        fetchHospitalDoctors();
      } else {
        setAddModalError(res.message || 'Failed to add doctor profile.');
      }
    } catch (err) {
      setAddModalError(getApiErrorMessage(err, 'Unable to create doctor profile.'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch = !search.trim() ||
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      (doc.specialization_name && doc.specialization_name.toLowerCase().includes(search.toLowerCase())) ||
      (doc.qualification && doc.qualification.toLowerCase().includes(search.toLowerCase()));

    const isLinked = doc.is_linked || !!doc.user_id;
    if (statusFilter === 'LINKED') return matchesSearch && isLinked;
    if (statusFilter === 'UNLINKED') return matchesSearch && !isLinked;
    return matchesSearch;
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
            Hospital Doctors
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '0.25rem', marginBottom: 0 }}>
            Specialist medical profiles assigned strictly to {hospitalName || 'your hospital'}
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenAddModal}
          icon={<FaPlusCircle aria-hidden="true" />}
        >
          Add Doctor Profile
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        backgroundColor: 'white',
        padding: '0.85rem 1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--slate-200)'
      }}>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {[
            { id: 'ALL', label: `All Doctors (${doctors.length})` },
            { id: 'LINKED', label: `Linked (${doctors.filter(d => d.is_linked || d.user_id).length})` },
            { id: 'UNLINKED', label: `Unlinked (${doctors.filter(d => !d.is_linked && !d.user_id).length})` }
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: statusFilter === st.id ? '#0284c7' : 'var(--slate-200)',
                backgroundColor: statusFilter === st.id ? '#e0f2fe' : 'white',
                color: statusFilter === st.id ? '#0369a1' : 'var(--slate-700)',
                fontSize: '0.82rem',
                fontWeight: statusFilter === st.id ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
          <input
            type="text"
            placeholder="Search by name, dept, or degrees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.4rem', fontSize: '0.84rem' }}
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="card" style={{ padding: '1.5rem', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--emergency)' }}>
            <FaExclamationTriangle />
            <span style={{ fontWeight: 600 }}>{error}</span>
          </div>
        </div>
      )}

      {/* Doctors Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '220px', borderRadius: '12px' }} />
          ))}
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <FaUserMd size={40} color="var(--slate-300)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>No Doctors Found</h3>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem' }}>
            {search ? 'Try clearing your search query.' : 'Click "Add Doctor Profile" to add specialist profiles for this hospital.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredDoctors.map((doc) => {
            const isLinked = doc.is_linked || !!doc.user_id;
            return (
              <div
                key={doc.id}
                className="card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img
                        src={doc.image || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80'}
                        alt={doc.name}
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                          {doc.name}
                        </h3>
                        <span style={{ fontSize: '0.76rem', color: 'var(--primary-dark)', fontWeight: 700 }}>
                          {doc.specialization_name}
                        </span>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '12px',
                      backgroundColor: isLinked ? '#dcfce7' : '#fef3c7',
                      color: isLinked ? '#15803d' : '#b45309',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      flexShrink: 0
                    }}>
                      {isLinked ? <FaCheckCircle size={9} /> : <FaClock size={9} />}
                      {isLinked ? 'Linked Account' : 'Unlinked Profile'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.4rem 0.75rem', fontSize: '0.82rem', marginBottom: '1rem' }}>
                    <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Degree:</span>
                    <span style={{ color: 'var(--slate-800)' }}>{doc.qualification}</span>

                    <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Experience:</span>
                    <span style={{ color: 'var(--slate-800)' }}>{doc.experience} Years</span>

                    <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Fee:</span>
                    <span style={{ color: 'var(--slate-800)', fontWeight: 700 }}>₹{doc.consultation_fee}</span>
                  </div>
                </div>

                <div style={{
                  borderTop: '1px solid var(--slate-100)',
                  paddingTop: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                    Status: <strong style={{ color: doc.status === 'Active' ? 'var(--primary-dark)' : 'var(--slate-500)' }}>{doc.status || 'Active'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setDetailsDoctor(doc)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.82rem'
                    }}
                  >
                    View Profile &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Doctor Details Modal */}
      {detailsDoctor && (
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
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <img
                  src={detailsDoctor.image || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80'}
                  alt={detailsDoctor.name}
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                    {detailsDoctor.name}
                  </h2>
                  <span style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 700 }}>
                    {detailsDoctor.specialization_name} &bull; ID #{detailsDoctor.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsDoctor(null)}
                style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}
                aria-label="Close dialog"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.65rem 1rem', fontSize: '0.86rem', marginBottom: '1.5rem' }}>
              <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Qualifications:</span>
              <span style={{ color: 'var(--slate-800)' }}>{detailsDoctor.qualification}</span>

              <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Experience:</span>
              <span style={{ color: 'var(--slate-800)' }}>{detailsDoctor.experience} Years</span>

              <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Consultation Fee:</span>
              <span style={{ color: 'var(--slate-800)', fontWeight: 700 }}>₹{detailsDoctor.consultation_fee}</span>

              <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Available Schedule:</span>
              <span style={{ color: 'var(--slate-800)' }}>{detailsDoctor.available_days} ({detailsDoctor.available_time})</span>

              <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Languages:</span>
              <span style={{ color: 'var(--slate-800)' }}>{detailsDoctor.languages || 'English, Hindi'}</span>

              <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Account Linkage:</span>
              <span style={{ color: detailsDoctor.is_linked ? '#15803d' : '#b45309', fontWeight: 700 }}>
                {detailsDoctor.is_linked ? `Linked to User ID #${detailsDoctor.user_id}` : 'Unlinked Profile'}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setDetailsDoctor(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Add Doctor Profile Modal */}
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
          <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                  Add Doctor Profile
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', margin: '0.2rem 0 0' }}>
                  Create an unlinked doctor profile for {hospitalName || 'your hospital branch'}
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

            <form onSubmit={handleCreateDoctor}>
              {addModalError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--emergency-light)',
                  color: 'var(--emergency)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '1.25rem'
                }}>
                  {addModalError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Doctor Name *</label>
                  <input
                    type="text"
                    placeholder="Dr. Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Specialization / Department *</label>
                  <select
                    value={specializationId}
                    onChange={(e) => setSpecializationId(e.target.value)}
                    required
                    className="form-input"
                  >
                    {specializations.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="form-input"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Not Specified">Not Specified</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Qualifications *</label>
                  <input
                    type="text"
                    placeholder="e.g. MBBS, MD, DM"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Experience (Years) *</label>
                  <input
                    type="number"
                    min="1"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Consultation Fee (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">City / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Hyderabad"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="form-input"
                  />
                </div>
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
                  loading={submitting}
                >
                  Save Doctor Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalDoctors;
