import React, { useState, useEffect } from 'react';
import {
  FaChartBar,
  FaCheckCircle,
  FaTimesCircle,
  FaUserMd,
  FaCalendarCheck,
  FaPercentage
} from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import { ecosystemService } from '../../services/ecosystemService';

export const HospitalReports = () => {
  const { isTelugu } = useLanguage();
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        const res = await ecosystemService.getHospitalAdminReports();
        if (res.success) {
          setReports(res);
        }
      } catch (err) {
        console.error('Error loading hospital reports:', err);
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#1d4ed8' }}>Loading Reports...</div>;
  }

  const doctorBreakdown = reports?.doctor_breakdown || [];

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
          {isTelugu ? 'హాస్పిటల్ నివేదికలు' : 'Hospital Reports'}
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem' }}>
          {reports?.hospital_name ? `${reports.hospital_name} — ` : ''}
          {isTelugu ? 'రోగుల అపాయింట్‌మెంట్లు, పూర్తి రేటు మరియు వైద్యుల వారీ గణాంకాలు.' : 'Simple summary of your hospital appointments, completion rates, and doctor performance.'}
        </p>
      </div>

      {/* Top 3 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
              {isTelugu ? 'మొత్తం కన్సల్టేషన్లు' : 'Total Consultations'}
            </span>
            <FaCalendarCheck color="#1d4ed8" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
            {reports?.total_appointments || 0}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#15803d' }}>
              {isTelugu ? 'పూర్తయిన రేటు (Completion Rate)' : 'Completion Rate'}
            </span>
            <FaCheckCircle color="#16a34a" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#15803d' }}>
            {reports?.completion_rate_percentage || 0}%
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {reports?.completed_appointments || 0} {isTelugu ? 'పూర్తయినవి' : 'completed'}
          </span>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#dc2626' }}>
              {isTelugu ? 'రద్దు రేటు (Cancellation Rate)' : 'Cancellation Rate'}
            </span>
            <FaTimesCircle color="#dc2626" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626' }}>
            {reports?.cancellation_rate_percentage || 0}%
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {reports?.cancelled_appointments || 0} {isTelugu ? 'రద్దయినవి' : 'cancelled'}
          </span>
        </div>
      </div>

      {/* Doctor-wise Breakdown Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaUserMd color="#1d4ed8" />
          <span>{isTelugu ? 'వైద్యుల వారీ కన్సల్టేషన్ల సంఖ్య' : 'Doctor-Wise Consultation Volume'}</span>
        </h3>

        {doctorBreakdown.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            {isTelugu ? 'వైద్యుల వివరాలు అందుబాటులో లేవు.' : 'No doctor records available.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>{isTelugu ? 'వైద్యుడు' : 'Doctor'}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{isTelugu ? 'విభాగం' : 'Department'}</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{isTelugu ? 'అపాయింట్‌మెంట్లు' : 'Total Appointments'}</th>
              </tr>
            </thead>
            <tbody>
              {doctorBreakdown.map((doc) => (
                <tr key={doc.doctor_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                    {doc.name}
                  </td>
                  <td style={{ padding: '0.9rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
                    {doc.specialization}
                  </td>
                  <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontWeight: 800, color: '#1d4ed8', fontSize: '1rem' }}>
                    {doc.appointments_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
