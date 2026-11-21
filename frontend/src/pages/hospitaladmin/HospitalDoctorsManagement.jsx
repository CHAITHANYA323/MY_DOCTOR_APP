import React, { useState, useEffect } from 'react';
import {
  FaUserMd,
  FaStethoscope,
  FaCalendarAlt,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
  FaRupeeSign,
  FaGraduationCap
} from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import { ecosystemService } from '../../services/ecosystemService';

export const HospitalDoctorsManagement = () => {
  const { isTelugu } = useLanguage();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await ecosystemService.getHospitalAdminDoctors();
      if (res.success) {
        setDoctors(res.doctors || []);
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const filtered = doctors.filter(d =>
    (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.specialization_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
            {isTelugu ? 'వైద్యుల నిర్వహణ' : 'Manage Doctors'}
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem' }}>
            {isTelugu
              ? 'మీ ఆసుపత్రిలో సేవలు అందిస్తున్న వైద్యుల వివరాలు, ఫీజు మరియు సంప్రదింపు సమయాలు.'
              : 'View, search, and manage doctors practicing at your hospital.'}
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder={isTelugu ? 'వైద్యుని పేరు / విభాగం శోధించండి...' : 'Search doctor name or specialization...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#1d4ed8' }}>Loading Clinicians...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          {isTelugu ? 'వైద్యులు కనుగొనబడలేదు.' : 'No doctors found for this hospital.'}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 700 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.9rem 1.25rem' }}>{isTelugu ? 'వైద్యుడు' : 'Clinician'}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{isTelugu ? 'ప్రత్యేకత' : 'Specialization'}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{isTelugu ? 'అనుభవం' : 'Experience'}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{isTelugu ? 'ఫీజు' : 'Fee'}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{isTelugu ? 'పని దినాలు & సమయం' : 'Availability'}</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>{isTelugu ? 'స్థితి' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                          src={d.image || 'https://via.placeholder.com/150'}
                          alt={d.name}
                          style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                        />
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{d.name}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.qualification || 'MBBS'}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.25rem 0.65rem', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 700 }}>
                        {d.specialization_name || 'General Practitioner'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                      {d.experience} {isTelugu ? 'సంవత్సరాలు' : 'Years'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }}>
                      ₹{d.consultation_fee}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>{d.available_days}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{d.available_time}</div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.65rem',
                        borderRadius: '100px',
                        backgroundColor: d.status === 'Active' ? '#f0fdf4' : '#fef2f2',
                        color: d.status === 'Active' ? '#16a34a' : '#dc2626'
                      }}>
                        {d.status === 'Active' ? <FaCheckCircle size={10} /> : <FaTimesCircle size={10} />}
                        <span>{d.status || 'Active'}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
