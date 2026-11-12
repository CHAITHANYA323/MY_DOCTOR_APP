import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaAmbulance, 
  FaPhoneAlt, 
  FaHeartbeat, 
  FaCheckCircle, 
  FaMapMarkerAlt, 
  FaClock,
  FaShieldAlt,
  FaExclamationTriangle,
  FaPaperPlane,
  FaHospital,
  FaTimesCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { ambulanceService, generateUUID } from '../services/ambulanceService';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const Ambulance = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);

  // Request Form State
  const [patientName, setPatientName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emergencyType, setEmergencyType] = useState('Critical Medical Emergency');
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationHospital, setDestinationHospital] = useState('Nearest Available Hospital');
  const [requestLoading, setRequestLoading] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);

  // Idempotency State: UUID per intentional emergency submission
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateUUID());

  // Cancellation State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    const fetchFleet = async () => {
      try {
        setLoading(true);
        const res = await ambulanceService.getAmbulances();
        if (res.success) {
          setAmbulances(res.ambulances);
        }
      } catch (err) {
        console.error('Error fetching ambulances:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFleet();
  }, []);

  const handleAmbulanceSubmit = async (e) => {
    e.preventDefault();

    const cleanName = (patientName || '').trim();
    const cleanPhone = (phone || '').trim();
    const cleanPickup = (pickupLocation || '').trim();
    const cleanDest = (destinationHospital || '').trim() || 'Nearest Available Hospital';

    // Client-side validation matching backend constraints
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

    setRequestLoading(true);

    try {
      const res = await ambulanceService.requestAmbulance({
        patient_name: cleanName,
        phone: cleanPhone,
        emergency_type: emergencyType,
        pickup_location: cleanPickup,
        destination_hospital: cleanDest,
        patients_count: 1,
        additional_info: `Requested via Ambulance Portal at ${new Date().toLocaleTimeString()}`
      }, idempotencyKey);

      if (res.success && res.request) {
        setActiveRequest(res.request);
        toast.success(res.message || 'Ambulance request received.');
        // Generate new key only once an intentional request is successfully processed
        setIdempotencyKey(generateUUID());
        setPickupLocation('');
      } else {
        toast.error(res.message || 'Unable to register ambulance request.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to dispatch request. Please dial 108 directly on your phone.';
      toast.error(msg);
      // NOTE: idempotencyKey is preserved for retries of this exact submission
    } finally {
      setRequestLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!activeRequest) return;
    setCancelLoading(true);
    try {
      const res = await ambulanceService.cancelAmbulanceRequest(activeRequest.id);
      if (res.success) {
        toast.success('Ambulance request cancelled successfully.');
        setActiveRequest(res.request || { ...activeRequest, status: 'Cancelled' });
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

  const handleStartNewRequest = () => {
    setActiveRequest(null);
    setIdempotencyKey(generateUUID());
  };

  const ambulanceTypes = [
    {
      title: "Basic Life Support (BLS)",
      desc: "Oxygen cylinder, stretcher, vitals monitor, and trained EMT paramedic.",
      bestFor: "Stable patients, fractures, respiratory support, inter-hospital transfer."
    },
    {
      title: "Advanced Cardiac Life Support (ACLS)",
      desc: "ECG, defibrillator, IV emergency drugs, multi-parameter monitor & cardiac nurse.",
      bestFor: "Heart attacks, stroke, severe trauma, unconscious patients."
    },
    {
      title: "Mobile Intensive Care Unit (ICU)",
      desc: "Transport ventilator, infusion pumps, invasive monitors, and critical care doctor.",
      bestFor: "Ventilator dependent patients, post-cardiac arrest transfer."
    },
    {
      title: "Patient Transport Van",
      desc: "Wheelchair accessible, air conditioned, comfortable non-emergency travel.",
      bestFor: "Dialysis appointments, routine checkups, hospital discharge."
    }
  ];

  return (
    <div style={{ padding: '2.5rem 0 5rem', backgroundColor: 'var(--bg-main)', minHeight: '85vh' }}>
      <div className="container">
        {/* Urgent Emergency Alert Header */}
        <div style={{
          backgroundColor: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem 2rem',
          marginBottom: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: '280px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              flexShrink: 0
            }}>
              <FaPhoneAlt />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.25rem' }}>
                {t('ambulance.alertTitle')}
              </h2>
              <p style={{ color: '#7f1d1d', fontSize: '0.95rem', margin: 0 }}>
                {t('ambulance.alertDesc')}
              </p>
            </div>
          </div>

          <a 
            href="tel:108"
            className="btn btn-emergency btn-lg"
            style={{ 
              fontSize: '1.15rem', 
              padding: '0.9rem 2rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)'
            }}
          >
            <FaPhoneAlt /> {t('ambulance.dial108Btn')}
          </a>
        </div>

        {/* 2-Column Section: Request Form (Left) & Real-Time Fleet (Right) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1.1fr',
          gap: '2.5rem',
          marginBottom: '3.5rem',
          alignItems: 'flex-start'
        }} className="ambulance-grid">
          
          {/* Left Column: Quick Request Form */}
          <div className="card" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
              <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 700 }}>
                Online Dispatch
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>Quick 4-Field Form</span>
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.4rem' }}>
              Request Ambulance Pickup
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', marginBottom: '1.5rem' }}>
              Submit your pickup location. Our 24/7 command center will assign the nearest unit and call you right back.
            </p>

            {/* Active Request Live Tracking Banner */}
            {activeRequest && (
              <div style={{
                backgroundColor: activeRequest.status === 'Cancelled' ? 'var(--emergency-light)' : '#f0fdf4',
                border: `1px solid ${activeRequest.status === 'Cancelled' ? '#f87171' : '#10b981'}`,
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                color: activeRequest.status === 'Cancelled' ? '#991b1b' : '#065f46',
                marginBottom: '1.5rem',
                fontSize: '0.92rem'
              }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div className="flex items-center gap-2" style={{ fontWeight: 800 }}>
                    <FaCheckCircle color={activeRequest.status === 'Cancelled' ? '#dc2626' : '#059669'} size={16} />
                    <span>Emergency Request #{activeRequest.id}</span>
                  </div>
                  <span className={`badge ${
                    activeRequest.status === 'Dispatched' ? 'badge-on-duty' :
                    activeRequest.status === 'Arrived' ? 'badge-arrived' :
                    activeRequest.status === 'Completed' ? 'badge-completed' :
                    activeRequest.status === 'Cancelled' ? 'badge-cancelled' : 'badge-pending'
                  }`}>
                    {activeRequest.status}
                  </span>
                </div>

                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>
                  Patient: {activeRequest.patient_name} &bull; {activeRequest.emergency_type}
                </p>

                {activeRequest.assigned_ambulance ? (
                  <div style={{
                    backgroundColor: 'rgba(255,255,255,0.85)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    marginBottom: '0.75rem',
                    border: '1px solid rgba(0,0,0,0.06)'
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FaAmbulance color="var(--primary)" /> Assigned: {activeRequest.assigned_ambulance.vehicle_number} ({activeRequest.assigned_ambulance.ambulance_type})
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--slate-700)', marginTop: '0.25rem' }}>
                      Driver: <strong>{activeRequest.assigned_ambulance.driver_name}</strong>
                    </div>
                    {activeRequest.assigned_ambulance.driver_phone && (
                      <div style={{ marginTop: '0.4rem' }}>
                        <a 
                          href={`tel:${activeRequest.assigned_ambulance.driver_phone}`}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}
                        >
                          <FaPhoneAlt size={10} /> Call Driver ({activeRequest.assigned_ambulance.driver_phone})
                        </a>
                      </div>
                    )}
                  </div>
                ) : activeRequest.status === 'Pending' ? (
                  <div style={{ fontSize: '0.85rem', color: '#047857', marginBottom: '0.75rem', backgroundColor: 'rgba(255,255,255,0.7)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
                    ⏳ Dispatch Queued: Command center is assigning the nearest unit. Please keep your phone line open.
                  </div>
                ) : null}

                <div className="flex items-center gap-2" style={{ flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {(activeRequest.status === 'Pending' || activeRequest.status === 'Dispatched') && (
                    <button
                      type="button"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="btn btn-sm"
                      style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171' }}
                    >
                      <FaTimesCircle /> Cancel Request
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleStartNewRequest}
                    className="btn btn-secondary btn-sm"
                  >
                    Start New Request
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleAmbulanceSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Patient Full Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. Ramesh Sharma"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                  className="form-input"
                  maxLength={100}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Contact Phone Number *</label>
                <input 
                  type="tel"
                  placeholder="e.g. +91 98765 43210 (Driver will call this number)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="form-input"
                  maxLength={30}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Emergency Condition / Type</label>
                <select 
                  value={emergencyType}
                  onChange={(e) => setEmergencyType(e.target.value)}
                  className="form-select"
                >
                  <option value="Critical Medical Emergency">Critical Medical Emergency</option>
                  <option value="Heart Attack / Chest Pain">❤️ Heart Attack / Severe Chest Pain</option>
                  <option value="Road Accident / Physical Trauma">🚗 Road Accident / Trauma</option>
                  <option value="Breathing Trouble / Asthma">🫁 Severe Breathing Distress</option>
                  <option value="Pregnancy / Labor Pain">👶 Pregnancy / Labor Emergency</option>
                  <option value="Dialysis / Routine Transport">🏥 Non-Emergency Patient Transport</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FaMapMarkerAlt color="var(--primary)" /> Current Pickup Location / Address *
                </label>
                <textarea 
                  rows="2"
                  placeholder="House number, street name, landmark, colony, area..."
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  required
                  className="form-textarea"
                  maxLength={255}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FaHospital color="var(--primary)" /> Preferred Destination Hospital
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Apollo Hospital or Nearest Available Trauma Center"
                  value={destinationHospital}
                  onChange={(e) => setDestinationHospital(e.target.value)}
                  className="form-input"
                  maxLength={150}
                />
              </div>

              <button 
                type="submit" 
                disabled={requestLoading}
                className="btn btn-emergency btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <FaPaperPlane /> {requestLoading ? 'Dispatching Request...' : 'Dispatch Nearest Ambulance'}
              </button>
            </form>
          </div>

          {/* Right Column: Stationed Ambulances Fleet */}
          <div className="card" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  Active Ambulance Fleet ({ambulances.length})
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
                  GPS-monitored vehicles stationed across city centers
                </p>
              </div>
              <span className="badge badge-confirmed" style={{ fontSize: '0.78rem' }}>
                🟢 24/7 Monitored
              </span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[1, 2, 3].map(n => (
                  <div key={n} className="skeleton" style={{ height: '70px', borderRadius: 'var(--radius-md)' }} />
                ))}
              </div>
            ) : ambulances.length === 0 ? (
              <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>No active ambulances found in this area.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {ambulances.map((amb) => (
                  <div key={amb.id} style={{
                    padding: '1rem 1.25rem',
                    backgroundColor: 'var(--slate-50)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--slate-200)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0
                      }}>
                        <FaAmbulance />
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--slate-900)', display: 'block' }}>
                          {amb.vehicle_number} &bull; {amb.ambulance_type}
                        </strong>
                        <div className="flex items-center gap-1" style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginTop: '0.15rem' }}>
                          <FaMapMarkerAlt color="var(--primary)" size={11} />
                          <span>{amb.current_location}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`badge ${
                        amb.status === 'Available' ? 'badge-available' : 
                        amb.status === 'On Duty' ? 'badge-on-duty' : 'badge-maintenance'
                      }`} style={{ fontSize: '0.75rem' }}>
                        {amb.status}
                      </span>
                      {amb.driver_phone && (
                        <a 
                          href={`tel:${amb.driver_phone}`} 
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <FaPhoneAlt size={10} /> Call Driver
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4 Ambulance Types Guide */}
        <div>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="section-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <FaShieldAlt /> Medical Vehicle Guide
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
              Which Ambulance Type Do You Need?
            </h2>
            <p style={{ color: 'var(--slate-600)', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto' }}>
              Understanding our fleet types helps us send the exact medical life-support systems required.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem'
          }}>
            {ambulanceTypes.map((type, idx) => (
              <div key={idx} className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  marginBottom: '1rem'
                }}>
                  <FaAmbulance />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--slate-900)' }}>
                  {type.title}
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', lineHeight: 1.6, marginBottom: '1rem' }}>
                  {type.desc}
                </p>
                <div style={{
                  marginTop: 'auto',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--slate-100)',
                  fontSize: '0.82rem',
                  color: 'var(--slate-500)'
                }}>
                  <strong style={{ color: 'var(--slate-700)' }}>Recommended for: </strong>
                  {type.bestFor}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Patient Cancellation */}
      <ConfirmationModal
        isOpen={isCancelModalOpen}
        title="Cancel Ambulance Request"
        message={`Are you sure you want to cancel emergency request #${activeRequest?.id}? Any assigned ambulance will be released back to Available for other patients.`}
        confirmText="Yes, Cancel Request"
        cancelText="Keep Active"
        isDanger={true}
        loading={cancelLoading}
        onConfirm={handleCancelRequest}
        onCancel={() => setIsCancelModalOpen(false)}
      />

      <style>{`
        @media (max-width: 860px) {
          .ambulance-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default Ambulance;
