import React, { useState, useEffect, useCallback } from 'react';
import {
  FaHistory,
  FaSearch,
  FaShieldAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import { invitationService } from '../../services/invitationService';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/common/Button';

export const PlatformAuditLogs = () => {
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
        setError(res.message || 'Audit Log service responded with an unexpected format.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Platform Audit Log endpoint is currently unavailable. No synthetic logs will be displayed.'));
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

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

  const getActionColor = (action) => {
    if (action.includes('CREATE')) return '#0284c7';
    if (action.includes('ACCEPT')) return '#10b981';
    if (action.includes('REVOKE')) return '#ef4444';
    if (action.includes('LINK')) return '#8b5cf6';
    return '#64748b';
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
            Platform Audit Logs
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '0.25rem', marginBottom: 0 }}>
            Immutable security audit trail of privileged administrative events and role changes
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchAuditLogs}
          icon={<FaHistory aria-hidden="true" />}
        >
          Refresh Logs
        </Button>
      </div>

      {/* Security Notice */}
      <div style={{
        padding: '0.75rem 1rem',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.82rem',
        color: 'var(--slate-600)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <FaShieldAlt color="var(--primary)" />
        <span>
          <strong>Data Privacy Enforced:</strong> Audit entries strictly omit cryptographic tokens, JWT signatures, passwords, and sensitive credentials.
        </span>
      </div>

      {/* Filters */}
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
            placeholder="Search audit trail by actor, action, or hospital..."
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
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: actionFilter === act ? 'var(--primary)' : 'var(--slate-200)',
                backgroundColor: actionFilter === act ? 'var(--primary-ultralight)' : 'white',
                color: actionFilter === act ? 'var(--primary-dark)' : 'var(--slate-600)',
                fontSize: '0.75rem',
                fontWeight: actionFilter === act ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {act === 'ALL' ? 'All Events' : act.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="skeleton" style={{ height: '360px', borderRadius: '12px' }} />
      ) : error ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', borderColor: '#fca5a5' }}>
          <FaExclamationTriangle size={36} color="var(--emergency)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
            Audit Log API Unavailable
          </h3>
          <p style={{ color: 'var(--slate-600)', fontSize: '0.88rem', maxWidth: '520px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
            Retry Request
          </Button>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <FaHistory size={40} color="var(--slate-300)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>No Audit Events Found</h3>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem' }}>
            Privileged platform events will automatically appear here as administrators perform actions.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', color: 'var(--slate-600)' }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Timestamp (UTC)</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Action</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Actor</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Resource</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Hospital Node</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--slate-500)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: getActionColor(log.action),
                      backgroundColor: `${getActionColor(log.action)}15`,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--slate-800)' }}>
                    <span style={{ fontWeight: 600, display: 'block' }}>{log.user_name || `User #${log.user_id}`}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--slate-400)' }}>{log.user_email || ''}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--slate-600)' }}>
                    {log.resource_type} {log.resource_id ? `#${log.resource_id}` : ''}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--slate-700)' }}>
                    {log.hospital_name || (log.hospital_id ? `Hospital #${log.hospital_id}` : 'Global Platform')}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--slate-600)', fontSize: '0.78rem', maxWidth: '300px' }}>
                    <pre style={{
                      margin: 0,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      color: 'var(--slate-600)'
                    }}>
                      {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                    </pre>
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
