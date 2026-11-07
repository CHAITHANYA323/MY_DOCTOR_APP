import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { 
  FaHospitalSymbol, 
  FaUserMd, 
  FaHospital, 
  FaAmbulance, 
  FaSearch, 
  FaCheckCircle, 
  FaShieldAlt, 
  FaCalendarCheck, 
  FaPhoneAlt, 
  FaArrowRight, 
  FaStar, 
  FaClock, 
  FaHeartbeat
} from 'react-icons/fa';

export const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      navigate(`/doctors?search=${encodeURIComponent(query)}`);
    } else {
      navigate('/doctors');
    }
  };

  const popularSpecialties = [
    { name: 'Cardiologist', label: 'Heart Care', icon: '❤️' },
    { name: 'Neurologist', label: 'Brain & Nerves', icon: '🧠' },
    { name: 'Orthopedic', label: 'Bones & Joints', icon: '🦴' },
    { name: 'Pediatrician', label: "Children's Health", icon: '👶' },
    { name: 'Dermatologist', label: 'Skin & Hair', icon: '🧴' },
    { name: 'Dentist', label: 'Dental Care', icon: '🦷' },
  ];

  const coreCapabilities = [
    {
      icon: <FaUserMd size={26} color="var(--primary)" aria-hidden="true" />,
      badge: 'Verified Roster',
      badgeVariant: 'primary',
      title: 'Verified Specialist Doctors',
      description: 'Search board-certified doctors across 15+ specializations. Review qualifications, transparent consultation fees, and genuine patient feedback.',
      linkTo: '/doctors',
      linkText: 'Browse Doctors'
    },
    {
      icon: <FaHospital size={26} color="var(--secondary)" aria-hidden="true" />,
      badge: 'Accredited Care',
      badgeVariant: 'success',
      title: 'Partner Hospitals & Clinics',
      description: 'Explore leading healthcare institutions equipped with modern ICUs, advanced diagnostics, and dedicated patient care wings.',
      linkTo: '/hospitals',
      linkText: 'Explore Hospitals'
    },
    {
      icon: <FaAmbulance size={26} color="var(--emergency)" aria-hidden="true" />,
      badge: '24/7 Hotline 108',
      badgeVariant: 'danger',
      title: 'Emergency Ambulance Network',
      description: 'Rapid GPS-tracked emergency ambulance dispatch. Immediate coordination with regional trauma centers for critical patient transport.',
      linkTo: '/ambulance',
      linkText: 'Request Ambulance (108)'
    }
  ];

  const steps = [
    {
      step: '01',
      title: 'Search & Filter',
      desc: 'Filter by specialty, symptoms, doctor experience, consultation fee, or preferred partner hospital.'
    },
    {
      step: '02',
      title: 'Select a Confirmed Slot',
      desc: 'Pick an available consultation slot with real-time schedule locking to prevent double bookings.'
    },
    {
      step: '03',
      title: 'Receive Quality Care',
      desc: 'Receive immediate digital confirmation with clinic address, instructions, and direct check-in.'
    }
  ];

  return (
    <div style={{ backgroundColor: 'var(--bg-main)', minHeight: 'calc(100vh - 120px)' }}>
      {/* 1. HERO SECTION */}
      <section style={{
        background: 'radial-gradient(ellipse at top, #f0f9ff 0%, #e0f2fe 40%, #f8fafc 100%)',
        padding: '3.5rem 1rem 4rem',
        borderBottom: '1px solid var(--slate-200)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          
          {/* Trust Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Badge variant="primary" size="md">
              <FaShieldAlt style={{ marginRight: '0.35rem' }} aria-hidden="true" />
              Verified Medical Care Network & 24/7 Rapid Response
            </Badge>
          </div>

          {/* Main Headline */}
          <h1 style={{
            fontSize: 'clamp(2.1rem, 5vw, 3.4rem)',
            fontWeight: 900,
            color: 'var(--slate-900)',
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            marginBottom: '1rem'
          }}>
            Your Health, <span style={{ color: 'var(--primary)' }}>Connected</span> to Trusted Care.
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
            color: 'var(--slate-600)',
            maxWidth: '720px',
            margin: '0 auto 2.25rem',
            lineHeight: 1.6
          }}>
            Find certified doctors, book priority clinic appointments, explore accredited hospitals, and request 24/7 emergency 108 ambulance dispatch in seconds.
          </p>

          {/* Search Form */}
          <form 
            onSubmit={handleSearchSubmit}
            style={{
              backgroundColor: 'var(--white)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--slate-200)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              maxWidth: '680px',
              margin: '0 auto 1.5rem',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '220px', padding: '0.4rem 0.75rem' }}>
              <FaSearch color="var(--primary)" size={16} aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by doctor name, specialty, or condition..."
                aria-label="Search doctors by name, specialty, or condition"
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.98rem',
                  color: 'var(--slate-800)',
                  backgroundColor: 'transparent'
                }}
              />
            </div>
            <Button 
              type="submit" 
              variant="primary" 
              size="md"
              icon={<FaArrowRight aria-hidden="true" />}
            >
              Find Doctors
            </Button>
          </form>

          {/* Popular Specialty Pills */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--slate-500)', marginRight: '0.25rem' }}>
              Popular:
            </span>
            {popularSpecialties.map((spec) => (
              <Link
                key={spec.name}
                to={`/doctors?specialization=${encodeURIComponent(spec.name)}`}
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--slate-700)',
                  backgroundColor: 'var(--white)',
                  border: '1px solid var(--slate-200)',
                  padding: '0.3rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: 'var(--shadow-xs)',
                  transition: 'var(--transition)'
                }}
              >
                <span>{spec.icon}</span>
                <span>{spec.label}</span>
              </Link>
            ))}
          </div>

          {/* 24/7 Rapid Emergency Banner */}
          <div style={{
            marginTop: '2.5rem',
            backgroundColor: 'var(--white)',
            border: '1px solid var(--emergency-border, #fecaca)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--emergency)',
                flexShrink: 0
              }}>
                <FaHeartbeat size={20} aria-hidden="true" />
              </div>
              <div>
                <span style={{ display: 'block', fontWeight: 800, color: 'var(--slate-900)', fontSize: '0.95rem' }}>
                  Medical Emergency? Call 108 Immediate Response
                </span>
                <span style={{ color: 'var(--slate-500)', fontSize: '0.82rem' }}>
                  24/7 dedicated dispatch network with real-time GPS fleet routing.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <a 
                href="tel:108"
                className="btn btn-emergency btn-sm"
                style={{
                  backgroundColor: 'var(--emergency)',
                  color: 'var(--white)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  textDecoration: 'none',
                  fontWeight: 700,
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <FaPhoneAlt size={11} aria-hidden="true" /> Dial 108 Free
              </a>
              <Link 
                to="/ambulance"
                className="btn btn-outline btn-sm"
                style={{
                  color: 'var(--emergency)',
                  borderColor: 'var(--emergency-border, #fecaca)',
                  textDecoration: 'none',
                  fontWeight: 700,
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                Request Ambulance Online &rarr;
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 2. CORE CAPABILITIES (3 CARDS) */}
      <section style={{ padding: '4rem 1rem', maxWidth: '1140px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Badge variant="primary" size="sm">Comprehensive Services</Badge>
          <h2 style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.3rem)', fontWeight: 800, color: 'var(--slate-900)', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            Everything You Need For Connected Care
          </h2>
          <p style={{ color: 'var(--slate-600)', maxWidth: '600px', margin: '0 auto', fontSize: '1rem' }}>
            From preventive consultations to immediate acute ambulance response, MediConnect simplifies every stage of patient care.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          {coreCapabilities.map((card, idx) => (
            <div 
              key={idx}
              className="card card-lift"
              style={{
                backgroundColor: 'var(--white)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--slate-200)',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '14px',
                  backgroundColor: 'var(--slate-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {card.icon}
                </div>
                <Badge variant={card.badgeVariant} size="sm">{card.badge}</Badge>
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.65rem' }}>
                {card.title}
              </h3>
              <p style={{ color: 'var(--slate-600)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.5rem', flex: 1 }}>
                {card.description}
              </p>

              <Link
                to={card.linkTo}
                style={{
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                {card.linkText} &rarr;
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 3. HOW IT WORKS (3 STEPS) */}
      <section style={{ backgroundColor: 'var(--white)', padding: '4rem 1rem', borderTop: '1px solid var(--slate-200)', borderBottom: '1px solid var(--slate-200)' }}>
        <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <Badge variant="secondary" size="sm">Simple Process</Badge>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.3rem)', fontWeight: 800, color: 'var(--slate-900)', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              How MediConnect Works
            </h2>
            <p style={{ color: 'var(--slate-600)', fontSize: '1rem', maxWidth: '540px', margin: '0 auto' }}>
              Three easy steps to book consultations and access hospital care without standing in queues.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '2rem'
          }}>
            {steps.map((item, idx) => (
              <div 
                key={idx}
                style={{
                  backgroundColor: 'var(--bg-main)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--slate-200)',
                  padding: '1.75rem',
                  position: 'relative'
                }}
              >
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  color: 'var(--primary)',
                  opacity: 0.85,
                  marginBottom: '0.75rem'
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
                  {item.title}
                </h3>
                <p style={{ color: 'var(--slate-600)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. TRUST & ACCREDITATION COUNTERS */}
      <section style={{ padding: '3.5rem 1rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          textAlign: 'center'
        }}>
          <div>
            <span style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--primary)', display: 'block', lineHeight: 1 }}>50,000+</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--slate-600)', marginTop: '0.4rem', display: 'block' }}>Consultations Completed</span>
          </div>
          <div>
            <span style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--secondary)', display: 'block', lineHeight: 1 }}>150+</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--slate-600)', marginTop: '0.4rem', display: 'block' }}>Verified Doctors</span>
          </div>
          <div>
            <span style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--primary-dark)', display: 'block', lineHeight: 1 }}>45+</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--slate-600)', marginTop: '0.4rem', display: 'block' }}>Partner Hospitals</span>
          </div>
          <div>
            <span style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--emergency)', display: 'block', lineHeight: 1 }}>24/7</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--slate-600)', marginTop: '0.4rem', display: 'block' }}>Hotline 108 Dispatch</span>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CTA BANNER */}
      <section style={{
        background: 'linear-gradient(135deg, var(--primary, #0284c7) 0%, var(--primary-dark, #0c4a6e) 100%)',
        color: 'var(--white)',
        padding: '3.5rem 1rem',
        textAlign: 'center'
      }}>
        <div className="container" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 900, marginBottom: '1rem', color: 'var(--white)' }}>
            {isAuthenticated ? `Welcome back, ${user?.name?.split(' ')[0] || 'User'}` : 'Start Experiencing Better Healthcare Today'}
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#e0f2fe', marginBottom: '2rem', lineHeight: 1.6 }}>
            {isAuthenticated 
              ? 'Find doctors, view your scheduled appointments, or request emergency transport anytime.' 
              : 'Create your free patient account to book consultations, track appointments, and access certified specialists.'
            }
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link 
              to="/doctors"
              className="btn btn-secondary"
              style={{
                backgroundColor: 'var(--white)',
                color: 'var(--primary-dark)',
                fontWeight: 800,
                padding: '0.75rem 1.75rem',
                borderRadius: 'var(--radius-full)',
                textDecoration: 'none',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              Find a Doctor
            </Link>

            {!isAuthenticated && (
              <Link 
                to="/register"
                className="btn btn-outline"
                style={{
                  color: 'var(--white)',
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  fontWeight: 700,
                  padding: '0.75rem 1.75rem',
                  borderRadius: 'var(--radius-full)',
                  textDecoration: 'none'
                }}
              >
                Register Free
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
