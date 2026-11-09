import React, { useState, useEffect, useCallback } from 'react';
import {
  FaUserPlus,
  FaUserFriends,
  FaUserMd,
  FaUserTie,
  FaSearch,
  FaTimes,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { invitationService } from '../../services/invitationService';
import { authService } from '../../services/authService';
import { doctorService } from '../../services/doctorService';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/common/Button';

export const ManageHospitalStaff = () => {
  const { user, hospitalName } = useAuth();

  const [activeTab, setActiveTab] = useState('ROSTER'); // 'ROSTER' | 'INVITATIONS'
  const [staffUsers, setStaffUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [unlinkedDoctors, setUnlinkedDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Revoke & Resend state
  const [revokingId, setRevokingId] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [actionError, setActionError] = useState('');

  // Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState('RECEPTIONIST'); // 'RECEPTIONIST' | 'DOCTOR'
  const [email, setEmail] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteModalError, setInviteModalError] = useState('');
  const [createdInvite, setCreatedInvite] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchStaffData = useCallback(async () => {
    setLoading(true);
    setError('');
    setActionError('');

    try {
      const [usersRes, invRes, docsRes] = await Promise.all([
        authService.getUsers().catch(() => ({ success: false, users: [] })),
        invitationService.listInvitations().catch(() => ({ success: false, invitations: [] })),
        doctorService.getDoctors({ hospital_id: user?.hospital_id, limit: 100 }).catch(() => ({ success: false, doctors: [] }))
      ]);

      if (usersRes.success && Array.isArray(usersRes.users)) {
        setStaffUsers(usersRes.users);
      }
      if (invRes.success && Array.isArray(invRes.invitations)) {
        setInvitations(invRes.invitations);
      }
      if (docsRes.success && Array.isArray(docsRes.doctors)) {
        // Filter unlinked doctors belonging to this hospital
        const unlinked = docsRes.doctors.filter((d) => !d.is_linked && !d.user_id);
        setUnlinkedDoctors(unlinked);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch hospital staff records.'));
    } finally {
      setLoading(false);
    }
  }, [user?.hospital_id]);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  const handleOpenInviteModal = () => {
    setIsInviteModalOpen(true);
    setInviteModalError('');
    setCreatedInvite(null);
    setEmail('');
    setTargetRole('RECEPTIONIST');
    setSelectedDoctorId(unlinkedDoctors.length > 0 ? String(unlinkedDoctors[0].id) : '');
    setCopiedLink(false);
  };

  const handleCreateInvitation = async (e) => {
    e.preventDefault();
    setInviteModalError('');

    if (!email.trim()) {
      setInviteModalError('Target email address is required.');
      return;
    }

    if (targetRole === 'DOCTOR' && !selectedDoctorId) {
      setInviteModalError('SEC-03: You must link a doctor profile when inviting a Doctor.');
      return;
    }

    setInviting(true);
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        role: targetRole,
        doctor_profile_id: targetRole === 'DOCTOR' ? Number(selectedDoctorId) : null
      };

      const res = await invitationService.createHospitalInvitation(payload);
      if (res.success && res.invitation) {
        setCreatedInvite(res.invitation);
        fetchStaffData();
      } else {
        setInviteModalError(res.message || 'Failed to issue staff invitation.');
      }
    } catch (err) {
      setInviteModalError(getApiErrorMessage(err, 'Unable to issue staff invitation.'));
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this staff invitation? The invitation link will immediately become invalid.')) {
      return;
    }

    setRevokingId(id);
    setActionError('');
    try {
      const res = await invitationService.revokeInvitation(id);
      if (res.success) {
        fetchStaffData();
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
        setIsInviteModalOpen(true);
        fetchStaffData();
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

  // Filtered Roster
  const filteredStaff = staffUsers.filter((u) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return u.name.toLowerCase().includes(term) ||
           u.email.toLowerCase().includes(term) ||
           u.role.toLowerCase().includes(term);
  });

  // Filtered Invitations
  const filteredInvitations = invitations.filter((inv) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return inv.email.toLowerCase().includes(term) ||
           inv.role.toLowerCase().includes(term) ||
           (inv.status && inv.status.toLowerCase().includes(term));
  });

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
            Hospital Staff Management
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '0.25rem', marginBottom: 0 }}>
            Active staff directory and cryptographic invitation onboarding for {hospitalName || 'your hospital'}
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenInviteModal}
          icon={<FaUserPlus aria-hidden="true" />}
        >
          Invite Staff Member
        </Button>
      </div>

      {error && (
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
          <span>{error}</span>
        </div>
      )}

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

      {/* Tabs and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        backgroundColor: 'white',
        padding: '0.85rem 1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--slate-200)'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('ROSTER')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'ROSTER' ? '#0284c7' : 'var(--slate-100)',
              color: activeTab === 'ROSTER' ? 'white' : 'var(--slate-700)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <FaUserFriends />
            <span>Active Staff ({staffUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INVITATIONS')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'INVITATIONS' ? '#0284c7' : 'var(--slate-100)',
              color: activeTab === 'INVITATIONS' ? 'white' : 'var(--slate-700)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <FaClock />
            <span>Invitations ({invitations.length})</span>
          </button>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
          <input
            type="text"
            placeholder="Search staff by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.4rem', fontSize: '0.84rem' }}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="skeleton" style={{ height: '320px', borderRadius: '12px' }} />
      ) : activeTab === 'ROSTER' ? (
        /* Active Staff Table */
        filteredStaff.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <FaUserFriends size={40} color="var(--slate-300)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>No Staff Members Found</h3>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem' }}>
              Click "Invite Staff Member" to onboard Receptionists or Doctors.
            </p>
          </div>
        ) : (
          <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', color: 'var(--slate-600)' }}>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Staff Name</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Email Address</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Assigned Role</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Phone</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Account Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: staff.role === 'DOCTOR' ? '#e0f2fe' : staff.role === 'RECEPTIONIST' ? '#f3e8ff' : '#fef3c7',
                          color: staff.role === 'DOCTOR' ? '#0369a1' : staff.role === 'RECEPTIONIST' ? '#7e22ce' : '#b45309',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem'
                        }}>
                          {staff.role === 'DOCTOR' ? <FaUserMd /> : <FaUserTie />}
                        </div>
                        <span>{staff.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--slate-600)' }}>
                      {staff.email}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        backgroundColor: staff.role === 'DOCTOR' ? '#e0f2fe' : staff.role === 'RECEPTIONIST' ? '#f3e8ff' : '#fef3c7',
                        color: staff.role === 'DOCTOR' ? '#0369a1' : staff.role === 'RECEPTIONIST' ? '#7e22ce' : '#b45309',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '12px'
                      }}>
                        {staff.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--slate-500)' }}>
                      {staff.phone || 'N/A'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        backgroundColor: staff.is_active ? 'var(--primary-light)' : 'var(--emergency-light)',
                        color: staff.is_active ? 'var(--primary-dark)' : 'var(--emergency)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px'
                      }}>
                        {staff.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Invitations Table */
        filteredInvitations.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <FaClock size={40} color="var(--slate-300)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>No Invitations Found</h3>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem' }}>
              Pending staff invitations will appear here.
            </p>
          </div>
        ) : (
          <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', color: 'var(--slate-600)' }}>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Invited Email</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Role</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Linked Doctor Profile</th>
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
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, backgroundColor: 'var(--slate-100)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {inv.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--slate-600)' }}>
                      {inv.doctor_name ? (
                        <span style={{ fontWeight: 600 }}>{inv.doctor_name}</span>
                      ) : (
                        <span style={{ color: 'var(--slate-400)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '12px',
                        backgroundColor: inv.status === 'Accepted' ? 'var(--primary-light)' : inv.status === 'Revoked' ? 'var(--emergency-light)' : '#fef3c7',
                        color: inv.status === 'Accepted' ? 'var(--primary-dark)' : inv.status === 'Revoked' ? 'var(--emergency)' : '#b45309'
                      }}>
                        {inv.status}
                      </span>
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
        )
      )}

      {/* Invite Staff Modal */}
      {isInviteModalOpen && (
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
                  Invite Staff Member
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', margin: '0.2rem 0 0' }}>
                  Generate a cryptographic onboarding link for {hospitalName || 'your hospital'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}
                aria-label="Close dialog"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {createdInvite ? (
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <FaCheckCircle size={44} color="#0284c7" style={{ margin: '0 auto 0.75rem' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
                  Staff Invitation Issued!
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)', marginBottom: '1.25rem' }}>
                  A cryptographic invitation has been created for <strong>{createdInvite.email}</strong> as {createdInvite.role}.
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
                      Single-Use Activation URL:
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
                  onClick={() => setIsInviteModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateInvitation}>
                {inviteModalError && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--emergency-light)',
                    color: 'var(--emergency)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '1.25rem'
                  }}>
                    {inviteModalError}
                  </div>
                )}

                {/* Role Switcher */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Staff Role *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setTargetRole('RECEPTIONIST')}
                      style={{
                        padding: '0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid',
                        borderColor: targetRole === 'RECEPTIONIST' ? '#0284c7' : 'var(--slate-200)',
                        backgroundColor: targetRole === 'RECEPTIONIST' ? '#e0f2fe' : 'white',
                        color: targetRole === 'RECEPTIONIST' ? '#0369a1' : 'var(--slate-700)',
                        fontWeight: targetRole === 'RECEPTIONIST' ? 700 : 500,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <FaUserTie />
                      <span>Receptionist</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetRole('DOCTOR')}
                      style={{
                        padding: '0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid',
                        borderColor: targetRole === 'DOCTOR' ? '#0284c7' : 'var(--slate-200)',
                        backgroundColor: targetRole === 'DOCTOR' ? '#e0f2fe' : 'white',
                        color: targetRole === 'DOCTOR' ? '#0369a1' : 'var(--slate-700)',
                        fontWeight: targetRole === 'DOCTOR' ? 700 : 500,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <FaUserMd />
                      <span>Doctor</span>
                    </button>
                  </div>
                </div>

                {/* Email Field */}
                <div className="form-group">
                  <label className="form-label">Invitee Email Address *</label>
                  <input
                    type="email"
                    placeholder="staff@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="form-input"
                  />
                  <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)', marginTop: '0.25rem', display: 'block' }}>
                    SEC-02: Target account must not be assigned to another hospital.
                  </span>
                </div>

                {/* Doctor Profile Selection (Mandatory for DOCTOR role) */}
                {targetRole === 'DOCTOR' && (
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label className="form-label">
                      Link Existing Doctor Profile * (SEC-03 Enforced)
                    </label>
                    {unlinkedDoctors.length === 0 ? (
                      <div style={{
                        padding: '0.85rem',
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.82rem',
                        color: '#92400e',
                        lineHeight: 1.5
                      }}>
                        ⚠️ <strong>No unlinked doctor profiles available.</strong>
                        <p style={{ margin: '0.35rem 0 0' }}>
                          Doctors can only be invited to claim an existing unlinked profile in this hospital. Please create a doctor profile first.
                        </p>
                      </div>
                    ) : (
                      <select
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                        required
                        className="form-input"
                      >
                        {unlinkedDoctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.name} — {doc.specialization_name} ({doc.qualification})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsInviteModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={inviting}
                    disabled={targetRole === 'DOCTOR' && unlinkedDoctors.length === 0}
                  >
                    Send Invitation
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

export default ManageHospitalStaff;
