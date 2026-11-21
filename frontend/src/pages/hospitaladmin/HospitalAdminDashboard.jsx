import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUserMd,
  FaClipboardList,
  FaUsers,
  FaCalendarCheck,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaBuilding,
  FaChartLine,
  FaArrowRight,
  FaPlus,
  FaCheck,
  FaChevronDown,
  FaChevronUp,
  FaHospital
} from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import { ecosystemService } from '../../services/ecosystemService';

export const HospitalAdminDashboard = () => {
  const { isTelugu } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGuide, setShowGuide] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ecosystemService.getHospitalAdminDashboard();
      if (res.success) {
        setData(res);
      } else {
        setError(res.message || 'Unable to load dashboard data.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error connecting to hospital server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem', color: '#1d4ed8' }}>
        <div style={{ width: 44, height: 44, border: '4px solid #bfdbfe', borderTop: '4px solid #1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontWeight: 600, color: '#64748b' }}>
          {isTelugu ? 'హాస్పిటల్ సమాచారాన్ని లోడ్ చేస్తోంది...' : 'Loading Hospital Information...'}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '14px', color: '#b91c1c' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800 }}>
          {isTelugu ? 'సమాచారం లోడ్ చేయడంలో లోపం' : 'Error Loading Dashboard'}
        </h3>
        <p style={{ margin: '0 0 1rem' }}>{error}</p>
        <button
          onClick={fetchDashboard}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
        >
          {isTelugu ? 'మళ్ళీ ప్రయత్నించండి' : 'Retry'}
        </button>
      </div>
    );
  }

  const hospital = data?.hospital || {};
  const metrics = data?.metrics || {};
  const trends = data?.appointment_trends || [];
  const activities = data?.recent_activity || [];

  const hasHospitalDetails = !!(hospital.phone && hospital.address);
  const hasDoctors = (metrics.total_doctors || 0) > 0;
  const hasReceptionists = (metrics.total_receptionists || 0) > 0;
  const hasAppointments = (metrics.total_appointments || 0) > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Friendly Welcome Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 55%, #0d9488 100%)',
        borderRadius: '16px',
        padding: 'clamp(1.25rem, 2.5vw, 2rem)',
        color: 'white',
        boxShadow: '0 8px 24px -4px rgba(30, 58, 138, 0.22)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem'
      }}>
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(255,255,255,0.18)', padding: '0.25rem 0.65rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.65rem' }}>
            <FaCheckCircle color="#86efac" />
            <span>{isTelugu ? 'ధృవీకరించబడిన ఆసుపత్రి' : 'Verified Hospital Facility'}</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.85rem)', fontWeight: 800, margin: '0 0 0.35rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
            {isTelugu ? 'మీ ఆసుపత్రి డ్యాష్‌బోర్డ్‌కు స్వాగతం' : 'Welcome to your Hospital Dashboard'}
          </h2>
          <p style={{ margin: '0 0 0.65rem', fontSize: '1.1rem', fontWeight: 700, color: '#93c5fd' }}>
            {hospital.name || 'Your Hospital'}
          </p>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.88rem', lineHeight: 1.5, maxWidth: '620px' }}>
            {isTelugu
              ? 'మీ వైద్యులు, సిబ్బంది, అపాయింట్‌మెంట్లు మరియు ఆసుపత్రి సమాచారాన్ని ఒకే చోట సులభంగా నిర్వహించండి.'
              : 'Manage your doctors, staff, appointments and hospital information from one place.'}
          </p>
        </div>

        {/* Banner Quick Actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
          <Link
            to="/hospital-admin/hospital"
            style={{
              padding: '0.65rem 1.1rem',
              backgroundColor: 'white',
              color: '#1e3a8a',
              borderRadius: '9px',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <FaBuilding /> <span>{isTelugu ? 'హాస్పిటల్ వివరాలు' : 'Hospital Details'}</span>
          </Link>
          <Link
            to="/hospital-admin/appointments"
            style={{
              padding: '0.65rem 1.1rem',
              backgroundColor: 'rgba(255,255,255,0.18)',
              color: 'white',
              borderRadius: '9px',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <FaCalendarCheck /> <span>{isTelugu ? 'అపాయింట్‌మెంట్లు' : 'Manage Appointments'}</span>
          </Link>
        </div>
      </div>

      {/* 2. First-Time Setup / Onboarding Checklist Guide */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div
          onClick={() => setShowGuide(!showGuide)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.95rem'
            }}>
              📋
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {isTelugu ? 'ఆసుపత్రి ప్రారంభ సెటప్ గైడ్' : 'Hospital Setup & Operations Guide'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                {isTelugu ? 'మీ ఆసుపత్రి కార్యకలాపాలను ప్రారంభించడానికి ఈ 4 సాధారణ దశలను అనుసరించండి' : 'Follow these 4 simple steps to set up and operate your hospital smoothly'}
              </p>
            </div>
          </div>
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}
            aria-label={showGuide ? "Hide Guide" : "Show Guide"}
          >
            {showGuide ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>

        {showGuide && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '0.85rem',
            marginTop: '1.15rem',
            paddingTop: '1.15rem',
            borderTop: '1px solid #f1f5f9'
          }}>
            {/* Step 1 */}
            <div style={{
              padding: '0.9rem',
              borderRadius: '10px',
              backgroundColor: hasHospitalDetails ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${hasHospitalDetails ? '#bbf7d0' : '#fde68a'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: hasHospitalDetails ? '#16a34a' : '#d97706', textTransform: 'uppercase' }}>
                  {isTelugu ? 'దశ 1' : 'Step 1'}
                </span>
                {hasHospitalDetails ? <FaCheck color="#16a34a" size={13} /> : <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 700 }}>In Progress</span>}
              </div>
              <strong style={{ fontSize: '0.86rem', color: '#0f172a', display: 'block', marginBottom: '0.25rem' }}>
                {isTelugu ? 'ఆసుపత్రి వివరాలు' : 'Hospital Details'}
              </strong>
              <p style={{ margin: '0 0 0.65rem', fontSize: '0.76rem', color: '#475569', lineHeight: 1.4 }}>
                {isTelugu ? 'చిరునామా, ఫోన్ నంబర్ మరియు అత్యవసర హాట్‌లైన్ నమోదు చేయండి.' : 'Ensure address, phone number, and emergency hotline are up to date.'}
              </p>
              <Link to="/hospital-admin/hospital" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}>
                {isTelugu ? 'వివరాలు చూడండి →' : 'Edit Details →'}
              </Link>
            </div>

            {/* Step 2 */}
            <div style={{
              padding: '0.9rem',
              borderRadius: '10px',
              backgroundColor: hasDoctors ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${hasDoctors ? '#bbf7d0' : '#e2e8f0'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: hasDoctors ? '#16a34a' : '#64748b', textTransform: 'uppercase' }}>
                  {isTelugu ? 'దశ 2' : 'Step 2'}
                </span>
                {hasDoctors ? <FaCheck color="#16a34a" size={13} /> : <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Ready</span>}
              </div>
              <strong style={{ fontSize: '0.86rem', color: '#0f172a', display: 'block', marginBottom: '0.25rem' }}>
                {isTelugu ? 'వైద్యుల బృందం' : 'Doctors Team'}
              </strong>
              <p style={{ margin: '0 0 0.65rem', fontSize: '0.76rem', color: '#475569', lineHeight: 1.4 }}>
                {isTelugu ? 'మీ ఆసుపత్రిలో సేవలు అందించే వైద్యులను జాబితా చేయండి.' : 'Review doctors, consult fees, and availability schedules.'}
              </p>
              <Link to="/hospital-admin/doctors" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}>
                {isTelugu ? 'వైద్యులను నిర్వహించండి →' : 'Manage Doctors →'}
              </Link>
            </div>

            {/* Step 3 */}
            <div style={{
              padding: '0.9rem',
              borderRadius: '10px',
              backgroundColor: hasReceptionists ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${hasReceptionists ? '#bbf7d0' : '#e2e8f0'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: hasReceptionists ? '#16a34a' : '#64748b', textTransform: 'uppercase' }}>
                  {isTelugu ? 'దశ 3' : 'Step 3'}
                </span>
                {hasReceptionists ? <FaCheck color="#16a34a" size={13} /> : <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Ready</span>}
              </div>
              <strong style={{ fontSize: '0.86rem', color: '#0f172a', display: 'block', marginBottom: '0.25rem' }}>
                {isTelugu ? 'రిసెప్షన్ సిబ్బంది' : 'Reception Staff'}
              </strong>
              <p style={{ margin: '0 0 0.65rem', fontSize: '0.76rem', color: '#475569', lineHeight: 1.4 }}>
                {isTelugu ? 'రోగుల చెక్-ఇన్ మరియు అపాయింట్‌మెంట్ల కోసం సిబ్బందిని జోడించండి.' : 'Add front-desk staff to handle walk-ins and patient check-ins.'}
              </p>
              <Link to="/hospital-admin/receptionists" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}>
                {isTelugu ? 'సిబ్బందిని నిర్వహించండి →' : 'Manage Staff →'}
              </Link>
            </div>

            {/* Step 4 */}
            <div style={{
              padding: '0.9rem',
              borderRadius: '10px',
              backgroundColor: hasAppointments ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${hasAppointments ? '#bbf7d0' : '#e2e8f0'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: hasAppointments ? '#16a34a' : '#64748b', textTransform: 'uppercase' }}>
                  {isTelugu ? 'దశ 4' : 'Step 4'}
                </span>
                {hasAppointments ? <FaCheck color="#16a34a" size={13} /> : <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Ready</span>}
              </div>
              <strong style={{ fontSize: '0.86rem', color: '#0f172a', display: 'block', marginBottom: '0.25rem' }}>
                {isTelugu ? 'అపాయింట్‌మెంట్లు' : 'Review Appointments'}
              </strong>
              <p style={{ margin: '0 0 0.65rem', fontSize: '0.76rem', color: '#475569', lineHeight: 1.4 }}>
                {isTelugu ? 'రోగుల బుకింగ్‌లను సమీక్షించి, ఆమోదించండి లేదా రద్దు చేయండి.' : 'Review patient bookings, approve requests, and track visit status.'}
              </p>
              <Link to="/hospital-admin/appointments" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}>
                {isTelugu ? 'అపాయింట్‌మెంట్లు చూడండి →' : 'View Appointments →'}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 3. Quick Action Buttons Bar */}
      <div>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.75rem' }}>
          {isTelugu ? 'త్వరిత చర్యలు' : 'Quick Actions'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <Link
            to="/hospital-admin/doctors"
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.86rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.18s ease'
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaUserMd size={15} />
            </div>
            <span>{isTelugu ? 'వైద్యులను నిర్వహించండి' : 'Manage Doctors'}</span>
          </Link>

          <Link
            to="/hospital-admin/receptionists"
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.86rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.18s ease'
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaClipboardList size={15} />
            </div>
            <span>{isTelugu ? '+ రిసెప్షన్ సిబ్బందిని జోడించండి' : '+ Add Reception Staff'}</span>
          </Link>

          <Link
            to="/hospital-admin/appointments"
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.86rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.18s ease'
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaCalendarCheck size={15} />
            </div>
            <span>{isTelugu ? 'అపాయింట్‌మెంట్లు చూడండి' : 'View Appointments'}</span>
          </Link>

          <Link
            to="/hospital-admin/hospital"
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.86rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.18s ease'
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#f0fdfa', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaBuilding size={15} />
            </div>
            <span>{isTelugu ? 'హాస్పిటల్ వివరాలు' : 'Hospital Details'}</span>
          </Link>

          <Link
            to="/hospital-admin/reports"
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.86rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.18s ease'
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaChartLine size={15} />
            </div>
            <span>{isTelugu ? 'హాస్పిటల్ నివేదికలు' : 'Hospital Reports'}</span>
          </Link>
        </div>
      </div>

      {/* 4. Core Metric Cards in Plain English */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {isTelugu ? 'ఆసుపత్రి ప్రధాన గణాంకాలు' : 'Hospital Overview & Statistics'}
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            {isTelugu ? 'లైవ్ డేటా' : 'Live Database Status'}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem'
        }}>
          {/* Card 1: Doctors in Your Hospital */}
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '1.15rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
                {isTelugu ? 'మీ ఆసుపత్రిలోని వైద్యులు' : 'Doctors in Your Hospital'}
              </span>
              <div style={{ width: 34, height: 34, borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaUserMd />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {metrics.total_doctors || 0}
            </div>
            <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600, marginTop: '0.35rem', display: 'block' }}>
              ✓ {metrics.active_doctors || 0} {isTelugu ? 'ప్రస్తుతం అందుబాటులో ఉన్నవారు' : 'Active & Available'}
            </span>
          </div>

          {/* Card 2: Reception Staff */}
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '1.15rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
                {isTelugu ? 'రిసెప్షన్ సిబ్బంది' : 'Reception Staff'}
              </span>
              <div style={{ width: 34, height: 34, borderRadius: '8px', backgroundColor: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaClipboardList />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {metrics.total_receptionists || 0}
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
              {isTelugu ? 'ఫ్రంట్ డెస్క్ సిబ్బంది' : 'Front-desk team members'}
            </span>
          </div>

          {/* Card 3: Today's Appointments */}
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '1.15rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
                {isTelugu ? 'ఈ రోజు అపాయింట్‌మెంట్లు' : "Today's Appointments"}
              </span>
              <div style={{ width: 34, height: 34, borderRadius: '8px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaClock />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {metrics.today_appointments || 0}
            </div>
            <span style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: 600, marginTop: '0.35rem', display: 'block' }}>
              {isTelugu ? 'నేటి షెడ్యూల్ రోగులు' : 'Patients scheduled today'}
            </span>
          </div>

          {/* Card 4: Waiting for Approval */}
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '1.15rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
                {isTelugu ? 'ఆమోదం కోసం వేచి ఉన్నవి' : 'Waiting for Approval'}
              </span>
              <div style={{ width: 34, height: 34, borderRadius: '8px', backgroundColor: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaHourglassHalf />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {metrics.pending_appointments || 0}
            </div>
            <span style={{ fontSize: '0.74rem', color: '#ea580c', fontWeight: 600, marginTop: '0.35rem', display: 'block' }}>
              {isTelugu ? 'చెక్-ఇన్ / నిర్ధారణ అవసరం' : 'New bookings requiring action'}
            </span>
          </div>

          {/* Card 5: Completed Appointments */}
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '1.15rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
                {isTelugu ? 'పూర్తయిన అపాయింట్‌మెంట్లు' : 'Completed Appointments'}
              </span>
              <div style={{ width: 34, height: 34, borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaCheckCircle />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {metrics.completed_appointments || 0}
            </div>
            <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600, marginTop: '0.35rem', display: 'block' }}>
              {isTelugu ? 'విజయవంతంగా ముగిసినవి' : 'Successfully completed consultations'}
            </span>
          </div>

          {/* Card 6: Registered Patients */}
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '1.15rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
                {isTelugu ? 'నమోదైన రోగులు' : 'Registered Patients'}
              </span>
              <div style={{ width: 34, height: 34, borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaUsers />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {metrics.total_patients || 0}
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
              {isTelugu ? 'ఆసుపత్రి రికార్డులలోని రోగులు' : 'Total patient records'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. 7-Day Visits Trend & Recent Activity in Your Hospital */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {/* Trend Bar Chart */}
        <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '1.25rem 1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaChartLine color="#1d4ed8" />
              <span>{isTelugu ? 'గత 7 రోజుల రోగుల సందర్శనల ట్రెండ్' : '7-Day Patient Visits Trend'}</span>
            </h4>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              {isTelugu ? 'రోజువారీ సంఖ్య' : 'Daily Volume'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, gap: '0.5rem', paddingTop: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            {trends.map((t, idx) => {
              const maxVal = Math.max(...trends.map(x => x.count), 5);
              const heightPct = Math.max((t.count / maxVal) * 100, 10);
              const isToday = idx === trends.length - 1;
              return (
                <div key={t.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isToday ? '#1d4ed8' : '#64748b' }}>
                    {t.count}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 32,
                      height: `${heightPct}%`,
                      backgroundColor: isToday ? '#1d4ed8' : '#93c5fd',
                      borderRadius: '5px 5px 0 0',
                      transition: 'height 0.3s ease'
                    }}
                  />
                  <span style={{ fontSize: '0.65rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {t.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
              {isTelugu ? 'మొత్తం అపాయింట్‌మెంట్లు: ' : 'Total Appointments: '} <strong>{metrics.total_appointments || 0}</strong>
            </span>
            <Link to="/hospital-admin/reports" style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}>
              {isTelugu ? 'పూర్తి నివేదిక చూడండి →' : 'View Full Reports →'}
            </Link>
          </div>
        </div>

        {/* Recent Operational Activity Feed */}
        <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '1.25rem 1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaClock color="#0d9488" />
              <span>{isTelugu ? 'మీ ఆసుపత్రిలో ఇటీవలి కార్యకలాపాలు' : 'Recent Activity in Your Hospital'}</span>
            </h4>
            <span style={{ fontSize: '0.72rem', color: '#0d9488', fontWeight: 700, backgroundColor: '#f0fdfa', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
              {isTelugu ? 'ప్రత్యక్ష సమాచారం' : 'Live Activity'}
            </span>
          </div>

          {activities.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              {isTelugu ? 'ఇప్పటివరకు ఎలాంటి కార్యకలాపాలు నమోదు కాలేదు.' : 'No recent hospital activity recorded.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {activities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    padding: '0.55rem 0.75rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9'
                  }}
                >
                  <div style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: '#0d9488',
                    marginTop: '0.4rem',
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                        {act.action.replace(/_/g, ' ')}
                      </strong>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0 }}>
                        {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof act.details === 'string' ? act.details : JSON.stringify(act.details || {})}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HospitalAdminDashboard;