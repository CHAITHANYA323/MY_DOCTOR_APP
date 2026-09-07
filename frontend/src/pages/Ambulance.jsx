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
  FaHospital
} from 'react-icons/fa';
import { ambulanceService } from '../services/ambulanceService';
import { useAuth } from '../context/AuthContext';

export const Ambulance = () => {
  const { user } = useAuth();
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);

  // Request Form State
  const [patientName, setPatientName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emergencyType, setEmergencyType] = useState('Critical Medical Emergency');
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationHospital, setDestinationHospital] = useState('Nearest Available Hospital');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(null);

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
    if (!patientName.trim() || !phone.trim() || !pickupLocation.trim()) {
      alert('Please provide the patient name, contact phone number, and pickup address.');
      return;
    }

    setRequestLoading(true);
    setRequestSuccess(null);

    try {
      const res = await ambulanceService.requestAmbulance({
        patient_name: patientName,
        phone,
        emergency_type: emergencyType,
        pickup_location: pickupLocation,
        destination_hospital: destinationHospital,
        patients_count: 1,
        additional_info: `Requested via Ambulance Portal at ${new Date().toLocaleTimeString()}`
      });

      if (res.success) {
        setRequestSuccess({
          message: 'Ambulance dispatch request received! Our dispatch controller is coordinating with the nearest available unit.',
          requestId: res.request?.id || 'AMB-' + Math.floor(1000 + Math.random() * 9000)
        });
        setPickupLocation('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch request. Please dial 108 directly on your phone.');
    } finally {
      setRequestLoading(false);
    }
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
                For Life-Threatening Emergencies, Call 108
              </h2>
              <p style={{ color: '#7f1d1d', fontSize: '0.95rem', margin: 0 }}>
                Instant toll-free national emergency response. Immediate vehicle dispatch within 8–12 minutes.
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
            <FaPhoneAlt /> Dial 108 Free Now
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

            {requestSuccess && (
              <div style={{
                backgroundColor: 'var(--success-light)',
                border: '1px solid #10b981',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                color: '#065f46',
                marginBottom: '1.5rem',
                fontSize: '0.92rem'
              }}>
                <div className="flex items-center gap-2" style={{ fontWeight: 800, marginBottom: '0.35rem' }}>
                  <FaCheckCircle color="#059669" size={16} /> Request Registered #{requestSuccess.requestId}
                </div>
                <p style={{ margin: 0 }}>{requestSuccess.message}</p>
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#047857' }}>
                  Keep your phone line open for the driver call.
                </div>
              </div>
            )}

            <form onSubmit={handleAmbulanceSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Patient Full Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Ramesh Sharma"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Contact Phone Number</label>
                <input 
                  type="tel"
                  placeholder="e.g. 9876543210 (Driver will call this number)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="form-input"
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
                  <FaMapMarkerAlt color="var(--primary)" /> Current Pickup Location / Address
                </label>
                <textarea 
                  rows="2"
                  placeholder="House number, street name, landmark, colony, area..."
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  required
                  className="form-textarea"
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
                      <a 
                        href={`tel:${amb.driver_phone}`} 
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <FaPhoneAlt size={10} /> Call Driver
                      </a>
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

      <style>{`
        @media (max-width: 860px) {
          .ambulance-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default Ambulance;
