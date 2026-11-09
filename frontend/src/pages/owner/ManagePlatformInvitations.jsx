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
  FaHospital
} from 'react-icons/fa';
import { invitationService } from '../../services/invitationService';
import { hospitalService } from '../../services/hospitalService';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/common/Button';

export const ManagePlatformInvitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Revoke & Resend state
  const [revokingId, setRevokingId] = useState(null);
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
    } catch (err) {
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

  const handleRevoke = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this invitation? The token will immediately become invalid.')) {
      return;
    }

    setRevokingId(id);
    setActionError('');
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
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '0.2rem 0.55rem',
            borderRadius: '12px',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <FaClock size={10} /> Pending
          </span>
        );
      case 'Accepted':
        return (
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '0.2rem 0.55rem',
            borderRadius: '12px',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary-dark)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <FaCheckCircle size={10} /> Accepted
          </span>
        );
      case 'Revoked':
        return (
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '0.2rem 0.55rem',
            borderRadius: '12px',
            backgroundColor: 'var(--emergency-light)',
            color: 'var(--emergency)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <FaBan size={10} /> Revoked
          </span>
        );
      case 'Expired':
        return (
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '0.2rem 0.55rem',
            borderRadius: '12px',
            backgroundColor: 'var(--slate-200)',
            color: 'var(--slate-600)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <FaCalendarTimes size={10} /> Expired
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
        borderBottom: '1px solid var(--slate-200)',
        paddingBottom: '1.25rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
            Super Admin Invitations
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '0.25rem', marginBottom: 0 }}>
            Platform-wide staff invitation governance and single-use cryptographic token lifecycle
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenModal}
          icon={<FaPlusCircle aria-hidden="true" />}
        >
          Issue Super Admin Invite
        </Button>
      </div>

      {actionError && (
        <div style={{
          padding: '0.85rem 1rem',
          backgroundColor: 'var(--emergency-light)',
          color: 'var(--emergency)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
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
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--slate-200)'
      }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
          <input
            type="text"
            placeholder="Search by email, hospital name, or role..."
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
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: statusFilter === st ? 'var(--primary)' : 'var(--slate-200)',
                backgroundColor: statusFilter === st ? 'var(--primary-ultralight)' : 'white',
                color: statusFilter === st ? 'var(--primary-dark)' : 'var(--slate-600)',
                fontSize: '0.8rem',
                fontWeight: statusFilter === st ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="skeleton" style={{ height: '320px', borderRadius: '12px' }} />
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: '#fca5a5' }}>
          <p style={{ color: 'var(--emergency)', fontWeight: 600 }}>{error}</p>
        </div>
      ) : filteredInvitations.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <FaEnvelopeOpenText size={40} color="var(--slate-300)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>No Invitations Match Query</h3>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem' }}>
            {search || statusFilter !== 'ALL' ? 'Try adjusting your filters.' : 'Click "Issue Super Admin Invite" above to invite staff.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', color: 'var(--slate-600)' }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Invited Email</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Role</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Hospital</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Expires At</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--slate-800)' }}>
                    {inv.email}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      backgroundColor: 'var(--slate-100)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      {inv.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--slate-700)' }}>
                    {inv.hospital_name || `Hospital #${inv.hospital_id}`}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {getStatusBadge(inv.status)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--slate-500)', fontSize: '0.8rem' }}>
                    {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    {inv.status === 'Accepted' ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>Accepted</span>
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
                          Resend
                        </Button>
                        {inv.status === 'Pending' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevoke(inv.id)}
                            loading={revokingId === inv.id}
                            style={{ color: 'var(--emergency)', borderColor: '#fecaca', fontSize: '0.74rem', padding: '0.25rem 0.55rem' }}
                          >
                            Revoke
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
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                  Issue Super Admin Invitation
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', margin: '0.2rem 0 0' }}>
                  Generate a cryptographic token for an existing hospital branch
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}
                aria-label="Close dialog"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {createdInvite ? (
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <FaCheckCircle size={44} color="var(--primary)" style={{ margin: '0 auto 0.75rem' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
                  Invitation Token Generated!
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)', marginBottom: '1.25rem' }}>
                  A secure invitation has been created for <strong>{createdInvite.email}</strong> at {createdInvite.hospital_name}.
                </p>

                {createdInvite.invite_link && (
                  <div style={{
                    backgroundColor: 'var(--slate-50)',
                    border: '1px solid var(--slate-200)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.85rem',
                    textAlign: 'left',
                    marginBottom: '1.5rem'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
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
                        {copiedLink ? 'Copied' : 'Copy'}
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
                    backgroundColor: 'var(--emergency-light)',
                    color: 'var(--emergency)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '1.25rem'
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
                  <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)', marginTop: '0.25rem', display: 'block' }}>
                    SEC-02: Target user must not belong to another hospital.
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
                    Issue Invitation
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

export default ManagePlatformInvitations;
