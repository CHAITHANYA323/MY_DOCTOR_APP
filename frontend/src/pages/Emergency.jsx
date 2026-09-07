import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaAmbulance, 
  FaPhoneAlt, 
  FaExclamationTriangle, 
  FaHeartbeat, 
  FaHospital, 
  FaCheckCircle, 
  FaMapMarkerAlt, 
  FaUserShield,
  FaArrowRight
} from 'react-icons/fa';
import { ambulanceService } from '../services/ambulanceService';
import { useAuth } from '../context/AuthContext';

export const Emergency = () => {
  const { user } = useAuth();

  const [patientName, setPatientName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emergencyType, setEmergencyType] = useState('Heart Emergency');
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationHospital, setDestinationHospital] = useState('Nearest Available Hospital');
  const [patientsCount, setPatientsCount] = useState(1);
  const [additionalInfo, setAdditionalInfo] = useState('');

  const [loading, setLoading] = useState(false);
  const [requestResult, setRequestResult] = useState(null);

  const emergencyTypes = [
    "Heart Emergency",
    "Accident",
    "Breathing Problem",
    "Pregnancy Emergency",
    "Critical Patient",
    "Other"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientName.trim() || !phone.trim() || !pickupLocation.trim()) {
      alert('Patient name, contact number, and pickup location are required for rapid dispatch.');
      return;
    }

    setLoading(true);
    setRequestResult(null);

    try {
      const res = await ambulanceService.requestAmbulance({
        patient_name: patientName,
        phone,
        emergency_type: emergencyType,
        pickup_location: pickupLocation,
        destination_hospital: destinationHospital,
        patients_count: patientsCount,
        additional_info: additionalInfo
      });

      if (res.success) {
        setRequestResult({
          success: true,
          message: 'Ambulance request received. Our emergency team will contact you shortly.',
          data: res.request
        });
        // Clear form
        setPickupLocation('');
        setAdditionalInfo('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch ambulance request. Please dial 108 directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        {/* Critical Legal Disclaimer Banner */}
        <div style={{
          backgroundColor: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          marginBottom: '2.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FaExclamationTriangle size={22} />
          </div>
          <div>
            <h4 style={{ color: '#b91c1c', fontWeight: 800, fontSize: '1rem', marginBottom: '0.2rem' }}>
              CRITICAL NOTICE FOR ACUTE LIFE-THREATENING EMERGENCIES
            </h4>
            <p style={{ fontSize: '0.88rem', color: '#7f1d1d', lineHeight: 1.5 }}>
              This web platform facilitates rapid ambulance dispatch and hospital coordination, but it is <strong>NOT a replacement for primary government emergency services</strong>. If you or someone around you is in immediate danger of death, cardiac arrest, or catastrophic trauma, <strong>immediately dial 108 or 112 on your phone without waiting</strong>.
            </p>
          </div>
        </div>

        {/* Emergency Assistance Heading */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="section-tag emergency">
            <FaHeartbeat /> 24x7 High-Priority Triage
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3rem)', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.75rem' }}>
            Emergency Medical Assistance
          </h1>
          <p style={{ color: 'var(--slate-600)', fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto' }}>
            Request an oxygen-equipped emergency ambulance or reach hospital trauma centers with direct priority connection.
          </p>
        </div>

        {/* 4 Emergency Quick Action Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3.5rem'
        }}>
          {/* Card 1: Call 108 */}
          <div className="card" style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            boxShadow: 'var(--shadow-emergency)'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaPhoneAlt size={22} />
            </div>
            <h3 style={{ color: 'white', fontSize: '1.3rem', marginBottom: '0.35rem' }}>National Ambulance</h3>
            <p style={{ fontSize: '0.85rem', color: '#fee2e2', marginBottom: '1.25rem' }}>Toll-free 24/7 instant response</p>
            <a href="tel:108" className="btn" style={{ backgroundColor: 'white', color: '#dc2626', fontWeight: 800, width: '100%' }}>
              Call 108 Now
            </a>
          </div>

          {/* Card 2: National Emergency 112 */}
          <div className="card" style={{
            padding: '2rem',
            textAlign: 'center',
            border: '1px solid var(--slate-200)'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--slate-100)',
              color: 'var(--slate-800)',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaUserShield size={22} />
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.35rem' }}>National Helpline</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>All-in-one police & medical</p>
            <a href="tel:112" className="btn btn-secondary" style={{ width: '100%', fontWeight: 700 }}>
              Call 112 (Universal)
            </a>
          </div>

          {/* Card 3: Find Nearby Hospital */}
          <div className="card" style={{
            padding: '2rem',
            textAlign: 'center',
            border: '1px solid var(--slate-200)'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary-dark)',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaHospital size={22} />
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.35rem' }}>Emergency Hospitals</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>Find nearest 24/7 trauma care</p>
            <Link to="/hospitals" className="btn btn-outline" style={{ width: '100%' }}>
              Locate Hospitals
            </Link>
          </div>

          {/* Card 4: Apollo Emergency */}
          <div className="card" style={{
            padding: '2rem',
            textAlign: 'center',
            border: '1px solid var(--slate-200)'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--success-light)',
              color: 'var(--success)',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaPhoneAlt size={22} />
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.35rem' }}>Apollo Emergency</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>Direct cardiac triage line</p>
            <a href="tel:1066" className="btn btn-secondary" style={{ width: '100%', fontWeight: 700 }}>
              Call 1066
            </a>
          </div>
        </div>

        {/* Main Emergency Request Form Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '2.5rem',
          alignItems: 'flex-start'
        }} className="emergency-form-layout">

          {/* Left: Interactive Request Form */}
          <div className="card" style={{ padding: '2.5rem', border: '1px solid var(--slate-200)' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '1rem' }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                backgroundColor: '#dc2626',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaAmbulance size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  Request Emergency Ambulance
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
                  Submit details below for instant dispatch coordination
                </p>
              </div>
            </div>

            {requestResult && (
              <div style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #10b981',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                color: '#065f46'
              }}>
                <div className="flex items-center gap-2" style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.35rem' }}>
                  <FaCheckCircle color="#10b981" size={18} />
                  <span>Ambulance Request Received!</span>
                </div>
                <p style={{ fontSize: '0.92rem', lineHeight: 1.5 }}>
                  {requestResult.message}
                </p>
                <p style={{ fontSize: '0.82rem', marginTop: '0.5rem', color: '#047857' }}>
                  Dispatch Status: <strong>{requestResult.data?.status || 'Dispatched'}</strong> | Reference ID: #{requestResult.data?.id}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Patient Name */}
                <div className="form-group">
                  <label className="form-label">Patient Full Name *</label>
                  <input 
                    type="text" 
                    placeholder="Enter patient's name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                {/* Contact Phone */}
                <div className="form-group">
                  <label className="form-label">Contact Phone Number *</label>
                  <input 
                    type="tel" 
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              {/* Emergency Type Selector */}
              <div className="form-group">
                <label className="form-label">Emergency Category *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                  {emergencyTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEmergencyType(type)}
                      style={{
                        padding: '0.55rem 0.5rem',
                        fontSize: '0.82rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid',
                        borderColor: emergencyType === type ? '#ef4444' : 'var(--slate-200)',
                        backgroundColor: emergencyType === type ? '#fef2f2' : 'var(--white)',
                        color: emergencyType === type ? '#b91c1c' : 'var(--slate-700)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pickup Location */}
              <div className="form-group">
                <label className="form-label">Exact Pickup Address / Landmark *</label>
                <textarea 
                  rows="2"
                  placeholder="Apartment name, street, nearby landmark, city..."
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  required
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                {/* Destination Hospital */}
                <div className="form-group">
                  <label className="form-label">Destination Hospital</label>
                  <input 
                    type="text" 
                    placeholder="Nearest Hospital or specific facility"
                    value={destinationHospital}
                    onChange={(e) => setDestinationHospital(e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* Patients Count */}
                <div className="form-group">
                  <label className="form-label">No. of Patients</label>
                  <select 
                    value={patientsCount} 
                    onChange={(e) => setPatientsCount(Number(e.target.value))}
                    className="form-select"
                  >
                    <option value={1}>1 Patient</option>
                    <option value={2}>2 Patients</option>
                    <option value={3}>3+ Patients</option>
                  </select>
                </div>
              </div>

              {/* Additional Information */}
              <div className="form-group">
                <label className="form-label">Patient Condition / Special Instructions</label>
                <textarea 
                  rows="2"
                  placeholder="e.g. Patient is conscious/unconscious, severe bleeding, history of heart surgery, oxygen required..."
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn btn-emergency btn-lg"
                style={{ width: '100%' }}
              >
                <FaAmbulance /> {loading ? 'Transmitting Request...' : 'Dispatch Emergency Ambulance'}
              </button>
            </form>
          </div>

          {/* Right: First Aid Guidance & Hotline Directory */}
          <div>
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem', backgroundColor: 'var(--white)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '1.25rem' }}>
                Immediate First Aid Steps
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-md)' }}>
                  <strong style={{ color: 'var(--slate-900)', display: 'block', marginBottom: '0.2rem' }}>
                    1. Suspected Heart Attack:
                  </strong>
                  <p style={{ color: 'var(--slate-600)' }}>Keep the patient calm, seated upright. Loosen tight clothing. If prescribed and conscious, assist with Sorbitrate / Aspirin.</p>
                </div>

                <div style={{ padding: '0.85rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-md)' }}>
                  <strong style={{ color: 'var(--slate-900)', display: 'block', marginBottom: '0.2rem' }}>
                    2. Severe Bleeding / Trauma:
                  </strong>
                  <p style={{ color: 'var(--slate-600)' }}>Apply firm, direct pressure on the wound with a clean cloth. Elevate the wounded limb above heart level if possible.</p>
                </div>

                <div style={{ padding: '0.85rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-md)' }}>
                  <strong style={{ color: 'var(--slate-900)', display: 'block', marginBottom: '0.2rem' }}>
                    3. Unresponsive Breathing:
                  </strong>
                  <p style={{ color: 'var(--slate-600)' }}>Tilt the head back gently to open airway. Begin chest compressions (CPR) at 100-120 beats/minute until paramedics arrive.</p>
                </div>
              </div>
            </div>

            {/* Helpline Directory */}
            <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--slate-200)' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>
                National Emergency Directory
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
                <li className="flex items-center justify-between">
                  <span>Medical Ambulance</span>
                  <a href="tel:108" style={{ fontWeight: 700, color: '#dc2626' }}>108</a>
                </li>
                <li className="flex items-center justify-between">
                  <span>Police Helpline</span>
                  <a href="tel:100" style={{ fontWeight: 700, color: 'var(--slate-800)' }}>100</a>
                </li>
                <li className="flex items-center justify-between">
                  <span>Fire Department</span>
                  <a href="tel:101" style={{ fontWeight: 700, color: 'var(--slate-800)' }}>101</a>
                </li>
                <li className="flex items-center justify-between">
                  <span>Poison Information Center</span>
                  <a href="tel:1800116117" style={{ fontWeight: 700, color: 'var(--slate-800)' }}>1800-116-117</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .emergency-form-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};
