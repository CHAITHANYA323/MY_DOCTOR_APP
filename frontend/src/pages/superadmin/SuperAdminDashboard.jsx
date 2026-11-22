import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  FaUserMd,
  FaUserFriends,
  FaUserTie,
  FaCalendarCheck,
  FaClock,
  FaCalendarDay,
  FaHospital,
  FaExclamationTriangle,
  FaStethoscope,
  FaChartBar,
  FaAmbulance,
  FaCheckCircle,
  FaArrowRight,
  FaExchangeAlt,
  FaShieldAlt
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ecosystemService } from '../../services/ecosystemService';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/common/Button';

export const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { t, isTelugu } = useLanguage();
  const navigate = useNavigate();

  const outletCtx = useOutletContext() || {};
  const { selectedHospitalId, assignedHospitals = [] } = outletCtx;

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const hospId = selectedHospitalId ? parseInt(selectedHospitalId, 10) : null;
      const res = await ecosystemService.getSuperadminDashboardStats(hospId);

      if (res.success) {
        setStats(res);
      } else {
        setError(res.message || (isTelugu ? 'డ్యాష్‌బోర్డ్ గణాంకాలు అందుబాటులో లేవు.' : 'Dashboard statistics unavailable.'));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, isTelugu ? 'గణాంకాలు లోడ్ చేయడంలో లోపం ఏర్పడింది.' : 'Failed to load dashboard metrics.'));
    } finally {
      setLoading(false);
    }
  }, [selectedHospitalId, isTelugu]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '48px', width: '380px', borderRadius: '8px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '12px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', borderColor: '#fca5a5' }}>
        <FaExclamationTriangle size={42} color="var(--emergency, #dc2626)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
          {isTelugu ? 'డ్యాష్‌బోర్డ్ వివరాలు లోడ్ కాలేదు' : 'Dashboard Metrics Unavailable'}
        </h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '520px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
          {error}
        </p>
        <Button variant="primary" onClick={fetchDashboardData}>
          {isTelugu ? 'మళ్ళీ ప్రయత్నించండి' : 'Retry'}
        </Button>
      </div>
    );
  }

  const hospitalScopeName = stats?.target_hospital_name ||
    (isTelugu ? `అన్ని కేటాయించబడిన ఆసుపత్రులు (${stats?.assigned_hospitals_count || assignedHospitals.length})`
              : `All Assigned Hospitals (${stats?.assigned_hospitals_count || assignedHospitals.length})`);

  // Key KPI Cards
  const kpiCards = [
    {
      title: isTelugu ? 'కేటాయించిన ఆసుపత్రులు' : 'Assigned Hospitals',
      value: stats?.assigned_hospitals_count || assignedHospitals.length,
      subtitle: isTelugu ? 'మీ నియంత్రణలోని సంస్థలు' : 'Institutions under supervision',
      icon: <FaHospital />,
      bg: '#e0f2fe',
      fg: '#0284c7'
    },
    {
      title: isTelugu ? 'ఆసుపత్రి నిర్వాహకులు' : 'Hospital Admins',
      value: stats?.total_hospital_admins ?? 0,
      subtitle: isTelugu ? 'స్థానిక పరిపాలనా సిబ్బంది' : 'Local administrators on duty',
      icon: <FaUserTie />,
      bg: '#fef3c7',
      fg: '#b45309'
    },
    {
      title: isTelugu ? 'వైద్య నిపుణులు' : 'Specialist Doctors',
      value: stats?.total_doctors ?? 0,
      subtitle: isTelugu ? 'నమోదైన డాక్టర్లు' : 'Registered clinical practitioners',
      icon: <FaUserMd />,
      bg: '#f3e8ff',
      fg: '#7e22ce'
    },
    {
      title: isTelugu ? 'రిసెప్షన్ సిబ్బంది' : 'Reception Staff',
      value: stats?.total_receptionists ?? 0,
      subtitle: isTelugu ? 'ఫ్రంట్ డెస్క్ ఉద్యోగులు' : 'Front desk intake staff',
      icon: <FaUserFriends />,
      bg: '#dcfce7',
      fg: '#15803d'
    },
    {
      title: isTelugu ? 'నేటి అపాయింట్‌మెంట్లు' : "Today's Consultations",
      value: stats?.today_appointments ?? 0,
      subtitle: isTelugu ? 'ఈ రోజు షెడ్యూల్ అయినవి' : 'Appointments scheduled today',
      icon: <FaCalendarDay />,
      bg: '#ccfbf1',
      fg: '#0f766e'
    },
    {
      title: isTelugu ? 'రాబోయే అపాయింట్‌మెంట్లు' : 'Upcoming Consultations',
      value: stats?.upcoming_appointments ?? 0,
      subtitle: isTelugu ? 'రాబోయే రోజులలో' : 'Scheduled in upcoming days',
      icon: <FaClock />,
      bg: '#e0e7ff',
      fg: '#4338ca'
    },
    {
      title: isTelugu ? 'పూర్తయిన సంప్రదింపులు' : 'Completed Consultations',
      value: stats?.completed_appointments ?? 0,
      subtitle: isTelugu ? 'విజయవంతంగా అందించబడినవి' : 'Successfully fulfilled',
      icon: <FaCheckCircle />,
      bg: '#dcfce7',
      fg: '#16a34a'
    },
    {
      title: isTelugu ? 'అత్యవసర కేసులు' : 'Emergency Triage',
      value: stats?.emergency_appointments ?? 0,
      subtitle: isTelugu ? 'అత్యవసర ప్రాధాన్యత' : 'Critical urgent volume',
      icon: <FaAmbulance />,
      bg: '#fee2e2',
      fg: '#dc2626'
    }
  ];

  // Quick Action Links
  const quickActions = [
    {
      title: isTelugu ? 'ఆసుపత్రి నిర్వాహకులు' : 'Hospital Administrators',
      desc: isTelugu ? 'ప్రధాన అడ్మిన్‌లను నియమించండి, కొత్త వారిని ఆమోదించండి మరియు కార్యకలాపాలను ట్రాక్ చేయండి.' : 'Govern primary administrators, review onboarding requests, and audit assignments.',
      to: '/superadmin/hospital-admins',
      icon: <FaUserTie />,
      bg: '#e0f2fe',
      fg: '#0284c7'
    },
    {
      title: isTelugu ? 'వైద్యుల డైరెక్టరీ' : 'Doctors Directory',
      desc: isTelugu ? 'డాక్టర్లను జోడించండి, ప్రత్యేకతలు మరియు కన్సల్టేషన్ ఫీజులను సమీక్షించండి.' : 'Review doctor affiliations, specialties, and outpatient consultation schedules.',
      to: '/superadmin/doctors',
      icon: <FaUserMd />,
      bg: '#f3e8ff',
      fg: '#7e22ce'
    },
    {
      title: isTelugu ? 'సిబ్బంది నిర్వహణ' : 'Hospital Staff & Staffing',
      desc: isTelugu ? 'రిసెప్షనిస్టులు మరియు డెస్క్ మేనేజర్లను నియమించండి.' : 'Manage front-office receptionists and institutional staff members.',
      to: '/superadmin/staff',
      icon: <FaUserFriends />,
      bg: '#dcfce7',
      fg: '#15803d'
    },
    {
      title: isTelugu ? 'అపాయింట్‌మెంట్ క్యూ' : 'Consultation Queue',
      desc: isTelugu ? 'అన్ని శాఖల అపాయింట్‌మెంట్లను ప్రత్యక్షంగా ట్రాక్ చేయండి.' : 'Inspect patient consultation queues and fulfillment status in real-time.',
      to: '/superadmin/appointments',
      icon: <FaCalendarCheck />,
      bg: '#ccfbf1',
      fg: '#0f766e'
    },
    {
      title: isTelugu ? 'శాఖల విభాగాలు' : 'Clinical Departments',
      desc: isTelugu ? 'కార్డియాలజీ, న్యూరాలజీ మొదలైన విభాగాలను నిర్వహించండి.' : 'Configure hospital departments, wards, and clinical specialties.',
      to: '/superadmin/departments',
      icon: <FaStethoscope />,
      bg: '#fef3c7',
      fg: '#b45309'
    },
    {
      title: isTelugu ? 'నిర్వహణ నివేదికలు' : 'Operational Reports',
      desc: isTelugu ? 'నెలవారీ రోగుల సంఖ్య మరియు పనితీరు నివేదికలను విశ్లేషించండి.' : 'Generate clinical reports, completion analytics, and download summaries.',
      to: '/superadmin/reports',
      icon: <FaChartBar />,
      bg: '#fee2e2',
      fg: '#b91c1c'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Welcome Banner */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '1.5rem',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '0.2rem 0.55rem',
              borderRadius: '8px',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.04em'
            }}>
              SUPER ADMIN
            </span>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {isTelugu ? 'సూపర్ అడ్మిన్ నిర్వహణ డ్యాష్‌బోర్డ్' : 'Super Admin Operational Governance'}
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>
            {isTelugu
              ? `${hospitalScopeName} పరిధిలోని వైద్యులు, నిర్వాహకులు, రోగుల కన్సల్టేషన్ల ప్రత్యక్ష సమాచారం.`
              : `Real-time operational governance and clinical activity across ${hospitalScopeName}.`}
          </p>
        </div>

        <Link
          to="/superadmin/hospital-admins"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.6rem 1.15rem',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            borderRadius: '9px',
            fontSize: '0.85rem',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
          }}
        >
          <FaUserTie />
          <span>{isTelugu ? 'ఆసుపత్రి అడ్మిన్లను నిర్వహించండి' : 'Manage Hospital Admins'}</span>
          <FaArrowRight size={11} />
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {kpiCards.map((card, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem'
            }}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              backgroundColor: card.bg,
              color: card.fg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              flexShrink: 0
            }}>
              {card.icon}
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                {card.title}
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1, display: 'block' }}>
                {card.value}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '0.25rem' }}>
                {card.subtitle}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Assigned Hospitals Breakdown */}
      {stats?.hospitals && stats.hospitals.length > 0 && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {isTelugu ? 'కేటాయించబడిన ఆసుపత్రుల స్థితి' : 'Assigned Institutions Breakdown'}
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {isTelugu ? 'ప్రతి ఆసుపత్రిలోని ప్రధాన నిర్వాహకుడు మరియు సేవల సారాంశం.' : 'Primary administrator assignment and operational volume per hospital.'}
              </span>
            </div>
            <Link
              to="/superadmin/hospital-admins"
              style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}
            >
              {isTelugu ? 'అన్ని వివరాలు చూడండి →' : 'View all administrators →'}
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {stats.hospitals.map((h) => (
              <div
                key={h.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  backgroundColor: '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{h.name}</strong>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', backgroundColor: '#e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '8px' }}>
                    {h.city}
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.65rem' }}>
                  {h.primary_admin ? (
                    <span style={{ color: '#0369a1', fontWeight: 600 }}>
                      👤 {isTelugu ? 'ప్రధాన అడ్మిన్:' : 'Primary Admin:'} {h.primary_admin.name}
                    </span>
                  ) : (
                    <span style={{ color: '#be123c', fontWeight: 600 }}>
                      ⚠️ {isTelugu ? 'ప్రధాన అడ్మిన్ లేరు' : 'No Primary Admin Assigned'}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.76rem', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                  <span>👨‍⚕️ {h.doctors_count || 0} {isTelugu ? 'డాక్టర్లు' : 'Doctors'}</span>
                  <span>📋 {h.receptionists_count || 0} {isTelugu ? 'రిసెప్షన్' : 'Staff'}</span>
                  <span>📅 {h.appointments_count || 0} {isTelugu ? 'కేసులు' : 'Appts'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Operational Shortcuts */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
          {isTelugu ? 'ముఖ్యమైన నిర్వహణ విభాగాలు' : 'Administrative Governance Shortcuts'}
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem' }}>
          {isTelugu ? 'ఆసుపత్రి సిబ్బంది, వైద్యులు మరియు సంప్రదింపులను నిర్వహించడానికి త్వరిత లింకులు.' : 'Quick navigation to hospital administrators, clinicians, front-desk staff, and operational reports.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              to={action.to}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
                padding: '1.1rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
                backgroundColor: '#ffffff',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '8px',
                backgroundColor: action.bg,
                color: action.fg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                flexShrink: 0
              }}>
                {action.icon}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '0.2rem' }}>
                  {action.title}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.35, display: 'block' }}>
                  {action.desc}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
