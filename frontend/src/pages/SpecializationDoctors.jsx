import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaUserMd, FaHospital, FaCalendarCheck } from 'react-icons/fa';
import { doctorService } from '../services/doctorService';
import { DoctorCard } from '../components/DoctorCard';
import { SkeletonGrid } from '../components/SkeletonLoader';
import { getSpecialtyInfo } from '../utils/specialtyMap';

export const SpecializationDoctors = () => {
  const { name } = useParams();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const decodedName = decodeURIComponent(name || '');
  const specialtyInfo = getSpecialtyInfo(decodedName);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const res = await doctorService.getDoctors({
          specialization: decodedName,
          limit: 20
        });
        if (res.success) {
          setDoctors(res.doctors);
        }
      } catch (err) {
        console.error(err);
        setError('Unable to load doctors for this specialization.');
      } finally {
        setLoading(false);
      }
    };

    if (decodedName) {
      fetchDoctors();
    }
  }, [decodedName]);

  return (
    <div style={{ padding: '2.5rem 0 4rem', backgroundColor: 'var(--bg-main)' }}>
      <div className="container">
        {/* Breadcrumb / Back Link */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link to="/specializations" className="flex items-center gap-2" style={{ color: 'var(--slate-600)', fontSize: '0.9rem', fontWeight: 600 }}>
            <FaArrowLeft /> View All Specialties
          </Link>
        </div>

        {/* Specialty Header Banner */}
        <div className="card" style={{
          padding: '2.5rem 2rem',
          marginBottom: '2.5rem',
          backgroundColor: 'var(--white)',
          border: '1px solid var(--slate-200)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '20px',
              backgroundColor: specialtyInfo.color || 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.4rem'
            }}>
              {specialtyInfo.emoji}
            </div>

            <div style={{ flex: 1, minWidth: '260px' }}>
              <span className="section-tag" style={{ marginBottom: '0.4rem' }}>
                Medical Specialty Department
              </span>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.4rem' }}>
                {specialtyInfo.layman} Doctors ({decodedName})
              </h1>
              <p style={{ fontSize: '1.05rem', color: 'var(--slate-600)', lineHeight: 1.5, margin: 0 }}>
                {specialtyInfo.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Doctor Results Section */}
        <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Available Specialists ({doctors.length})
          </h2>
          <span style={{ fontSize: '0.9rem', color: 'var(--slate-500)', fontWeight: 600 }}>
            Showing verified clinicians
          </span>
        </div>

        {loading ? (
          <SkeletonGrid count={6} />
        ) : doctors.length === 0 ? (
          <div className="empty-state">
            <FaUserMd className="empty-state-icon" />
            <h3 className="empty-state-title">No doctors currently listed for {specialtyInfo.layman}</h3>
            <p className="empty-state-desc">
              We are actively onboarding more verified specialists in this field. You can browse other medical departments or find a hospital near you.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/doctors" className="btn btn-primary">Browse All Doctors</Link>
              <Link to="/specializations" className="btn btn-secondary">All Specialties</Link>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.75rem'
          }}>
            {doctors.map((doc) => (
              <DoctorCard key={doc.id} doctor={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
