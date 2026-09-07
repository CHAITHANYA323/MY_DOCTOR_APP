import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { FaUserMd, FaArrowLeft, FaSave, FaImage, FaCheckCircle } from 'react-icons/fa';
import { doctorService } from '../../services/doctorService';
import { hospitalService } from '../../services/hospitalService';

export const DoctorForm = ({ isEdit = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const returnPath = isAdminRoute ? '/admin/doctors' : '/doctors';

  const [formData, setFormData] = useState({
    name: '',
    gender: 'Male',
    image: '',
    qualification: '',
    experience: 5,
    specialization_id: '',
    hospital_id: '',
    location: '',
    phone: '',
    email: '',
    consultation_fee: 600,
    available_days: 'Monday - Saturday',
    available_time: '09:00 AM - 05:00 PM',
    languages: 'English, Hindi',
    about: '',
    consultation_type: 'In-Person & Video',
    status: 'Active'
  });

  const [specializations, setSpecializations] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDoc, setFetchingDoc] = useState(isEdit);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [specsRes, hospsRes] = await Promise.all([
          doctorService.getSpecializations(),
          hospitalService.getHospitals({ limit: 100 })
        ]);
        if (specsRes.success) setSpecializations(specsRes.specializations);
        if (hospsRes.success) setHospitals(hospsRes.hospitals);

        // If creating, set defaults
        if (!isEdit) {
          if (specsRes.specializations?.length) setFormData((prev) => ({ ...prev, specialization_id: specsRes.specializations[0].id }));
          if (hospsRes.hospitals?.length) setFormData((prev) => ({ ...prev, hospital_id: hospsRes.hospitals[0].id, location: hospsRes.hospitals[0].city }));
        }
      } catch (err) {
        console.error('Error loading dropdown lists:', err);
      }
    };

    loadDropdownData();
  }, [isEdit]);

  // If edit mode, fetch existing doctor details
  useEffect(() => {
    if (isEdit && id) {
      const fetchDoctorData = async () => {
        try {
          setFetchingDoc(true);
          const res = await doctorService.getDoctorById(id);
          if (res.success && res.doctor) {
            const doc = res.doctor;
            setFormData({
              name: doc.name || '',
              gender: doc.gender || 'Male',
              image: doc.image || '',
              qualification: doc.qualification || '',
              experience: doc.experience || 1,
              specialization_id: doc.specialization_id || '',
              hospital_id: doc.hospital_id || '',
              location: doc.location || '',
              phone: doc.phone || '',
              email: doc.email || '',
              consultation_fee: doc.consultation_fee || 500,
              available_days: doc.available_days || 'Monday - Saturday',
              available_time: doc.available_time || '09:00 AM - 05:00 PM',
              languages: doc.languages || 'English, Hindi',
              about: doc.about || '',
              consultation_type: doc.consultation_type || 'In-Person & Video',
              status: doc.status || 'Active'
            });
          }
        } catch (err) {
          setError('Failed to load doctor profile for editing.');
        } finally {
          setFetchingDoc(false);
        }
      };

      fetchDoctorData();
    }
  }, [isEdit, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-update location when hospital selected
    if (name === 'hospital_id') {
      const selectedHosp = hospitals.find((h) => h.id === Number(value));
      if (selectedHosp) {
        setFormData((prev) => ({ ...prev, location: selectedHosp.city }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validations
    if (!formData.name.trim() || !formData.qualification.trim() || !formData.location.trim()) {
      setError('Doctor name, qualification, and location are mandatory fields.');
      return;
    }

    if (!formData.specialization_id || !formData.hospital_id) {
      setError('Please assign both a specialization and an affiliated hospital.');
      return;
    }

    if (Number(formData.consultation_fee) < 0) {
      setError('Consultation fee must be a non-negative number.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        experience: Number(formData.experience),
        consultation_fee: Number(formData.consultation_fee),
        specialization_id: Number(formData.specialization_id),
        hospital_id: Number(formData.hospital_id),
        image: formData.image || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80'
      };

      if (isEdit) {
        const res = await doctorService.updateDoctor(id, payload);
        if (res.success) {
          setSuccess(`Dr. ${payload.name} updated successfully!`);
          setTimeout(() => navigate(returnPath), 1200);
        }
      } else {
        const res = await doctorService.createDoctor(payload);
        if (res.success) {
          setSuccess(`Dr. ${payload.name} added to Medicare directory successfully!`);
          setTimeout(() => navigate(returnPath), 1200);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save doctor information.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingDoc) {
    return <div style={{ padding: '2rem' }}>Loading doctor data...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: isAdminRoute ? '0' : '2.5rem 1rem 4rem' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
        <div>
          <Link to={returnPath} className="flex items-center gap-2" style={{ color: 'var(--primary)', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <FaArrowLeft /> Back to Doctors Directory
          </Link>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            {isEdit ? 'Edit Doctor Information' : 'Add New Doctor to Network'}
          </h1>
        </div>
      </div>

      {success && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--success-light)',
          color: '#065f46',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <FaCheckCircle /> {success}
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--emergency-light)',
          color: 'var(--emergency)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontWeight: 600
        }}>
          {error}
        </div>
      )}

      {/* Form Card */}
      <div className="card" style={{ padding: '2.5rem' }}>
        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Doctor Identity */}
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-900)', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.65rem', marginBottom: '1.25rem' }}>
            1. Doctor Profile & Credentials
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {/* Name */}
            <div className="form-group">
              <label className="form-label">Full Doctor Name *</label>
              <input 
                type="text" 
                name="name"
                placeholder="e.g. Dr. Rajesh Kumar"
                value={formData.name}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            {/* Gender */}
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select 
                name="gender" 
                value={formData.gender} 
                onChange={handleChange}
                className="form-select"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Qualification */}
            <div className="form-group">
              <label className="form-label">Medical Qualifications *</label>
              <input 
                type="text" 
                name="qualification"
                placeholder="e.g. MBBS, MD, DM (Cardiology)"
                value={formData.qualification}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            {/* Experience */}
            <div className="form-group">
              <label className="form-label">Clinical Experience (Years) *</label>
              <input 
                type="number" 
                name="experience"
                min="0"
                max="60"
                value={formData.experience}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
          </div>

          {/* Image URL & Instant Preview */}
          <div className="form-group">
            <label className="form-label">Profile Image URL</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input 
                type="url" 
                name="image"
                placeholder="https://images.unsplash.com/photo-..."
                value={formData.image}
                onChange={handleChange}
                className="form-input"
                style={{ flex: 1 }}
              />
              <img 
                src={formData.image || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80'} 
                alt="Doctor Preview"
                style={{ width: 46, height: 46, borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--slate-200)' }} 
              />
            </div>
          </div>

          {/* Section 2: Affiliation & Practice Location */}
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-900)', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.65rem', margin: '2rem 0 1.25rem' }}>
            2. Specialization & Hospital Affiliation
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {/* Specialization */}
            <div className="form-group">
              <label className="form-label">Specialization Department *</label>
              <select 
                name="specialization_id" 
                value={formData.specialization_id} 
                onChange={handleChange}
                required
                className="form-select"
              >
                <option value="">Select Specialization</option>
                {specializations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Hospital */}
            <div className="form-group">
              <label className="form-label">Affiliated Hospital *</label>
              <select 
                name="hospital_id" 
                value={formData.hospital_id} 
                onChange={handleChange}
                required
                className="form-select"
              >
                <option value="">Select Hospital</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>{h.name} ({h.city})</option>
                ))}
              </select>
            </div>

            {/* Practice Location */}
            <div className="form-group">
              <label className="form-label">City / Location *</label>
              <input 
                type="text" 
                name="location"
                placeholder="e.g. Visakhapatnam, Delhi"
                value={formData.location}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            {/* Consultation Fee */}
            <div className="form-group">
              <label className="form-label">Consultation Fee (₹) *</label>
              <input 
                type="number" 
                name="consultation_fee"
                min="0"
                step="50"
                value={formData.consultation_fee}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
          </div>

          {/* Section 3: Availability, Contact & Bio */}
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-900)', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.65rem', margin: '2rem 0 1.25rem' }}>
            3. Schedule & Contact Information
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {/* Phone */}
            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input 
                type="text" 
                name="phone"
                placeholder="+91 891 2233 441"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                name="email"
                placeholder="doctor@apollohospitals.com"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {/* Available Days */}
            <div className="form-group">
              <label className="form-label">Available Days</label>
              <input 
                type="text" 
                name="available_days"
                placeholder="e.g. Monday - Saturday"
                value={formData.available_days}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {/* Available Time */}
            <div className="form-group">
              <label className="form-label">Available Consultation Hours</label>
              <input 
                type="text" 
                name="available_time"
                placeholder="e.g. 09:00 AM - 05:00 PM"
                value={formData.available_time}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {/* Languages */}
            <div className="form-group">
              <label className="form-label">Languages Spoken</label>
              <input 
                type="text" 
                name="languages"
                placeholder="e.g. English, Telugu, Hindi"
                value={formData.languages}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {/* Status */}
            <div className="form-group">
              <label className="form-label">Doctor Status</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange}
                className="form-select"
              >
                <option value="Active">Active (Visible to Patients)</option>
                <option value="Inactive">Inactive (Hidden)</option>
              </select>
            </div>
          </div>

          {/* About Doctor */}
          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label className="form-label">About Doctor & Clinical Expertise</label>
            <textarea 
              rows="4"
              name="about"
              placeholder="Clinical background, special procedures, accomplishments, medical philosophy..."
              value={formData.about}
              onChange={handleChange}
              className="form-textarea"
            />
          </div>

          <div className="flex items-center gap-3" style={{ marginTop: '2rem' }}>
            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ minWidth: '180px' }}
            >
              <FaSave /> {loading ? 'Saving...' : (isEdit ? 'Update Doctor' : 'Save & Publish Doctor')}
            </button>
            <Link to={returnPath} className="btn btn-secondary btn-lg">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
