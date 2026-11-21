import React, { useState, useEffect } from 'react';
import {
  FaUserPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaTimes
} from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import { ecosystemService } from '../../services/ecosystemService';
import { notify } from '../../utils/toast';

export const HospitalReceptionistManagement = () => {
  const { isTelugu } = useLanguage();
  const [receptionists, setReceptionists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Receptionist Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const fetchReceptionists = async () => {
    try {
      setLoading(true);
      const res = await ecosystemService.getHospitalAdminReceptionists();
      if (res.success) {
        setReceptionists(res.receptionists || []);
      }
    } catch (err) {
      console.error('Error fetching receptionists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceptionists();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await ecosystemService.addHospitalAdminReceptionist({
        name,
        email,
        phone,
        password
      });
      if (res.success) {
        notify.success(isTelugu ? 'రిసెప్షనిస్ట్ విజయవంతంగా జోడించబడ్డారు!' : 'Receptionist added successfully!');
        setModalOpen(false);
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        fetchReceptionists();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || (isTelugu ? 'జోడించడం విఫలమైంది' : 'Failed to add receptionist'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const newStatus = !user.is_active;
      const res = await ecosystemService.updateHospitalAdminReceptionistStatus(user.id, newStatus);
      if (res.success) {
        notify.success(res.message || (isTelugu ? 'ఖాతా స్థితి నవీకరించబడింది' : 'Status updated'));
        fetchReceptionists();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || (isTelugu ? 'స్థితి మార్పు విఫలమైంది' : 'Action failed'));
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
            {isTelugu ? 'రిసెప్షన్ సిబ్బంది నిర్వహణ' : 'Manage Reception Staff'}
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem' }}>
            {isTelugu
              ? 'రోగుల చెక్-ఇన్ మరియు టోకెన్ కేటాయింపును నిర్వహించే ఫ్రంట్ డెస్క్ సిబ్బంది ఖాతాలు.'
              : 'Manage front-desk staff who check in patients, manage queues, and schedule appointments.'}
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: '0.65rem 1.15rem',
            backgroundColor: '#1d4ed8',
            color: 'white',
            borderRadius: '9px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: '0 3px 10px rgba(29, 78, 216, 0.25)'
          }}
        >
          <FaUserPlus /> <span>{isTelugu ? '+ కొత్త సిబ్బందిని జోడించండి' : '+ Add Reception Staff'}</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#1d4ed8' }}>Loading Reception Team...</div>
      ) : receptionists.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          {isTelugu ? 'రిసెప్షన్ సిబ్బంది ఎవరూ నమోదు కాలేదు.' : 'No receptionists currently registered for this hospital.'}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 640 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.9rem 1.25rem' }}>{isTelugu ? 'సిబ్బంది పేరు' : 'Staff Member'}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{isTelugu ? 'ఈమెయిల్ & ఫోన్' : 'Contact'}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{isTelugu ? 'నమోదు తేదీ' : 'Registered'}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{isTelugu ? 'ఖాతా స్థితి' : 'Account Status'}</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>{isTelugu ? 'చర్య' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {receptionists.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                          {r.name ? r.name.charAt(0).toUpperCase() : 'R'}
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{r.name}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Front Desk Receptionist</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.82rem', color: '#334155' }}>📧 {r.email}</div>
                      {r.phone && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>☎️ {r.phone}</div>}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.82rem', color: '#64748b' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.65rem',
                        borderRadius: '100px',
                        backgroundColor: r.is_active ? '#f0fdf4' : '#fef2f2',
                        color: r.is_active ? '#16a34a' : '#dc2626'
                      }}>
                        {r.is_active ? <FaCheckCircle size={10} /> : <FaTimesCircle size={10} />}
                        <span>{r.is_active ? (isTelugu ? 'యాక్టివ్' : 'Active') : (isTelugu ? 'నిలిపివేయబడింది' : 'Suspended')}</span>
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleStatus(r)}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          backgroundColor: r.is_active ? '#fee2e2' : '#dcfce7',
                          color: r.is_active ? '#b91c1c' : '#15803d'
                        }}
                      >
                        {r.is_active ? (isTelugu ? 'నిలిపివేయి' : 'Deactivate') : (isTelugu ? 'పునరుద్ధరించు' : 'Activate')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Receptionist Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '18px', maxWidth: 460, width: '100%', padding: '1.75rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                {isTelugu ? 'రిసెప్షనిస్ట్‌ను జోడించండి' : 'Add New Receptionist'}
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <FaTimes size={18} />
              </button>
            </div>

            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                  {isTelugu ? 'పూర్తి పేరు' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Radhika Sharma"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                  {isTelugu ? 'అధికారిక ఈమెయిల్' : 'Official Email'} *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="receptionist@hospital.com"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                  {isTelugu ? 'మొబైల్ నంబర్' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                  {isTelugu ? 'తాత్కాలిక పాస్‌వర్డ్' : 'Temporary Password'} *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isTelugu ? 'రద్దు చేయి' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#1d4ed8', color: 'white', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? (isTelugu ? 'సేవ్ చేస్తోంది...' : 'Creating...') : (isTelugu ? 'ఖాతా సృష్టించండి' : 'Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
