import React, { useState, useEffect } from 'react';
import {
  FaTimes,
  FaPlus,
  FaTrash,
  FaFilePdf,
  FaPrint,
  FaEye,
  FaEdit,
  FaCheckCircle,
  FaStethoscope,
  FaHospital,
  FaUserMd,
  FaCalendarAlt,
  FaPrescriptionBottleAlt,
  FaInfoCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useLanguage } from '../../context/LanguageContext';
import { doctorService } from '../../services/doctorService';
import { formatDoctorDisplayName, cleanDoctorName } from '../../utils/doctorNameUtils';

export const DigitalPrescriptionModal = ({
  isOpen,
  onClose,
  initialData = {}, // patient_id, patient_name, appointment_id, doctor, hospital
  onSuccess
}) => {
  const { t, language } = useLanguage();

  const getLabel = (key, fallback) => {
    const val = t(key);
    return !val || val === key ? fallback : val;
  };

  const [mode, setMode] = useState('edit'); // 'edit' | 'preview'
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [createdRx, setCreatedRx] = useState(null);

  // Form State
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [patientPhone, setPatientPhone] = useState('');
  const [appointmentId, setAppointmentId] = useState(null);
  const [markComplete, setMarkComplete] = useState(true);

  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [additionalAdvice, setAdditionalAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');

  // Medicines List
  const [medicines, setMedicines] = useState([
    {
      name: '',
      dosage: '1 Tablet',
      frequency: '1-0-1',
      duration: '5 Days',
      timing: 'After Food',
      instructions: ''
    }
  ]);

  useEffect(() => {
    if (isOpen) {
      setMode('edit');
      setCreatedRx(null);
      setPatientId(initialData.patient_id || initialData.user_id || '');
      setPatientName(initialData.patient_name || initialData.patientName || '');
      setPatientAge(initialData.patient_age || initialData.age || '35 Yrs');
      setPatientGender(initialData.patient_gender || initialData.gender || 'Male');
      setPatientPhone(initialData.patient_phone || initialData.phone || '');
      setAppointmentId(initialData.appointment_id || initialData.id || null);
      setDiagnosis(initialData.reason || initialData.diagnosis || '');
      setSymptoms(initialData.notes || initialData.symptoms || '');
      setAdditionalAdvice('Drink adequate fluids, maintain light low-sodium diet, and rest.');
      setNotes('');
      setMedicines([
        {
          name: '',
          dosage: '1 Tablet',
          frequency: '1-0-1',
          duration: '5 Days',
          timing: 'After Food',
          instructions: ''
        }
      ]);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleAddMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      {
        name: '',
        dosage: '1 Tablet',
        frequency: '1-0-1',
        duration: '5 Days',
        timing: 'After Food',
        instructions: ''
      }
    ]);
  };

  const handleRemoveMedicine = (index) => {
    if (medicines.length <= 1) {
      toast.info('At least one medication is required.');
      return;
    }
    setMedicines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMedicineChange = (index, field, value) => {
    setMedicines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSavePrescription = async () => {
    if (!diagnosis.trim()) {
      toast.warning('Please enter a clinical diagnosis.');
      return;
    }

    const invalidMed = medicines.find((m) => !m.name.trim());
    if (invalidMed) {
      toast.warning('Please enter a medicine name for all prescribed items.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        patient_id: patientId,
        patient_age: patientAge,
        patient_gender: patientGender,
        patient_phone: patientPhone,
        appointment_id: appointmentId,
        mark_completed: markComplete,
        diagnosis: diagnosis.trim(),
        symptoms: symptoms.trim(),
        medicines: medicines.map((m) => ({
          name: m.name.trim(),
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          duration: m.duration.trim(),
          timing: m.timing.trim(),
          instructions: m.instructions.trim()
        })),
        additional_advice: additionalAdvice.trim(),
        follow_up_date: followUpDate,
        notes: notes.trim()
      };

      const res = await doctorService.createPrescription(payload);
      if (res.success) {
        toast.success(res.message || 'Prescription created successfully!');
        setCreatedRx(res.prescription);
        setMode('preview');
        if (onSuccess) onSuccess(res.prescription);
      } else {
        toast.error(res.message || 'Failed to create prescription.');
      }
    } catch (err) {
      console.error('Error saving prescription:', err);
      toast.error(err.response?.data?.message || 'Error issuing digital prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!createdRx) return;
    try {
      setDownloading(true);
      await doctorService.downloadPrescriptionPdf(
        createdRx.id,
        `${createdRx.prescription_number}.pdf`
      );
      toast.success('Prescription PDF downloaded successfully.');
    } catch (err) {
      console.error('Error downloading PDF:', err);
      toast.error('Failed to download prescription PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
          maxWidth: '920px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #CBD5E1',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
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
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(45, 212, 191, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2DD4BF',
                fontSize: '1.2rem'
              }}
            >
              <FaPrescriptionBottleAlt />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                {createdRx
                  ? getLabel('doctorPortal.viewPrescription', 'Digital Clinical Prescription')
                  : getLabel('doctorPortal.issuePrescription', 'Issue Digital Clinical Prescription')}
              </h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#CCFBF1' }}>
                {createdRx
                  ? `Prescription ID: ${createdRx.prescription_number}`
                  : getLabel('doctorPortal.prescriptionSubtitle', 'Standardized medical prescription compliant with clinical guidelines')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {createdRx && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setMode(mode === 'preview' ? 'edit' : 'preview')}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
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
                  {mode === 'preview' ? <FaEdit size={12} /> : <FaEye size={12} />}
                  {mode === 'preview' ? 'Edit Details' : 'Preview Rx'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
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
              </div>
            )}
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

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: '#F8FAFC' }}>
          {mode === 'edit' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Patient Banner */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '1.15rem 1.35rem',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#0D9488',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Patient Profile
                  </span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                    {patientName || 'Patient'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                    ID: PID-{patientId} • Age: {patientAge} • Sex: {patientGender}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#475569' }}>
                  {patientPhone && (
                    <div>
                      <strong style={{ color: '#0F172A' }}>Contact:</strong> {patientPhone}
                    </div>
                  )}
                  {appointmentId && (
                    <div>
                      <strong style={{ color: '#0F172A' }}>Consultation ID:</strong> #{appointmentId}
                    </div>
                  )}
                </div>
              </div>

              {/* Clinical Assessment Section */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '1.25rem 1.35rem',
                  border: '1px solid #E2E8F0'
                }}
              >
                <h3
                  style={{
                    margin: '0 0 1rem 0',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#0F766E',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FaStethoscope />
                  Clinical Diagnosis & Observations
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Primary Diagnosis <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acute Bronchitis, Essential Hypertension Stage 1"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Clinical Symptoms & Findings
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Cough for 4 days, mild fever 99.4°F, clear chest on auscultation"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Medication Table Section */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '1.25rem 1.35rem',
                  border: '1px solid #E2E8F0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: '#0F766E',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem', color: '#0D9488' }}>&#8478;</span>
                    Prescribed Medications ({medicines.length})
                  </h3>

                  <button
                    type="button"
                    onClick={handleAddMedicine}
                    style={{
                      backgroundColor: '#F0FDFA',
                      color: '#0F766E',
                      border: '1px solid #99F6E4',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <FaPlus size={10} />
                    Add Medicine
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {medicines.map((med, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderRadius: '10px',
                        padding: '1rem',
                        border: '1px solid #E2E8F0',
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 36px',
                        gap: '0.65rem',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '0.2rem' }}>
                          Medicine & Strength <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Amoxicillin 500mg"
                          value={med.name}
                          onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '0.2rem' }}>
                          Dosage Form
                        </label>
                        <input
                          type="text"
                          placeholder="1 Tablet"
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.85rem',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '0.2rem' }}>
                          Frequency
                        </label>
                        <select
                          value={med.frequency}
                          onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.85rem',
                            backgroundColor: '#FFFFFF',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="1-0-1">1-0-1 (Twice daily)</option>
                          <option value="1-1-1">1-1-1 (Thrice daily)</option>
                          <option value="1-0-0">1-0-0 (Morning)</option>
                          <option value="0-0-1">0-0-1 (Night)</option>
                          <option value="0-1-0">0-1-0 (Afternoon)</option>
                          <option value="SOS">SOS (As needed)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '0.2rem' }}>
                          Duration
                        </label>
                        <input
                          type="text"
                          placeholder="5 Days"
                          value={med.duration}
                          onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.85rem',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '0.2rem' }}>
                          Timing / Instructions
                        </label>
                        <select
                          value={med.timing}
                          onChange={(e) => handleMedicineChange(idx, 'timing', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.85rem',
                            backgroundColor: '#FFFFFF',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="After Food">After Food</option>
                          <option value="Before Food">Before Food</option>
                          <option value="With Water">With Water</option>
                          <option value="At Bedtime">At Bedtime</option>
                        </select>
                      </div>

                      <div style={{ paddingTop: '1.1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicine(idx)}
                          title="Remove Medication"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            padding: '0.35rem'
                          }}
                        >
                          <FaTrash size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advice & Follow-Up Section */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '1.25rem 1.35rem',
                  border: '1px solid #E2E8F0',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.25rem'
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    General & Dietary Advice
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Dietary instructions, physical activity, restrictions"
                    value={additionalAdvice}
                    onChange={(e) => setAdditionalAdvice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Follow-Up Review Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Consultation Completion Checkbox */}
              {appointmentId && (
                <div
                  style={{
                    backgroundColor: '#ECFDF5',
                    borderRadius: '10px',
                    padding: '0.85rem 1.15rem',
                    border: '1px solid #A7F3D0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                >
                  <input
                    type="checkbox"
                    id="markComplete"
                    checked={markComplete}
                    onChange={(e) => setMarkComplete(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#059669', cursor: 'pointer' }}
                  />
                  <label htmlFor="markComplete" style={{ fontSize: '0.85rem', color: '#065F46', fontWeight: 600, cursor: 'pointer' }}>
                    Automatically update linked appointment status to <strong>Completed</strong> and append prescription summary to visit notes.
                  </label>
                </div>
              )}
            </div>
          ) : (
            /* PREVIEW / CLINICAL SHEET MODE */
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '2.5rem',
                border: '1px solid #CBD5E1',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                maxWidth: '780px',
                margin: '0 auto',
                color: '#1E293B'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0D9488', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#0F766E' }}>
                    MediConnect Health
                  </h1>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0D9488', letterSpacing: '0.08em' }}>
                    DIGITAL CLINICAL WORKSPACE
                  </span>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                    Healthcare Network of AP & Telangana
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0C2328' }}>
                    {createdRx?.hospital_name || initialData.hospital_name || 'Reliability General Hospital'}
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                    {createdRx?.hospital_address || initialData.hospital_address || 'Clinical Facilities & Diagnostic Care'}
                  </p>
                  <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                    Tel: {createdRx?.hospital_phone || initialData.hospital_phone || '+91 40 2345 6789'}
                  </p>
                </div>
              </div>

              {/* Doctor & Prescription Details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0C2328' }}>
                    {createdRx?.doctor_name || initialData.doctor_name || 'Dr. Rajesh Kumar'}
                  </h4>
                  <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                    {createdRx?.doctor_qualification || 'MBBS, MD'} • {createdRx?.doctor_specialization || 'Cardiology'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                    Medical Council Reg No: <strong>{createdRx?.doctor_reg_number || 'NMC/TS/2018/04231'}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                  <div><strong>Prescription No:</strong> {createdRx?.prescription_number || 'PREVIEW-DRAFT'}</div>
                  <div><strong>Date:</strong> {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div style={{ color: '#0D9488', fontWeight: 700 }}>Official Digital Rx</div>
                </div>
              </div>

              {/* Patient Demographics Box */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  border: '1px solid #E2E8F0',
                  marginBottom: '1.25rem',
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr 1fr',
                  gap: '0.75rem',
                  fontSize: '0.85rem'
                }}
              >
                <div><strong>Patient Name:</strong> {patientName}</div>
                <div><strong>Patient ID:</strong> PID-{patientId}</div>
                <div><strong>Age / Sex:</strong> {patientAge} / {patientGender}</div>
                <div><strong>Contact:</strong> {patientPhone || 'Not Provided'}</div>
                <div><strong>Encounter:</strong> Clinical Consultation</div>
                <div><strong>Status:</strong> Active</div>
              </div>

              {/* Clinical Diagnosis */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Clinical Diagnosis & Observations
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                  {diagnosis}
                </div>
                {symptoms && (
                  <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.2rem' }}>
                    Findings: {symptoms}
                  </div>
                )}
              </div>

              {/* Medicines Table */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 800, color: '#0F766E', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '1.2rem', color: '#0D9488' }}>&#8478;</span>
                  Prescribed Medications
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
                          <strong style={{ color: '#0F172A' }}>{m.name || 'Medicine'}</strong>
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
              {(additionalAdvice || followUpDate) && (
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
                  {additionalAdvice && (
                    <div style={{ marginBottom: followUpDate ? '0.5rem' : 0 }}>
                      <strong>Advice & Diet:</strong> {additionalAdvice}
                    </div>
                  )}
                  {followUpDate && (
                    <div style={{ color: '#0D9488', fontWeight: 700 }}>
                      Follow-Up Review: Schedule on or before {followUpDate}.
                    </div>
                  )}
                </div>
              )}

              {/* Signature Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  <div>Security Token: <code>{createdRx?.prescription_number || 'PREVIEW-TOKEN'}</code></div>
                  <div>Verified via MediConnect Clinical Gateway</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ borderBottom: '1px solid #94A3B8', width: '180px', marginBottom: '0.35rem' }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                    {createdRx?.doctor_name || 'Dr. Rajesh Kumar'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    Authorized Medical Practitioner
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '1rem 1.75rem',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FaInfoCircle style={{ color: '#0D9488' }} />
            {mode === 'edit'
              ? 'All prescribed medicines are validated and snapshotted for medical fidelity.'
              : 'Prescription is ready. You can download or print directly.'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: '#F1F5F9',
                color: '#475569',
                border: '1px solid #CBD5E1',
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {createdRx ? 'Close' : 'Cancel'}
            </button>

            {mode === 'edit' && !createdRx && (
              <button
                type="button"
                onClick={handleSavePrescription}
                disabled={submitting}
                style={{
                  backgroundColor: '#0D9488',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.55rem 1.35rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 4px rgba(13, 148, 136, 0.2)'
                }}
              >
                <FaCheckCircle />
                {submitting ? 'Generating Prescription...' : 'Save & Issue Prescription'}
              </button>
            )}

            {createdRx && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading}
                style={{
                  backgroundColor: '#0D9488',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.55rem 1.35rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <FaFilePdf />
                {downloading ? 'Downloading...' : 'Download PDF'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

