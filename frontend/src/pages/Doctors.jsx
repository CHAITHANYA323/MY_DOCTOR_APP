import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  FaSearch, 
  FaFilter, 
  FaTimes, 
  FaUserMd, 
  FaRedo, 
  FaChevronLeft, 
  FaChevronRight,
  FaSlidersH,
  FaCalendarCheck,
  FaStethoscope,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import { doctorService } from '../services/doctorService';
import { hospitalService } from '../services/hospitalService';
import { DoctorCard } from '../components/DoctorCard';
import { SkeletonGrid } from '../components/SkeletonLoader';
import { getSpecialtyInfo } from '../utils/specialtyMap';
import { useLanguage } from '../context/LanguageContext';

export const Doctors = () => {
  const { t, isTelugu } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter & Search State
  const initialSearch = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [specialization, setSpecialization] = useState(searchParams.get('specialization') || '');
  const [hospital, setHospital] = useState(searchParams.get('hospital') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [minExp, setMinExp] = useState(searchParams.get('min_experience') || '');
  const [minFee, setMinFee] = useState(searchParams.get('min_fee') || '');
  const [maxFee, setMaxFee] = useState(searchParams.get('max_fee') || '');
  const [availability, setAvailability] = useState(searchParams.get('availability') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'rating_desc');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Metadata Lists
  const [specializations, setSpecializations] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);

  // Results State
  const [doctors, setDoctors] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Close mobile filter drawer on Escape key and prevent background scroll
  useEffect(() => {
    if (!mobileFilterOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileFilterOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileFilterOpen]);

  // Debounce search input changes by 350ms to prevent rapid-fire API requests
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Quick Layman Specialty Selection Pills
  const quickCategories = [
    { label: "All Specialties", key: "" },
    { label: "❤️ Heart Care", key: "Cardiologist" },
    { label: "🧠 Brain & Nerves", key: "Neurologist" },
    { label: "🦴 Bones & Joints", key: "Orthopedic" },
    { label: "👶 Children's Health", key: "Pediatrician" },
    { label: "🧴 Skin & Hair", key: "Dermatologist" },
    { label: "🦷 Dental & Teeth", key: "Dentist" },
    { label: "👁️ Eye Care", key: "Ophthalmologist" },
    { label: "🩺 General Medicine", key: "General Physician" },
    { label: "🌸 Women's Health", key: "Gynecologist" },
    { label: "👂 Ear, Nose & Throat", key: "ENT Specialist" },
  ];

  // Count active filters for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (specialization) count++;
    if (hospital) count++;
    if (location) count++;
    if (minExp) count++;
    if (minFee) count++;
    if (maxFee) count++;
    if (availability) count++;
    return count;
  }, [search, specialization, hospital, location, minExp, minFee, maxFee, availability]);

  // Load Filter Metadata (Specializations, Hospitals)
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [specsRes, hospsRes] = await Promise.all([
          doctorService.getSpecializations(),
          hospitalService.getHospitals({ limit: 100 })
        ]);
        if (specsRes.success) setSpecializations(specsRes.specializations);
        if (hospsRes.success) setHospitals(hospsRes.hospitals);
      } catch (err) {
        console.error('Error loading metadata:', err);
      }
    };
    loadMetadata();
  }, []);

  // Fetch Doctors whenever filters, search, or pagination change
  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        search,
        specialization,
        hospital,
        location,
        min_experience: minExp,
        min_fee: minFee,
        max_fee: maxFee,
        availability,
        sort_by: sortBy,
        page,
        limit: 9
      };

      // Sync with browser URL
      const newParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) newParams.set(k, v);
      });
      setSearchParams(newParams, { replace: true });

      const res = await doctorService.getDoctors(params);
      if (res.success) {
        setDoctors(res.doctors);
        setTotal(res.total);
        setTotalPages(res.total_pages);
        if (res.available_locations) {
          setAvailableLocations(res.available_locations);
        }
      } else {
        setError(res.message || 'Failed to load doctors.');
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError(err.response?.data?.message || 'Unable to load doctors. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [search, specialization, hospital, location, minExp, minFee, maxFee, availability, sortBy, page, setSearchParams]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setSpecialization('');
    setHospital('');
    setLocation('');
    setMinExp('');
    setMinFee('');
    setMaxFee('');
    setAvailability('');
    setSortBy('rating_desc');
    setPage(1);
    setError(null);
    setMobileFilterOpen(false);
  };

  return (
    <div style={{ padding: '2rem 0 4.5rem', backgroundColor: '#f8fafc', minHeight: '88vh' }}>
      <div className="container">
        
        {/* ====================================================
            1. SIMPLE PAGE HEADER
            ==================================================== */}
        <div style={{ marginBottom: '1.75rem', textAlign: 'left' }}>
          <div 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              backgroundColor: 'var(--primary-light)', 
              color: 'var(--primary-dark)', 
              padding: '0.3rem 0.75rem', 
              borderRadius: 'var(--radius-full)', 
              fontSize: '0.82rem', 
              fontWeight: 700, 
              marginBottom: '0.6rem' 
            }}
          >
            <FaCheckCircle color="var(--primary)" size={13} />
            <span>100% Verified Medical Specialists</span>
          </div>

          <h1 
            style={{ 
              fontSize: '2.4rem', 
              fontWeight: 900, 
              color: 'var(--slate-900)', 
              letterSpacing: '-0.025em', 
              marginBottom: '0.4rem' 
            }}
          >
            {t('doctors.title')}
          </h1>

          <p 
            style={{ 
              color: 'var(--slate-600)', 
              fontSize: '1.08rem', 
              maxWidth: '850px', 
              lineHeight: 1.5, 
              margin: 0 
            }}
          >
            {t('doctors.subtitle')}
          </p>
        </div>

        {/* ====================================================
            2. MAIN SEARCH FOCUS CONTAINER
            ==================================================== */}
        <div 
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 4px 18px rgba(15, 23, 42, 0.06)',
            border: '2px solid var(--slate-200)',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <FaSearch 
              style={{ 
                position: 'absolute', 
                left: '18px', 
                fontSize: '1.25rem', 
                color: 'var(--primary)', 
                pointerEvents: 'none' 
              }} 
            />
            
            <input 
              type="text" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('doctors.searchPlaceholder')}
              aria-label={t('doctors.searchPlaceholder')}
              style={{
                width: '100%',
                height: '56px',
                paddingLeft: '3.2rem',
                paddingRight: searchInput ? '3rem' : '1.25rem',
                fontSize: '1.1rem',
                fontWeight: 500,
                color: 'var(--slate-900)',
                backgroundColor: '#ffffff',
                border: '1px solid var(--slate-300)',
                borderRadius: 'var(--radius-lg)',
                outline: 'none',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--slate-300)';
                e.target.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.04)';
              }}
            />

            {/* Clear Search 'X' Button */}
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                aria-label="Clear search input"
                style={{
                  position: 'absolute',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--slate-400)',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%'
                }}
                title="Clear search"
              >
                <FaTimes size={16} />
              </button>
            )}
          </div>

          {/* Helper Text */}
          <div 
            style={{ 
              marginTop: '0.65rem', 
              fontSize: '0.86rem', 
              color: 'var(--slate-500)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem',
              flexWrap: 'wrap'
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--slate-700)' }}>Example:</span>
            <span>Cardiologist, Dr. Suresh, Apollo Hospital</span>
          </div>
        </div>

        {/* ====================================================
            3. SPECIALTY SELECTION PILLS (Layman & Friendly)
            ==================================================== */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--slate-700)' }}>
              Choose a Specialty:
            </span>
            {specialization && (
              <button
                type="button"
                onClick={() => { setSpecialization(''); setPage(1); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Reset Specialty
              </button>
            )}
          </div>

          <div 
            style={{
              display: 'flex',
              gap: '0.65rem',
              overflowX: 'auto',
              paddingBottom: '0.6rem',
              scrollbarWidth: 'thin'
            }}
          >
            {quickCategories.map((cat) => {
              const isSelected = specialization === cat.key;
              return (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => {
                    setSpecialization(cat.key);
                    setPage(1);
                  }}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '0.55rem 1.15rem',
                    borderRadius: 'var(--radius-full)',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--slate-300)',
                    backgroundColor: isSelected ? 'var(--primary)' : '#ffffff',
                    color: isSelected ? '#ffffff' : 'var(--slate-700)',
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 3px 10px rgba(2, 132, 199, 0.28)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                    flexShrink: 0
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Filter Button (Shows only on mobile screens) */}
        <div className="mobile-filter-strip" style={{ display: 'none', marginBottom: '1.25rem' }}>
          <button 
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="btn btn-secondary"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontWeight: 800,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              backgroundColor: '#ffffff',
              border: '2px solid var(--slate-300)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
            }}
          >
            <FaSlidersH color="var(--primary)" />
            <span>Filter Doctors</span>
            {activeFiltersCount > 0 && (
              <span 
                style={{
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* ====================================================
            4. MAIN GRID: FILTERS PANEL (LEFT) + RESULTS (RIGHT)
            ==================================================== */}
        <div 
          className="doctors-layout-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '300px 1fr',
            gap: '2rem',
            alignItems: 'flex-start'
          }}
        >
          {/* ====================================================
              FILTER DOCTORS SIDEBAR (DESKTOP)
              ==================================================== */}
          <aside 
            className="filter-panel-desktop"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--slate-200)',
              padding: '1.75rem',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: '1.35rem', 
                paddingBottom: '0.85rem', 
                borderBottom: '1px solid var(--slate-200)' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaFilter color="var(--primary)" size={16} />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                  Filter Doctors
                </h2>
              </div>

              {/* Clear Filters Button */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--emergency)',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                  title="Clear all applied filters"
                >
                  <FaRedo size={11} /> Clear Filters
                </button>
              )}
            </div>

            {/* Filter 1: Specialty */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label 
                htmlFor="filter-specialty"
                style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}
              >
                Specialty
              </label>
              <select 
                id="filter-specialty"
                value={specialization}
                onChange={(e) => { setSpecialization(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-300)',
                  backgroundColor: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'var(--slate-800)',
                  outline: 'none'
                }}
              >
                <option value="">All Specialties</option>
                {specializations.map((s) => {
                  const info = getSpecialtyInfo(s.name);
                  return (
                    <option key={s.id} value={s.name}>
                      {info.emoji} {info.layman} ({s.name})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Filter 2: Hospital */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label 
                htmlFor="filter-hospital"
                style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}
              >
                Hospital / Clinic
              </label>
              <select 
                id="filter-hospital"
                value={hospital}
                onChange={(e) => { setHospital(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-300)',
                  backgroundColor: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'var(--slate-800)',
                  outline: 'none'
                }}
              >
                <option value="">All Partner Hospitals</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.name}>{h.name}</option>
                ))}
              </select>
            </div>

            {/* Filter 3: City / Area */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label 
                htmlFor="filter-location"
                style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}
              >
                City / Area
              </label>
              <select 
                id="filter-location"
                value={location}
                onChange={(e) => { setLocation(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-300)',
                  backgroundColor: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'var(--slate-800)',
                  outline: 'none'
                }}
              >
                <option value="">All Cities / Areas</option>
                {availableLocations.map((loc, idx) => (
                  <option key={idx} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Filter 4: Experience */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label 
                htmlFor="filter-experience"
                style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}
              >
                Experience
              </label>
              <select 
                id="filter-experience"
                value={minExp}
                onChange={(e) => { setMinExp(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-300)',
                  backgroundColor: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'var(--slate-800)',
                  outline: 'none'
                }}
              >
                <option value="">Any Experience</option>
                <option value="5">5+ Years Experience</option>
                <option value="10">10+ Years Experience</option>
                <option value="15">15+ Years Experience</option>
              </select>
            </div>

            {/* Filter 5: Min Consultation Fee */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label 
                htmlFor="filter-min-fee"
                style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}
              >
                Min Consultation Fee
              </label>
              <select 
                id="filter-min-fee"
                value={minFee}
                onChange={(e) => { setMinFee(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-300)',
                  backgroundColor: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'var(--slate-800)',
                  outline: 'none'
                }}
              >
                <option value="">Any Min Fee</option>
                <option value="500">₹500 and above</option>
                <option value="800">₹800 and above</option>
                <option value="1000">₹1,000 and above</option>
              </select>
            </div>

            {/* Filter 6: Max Consultation Fee */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label 
                htmlFor="filter-max-fee"
                style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}
              >
                Max Consultation Fee
              </label>
              <select 
                id="filter-max-fee"
                value={maxFee}
                onChange={(e) => { setMaxFee(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-300)',
                  backgroundColor: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'var(--slate-800)',
                  outline: 'none'
                }}
              >
                <option value="">Any Max Fee</option>
                <option value="500">Up to ₹500</option>
                <option value="800">Up to ₹800</option>
                <option value="1000">Up to ₹1,000</option>
                <option value="1500">Up to ₹1,500</option>
              </select>
            </div>

            {/* Filter 7: Availability */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="filter-availability"
                style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}
              >
                Availability
              </label>
              <select 
                id="filter-availability"
                value={availability}
                onChange={(e) => { setAvailability(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-300)',
                  backgroundColor: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'var(--slate-800)',
                  outline: 'none'
                }}
              >
                <option value="">All Days</option>
                <option value="Saturday">Available on Saturdays</option>
                <option value="Friday">Available on Fridays</option>
              </select>
            </div>

            {/* Clear All Filters Button */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-secondary"
              style={{
                width: '100%',
                fontWeight: 700,
                fontSize: '0.92rem',
                justifyContent: 'center',
                borderColor: 'var(--slate-300)'
              }}
            >
              Clear Filters
            </button>
          </aside>

          {/* ====================================================
              DOCTOR RESULTS SECTION (RIGHT)
              ==================================================== */}
          <main>
            {/* Header: Results Count + Sort By */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                backgroundColor: '#ffffff',
                padding: '0.9rem 1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--slate-200)',
                marginBottom: '1.5rem',
                boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)'
              }}
            >
              {/* Results Count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  {total} {total === 1 ? 'doctor found' : 'doctors found'}
                </span>
                {loading && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--slate-400)', fontWeight: 600 }}>
                    (Updating...)
                  </span>
                )}
              </div>

              {/* Simple Sort Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <label 
                  htmlFor="sort-by-select"
                  style={{ fontSize: '0.9rem', color: 'var(--slate-600)', fontWeight: 700, whiteSpace: 'nowrap', margin: 0 }}
                >
                  Sort by:
                </label>
                <select 
                  id="sort-by-select"
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  style={{
                    padding: '0.55rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-300)',
                    backgroundColor: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--slate-800)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="rating_desc">Highest Rated ⭐</option>
                  <option value="experience_desc">Most Experienced</option>
                  <option value="fee_asc">Lowest Consultation Fee</option>
                  <option value="fee_desc">Highest Consultation Fee</option>
                  <option value="name_asc">Doctor Name: A to Z</option>
                </select>
              </div>
            </div>

            {/* Active Filters Chips */}
            {activeFiltersCount > 0 && (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  marginBottom: '1.25rem',
                  padding: '0.25rem 0'
                }}
              >
                <span style={{ fontSize: '0.84rem', color: 'var(--slate-500)', fontWeight: 600 }}>
                  Active filters:
                </span>

                {search && (
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: 'var(--slate-200)',
                      color: 'var(--slate-800)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    "{search}"
                    <FaTimes size={10} style={{ cursor: 'pointer' }} onClick={() => { setSearchInput(''); setSearch(''); }} />
                  </span>
                )}

                {specialization && (
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary-dark)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    Specialty: {specialization}
                    <FaTimes size={10} style={{ cursor: 'pointer' }} onClick={() => setSpecialization('')} />
                  </span>
                )}

                {hospital && (
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: 'var(--slate-200)',
                      color: 'var(--slate-800)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    Hospital: {hospital}
                    <FaTimes size={10} style={{ cursor: 'pointer' }} onClick={() => setHospital('')} />
                  </span>
                )}

                {location && (
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: 'var(--slate-200)',
                      color: 'var(--slate-800)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    City: {location}
                    <FaTimes size={10} style={{ cursor: 'pointer' }} onClick={() => setLocation('')} />
                  </span>
                )}

                {minExp && (
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: 'var(--slate-200)',
                      color: 'var(--slate-800)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    {minExp}+ Yrs Exp
                    <FaTimes size={10} style={{ cursor: 'pointer' }} onClick={() => setMinExp('')} />
                  </span>
                )}

                {minFee && (
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: 'var(--slate-200)',
                      color: 'var(--slate-800)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    Min Fee: ₹{minFee}
                    <FaTimes size={10} style={{ cursor: 'pointer' }} onClick={() => setMinFee('')} />
                  </span>
                )}

                {maxFee && (
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: 'var(--slate-200)',
                      color: 'var(--slate-800)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    Max Fee: ₹{maxFee}
                    <FaTimes size={10} style={{ cursor: 'pointer' }} onClick={() => setMaxFee('')} />
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--emergency)',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0.2rem 0.4rem'
                  }}
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Results Grid / Loading / Error / No Results */}
            {loading ? (
              <SkeletonGrid count={6} />
            ) : error ? (
              /* API Error State with Retry Button */
              <div 
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid #fecaca',
                  padding: '3.5rem 2rem',
                  textAlign: 'center',
                  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.06)'
                }}
              >
                <div 
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#fee2e2',
                    color: '#ef4444',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    marginBottom: '1rem'
                  }}
                >
                  <FaExclamationTriangle />
                </div>

                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
                  Unable to load doctors
                </h3>

                <p style={{ color: 'var(--slate-600)', fontSize: '0.98rem', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                  {error}
                </p>

                <button
                  type="button"
                  onClick={fetchDoctors}
                  className="btn btn-primary"
                  style={{
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    padding: '0.65rem 1.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FaRedo size={12} /> Retry
                </button>
              </div>
            ) : doctors.length === 0 ? (
              /* ====================================================
                 14. NO RESULTS STATE
                 ==================================================== */
              <div 
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--slate-200)',
                  padding: '4rem 2rem',
                  textAlign: 'center',
                  boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div 
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    marginBottom: '1.25rem'
                  }}
                >
                  <FaUserMd />
                </div>

                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
                  No doctors found
                </h3>

                <p style={{ color: 'var(--slate-600)', fontSize: '1.05rem', maxWidth: '480px', margin: '0 auto 1.75rem', lineHeight: 1.5 }}>
                  Try changing your search or filters.
                </p>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn btn-primary"
                  style={{
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    padding: '0.75rem 1.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FaRedo size={12} /> Clear Filters
                </button>
              </div>
            ) : (
              /* ====================================================
                 8. DOCTOR CARDS GRID
                 ==================================================== */
              <>
                <div 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(295px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2.5rem'
                  }}
                >
                  {doctors.map((doc) => (
                    <DoctorCard key={doc.id} doctor={doc} />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.5rem', 
                      marginTop: '2.5rem' 
                    }}
                  >
                    <button 
                      type="button"
                      onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={page === 1}
                      className="btn btn-secondary btn-sm"
                      style={{ fontWeight: 700 }}
                    >
                      <FaChevronLeft size={11} /> Previous
                    </button>

                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pNum = i + 1;
                      const isCurrent = page === pNum;
                      return (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => { setPage(pNum); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: 'var(--radius-md)',
                            border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--slate-300)',
                            backgroundColor: isCurrent ? 'var(--primary)' : '#ffffff',
                            color: isCurrent ? '#ffffff' : 'var(--slate-800)',
                            fontWeight: 800,
                            fontSize: '0.92rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {pNum}
                        </button>
                      );
                    })}

                    <button 
                      type="button"
                      onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={page === totalPages}
                      className="btn btn-secondary btn-sm"
                      style={{ fontWeight: 700 }}
                    >
                      Next <FaChevronRight size={11} />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* ====================================================
          7. MOBILE FILTER DRAWER / MODAL
          ==================================================== */}
      {mobileFilterOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setMobileFilterOpen(false)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '380px',
              height: '100%',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.2)',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div 
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--slate-200)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                backgroundColor: '#ffffff',
                zIndex: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaFilter color="var(--primary)" size={16} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                  Filter Doctors
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close filters"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  color: 'var(--slate-500)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Drawer Body Form Fields */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flexGrow: 1 }}>
              {/* Specialty */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
                  Specialty
                </label>
                <select 
                  value={specialization}
                  onChange={(e) => { setSpecialization(e.target.value); setPage(1); }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-300)',
                    fontSize: '0.92rem'
                  }}
                >
                  <option value="">All Specialties</option>
                  {specializations.map((s) => {
                    const info = getSpecialtyInfo(s.name);
                    return (
                      <option key={s.id} value={s.name}>
                        {info.emoji} {info.layman} ({s.name})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Hospital */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
                  Hospital / Clinic
                </label>
                <select 
                  value={hospital}
                  onChange={(e) => { setHospital(e.target.value); setPage(1); }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-300)',
                    fontSize: '0.92rem'
                  }}
                >
                  <option value="">All Partner Hospitals</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.name}>{h.name}</option>
                  ))}
                </select>
              </div>

              {/* City / Area */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
                  City / Area
                </label>
                <select 
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); setPage(1); }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-300)',
                    fontSize: '0.92rem'
                  }}
                >
                  <option value="">All Cities / Areas</option>
                  {availableLocations.map((loc, idx) => (
                    <option key={idx} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Experience */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
                  Experience
                </label>
                <select 
                  value={minExp}
                  onChange={(e) => { setMinExp(e.target.value); setPage(1); }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-300)',
                    fontSize: '0.92rem'
                  }}
                >
                  <option value="">Any Experience</option>
                  <option value="5">5+ Years Experience</option>
                  <option value="10">10+ Years Experience</option>
                  <option value="15">15+ Years Experience</option>
                </select>
              </div>

              {/* Min Consultation Fee */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
                  Min Consultation Fee
                </label>
                <select 
                  value={minFee}
                  onChange={(e) => { setMinFee(e.target.value); setPage(1); }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-300)',
                    fontSize: '0.92rem'
                  }}
                >
                  <option value="">Any Min Fee</option>
                  <option value="500">₹500 and above</option>
                  <option value="800">₹800 and above</option>
                  <option value="1000">₹1,000 and above</option>
                </select>
              </div>

              {/* Max Consultation Fee */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
                  Max Consultation Fee
                </label>
                <select 
                  value={maxFee}
                  onChange={(e) => { setMaxFee(e.target.value); setPage(1); }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-300)',
                    fontSize: '0.92rem'
                  }}
                >
                  <option value="">Any Max Fee</option>
                  <option value="500">Up to ₹500</option>
                  <option value="800">Up to ₹800</option>
                  <option value="1000">Up to ₹1,000</option>
                  <option value="1500">Up to ₹1,500</option>
                </select>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div 
              style={{
                padding: '1.25rem 1.5rem',
                borderTop: '1px solid var(--slate-200)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                backgroundColor: '#ffffff'
              }}
            >
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }}
              >
                Clear Filters
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontWeight: 800 }}
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 960px) {
          .doctors-layout-grid {
            grid-template-columns: 1fr !important;
          }
          .filter-panel-desktop {
            display: none !important;
          }
          .mobile-filter-strip {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Doctors;
