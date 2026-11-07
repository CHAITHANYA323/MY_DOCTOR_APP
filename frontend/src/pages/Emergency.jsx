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
  FaArrowRight,
  FaTimesCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { ambulanceService, generateUUID } from '../services/ambulanceService';
import { ConfirmationModal } from '../components/ConfirmationModal';
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

  // Idempotency: UUID generated per intentional submission, preserved on retry
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateUUID());

  // Cancellation State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

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

    const cleanName = (patientName || '').trim();
    const cleanPhone = (phone || '').trim();
    const cleanPickup = (pickupLocation || '').trim();
    const cleanDest = (destinationHospital || '').trim() || 'Nearest Available Hospital';
    const cleanInfo = (additionalInfo || '').trim();
    const parsedPatientsCount = Number(patientsCount);

    if (!cleanName || cleanName.length < 2) {
      toast.error('Patient name must be at least 2 characters.');
      return;
    }
    if (cleanName.length > 100) {
      toast.error('Patient name cannot exceed 100 characters.');
      return;
    }

    if (!cleanPhone) {
      toast.error('Contact phone number is required for emergency dispatch.');
      return;
    }
    const digits = cleanPhone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15 || !/^\+?[0-9\s\-()]+$/.test(cleanPhone)) {
      toast.error('Please enter a valid emergency contact phone number (7 to 15 digits).');
      return;
    }

    if (!cleanPickup || cleanPickup.length < 5) {
      toast.error('Pickup location must be at least 5 characters.');
      return;
    }
    if (cleanPickup.length > 255) {
      toast.error('Pickup location cannot exceed 255 characters.');
      return;
    }

    if (cleanDest.length > 150) {
      toast.error('Destination hospital cannot exceed 150 characters.');
      return;
    }

    if (!Number.isInteger(parsedPatientsCount) || parsedPatientsCount < 1 || parsedPatientsCount > 10) {
      toast.error('Patients count must be an integer between 1 and 10.');
      return;
    }

    if (cleanInfo.length > 500) {
      toast.error('Special instructions cannot exceed 500 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await ambulanceService.requestAmbulance({
        patient_name: cleanName,
        phone: cleanPhone,
        emergency_type: emergencyType,
        pickup_location: cleanPickup,
        destination_hospital: cleanDest,
        patients_count: parsedPatientsCount,
        additional_info: cleanInfo || 'Emergency request submitted via emergency portal'
      }, idempotencyKey);

      if (res.success && res.request) {
        setRequestResult({
          success: true,
          message: res.message || 'Ambulance request received. Our emergency team will contact you shortly.',
          data: res.request
        });
        toast.success(res.message || 'Ambulance request received.');
        // Generate new key only once request successfully registered
        setIdempotencyKey(generateUUID());
        // Clear form fields
        setPickupLocation('');
        setAdditionalInfo('');
      } else {
        toast.error(res.message || 'Unable to register ambulance request.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch ambulance request. Please dial 108 directly.');
      // idempotencyKey is preserved for retries of this exact submission
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!requestResult?.data?.id) return;
    setCancelLoading(true);
    try {
      const res = await ambulanceService.cancelAmbulanceRequest(requestResult.data.id);
      if (res.success) {
        toast.success('Ambulance request cancelled successfully.');
        setRequestResult({
          ...requestResult,
          message: 'This emergency request has been cancelled.',
          data: res.request || { ...requestResult.data, status: 'Cancelled' }
        });
        setIsCancelModalOpen(false);
      } else {
        toast.error(res.message || 'Could not cancel request.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel ambulance request.');
    } finally {
      setCancelLoading(false);
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
                backgroundColor: requestResult.data?.status === 'Cancelled' ? '#fef2f2' : '#ecfdf5',
                border: `1px solid ${requestResult.data?.status === 'Cancelled' ? '#ef4444' : '#10b981'}`,
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                color: requestResult.data?.status === 'Cancelled' ? '#991b1b' : '#065f46'
              }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div className="flex items-center gap-2" style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                    {requestResult.data?.status === 'Cancelled' ? (
                      <FaTimesCircle color="#ef4444" size={18} />
                    ) : (
                      <FaCheckCircle color="#10b981" size={18} />
                    )}
                    <span>{requestResult.data?.status === 'Cancelled' ? 'Request Cancelled' : 'Ambulance Request Active'}</span>
                  </div>
                  <span className={`badge ${
                    requestResult.data?.status === 'Dispatched' ? 'badge-on-duty' :
                    requestResult.data?.status === 'Arrived' ? 'badge-arrived' :
                    requestResult.data?.status === 'Completed' ? 'badge-completed' :
                    requestResult.data?.status === 'Cancelled' ? 'badge-cancelled' : 'badge-pending'
                  }`}>
                    {requestResult.data?.status || 'Pending'}
                  </span>
                </div>

                <p style={{ fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                  {requestResult.message}
                </p>

                <div style={{ fontSize: '0.85rem', color: requestResult.data?.status === 'Cancelled' ? '#7f1d1d' : '#047857' }}>
                  <div>Reference ID: <strong>#{requestResult.data?.id}</strong></div>
                  {requestResult.data?.assigned_ambulance && (
                    <div style={{ marginTop: '0.5rem', padding: '0.65rem', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div><strong>Assigned Vehicle:</strong> {requestResult.data.assigned_ambulance.vehicle_number} ({requestResult.data.assigned_ambulance.ambulance_type})</div>
                      <div style={{ marginTop: '0.25rem' }}>
                        <strong>Driver:</strong> {requestResult.data.assigned_ambulance.driver_name} &nbsp;|&nbsp;
                        <a href={`tel:${requestResult.data.assigned_ambulance.driver_phone}`} style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline' }}>
                          <FaPhoneAlt size={11} style={{ marginRight: '3px' }} /> Call Driver ({requestResult.data.assigned_ambulance.driver_phone})
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2" style={{ marginTop: '0.85rem' }}>
                  {(requestResult.data?.status === 'Pending' || requestResult.data?.status === 'Dispatched') && (
                    <button
                      type="button"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="btn btn-sm"
                      style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                    >
                      <FaTimesCircle /> Cancel Request
                    </button>
                  )}
                  {requestResult.data?.status === 'Cancelled' && (
                    <button
                      type="button"
                      onClick={() => {
                        setRequestResult(null);
                        setIdempotencyKey(generateUUID());
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Start New Request
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-grid-2col" style={{ gap: '1rem' }}>
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

              <div className="form-grid-2col" style={{ gap: '1rem' }}>
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
                    <option value={3}>3 Patients</option>
                    <option value={4}>4 Patients</option>
                    <option value={5}>5 Patients</option>
                    <option value={6}>6 Patients</option>
                    <option value={7}>7 Patients</option>
                    <option value={8}>8 Patients</option>
                    <option value={9}>9 Patients</option>
                    <option value={10}>10 Patients (Max)</option>
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

      <ConfirmationModal 
        isOpen={isCancelModalOpen}
        title="Cancel Emergency Ambulance Request"
        message={`Are you sure you want to cancel emergency ambulance request #${requestResult?.data?.id}? Our dispatch team will be immediately notified to recall the vehicle.`}
        confirmText="Yes, Cancel Request"
        cancelText="Keep Active"
        isDanger={true}
        loading={cancelLoading}
        onConfirm={handleCancelRequest}
        onCancel={() => setIsCancelModalOpen(false)}
      />

      <style>{`
        @media (max-width: 860px) {
          .emergency-form-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};
