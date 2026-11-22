import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaShieldAlt,
  FaUserShield,
  FaHospital,
  FaPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaExchangeAlt,
  FaSearch,
  FaExclamationTriangle,
  FaCheck,
  FaBan,
  FaInfoCircle,
  FaUserTie,
  FaUserMd,
  FaCalendarCheck
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ecosystemService } from '../../services/ecosystemService';
import { hospitalService } from '../../services/hospitalService';
import { Button } from '../../components/common/Button';

export const ManageSuperadmins = () => {
  const { user } = useAuth();
  const { t, isTelugu } = useLanguage();

  const [superadmins, setSuperadmins] = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

  // Create Superadmin Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedHospIds, setSelectedHospIds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Assign Hospitals Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetSuperadmin, setTargetSuperadmin] = useState(null);
  const [assigningHospIds, setAssigningHospIds] = useState([]);
  const [assigningNotes, setAssigningNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Status Action
  const [processingId, setProcessingId] = useState(null);

  const fetchSuperadminsData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [saRes, hospRes] = await Promise.all([
        ecosystemService.getPlatformSuperadmins(),
        hospitalService.getHospitals({ limit: 100 }).catch(() => ({ success: false, hospitals: [] }))
      ]);

      if (saRes.success && Array.isArray(saRes.superadmins)) {
        setSuperadmins(saRes.superadmins);
      }
      if (hospRes.success && Array.isArray(hospRes.hospitals)) {
        setAllHospitals(hospRes.hospitals);
      }
    } catch (err) {
      console.error('Failed to load SuperAdmins:', err);
      setError(isTelugu ? 'సూపర్ అడ్మిన్ల వివరాలు పొందడం సాధ్యం కాలేదు.' : 'Failed to fetch SuperAdmin accounts.');
    } finally {
      setLoading(false);
    }
  }, [isTelugu]);

  useEffect(() => {
    fetchSuperadminsData();
  }, [fetchSuperadminsData]);

  const handleOpenCreateModal = () => {
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewPassword('');
    setSelectedHospIds([]);
    setCreateError('');
    setCreateModalOpen(true);
  };

  const handleCreateSuperadmin = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setCreateError(isTelugu ? 'అన్ని తప్పనిసరి వివరాలను నమోదు చేయండి.' : 'Please fill all required fields.');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const res = await ecosystemService.createSuperadmin({
        name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim(),
        password: newPassword,
        hospital_ids: selectedHospIds
      });

      if (res.success) {
        setSuccessMsg(isTelugu ? 'కొత్త సూపర్ అడ్మిన్ ఖాతా విజయవంతంగా సృష్టించబడింది.' : 'New SuperAdmin account created successfully.');
        setCreateModalOpen(false);
        await fetchSuperadminsData();
      } else {
        setCreateError(res.message || 'Creation failed.');
      }
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'Error creating SuperAdmin account.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenAssignModal = (sa) => {
    setTargetSuperadmin(sa);
    const initialIds = (sa.assigned_hospitals || []).map((h) => h.id);
    setAssigningHospIds(initialIds);
    setAssigningNotes('');
    setAssignModalOpen(true);
  };

  const handleSaveHospitalAssignments = async (e) => {
    e.preventDefault();
    if (!targetSuperadmin) return;

    setAssigning(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await ecosystemService.assignHospitalsToSuperadmin(
        targetSuperadmin.id,
        assigningHospIds,
        assigningNotes.trim()
      );

      if (res.success) {
        setSuccessMsg(isTelugu ? 'ఆసుపత్రుల కేటాయింపులు విజయవంతంగా నవీకరించబడ్డాయి.' : 'Hospital assignments successfully updated.');
        setAssignModalOpen(false);
        await fetchSuperadminsData();
      } else {
        setError(res.message || 'Failed to update assignments.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error updating hospital assignments.');
    } finally {
      setAssigning(false);
    }
  };

  const handleToggleStatus = async (sa) => {
    const newStatus = !sa.is_active;
    const confirmText = newStatus
      ? (isTelugu ? `${sa.name} ఖాతాను పునరుద్ధరించాలా?` : `Reactivate SuperAdmin account for ${sa.name}?`)
      : (isTelugu ? `${sa.name} ఖాతాను నిలిపివేయాలా?` : `Suspend SuperAdmin account for ${sa.name}?`);

    if (!window.confirm(confirmText)) return;

    setProcessingId(sa.id);
    setError('');
    setSuccessMsg('');
    try {
      const res = await ecosystemService.updateSuperadminStatus(sa.id, newStatus);
      if (res.success) {
        setSuccessMsg(isTelugu ? 'సూపర్ అడ్మిన్ ఖాతా స్థితి నవీకరించబడింది.' : 'SuperAdmin status updated successfully.');
        await fetchSuperadminsData();
      } else {
        setError(res.message || 'Status update failed.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update account status.');
    } finally {
      setProcessingId(null);
    }
  };

  const toggleHospitalInList = (hId, list, setter) => {
    if (list.includes(hId)) {
      setter(list.filter((id) => id !== hId));
    } else {
      setter([...list, hId]);
    }
  };

  const filteredSuperadmins = useMemo(() => {
    if (!search.trim()) return superadmins;
    const q = search.toLowerCase();
    return superadmins.filter((sa) =>
      sa.name?.toLowerCase().includes(q) ||
      sa.email?.toLowerCase().includes(q) ||
      sa.phone?.includes(q) ||
      (sa.assigned_hospitals || []).some((h) => h.name?.toLowerCase().includes(q))
    );
  }, [superadmins, search]);

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
              <FaShieldAlt />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {isTelugu ? 'సూపర్ అడ్మిన్ల సమగ్ర నిర్వహణ' : 'Platform SuperAdmin Governance'}
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
            {isTelugu
              ? 'ఆంధ్రప్రదేశ్ & తెలంగాణ వ్యాప్తంగా ఆసుపత్రులను పర్యవేక్షించే రీజినల్ సూపర్ అడ్మిన్లను సృష్టించండి మరియు బహుళ ఆసుపత్రులను కేటాయించండి.'
              : 'Appoint regional SuperAdmins across AP & Telangana, configure multi-hospital oversight, and maintain administrative balance.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.65rem 1.25rem',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            borderRadius: '9px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
          }}
        >
          <FaPlus size={12} />
          <span>{isTelugu ? 'కొత్త సూపర్ అడ్మిన్ ఖాతా' : 'Create SuperAdmin'}</span>
        </button>
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

      {/* Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        backgroundColor: '#ffffff',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>
          {isTelugu ? 'నమోదైన సూపర్ అడ్మిన్లు' : 'Registered SuperAdmins'} ({filteredSuperadmins.length})
        </div>
        <div style={{ position: 'relative', minWidth: '280px' }}>
          <FaSearch color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isTelugu ? 'పేరు, ఈమెయిల్, ఆసుపత్రి ద్వారా శోధించండి...' : 'Search by name, email, or hospital...'}
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

      {/* SuperAdmins Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          {isTelugu ? 'సూపర్ అడ్మిన్ల వివరాలు లోడ్ అవుతున్నాయి...' : 'Loading SuperAdmin directory...'}
        </div>
      ) : filteredSuperadmins.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          padding: '3rem 1.5rem',
          textAlign: 'center',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          color: '#64748b'
        }}>
          <FaUserShield color="#94a3b8" size={36} style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            {isTelugu ? 'సూపర్ అడ్మిన్లు కనుగొనబడలేదు' : 'No SuperAdmins Found'}
          </h3>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>
            {isTelugu ? 'కొత్త ఖాతాను సృష్టించడానికి పైన ఉన్న బటన్‌ను క్లిక్ చేయండి.' : 'Click "Create SuperAdmin" to onboard a new regional administrator.'}
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
                  <th style={{ padding: '0.85rem 1rem' }}>{isTelugu ? 'సూపర్ అడ్మిన్' : 'SuperAdmin'}</th>
                  <th style={{ padding: '0.85rem 1rem' }}>{isTelugu ? 'కేటాయించిన ఆసుపత్రులు' : 'Assigned Hospitals'}</th>
                  <th style={{ padding: '0.85rem 1rem' }}>{isTelugu ? 'పర్యవేక్షణ స్థాయి' : 'Scope Metrics'}</th>
                  <th style={{ padding: '0.85rem 1rem' }}>{isTelugu ? 'ఖాతా స్థితి' : 'Status'}</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>{isTelugu ? 'చర్యలు' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuperadmins.map((sa) => (
                  <tr key={sa.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{sa.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sa.email}</div>
                      {sa.phone && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{sa.phone}</div>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxWidth: '380px' }}>
                        {(sa.assigned_hospitals || []).length === 0 ? (
                          <span style={{ fontSize: '0.75rem', color: '#be123c', fontStyle: 'italic' }}>
                            {isTelugu ? 'ఆసుపత్రులు కేటాయించబడలేదు' : 'No hospitals assigned'}
                          </span>
                        ) : (
                          sa.assigned_hospitals.map((h) => (
                            <span
                              key={h.id}
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#1e293b',
                                border: '1px solid #cbd5e1',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 600
                              }}
                            >
                              🏥 {h.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.78rem' }}>
                      <div>👨‍⚕️ {sa.total_doctors || 0} {isTelugu ? 'డాక్టర్లు' : 'Doctors'}</div>
                      <div>📋 {sa.total_hospital_admins || 0} {isTelugu ? 'ఆసుపత్రి అడ్మిన్లు' : 'Admins'}</div>
                      <div>📅 {sa.total_appointments || 0} {isTelugu ? 'అపాయింట్‌మెంట్లు' : 'Appts'}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: sa.is_active ? '#dcfce7' : '#fee2e2',
                        color: sa.is_active ? '#166534' : '#991b1b'
                      }}>
                        {sa.is_active ? (isTelugu ? 'యాక్టివ్' : 'Active') : (isTelugu ? 'నిలిపివేయబడింది' : 'Suspended')}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(sa)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#0284c7',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <FaExchangeAlt size={10} />
                          <span>{isTelugu ? 'ఆసుపత్రులు' : 'Assign Hospitals'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(sa)}
                          disabled={processingId === sa.id}
                          style={{
                            padding: '0.4rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: sa.is_active ? '#fff1f2' : '#f0fdf4',
                            color: sa.is_active ? '#be123c' : '#15803d',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {sa.is_active ? (isTelugu ? 'నిలిపివేయి' : 'Suspend') : (isTelugu ? 'పునరుద్ధరించు' : 'Activate')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create SuperAdmin Modal */}
      {createModalOpen && (
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
            maxWidth: '560px',
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
                <FaUserShield />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {isTelugu ? 'కొత్త సూపర్ అడ్మిన్‌ను నియమించండి' : 'Create SuperAdmin Account'}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {isTelugu ? 'ఈ ఖాతా బహుళ ఆసుపత్రుల కార్యకలాపాలను పర్యవేక్షించగలదు.' : 'This account will have regional oversight across designated hospitals.'}
                </span>
              </div>
            </div>

            {createError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '0.75rem',
                borderRadius: '8px',
                color: '#991b1b',
                fontSize: '0.8rem',
                marginBottom: '1rem'
              }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSuperadmin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  {isTelugu ? 'పూర్తి పేరు' : 'Full Name'} *
                </label>
                <input
                  required
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    {isTelugu ? 'ఈమెయిల్' : 'Official Email'} *
                  </label>
                  <input
                    required
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    {isTelugu ? 'ఫోన్ నంబర్' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  {isTelugu ? 'పాస్‌వర్డ్' : 'Secure Initial Password'} *
                </label>
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isTelugu ? 'ప్రారంభ ఆసుపత్రుల కేటాయింపు (ఎంచుకోండి):' : 'Initial Hospital Assignments (Select multiple):'}
                </label>
                <div style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}>
                  {allHospitals.map((h) => (
                    <label key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedHospIds.includes(h.id)}
                        onChange={() => toggleHospitalInList(h.id, selectedHospIds, setSelectedHospIds)}
                      />
                      <span>{h.name} ({h.city})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isTelugu ? 'రద్దు చేయి' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {creating ? (isTelugu ? 'సృష్టిస్తున్నారు...' : 'Creating...') : (isTelugu ? 'ఖాతా సృష్టించు' : 'Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Hospitals Modal */}
      {assignModalOpen && targetSuperadmin && (
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
            maxWidth: '560px',
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
                  {isTelugu ? 'ఆసుపత్రుల కేటాయింపులు నవీకరించండి' : 'Configure Hospital Assignments'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  SuperAdmin: <strong>{targetSuperadmin.name}</strong> ({targetSuperadmin.email})
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveHospitalAssignments} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isTelugu ? 'ఈ సూపర్ అడ్మిన్‌కు కేటాయించాల్సిన ఆసుపత్రులు:' : 'Hospitals to be governed by this SuperAdmin:'}
                </label>
                <div style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.65rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem'
                }}>
                  {allHospitals.map((h) => (
                    <label
                      key={h.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.82rem',
                        padding: '0.35rem',
                        borderRadius: '6px',
                        backgroundColor: assigningHospIds.includes(h.id) ? '#f0f9ff' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={assigningHospIds.includes(h.id)}
                        onChange={() => toggleHospitalInList(h.id, assigningHospIds, setAssigningHospIds)}
                      />
                      <span style={{ fontWeight: assigningHospIds.includes(h.id) ? 700 : 500, color: '#1e293b' }}>
                        {h.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 'auto' }}>
                        📍 {h.city}
                      </span>
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.35rem' }}>
                  {isTelugu ? `ఎంచుకున్నవి: ${assigningHospIds.length} ఆసుపత్రులు` : `Selected: ${assigningHospIds.length} hospitals`}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  {isTelugu ? 'ఆడిట్ లాగ్ గమనికలు / కారణం (ఐచ్ఛికం):' : 'Audit Log Note / Reason (Optional):'}
                </label>
                <input
                  type="text"
                  value={assigningNotes}
                  onChange={(e) => setAssigningNotes(e.target.value)}
                  placeholder={isTelugu ? 'ఉదా: రీజినల్ క్లస్టర్ రీఅలొకేషన్' : 'e.g. Regional cluster reorganization'}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isTelugu ? 'రద్దు చేయి' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {assigning ? (isTelugu ? 'నవీకరిస్తున్నారు...' : 'Saving...') : (isTelugu ? 'కేటాయింపులను భద్రపరుచు' : 'Save Assignments')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSuperadmins;
