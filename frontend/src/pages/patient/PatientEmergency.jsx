import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaAmbulance,
  FaPhoneAlt,
  FaExclamationTriangle,
  FaHeartbeat,
  FaHospital,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaTimesCircle,
  FaClock,
  FaUsers,
  FaSync
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ambulanceService, generateUUID } from '../../services/ambulanceService';
import { hospitalService } from '../../services/hospitalService';

export const PatientEmergency = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [patientName, setPatientName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emergencyType, setEmergencyType] = useState('Heart Emergency');
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationHospital, setDestinationHospital] = useState('Nearest Available Hospital');
  const [patientsCount, setPatientsCount] = useState(1);
  const [additionalInfo, setAdditionalInfo] = useState('');

  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestResult, setRequestResult] = useState(null);

  // Idempotency: UUID generated per intentional submission, preserved on retry
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateUUID());

  // Cancellation State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    const loadHospitals = async () => {
      try {
        const res = await hospitalService.getHospitals({ limit: 50 });
        if (res.success && Array.isArray(res.hospitals)) {
          setHospitals(res.hospitals);
        }
      } catch (err) {
        console.error('Error fetching emergency hospitals:', err);
      }
    };
    loadHospitals();
  }, []);

  const emergencyTypes = [
    'Heart Emergency',
    'Accident & Trauma',
    'Breathing Difficulty',
    'Pregnancy Emergency',
    'Critical Patient',
    'Other Acute Condition'
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
    if (!cleanPhone) {
      toast.error('Emergency contact phone number is required.');
      return;
    }
    const digits = cleanPhone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15 || !/^\+?[0-9\s\-()]+$/.test(cleanPhone)) {
      toast.error('Please enter a valid emergency contact phone number (7 to 15 digits).');
      return;
    }
    if (!cleanPickup || cleanPickup.length < 5) {
      toast.error('Pickup location must be at least 5 characters with recognizable landmarks.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        patient_name: cleanName,
        phone: cleanPhone,
        emergency_type: emergencyType,
        pickup_location: cleanPickup,
        destination_hospital: cleanDest,
        patients_count: parsedPatientsCount,
        additional_info: cleanInfo,
        idempotency_key: idempotencyKey
      };

      const res = await ambulanceService.requestAmbulance(payload);
      if (res.success) {
        setRequestResult(res.request || res);
        toast.success('Emergency ambulance dispatched! Live response unit notified.');
      } else {
        toast.error(res.message || 'Emergency request failed. Please dial 108 immediately.');
      }
    } catch (err) {
      console.error('Ambulance dispatch error:', err);
      toast.error(err.response?.data?.message || 'Emergency request failed. Dial 108 for instant response.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!requestResult?.id) return;
    setCancelLoading(true);
    try {
      const res = await ambulanceService.cancelAmbulanceRequest(requestResult.id);
      if (res.success) {
        toast.info('Emergency ambulance request has been cancelled.');
        setRequestResult(null);
        setIsCancelModalOpen(false);
        setIdempotencyKey(generateUUID());
      } else {
        toast.error(res.message || 'Failed to cancel ambulance request.');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      toast.error(err.response?.data?.message || 'Error cancelling emergency request.');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Emergency Alert Header Strip */}
      <div style={{
        background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
        borderRadius: '16px',
        padding: '2rem 2.25rem',
        color: '#FFFFFF',
        boxShadow: '0 8px 25px rgba(220, 38, 38, 0.2)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          right: '-10px',
          bottom: '-30px',
          opacity: 0.1,
          pointerEvents: 'none',
          color: '#FFFFFF'
        }}>
          <FaAmbulance size={200} />
        </div>

        <div style={{ maxWidth: '650px', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.65rem', letterSpacing: '0.05em' }}>
            <FaExclamationTriangle size={11} />
            <span>24/7 CRITICAL CARE NETWORK</span>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {t('patientPortal.emergencyServicesTitle') || '24/7 Emergency Services & Ambulance Dispatch'}
          </h1>
          <p style={{ color: '#FEE2E2', fontSize: '0.94rem', margin: 0, lineHeight: 1.5 }}>
            {t('patientPortal.emergencyServicesSubtitle') || 'Immediate medical response, live ambulance dispatch, and trauma facility coordination across AP & Telangana.'}
          </p>
        </div>

        {/* 108 Direct Click-to-Call Action Button */}
        <a
          href="tel:108"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: '#FFFFFF',
            color: '#DC2626',
            padding: '0.9rem 1.75rem',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '1.1rem',
            textDecoration: 'none',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
            zIndex: 1,
            transition: 'transform 0.15s ease'
          }}
        >
          <FaPhoneAlt size={18} />
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1 }}>DIAL 108</div>
            <div style={{ fontSize: '0.7rem', color: '#991B1B', fontWeight: 700 }}>Free Emergency Helpline</div>
          </div>
        </a>
      </div>

      {/* 2. Dispatch Active Tracking Card (if submitted) */}
      {requestResult && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '2px solid #16A36A',
          padding: '1.75rem',
          boxShadow: '0 6px 20px rgba(22, 163, 106, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#DCFCE7',
                color: '#16A36A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem'
              }}>
                <FaCheckCircle />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#102A43', margin: 0 }}>
                  Emergency Unit Dispatched
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#16A36A', fontWeight: 700 }}>
                  Request ID: #{requestResult.id} &bull; Status: {requestResult.status || 'Dispatched'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid #FECACA',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Cancel Emergency Request
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            padding: '1rem',
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            fontSize: '0.84rem'
          }}>
            <div>
              <span style={{ color: '#718096', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>PATIENT</span>
              <strong style={{ color: '#102A43' }}>{requestResult.patient_name}</strong>
            </div>
            <div>
              <span style={{ color: '#718096', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>CONTACT PHONE</span>
              <strong style={{ color: '#102A43' }}>{requestResult.phone}</strong>
            </div>
            <div>
              <span style={{ color: '#718096', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>EMERGENCY TYPE</span>
              <strong style={{ color: '#DC2626' }}>{requestResult.emergency_type}</strong>
            </div>
            <div>
              <span style={{ color: '#718096', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>DESTINATION</span>
              <strong style={{ color: '#102A43' }}>{requestResult.destination_hospital || 'Nearest Facility'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Two-Column Layout: Dispatch Form & Guidelines / Facilities */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.75rem'
      }}>
        {/* Column 1: Online Emergency Dispatch Form */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '1.75rem',
          boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.25rem 0' }}>
              {t('patientPortal.requestAmbulanceTitle') || 'Request Emergency Ambulance'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#718096', margin: 0 }}>
              Dispatch an accredited medical ambulance directly to your location.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Patient Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#102A43', marginBottom: '0.35rem' }}>
                {t('patientPortal.patientName') || 'Patient Full Name'} *
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.86rem',
                  backgroundColor: '#F8FAFC',
                  color: '#243447',
                  outline: 'none'
                }}
              />
            </div>

            {/* Emergency Phone */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#102A43', marginBottom: '0.35rem' }}>
                {t('patientPortal.emergencyContactPhone') || 'Emergency Contact Phone'} *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.86rem',
                  backgroundColor: '#F8FAFC',
                  color: '#243447',
                  outline: 'none'
                }}
              />
            </div>

            {/* Emergency Type & Patients Count */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#102A43', marginBottom: '0.35rem' }}>
                  {t('patientPortal.emergencyType') || 'Emergency Type'} *
                </label>
                <select
                  value={emergencyType}
                  onChange={(e) => setEmergencyType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    backgroundColor: '#FFFFFF',
                    color: '#243447',
                    outline: 'none'
                  }}
                >
                  {emergencyTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#102A43', marginBottom: '0.35rem' }}>
                  {t('patientPortal.numberOfPatients') || 'Number of Patients'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={patientsCount}
                  onChange={(e) => setPatientsCount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    backgroundColor: '#FFFFFF',
                    color: '#243447',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Pickup Location */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#102A43', marginBottom: '0.35rem' }}>
                {t('patientPortal.pickupLocation') || 'Pickup Location & Landmarks'} *
              </label>
              <textarea
                rows={2}
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="Door No, Street Name, Landmark, City..."
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.84rem',
                  backgroundColor: '#F8FAFC',
                  color: '#243447',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Destination Hospital */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#102A43', marginBottom: '0.35rem' }}>
                {t('patientPortal.destinationHospital') || 'Destination Hospital'}
              </label>
              <select
                value={destinationHospital}
                onChange={(e) => setDestinationHospital(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.84rem',
                  backgroundColor: '#FFFFFF',
                  color: '#243447',
                  outline: 'none'
                }}
              >
                <option value="Nearest Available Hospital">Nearest Available Emergency Facility (Recommended)</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.name}>{h.name} ({h.city})</option>
                ))}
              </select>
            </div>

            {/* Additional Info */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#102A43', marginBottom: '0.35rem' }}>
                {t('patientPortal.additionalSymptoms') || 'Critical Symptoms & Notes'}
              </label>
              <input
                type="text"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="e.g. Chest pain, difficulty breathing, conscious/unconscious..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.84rem',
                  backgroundColor: '#FFFFFF',
                  color: '#243447',
                  outline: 'none'
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.5rem',
                padding: '0.85rem 1.5rem',
                backgroundColor: '#DC2626',
                border: 'none',
                borderRadius: '10px',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.94rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
              }}
            >
              {loading ? <FaSync size={14} className="animate-spin" /> : <FaAmbulance size={16} />}
              <span>{t('patientPortal.dispatchAmbulance') || 'Dispatch Emergency Ambulance'}</span>
            </button>
          </form>
        </div>

        {/* Column 2: Emergency Guidelines & Trauma Facilities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Life-Saving Emergency Instructions */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '1.75rem',
            boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(233, 162, 59, 0.15)',
                color: '#E9A23B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaShieldAlt size={16} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#102A43', margin: 0 }}>
                {t('patientPortal.emergencyInstructionsTitle') || 'Immediate Life-Saving Guidelines'}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#1677C8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>1</span>
                <span>{t('patientPortal.instruction1') || 'Stay calm and ensure the patient is breathing in an open, ventilated space.'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#1677C8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>2</span>
                <span>{t('patientPortal.instruction2') || 'Do not move patients with suspected spinal, neck, or head trauma unless immediate danger exists.'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#1677C8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>3</span>
                <span>{t('patientPortal.instruction3') || 'Never administer oral fluids or medications to an unconscious or seizing individual.'}</span>
              </div>
            </div>
          </div>

          {/* Quick Access to Network Trauma Centers */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '1.75rem',
            boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.85rem 0' }}>
              Network Trauma Centers (AP & Telangana)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {hospitals.slice(0, 4).map((h) => (
                <div
                  key={h.id}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#102A43' }}>{h.name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#718096' }}>{h.city}, {h.state}</div>
                  </div>
                  <a
                    href={`tel:${h.emergency_number || '108'}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '6px',
                      color: '#DC2626',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      textDecoration: 'none'
                    }}
                  >
                    <FaPhoneAlt size={10} />
                    <span>{h.emergency_number || '108'}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(16, 42, 67, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '440px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#DC5252' }}>
              <FaExclamationTriangle size={24} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#102A43' }}>
                Cancel Emergency Ambulance?
              </h3>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#718096', lineHeight: 1.5, margin: 0 }}>
              Are you sure you want to cancel the dispatched ambulance? If you are still in danger, do not cancel.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={cancelLoading}
                style={{
                  padding: '0.6rem 1.15rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleCancelRequest}
                disabled={cancelLoading}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#DC5252',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

