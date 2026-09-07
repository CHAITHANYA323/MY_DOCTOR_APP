import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaHospitalSymbol, 
  FaShieldAlt, 
  FaUserMd, 
  FaHeartbeat, 
  FaAmbulance, 
  FaAward, 
  FaCheckCircle, 
  FaUsers, 
  FaHandHoldingHeart, 
  FaClock, 
  FaPhoneAlt,
  FaArrowRight
} from 'react-icons/fa';

export const About = () => {
  const stats = [
    { number: '50,000+', label: 'Patients Treated Successfully' },
    { number: '150+', label: 'Verified Specialist Doctors' },
    { number: '45+', label: 'Accredited Hospitals Partnered' },
    { number: '99.8%', label: 'Positive Patient Satisfaction' }
  ];

  const coreValues = [
    {
      icon: <FaHandHoldingHeart />,
      title: 'Patient-First Compassion',
      desc: 'We put patients and their families at the heart of every decision, ensuring empathetic, respectful, and dignified healthcare services.'
    },
    {
      icon: <FaShieldAlt />,
      title: 'Clinical Integrity',
      desc: 'Only certified doctors with verified medical council credentials practice within our network. Zero compromise on patient safety.'
    },
    {
      icon: <FaClock />,
      title: 'Rapid Emergency Response',
      desc: 'Our real-time GPS fleet ambulance network operates 24/7/365 to deliver critical care when seconds count most.'
    },
    {
      icon: <FaAward />,
      title: 'Transparent Healthcare',
      desc: 'Clear upfront consultation fees, honest patient reviews, and transparent hospital facilities without hidden medical charges.'
    }
  ];

  const leadership = [
    {
      name: 'Dr. Ramesh Chandra',
      role: 'Chief Medical Officer & Cardiologist',
      credentials: 'MBBS, MD, DM (Cardiology), FACC',
      image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
      bio: 'Former head of Cardiology at AIIMS with 25+ years of clinical leadership in interventional coronary care.'
    },
    {
      name: 'Dr. Radhika Sen',
      role: 'Head of Clinical Quality & Governance',
      credentials: 'MBBS, MD, DNB (Internal Medicine)',
      image: 'https://images.unsplash.com/photo-1594824813576-a21235122709?w=400&auto=format&fit=crop&q=80',
      bio: 'NABH certified clinical assessor guiding our network quality benchmarks and hospital infection protocols.'
    },
    {
      name: 'Dr. Sanjay Krishnamurthy',
      role: 'Director of Emergency Medicine & Trauma',
      credentials: 'MBBS, MS, MRCEM (UK)',
      image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
      bio: 'Specialist in critical care logistics, spearheading our 24/7 mobile ICU dispatch systems and stroke management.'
    }
  ];

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* 1. HERO SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #ffffff 100%)',
        padding: '4.5rem 0 3.5rem',
        borderBottom: '1px solid var(--slate-200)'
      }}>
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <div className="section-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <FaHospitalSymbol /> Transforming Healthcare Access
            </div>
            <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '1.25rem', lineHeight: 1.2 }}>
              Dedicated to Compassionate, World-Class <span style={{ color: 'var(--primary)' }}>Medical Care</span>
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'var(--slate-600)', lineHeight: 1.7, marginBottom: '2rem' }}>
              MediCare Plus bridges the gap between patients, verified medical specialists, leading hospitals, and emergency dispatch services. We believe quality healthcare must be transparent, immediate, and accessible to all.
            </p>
            <div className="flex items-center justify-center gap-3" style={{ flexWrap: 'wrap' }}>
              <Link to="/doctors" className="btn btn-primary btn-lg">
                <FaUserMd /> Meet Our Doctors
              </Link>
              <Link to="/contact" className="btn btn-secondary btn-lg">
                <FaPhoneAlt /> Contact Our Team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS BANNER */}
      <section style={{ padding: '3.5rem 0', backgroundColor: 'var(--white)', borderBottom: '1px solid var(--slate-100)' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2rem',
            textAlign: 'center'
          }}>
            {stats.map((s, idx) => (
              <div key={idx} className="card" style={{ padding: '2rem 1.5rem', border: '1px solid var(--slate-200)' }}>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  {s.number}
                </h3>
                <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--slate-700)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. OUR MISSION & STORY */}
      <section style={{ padding: '4.5rem 0', backgroundColor: 'var(--bg-main)' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            alignItems: 'center',
            gap: '3.5rem'
          }}>
            <div>
              <div className="section-tag">Our Founding Purpose</div>
              <h2 className="section-title">Bridging Medical Expertise with Modern Patient Care</h2>
              <p style={{ fontSize: '1rem', color: 'var(--slate-700)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                Founded by a coalition of senior doctors and healthcare administrators, MediCare Plus was built to resolve real healthcare frustrations: endless hospital queues, lack of transparent consultation fees, and delay in emergency ambulance response.
              </p>
              <p style={{ fontSize: '1rem', color: 'var(--slate-700)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                Today, our digital platform connects tens of thousands of families with NABH-accredited multi-speciality hospitals and board-certified clinicians across 20 distinct medical departments.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="flex items-center gap-3">
                  <FaCheckCircle color="var(--success)" size={18} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--slate-800)' }}>
                    Strict 3-tier credential vetting for all registered medical practitioners
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <FaCheckCircle color="var(--success)" size={18} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--slate-800)' }}>
                    Partnership with Tier-1 multi-speciality hospital networks nationwide
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <FaCheckCircle color="var(--success)" size={18} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--slate-800)' }}>
                    Dedicated 24/7 emergency dispatch center for ICU ambulances
                  </span>
                </div>
              </div>
            </div>

            {/* Hospital Team Image */}
            <div style={{ position: 'relative' }}>
              <img 
                src="https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&auto=format&fit=crop&q=80" 
                alt="Medical staff in consultation"
                style={{ width: '100%', height: '400px', objectFit: 'cover', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }} 
              />
              <div style={{
                position: 'absolute',
                bottom: '-20px',
                right: '20px',
                backgroundColor: 'var(--white)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--slate-200)',
                maxWidth: '240px'
              }}>
                <div className="flex items-center gap-2" style={{ color: 'var(--primary)', marginBottom: '0.35rem' }}>
                  <FaAward size={20} />
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--slate-900)' }}>NABH Standards</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', lineHeight: 1.4 }}>
                  Excellence in clinical protocols, hygiene, and patient safety compliance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE VALUES */}
      <section style={{ padding: '4.5rem 0', backgroundColor: 'var(--white)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3.5rem' }}>
            <div className="section-tag">Guiding Principles</div>
            <h2 className="section-title">The Values That Guide Our Care</h2>
            <p className="section-subtext">
              Every appointment booked, every prescription written, and every ambulance dispatched is rooted in our commitment to clinical integrity.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '2rem'
          }}>
            {coreValues.map((val, idx) => (
              <div key={idx} className="card card-lift" style={{ padding: '2rem', border: '1px solid var(--slate-200)' }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '16px',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: '1.25rem'
                }}>
                  {val.icon}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '0.75rem' }}>
                  {val.title}
                </h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--slate-600)', lineHeight: 1.6 }}>
                  {val.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. MEDICAL ADVISORY BOARD */}
      <section style={{ padding: '4.5rem 0', backgroundColor: 'var(--bg-main)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3.5rem' }}>
            <div className="section-tag">Clinical Governance</div>
            <h2 className="section-title">Medical Advisory Board</h2>
            <p className="section-subtext">
              Distinguished clinicians guiding our diagnostic standards and healthcare delivery protocols.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {leadership.map((leader, idx) => (
              <div key={idx} className="card card-lift" style={{ overflow: 'hidden', border: '1px solid var(--slate-200)' }}>
                <img 
                  src={leader.image} 
                  alt={leader.name} 
                  style={{ width: '100%', height: '260px', objectFit: 'cover' }} 
                />
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '0.25rem' }}>
                    {leader.name}
                  </h3>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.4rem' }}>
                    {leader.role}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)', fontWeight: 600, marginBottom: '0.85rem' }}>
                    {leader.credentials}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                    {leader.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION BANNER */}
      <section style={{ padding: '3.5rem 0' }}>
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            borderRadius: 'var(--radius-xl)',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            color: 'white',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'white', marginBottom: '1rem' }}>
              Experience the MediCare Plus Difference Today
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#e0f2fe', maxWidth: '650px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
              Whether you need a routine health check, a second medical opinion, or urgent emergency care, our verified network is ready to assist you.
            </p>
            <div className="flex items-center justify-center gap-3" style={{ flexWrap: 'wrap' }}>
              <Link to="/doctors" className="btn btn-lg" style={{ backgroundColor: 'white', color: 'var(--primary)', fontWeight: 800 }}>
                Find Your Specialist <FaArrowRight size={12} />
              </Link>
              <Link to="/emergency" className="btn btn-emergency btn-lg">
                <FaAmbulance /> Emergency Ambulance
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
