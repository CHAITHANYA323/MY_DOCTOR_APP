import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaPhoneAlt, 
  FaEnvelope, 
  FaMapMarkerAlt, 
  FaClock, 
  FaAmbulance, 
  FaPaperPlane, 
  FaCheckCircle, 
  FaHeadset, 
  FaHospital, 
  FaQuestionCircle 
} from 'react-icons/fa';
import { Button } from '../components/common/Button';

export const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'General Patient Inquiry',
    subject: '',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError('Please fill in your name, email address, and inquiry message.');
      return;
    }

    setLoading(true);
    // Simulate inquiry submission
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        department: 'General Patient Inquiry',
        subject: '',
        message: ''
      });
    }, 900);
  };

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* 1. HERO / BANNER */}
      <section style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #ffffff 100%)',
        padding: '4rem 0 3rem',
        borderBottom: '1px solid var(--slate-200)'
      }}>
        <div className="container">
          <div style={{ maxWidth: '750px', margin: '0 auto', textAlign: 'center' }}>
            <div className="section-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <FaHeadset /> 24/7 Patient & Hospital Support
            </div>
            <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3rem)', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '1rem' }}>
              We're Here to Help With Your <span style={{ color: 'var(--primary)' }}>Healthcare</span> Needs
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--slate-600)', lineHeight: 1.6 }}>
              Have questions about booking appointments, hospital admission guidance, or ambulance dispatch? Connect with our dedicated patient care team.
            </p>
          </div>
        </div>
      </section>

      {/* 2. EMERGENCY STRIP ALERT */}
      <div className="container" style={{ marginTop: '2rem', marginBottom: '2.5rem' }}>
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}>
              <FaAmbulance />
            </div>
            <div>
              <h4 style={{ color: '#991b1b', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.15rem' }}>
                Life-Threatening Medical Emergency?
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#b91c1c' }}>
                Do not wait for contact form responses. Call our emergency dispatch immediately.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="tel:108" className="btn btn-emergency btn-sm">
              <FaPhoneAlt /> Call 108
            </a>
            <Link to="/emergency" className="btn btn-secondary btn-sm">
              Ambulance Portal
            </Link>
          </div>
        </div>
      </div>

      {/* 3. CONTACT FORM & INFO GRID */}
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 2fr',
          gap: '2.5rem',
          alignItems: 'flex-start'
        }} className="contact-grid">
          {/* Left Column: Direct Contact Details */}
          <div style={{ minWidth: 0 }}>
            <div className="card" style={{ padding: 'clamp(1.25rem, 4vw, 2rem)', marginBottom: '1.75rem', border: '1px solid var(--slate-200)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '1.5rem' }}>
                Direct Contact Channels
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Phone */}
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    <FaPhoneAlt />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600, display: 'block' }}>Toll-Free Patient Desk</span>
                    <a href="tel:1800102102" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                      1800-102-102
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    backgroundColor: 'var(--success-light)',
                    color: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    <FaEnvelope />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600, display: 'block' }}>Support Email</span>
                    <a href="mailto:support@mediconnect.org" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', wordBreak: 'break-all' }}>
                      support@mediconnect.org
                    </a>
                  </div>
                </div>

                {/* Headquarters Location */}
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    backgroundColor: 'var(--secondary-light)',
                    color: 'var(--secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    <FaMapMarkerAlt />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600, display: 'block' }}>National Operations Hub</span>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-800)', margin: 0, wordBreak: 'break-word' }}>
                      Health City, Chinagadila, Visakhapatnam, AP 530040
                    </p>
                  </div>
                </div>

                {/* Operational Hours */}
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    backgroundColor: 'var(--slate-100)',
                    color: 'var(--slate-700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    <FaClock />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600, display: 'block' }}>Working Hours</span>
                    <p style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--slate-800)', margin: 0, wordBreak: 'break-word' }}>
                      24 Hours / 7 Days (Emergency & OPD Booking)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Regional Network Offices */}
            <div className="card" style={{ padding: 'clamp(1.25rem, 4vw, 1.75rem)', border: '1px solid var(--slate-200)' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--slate-900)' }}>
                Regional Coordinating Hubs
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.88rem', color: 'var(--slate-600)' }}>
                <div>
                  <strong style={{ color: 'var(--slate-800)' }}>Delhi NCR:</strong> Fortis Healthcare Complex, Okhla Road
                </div>
                <div>
                  <strong style={{ color: 'var(--slate-800)' }}>Bengaluru:</strong> Manipal Hospital Campus, HAL Old Airport Road
                </div>
                <div>
                  <strong style={{ color: 'var(--slate-800)' }}>Hyderabad:</strong> Care Hospitals Wing, Road No. 1, Banjara Hills
                </div>
                <div>
                  <strong style={{ color: 'var(--slate-800)' }}>Mumbai:</strong> Max Super Speciality Annex, Saket District
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Contact Form */}
          <div className="card" style={{ padding: 'clamp(1.25rem, 4vw, 2.5rem)', border: '1px solid var(--slate-200)', boxShadow: 'var(--shadow-md)' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
              Send Us a Message
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--slate-500)', marginBottom: '1.75rem' }}>
              Fill out the form below. Our healthcare assistance team usually responds within 2 to 4 hours.
            </p>

            {submitted && (
              <div style={{
                padding: '1.25rem',
                backgroundColor: 'var(--success-light)',
                color: '#065f46',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontWeight: 600
              }}>
                <FaCheckCircle size={22} color="var(--success)" />
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>Thank you! Your message has been received.</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500, color: '#047857' }}>
                    A patient relationship coordinator will get in touch with you shortly.
                  </p>
                </div>
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

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text" 
                    name="name"
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input 
                    type="email" 
                    name="email"
                    placeholder="e.g. rahul@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Contact Phone Number</label>
                  <input 
                    type="text" 
                    name="phone"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department / Inquiry Type</label>
                  <select 
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="General Patient Inquiry">General Patient Inquiry</option>
                    <option value="Doctor Appointment Support">Doctor Appointment Support</option>
                    <option value="Hospital Admission Guidance">Hospital Admission Guidance</option>
                    <option value="Ambulance & Emergency Services">Ambulance & Emergency Services</option>
                    <option value="Medical Council Verification">Doctor Registration / Credentialing</option>
                    <option value="Feedback & Grievances">Feedback & Grievances</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <input 
                  type="text" 
                  name="subject"
                  placeholder="e.g. Inquiring about Cardiology OPD timings"
                  value={formData.subject}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Your Message *</label>
                <textarea 
                  rows="5"
                  name="message"
                  placeholder="Please provide details about your medical query, requested doctor, or consultation requirements..."
                  value={formData.message}
                  onChange={handleChange}
                  required
                  className="form-textarea"
                />
              </div>

              <Button 
                type="submit" 
                loading={loading}
                variant="primary"
                size="lg"
                style={{ minWidth: 'min(180px, 100%)', marginTop: '0.5rem' }}
              >
                <FaPaperPlane /> Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};
