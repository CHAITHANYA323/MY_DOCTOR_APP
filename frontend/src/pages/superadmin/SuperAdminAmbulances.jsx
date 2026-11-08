import React, { useState, useEffect, useCallback } from 'react';
import {
  FaAmbulance,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSearch,
  FaHospital
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { ambulanceService } from '../../services/ambulanceService';
import { getApiErrorMessage } from '../../services/api';

export const SuperAdminAmbulances = () => {
  const { hospitalName } = useAuth();

  const [activeTab, setActiveTab] = useState('fleet'); // 'fleet' | 'requests'
  const [ambulances, setAmbulances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [fleetRes, reqsRes] = await Promise.all([
        ambulanceService.getAmbulances().catch(() => ({ success: false, ambulances: [] })),
        ambulanceService.getAmbulanceRequests().catch(() => ({ success: false, requests: [] }))
      ]);

      if (fleetRes && fleetRes.success) {
        setAmbulances(fleetRes.ambulances || []);
      }
      if (reqsRes && reqsRes.success) {
        // Filter requests directed to this hospital if hospitalName is known, or show all
        const allReqs = reqsRes.requests || [];
        if (hospitalName) {
          const lowerHosp = hospitalName.toLowerCase();
          const hospReqs = allReqs.filter(r =>
            (r.destination_hospital || '').toLowerCase().includes(lowerHosp)
          );
          setRequests(hospReqs.length > 0 ? hospReqs : allReqs);
        } else {
          setRequests(allReqs);
        }
      }
    } catch (err) {
      console.error('Failed to load ambulance data:', err);
      setError(getApiErrorMessage(err, 'Unable to load emergency fleet data.'));
    } finally {
      setLoading(false);
    }
  }, [hospitalName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // KPIs
  const totalFleet = ambulances.length;
  const availableFleet = ambulances.filter(a => a.status === 'Available').length;
  const onDutyFleet = ambulances.filter(a => a.status === 'On Duty').length;
  const maintenanceFleet = ambulances.filter(a => a.status === 'Maintenance').length;
  const pendingRequests = requests.filter(r => r.status === 'Pending').length;

  const filteredFleet = ambulances.filter(a => {
    const term = search.toLowerCase();
    return (
      (a.vehicle_number || '').toLowerCase().includes(term) ||
      (a.driver_name || '').toLowerCase().includes(term) ||
      (a.driver_phone || '').toLowerCase().includes(term) ||
      (a.ambulance_type || '').toLowerCase().includes(term) ||
      (a.current_location || '').toLowerCase().includes(term)
    );
  });

  const filteredRequests = requests.filter(r => {
    const term = search.toLowerCase();
    return (
      (r.patient_name || '').toLowerCase().includes(term) ||
      (r.phone || '').toLowerCase().includes(term) ||
      (r.emergency_type || '').toLowerCase().includes(term) ||
      (r.pickup_location || '').toLowerCase().includes(term)
    );
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
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '1.25rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Ambulance & Emergency Services
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#ccfbf1',
              color: '#0f766e'
            }}>
              <FaHospital size={11} />
              {hospitalName || 'Your Hospital'}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Fleet readiness, active emergency transports, and emergency patient requests.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '1rem'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.1rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Total Fleet
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {totalFleet}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.1rem',
          border: '1px solid #dcfce7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
            Available Ready
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d', marginTop: '0.25rem' }}>
            {availableFleet}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.1rem',
          border: '1px solid #e0f2fe',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
            On Duty Dispatched
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0369a1', marginTop: '0.25rem' }}>
            {onDutyFleet}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.1rem',
          border: '1px solid #fef3c7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
            Pending Emergency Reqs
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: '0.25rem' }}>
            {pendingRequests}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '0.9rem 1.25rem',
          borderRadius: '8px',
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#991b1b',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* Tabs and Search */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('fleet')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: activeTab === 'fleet' ? '#0f766e' : '#f1f5f9',
              color: activeTab === 'fleet' ? '#ffffff' : '#475569'
            }}
          >
            <FaAmbulance size={14} /> Fleet Directory ({totalFleet})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: activeTab === 'requests' ? '#0f766e' : '#f1f5f9',
              color: activeTab === 'requests' ? '#ffffff' : '#475569'
            }}
          >
            <FaExclamationTriangle size={14} /> Emergency Requests ({requests.length})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: '240px', flex: '1', maxWidth: '340px' }}>
          <FaSearch style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8'
          }} />
          <input
            type="text"
            placeholder={activeTab === 'fleet' ? 'Search vehicle, driver, type...' : 'Search patient, location...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem 0.6rem 2.4rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '3.5rem',
          textAlign: 'center',
          color: '#64748b',
          border: '1px solid #e2e8f0'
        }}>
          <FaClock size={32} style={{ animation: 'spin 1s linear infinite', color: '#0f766e', marginBottom: '0.75rem' }} />
          <div>Loading fleet details...</div>
        </div>
      ) : activeTab === 'fleet' ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          {filteredFleet.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
              <FaAmbulance size={40} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#334155' }}>
                No ambulances registered
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.9rem 1.25rem' }}>Vehicle</th>
                    <th style={{ padding: '0.9rem 1.25rem' }}>Type</th>
                    <th style={{ padding: '0.9rem 1.25rem' }}>Driver & Contact</th>
                    <th style={{ padding: '0.9rem 1.25rem' }}>Current Base</th>
                    <th style={{ padding: '0.9rem 1.25rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFleet.map((amb) => (
                    <tr
                      key={amb.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FaAmbulance size={16} style={{ color: '#0f766e' }} />
                          {amb.vehicle_number}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: '#f1f5f9',
                          color: '#334155'
                        }}>
                          {amb.ambulance_type || 'Basic Life Support'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{amb.driver_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                          <FaPhoneAlt size={10} />
                          {amb.driver_phone}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FaMapMarkerAlt size={11} style={{ color: '#ef4444' }} />
                          {amb.current_location || 'Hospital Fleet Bay'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: amb.status === 'Available' ? '#dcfce7' : amb.status === 'On Duty' ? '#e0f2fe' : '#fee2e2',
                          color: amb.status === 'Available' ? '#15803d' : amb.status === 'On Duty' ? '#0369a1' : '#b91c1c'
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: amb.status === 'Available' ? '#15803d' : amb.status === 'On Duty' ? '#0369a1' : '#b91c1c'
                          }} />
                          {amb.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          {filteredRequests.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
              <FaCheckCircle size={40} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#334155' }}>
                No active emergency requests
              </div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                All emergency requests directed to this facility have been served or none are pending.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.9rem 1.25rem' }}>ID</th>
                    <th style={{ padding: '0.9rem 1.25rem' }}>Patient & Phone</th>
                    <th style={{ padding: '0.9rem 1.25rem' }}>Emergency Type</th>
                    <th style={{ padding: '0.9rem 1.25rem' }}>Pickup Location</th>
                    <th style={{ padding: '0.9rem 1.25rem' }}>Destination</th>
                    <th style={{ padding: '0.9rem 1.25rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr
                      key={req.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                    >
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0f766e' }}>
                        #{req.id}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{req.patient_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                          <FaPhoneAlt size={10} />
                          {req.phone}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: '#fee2e2',
                          color: '#b91c1c'
                        }}>
                          <FaExclamationTriangle size={10} />
                          {req.emergency_type}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FaMapMarkerAlt size={11} style={{ color: '#ef4444' }} />
                          {req.pickup_location}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#0f766e', fontWeight: 600 }}>
                          {req.destination_hospital || hospitalName || 'General Emergency'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: req.status === 'Pending' ? '#fef3c7' : req.status === 'Dispatched' ? '#e0f2fe' : '#dcfce7',
                          color: req.status === 'Pending' ? '#b45309' : req.status === 'Dispatched' ? '#0369a1' : '#15803d'
                        }}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
