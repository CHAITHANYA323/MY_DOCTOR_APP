import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaHospital, FaSearch, FaMapMarkerAlt, FaFilter, FaRedo } from 'react-icons/fa';
import { hospitalService } from '../services/hospitalService';
import { HospitalCard } from '../components/HospitalCard';
import { SkeletonGrid } from '../components/SkeletonLoader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

export const Hospitals = () => {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [sortBy, setSortBy] = useState('rating_desc');
  const [hospitals, setHospitals] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHospitals = async () => {
      setLoading(true);
      try {
        const res = await hospitalService.getHospitals({
          search,
          city,
          sort_by: sortBy,
          limit: 30
        });
        if (res.success) {
          setHospitals(res.hospitals);
          if (res.cities) setCities(res.cities);
        }
      } catch (err) {
        console.error('Error fetching hospitals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, [search, city, sortBy]);

  const handleReset = () => {
    setSearch('');
    setCity('');
    setSortBy('rating_desc');
  };

  return (
    <div style={{ padding: '2.5rem 0 4rem' }}>
      <div className="container">
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <Badge variant="primary" size="md">
              <FaHospital style={{ marginRight: '0.35rem' }} aria-hidden="true" /> Multi-Speciality Network
            </Badge>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
            Top Multi-Speciality & Super-Speciality Hospitals
          </h1>
          <p style={{ color: 'var(--slate-600)', fontSize: '1.05rem' }}>
            Explore leading medical institutions equipped with emergency trauma centers and modern surgical wings
          </p>
        </div>

        {/* Filter / Search Bar */}
        <div style={{
          backgroundColor: 'var(--white)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--slate-200)',
          marginBottom: '2.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr)) auto',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <div style={{ position: 'relative' }}>
            <FaSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
            <input 
              type="text" 
              placeholder="Search by hospital name or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <div>
            <select 
              value={city} 
              onChange={(e) => setCity(e.target.value)}
              className="form-select"
            >
              <option value="">All Cities</option>
              {cities.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select"
            >
              <option value="rating_desc">Highest Rated</option>
              <option value="name_asc">Hospital Name: A to Z</option>
            </select>
          </div>

          <Button 
            type="button" 
            variant="secondary"
            onClick={handleReset}
            icon={<FaRedo aria-hidden="true" />}
          >
            Reset
          </Button>
        </div>

        {/* Results Grid */}
        {loading ? (
          <SkeletonGrid count={6} />
        ) : hospitals.length === 0 ? (
          <div className="empty-state">
            <FaHospital className="empty-state-icon" />
            <h3 className="empty-state-title">No hospitals found</h3>
            <p className="empty-state-desc">Try resetting your filters or searching for a different city.</p>
            <Button variant="primary" onClick={handleReset}>Reset Filters</Button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '2rem'
          }}>
            {hospitals.map((hosp) => (
              <HospitalCard key={hosp.id} hospital={hosp} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
