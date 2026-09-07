import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FaStar, 
  FaMapMarkerAlt, 
  FaHospital, 
  FaCalendarAlt, 
  FaClock, 
  FaPhoneAlt, 
  FaAward, 
  FaCheckCircle, 
  FaUserMd, 
  FaPaperPlane, 
  FaArrowLeft,
  FaArrowRight,
  FaShieldAlt,
  FaNotesMedical,
  FaAmbulance
} from 'react-icons/fa';
import { doctorService } from '../services/doctorService';
import { appointmentService } from '../services/appointmentService';
import { useAuth } from '../context/AuthContext';
import { getSpecialtyInfo } from '../utils/specialtyMap';

export const DoctorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Quick Inline Booking Form State
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00 AM');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');

  // Review Form State
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');

  const timeSlots = [
    "09:30 AM", "10:30 AM", "11:30 AM", 
    "02:00 PM", "03:30 PM", "04:30 PM", "06:00 PM"
  ];

  // Set default booking date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    setBookingDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  const fetchDoctor = async () => {
    try {
      setLoading(true);
      const res = await doctorService.getDoctorById(id);
      if (res.success) {
        setDoctor(res.doctor);
      } else {
        setError(res.message || 'Doctor not found.');
      }
    } catch (err) {
      setError('Unable to load doctor information.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctor();
  }, [id]);

  const handleQuickBookAppointment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/doctors/${id}` } });
      return;
    }

    if (!bookingDate || !bookingTime || !bookingReason.trim()) {
      alert('Please select appointment date, time slot, and brief symptom reason.');
      return;
    }

    setBookingLoading(true);
    setBookingSuccess('');
    try {
      const res = await appointmentService.bookAppointment({
        doctor_id: doctor.id,
        hospital_id: doctor.hospital_id,
        appointment_date: bookingDate,
        appointment_time: bookingTime,
        reason: bookingReason
      });

      if (res.success) {
        setBookingSuccess(res.message || 'Appointment confirmed successfully!');
        setBookingReason('');
        setTimeout(() => {
          navigate('/appointments');
        }, 1500);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to book appointment. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/doctors/${id}` } });
      return;
    }

    if (!reviewComment.trim()) {
      alert('Please write a brief comment sharing your experience.');
      return;
    }

    setReviewLoading(true);
    setReviewSuccess('');
    try {
      const res = await doctorService.addReview({
        doctor_id: doctor.id,
        rating: ratingInput,
        comment: reviewComment
      });

      if (res.success) {
        setReviewSuccess('Review submitted successfully!');
        setReviewComment('');
        fetchDoctor();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting review.');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1.25rem', minHeight: '60vh' }}>
        <div className="skeleton" style={{ height: '40px', width: '180px', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)' }} />
        <div className="skeleton" style={{ height: '240px', borderRadius: 'var(--radius-xl)', marginBottom: '2rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }} />
          <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }} />
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="container" style={{ padding: '5rem 1.25rem', textAlign: 'center' }}>
        <div className="empty-state">
          <FaUserMd className="empty-state-icon" />
          <h2 className="empty-state-title">Doctor Profile Not Found</h2>
          <p className="empty-state-desc">The doctor profile you requested might have been moved or is currently unavailable.</p>
          <Link to="/doctors" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaArrowLeft /> Return to Doctor Listing
          </Link>
        </div>
      </div>
    );
  }

  const specialtyInfo = getSpecialtyInfo(doctor.specialization_name);

  return (
    <div style={{ padding: '2rem 0 4rem', backgroundColor: 'var(--bg-main)', minHeight: '85vh' }}>
      <div className="container">
        {/* Navigation Breadcrumb / Back Link */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <Link 
            to="/doctors" 
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            <FaArrowLeft /> Back to All Doctors
          </Link>

          <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>Doctors</span> &rsaquo;
            <span style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>{doctor.specialization_name}</span> &rsaquo;
            <span style={{ color: 'var(--slate-800)', fontWeight: 700 }}>{doctor.name}</span>
          </div>
        </div>

        {/* Profile Header Banner Card */}
        <div className="card" style={{
          padding: '2.25rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
          border: '1px solid var(--slate-200)',
          boxShadow: 'var(--shadow-md)',
          borderRadius: 'var(--radius-xl)'
        }}>
          <div style={{
            display: 'flex',
            gap: '2rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Doctor Photo */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img 
                src={doctor.image} 
                alt={doctor.name}
                style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '24px',
                  objectFit: 'cover',
                  border: '4px solid white',
                  boxShadow: 'var(--shadow-md)'
                }} 
              />
              <div style={{
                position: 'absolute',
                bottom: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--success)',
                color: 'white',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.2rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <FaCheckCircle size={10} /> Verified Doctor
              </div>
            </div>

            {/* Doctor Core Info */}
            <div style={{ flex: 1, minWidth: '280px' }}>
              {/* Layman Specialty Badge */}
              <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{
                  backgroundColor: specialtyInfo.color + '15',
                  color: specialtyInfo.color,
                  border: `1px solid ${specialtyInfo.color}30`,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  padding: '0.3rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <span>{specialtyInfo.emoji}</span>
                  <span>{specialtyInfo.laymanName}</span>
                  <span style={{ opacity: 0.7, fontSize: '0.78rem' }}>({doctor.specialization_name})</span>
                </span>

                <div className="flex items-center gap-1" style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                  <FaStar color="#f59e0b" size={15} />
                  <span>{doctor.rating}</span>
                  <span style={{ color: 'var(--slate-500)', fontSize: '0.82rem', fontWeight: 500 }}>
                    ({doctor.total_reviews} reviews)
                  </span>
                </div>

                <span style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: '#059669',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-full)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  🟢 Available Today
                </span>
              </div>

              <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
                {doctor.name}
              </h1>

              <p style={{ fontSize: '0.98rem', color: 'var(--slate-600)', marginBottom: '1rem', fontWeight: 500 }}>
                {doctor.qualification} &bull; <strong style={{ color: 'var(--slate-800)' }}>{doctor.experience} Years Experience</strong>
              </p>

              {/* Location & Hospital links */}
              <div className="flex items-center gap-4" style={{ flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--slate-600)' }}>
                <div className="flex items-center gap-1">
                  <FaHospital color="var(--primary)" />
                  <Link to={`/hospitals/${doctor.hospital_id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'underline' }}>
                    {doctor.hospital_name}
                  </Link>
                </div>
                <div className="flex items-center gap-1">
                  <FaMapMarkerAlt color="var(--slate-400)" />
                  <span>{doctor.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FaClock color="var(--slate-400)" />
                  <span>{doctor.available_time}</span>
                </div>
              </div>
            </div>

            {/* Right Fee & Guided Booking CTA Box */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem 1.75rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--slate-200)',
              textAlign: 'center',
              boxShadow: 'var(--shadow-md)',
              minWidth: '240px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Consultation Fee
              </span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                ₹{doctor.consultation_fee}
              </span>

              {/* Primary Guided 5-Step Booking Button */}
              <Link 
                to={`/appointments/book/${doctor.id}`}
                className="btn btn-primary"
                style={{ 
                  width: '100%', 
                  padding: '0.75rem 1rem', 
                  fontSize: '0.98rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                }}
              >
                <FaCalendarAlt /> Book Appointment <FaArrowRight size={12} />
              </Link>

              {/* Secondary Call Doctor Button */}
              <a 
                href={`tel:${doctor.phone || '+918912233441'}`}
                className="btn btn-secondary"
                style={{ 
                  width: '100%', 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.88rem'
                }}
              >
                <FaPhoneAlt size={12} /> Call Doctor's Clinic
              </a>

              <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
                ⚡ Simple 5-step guided booking
              </span>
            </div>
          </div>
        </div>

        {/* Details Two-Column Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.8fr 1.2fr',
          gap: '2.5rem',
          alignItems: 'flex-start'
        }} className="doctor-details-grid">

          {/* Left Column: Doctor Details, Qualifications, Reviews */}
          <div>
            {/* About Doctor */}
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--slate-900)' }}>
                About {doctor.name}
              </h3>
              <p style={{ fontSize: '1rem', color: 'var(--slate-700)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                {doctor.about || `Dr. ${doctor.name} is an experienced medical specialist dedicated to delivering compassionate, patient-centered clinical care in ${specialtyInfo.laymanName}. With over ${doctor.experience} years of clinical expertise, they focus on preventive guidance, accurate diagnosis, and personalized treatment plans.`}
              </p>

              {/* Clinical Specs Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                backgroundColor: 'var(--slate-50)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--slate-200)',
                marginBottom: '1.5rem'
              }}>
                <div>
                  <span style={{ fontSize: '0.76rem', color: 'var(--slate-500)', fontWeight: 700, textTransform: 'uppercase' }}>Available Days</span>
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-800)', marginTop: '0.2rem' }}>{doctor.available_days}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.76rem', color: 'var(--slate-500)', fontWeight: 700, textTransform: 'uppercase' }}>Clinic Timings</span>
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-800)', marginTop: '0.2rem' }}>{doctor.available_time}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.76rem', color: 'var(--slate-500)', fontWeight: 700, textTransform: 'uppercase' }}>Languages Spoken</span>
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-800)', marginTop: '0.2rem' }}>{doctor.languages}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.76rem', color: 'var(--slate-500)', fontWeight: 700, textTransform: 'uppercase' }}>Consultation Type</span>
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--secondary)', marginTop: '0.2rem' }}>{doctor.consultation_type}</p>
                </div>
              </div>

              {/* Education & Qualifications */}
              <div style={{
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--slate-100)'
              }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaAward color="var(--primary)" /> Education & Clinical Background
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="flex items-center gap-2" style={{ fontSize: '0.92rem', color: 'var(--slate-700)' }}>
                    <FaCheckCircle color="var(--success)" size={14} />
                    <strong>Degree / Qualifications:</strong> <span>{doctor.qualification}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ fontSize: '0.92rem', color: 'var(--slate-700)' }}>
                    <FaCheckCircle color="var(--success)" size={14} />
                    <strong>Specialization Area:</strong> <span>{specialtyInfo.laymanName} ({doctor.specialization_name})</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ fontSize: '0.92rem', color: 'var(--slate-700)' }}>
                    <FaCheckCircle color="var(--success)" size={14} />
                    <strong>Clinical Experience:</strong> <span>{doctor.experience} Years Active Hospital Practice</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hospital Overview Card */}
            {doctor.hospital_details && (
              <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--slate-900)' }}>
                  Hospital Affiliation
                </h3>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <img 
                    src={doctor.hospital_details.image} 
                    alt={doctor.hospital_name} 
                    style={{ width: '130px', height: '95px', borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '1px solid var(--slate-200)' }} 
                  />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--slate-900)' }}>
                      {doctor.hospital_name}
                    </h4>
                    <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginBottom: '0.75rem' }}>
                      {doctor.hospital_details.address}, {doctor.hospital_details.city}
                    </p>
                    <div className="flex items-center gap-3">
                      <a href={`tel:${doctor.hospital_details.phone}`} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FaPhoneAlt size={10} /> Call Hospital
                      </a>
                      <Link to={`/hospitals/${doctor.hospital_id}`} className="btn btn-outline btn-sm">
                        View Hospital Facilities
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="card" style={{ padding: '2rem' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                    Patient Reviews ({doctor.reviews?.length || 0})
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>Real feedback from verified consultations</p>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>{doctor.rating}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
                      <FaStar size={14} />
                      <FaStar size={14} />
                      <FaStar size={14} />
                      <FaStar size={14} />
                      <FaStar size={14} />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>Overall Rating</span>
                  </div>
                </div>
              </div>

              {/* Review List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
                {(!doctor.reviews || doctor.reviews.length === 0) ? (
                  <p style={{ color: 'var(--slate-500)', fontSize: '0.92rem', fontStyle: 'italic', padding: '1rem 0' }}>
                    No reviews yet for Dr. {doctor.name}. Be the first patient to share your feedback!
                  </p>
                ) : (
                  doctor.reviews.map((rev) => (
                    <div key={rev.id} style={{
                      padding: '1.25rem',
                      backgroundColor: 'var(--slate-50)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--slate-100)'
                    }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                        <div className="flex items-center gap-2">
                          <span style={{ fontWeight: 700, color: 'var(--slate-800)', fontSize: '0.92rem' }}>
                            {rev.user_name}
                          </span>
                          <span className="badge badge-completed" style={{ fontSize: '0.7rem' }}>
                            Verified Patient
                          </span>
                        </div>
                        <div className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <FaStar key={i} size={12} />
                          ))}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.92rem', color: 'var(--slate-700)', lineHeight: 1.5 }}>
                        "{rev.comment}"
                      </p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginTop: '0.4rem' }}>
                        Reviewed on {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Add Review Form */}
              <div style={{
                backgroundColor: 'var(--primary-ultralight)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--primary-light)'
              }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.35rem' }}>
                  Write a Review
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '1rem' }}>
                  Share your experience to help other patients find great care.
                </p>

                {reviewSuccess && (
                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontWeight: 600 }}>
                    {reviewSuccess}
                  </div>
                )}

                <form onSubmit={handleAddReview}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Your Rating</label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingInput(star)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: star <= ratingInput ? '#f59e0b' : 'var(--slate-300)',
                            fontSize: '1.6rem',
                            padding: '0 0.15rem'
                          }}
                        >
                          ★
                        </button>
                      ))}
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, marginLeft: '0.5rem', color: 'var(--slate-700)' }}>
                        {ratingInput} Stars
                      </span>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Review Comment</label>
                    <textarea 
                      rows="3"
                      placeholder="Describe the doctor's explanation, bedside manner, clinic hygiene, and staff behavior..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="form-textarea"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={reviewLoading}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <FaPaperPlane /> {reviewLoading ? 'Submitting...' : 'Post Review'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column: Guided Booking Flow Card + Quick Option */}
          <div>
            {/* Guided Booking Spotlight Card */}
            <div className="card" style={{
              padding: '1.75rem',
              borderRadius: 'var(--radius-xl)',
              border: '2px solid var(--primary-light)',
              background: 'linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)',
              marginBottom: '1.5rem',
              boxShadow: 'var(--shadow-md)'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary-dark)',
                padding: '0.3rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: '1rem'
              }}>
                <FaCalendarAlt /> Recommended Option
              </div>

              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.4rem' }}>
                Guided 5-Step Booking
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Our step-by-step booking guide walks you through choosing the best date, time, and entering your symptoms easily.
              </p>

              {/* 5-step visual list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--slate-700)' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>1</span>
                  <span>Review Doctor & Department</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--slate-700)' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>2</span>
                  <span>Pick Your Preferred Date</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--slate-700)' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>3</span>
                  <span>Choose Convenient Time Slot</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--slate-700)' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>4</span>
                  <span>Enter Patient Symptoms / Details</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--slate-700)' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>5</span>
                  <span>Instant Confirmation & Mobile Receipt</span>
                </div>
              </div>

              <Link 
                to={`/appointments/book/${doctor.id}`}
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                  fontWeight: 700
                }}
              >
                Start Guided Booking <FaArrowRight size={13} />
              </Link>
            </div>

            {/* Quick 1-Page Booking Form Accordion / Alternative */}
            <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.35rem' }}>
                Quick 1-Page Booking
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>
                Prefer to book right here? Fill in the details below:
              </p>

              {bookingSuccess && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'var(--success-light)',
                  color: '#047857',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <FaCheckCircle size={16} />
                  <span>{bookingSuccess}</span>
                </div>
              )}

              <form onSubmit={handleQuickBookAppointment}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}>
                    <FaCalendarAlt color="var(--primary)" /> Consultation Date
                  </label>
                  <input 
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}>
                    <FaClock color="var(--primary)" /> Time Slot
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setBookingTime(slot)}
                        style={{
                          padding: '0.45rem 0.2rem',
                          fontSize: '0.78rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid',
                          borderColor: bookingTime === slot ? 'var(--primary)' : 'var(--slate-200)',
                          backgroundColor: bookingTime === slot ? 'var(--primary)' : 'var(--white)',
                          color: bookingTime === slot ? 'white' : 'var(--slate-700)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontSize: '0.88rem' }}>Symptoms / Notes</label>
                  <textarea 
                    rows="2"
                    placeholder="e.g. Fever, routine checkup, heart check, second opinion..."
                    value={bookingReason}
                    onChange={(e) => setBookingReason(e.target.value)}
                    required
                    className="form-textarea"
                  />
                </div>

                <div style={{
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  border: '1px solid var(--slate-200)',
                  marginBottom: '1.25rem',
                  fontSize: '0.85rem'
                }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Consultation Fee:</span>
                    <strong style={{ color: 'var(--slate-900)' }}>₹{doctor.consultation_fee}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--slate-500)' }}>Online Platform Fee:</span>
                    <strong style={{ color: 'var(--success)' }}>FREE</strong>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={bookingLoading}
                  className="btn btn-outline" 
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <FaCheckCircle /> {bookingLoading ? 'Submitting...' : 'Confirm Appointment'}
                </button>
              </form>
            </div>

            {/* Emergency 108 Card */}
            <div style={{
              marginTop: '1.5rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FaAmbulance size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#991b1b', fontSize: '0.9rem', display: 'block' }}>
                  Medical Emergency?
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#7f1d1d' }}>
                  Call 108 ambulance or visit emergency OPD immediately.
                </span>
              </div>
              <a 
                href="tel:108" 
                className="btn btn-danger btn-sm"
                style={{ flexShrink: 0 }}
              >
                108
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .doctor-details-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default DoctorDetails;
