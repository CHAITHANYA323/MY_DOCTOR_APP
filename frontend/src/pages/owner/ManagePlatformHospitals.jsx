import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FaHospital,
  FaPlusCircle,
  FaSearch,
  FaMapMarkerAlt,
  FaUserShield,
  FaCheckCircle,
  FaTimes,
  FaCopy,
  FaExclamationTriangle,
  FaBan,
  FaCheck,
  FaClipboardList,
  FaInfoCircle,
  FaPhoneAlt
} from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import { hospitalService } from '../../services/hospitalService';
import { approvalService } from '../../services/approvalService';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/common/Button';

const DUMMY_HOSPITAL_PATTERNS = [
  'reliability general hospital',
  'rate limit hospital',
  'hospital alpha',
  'hospital beta'
];

export const ManagePlatformHospitals = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('HOSPITALS'); // 'HOSPITALS' | 'REQUESTS'
  const [hospitals, setHospitals] = useState([]);
  const [onboardingRequests, setOnboardingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');

  // Onboarding Request Actions State
  const [processingReqId, setProcessingReqId] = useState(null);
  const [approveModalReq, setApproveModalReq] = useState(null);
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectModalError, setRejectModalError] = useState('');
  const [rejecting, setRejecting] = useState(false);

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
    setActionError('');
    try {
      const [hospRes, reqRes] = await Promise.all([
        hospitalService.getHospitals({ limit: 100 }),
        approvalService.getPlatformApprovals('pending').catch(() => ({ success: false, requests: [] }))
      ]);

      if (hospRes.success && Array.isArray(hospRes.hospitals)) {
        const filtered = hospRes.hospitals.filter(
          (h) => !DUMMY_HOSPITAL_PATTERNS.some((p) => h.name?.toLowerCase().includes(p) || h.slug?.toLowerCase().includes(p.replace(/ /g, '-')))
        );
        setHospitals(filtered);
      } else {
        setError(hospRes.message || 'Unable to load hospitals.');
      }

      if (reqRes.success && Array.isArray(reqRes.requests)) {
        setOnboardingRequests(reqRes.requests);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch hospital records from backend.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  // Derived cities based on state filter
  const availableCities = useMemo(() => {
    const set = new Set();
    hospitals.forEach((h) => {
      if (h.city) {
        if (stateFilter === 'ALL' || (h.state && h.state.toLowerCase() === stateFilter.toLowerCase())) {
          set.add(h.city.trim());
        }
      }
    });
    return Array.from(set).sort();
  }, [hospitals, stateFilter]);

  // Filtered hospitals
  const filteredHospitals = useMemo(() => {
    return hospitals.filter((h) => {
      const matchState = stateFilter === 'ALL' || (h.state && h.state.toLowerCase() === stateFilter.toLowerCase());
      const matchCity = cityFilter === 'ALL' || (h.city && h.city.toLowerCase() === cityFilter.toLowerCase());
      const matchSearch = !search.trim() ||
        h.name?.toLowerCase().includes(search.toLowerCase()) ||
        h.address?.toLowerCase().includes(search.toLowerCase()) ||
        (typeof h.facilities === 'string' && h.facilities.toLowerCase().includes(search.toLowerCase()));
      return matchState && matchCity && matchSearch;
    });
  }, [hospitals, stateFilter, cityFilter, search]);

  const handleApproveOnboardingRequest = async (req) => {
    if (!req?.id) return;
    setProcessingReqId(req.id);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await approvalService.approveSuperAdminRequest(req.id, {});
      if (res.success) {
        const hospName = res.hospital?.name || req.parsed_notes?.hospital_name || 'Hospital';
        setActionSuccess(`Hospital "${hospName}" provisioned successfully and Super Admin authority granted to ${req.name}.`);
        await fetchHospitals();
      } else {
        setActionError(res.message || 'Failed to approve hospital onboarding request.');
      }
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Unable to approve hospital onboarding request.'));
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleOpenRejectModal = (req) => {
    setRejectModalReq(req);
    setRejectReason('');
    setRejectModalError('');
  };

  const handleConfirmRejectRequest = async (e) => {
    e.preventDefault();
    if (!rejectModalReq) return;
    if (!rejectReason.trim()) {
      setRejectModalError('Please specify the reason for rejecting this hospital onboarding request.');
      return;
    }

    setRejecting(true);
    setRejectModalError('');
    setActionError('');
    setActionSuccess('');

    try {
      const res = await approvalService.rejectSuperAdminRequest(rejectModalReq.id, rejectReason.trim());
      if (res.success) {
        setActionSuccess(`Hospital onboarding request for ${rejectModalReq.name} has been rejected.`);
        setRejectModalReq(null);
        await fetchHospitals();
      } else {
        setRejectModalError(res.message || 'Failed to reject request.');
      }
    } catch (err) {
      setRejectModalError(getApiErrorMessage(err, 'Unable to reject onboarding request.'));
    } finally {
      setRejecting(false);
    }
  };

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
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '1.25rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            {t('ownerPortal.hospitals.title')}
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
            {t('ownerPortal.hospitals.subtitle')}
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenCreateModal}
          icon={<FaPlusCircle aria-hidden="true" />}
        >
          {t('ownerPortal.hospitals.btnOnboard')}
        </Button>
      </div>

      {/* Guidance Banner */}
      <div style={{
        padding: '1.1rem 1.25rem',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <FaInfoCircle color="#0284c7" size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0369a1', display: 'block' }}>
            {t('ownerPortal.hospitals.guidanceTitle')}
          </span>
          <span style={{ fontSize: '0.82rem', color: '#0c4a6e', lineHeight: 1.5, display: 'block', marginTop: '0.25rem' }}>
            {t('ownerPortal.hospitals.guidanceText')}
          </span>
        </div>
      </div>

      {/* Action Success / Error Notifications */}
      {actionSuccess && (
        <div style={{
          padding: '0.85rem 1rem',
          backgroundColor: '#ecfdf5',
          color: '#065f46',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          border: '1px solid #a7f3d0'
        }}>
          <FaCheckCircle />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div style={{
          padding: '0.85rem 1rem',
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          border: '1px solid #fecaca'
        }}>
          <FaExclamationTriangle />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        backgroundColor: 'white',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('HOSPITALS')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'HOSPITALS' ? '#0284c7' : '#f1f5f9',
            color: activeTab === 'HOSPITALS' ? 'white' : '#334155',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <FaHospital />
          <span>{t('ownerPortal.hospitals.tabActive')} ({hospitals.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REQUESTS')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'REQUESTS' ? '#0284c7' : '#f1f5f9',
            color: activeTab === 'REQUESTS' ? 'white' : '#334155',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FaClipboardList />
          <span>{t('ownerPortal.hospitals.tabRequests')}</span>
          {onboardingRequests.length > 0 && (
            <span style={{
              backgroundColor: activeTab === 'REQUESTS' ? 'white' : '#ea580c',
              color: activeTab === 'REQUESTS' ? '#0284c7' : 'white',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '10px'
            }}>
              {onboardingRequests.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'HOSPITALS' ? (
        <>
          {/* Search, State & City Filters */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder={t('ownerPortal.hospitals.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>

            <div style={{ minWidth: '150px' }}>
              <select
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value);
                  setCityFilter('ALL');
                }}
                className="form-input"
              >
                <option value="ALL">{t('ownerPortal.hospitals.allStates')}</option>
                <option value="Telangana">Telangana</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
              </select>
            </div>

            <div style={{ minWidth: '150px' }}>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="form-input"
              >
                <option value="ALL">{t('ownerPortal.hospitals.allCities')}</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {(search || stateFilter !== 'ALL' || cityFilter !== 'ALL') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setSearch(''); setStateFilter('ALL'); setCityFilter('ALL'); }}
              >
                {t('ownerPortal.hospitals.clearFilters')}
              </Button>
            )}
          </div>

          {/* Error state */}
          {error && (
            <div className="card" style={{ padding: '1.5rem', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#dc2626' }}>
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
          ) : filteredHospitals.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <FaHospital size={44} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                {t('ownerPortal.hospitals.noHospitals')}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.25rem' }}>
                {search || stateFilter !== 'ALL' || cityFilter !== 'ALL'
                  ? 'Try clearing your filters.'
                  : 'Click "Add New Hospital" above to onboard the first institution.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {filteredHospitals.map((hosp) => (
                <div
                  key={hosp.id}
                  className="card"
                  style={{
                    padding: '1.35rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {hosp.name}
                      </h3>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        flexShrink: 0
                      }}>
                        ID #{hosp.id}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }}>
                      <FaMapMarkerAlt color="#0284c7" /> {hosp.city}, {hosp.state}
                    </p>

                    <p style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.5, marginBottom: '0.85rem' }}>
                      {hosp.address}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
                      {(Array.isArray(hosp.facilities) ? hosp.facilities : (typeof hosp.facilities === 'string' ? hosp.facilities.split(',') : [])).slice(0, 3).map((f, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '0.72rem',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
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
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    color: '#64748b'
                  }}>
                    <span>{t('ownerPortal.hospitals.emergencyLabel')} <strong style={{ color: '#dc2626' }}>{hosp.emergency_number}</strong></span>
                    <button
                      type="button"
                      onClick={() => setDetailsHospital(hosp)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284c7',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.82rem'
                      }}
                    >
                      {t('ownerPortal.hospitals.viewDetails')} &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Onboarding Requests Tab */
        onboardingRequests.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <FaClipboardList size={44} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              {t('ownerPortal.hospitals.noRequests')}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.25rem' }}>
              When hospital leaders submit onboarding requests through the registration portal, they will appear here for verification and automated provisioning.
            </p>
          </div>
        ) : (
          <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t('ownerPortal.hospitals.colApplicant')}</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t('ownerPortal.hospitals.colHospital')}</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t('ownerPortal.hospitals.colContact')}</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t('ownerPortal.hospitals.colDate')}</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>{t('ownerPortal.hospitals.colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {onboardingRequests.map((req) => {
                  const notes = req.parsed_notes || {};
                  const isProcessing = processingReqId === req.id;

                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{req.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>{req.email}</div>
                        {req.phone && (
                          <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{req.phone}</div>
                        )}
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: '#ffedd5',
                          color: '#c2410c',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '10px',
                          display: 'inline-block',
                          marginTop: '0.25rem'
                        }}>
                          SUPER ADMIN APPLICANT
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                          {notes.hospital_name || 'Proposed Hospital'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#475569', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                          <FaMapMarkerAlt size={12} color="#0284c7" />
                          <span>{notes.hospital_city || 'City N/A'}, {notes.hospital_state || 'Telangana'}</span>
                        </div>
                        {notes.hospital_address && (
                          <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.15rem' }}>
                            {notes.hospital_address}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                          Emergency: <strong style={{ color: '#dc2626' }}>{notes.emergency_number || '108'}</strong>
                        </div>
                        {notes.hospital_phone && (
                          <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                            Desk: {notes.hospital_phone}
                          </div>
                        )}
                        {notes.facilities && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.2rem' }}>
                            {notes.facilities.slice(0, 40)}...
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                        {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Recent'}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => setApproveModalReq(req)}
                            loading={isProcessing}
                            style={{
                              backgroundColor: '#059669',
                              borderColor: '#059669',
                              fontSize: '0.74rem',
                              padding: '0.25rem 0.65rem'
                            }}
                            icon={<FaCheck aria-hidden="true" />}
                          >
                            {t('ownerPortal.hospitals.btnApprove')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRejectModal(req)}
                            disabled={isProcessing}
                            style={{
                              color: '#dc2626',
                              borderColor: '#fecaca',
                              fontSize: '0.74rem',
                              padding: '0.25rem 0.65rem'
                            }}
                            icon={<FaBan aria-hidden="true" />}
                          >
                            {t('ownerPortal.hospitals.btnReject')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
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
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {detailsHospital.name}
                </h2>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Hospital Reference: #{detailsHospital.id} &bull; Slug: {detailsHospital.slug}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailsHospital(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                aria-label="Close dialog"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.75rem 1rem', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Address:</span>
              <span style={{ color: '#0f172a' }}>{detailsHospital.address}</span>

              <span style={{ color: '#64748b', fontWeight: 600 }}>Location:</span>
              <span style={{ color: '#0f172a' }}>{detailsHospital.city}, {detailsHospital.state}</span>

              <span style={{ color: '#64748b', fontWeight: 600 }}>Emergency:</span>
              <span style={{ color: '#dc2626', fontWeight: 700 }}>{detailsHospital.emergency_number}</span>

              <span style={{ color: '#64748b', fontWeight: 600 }}>Phone:</span>
              <span style={{ color: '#0f172a' }}>{detailsHospital.phone || 'N/A'}</span>

              <span style={{ color: '#64748b', fontWeight: 600 }}>Hours:</span>
              <span style={{ color: '#0f172a' }}>{detailsHospital.working_hours || '24/7'}</span>

              <span style={{ color: '#64748b', fontWeight: 600 }}>Facilities:</span>
              <span style={{ color: '#0f172a' }}>{Array.isArray(detailsHospital.facilities) ? detailsHospital.facilities.join(', ') : (detailsHospital.facilities || 'Standard Care')}</span>
            </div>

            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setDetailsHospital(null)}
            >
              {t('ownerPortal.hospitals.modalClose')}
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
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {t('ownerPortal.hospitals.btnOnboard')}
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0' }}>
                  Register a verified hospital and create its initial Super Admin invitation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
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
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  fontSize: '1.75rem'
                }}>
                  <FaCheckCircle />
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Hospital Successfully Provisioned!
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Hospital <strong>{createdResult.hospital?.name}</strong> has been registered. The cryptographic Super Admin invitation token has been generated.
                </p>

                {createdResult.invitation?.invite_link && (
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'left',
                    marginBottom: '1.5rem'
                  }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
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
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', marginBottom: 0 }}>
                      Send this link to <strong>{createdResult.invitation.email}</strong>. Stored only as SHA-256 hash in the database.
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  {t('ownerPortal.hospitals.modalClose')}
                </Button>
              </div>
            ) : (
              /* Create Form */
              <form onSubmit={handleCreateHospital}>
                {createError && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '1.25rem',
                    border: '1px solid #fecaca'
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
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                      className="form-input"
                    >
                      <option value="Telangana">Telangana</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                    </select>
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
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <FaUserShield color="#0284c7" />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
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
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
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

      {/* Reject Onboarding Request Modal */}
      {rejectModalReq && (
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
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaBan />
                  <span>{t('ownerPortal.hospitals.confirmRejectTitle')}</span>
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                  Proposed Hospital: <strong>{rejectModalReq.parsed_notes?.hospital_name || 'Hospital'}</strong>
                </p>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.1rem 0 0' }}>
                  Applicant: {rejectModalReq.name} ({rejectModalReq.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                aria-label="Close dialog"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: '#92400e',
              lineHeight: 1.5,
              marginBottom: '1.25rem'
            }}>
              Rejecting this request will mark the applicant account as <strong>REJECTED</strong> and decline provisioning of the proposed hospital branch.
            </div>

            {rejectModalError && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1rem'
              }}>
                {rejectModalError}
              </div>
            )}

            <form onSubmit={handleConfirmRejectRequest}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Institutional Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Hospital regulatory license could not be validated."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                  className="form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectModalReq(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  loading={rejecting}
                >
                  {t('ownerPortal.hospitals.btnReject')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Hospital Onboarding Approval */}
      {approveModalReq && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '1rem',
            backdropFilter: 'blur(3px)'
          }}
        >
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '1.75rem', backgroundColor: '#ffffff', borderRadius: '14px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaCheckCircle size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {t('ownerPortal.hospitals.confirmApproveTitle')}
                </h3>
                <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Hospital Credentialing Governance</span>
              </div>
            </div>

            <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              {t('ownerPortal.hospitals.confirmApproveText')}
            </p>

            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.5rem',
              fontSize: '0.84rem'
            }}>
              <div style={{ marginBottom: '0.25rem' }}>
                <strong>Hospital Name:</strong> {approveModalReq.parsed_notes?.hospital_name || 'Proposed Hospital'}
              </div>
              <div style={{ marginBottom: '0.25rem' }}>
                <strong>Location:</strong> {approveModalReq.parsed_notes?.hospital_city || 'City N/A'}, {approveModalReq.parsed_notes?.hospital_state || 'Telangana'}
              </div>
              <div>
                <strong>Super Admin:</strong> {approveModalReq.name} ({approveModalReq.email})
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setApproveModalReq(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                onClick={async () => {
                  const req = approveModalReq;
                  setApproveModalReq(null);
                  await handleApproveOnboardingRequest(req);
                }}
              >
                {t('ownerPortal.hospitals.btnApprove')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePlatformHospitals;
