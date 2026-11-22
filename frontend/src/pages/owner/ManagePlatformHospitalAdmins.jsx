import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUserTie,
  FaHospital,
  FaShieldAlt,
  FaExclamationTriangle,
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaExchangeAlt,
  FaArrowRight,
  FaInfoCircle
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ecosystemService } from '../../services/ecosystemService';
import { hospitalService } from '../../services/hospitalService';
import { Button } from '../../components/common/Button';

export const ManagePlatformHospitalAdmins = () => {
  const { user } = useAuth();
  const { t, isTelugu } = useLanguage();

  const [admins, setAdmins] = useState([]);
  const [hospitalsWithoutPrimary, setHospitalsWithoutPrimary] = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [primaryFilter, setPrimaryFilter] = useState('ALL'); // 'ALL' | 'PRIMARY' | 'SECONDARY'

  const [processingId, setProcessingId] = useState(null);

  const fetchPlatformAdmins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [adminsRes, hospRes] = await Promise.all([
        ecosystemService.getPlatformHospitalAdmins(),
        hospitalService.getHospitals({ limit: 100 }).catch(() => ({ success: false, hospitals: [] }))
      ]);

      if (adminsRes.success && Array.isArray(adminsRes.admins)) {
        setAdmins(adminsRes.admins);
        if (Array.isArray(adminsRes.hospitals_without_primary)) {
          setHospitalsWithoutPrimary(adminsRes.hospitals_without_primary);
        }
      }

      if (hospRes.success && Array.isArray(hospRes.hospitals)) {
        setAllHospitals(hospRes.hospitals);
      }
    } catch (err) {
      console.error('Failed to load platform hospital admins:', err);
      setError(isTelugu ? 'ఆసుపత్రి నిర్వాహకుల డైరెక్టరీ లోడ్ కాలేదు.' : 'Failed to fetch platform hospital administrators directory.');
    } finally {
      setLoading(false);
    }
  }, [isTelugu]);

  useEffect(() => {
    fetchPlatformAdmins();
  }, [fetchPlatformAdmins]);

  const handleToggleStatus = async (admin) => {
    const newStatus = !admin.is_active;
    const confirmMsg = newStatus
      ? (isTelugu ? `${admin.name} ఖాతాను తిరిగి ప్రారంభించాలా?` : `Reactivate administrator account for ${admin.name}?`)
      : (isTelugu ? `${admin.name} ఖాతాను నిలిపివేయాలా?` : `Suspend administrator account for ${admin.name}?`);

    if (!window.confirm(confirmMsg)) return;

    setProcessingId(admin.id);
    setError('');
    setSuccessMsg('');
    try {
      const res = await ecosystemService.updateHospitalAdminStatus(admin.id, newStatus);
      if (res.success) {
        setSuccessMsg(isTelugu ? 'ఖాతా స్థితి నవీకరించబడింది.' : 'Administrator status updated.');
        await fetchPlatformAdmins();
      } else {
        setError(res.message || 'Status update failed.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error updating status.');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredAdmins = useMemo(() => {
    let list = admins;

    if (hospitalFilter !== 'ALL') {
      list = list.filter((a) => String(a.hospital_id) === String(hospitalFilter));
    }

    if (statusFilter === 'ACTIVE') {
      list = list.filter((a) => a.is_active);
    } else if (statusFilter === 'SUSPENDED') {
      list = list.filter((a) => !a.is_active);
    }

    if (primaryFilter === 'PRIMARY') {
      list = list.filter((a) => a.is_primary);
    } else if (primaryFilter === 'SECONDARY') {
      list = list.filter((a) => !a.is_primary);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        a.name?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.hospital_name?.toLowerCase().includes(q) ||
        a.superadmin_name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [admins, hospitalFilter, statusFilter, primaryFilter, search]);

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
              {isTelugu ? 'గ్లోబల్ ఆసుపత్రి అడ్మిన్ల డైరెక్టరీ' : 'Global Hospital Administrators Directory'}
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
            {isTelugu
              ? 'నెట్‌వర్క్‌లోని అన్ని ఆసుపత్రుల ప్రధాన మరియు సహాయక అడ్మిన్ల పూర్తి డైరెక్టరీ మరియు పర్యవేక్షణ.'
              : 'Complete institutional directory of primary and secondary hospital administrators across all network institutions.'}
          </p>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
          {isTelugu ? `మొత్తం అడ్మిన్లు: ${admins.length}` : `Total Administrators: ${admins.length}`}
        </div>
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

      {/* Missing Primary Admin Warning Banner */}
      {hospitalsWithoutPrimary.length > 0 && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fef3c7',
          borderLeft: '5px solid #d97706',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaExclamationTriangle color="#d97706" size={18} />
            <strong style={{ fontSize: '0.95rem', color: '#92400e' }}>
              {isTelugu
                ? `హెచ్చరిక: ${hospitalsWithoutPrimary.length} ఆసుపత్రులలో ప్రధాన నిర్వాహకుడు లేరు`
                : `Action Required: ${hospitalsWithoutPrimary.length} Institution(s) Lack a Primary Administrator`}
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#78350f', lineHeight: 1.4 }}>
            {isTelugu
              ? 'కింది ఆసుపత్రులకు ఇంకా ప్రధాన నిర్వాహకుడు నియమించబడలేదు. ఆసుపత్రి కార్యకలాపాలు సాఫీగా సాగడానికి సూపర్ అడ్మిన్ లేదా ప్లాట్‌ఫారమ్ ఓనర్ ఒక అడ్మిన్‌ను నియమించాలి.'
              : 'The following institutions do not currently have a designated Primary Hospital Administrator. Primary administrative governance must be assigned for day-to-day operations:'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {hospitalsWithoutPrimary.map((h) => (
              <span
                key={h.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}
              >
                🏥 {h.name} ({h.city})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem',
        backgroundColor: '#ffffff',
        padding: '0.85rem 1.25rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
          {/* Hospital Filter */}
          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              color: '#1e293b'
            }}
          >
            <option value="ALL">{isTelugu ? 'అన్ని ఆసుపత్రులు' : 'All Hospitals'}</option>
            {allHospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>

          {/* Primary Filter */}
          <select
            value={primaryFilter}
            onChange={(e) => setPrimaryFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              color: '#1e293b'
            }}
          >
            <option value="ALL">{isTelugu ? 'అన్ని హోదాలు' : 'All Roles'}</option>
            <option value="PRIMARY">{isTelugu ? 'ప్రధాన అడ్మిన్లు మాత్రమే' : 'Primary Admins Only'}</option>
            <option value="SECONDARY">{isTelugu ? 'సహాయక అడ్మిన్లు మాత్రమే' : 'Secondary Admins Only'}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              color: '#1e293b'
            }}
          >
            <option value="ALL">{isTelugu ? 'అన్ని స్థితులు' : 'All Statuses'}</option>
            <option value="ACTIVE">{isTelugu ? 'యాక్టివ్ మాత్రమే' : 'Active Only'}</option>
            <option value="SUSPENDED">{isTelugu ? 'నిలిపివేయబడినవి' : 'Suspended Only'}</option>
          </select>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <FaSearch color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isTelugu ? 'అడ్మిన్, ఈమెయిల్, ఆసుపత్రి శోధించండి...' : 'Search by name, hospital, superadmin...'}
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 2.25rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem'
            }}
          />
        </div>
      </div>

      {/* Directory Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          {isTelugu ? 'అడ్మిన్ల వివరాలు లోడ్ అవుతున్నాయి...' : 'Loading administrator directory...'}
        </div>
      ) : filteredAdmins.length === 0 ? (
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
            {isTelugu ? 'అడ్మిన్లు కనుగొనబడలేదు' : 'No Administrators Found'}
          </h3>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>
            {isTelugu ? 'ఎంచుకున్న ఫిల్టర్‌లకు సరిపోయే నిర్వాహకులు లేరు.' : 'No administrators match your current filter selections.'}
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
                  <th style={{ padding: '0.85rem 1rem' }}>{isTelugu ? 'ఆసుపత్రి' : 'Hospital Institution'}</th>
                  <th style={{ padding: '0.85rem 1rem' }}>{isTelugu ? 'పర్యవేక్షక సూపర్ అడ్మిన్' : 'SuperAdmin in Charge'}</th>
                  <th style={{ padding: '0.85rem 1rem' }}>{isTelugu ? 'హోదా' : 'Designation / Hierarchy'}</th>
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
                      🏥 {admin.hospital_name || `Hospital #${admin.hospital_id}`}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.8rem' }}>
                      {admin.superadmin_name ? (
                        <span>🛡️ {admin.superadmin_name}</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                          {isTelugu ? 'సూపర్ అడ్మిన్ లేరు' : 'Unassigned'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {admin.is_primary ? (
                        <span style={{
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
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                        {admin.designation || 'Hospital Administrator'}
                      </div>
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
      )}
    </div>
  );
};

export default ManagePlatformHospitalAdmins;
