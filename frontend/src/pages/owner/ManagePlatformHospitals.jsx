import React, { useState, useEffect, useCallback } from 'react';
import {
  FaHospital,
  FaPlusCircle,
  FaSearch,
  FaMapMarkerAlt,
  FaUserShield,
  FaCheckCircle,
  FaTimes,
  FaCopy,
  FaExclamationTriangle
} from 'react-icons/fa';
import { hospitalService } from '../../services/hospitalService';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/common/Button';

export const ManagePlatformHospitals = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [cities, setCities] = useState([]);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailsHospital, setDetailsHospital] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Telangana');
  const [emergencyNumber, setEmergencyNumber] = useState('108');
  const [phone, setPhone] = useState('');
  const [facilities, setFacilities] = useState('ICU, Emergency, 24/7 Pharmacy, Ambulance, Diagnostics');
  const [workingHours, setWorkingHours] = useState('24 Hours / 7 Days');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('Hospital Super Administrator');

  // Creation Response State
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdResult, setCreatedResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchHospitals = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (cityFilter.trim()) params.city = cityFilter.trim();

      const res = await hospitalService.getHospitals(params);
      if (res.success && Array.isArray(res.hospitals)) {
        setHospitals(res.hospitals);
        if (Array.isArray(res.cities)) {
          setCities(res.cities);
        }
      } else {
        setError(res.message || 'Unable to load hospitals.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch hospital directory from backend.'));
    } finally {
      setLoading(false);
    }
  }, [search, cityFilter]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  const handleOpenCreateModal = () => {
    setCreateError('');
    setCreatedResult(null);
    setCopiedLink(false);
    setName('');
    setAddress('');
    setCity('');
    setState('Telangana');
    setEmergencyNumber('108');
    setPhone('');
    setAdminEmail('');
    setAdminName('Hospital Super Administrator');
    setIsCreateModalOpen(true);
  };

  const handleCreateHospital = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!name.trim() || !address.trim() || !city.trim() || !emergencyNumber.trim() || !adminEmail.trim()) {
      setCreateError('Hospital name, address, city, emergency number, and admin email are required.');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        emergency_number: emergencyNumber.trim(),
        phone: phone.trim() || emergencyNumber.trim(),
        facilities: facilities.trim(),
        working_hours: workingHours.trim(),
        admin_email: adminEmail.trim().toLowerCase(),
        admin_name: adminName.trim()
      };

      const res = await hospitalService.createPlatformHospital(payload);
      if (res.success) {
        setCreatedResult(res);
        fetchHospitals();
      } else {
        setCreateError(res.message || 'Hospital creation failed.');
      }
    } catch (err) {
      setCreateError(getApiErrorMessage(err, 'Unable to create hospital and invite admin.'));
    } finally {
      setCreating(false);
    }
  };

  const handleCopyInviteLink = (inviteLink) => {
    if (!inviteLink) return;
    const fullUrl = `${window.location.origin}${inviteLink}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        borderBottom: '1px solid var(--slate-200)',
        paddingBottom: '1.25rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
            Hospital Management
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '0.25rem', marginBottom: 0 }}>
            Onboard new hospital branches and configure initial Super Admin authority
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenCreateModal}
          icon={<FaPlusCircle aria-hidden="true" />}
        >
          Onboard New Hospital
        </Button>
      </div>

      {/* Search & Filters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--slate-200)'
      }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
          <input
            type="text"
            placeholder="Search hospitals by name, city, or facilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>

        <div style={{ minWidth: '160px' }}>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="form-input"
          >
            <option value="">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {(search || cityFilter) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setSearch(''); setCityFilter(''); }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="card" style={{ padding: '1.5rem', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--emergency)' }}>
            <FaExclamationTriangle />
            <span style={{ fontWeight: 600 }}>{error}</span>
          </div>
        </div>
      )}

      {/* Hospital Cards Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '200px', borderRadius: '12px' }} />
          ))}
        </div>
      ) : hospitals.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <FaHospital size={44} color="var(--slate-300)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>No Hospitals Found</h3>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            {search || cityFilter ? 'Try clearing your search terms.' : 'Click "Onboard New Hospital" above to add the first branch.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {hospitals.map((hosp) => (
            <div
              key={hosp.id}
              className="card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                    {hosp.name}
                  </h3>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: 'var(--primary-ultralight)',
                    color: 'var(--primary-dark)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '12px',
                    flexShrink: 0
                  }}>
                    ID #{hosp.id}
                  </span>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }}>
                  <FaMapMarkerAlt /> {hosp.city}, {hosp.state}
                </p>

                <p style={{ fontSize: '0.85rem', color: 'var(--slate-700)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  {hosp.address}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
                  {(Array.isArray(hosp.facilities) ? hosp.facilities : (typeof hosp.facilities === 'string' ? hosp.facilities.split(',') : [])).slice(0, 3).map((f, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.72rem',
                        backgroundColor: 'var(--slate-100)',
                        color: 'var(--slate-700)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px'
                      }}
                    >
                      {(typeof f === 'string' ? f.trim() : f)}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{
                borderTop: '1px solid var(--slate-100)',
                paddingTop: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: 'var(--slate-500)'
              }}>
                <span>Emergency: <strong>{hosp.emergency_number}</strong></span>
                <button
                  type="button"
                  onClick={() => setDetailsHospital(hosp)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.82rem'
                  }}
                >
                  View Details &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hospital Details Modal */}
      {detailsHospital && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '1rem'
          }}
        >
          <div className="card" style={{ maxWidth: '560px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                  {detailsHospital.name}
                </h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                  Hospital Reference: #{detailsHospital.id} &bull; Slug: {detailsHospital.slug}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailsHospital(null)}
                style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}
                aria-label="Close dialog"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.75rem 1rem', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Address:</span>
              <span style={{ color: 'var(--slate-800)' }}>{detailsHospital.address}</span>

              <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Location:</span>
              <span style={{ color: 'var(--slate-800)' }}>{detailsHospital.city}, {detailsHospital.state}</span>

              <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Emergency:</span>
              <span style={{ color: 'var(--emergency)', fontWeight: 700 }}>{detailsHospital.emergency_number}</span>

              <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Phone:</span>
              <span style={{ color: 'var(--slate-800)' }}>{detailsHospital.phone || 'N/A'}</span>

              <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Hours:</span>
              <span style={{ color: 'var(--slate-800)' }}>{detailsHospital.working_hours || '24/7'}</span>

              <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Facilities:</span>
              <span style={{ color: 'var(--slate-800)' }}>{Array.isArray(detailsHospital.facilities) ? detailsHospital.facilities.join(', ') : (detailsHospital.facilities || 'Standard Care')}</span>
            </div>

            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setDetailsHospital(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Onboard New Hospital Modal */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '1rem'
          }}
        >
          <div className="card" style={{ maxWidth: '640px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                  Onboard Hospital & Invite Super Admin
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', margin: '0.2rem 0 0' }}>
                  Provisions a new hospital entity and creates its initial Super Admin invitation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}
                aria-label="Close dialog"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {createdResult ? (
              /* Success Result View with Invitation Link */
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  fontSize: '1.75rem'
                }}>
                  <FaCheckCircle />
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
                  Hospital Successfully Provisioned!
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Hospital <strong>{createdResult.hospital?.name}</strong> has been registered. The cryptographic Super Admin invitation token has been generated.
                </p>

                {createdResult.invitation?.invite_link && (
                  <div style={{
                    backgroundColor: 'var(--slate-50)',
                    border: '1px solid var(--slate-200)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    textAlign: 'left',
                    marginBottom: '1.5rem'
                  }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)', fontWeight: 700, display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Single-Use Invitation Activation Link:
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}${createdResult.invitation.invite_link}`}
                        className="form-input"
                        style={{ fontSize: '0.82rem', backgroundColor: 'white' }}
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleCopyInviteLink(createdResult.invitation.invite_link)}
                        icon={<FaCopy aria-hidden="true" />}
                      >
                        {copiedLink ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.5rem', marginBottom: 0 }}>
                      ⚠️ Send this link to <strong>{createdResult.invitation.email}</strong>. Stored only as SHA-256 hash in the database.
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Done
                </Button>
              </div>
            ) : (
              /* Create Form */
              <form onSubmit={handleCreateHospital}>
                {createError && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--emergency-light)',
                    color: 'var(--emergency)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '1.25rem'
                  }}>
                    {createError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Hospital Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Care City Hospital"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Street Address *</label>
                    <input
                      type="text"
                      placeholder="e.g. Road No. 2, Banjara Hills"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input
                      type="text"
                      placeholder="e.g. Hyderabad"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input
                      type="text"
                      placeholder="e.g. Telangana"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Emergency Number *</label>
                    <input
                      type="text"
                      placeholder="108 or +91 40 12345678"
                      value={emergencyNumber}
                      onChange={(e) => setEmergencyNumber(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">General Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+91 40 87654321"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Facilities Available</label>
                    <input
                      type="text"
                      placeholder="ICU, Emergency, Ambulance, Pharmacy, Radiology"
                      value={facilities}
                      onChange={(e) => setFacilities(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Initial Super Admin Section */}
                <div style={{
                  marginTop: '1.25rem',
                  padding: '1rem',
                  backgroundColor: 'var(--slate-50)',
                  border: '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <FaUserShield color="var(--primary)" />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-800)' }}>
                      Initial Hospital Super Administrator *
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Admin Full Name</label>
                      <input
                        type="text"
                        placeholder="Dr. Admin Name"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Admin Email Address *</label>
                      <input
                        type="email"
                        placeholder="admin@hospital.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        required
                        className="form-input"
                      />
                    </div>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                    A single-use cryptographic invitation will be generated for this email.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={creating}
                  >
                    Create Hospital & Generate Invite
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePlatformHospitals;
