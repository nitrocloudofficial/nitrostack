'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ShieldAlert, FileText, UserCheck, Merge, AlertTriangle, Eye, Edit3, Trash2, Sparkles, Inbox } from 'lucide-react';

interface IntakeVerificationDrawerProps {
  isOpen: boolean;
  packageId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function IntakeVerificationDrawer({ isOpen, packageId, onClose, onSuccess }: IntakeVerificationDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [packageData, setPackageData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  const [selectedMergePatientId, setSelectedMergePatientId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'FIELDS' | 'DOCUMENTS' | 'MERGE'>('FIELDS');
  const [selectedAttachmentOcr, setSelectedAttachmentOcr] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => {
    if (isOpen && packageId) {
      fetchPackageDetails();
      fetchPatientsList();
    }
  }, [isOpen, packageId]);

  const fetchPackageDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/intake/packages/${packageId}`);
      if (res.ok) {
        const json = await res.json();
        setPackageData(json.package);
        setProfile(json.package.extractedPatient || {});
      }
    } catch (e) {
      console.error('Error fetching intake package:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientsList = async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const json = await res.json();
        setExistingPatients(json.patients || []);
      }
    } catch (e) {
      console.error('Error fetching patients list:', e);
    }
  };

  if (!isOpen || !packageId) return null;

  const handleFieldChange = (key: string, value: any) => {
    setProfile((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleNestedFieldChange = (parentKey: string, childKey: string, value: any) => {
    setProfile((prev: any) => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey] || {}),
        [childKey]: value
      }
    }));
  };

  const handleArrayChange = (key: string, valueStr: string) => {
    const arr = valueStr.split(',').map(s => s.trim());
    setProfile((prev: any) => ({ ...prev, [key]: arr }));
  };

  const handleVerifyAction = async (action: 'APPROVE' | 'REJECT' | 'MERGE') => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        action,
        editedProfile: profile,
        rejectionReason: action === 'REJECT' ? rejectionReason : undefined,
        targetPatientId: action === 'MERGE' ? selectedMergePatientId : undefined
      };

      const res = await fetch(`/api/intake/packages/${packageId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const json = await res.json();
        alert(`Verification action failed: ${json.message}`);
      }
    } catch (err) {
      console.error('Error verifying package:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Inbox size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Autonomous Patient Intake Verification</h2>
                <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-bold">
                  {packageData?.packageNumber || 'PKG-PENDING'}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {packageData?.status || 'PENDING VERIFICATION'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                From: <span className="text-slate-200">{packageData?.senderEmail}</span> • {packageData?.subject}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-4 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('FIELDS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${activeTab === 'FIELDS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Edit3 size={14} />
            <span>Extracted Clinical Fields (17)</span>
          </button>
          <button
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${activeTab === 'DOCUMENTS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <FileText size={14} />
            <span>Attachments & OCR Text ({packageData?.attachments?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('MERGE')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${activeTab === 'MERGE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Merge size={14} />
            <span>Merge with Existing Patient</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="p-12 text-center text-slate-400 animate-pulse">Loading extracted intake evidence...</div>
          ) : activeTab === 'FIELDS' && profile ? (
            <div className="space-y-6">
              <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-indigo-300">
                  <Sparkles size={16} className="text-indigo-400" />
                  <span>AI Extracted & Merged Evidence Across {packageData?.attachments?.length || 1} Attachments (Confidence: {Math.round((profile.confidenceScore || 0.96) * 100)}%)</span>
                </div>
                <span className="font-mono text-slate-400">Review & edit any field before database approval</span>
              </div>

              {/* 1. Demographics & Contacts */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">1. Patient Demographics & Contact</h3>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profile.name || ''}
                      onChange={e => handleFieldChange('name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={profile.dob || ''}
                      onChange={e => handleFieldChange('dob', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Gender</label>
                    <select
                      value={profile.gender || 'Female'}
                      onChange={e => handleFieldChange('gender', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={profile.phone || ''}
                      onChange={e => handleFieldChange('phone', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={profile.email || ''}
                      onChange={e => handleFieldChange('email', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Blood Group</label>
                    <input
                      type="text"
                      value={profile.bloodGroup || ''}
                      onChange={e => handleFieldChange('bloodGroup', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg font-mono"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-slate-400 block mb-1">Address</label>
                    <input
                      type="text"
                      value={profile.address || ''}
                      onChange={e => handleFieldChange('address', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Insurance & Emergency Contact */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">2. Insurance & Emergency Contact</h3>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Insurance Provider</label>
                    <input
                      type="text"
                      value={profile.insurance?.provider || ''}
                      onChange={e => handleNestedFieldChange('insurance', 'provider', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Policy Number</label>
                    <input
                      type="text"
                      value={profile.insurance?.policyNumber || ''}
                      onChange={e => handleNestedFieldChange('insurance', 'policyNumber', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={profile.emergencyContact?.name || ''}
                      onChange={e => handleNestedFieldChange('emergencyContact', 'name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Allergies & Clinical History */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">3. Allergies, Medical History & Medications</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Known Allergies (comma separated)</label>
                    <textarea
                      rows={2}
                      value={Array.isArray(profile.knownAllergies) ? profile.knownAllergies.join(', ') : profile.knownAllergies || ''}
                      onChange={e => handleArrayChange('knownAllergies', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Medical History / Chronic Conditions</label>
                    <textarea
                      rows={2}
                      value={Array.isArray(profile.medicalHistory) ? profile.medicalHistory.join(', ') : profile.medicalHistory || ''}
                      onChange={e => handleArrayChange('medicalHistory', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Current Medications</label>
                    <textarea
                      rows={2}
                      value={Array.isArray(profile.currentMedications) ? profile.currentMedications.join(', ') : profile.currentMedications || ''}
                      onChange={e => handleArrayChange('currentMedications', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Previous Surgeries & Family History</label>
                    <textarea
                      rows={2}
                      value={Array.isArray(profile.previousSurgeries) ? profile.previousSurgeries.join(', ') : profile.previousSurgeries || ''}
                      onChange={e => handleArrayChange('previousSurgeries', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Vitals & Risk Factors */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">4. Extracted Vitals & Risk Classification</h3>
                <div className="grid grid-cols-6 gap-3 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">BP Systolic</label>
                    <input
                      type="number"
                      value={profile.vitals?.bpSystolic || 120}
                      onChange={e => handleNestedFieldChange('vitals', 'bpSystolic', parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-2.5 py-1.5 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">BP Diastolic</label>
                    <input
                      type="number"
                      value={profile.vitals?.bpDiastolic || 80}
                      onChange={e => handleNestedFieldChange('vitals', 'bpDiastolic', parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-2.5 py-1.5 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Heart Rate</label>
                    <input
                      type="number"
                      value={profile.vitals?.heartRate || 72}
                      onChange={e => handleNestedFieldChange('vitals', 'heartRate', parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-2.5 py-1.5 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Resp Rate</label>
                    <input
                      type="number"
                      value={profile.vitals?.respRate || 18}
                      onChange={e => handleNestedFieldChange('vitals', 'respRate', parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-2.5 py-1.5 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Temp (°F)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={profile.vitals?.temperature || 98.6}
                      onChange={e => handleNestedFieldChange('vitals', 'temperature', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-2.5 py-1.5 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">SpO2 (%)</label>
                    <input
                      type="number"
                      value={profile.vitals?.spO2 || 98}
                      onChange={e => handleNestedFieldChange('vitals', 'spO2', parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-2.5 py-1.5 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'DOCUMENTS' ? (
            <div className="space-y-4 text-xs">
              <h3 className="text-xs font-bold text-slate-300 uppercase">Uploaded Attachments & Raw OCR</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  {packageData?.attachments?.map((att: any) => (
                    <div
                      key={att.id}
                      onClick={() => setSelectedAttachmentOcr(att.ocrText || 'No OCR text extracted.')}
                      className="p-3 bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 rounded-xl flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-indigo-400" />
                        <div>
                          <p className="font-bold text-white">{att.fileName}</p>
                          <p className="text-[10px] text-slate-400">{att.documentType} • {att.fileSize} bytes</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded">
                        View OCR Text
                      </span>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-y-auto max-h-[350px]">
                  <p className="text-slate-500 font-bold mb-2 uppercase">OCR Raw Content Preview:</p>
                  <pre className="whitespace-pre-wrap">{selectedAttachmentOcr || 'Click any attachment on the left to inspect raw extracted OCR text.'}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <h3 className="text-xs font-bold text-indigo-400 uppercase">Merge with Existing Patient Profile</h3>
              <p className="text-slate-400">Select an existing patient from the database to merge all extracted clinical history, allergies, medications, and attachments into their record.</p>

              <div className="space-y-3 max-w-md">
                <label className="text-slate-300 block font-bold">Target Patient</label>
                <select
                  value={selectedMergePatientId}
                  onChange={e => setSelectedMergePatientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2.5 rounded-xl"
                >
                  <option value="">-- Select Patient to Merge --</option>
                  {existingPatients.map(p => (
                    <option key={p.patientId} value={p.patientId}>
                      {p.name} (MRN: {p.patientId}) - {p.gender}, DOB: {p.dateOfBirth}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between sticky bottom-0 z-10">
          <div className="flex items-center gap-3">
            {showRejectInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Reason for rejection..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="bg-slate-950 border border-red-500/50 text-white text-xs px-3 py-1.5 rounded-lg w-64"
                />
                <button
                  onClick={() => handleVerifyAction('REJECT')}
                  disabled={isSubmitting || !rejectionReason}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                >
                  Confirm Reject
                </button>
                <button onClick={() => setShowRejectInput(false)} className="text-slate-400 text-xs hover:text-white px-2">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowRejectInput(true)}
                className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-950/40 border border-red-900/40 transition"
              >
                <AlertTriangle size={15} />
                <span>Reject Package</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs font-bold px-4 py-2 rounded-xl transition"
            >
              Cancel
            </button>

            {activeTab === 'MERGE' ? (
              <button
                onClick={() => handleVerifyAction('MERGE')}
                disabled={isSubmitting || !selectedMergePatientId}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition"
              >
                <Merge size={16} />
                <span>{isSubmitting ? 'Merging...' : 'Confirm Merge Patient'}</span>
              </button>
            ) : (
              <button
                onClick={() => handleVerifyAction('APPROVE')}
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-900/30 transition"
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Registering...' : 'Approve & Create Digital Folder'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
