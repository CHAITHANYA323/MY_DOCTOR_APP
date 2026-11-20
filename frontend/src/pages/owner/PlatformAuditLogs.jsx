import React, { useState, useEffect, useCallback } from 'react';
import {
  FaHistory,
  FaSearch,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBan,
  FaHospital,
  FaEnvelopeOpenText
} from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import { invitationService } from '../../services/invitationService';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/common/Button';

export const PlatformAuditLogs = () => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = {};
      if (actionFilter !== 'ALL') {
        params.action = actionFilter;
      }

      const res = await invitationService.getPlatformAuditLogs(params);
      if (res.success && Array.isArray(res.logs)) {
        setLogs(res.logs);
      } else {
        setError(res.message || t('ownerPortal.auditLogs.apiUnavailable'));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('ownerPortal.auditLogs.apiUnavailable')));
    } finally {
      setLoading(false);
    }
  }, [actionFilter, t]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const actionMatch = log.action && log.action.toLowerCase().includes(term);
    const userMatch = (log.user_name && log.user_name.toLowerCase().includes(term)) ||
                      (log.user_email && log.user_email.toLowerCase().includes(term));
    const hospMatch = log.hospital_name && log.hospital_name.toLowerCase().includes(term);
    const detailsMatch = log.details && String(log.details).toLowerCase().includes(term);

    return actionMatch || userMatch || hospMatch || detailsMatch;
  });

  const getActionBadge = (action) => {
    if (action.includes('CREATE') && action.includes('INVITATION')) {
      return (
        <span style={{
          fontSize: '0.74rem',
          fontWeight: 700,
          color: '#0369a1',
          backgroundColor: '#e0f2fe',
          padding: '0.2rem 0.55rem',
          borderRadius: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          whiteSpace: 'nowrap'
        }}>
          <FaEnvelopeOpenText size={10} /> Invite Created
        </span>
      );
    }
    if (action.includes('ACCEPT')) {
      return (
        <span style={{
          fontSize: '0.74rem',
          fontWeight: 700,
          color: '#15803d',
          backgroundColor: '#dcfce7',
          padding: '0.2rem 0.55rem',
          borderRadius: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          whiteSpace: 'nowrap'
        }}>
          <FaCheckCircle size={10} /> Invite Accepted
        </span>
      );
    }
    if (action.includes('REVOKE')) {
      return (
        <span style={{
          fontSize: '0.74rem',
          fontWeight: 700,
          color: '#dc2626',
          backgroundColor: '#fee2e2',
          padding: '0.2rem 0.55rem',
          borderRadius: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          whiteSpace: 'nowrap'
        }}>
          <FaBan size={10} /> Invite Revoked
        </span>
      );
    }
    if (action.includes('HOSPITAL')) {
      return (
        <span style={{
          fontSize: '0.74rem',
          fontWeight: 700,
          color: '#b45309',
          backgroundColor: '#fef3c7',
          padding: '0.2rem 0.55rem',
          borderRadius: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          whiteSpace: 'nowrap'
        }}>
          <FaHospital size={10} /> Hospital Added
        </span>
      );
    }
    return (
      <span style={{
        fontSize: '0.74rem',
        fontWeight: 700,
        color: '#475569',
        backgroundColor: '#f1f5f9',
        padding: '0.2rem 0.55rem',
        borderRadius: '12px',
        whiteSpace: 'nowrap'
      }}>
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  const formatDetails = (details) => {
    if (!details) return 'Administrative action logged';
    if (typeof details === 'string') {
      try {
        const parsed = JSON.parse(details);
        if (typeof parsed === 'object') {
          return Object.entries(parsed)
            .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
            .join(' • ');
        }
        return details;
      } catch {
        return details;
      }
    }
    if (typeof details === 'object') {
      return Object.entries(details)
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
        .join(' • ');
    }
    return String(details);
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
            {t('ownerPortal.auditLogs.title')}
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
            {t('ownerPortal.auditLogs.subtitle')}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchAuditLogs}
          icon={<FaHistory aria-hidden="true" />}
        >
          {t('ownerPortal.auditLogs.btnRefresh')}
        </Button>
      </div>

      {/* Security Guidance Banner */}
      <div style={{
        padding: '1.1rem 1.25rem',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <FaShieldAlt color="#0284c7" size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0369a1', display: 'block' }}>
            {t('ownerPortal.auditLogs.guidanceTitle')}
          </span>
          <span style={{ fontSize: '0.82rem', color: '#0c4a6e', lineHeight: 1.5, display: 'block', marginTop: '0.25rem' }}>
            {t('ownerPortal.auditLogs.guidanceText')}
          </span>
        </div>
      </div>

      {/* Filters */}
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
            placeholder={t('ownerPortal.auditLogs.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {['ALL', 'INVITATION_CREATE', 'INVITATION_ACCEPT', 'INVITATION_REVOKE', 'HOSPITAL_CREATE'].map((act) => (
            <button
              key={act}
              type="button"
              onClick={() => setActionFilter(act)}
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: actionFilter === act ? '#0284c7' : '#cbd5e1',
                backgroundColor: actionFilter === act ? '#e0f2fe' : 'white',
                color: actionFilter === act ? '#0369a1' : '#475569',
                fontSize: '0.75rem',
                fontWeight: actionFilter === act ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {act === 'ALL'
                ? t('ownerPortal.auditLogs.filterAll')
                : act.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="skeleton" style={{ height: '360px', borderRadius: '12px' }} />
      ) : error ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', borderColor: '#fca5a5' }}>
          <FaExclamationTriangle size={36} color="#dc2626" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            {t('ownerPortal.auditLogs.apiUnavailable')}
          </h3>
          <p style={{ color: '#475569', fontSize: '0.88rem', maxWidth: '520px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
            {t('ownerPortal.auditLogs.btnRefresh')}
          </Button>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <FaHistory size={40} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            {t('ownerPortal.auditLogs.noLogs')}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Administrative actions, invitations, and onboarding approvals will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t('ownerPortal.auditLogs.colTimestamp')}</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t('ownerPortal.auditLogs.colAction')}</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t('ownerPortal.auditLogs.colActor')}</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t('ownerPortal.auditLogs.colHospital')}</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t('ownerPortal.auditLogs.colDetails')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {getActionBadge(log.action)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#0f172a' }}>
                    <span style={{ fontWeight: 600, display: 'block' }}>{log.user_name || `User #${log.user_id}`}</span>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{log.user_email || ''}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                    {log.hospital_name || (log.hospital_id ? `Hospital #${log.hospital_id}` : 'Global Platform')}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.8rem', maxWidth: '380px' }}>
                    {formatDetails(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PlatformAuditLogs;
