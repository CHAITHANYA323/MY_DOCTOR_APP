import React, { useState, useEffect, useCallback } from 'react';
import {
  FaEnvelopeOpenText,
  FaPlusCircle,
  FaSearch,
  FaTimes,
  FaCheckCircle,
  FaBan,
  FaCalendarTimes,
  FaClock,
  FaCopy,
  FaExclamationTriangle,
  FaHospital,
  FaInfoCircle,
  FaShieldAlt,
  FaUserShield
} from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import { invitationService } from '../../services/invitationService';
import { hospitalService } from '../../services/hospitalService';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/common/Button';

export const ManagePlatformInvitations = () => {
  const { t } = useLanguage();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Revoke & Resend state
  const [revokingId, setRevokingId] = useState(null);
  const [revokeModalInvite, setRevokeModalInvite] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [actionError, setActionError] = useState('');

  // Create Invitation for Existing Hospital Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [createModalError, setCreateModalError] = useState('');
  const [createdInvite, setCreatedInvite] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    setError('');
    setActionError('');
    try {
      const res = await invitationService.listInvitations();
      if (res.success && Array.isArray(res.invitations)) {
        setInvitations(res.invitations);
      } else {
        setError(res.message || 'Unable to load invitations.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch platform invitations.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setCreateModalError('');
    setCreatedInvite(null);
    setInviteEmail('');
    setSelectedHospitalId('');
    setCopiedLink(false);

    try {
      const res = await hospitalService.getHospitals({ limit: 100 });
      if (res.success && Array.isArray(res.hospitals)) {
        setHospitalsList(res.hospitals);
        if (res.hospitals.length > 0) {
          setSelectedHospitalId(res.hospitals[0].id);
        }
      }
    } catch {
      setCreateModalError('Failed to fetch hospital list for invitation.');
    }
  };

  const handleCreateInvitation = async (e) => {
    e.preventDefault();
    setCreateModalError('');

    if (!selectedHospitalId || !inviteEmail.trim()) {
      setCreateModalError('Hospital selection and a valid email address are required.');
      return;
    }

    setCreating(true);
    try {
      const res = await invitationService.createPlatformInvitation({
        hospital_id: Number(selectedHospitalId),
        email: inviteEmail.trim().toLowerCase(),
        role: 'HOSPITAL_SUPER_ADMIN'
      });

      if (res.success && res.invitation) {
        setCreatedInvite(res.invitation);
        fetchInvitations();
      } else {
        setCreateModalError(res.message || 'Failed to issue invitation.');
      }
    } catch (err) {
      setCreateModalError(getApiErrorMessage(err, 'Unable to issue Super Admin invitation.'));
    } finally {
      setCreating(false);
    }
  };

  const handleResend = async (id) => {
    setResendingId(id);
    setActionError('');
    try {
      const res = await invitationService.resendInvitation(id);
      if (res.success && res.invitation) {
        setCreatedInvite(res.invitation);
        setIsModalOpen(true);
        fetchInvitations();
      } else {
        setActionError(res.message || 'Resend failed.');
      }
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to resend invitation.'));
    } finally {
      setResendingId(null);
    }
  };

  const handleCopyLink = (link) => {
    if (!link) return;
    const fullUrl = `${window.location.origin}${link}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Filtered invitations
  const filteredInvitations = invitations.filter((inv) => {
    const matchesSearch = !search.trim() ||
      inv.email.toLowerCase().includes(search.toLowerCase()) ||
      (inv.hospital_name && inv.hospital_name.toLowerCase().includes(search.toLowerCase())) ||
      (inv.role && inv.role.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return (
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            padding: '0.2rem 0.55rem',
            borderRadius: '12px',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <FaClock size={10} /> {t('ownerPortal.invitations.statusPending')}
          </span>
        );
      case 'Accepted':
        return (
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            padding: '0.2rem 0.55rem',
            borderRadius: '12px',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <FaCheckCircle size={10} /> {t('ownerPortal.invitations.statusAccepted')}
          </span>
        );
      case 'Revoked':
        return (
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            padding: '0.2rem 0.55rem',
            borderRadius: '12px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <FaBan size={10} /> {t('ownerPortal.invitations.statusRevoked')}
          </span>
        );
      case 'Expired':
        return (
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            padding: '0.2rem 0.55rem',
            borderRadius: '12px',
            backgroundColor: '#e2e8f0',
            color: '#475569',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <FaCalendarTimes size={10} /> {t('ownerPortal.invitations.statusExpired')}
          </span>
        );
      default:
        return <span>{status}</span>;
    }
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
            {t('ownerPortal.invitations.title')}
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
            {t('ownerPortal.invitations.subtitle')}
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenModal}
          icon={<FaPlusCircle aria-hidden="true" />}
        >
          {t('ownerPortal.invitations.btnCreate')}
        </Button>
      </div>

      {/* 4-Step Beginner-Friendly Guide Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
            <FaShieldAlt color="#0284c7" size={16} />
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {t('ownerPortal.invitations.guideStep1Title')}
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            {t('ownerPortal.invitations.guideStep1Text')}
          </p>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
            <FaHospital color="#059669" size={16} />
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {t('ownerPortal.invitations.guideStep2Title')}
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            {t('ownerPortal.invitations.guideStep2Text')}
          </p>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
            <FaUserShield color="#7c3aed" size={16} />
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {t('ownerPortal.invitations.guideStep3Title')}
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            {t('ownerPortal.invitations.guideStep3Text')}
          </p>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
            <FaClock color="#ea580c" size={16} />
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {t('ownerPortal.invitations.guideStep4Title')}
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            {t('ownerPortal.invitations.guideStep4Text')}
          </p>
        </div>
      </div>

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

      {/* Filter Bar */}
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
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder={t('ownerPortal.invitations.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {['ALL', 'Pending', 'Accepted', 'Revoked', 'Expired'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: statusFilter === st ? '#0284c7' : '#cbd5e1',
                backgroundColor: statusFilter === st ? '#e0f2fe' : 'white',
                color: statusFilter === st ? '#0369a1' : '#475569',
                fontSize: '0.8rem',
                fontWeight: statusFilter === st ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {st === 'ALL'
                ? t('ownerPortal.invitations.filterAll')
                : st === 'Pending'
                ? t('ownerPortal.invitations.statusPending')
                : st === 'Accepted'
                ? t('ownerPortal.invitations.statusAccepted')
                : st === 'Revoked'
                ? t('ownerPortal.invitations.statusRevoked')
                : t('ownerPortal.invitations.statusExpired')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="skeleton" style={{ height: '320px', borderRadius: '12px' }} />
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: '#fca5a5' }}>
          <p style={{ color: '#dc2626', fontWeight: 600 }}>{error}</p>
        </div>
      ) : filteredInvitations.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <FaEnvelopeOpenText size={40} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            {t('ownerPortal.invitations.noInvitations')}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            {search || statusFilter !== 'ALL' ? 'Try adjusting your filters.' : 'Click "Invite Hospital Administrator" above to create an invite.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t('ownerPortal.invitations.colEmail')}</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t('ownerPortal.invitations.colRole')}</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t('ownerPortal.invitations.colHospital')}</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t('ownerPortal.invitations.colStatus')}</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t('ownerPortal.invitations.colExpires')}</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>{t('ownerPortal.invitations.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                    {inv.email}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      {inv.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                    {inv.hospital_name || `Hospital #${inv.hospital_id}`}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {getStatusBadge(inv.status)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                    {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    {inv.status === 'Accepted' ? (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t('ownerPortal.invitations.statusAccepted')}</span>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleResend(inv.id)}
                          loading={resendingId === inv.id}
                          style={{ fontSize: '0.74rem', padding: '0.25rem 0.55rem' }}
                        >
                          {t('ownerPortal.invitations.btnResend')}
                        </Button>
                        {inv.status === 'Pending' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRevokeModalInvite(inv)}
                            loading={revokingId === inv.id}
                            style={{ color: '#dc2626', borderColor: '#fecaca', fontSize: '0.74rem', padding: '0.25rem 0.55rem' }}
                          >
                            {t('ownerPortal.invitations.btnRevoke')}
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Issue Invite Modal */}
      {isModalOpen && (
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
          <div className="card" style={{ maxWidth: '540px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {t('ownerPortal.invitations.btnCreate')}
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0' }}>
                  Generate a cryptographic token for an existing hospital branch
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                aria-label="Close dialog"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {createdInvite ? (
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <FaCheckCircle size={44} color="#16a34a" style={{ margin: '0 auto 0.75rem' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Invitation Token Generated!
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '1.25rem' }}>
                  A secure invitation has been created for <strong>{createdInvite.email}</strong> at {createdInvite.hospital_name}.
                </p>

                {createdInvite.invite_link && (
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    textAlign: 'left',
                    marginBottom: '1.5rem'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                      Activation URL:
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}${createdInvite.invite_link}`}
                        className="form-input"
                        style={{ fontSize: '0.8rem', backgroundColor: 'white' }}
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleCopyLink(createdInvite.invite_link)}
                      >
                        {copiedLink ? t('ownerPortal.invitations.copied') : t('ownerPortal.invitations.btnCopy')}
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  onClick={() => setIsModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateInvitation}>
                {createModalError && (
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
                    {createModalError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Target Hospital Branch *</label>
                  <select
                    value={selectedHospitalId}
                    onChange={(e) => setSelectedHospitalId(e.target.value)}
                    required
                    className="form-input"
                  >
                    {hospitalsList.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Super Administrator Email *</label>
                  <input
                    type="email"
                    placeholder="admin@hospital.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="form-input"
                  />
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    Target user must not belong to another hospital.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={creating}
                  >
                    {t('ownerPortal.invitations.btnCreate')}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Revocation Confirmation Modal */}
      {revokeModalInvite && (
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
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '1.75rem', backgroundColor: '#ffffff', borderRadius: '14px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaBan size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {t('ownerPortal.invitations.confirmRevokeTitle')}
                </h3>
                <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Security Access Revocation</span>
              </div>
            </div>

            <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              {t('ownerPortal.invitations.confirmRevokeText')}
            </p>

            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.5rem',
              fontSize: '0.84rem'
            }}>
              <div style={{ marginBottom: '0.25rem' }}><strong>Email:</strong> {revokeModalInvite.email}</div>
              <div style={{ marginBottom: '0.25rem' }}><strong>Target Hospital:</strong> {revokeModalInvite.hospital_name || 'N/A'}</div>
              <div><strong>Role:</strong> {revokeModalInvite.role}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRevokeModalInvite(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={async () => {
                  const id = revokeModalInvite.id;
                  setRevokeModalInvite(null);
                  setRevokingId(id);
                  try {
                    const res = await invitationService.revokeInvitation(id);
                    if (res.success) {
                      fetchInvitations();
                    } else {
                      setActionError(res.message || 'Revocation failed.');
                    }
                  } catch (err) {
                    setActionError(getApiErrorMessage(err, 'Failed to revoke invitation.'));
                  } finally {
                    setRevokingId(null);
                  }
                }}
              >
                {t('ownerPortal.invitations.btnRevoke')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePlatformInvitations;
