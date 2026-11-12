import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaHospital, FaSearch, FaMapMarkerAlt, FaFilter, FaRedo } from 'react-icons/fa';
import { hospitalService } from '../services/hospitalService';
import { HospitalCard } from '../components/HospitalCard';
import { SkeletonGrid } from '../components/SkeletonLoader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useLanguage } from '../context/LanguageContext';

export const Hospitals = () => {
  const { t, isTelugu } = useLanguage();
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [sortBy, setSortBy] = useState('rating_desc');
  const [hospitals, setHospitals] = useState([]);
  const [cities, setCities] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHospitals = async () => {
      setLoading(true);
      try {
        const res = await hospitalService.getHospitals({
          search,
          city,
          state,
          sort_by: sortBy,
          limit: 50
        });
        if (res.success) {
          setHospitals(res.hospitals);
          if (res.cities) setCities(res.cities);
          if (res.states) setStates(res.states);
        }
      } catch (err) {
        console.error('Error fetching hospitals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, [search, city, state, sortBy]);

  const handleReset = () => {
    setSearch('');
    setCity('');
    setState('');
    setSortBy('rating_desc');
  };

  return (
    <div style={{ padding: '2.5rem 0 4rem' }}>
      <div className="container">
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <Badge variant="primary" size="md">
              <FaHospital style={{ marginRight: '0.35rem' }} aria-hidden="true" /> {isTelugu ? 'మల్టీ-స్పెషాలిటీ నెట్‌వర్క్' : 'Multi-Speciality Network'}
            </Badge>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
            {t('hospitals.title')}
          </h1>
          <p style={{ color: 'var(--slate-600)', fontSize: '1.05rem' }}>
            {t('hospitals.subtitle')}
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
              placeholder={t('hospitals.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <div>
            <select 
              value={state} 
              onChange={(e) => setState(e.target.value)}
              className="form-select"
            >
              <option value="">{t('hospitals.filterState') || (isTelugu ? 'అన్ని రాష్ట్రాలు' : 'All States')}</option>
              {states.map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <select 
              value={city} 
              onChange={(e) => setCity(e.target.value)}
              className="form-select"
            >
              <option value="">{t('hospitals.filterCity')}</option>
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
              <option value="rating_desc">{isTelugu ? 'అత్యధిక రేటింగ్' : 'Highest Rated'}</option>
              <option value="name_asc">{isTelugu ? 'ఆసుపత్రి పేరు (A - Z)' : 'Hospital Name: A to Z'}</option>
            </select>
          </div>

          <Button 
            type="button" 
            variant="secondary"
            onClick={handleReset}
            icon={<FaRedo aria-hidden="true" />}
          >
            {t('common.reset')}
          </Button>
        </div>

        {/* Results Grid */}
        {loading ? (
          <SkeletonGrid count={6} />
        ) : hospitals.length === 0 ? (
          <div className="empty-state">
            <FaHospital className="empty-state-icon" />
            <h3 className="empty-state-title">{t('hospitals.noHospitalsFound')}</h3>
            <p className="empty-state-desc">{isTelugu ? 'ఫిల్టర్లను రీసెట్ చేయండి లేదా వేరే నగరాన్ని ఎంచుకోండి.' : 'Try resetting your filters or searching for a different city.'}</p>
            <Button variant="primary" onClick={handleReset}>{t('hospitals.resetFilters')}</Button>
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

export default Hospitals;
