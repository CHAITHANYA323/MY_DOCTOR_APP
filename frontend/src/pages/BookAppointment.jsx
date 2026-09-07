import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FaUserMd, 
  FaCalendarAlt, 
  FaClock, 
  FaUser, 
  FaPhoneAlt, 
  FaHospital, 
  FaCheckCircle, 
  FaArrowLeft, 
  FaArrowRight, 
  FaShieldAlt,
  FaNotesMedical
} from 'react-icons/fa';
import { doctorService } from '../services/doctorService';
import { appointmentService } from '../services/appointmentService';
import { useAuth } from '../context/AuthContext';
import { getSpecialtyInfo } from '../utils/specialtyMap';

export const BookAppointment = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [error, setError] = useState('');

  // 5-Step Flow State: 1 = Doctor, 2 = Date, 3 = Time, 4 = Details, 5 = Confirm, 6 = Success
  const [step, setStep] = useState(2); // Step 1 is pre-selected doctor overview

  // Booking Data
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('10:30 AM');
  const [patientName, setPatientName] = useState(user?.name || '');
  const [patientPhone, setPatientPhone] = useState(user?.phone || '');
  const [patientAge, setPatientAge] = useState('');
  const [visitReason, setVisitReason] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  // Generate next 7 days for easy 1-click selection
  const [availableDays, setAvailableDays] = useState([]);

  useEffect(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      days.push({ dateStr, dayName, monthDay, fullDate: d });
    }
    setAvailableDays(days);
    if (days.length > 0) {
      setSelectedDate(days[1].dateStr); // Default to tomorrow
    }
  }, []);

  // Fetch Doctor Data
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoadingDoctor(true);
        const res = await doctorService.getDoctorById(doctorId);
        if (res.success && res.doctor) {
          setDoctor(res.doctor);
        } else {
          setError('Doctor information could not be found.');
        }
      } catch (err) {
        console.error(err);
        setError('Unable to load doctor profile.');
      } finally {
        setLoadingDoctor(false);
      }
    };

    if (doctorId) {
      fetchDoc();
    }
  }, [doctorId]);

  // Available Time Slots
  const morningSlots = ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM"];
  const eveningSlots = ["04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM"];

  const handleConfirmBooking = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/appointments/book/${doctorId}` } });
      return;
    }

    if (!patientName.trim()) {
      alert('Please enter the patient’s full name.');
      setStep(4);
      return;
    }

    if (!patientPhone.trim()) {
      alert('Please enter a contact phone number.');
      setStep(4);
      return;
    }

    setBookingLoading(true);
    try {
      const payload = {
        doctor_id: doctor.id,
        hospital_id: doctor.hospital_id,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        reason: visitReason.trim() ? visitReason : 'General Consultation / Health Checkup'
      };

      const res = await appointmentService.bookAppointment(payload);
      if (res.success) {
        setBookingResult({
          bookingId: res.appointment?.id || Math.floor(100000 + Math.random() * 900000),
          doctor: doctor,
          date: selectedDate,
          time: selectedTime,
          patientName: patientName
        });
        setStep(6); // Success Screen
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Booking failed. Please try selecting a different slot.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loadingDoctor) {
    return (
      <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>
        <p style={{ fontSize: '1.2rem', color: 'var(--slate-500)' }}>Loading booking details...</p>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>
        <div className="empty-state">
          <FaUserMd className="empty-state-icon" />
          <h2 className="empty-state-title">Doctor Not Found</h2>
          <p className="empty-state-desc">The doctor you are looking to book with is currently unavailable.</p>
          <Link to="/doctors" className="btn btn-primary">Find Another Doctor</Link>
        </div>
      </div>
    );
  }

  const specInfo = getSpecialtyInfo(doctor.specialization_name);

  // STEP 6: Confirmation Screen
  if (step === 6 && bookingResult) {
    return (
      <div style={{ padding: '3.5rem 0 5rem', backgroundColor: 'var(--bg-main)' }}>
        <div className="container" style={{ maxWidth: '650px' }}>
          <div className="card" style={{ padding: '3rem 2.5rem', textAlign: 'center', boxShadow: 'var(--shadow-xl)', border: '2px solid var(--success-light)' }}>
            <div style={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              backgroundColor: 'var(--success-light)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              margin: '0 auto 1.5rem'
            }}>
              <FaCheckCircle />
            </div>

            <span className="badge badge-confirmed" style={{ fontSize: '0.88rem', padding: '0.35rem 0.9rem', marginBottom: '0.75rem' }}>
              Booking Confirmed
            </span>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
              Appointment Confirmed!
            </h1>
            <p style={{ color: 'var(--slate-600)', fontSize: '1.05rem', marginBottom: '2rem' }}>
              We have booked your appointment with <strong>{doctor.name}</strong>. A confirmation SMS will be sent to your phone.
            </p>

            {/* Receipt Card */}
            <div style={{
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--slate-200)',
              padding: '1.5rem',
              textAlign: 'left',
              marginBottom: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>Booking Number:</span>
                <strong style={{ color: 'var(--slate-900)', fontSize: '1rem' }}>#MED-{bookingResult.bookingId}</strong>
              </div>

              <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>Doctor:</span>
                <strong style={{ color: 'var(--slate-900)' }}>{doctor.name} ({specInfo.layman})</strong>
              </div>

              <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>Hospital:</span>
                <strong style={{ color: 'var(--slate-900)' }}>{doctor.hospital_name}</strong>
              </div>

              <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>Date & Time:</span>
                <strong style={{ color: 'var(--primary-dark)' }}>{bookingResult.date} at {bookingResult.time}</strong>
              </div>

              <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>Patient Name:</span>
                <strong style={{ color: 'var(--slate-900)' }}>{bookingResult.patientName}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>Consultation Fee:</span>
                <strong style={{ color: 'var(--slate-900)', fontSize: '1.2rem' }}>₹{doctor.consultation_fee} (Pay at clinic)</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Link to="/appointments" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                View My Appointments
              </Link>
              <Link to="/" className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem 0 5rem', backgroundColor: 'var(--bg-main)' }}>
      <div className="container" style={{ maxWidth: '880px' }}>
        {/* Back Link */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link to={`/doctors/${doctor.id}`} className="flex items-center gap-2" style={{ color: 'var(--slate-600)', fontSize: '0.9rem', fontWeight: 600 }}>
            <FaArrowLeft /> Back to Doctor Profile
          </Link>
        </div>

        {/* Page Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.35rem' }}>
            Book an Appointment
          </h1>
          <p style={{ color: 'var(--slate-600)', fontSize: '1rem' }}>
            Complete your booking in 4 easy steps
          </p>
        </div>

        {/* 5-Step Progress Indicator */}
        <div className="step-indicator">
          <div className={`step-item ${step >= 1 ? (step > 1 ? 'completed' : 'active') : ''}`}>
            <div className="step-circle">{step > 1 ? '✓' : '1'}</div>
            <span className="step-label">Doctor</span>
          </div>
          <div className={`step-item ${step >= 2 ? (step > 2 ? 'completed' : 'active') : ''}`}>
            <div className="step-circle">{step > 2 ? '✓' : '2'}</div>
            <span className="step-label">Choose Date</span>
          </div>
          <div className={`step-item ${step >= 3 ? (step > 3 ? 'completed' : 'active') : ''}`}>
            <div className="step-circle">{step > 3 ? '✓' : '3'}</div>
            <span className="step-label">Choose Time</span>
          </div>
          <div className={`step-item ${step >= 4 ? (step > 4 ? 'completed' : 'active') : ''}`}>
            <div className="step-circle">{step > 4 ? '✓' : '4'}</div>
            <span className="step-label">Patient Details</span>
          </div>
          <div className={`step-item ${step >= 5 ? 'active' : ''}`}>
            <div className="step-circle">5</div>
            <span className="step-label">Confirm</span>
          </div>
        </div>

        {/* Doctor Summary Banner */}
        <div className="card" style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
          border: '1px solid var(--slate-200)',
          backgroundColor: 'var(--white)'
        }}>
          <img 
            src={doctor.image} 
            alt={doctor.name} 
            style={{ width: '70px', height: '70px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
          />
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '0.2rem' }}>
              <span className="badge badge-specialty">{specInfo.emoji} {specInfo.layman}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>&bull; {doctor.experience} yrs exp.</span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>{doctor.name}</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', margin: 0 }}>
              <FaHospital color="var(--primary)" size={12} /> {doctor.hospital_name} ({doctor.location})
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', display: 'block' }}>Consultation Fee</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>₹{doctor.consultation_fee}</span>
          </div>
        </div>

        {/* ================= STEP 2: CHOOSE DATE ================= */}
        {step === 2 && (
          <div className="card" style={{ padding: '2.5rem', boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
              Step 2: Choose a Consultation Date
            </h2>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Select a day that works best for you. Available days: <strong>{doctor.available_days}</strong>
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
              gap: '0.75rem',
              marginBottom: '2rem'
            }}>
              {availableDays.map((d) => {
                const isSelected = selectedDate === d.dateStr;
                return (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(d.dateStr)}
                    style={{
                      padding: '1.1rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--slate-200)',
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--white)',
                      color: isSelected ? 'var(--primary-dark)' : 'var(--slate-800)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'var(--transition)'
                    }}
                  >
                    <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      {d.dayName}
                    </span>
                    <span style={{ display: 'block', fontSize: '1.15rem', fontWeight: 800 }}>
                      {d.monthDay}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Date Input Option */}
            <div style={{ maxWidth: '300px', marginBottom: '2rem' }}>
              <label className="form-label">Or pick another date from calendar:</label>
              <input 
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '1.5rem' }}>
              <button onClick={() => navigate(`/doctors/${doctor.id}`)} className="btn btn-secondary">
                <FaArrowLeft /> Back
              </button>
              <button 
                onClick={() => setStep(3)} 
                disabled={!selectedDate}
                className="btn btn-primary btn-lg"
              >
                Continue to Time Slots <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: CHOOSE TIME ================= */}
        {step === 3 && (
          <div className="card" style={{ padding: '2.5rem', boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
              Step 3: Choose a Preferred Time
            </h2>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
              Consultation hours for {selectedDate}: <strong>{doctor.available_time}</strong>
            </p>

            {/* Morning Slots */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FaClock color="var(--primary)" /> Morning Consultation (09:00 AM – 12:00 PM)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                {morningSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    style={{
                      padding: '0.8rem 0.5rem',
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid',
                      borderColor: selectedTime === slot ? 'var(--primary)' : 'var(--slate-200)',
                      backgroundColor: selectedTime === slot ? 'var(--primary)' : 'var(--white)',
                      color: selectedTime === slot ? 'white' : 'var(--slate-800)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      transition: 'var(--transition)'
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Evening Slots */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FaClock color="var(--secondary)" /> Evening Consultation (04:00 PM – 07:00 PM)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                {eveningSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    style={{
                      padding: '0.8rem 0.5rem',
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid',
                      borderColor: selectedTime === slot ? 'var(--primary)' : 'var(--slate-200)',
                      backgroundColor: selectedTime === slot ? 'var(--primary)' : 'var(--white)',
                      color: selectedTime === slot ? 'white' : 'var(--slate-800)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      transition: 'var(--transition)'
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '1.5rem' }}>
              <button onClick={() => setStep(2)} className="btn btn-secondary">
                <FaArrowLeft /> Change Date
              </button>
              <button 
                onClick={() => setStep(4)} 
                disabled={!selectedTime}
                className="btn btn-primary btn-lg"
              >
                Enter Patient Details <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: PATIENT DETAILS ================= */}
        {step === 4 && (
          <div className="card" style={{ padding: '2.5rem', boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
              Step 4: Enter Patient Details
            </h2>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
              Who is this consultation for? Please provide accurate contact details for hospital check-in.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Patient Full Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Rahul Sharma"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone Number *</label>
                <input 
                  type="text" 
                  placeholder="e.g. +91 98765 43210"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Patient Age (Years)</label>
                <input 
                  type="number" 
                  min="1"
                  max="120"
                  placeholder="e.g. 34"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Visit / Main Symptoms</label>
              <textarea 
                rows="3"
                placeholder="Briefly describe what you would like to discuss (e.g. Chest heaviness, regular annual checkup, headache follow-up...)"
                value={visitReason}
                onChange={(e) => setVisitReason(e.target.value)}
                className="form-textarea"
              />
            </div>

            <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '1.5rem' }}>
              <button onClick={() => setStep(3)} className="btn btn-secondary">
                <FaArrowLeft /> Change Time
              </button>
              <button 
                onClick={() => {
                  if (!patientName.trim() || !patientPhone.trim()) {
                    alert('Please fill in both patient name and phone number.');
                    return;
                  }
                  setStep(5);
                }} 
                className="btn btn-primary btn-lg"
              >
                Review & Confirm <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 5: REVIEW & CONFIRM ================= */}
        {step === 5 && (
          <div className="card" style={{ padding: '2.5rem', boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
              Step 5: Review & Confirm Booking
            </h2>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
              Please check your appointment summary below before confirming.
            </p>

            {/* Final Summary Card */}
            <div style={{
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--slate-200)',
              padding: '1.75rem',
              marginBottom: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Doctor:</span>
                <strong style={{ color: 'var(--slate-900)' }}>{doctor.name}</strong>
              </div>

              <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Specialty:</span>
                <strong style={{ color: 'var(--slate-900)' }}>{specInfo.emoji} {specInfo.layman} ({doctor.specialization_name})</strong>
              </div>

              <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Hospital / Clinic:</span>
                <strong style={{ color: 'var(--slate-900)' }}>{doctor.hospital_name}, {doctor.location}</strong>
              </div>

              <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Scheduled Slot:</span>
                <strong style={{ color: 'var(--primary-dark)', fontSize: '1.05rem' }}>
                  {selectedDate} at {selectedTime}
                </strong>
              </div>

              <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Patient:</span>
                <strong style={{ color: 'var(--slate-900)' }}>{patientName} ({patientPhone})</strong>
              </div>

              {visitReason && (
                <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Symptoms:</span>
                  <span style={{ color: 'var(--slate-700)', maxWidth: '350px', textAlign: 'right' }}>{visitReason}</span>
                </div>
              )}

              <div className="flex items-center justify-between" style={{ paddingTop: '0.5rem' }}>
                <div>
                  <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.85rem' }}>Consultation Fee</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700 }}>Zero Booking Charges</span>
                </div>
                <strong style={{ color: 'var(--slate-900)', fontSize: '1.5rem' }}>
                  ₹{doctor.consultation_fee}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2" style={{ backgroundColor: 'var(--primary-ultralight)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-light)', marginBottom: '2rem' }}>
              <FaShieldAlt color="var(--primary)" size={18} />
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-700)', margin: 0 }}>
                Instant confirmed booking. You can cancel anytime before your appointment with zero cancellation fees.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(4)} className="btn btn-secondary">
                <FaArrowLeft /> Edit Details
              </button>
              <button 
                onClick={handleConfirmBooking}
                disabled={bookingLoading}
                className="btn btn-primary btn-lg"
                style={{ minWidth: '220px' }}
              >
                {bookingLoading ? 'Securing Slot...' : 'Confirm Appointment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
