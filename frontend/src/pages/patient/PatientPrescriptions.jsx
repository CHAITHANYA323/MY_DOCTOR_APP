import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FaPrescriptionBottleAlt,
  FaFilePdf,
  FaEye,
  FaSearch,
  FaHospital,
  FaUserMd,
  FaCalendarAlt,
  FaPills,
  FaSync
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { prescriptionService } from '../../services/prescriptionService';
import { PrescriptionViewerModal } from '../../components/prescriptions/PrescriptionViewerModal';
import { useLanguage } from '../../context/LanguageContext';

export const PatientPrescriptions = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedRx, setSelectedRx] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const getLabel = useCallback((key, fallback) => {
    const val = t(key);
    return !val || val === key ? fallback : val;
  }, [t]);

  const loadPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await prescriptionService.getPatientPrescriptions();
      if (res.success) {
        setPrescriptions(res.prescriptions || []);
      } else {
        toast.error(res.message || 'Failed to fetch prescriptions.');
      }
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
      toast.error('Unable to load prescriptions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const filteredPrescriptions = useMemo(() => {
    if (!search.trim()) return prescriptions;
    const q = search.toLowerCase().trim();
    return prescriptions.filter((p) => {
      const rxNum = (p.prescription_number || '').toLowerCase();
      const docName = (p.doctor_name || '').toLowerCase();
      const hosp = (p.hospital_name || '').toLowerCase();
      const diag = (p.diagnosis || '').toLowerCase();
      return rxNum.includes(q) || docName.includes(q) || hosp.includes(q) || diag.includes(q);
    });
  }, [prescriptions, search]);

  const handleDownloadPdf = async (e, rx) => {
    e.stopPropagation();
    try {
      setDownloadingId(rx.id);
      await prescriptionService.downloadPrescriptionPdf(
        rx.id,
        `${rx.prescription_number || 'Prescription'}.pdf`
      );
      toast.success(getLabel('doctorPortal.pdfSuccess', 'Prescription PDF downloaded successfully.'));
    } catch (err) {
      console.error(err);
      toast.error(getLabel('doctorPortal.pdfFailed', 'Failed to download prescription PDF.'));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0C2328 0%, #134E4A 100%)',
          borderRadius: '16px',
          padding: '1.75rem 2rem',
          color: '#FFFFFF',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          boxShadow: '0 4px 20px rgba(12, 35, 40, 0.12)'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(45, 212, 191, 0.2)', color: '#2DD4BF', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            <FaPrescriptionBottleAlt size={12} />
            {getLabel('portalNav.digitalPrescriptions', 'Clinical Digital Prescriptions')}
          </div>
          <h1 style={{ margin: '0 0 0.35rem 0', fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
            {getLabel('portalNav.myPrescriptions', 'My Prescriptions')}
          </h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#CCFBF1' }}>
            {getLabel('portalNav.prescriptionsSubtitle', 'Official prescriptions issued by licensed doctors during your consultations.')}
          </p>
        </div>

        <button
          type="button"
          onClick={loadPrescriptions}
          disabled={loading}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            padding: '0.6rem 1.15rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backdropFilter: 'blur(4px)'
          }}
        >
          <FaSync className={loading ? 'animate-spin' : ''} size={13} />
          {getLabel('doctorPortal.refresh', 'Refresh')}
        </button>
      </div>

      {/* Search Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <FaSearch style={{ color: '#94A3B8' }} />
        <input
          type="text"
          placeholder={getLabel('portalNav.searchPrescriptions', 'Search by prescription ID, doctor name, hospital, or diagnosis...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            fontSize: '0.9rem',
            color: '#1E293B',
            fontFamily: 'inherit'
          }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Prescription Content */}
      {loading && prescriptions.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', gap: '1rem' }}>
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTopColor: '#0D9488', borderRadius: '50%' }} />
          <p style={{ color: '#0F766E', fontSize: '0.9rem', fontWeight: 600 }}>
            {getLabel('portalNav.loadingPrescriptions', 'Retrieving your digital prescriptions...')}
          </p>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            border: '1px dashed #CBD5E1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#F0FDFA',
              color: '#0D9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              margin: '0 auto 1.25rem auto'
            }}
          >
            <FaPrescriptionBottleAlt />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
            {search ? 'No matching prescriptions found' : getLabel('portalNav.noPrescriptionsTitle', 'No prescriptions available yet.')}
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
            {search
              ? 'Try modifying your search query or check back later.'
              : getLabel('portalNav.noPrescriptionsDesc', 'Digital prescriptions issued by doctors during your appointments will appear here with full medication details and downloadable PDF records.')}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.25rem'
          }}
        >
          {filteredPrescriptions.map((rx) => {
            const medList = rx.medicines || [];
            const isDownloading = downloadingId === rx.id;
            const formattedDate = rx.created_at
              ? new Date(rx.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'N/A';

            return (
              <div
                key={rx.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Top Badge Row */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span
                      style={{
                        backgroundColor: '#F0FDFA',
                        color: '#0F766E',
                        border: '1px solid #CCFBF1',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                        fontFamily: 'monospace'
                      }}
                    >
                      {rx.prescription_number}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <FaCalendarAlt size={11} style={{ color: '#0D9488' }} />
                      {formattedDate}
                    </span>
                  </div>

                  {/* Doctor & Facility */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FaUserMd style={{ color: '#0D9488' }} size={15} />
                      {rx.doctor_name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginLeft: '1.35rem' }}>
                      {rx.doctor_specialization || 'Clinical Specialist'} • {rx.doctor_qualification}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginLeft: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                      <FaHospital size={11} style={{ color: '#0D9488' }} />
                      {rx.hospital_name}
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '8px',
                      padding: '0.75rem 0.95rem',
                      border: '1px solid #E2E8F0',
                      marginBottom: '0.85rem'
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0D9488', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      Primary Diagnosis
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                      {rx.diagnosis}
                    </div>
                    {rx.symptoms && (
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
                        {rx.symptoms}
                      </div>
                    )}
                  </div>

                  {/* Medications Snapshot */}
                  <div style={{ marginBottom: '1.15rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FaPills size={11} style={{ color: '#0D9488' }} />
                        Prescribed Medicines ({medList.length})
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {medList.slice(0, 3).map((m, mIdx) => (
                        <div
                          key={mIdx}
                          style={{
                            fontSize: '0.8rem',
                            color: '#1E293B',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #F1F5F9',
                            borderRadius: '6px',
                            padding: '0.35rem 0.6rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <strong>{m.name}</strong>{' '}
                            <span style={{ color: '#64748B', fontSize: '0.74rem' }}>({m.dosage})</span>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F766E', backgroundColor: '#CCFBF1', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            {m.frequency}
                          </span>
                        </div>
                      ))}
                      {medList.length > 3 && (
                        <div style={{ fontSize: '0.74rem', color: '#64748B', fontStyle: 'italic', paddingLeft: '0.25rem' }}>
                          +{medList.length - 3} more medications in full prescription
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div
                  style={{
                    display: 'flex',
                    gap: '0.65rem',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid #F1F5F9'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedRx(rx)}
                    style={{
                      flex: 1,
                      backgroundColor: '#0D9488',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 1px 3px rgba(13, 148, 136, 0.25)'
                    }}
                  >
                    <FaEye size={12} />
                    {getLabel('portalNav.viewPrescription', 'View Prescription')}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDownloadPdf(e, rx)}
                    disabled={isDownloading}
                    title="Download Official PDF"
                    style={{
                      backgroundColor: '#F8FAFC',
                      color: '#0F766E',
                      border: '1px solid #CBD5E1',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: isDownloading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <FaFilePdf size={13} />
                    {isDownloading ? '...' : 'PDF'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Viewer */}
      <PrescriptionViewerModal
        isOpen={Boolean(selectedRx)}
        onClose={() => setSelectedRx(null)}
        prescription={selectedRx}
      />
    </div>
  );
};

