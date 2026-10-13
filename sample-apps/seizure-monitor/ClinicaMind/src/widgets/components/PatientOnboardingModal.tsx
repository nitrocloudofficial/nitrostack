'use client';

import React, { useState } from 'react';
import { X, Upload, CheckCircle2, UserPlus, FileText, ShieldCheck } from 'lucide-react';

interface PatientOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PatientOnboardingModal({ isOpen, onClose, onSuccess }: PatientOnboardingModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    age: 35,
    gender: 'Female',
    dateOfBirth: '1991-05-12',
    phone: '',
    email: '',
    address: '',
    emergencyContact: { name: '', relationship: 'Spouse', phone: '' },
    insurance: { provider: '', policyNumber: '', groupNumber: '' },
    lifestyle: { smoking: 'Never' as const, alcohol: 'None' as const, exercise: '3x/week', diet: 'Balanced' },
    familyHistory: '',
    pastSurgeries: '',
    conditions: '',
    allergies: '',
    medications: '',
    recentLabs: '',
    riskCategory: 'LOW RISK' as const
  });

  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; category: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (category: string) => {
    const fileName = `Uploaded_${category.replace(/\s+/g, '_')}_${Date.now().toString().slice(-4)}.pdf`;
    setUploadedFiles(prev => [...prev, { name: fileName, category }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        familyHistory: formData.familyHistory ? formData.familyHistory.split(',').map(s => s.trim()) : [],
        pastSurgeries: formData.pastSurgeries ? formData.pastSurgeries.split(',').map(s => s.trim()) : [],
        conditions: formData.conditions ? formData.conditions.split(',').map(s => s.trim()) : ['None'],
        allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()) : ['None known'],
        medications: formData.medications ? formData.medications.split(',').map(s => s.trim()) : ['None'],
        recentLabs: formData.recentLabs ? formData.recentLabs.split(',').map(s => s.trim()) : ['Normal baseline']
      };

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Error creating patient:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadCategories = [
    'Patient Photograph', 'Government ID', 'Insurance Card', 'Prescription Image',
    'Medical History PDF', 'Hospital Records', 'MRI Scan', 'CT Scan',
    'X-ray Image', 'ECG Report', 'Blood Report', 'Ultrasound'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold">New Patient Digital Folder Onboarding</h2>
              <p className="text-xs text-slate-400">Create permanent EMR record and upload clinical history files</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Personal Details */}
          <div className="space-y-3">
            <h3 className="font-bold text-indigo-300 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1">1. Personal Information</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Age / Gender</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.age}
                    onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                    className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="patient@example.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="Street, City, State"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact & Insurance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-bold text-indigo-300 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1">2. Emergency Contact</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Contact Name"
                  value={formData.emergencyContact.name}
                  onChange={e => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, name: e.target.value } })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Relationship"
                    value={formData.emergencyContact.relationship}
                    onChange={e => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, relationship: e.target.value } })}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={formData.emergencyContact.phone}
                    onChange={e => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, phone: e.target.value } })}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-indigo-300 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1">3. Insurance Info</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Insurance Provider"
                  value={formData.insurance.provider}
                  onChange={e => setFormData({ ...formData, insurance: { ...formData.insurance, provider: e.target.value } })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Policy Number"
                    value={formData.insurance.policyNumber}
                    onChange={e => setFormData({ ...formData, insurance: { ...formData.insurance, policyNumber: e.target.value } })}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Group Number"
                    value={formData.insurance.groupNumber}
                    onChange={e => setFormData({ ...formData, insurance: { ...formData.insurance, groupNumber: e.target.value } })}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Medical History & Allergies */}
          <div className="space-y-3">
            <h3 className="font-bold text-indigo-300 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1">4. Clinical History & Allergies</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Documented Allergies (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa"
                  value={formData.allergies}
                  onChange={e => setFormData({ ...formData, allergies: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Active Prescriptions (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Metformin 500mg, Lisinopril 10mg"
                  value={formData.medications}
                  onChange={e => setFormData({ ...formData, medications: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Chronic Conditions</label>
                <input
                  type="text"
                  placeholder="e.g. Type 2 Diabetes, Hypertension"
                  value={formData.conditions}
                  onChange={e => setFormData({ ...formData, conditions: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Risk Stratification Category</label>
                <select
                  value={formData.riskCategory}
                  onChange={e => setFormData({ ...formData, riskCategory: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="LOW RISK">LOW RISK</option>
                  <option value="MODERATE RISK">MODERATE RISK</option>
                  <option value="HIGH RISK">HIGH RISK</option>
                  <option value="CRITICAL RISK">CRITICAL RISK</option>
                </select>
              </div>
            </div>
          </div>

          {/* Upload Digital Documents Folder */}
          <div className="space-y-3">
            <h3 className="font-bold text-indigo-300 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1">5. Digital Folder Uploads</h3>
            <div className="grid grid-cols-4 gap-2">
              {uploadCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleFileUpload(cat)}
                  className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center justify-between text-[11px] text-slate-300 transition"
                >
                  <span>{cat}</span>
                  <Upload size={12} className="text-indigo-400" />
                </button>
              ))}
            </div>

            {uploadedFiles.length > 0 && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Files attached to digital folder ({uploadedFiles.length}):</span>
                <div className="flex flex-wrap gap-1.5">
                  {uploadedFiles.map((f, i) => (
                    <span key={i} className="bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-emerald-400" /> {f.category}: {f.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              {isSubmitting ? 'Onboarding...' : 'Create Digital Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
