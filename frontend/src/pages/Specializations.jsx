import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaStethoscope, FaArrowRight, FaSearch, FaUserMd } from 'react-icons/fa';
import { doctorService } from '../services/doctorService';
import { SkeletonGrid } from '../components/SkeletonLoader';
import { getSpecialtyInfo } from '../utils/specialtyMap';

export const Specializations = () => {
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        setLoading(true);
        const res = await doctorService.getSpecializations();
        if (res.success) {
          setSpecializations(res.specializations);
        }
      } catch (err) {
        console.error('Error fetching specializations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecializations();
  }, []);

  const filtered = specializations.filter((s) => {
    const info = getSpecialtyInfo(s.name);
    return (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      info.layman.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase())) ||
      info.desc.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div style={{ padding: '2.5rem 0 4rem', backgroundColor: 'var(--bg-main)' }}>
      <div className="container">
        {/* Page Header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center', maxWidth: '750px', margin: '0 auto 2.5rem' }}>
          <div className="section-tag">
            <FaStethoscope /> Simple Medical Specialties
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.75rem' }}>
            Find the Right Doctor by Specialty
          </h1>
          <p style={{ color: 'var(--slate-600)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Select what you need help with. You don’t need to know complex medical terms — choose from simple everyday health categories below.
          </p>
        </div>

        {/* Search Filter */}
        <div style={{ maxWidth: '540px', margin: '0 auto 2.5rem', position: 'relative' }}>
          <FaSearch style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
          <input 
            type="text" 
            placeholder="Search condition or specialty (e.g. Heart, Teeth, Skin, Child)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '3rem', height: '50px', borderRadius: 'var(--radius-full)', boxShadow: 'var(--shadow-sm)' }}
          />
        </div>

        {/* Grid of Specializations */}
        {loading ? (
          <SkeletonGrid count={8} />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <FaStethoscope className="empty-state-icon" />
            <h3 className="empty-state-title">No categories match "{search}"</h3>
            <p className="empty-state-desc">Try searching for simple words like "heart", "eye", "child", or "pain".</p>
            <button onClick={() => setSearch('')} className="btn btn-primary">
              View All Specialties
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {filtered.map((spec) => {
              const info = getSpecialtyInfo(spec.name);
              return (
                <div 
                  key={spec.id}
                  className="card card-lift"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1.75rem',
                    border: '1px solid var(--slate-200)',
                    backgroundColor: 'var(--white)'
                  }}
                >
                  <div style={{
                    width: 58,
                    height: 58,
                    borderRadius: '16px',
                    backgroundColor: info.color || 'var(--primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    marginBottom: '1.25rem'
                  }}>
                    {info.emoji}
                  </div>

                  <div className="flex items-center justify-between" style={{ marginBottom: '0.4rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                      {info.layman}
                    </h3>
                    <span className="badge badge-confirmed" style={{ fontSize: '0.72rem' }}>
                      {spec.doctor_count || 1}+ Doctors
                    </span>
                  </div>

                  <span style={{ fontSize: '0.8rem', color: 'var(--primary-dark)', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Clinical Department: {spec.name}
                  </span>

                  <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', lineHeight: 1.5, marginBottom: '1.5rem', flexGrow: 1 }}>
                    {info.desc || spec.description}
                  </p>

                  <Link 
                    to={`/specializations/${encodeURIComponent(spec.name)}`}
                    className="btn btn-outline"
                    style={{ width: '100%', marginTop: 'auto', fontWeight: 700 }}
                  >
                    View {info.layman} Doctors <FaArrowRight size={11} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
