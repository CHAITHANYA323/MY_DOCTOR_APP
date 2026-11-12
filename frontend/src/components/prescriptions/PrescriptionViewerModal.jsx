import React, { useState } from 'react';
import {
  FaTimes,
  FaFilePdf,
  FaPrint,
  FaHospital,
  FaUserMd,
  FaCalendarAlt,
  FaPrescriptionBottleAlt,
  FaShieldAlt,
  FaCheckCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { prescriptionService } from '../../services/prescriptionService';
import { useLanguage } from '../../context/LanguageContext';

export const PrescriptionViewerModal = ({ isOpen, onClose, prescription }) => {
  const { t } = useLanguage();
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !prescription) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await prescriptionService.downloadPrescriptionPdf(
        prescription.id,
        `${prescription.prescription_number || 'Prescription'}.pdf`
      );
      toast.success('Prescription PDF downloaded successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const medicines = prescription.medicines || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '840px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #CBD5E1',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0C2328 0%, #134E4A 100%)',
            color: '#FFFFFF',
            padding: '1.25rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(45, 212, 191, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(45, 212, 191, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2DD4BF',
                fontSize: '1.15rem'
              }}
            >
              <FaPrescriptionBottleAlt />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Digital Clinical Prescription
              </h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#99F6E4' }}>
                Ref: {prescription.prescription_number}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              style={{
                backgroundColor: '#0D9488',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <FaFilePdf size={12} />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <FaPrint size={12} />
              Print
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#99F6E4',
                fontSize: '1.25rem',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Prescription Document Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', backgroundColor: '#F8FAFC' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid #CBD5E1',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              color: '#1E293B'
            }}
          >
            {/* Header / Hospital Branding */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0D9488', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0F766E' }}>
                  MediConnect Health
                </h1>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0D9488', letterSpacing: '0.08em' }}>
                  DIGITAL CLINICAL WORKSPACE
                </span>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Verified Electronic Medical Records
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0C2328' }}>
                  {prescription.hospital_name || 'MediConnect Partner Hospital'}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  {prescription.hospital_address || 'Clinical Facilities & Healthcare Services'}
                </p>
                {prescription.hospital_phone && (
                  <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                    Tel: {prescription.hospital_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Doctor Info & Rx Meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0C2328' }}>
                  {prescription.doctor_name}
                </h4>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  {prescription.doctor_qualification} • {prescription.doctor_specialization}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                  Reg No: <strong>{prescription.doctor_reg_number}</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                <div><strong>Prescription No:</strong> {prescription.prescription_number}</div>
                <div><strong>Date:</strong> {prescription.created_at ? new Date(prescription.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</div>
                <div style={{ color: '#0D9488', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <FaCheckCircle size={10} /> Active Certified Rx
                </div>
              </div>
            </div>

            {/* Patient Box */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                border: '1px solid #E2E8F0',
                marginBottom: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                fontSize: '0.82rem'
              }}
            >
              <div><strong>Patient Name:</strong> {prescription.patient_name}</div>
              <div><strong>Patient ID:</strong> PID-{prescription.patient_id}</div>
              <div><strong>Age / Gender:</strong> {prescription.patient_age} / {prescription.patient_gender}</div>
              <div><strong>Contact:</strong> {prescription.patient_phone || 'Not Provided'}</div>
              <div><strong>Status:</strong> {prescription.status}</div>
            </div>

            {/* Diagnosis */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Primary Diagnosis & Observations
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                {prescription.diagnosis}
              </div>
              {prescription.symptoms && (
                <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.2rem' }}>
                  Findings: {prescription.symptoms}
                </div>
              )}
            </div>

            {/* Medications Table */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 800, color: '#0F766E', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '1.2rem', color: '#0D9488' }}>&#8478;</span>
                Prescribed Medications ({medicines.length})
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0D9488', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem', width: '30px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '0.5rem' }}>Medicine & Dosage</th>
                    <th style={{ padding: '0.5rem' }}>Frequency</th>
                    <th style={{ padding: '0.5rem' }}>Duration</th>
                    <th style={{ padding: '0.5rem' }}>Timing & Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((m, idx) => (
                    <tr
                      key={idx}
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                        borderBottom: '1px solid #E2E8F0'
                      }}
                    >
                      <td style={{ padding: '0.55rem', textAlign: 'center', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ padding: '0.55rem' }}>
                        <strong style={{ color: '#0F172A' }}>{m.name}</strong>
                        {m.dosage && <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Dose: {m.dosage}</div>}
                      </td>
                      <td style={{ padding: '0.55rem', fontWeight: 700 }}>{m.frequency}</td>
                      <td style={{ padding: '0.55rem' }}>{m.duration}</td>
                      <td style={{ padding: '0.55rem' }}>
                        <strong>{m.timing}</strong>
                        {m.instructions && <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{m.instructions}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Advice & Instructions */}
            {(prescription.additional_advice || prescription.follow_up_date) && (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  border: '1px solid #E2E8F0',
                  marginBottom: '1.5rem',
                  fontSize: '0.82rem'
                }}
              >
                {prescription.additional_advice && (
                  <div style={{ marginBottom: prescription.follow_up_date ? '0.4rem' : 0 }}>
                    <strong>General & Dietary Advice:</strong> {prescription.additional_advice}
                  </div>
                )}
                {prescription.follow_up_date && (
                  <div style={{ color: '#0D9488', fontWeight: 700 }}>
                    Follow-Up Review: Schedule review on or before {prescription.follow_up_date}.
                  </div>
                )}
              </div>
            )}

            {/* Signature & Security Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                <div>Security ID: <code>{prescription.prescription_number}</code></div>
                <div>Digitally verified via MediConnect Clinical Gateway</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ borderBottom: '1px solid #94A3B8', width: '180px', marginBottom: '0.35rem' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                  {prescription.doctor_name}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  {prescription.doctor_specialization} • {prescription.doctor_reg_number}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '1rem 1.75rem',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
            Official electronic prescription valid across licensed pharmacies.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#F1F5F9',
              color: '#475569',
              border: '1px solid #CBD5E1',
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

