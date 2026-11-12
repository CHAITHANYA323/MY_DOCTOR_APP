import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/common/LanguageToggle';
import {
  FaHospitalSymbol,
  FaUserMd,
  FaHospital,
  FaCalendarCheck,
  FaNotesMedical,
  FaArrowRight,
  FaShieldAlt,
  FaCheckCircle,
  FaLock,
  FaUserCheck,
  FaUserPlus
} from 'react-icons/fa';

/**
 * Premium, Mobile-Friendly MediConnect Welcome Page.
 * Implements the exact user-mandated Telugu communications:
 * 
 * 1. "WELCOME TO MEDICONNECT HEALTHCARE PLATFORM"
 * 2. "మీ ఆరోగ్యం మా బాధ్యత"
 * 3. "డాక్టర్లను సులభంగా వెతకండి."
 * 4. "ఆసుపత్రుల వివరాలు తెలుసుకోండి."
 * 5. "డాక్టర్ అపాయింట్మెంట్ బుక్ చేసుకోండి."
 * 6. "మీ ఆరోగ్య వివరాలను చూసుకోండి."
 * 7. "ప్రారంభించండి / Get Started" button navigating to existing /login.
 */
export const Welcome = () => {
  const navigate = useNavigate();
  const { isTelugu } = useLanguage();

  // Core 4 Highlight Cards mapped to genuinely existing routes
  const highlightFeatures = [
    {
      id: 'feature-doctors',
      icon: <FaUserMd size={28} />,
      color: '#0284c7', // Medical Blue
      bgLight: '#f0f9ff',
      borderColor: '#bae6fd',
      title: isTelugu ? 'డాక్టర్లను సులభంగా వెతకండి.' : 'Find Doctors Easily.',
      desc: isTelugu
        ? 'మీ ప్రాంతంలోని ప్రముఖ స్పెషలిస్ట్ వైద్యుల వివరాలు, అనుభవం మరియు సంప్రదింపు సమయాలు సులభంగా చూడండి.'
        : 'Discover verified specialist doctors, qualifications, experience, and consultation schedules.',
      actionText: isTelugu ? 'వైద్యులను వెతకండి' : 'Browse Doctors',
      linkTo: '/doctors'
    },
    {
      id: 'feature-hospitals',
      icon: <FaHospital size={28} />,
      color: '#0d9488', // Healing Teal
      bgLight: '#f0fdfa',
      borderColor: '#99f6e4',
      title: isTelugu ? 'ఆసుపత్రుల వివరాలు తెలుసుకోండి.' : 'Explore Hospital Details.',
      desc: isTelugu
        ? 'అన్ని సౌకర్యాలు, ప్రత్యేక విభాగాలు మరియు చికిత్సా వసతులు కలిగిన గుర్తింపు పొందిన ఆసుపత్రుల సమగ్ర సమాచారం.'
        : 'Explore partner hospitals, advanced clinical wings, available specialties, and contact details.',
      actionText: isTelugu ? 'ఆసుపత్రుల వివరాలు' : 'View Hospitals',
      linkTo: '/hospitals'
    },
    {
      id: 'feature-appointments',
      icon: <FaCalendarCheck size={28} />,
      color: '#0369a1', // Deep Blue
      bgLight: '#f0f9ff',
      borderColor: '#7dd3fc',
      title: isTelugu ? 'డాక్టర్ అపాయింట్మెంట్ బుక్ చేసుకోండి.' : 'Book Doctor Appointments.',
      desc: isTelugu
        ? 'ఆసుపత్రిలో పొడవైన వరుసలలో నిలబడకుండా, మీకు నచ్చిన సమయంలో డాక్టర్ సంప్రదింపు సమయాన్ని ముందుగానే బుక్ చేసుకోండి.'
        : 'Reserve your confirmed consultation slot in advance with zero waiting queue friction.',
      actionText: isTelugu ? 'అపాయింట్మెంట్ తీసుకోండి' : 'Book Consultation',
      linkTo: '/login'
    },
    {
      id: 'feature-records',
      icon: <FaNotesMedical size={28} />,
      color: '#0f766e', // Deep Teal
      bgLight: '#f0fdfa',
      borderColor: '#5eead4',
      title: isTelugu ? 'మీ ఆరోగ్య వివరాలను చూసుకోండి.' : 'View Your Health Records.',
      desc: isTelugu
        ? 'మీ మునుపటి మందుల చీటీలు, పరీక్షల నివేదికలు మరియు ఆరోగ్య చరిత్రను ఒకే సురక్షితమైన ప్రదేశంలో నిక్షిప్తం చేసుకోండి.'
        : 'Access your digital prescriptions, consultation summaries, and medical history anytime securely.',
      actionText: isTelugu ? 'రికార్డులు చూడండి' : 'Access Records',
      linkTo: '/login'
    }
  ];

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. TOP HEADER & BILINGUAL NAVIGATION BAR */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0.75rem 1.5rem',
        minHeight: '100px',
        display: 'flex',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
      }}>
        <div style={{
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          {/* MediConnect Brand Identity */}
          <Link
            to="/"
            style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none' }}
            aria-label="MediConnect Home"
          >
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '15px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 16px rgba(2, 132, 199, 0.38)',
              flexShrink: 0
            }}>
              <FaHospitalSymbol size={30} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
                Medi<span style={{ color: '#0284c7' }}>Connect</span>
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Healthcare Platform
              </div>
            </div>
          </Link>

          {/* Right Section: Language Switcher + Register Action (Login removed) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <LanguageToggle size="md" showIcon={false} />

            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#0284c7',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.65rem 1.6rem',
                fontSize: '1.02rem',
                fontWeight: 800,
                color: '#ffffff',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                transition: 'all 0.18s ease',
                minHeight: '48px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0369a1';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0284c7';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <FaUserPlus size={15} aria-hidden="true" />
              <span>{isTelugu ? 'నమోదు చేసుకోండి' : 'Register Free'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section style={{
        background: 'radial-gradient(ellipse at top, #f0f9ff 0%, #e0f2fe 35%, #f8fafc 100%)',
        padding: '3.75rem 1.25rem 4rem',
        borderBottom: '1px solid #e2e8f0',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
          
          {/* Platform Category Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#ffffff',
              border: '1px solid #bae6fd',
              borderRadius: '9999px',
              padding: '0.35rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#0369a1',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.08)'
            }}>
              <FaShieldAlt style={{ color: '#0d9488' }} size={13} aria-hidden="true" />
              {isTelugu ? 'విశ్వసనీయ ఆరోగ్య వేదిక' : 'Trusted Healthcare Platform'}
            </span>
          </div>

          {/* EXACT MANDATED BANNER MESSAGE 1 */}
          <h2 style={{
            fontSize: 'clamp(0.95rem, 2vw, 1.25rem)',
            fontWeight: 800,
            color: '#0369a1',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem'
          }}>
            WELCOME TO MEDICONNECT HEALTHCARE PLATFORM
          </h2>

          {/* EXACT MANDATED HERO MESSAGE 2 */}
          <h1 style={{
            fontSize: 'clamp(2.2rem, 5.5vw, 3.8rem)',
            fontWeight: 900,
            color: '#0f172a',
            lineHeight: 1.25,
            letterSpacing: '-0.025em',
            marginBottom: '1.25rem',
            wordBreak: 'keep-all'
          }}>
            {isTelugu ? 'మీ ఆరోగ్యం మా బాధ్యత' : 'Your Health, Our Responsibility'}
          </h1>

          {/* Descriptive Subtitle */}
          <p style={{
            fontSize: 'clamp(1rem, 2.2vw, 1.22rem)',
            color: '#475569',
            maxWidth: '720px',
            margin: '0 auto 2.5rem',
            lineHeight: 1.65
          }}>
            {isTelugu
              ? 'నమ్మకమైన వైద్యులు, అధునాతన ఆసుపత్రులు మరియు సులభతర అపాయింట్మెంట్ సేవలు ఇప్పుడు ఒకే డిజిటల్ వేదికపై.'
              : 'Your trusted digital healthcare gateway to verified physicians, accredited hospitals, and seamless appointment booking.'}
          </p>

          {/* EXACT MANDATED PROMINENT BUTTON: ప్రారంభించండి / Get Started */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '1rem 2.5rem',
                fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(2, 132, 199, 0.42)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                minHeight: '56px',
                minWidth: '260px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0369a1';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(2, 132, 199, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0284c7';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(2, 132, 199, 0.42)';
              }}
              aria-label="ప్రారంభించండి / Get Started - Navigate to Login"
            >
              <span>ప్రారంభించండి / Get Started</span>
              <FaArrowRight size={18} aria-hidden="true" />
            </button>

            {/* Direct Register Link for New Users */}
            <div style={{ fontSize: '0.92rem', color: '#64748b' }}>
              {isTelugu ? 'కొత్త సభ్యులా? ' : 'New to MediConnect? '}
              <Link
                to="/register"
                style={{ color: '#0284c7', fontWeight: 700, textDecoration: 'underline' }}
              >
                {isTelugu ? 'ఇక్కడ ఉచితంగా నమోదు చేసుకోండి' : 'Register Free Here'}
              </Link>
            </div>
          </div>

          {/* Quick Trust Highlights */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap',
            padding: '0.75rem 1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
              <FaCheckCircle color="#16a34a" size={14} aria-hidden="true" />
              <span>{isTelugu ? 'ధృవీకరించబడిన వైద్యులు' : 'Verified Doctors'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
              <FaCheckCircle color="#16a34a" size={14} aria-hidden="true" />
              <span>{isTelugu ? 'గుర్తింపు పొందిన ఆసుపత్రులు' : 'Accredited Hospitals'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
              <FaLock color="#0284c7" size={12} aria-hidden="true" />
              <span>{isTelugu ? 'సురక్షితమైన వివరాలు' : 'Encrypted & Confidential'}</span>
            </div>
          </div>

        </div>
      </section>

      {/* 3. FOUR CORE HIGHLIGHT CARDS (MANDATED EXACT TELUGU MESSAGES) */}
      <section style={{
        padding: '4rem 1.25rem',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-block',
            backgroundColor: '#f0fdfa',
            color: '#0f766e',
            border: '1px solid #99f6e4',
            padding: '0.25rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.65rem'
          }}>
            {isTelugu ? 'ప్రధాన సేవలు' : 'Core Services'}
          </div>
          <h2 style={{
            fontSize: 'clamp(1.75rem, 3.5vw, 2.3rem)',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.3
          }}>
            {isTelugu ? 'ఆరోగ్య సంరక్షణలో మీ కోసం' : 'Everything You Need For Connected Care'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '640px', margin: '0.5rem auto 0', lineHeight: 1.6 }}>
            {isTelugu
              ? 'సరళమైన మరియు వేగవంతమైన విధానంలో వైద్య సేవలను అందుకోండి.'
              : 'Explore specialist doctors, accredited hospitals, priority scheduling, and digital records.'}
          </p>
        </div>

        {/* Responsive Grid for the 4 Highlight Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
          gap: '1.75rem'
        }}>
          {highlightFeatures.map((card) => (
            <div
              key={card.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: `1.5px solid #e2e8f0`,
                padding: '2rem 1.75rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = card.borderColor;
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(15, 23, 42, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.04)';
              }}
            >
              {/* Icon Container */}
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                backgroundColor: card.bgLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.color,
                marginBottom: '1.5rem',
                border: `1px solid ${card.borderColor}`
              }}>
                {card.icon}
              </div>

              {/* Exact Card Title */}
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.35,
                marginBottom: '0.85rem'
              }}>
                {card.title}
              </h3>

              {/* Description */}
              <p style={{
                color: '#475569',
                fontSize: '0.94rem',
                lineHeight: 1.65,
                marginBottom: '1.75rem',
                flex: 1
              }}>
                {card.desc}
              </p>

              {/* Action Link to genuinely existing page */}
              <Link
                to={card.linkTo}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  color: card.color,
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  marginTop: 'auto'
                }}
              >
                <span>{card.actionText}</span>
                <FaArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 4. VERIFIED HEALTHCARE ACCREDITATIONS (EXISTING FUNCTIONALITY ONLY) */}
      <section style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0',
        padding: '3.5rem 1.25rem'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2rem',
            textAlign: 'center'
          }}>
            <div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem'
              }}>
                <FaUserCheck size={20} />
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {isTelugu ? 'నైపుణ్యం కలిగిన వైద్యులు' : 'Verified Specialists'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.35rem' }}>
                {isTelugu ? 'వైద్య మండలి లైసెన్స్ కలిగిన వైద్యులు' : 'Registered Medical Practitioners'}
              </div>
            </div>

            <div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#ccfbf1',
                color: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem'
              }}>
                <FaHospital size={20} />
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {isTelugu ? 'భాగస్వామ్య ఆసుపత్రులు' : 'Partner Hospitals'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.35rem' }}>
                {isTelugu ? 'ఆధునిక పరికరాలు & నిపుణుల సేవలు' : 'Advanced multi-specialty centers'}
              </div>
            </div>

            <div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem'
              }}>
                <FaShieldAlt size={20} />
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {isTelugu ? 'సురక్షిత రికార్డులు' : 'Secure Digital Records'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.35rem' }}>
                {isTelugu ? 'రోగి సమాచారం పూర్తి గోప్యం' : 'Encrypted patient health history'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MINIMAL CLEAN FOOTER */}
      <footer style={{
        backgroundColor: '#0f172a',
        color: '#94a3b8',
        padding: '1.75rem 1.25rem',
        fontSize: '0.82rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            &copy; {new Date().getFullYear()} MediConnect Healthcare Platform. {isTelugu ? 'అన్ని హక్కులు ప్రత్యేకించబడ్డాయి.' : 'All rights reserved.'}
          </div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <Link to="/about" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
              {isTelugu ? 'మా గురించి' : 'About'}
            </Link>
            <Link to="/contact" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
              {isTelugu ? 'సంప్రదించండి' : 'Contact'}
            </Link>
            <Link to="/ambulance" style={{ color: '#f87171', textDecoration: 'none', fontWeight: 600 }}>
              {isTelugu ? 'అంబులెన్స్ (108)' : 'Ambulance (108)'}
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Welcome;
