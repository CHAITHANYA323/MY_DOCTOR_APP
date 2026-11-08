import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaSearch,
  FaUserMd,
  FaHospital,
  FaStar,
  FaClock,
  FaCalendarCheck,
  FaTimes,
  FaSync
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { doctorService } from '../../services/doctorService';
import { hospitalService } from '../../services/hospitalService';
import { patientService } from '../../services/patientService';

export const SearchDoctors = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('');
  const [selectedHosp, setSelectedHosp] = useState('');
  const [sortBy, setSortBy] = useState('rating_desc');

  // Booking Modal States
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00 AM');
  const [reason, setReason] = useState('');
  const [booking, setBooking] = useState(false);

  const fetchFilters = useCallback(async () => {
    try {
      const [specRes, hospRes] = await Promise.all([
        doctorService.getSpecializations(),
        hospitalService.getHospitals({ limit: 50 })
      ]);
      if (specRes.success) setSpecializations(specRes.specializations || []);
      if (hospRes.success) setHospitals(hospRes.hospitals || []);
    } catch (err) {
      console.error('Error fetching filter data:', err);
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim(),
        specialization: selectedSpec,
        hospital_id: selectedHosp,
        sort_by: sortBy,
        limit: 50
      };
      const res = await doctorService.getDoctors(params);
      if (res.success) {
        setDoctors(res.doctors || []);
      } else {
        toast.error(res.message || 'Failed to load doctors.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error searching doctors.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedSpec, selectedHosp, sortBy]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoctors();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchDoctors]);

  const handleOpenBooking = (doc) => {
    setBookingDoctor(doc);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setAppointmentDate(tomorrow.toISOString().split('T')[0]);
    setAppointmentTime('10:00 AM');
    setReason('');
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!bookingDoctor) return;
    if (!appointmentDate || !appointmentTime || !reason.trim()) {
      toast.error('Please fill in appointment date, slot time, and consultation reason.');
      return;
    }

    try {
      setBooking(true);
      const res = await patientService.bookAppointment({
        doctor_id: bookingDoctor.id,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        reason: reason.trim()
      });

      if (res.success) {
        toast.success(`Appointment confirmed with ${bookingDoctor.name}!`);
        setBookingDoctor(null);
        navigate('/patient/appointments');
      } else {
        toast.error(res.message || 'Booking failed.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error booking appointment slot.');
    } finally {
      setBooking(false);
    }
  };

  const todayMinDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ];

  return (
    <div>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>
            Find & Consult Specialists
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Browse verified physicians across departments and schedule consultations ({doctors.length} doctors available)
          </p>
        </div>

        <button
          onClick={fetchDoctors}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <FaSync size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search and Filters Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        marginBottom: '1.75rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem'
      }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <FaSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by doctor name or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem 0.65rem 2.25rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.875rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Specialization */}
        <div>
          <select
            value={selectedSpec}
            onChange={(e) => setSelectedSpec(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.875rem',
              background: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="">All Specializations</option>
            {specializations.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Hospital */}
        <div>
          <select
            value={selectedHosp}
            onChange={(e) => setSelectedHosp(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.875rem',
              background: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="">All Hospital Centers</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name} ({h.city})</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.875rem',
              background: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="rating_desc">Highest Rated</option>
            <option value="experience_desc">Most Experienced</option>
            <option value="fee_asc">Consultation Fee: Low to High</option>
            <option value="fee_desc">Consultation Fee: High to Low</option>
          </select>
        </div>
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
          <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', margin: '0 auto 1rem auto' }} />
          <p>Searching for specialists...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <FaUserMd size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>No Doctors Found</h3>
          <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
            Try resetting your search query or choosing another department or facility.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}>
          {doctors.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                {/* Doctor Head */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {doc.image ? (
                      <img src={doc.image} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <FaUserMd size={26} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '999px', background: '#e0f2fe', color: '#0369a1' }}>
                        {doc.specialization_name || 'Specialist'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem', color: '#ea580c', fontWeight: 700 }}>
                        <FaStar size={12} /> {doc.rating || 4.9}
                      </div>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0.25rem 0 0.15rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.name}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {doc.qualification} • {doc.experience} Yrs Exp
                    </div>
                  </div>
                </div>

                {/* Facility info */}
                <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FaHospital size={13} style={{ color: '#0284c7', flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.hospital_name} ({doc.location})
                  </span>
                </div>

                {/* Working hours */}
                <div style={{ fontSize: '0.8rem', color: '#64748b', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                    <FaClock size={11} style={{ color: '#0284c7' }} />
                    <span>{doc.available_days || 'Mon - Sat'}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {doc.available_time || '09:00 AM - 05:00 PM'}
                  </div>
                </div>
              </div>

              {/* Bottom Card Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Fee</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    ₹{doc.consultation_fee}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenBooking(doc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.25rem',
                    background: '#0284c7',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <FaCalendarCheck size={12} />
                  Book Visit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Appointment Booking Modal */}
      {bookingDoctor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaCalendarCheck size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    Schedule Consultation
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                    {bookingDoctor.name} ({bookingDoctor.specialization_name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBookingDoctor(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Doctor & Facility Summary Card */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#334155' }}>
              <div><strong>Facility:</strong> {bookingDoctor.hospital_name} - {bookingDoctor.location}</div>
              <div style={{ marginTop: '0.25rem' }}><strong>Consultation Fee:</strong> ₹{bookingDoctor.consultation_fee} (payable at hospital or online)</div>
              <div style={{ marginTop: '0.25rem' }}><strong>Physician Schedule:</strong> {bookingDoctor.available_days} ({bookingDoctor.available_time})</div>
            </div>

            <form onSubmit={handleConfirmBooking}>
              {/* Date */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                  Appointment Date:
                </label>
                <input
                  type="date"
                  min={todayMinDate}
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Time Slot */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                  Available Time Slot:
                </label>
                <select
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                  required
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                  Reason for Visit / Symptoms:
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe your health symptoms, medical concern, or follow-up reason..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setBookingDoctor(null)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={booking}
                  style={{
                    padding: '0.65rem 1.5rem',
                    background: '#0284c7',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: booking ? 'not-allowed' : 'pointer'
                  }}
                >
                  {booking ? 'Confirming...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
