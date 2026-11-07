import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaHospitalSymbol, 
  FaPhoneAlt, 
  FaAmbulance, 
  FaShieldAlt, 
  FaHeartbeat 
} from 'react-icons/fa';

/**
 * Universal responsive healthcare footer with verified branding,
 * structured medical directories, trust assurances, and emergency 108 access.
 */
export const Footer = () => {
  return (
    <footer className="footer-main">
      <div className="container">
        {/* 4-Column Responsive Grid */}
        <div className="footer-grid">
          {/* Column 1: Brand & Identity */}
          <div className="footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '9px',
                background: 'linear-gradient(135deg, var(--primary, #0284c7), var(--primary-hover, #0369a1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0
              }}>
                <FaHospitalSymbol size={18} aria-hidden="true" />
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>
                Medi<span style={{ color: '#38bdf8' }}>Connect</span>
              </span>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6, margin: '0.4rem 0' }}>
              A compassionate, modern healthcare platform connecting patients with verified specialists, accredited hospitals, and 24/7 emergency dispatch services.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span className="badge badge-sm" style={{ backgroundColor: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <FaHeartbeat size={10} aria-hidden="true" /> Patient-First Care
              </span>
              <span className="badge badge-sm" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                <FaShieldAlt size={10} aria-hidden="true" /> ISO 27001
              </span>
            </div>
          </div>

          {/* Column 2: Healthcare Services */}
          <div className="footer-col">
            <h4 className="footer-heading">Services</h4>
            <Link to="/doctors" className="footer-link">Find Doctors</Link>
            <Link to="/hospitals" className="footer-link">Partner Hospitals</Link>
            <Link to="/specializations" className="footer-link">Medical Specialties</Link>
            <Link to="/doctors" className="footer-link">Book Appointment</Link>
          </div>

          {/* Column 3: Emergency & Support */}
          <div className="footer-col">
            <h4 className="footer-heading">Emergency & Help</h4>
            <a 
              href="tel:108" 
              className="footer-link" 
              style={{ color: '#f87171', fontWeight: 700 }}
              aria-label="Dial 108 Free Emergency Ambulance Hotline"
            >
              <FaPhoneAlt size={11} aria-hidden="true" /> Hotline: Dial 108 Free
            </a>
            <Link to="/ambulance" className="footer-link" style={{ color: '#fca5a5' }}>
              <FaAmbulance size={12} aria-hidden="true" /> Online Ambulance
            </Link>
            <Link to="/about" className="footer-link">About MediConnect</Link>
            <Link to="/contact" className="footer-link">Contact Support</Link>
          </div>

          {/* Column 4: Trust & Accreditations */}
          <div className="footer-col">
            <h4 className="footer-heading">Accreditations</h4>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.55 }}>
              Partner hospitals meet rigorous NABH clinical quality standards. All medical practitioners maintain active credentials.
            </p>
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
              <span>Emergency dispatch network operates 24/7 across participating regional centers.</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Legal */}
        <div className="footer-bottom">
          <div>
            &copy; {new Date().getFullYear()} MediConnect Healthcare Platform. All rights reserved.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/about" style={{ color: '#94a3b8', transition: 'color 0.2s' }}>Privacy Policy</Link>
            <span style={{ color: '#334155' }}>&bull;</span>
            <Link to="/about" style={{ color: '#94a3b8', transition: 'color 0.2s' }}>Terms of Service</Link>
            <span style={{ color: '#334155' }}>&bull;</span>
            <Link to="/contact" style={{ color: '#94a3b8', transition: 'color 0.2s' }}>Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
