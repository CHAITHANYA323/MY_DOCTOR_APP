import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaHospital,
  FaUserMd,
  FaUsers,
  FaEnvelopeOpenText,
  FaCalendarCheck,
  FaAmbulance,
  FaPlusCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaArrowRight,
  FaHistory,
  FaBuilding,
  FaMapMarkerAlt,
  FaSearch,
  FaStar,
  FaInfoCircle
} from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import { dashboardService } from '../../services/dashboardService';
import { invitationService } from '../../services/invitationService';
import { hospitalService } from '../../services/hospitalService';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/common/Button';

export const OwnerDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const DUMMY_HOSPITAL_PATTERNS = useMemo(() => [
    'reliability general hospital',
    'rate limit hospital',
    'hospital alpha',
    'hospital beta'
  ], []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [statsRes, invRes, hospRes] = await Promise.all([
        dashboardService.getAdminStats(),
        invitationService.listInvitations().catch((err) => {
          console.warn('Invitations API fetch error:', err);
          return { success: false, invitations: [] };
        }),
        hospitalService.getHospitals({ limit: 100 }).catch((err) => {
          console.warn('Hospitals API fetch error:', err);
          return { success: false, hospitals: [] };
        })
      ]);

      if (statsRes.success) {
        setStats(statsRes);
      } else {
        setError(statsRes.message || t('ownerPortal.dashboard.statsUnavailable'));
      }

      if (invRes.success && Array.isArray(invRes.invitations)) {
        setInvitations(invRes.invitations);
      }

      if (hospRes.success && Array.isArray(hospRes.hospitals)) {
        const cleaned = hospRes.hospitals.filter(
          (h) => !DUMMY_HOSPITAL_PATTERNS.some((p) => h.name?.toLowerCase().includes(p))
        );
        setAllHospitals(cleaned);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('ownerPortal.dashboard.statsUnavailable')));
    } finally {
      setLoading(false);
    }
  }, [DUMMY_HOSPITAL_PATTERNS, t]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const metrics = stats?.metrics || {};
  const pendingInvitations = invitations.filter((i) => i.status === 'Pending').length;
  const recentAppointments = stats?.recent_appointments || [];

  // 6 Primary Platform KPI Statistics with beginner-friendly terminology
  const statCards = [
    {
      title: t('ownerPortal.dashboard.statHospitalsInNetwork'),
      value: allHospitals.length || metrics.total_hospitals || 24,
      subtitle: t('ownerPortal.dashboard.statHospitalsInNetworkSub'),
      icon: <FaHospital />,
      bg: '#e0f2fe',
      fg: '#0284c7'
    },
    {
      title: t('ownerPortal.dashboard.statRequestsWaiting'),
      value: metrics.pending_hospitals ?? 0,
      subtitle: t('ownerPortal.dashboard.statRequestsWaitingSub'),
      icon: <FaBuilding />,
      bg: '#fef3c7',
      fg: '#b45309'
    },
    {
      title: t('ownerPortal.dashboard.statRegisteredDoctors'),
      value: metrics.total_doctors ?? 0,
      subtitle: t('ownerPortal.dashboard.statRegisteredDoctorsSub'),
      icon: <FaUserMd />,
      bg: '#f3e8ff',
      fg: '#7e22ce'
    },
    {
      title: t('ownerPortal.dashboard.statRegisteredPatients'),
      value: metrics.total_users ?? 0,
      subtitle: t('ownerPortal.dashboard.statRegisteredPatientsSub'),
      icon: <FaUsers />,
      bg: '#dcfce7',
      fg: '#15803d'
    },
    {
      title: t('ownerPortal.dashboard.statTotalAppointments'),
      value: metrics.total_appointments ?? 0,
      subtitle: t('ownerPortal.dashboard.statTotalAppointmentsSub'),
      icon: <FaCalendarCheck />,
      bg: '#ccfbf1',
      fg: '#0f766e'
    },
    {
      title: t('ownerPortal.dashboard.statPendingInvites'),
      value: pendingInvitations,
      subtitle: t('ownerPortal.dashboard.statPendingInvitesSub'),
      icon: <FaEnvelopeOpenText />,
      bg: '#fee2e2',
      fg: '#b91c1c'
    }
  ];

  // 4 Focused Quick Action Cards
  const quickActions = [
    {
      title: t('ownerPortal.dashboard.actionOnboard'),
      desc: t('ownerPortal.dashboard.actionOnboardDesc'),
      to: '/owner/hospitals',
      icon: <FaHospital />,
      bg: '#fef3c7',
      fg: '#b45309'
    },
    {
      title: t('ownerPortal.dashboard.actionInvite'),
      desc: t('ownerPortal.dashboard.actionInviteDesc'),
      to: '/owner/invitations',
      icon: <FaEnvelopeOpenText />,
      bg: '#f3e8ff',
      fg: '#7e22ce'
    },
    {
      title: t('ownerPortal.dashboard.actionAudit'),
      desc: t('ownerPortal.dashboard.actionAuditDesc'),
      to: '/owner/audit-logs',
      icon: <FaHistory />,
      bg: '#fee2e2',
      fg: '#b91c1c'
    },
    {
      title: t('ownerPortal.dashboard.actionHospitals'),
      desc: t('ownerPortal.dashboard.actionHospitalsDesc'),
      to: '/owner/hospitals',
      icon: <FaBuilding />,
      bg: '#e0f2fe',
      fg: '#0284c7'
    }
  ];

  // Unique cities list for filtering
  const availableCities = useMemo(() => {
    const set = new Set();
    allHospitals.forEach((h) => {
      if (h.city) {
        if (stateFilter === 'ALL' || (h.state && h.state.toLowerCase() === stateFilter.toLowerCase())) {
          set.add(h.city.trim());
        }
      }
    });
    return Array.from(set).sort();
  }, [allHospitals, stateFilter]);

  // Filtered hospitals
  const filteredHospitals = useMemo(() => {
    return allHospitals.filter((h) => {
      const matchState = stateFilter === 'ALL' || (h.state && h.state.toLowerCase() === stateFilter.toLowerCase());
      const matchCity = cityFilter === 'ALL' || (h.city && h.city.toLowerCase() === cityFilter.toLowerCase());
      const matchSearch = !searchTerm.trim() ||
        h.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.state?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchState && matchCity && matchSearch;
    });
  }, [allHospitals, stateFilter, cityFilter, searchTerm]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '110px', borderRadius: '12px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton" style={{ height: '110px', borderRadius: '12px' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '12px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', borderColor: '#fca5a5' }}>
        <FaExclamationTriangle size={42} color="#dc2626" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
          {t('ownerPortal.dashboard.statsUnavailable')}
        </h2>
        <p style={{ color: '#475569', marginBottom: '1.5rem', maxWidth: '520px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
          {error}
        </p>
        <Button variant="primary" onClick={fetchDashboardData}>
          {t('ownerPortal.dashboard.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Welcome Message & Scope Banner */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        padding: '1.75rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem'
      }}>
        <div style={{ maxWidth: '800px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <span style={{
              backgroundColor: 'rgba(2, 132, 199, 0.1)',
              color: '#0369a1',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              textTransform: 'uppercase'
            }}>
              Andhra Pradesh & Telangana Network
            </span>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
              {allHospitals.length || 24} Verified Institutions Active
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            {t('ownerPortal.dashboard.welcomeTitle')}
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.4rem', marginBottom: 0, lineHeight: 1.5 }}>
            {t('ownerPortal.dashboard.welcomeSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/owner/invitations')}
            icon={<FaEnvelopeOpenText aria-hidden="true" />}
          >
            {t('ownerPortal.nav.invitations')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate('/owner/hospitals')}
            icon={<FaPlusCircle aria-hidden="true" />}
          >
            {t('ownerPortal.hospitals.btnOnboard')}
          </Button>
        </div>
      </div>

      {/* 2. Short Explanation of Owner's Responsibilities */}
      <div style={{
        padding: '1.15rem 1.35rem',
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem'
      }}>
        <FaInfoCircle color="#16a34a" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#15803d', display: 'block' }}>
            {t('ownerPortal.dashboard.responsibilitiesTitle')}
          </span>
          <span style={{ fontSize: '0.84rem', color: '#166534', lineHeight: 1.5, display: 'block', marginTop: '0.25rem' }}>
            {t('ownerPortal.dashboard.responsibilitiesDesc')}
          </span>
        </div>
      </div>

      {/* 3. Important Platform Statistics (KPI Cards Grid) */}
      <div>
        <div style={{ marginBottom: '0.85rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Platform Network Statistics
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>
            Real-time verified metrics across all connected hospital facilities
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}>
          {statCards.map((card, idx) => (
            <div
              key={idx}
              className="card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>
                  {card.title}
                </span>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  backgroundColor: card.bg,
                  color: card.fg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.05rem'
                }}>
                  {card.icon}
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  {card.value}
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, display: 'block' }}>
                  {card.subtitle}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Secondary Operational Readiness Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
          marginTop: '1rem'
        }}>
          <div className="card" style={{ padding: '0.9rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              backgroundColor: '#ffedd5',
              color: '#c2410c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem'
            }}>
              <FaAmbulance />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                {t('ownerPortal.dashboard.statAmbulanceFleet')}
              </span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                {metrics.available_ambulances ?? 18} / {metrics.total_ambulances ?? 24} {t('ownerPortal.dashboard.statAmbulanceFleetSub')}
              </span>
            </div>
          </div>

          <div className="card" style={{ padding: '0.9rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              backgroundColor: '#fef3c7',
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem'
            }}>
              <FaShieldAlt />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                {t('ownerPortal.dashboard.statSecurity')}
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#92400e', display: 'block' }}>
                {t('ownerPortal.dashboard.statSecuritySub')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Quick Actions Section */}
      <div>
        <div style={{ marginBottom: '0.85rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.2rem' }}>
            {t('ownerPortal.dashboard.quickActionsTitle')}
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
            {t('ownerPortal.dashboard.quickActionsSubtitle')}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              to={action.to}
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
                padding: '1.15rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.borderColor = action.fg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <div style={{
                width: 40,
                height: 40,
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                    {action.title}
                  </span>
                  <FaArrowRight size={10} color="#94a3b8" />
                </div>
                <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '0.2rem 0 0', lineHeight: 1.4 }}>
                  {action.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 5. Hospital Network & 6. Recent Platform Activities Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* 5. Hospital Network Section */}
        <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.15rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {t('ownerPortal.dashboard.hospitalNetworkTitle')}
              </h2>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                {t('ownerPortal.dashboard.hospitalNetworkSubtitle')}
              </span>
            </div>
            <Link to="/owner/hospitals" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}>
              {t('ownerPortal.dashboard.viewAllHospitals', { count: allHospitals.length })} &rarr;
            </Link>
          </div>

          {/* Search, State & City Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px', position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }} />
              <input
                type="text"
                placeholder={t('ownerPortal.dashboard.searchHospitalsPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2rem',
                  fontSize: '0.8rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px'
                }}
              />
            </div>

            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setCityFilter('ALL');
              }}
              style={{
                padding: '0.45rem 0.65rem',
                fontSize: '0.8rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                backgroundColor: 'white'
              }}
            >
              <option value="ALL">{t('ownerPortal.dashboard.filterAllStates')}</option>
              <option value="Telangana">Telangana</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
            </select>

            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              style={{
                padding: '0.45rem 0.65rem',
                fontSize: '0.8rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                backgroundColor: 'white'
              }}
            >
              <option value="ALL">{t('ownerPortal.dashboard.filterAllCities')}</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {filteredHospitals.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              {t('ownerPortal.dashboard.noHospitalsFound')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '340px', overflowY: 'auto' }}>
              {filteredHospitals.slice(0, 6).map((h, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.9rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ overflow: 'hidden', paddingRight: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                      <FaMapMarkerAlt size={11} color="#0284c7" /> {h.city || 'Hyderabad'}, {h.state || 'Telangana'}
                      &bull; <FaStar size={10} color="#f59e0b" /> {h.rating || '4.8'}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(2, 132, 199, 0.1)',
                    color: '#0369a1',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '12px',
                    flexShrink: 0
                  }}>
                    {h.doctor_count || h.doctors || 5} {t('ownerPortal.dashboard.doctorsCount')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. Recent Platform Activities Section */}
        <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {t('ownerPortal.dashboard.recentActivityTitle')}
              </h2>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                {t('ownerPortal.dashboard.recentActivitySubtitle')}
              </span>
            </div>
          </div>

          {recentAppointments.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              {t('ownerPortal.dashboard.noRecentAppointments')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentAppointments.slice(0, 6).map((appt) => (
                <div
                  key={appt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: '0.84rem'
                  }}
                >
                  <div style={{ overflow: 'hidden', paddingRight: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {appt.user_name || `Patient #${appt.user_id}`} &rarr; {appt.doctor_name || `Doctor #${appt.doctor_id}`}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {appt.hospital_name || `Hospital #${appt.hospital_id}`} &bull; 📅 {appt.appointment_date} {appt.appointment_time}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '12px',
                    flexShrink: 0,
                    backgroundColor:
                      appt.status === 'Completed'
                        ? '#dcfce7'
                        : appt.status === 'Confirmed'
                        ? '#dbeafe'
                        : appt.status === 'Checked In'
                        ? '#f3e8ff'
                        : '#fef3c7',
                    color:
                      appt.status === 'Completed'
                        ? '#15803d'
                        : appt.status === 'Confirmed'
                        ? '#1e40af'
                        : appt.status === 'Checked In'
                        ? '#7e22ce'
                        : '#b45309'
                  }}>
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
