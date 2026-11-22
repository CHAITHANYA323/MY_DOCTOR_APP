import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  FaUserTie,
  FaHospital,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExchangeAlt,
  FaHistory,
  FaSearch,
  FaFilter,
  FaExclamationTriangle,
  FaCheck,
  FaBan,
  FaArrowRight,
  FaEnvelope,
  FaPhoneAlt,
  FaInfoCircle
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ecosystemService } from '../../services/ecosystemService';
import { Button } from '../../components/common/Button';

export const ManageHospitalAdmins = () => {
  const { user } = useAuth();
  const { t, isTelugu } = useLanguage();
  const outletCtx = useOutletContext() || {};
  const { selectedHospitalId, assignedHospitals = [] } = outletCtx;

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'PRIMARY' | 'PENDING'
  const [admins, setAdmins] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [filterHospital, setFilterHospital] = useState(selectedHospitalId || 'ALL');

  // Replace Primary Admin Modal
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [targetHospital, setTargetHospital] = useState(null);
  const [newPrimaryAdminId, setNewPrimaryAdminId] = useState('');
  const [replacementReason, setReplacementReason] = useState('');
  const [replacing, setReplacing] = useState(false);

  // History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyHospital, setHistoryHospital] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Action states
  const [processingId, setProcessingId] = useState(null);

  const fetchAdminsData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const hospId = filterHospital !== 'ALL' ? filterHospital : (selectedHospitalId || null);
      const [adminsRes, pendingRes] = await Promise.all([
        ecosystemService.getSuperadminHospitalAdmins(hospId, 'all').catch(() => ({ success: false, admins: [] })),
        ecosystemService.getSuperadminHospitalAdmins(hospId, 'pending').catch(() => ({ success: false, admins: [] }))
      ]);

      if (adminsRes.success && Array.isArray(adminsRes.admins)) {
        setAdmins(adminsRes.admins);
      }
      if (pendingRes.success && Array.isArray(pendingRes.admins)) {
        setPendingRequests(pendingRes.admins);
      }
    } catch (err) {
      console.error('Failed to fetch hospital admins:', err);
      setError(isTelugu ? 'ఆసుపత్రి నిర్వాహకుల వివరాలను పొందడం సాధ్యం కాలేదు.' : 'Failed to fetch hospital administrator records.');
    } finally {
      setLoading(false);
    }
  }, [filterHospital, selectedHospitalId, isTelugu]);

  useEffect(() => {
    fetchAdminsData();
  }, [fetchAdminsData]);

  // Synchronize when selectedHospitalId changes from layout header
  useEffect(() => {
    if (selectedHospitalId) {
      setFilterHospital(selectedHospitalId);
    }
  }, [selectedHospitalId]);

  const handleApprove = async (adminId) => {
    setProcessingId(adminId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await ecosystemService.approveHospitalAdmin(adminId);
      if (res.success) {
        setSuccessMsg(isTelugu ? 'నిర్వాహకుడి నమోదు విజయవంతంగా ఆమోదించబడింది.' : 'Hospital administrator successfully approved.');
        await fetchAdminsData();
      } else {
        setError(res.message || 'Approval failed.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error approving administrator.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (adminId) => {
    const reason = window.prompt(
      isTelugu ? 'దయచేసి తిరస్కరణ కారణాన్ని నమోదు చేయండి:' : 'Please enter rejection reason:'
    );
    if (!reason || !reason.trim()) return;

    setProcessingId(adminId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await ecosystemService.rejectHospitalAdmin(adminId, reason.trim());
      if (res.success) {
        setSuccessMsg(isTelugu ? 'నమోదు అభ్యర్థన తిరస్కరించబడింది.' : 'Registration request rejected.');
        await fetchAdminsData();
      } else {
        setError(res.message || 'Rejection failed.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error rejecting administrator.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleStatus = async (admin) => {
    const newStatus = !admin.is_active;
    const confirmText = newStatus
      ? (isTelugu ? `${admin.name} ఖాతాను పునరుద్ధరించాలా?` : `Reactivate account for ${admin.name}?`)
      : (isTelugu ? `${admin.name} ఖాతాను నిలిపివేయాలా?` : `Suspend account for ${admin.name}?`);

    if (!window.confirm(confirmText)) return;

    setProcessingId(admin.id);
    setError('');
    setSuccessMsg('');
    try {
      const res = await ecosystemService.updateHospitalAdminStatus(admin.id, newStatus);
      if (res.success) {
        setSuccessMsg(isTelugu ? 'ఖాతా స్థితి నవీకరించబడింది.' : 'Administrator status updated.');
        await fetchAdminsData();
      } else {
        setError(res.message || 'Status update failed.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update administrator status.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReplaceModal = (hosp) => {
    setTargetHospital(hosp);
    setNewPrimaryAdminId('');
    setReplacementReason('');
    setReplaceModalOpen(true);
  };

  const handleConfirmReplace = async (e) => {
    e.preventDefault();
    if (!targetHospital?.id || !newPrimaryAdminId || !replacementReason.trim()) {
      alert(isTelugu ? 'దయచేసి కొత్త అడ్మిన్‌ను ఎంచుకుని, కారణాన్ని నమోదు చేయండి.' : 'Please select new primary admin and provide replacement reason.');
      return;
    }

    setReplacing(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await ecosystemService.replacePrimaryHospitalAdmin(
        targetHospital.id,
        parseInt(newPrimaryAdminId, 10),
        replacementReason.trim()
      );
      if (res.success) {
        setSuccessMsg(isTelugu ? 'ప్రధాన ఆసుపత్రి నిర్వాహకుడు విజయవంతంగా మార్చబడ్డారు.' : 'Primary Hospital Administrator successfully replaced.');
        setReplaceModalOpen(false);
        await fetchAdminsData();
      } else {
        setError(res.message || 'Replacement failed.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to replace primary administrator.');
    } finally {
      setReplacing(false);
    }
  };

  const handleOpenHistoryModal = async (hosp) => {
    setHistoryHospital(hosp);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    setHistoryRecords([]);
    try {
      const res = await ecosystemService.getHospitalAdminHistory(hosp.id);
      if (res.success) {
        setHistoryRecords(res.history || []);
      }
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filtered lists
  const filteredAdmins = useMemo(() => {
    let list = admins;
    if (activeTab === 'PRIMARY') {
      list = list.filter((a) => a.is_primary);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        a.name?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.hospital_name?.toLowerCase().includes(q) ||
        a.phone?.includes(q)
      );
    }
    return list;
  }, [admins, activeTab, search]);

  const filteredPending = useMemo(() => {
    if (!search.trim()) return pendingRequests;
    const q = search.toLowerCase();
    return pendingRequests.filter((a) =>
      a.name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.hospital_name?.toLowerCase().includes(q) ||
      a.phone?.includes(q)
    );
  }, [pendingRequests, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        backgroundColor: '#ffffff',
        padding: '1.5rem',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem'
            }}>
              <FaUserTie />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {isTelugu ? 'ఆసుపత్రి నిర్వాహకుల పర్యవేక్షణ' : 'Hospital Administrators Oversight'}
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
            {isTelugu
              ? 'మీ పర్యవేక్షణలోని ఆసుపత్రుల ప్రధాన నిర్వాహకులను నియమించండి, కొత్త అభ్యర్థనలను ఆమోదించండి మరియు కార్యకలాపాలను ట్రాక్ చేయండి.'
              : 'Govern primary hospital administrators across your assigned institutions, approve onboarding requests, and maintain institutional hierarchy.'}
          </p>
        </div>

        {/* Hospital Scope Filter */}
        {assignedHospitals.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaFilter size={13} color="#64748b" />
            <select
              value={filterHospital}
              onChange={(e) => setFilterHospital(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#1e293b',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="ALL">{isTelugu ? 'అన్ని కేటాయించబడిన ఆసుపత్రులు' : 'All Assigned Hospitals'} ({assignedHospitals.length})</option>
              {assignedHospitals.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Alert Messages */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          padding: '1rem',
          borderRadius: '10px',
          color: '#991b1b',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          padding: '1rem',
          borderRadius: '10px',
          color: '#166534',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <FaCheckCircle />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Assigned Hospitals Primary Admins Quick Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {assignedHospitals.map((h) => {
          const primary = h.primary_admin;
          return (
            <div
              key={h.id}
              style={{
                backgroundColor: '#ffffff',
                border: primary ? '1px solid #e2e8f0' : '1px solid #fbcfe8',
                borderRadius: '12px',
                padding: '1.25rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaHospital color="#0284c7" size={16} />
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{h.name}</span>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '12px',
                    backgroundColor: primary ? '#dcfce7' : '#fee2e2',
                    color: primary ? '#166534' : '#991b1b'
                  }}>
                    {primary ? (isTelugu ? 'ప్రధాన అడ్మిన్ ఉన్నారు' : 'Primary Admin Assigned') : (isTelugu ? 'అడ్మిన్ లేరు' : 'No Primary Admin')}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  📍 {h.city}, {h.state}
                </div>

                {primary ? (
                  <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                    fontSize: '0.82rem'
                  }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.2rem' }}>
                      👤 {primary.name}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span>✉️ {primary.email}</span>
                      {primary.phone && <span>📞 {primary.phone}</span>}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#fff1f2',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#9f1239'
                  }}>
                    ⚠️ {isTelugu ? 'ఈ ఆసుపత్రికి ప్రధాన నిర్వాహకుడు ఇంకా నియమించబడలేదు.' : 'This hospital does not have an active Primary Administrator.'}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleOpenReplaceModal(h)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#0284c7',
                    cursor: 'pointer'
                  }}
                >
                  <FaExchangeAlt size={10} />
                  <span>{primary ? (isTelugu ? 'మార్చండి' : 'Replace Admin') : (isTelugu ? 'నియమించండి' : 'Assign Admin')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenHistoryModal(h)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                  title={isTelugu ? 'నియామకాల చరిత్ర' : 'Assignment History'}
                >
                  <FaHistory size={10} />
                  <span>{isTelugu ? 'చరిత్ర' : 'History'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        backgroundColor: '#ffffff',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { id: 'ALL', label: isTelugu ? 'అన్ని అడ్మిన్ ఖాతాలు' : 'All Administrators', count: admins.length },
            { id: 'PRIMARY', label: isTelugu ? 'ప్రధాన అడ్మిన్లు' : 'Primary Admins', count: admins.filter(a => a.is_primary).length },
            { id: 'PENDING', label: isTelugu ? 'ఆమోదం కోసం వేచివున్నవి' : 'Pending Approvals', count: pendingRequests.length, highlight: pendingRequests.length > 0 }
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: active ? 700 : 600,
                  backgroundColor: active ? '#0284c7' : 'transparent',
                  color: active ? '#ffffff' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  backgroundColor: active ? 'rgba(255,255,255,0.25)' : (tab.highlight ? '#fee2e2' : '#f1f5f9'),
                  color: active ? '#ffffff' : (tab.highlight ? '#b91c1c' : '#475569')
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
          <FaSearch color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isTelugu ? 'పేరు, ఈమెయిల్, ఆసుపత్రి ద్వారా శోధించండి...' : 'Search admins by name, email, hospital...'}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem'
            }}
          />
        </div>
      </div>

      {/* Main Content Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          {isTelugu ? 'నిర్వాహకుల వివరాలు లోడ్ అవుతున్నాయి...' : 'Loading administrator records...'}
        </div>
      ) : activeTab === 'PENDING' ? (
        // Pending Approvals List
        filteredPending.length === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            color: '#64748b'
          }}>
            <FaCheckCircle color="#10b981" size={36} style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
              {isTelugu ? 'పెండింగ్ అభ్యర్థనలు ఏవీ లేవు' : 'No Pending Administrator Applications'}
            </h3>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              {isTelugu ? 'అన్ని ఆసుపత్రి నిర్వాహక నమోదు అభ్యర్థనలు పరిష్కరించబడ్డాయి.' : 'All hospital administrator applications have been reviewed.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredPending.map((applicant) => (
              <div
                key={applicant.id}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '1px solid #fef3c7',
                  borderLeft: '4px solid #f59e0b',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>{applicant.name}</span>
                    <span style={{
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 700
                    }}>
                      {isTelugu ? 'ఆమోదం కోసం వేచివుంది' : 'Pending Review'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span>🏥 {applicant.hospital_name || (isTelugu ? 'ఆసుపత్రి' : 'Hospital')}</span>
                    <span>✉️ {applicant.email}</span>
                    {applicant.phone && <span>📞 {applicant.phone}</span>}
                    <span>📅 {new Date(applicant.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleApprove(applicant.id)}
                    disabled={processingId === applicant.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <FaCheck size={11} />
                    <span>{isTelugu ? 'ఆమోదించండి' : 'Approve'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(applicant.id)}
                    disabled={processingId === applicant.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '6px',
                      border: '1px solid #fca5a5',
                      backgroundColor: '#ffffff',
                      color: '#dc2626',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <FaBan size={11} />
                    <span>{isTelugu ? 'తిరస్కరించండి' : 'Reject'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Administrators Table
        filteredAdmins.length === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            color: '#64748b'
          }}>
            <FaUserTie color="#94a3b8" size={36} style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
              {isTelugu ? 'నిర్వాహకులు కనుగొనబడలేదు' : 'No Administrators Found'}
            </h3>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              {isTelugu ? 'ఎంచుకున్న ఫిల్టర్‌లకు అనుగుణంగా ఏ నిర్వాహకుడి ఖాతాలు లేవు.' : 'No hospital administrator accounts match the selected filters.'}
            </p>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '0.85rem 1rem' }}>{isTelugu ? 'నిర్వాహకుడు' : 'Administrator'}</th>
                    <th style={{ padding: '0.85rem 1rem' }}>{isTelugu ? 'ఆసుపత్రి' : 'Hospital'}</th>
                    <th style={{ padding: '0.85rem 1rem' }}>{isTelugu ? 'హోదా' : 'Designation'}</th>
                    <th style={{ padding: '0.85rem 1rem' }}>{isTelugu ? 'పాత్ర' : 'Role Hierarchy'}</th>
                    <th style={{ padding: '0.85rem 1rem' }}>{isTelugu ? 'ఖాతా స్థితి' : 'Status'}</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>{isTelugu ? 'చర్యలు' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{admin.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{admin.email}</div>
                        {admin.phone && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{admin.phone}</div>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                        {admin.hospital_name || `Hospital #${admin.hospital_id}`}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                        {admin.designation || 'Hospital Administrator'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {admin.is_primary ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}>
                            ★ {isTelugu ? 'ప్రధాన అడ్మిన్' : 'Primary Admin'}
                          </span>
                        ) : (
                          <span style={{
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 600
                          }}>
                            {isTelugu ? 'సహాయక అడ్మిన్' : 'Secondary Admin'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: admin.is_active ? '#dcfce7' : '#fee2e2',
                          color: admin.is_active ? '#166534' : '#991b1b'
                        }}>
                          {admin.is_active ? (isTelugu ? 'యాక్టివ్' : 'Active') : (isTelugu ? 'నిలిపివేయబడింది' : 'Suspended')}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(admin)}
                          disabled={processingId === admin.id}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: admin.is_active ? '#fff1f2' : '#f0fdf4',
                            color: admin.is_active ? '#be123c' : '#15803d',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {admin.is_active ? (isTelugu ? 'నిలిపివేయి' : 'Suspend') : (isTelugu ? 'పునరుద్ధరించు' : 'Activate')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Replace Primary Administrator Modal */}
      {replaceModalOpen && targetHospital && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            maxWidth: '540px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaExchangeAlt />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {isTelugu ? 'ప్రధాన ఆసుపత్రి నిర్వాహకుడిని మార్చండి' : 'Replace Primary Hospital Administrator'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{targetHospital.name}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmReplace} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {targetHospital.primary_admin && (
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem'
                }}>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>
                    {isTelugu ? 'ప్రస్తుత ప్రధాన నిర్వాహకుడు:' : 'Current Primary Administrator:'}
                  </span>
                  <strong style={{ color: '#1e293b' }}>
                    {targetHospital.primary_admin.name} ({targetHospital.primary_admin.email})
                  </strong>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isTelugu ? 'కొత్త ప్రధాన నిర్వాహకుడిని ఎంచుకోండి:' : 'Select New Primary Administrator:'} *
                </label>
                <select
                  required
                  value={newPrimaryAdminId}
                  onChange={(e) => setNewPrimaryAdminId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="">{isTelugu ? '-- అడ్మిన్‌ను ఎంచుకోండి --' : '-- Select active admin --'}</option>
                  {admins
                    .filter((a) => a.hospital_id === targetHospital.id && a.is_active && !a.is_primary)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.email})
                      </option>
                    ))}
                </select>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  {isTelugu
                    ? 'ఈ ఆసుపత్రికి చెందిన క్రియాశీల నిర్వాహకులు మాత్రమే కనిపిస్తారు.'
                    : 'Only active registered administrators belonging to this hospital appear.'}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isTelugu ? 'భర్తీకి అధికారిక కారణం:' : 'Institutional Replacement Reason:'} *
                </label>
                <textarea
                  required
                  rows={3}
                  value={replacementReason}
                  onChange={(e) => setReplacementReason(e.target.value)}
                  placeholder={isTelugu ? 'ఉదాహరణ: పదోన్నతి, బదిలీ లేదా సంస్థాగత పునర్నిర్మాణం...' : 'e.g. Promotion, administrative transfer, or organizational restructuring...'}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setReplaceModalOpen(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isTelugu ? 'రద్దు చేయి' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={replacing}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {replacing ? (isTelugu ? 'మారుస్తున్నారు...' : 'Replacing...') : (isTelugu ? 'నియామకం పూర్తి చేయి' : 'Confirm Replacement')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment History Modal */}
      {historyModalOpen && historyHospital && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            maxWidth: '620px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaHistory color="#0284c7" size={18} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {isTelugu ? 'నిర్వాహకుల చరిత్ర' : 'Administrator Assignment History'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
              🏥 <strong>{historyHospital.name}</strong>
            </div>

            {loadingHistory ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                {isTelugu ? 'చరిత్ర లోడ్ అవుతోంది...' : 'Loading history records...'}
              </div>
            ) : historyRecords.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                {isTelugu ? 'ఈ ఆసుపత్రికి మునుపటి నియామక చరిత్ర నమోదు కాలేదు.' : 'No prior administrator replacement records logged for this hospital.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '380px', overflowY: 'auto' }}>
                {historyRecords.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: rec.is_primary ? '#f0fdf4' : '#ffffff',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <strong style={{ color: '#0f172a' }}>{rec.admin_name}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {rec.assigned_at ? new Date(rec.assigned_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div style={{ color: '#475569', fontSize: '0.75rem' }}>
                      {rec.admin_email} | {rec.designation || 'Administrator'}
                    </div>
                    {rec.notes?.reason && (
                      <div style={{ marginTop: '0.35rem', fontStyle: 'italic', color: '#64748b', fontSize: '0.74rem' }}>
                        Reason: {rec.notes.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageHospitalAdmins;
