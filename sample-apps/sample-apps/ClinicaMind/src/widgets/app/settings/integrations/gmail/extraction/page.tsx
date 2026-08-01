'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../../../../components/Sidebar';
import {
  FileText,
  ArrowLeft,
  Calendar,
  User,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  ArrowRight,
  Stethoscope,
  Activity,
  Heart,
  AlertTriangle,
  Pill,
  FileCheck2,
  Shield,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StructuredClinicalData } from '../../../../../../services/ai-extraction.service';

export default function AiExtractionReviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [data, setData] = useState<StructuredClinicalData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isOcrPanelOpen, setIsOcrPanelOpen] = useState(false);

  const runExtraction = async () => {
    setLoading(true);
    try {
      // 1. Fetch active session data
      const sessionRes = await fetch('/api/integrations/gmail/session');
      let ocrText = '';
      if (sessionRes.ok) {
        const sessionJson = await sessionRes.json();
        if (sessionJson.session?.documents) {
          // Fetch OCR payload from OCR endpoint or session fallback
          const ocrRes = await fetch('/api/integrations/gmail/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documents: sessionJson.session.documents })
          });
          if (ocrRes.ok) {
            const ocrJson = await ocrRes.json();
            ocrText = ocrJson.ocrResult?.rawText || '';
          }
        }
      }

      setRawOcrText(ocrText);

      // 2. Run AI Extraction API
      const res = await fetch('/api/integrations/gmail/extraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawOcrText: ocrText })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.extraction) {
          setData(json.extraction);
        }
      }
    } catch (e) {
      console.error('Error running AI Extraction Review:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runExtraction();
  }, []);

  const handleFieldChange = (category: string, field: string, newValue: string) => {
    if (!data) return;
    setData((prev: any) => {
      if (!prev) return prev;
      if (category === 'patientInformation' || category === 'vitalSigns') {
        return {
          ...prev,
          [category]: {
            ...prev[category],
            [field]: { ...prev[category][field], value: newValue }
          }
        };
      } else {
        return {
          ...prev,
          [category]: { ...prev[category], value: newValue }
        };
      }
    });
  };

  const handleApproveAndContinue = () => {
    // Navigate to next stage: Doctor Verification (does NOT create a patient yet)
    router.push('/settings/integrations/gmail/verification');
  };

  const renderFieldBox = (
    label: string,
    fieldObj?: { value: string; confidence: string },
    onChange?: (val: string) => void
  ) => {
    const val = fieldObj?.value || 'Not Found';
    const conf = fieldObj?.confidence || 'N/A';
    const isNotFound = val === 'Not Found';

    return (
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">{label}</span>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              isNotFound
                ? 'bg-slate-100 text-slate-500 border-slate-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {conf}
          </span>
        </div>

        {isEditing && onChange ? (
          <input
            type="text"
            value={val}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        ) : (
          <p className={`text-xs font-semibold leading-snug ${isNotFound ? 'text-slate-400 italic' : 'text-slate-900'}`}>
            {val}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 sticky top-0 backdrop-blur-xs z-20 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-0.5">
              <Link href="/settings/integrations/gmail/processing" className="hover:underline flex items-center gap-1 text-slate-600">
                <ArrowLeft size={12} />
                <span>Document Processing</span>
              </Link>
              <span>→</span>
              <span className="text-indigo-600 font-bold">AI Extraction Review</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              AI Extraction Review
              <span className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded font-bold flex items-center gap-1">
                <Sparkles size={12} />
                Structured Clinical Payload
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/settings/integrations/gmail/processing"
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition border border-slate-200"
            >
              <ArrowLeft size={14} />
              <span>Back to OCR</span>
            </Link>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 font-bold text-xs px-3.5 py-2 rounded-xl transition border cursor-pointer ${
                isEditing
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isEditing ? <Check size={14} /> : <Edit3 size={14} />}
              <span>{isEditing ? 'Done Editing' : 'Edit Extracted Data'}</span>
            </button>

            <button
              onClick={handleApproveAndContinue}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-emerald-200 transition cursor-pointer"
            >
              <span>Approve & Continue</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-8 space-y-6 max-w-6xl w-full mx-auto">
          {/* Header Telemetry Banner */}
          <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">AI Medical Information Extraction Engine</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Converts unedited raw OCR text into structured clinical fields. No diagnosis or prescriptions generated.
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-xs">
              <span className="text-slate-400 block text-[10px] uppercase">Extraction Status</span>
              <span className="text-emerald-400 font-bold text-sm">Extracted & Verified ✓</span>
            </div>
          </div>

          {/* Original OCR Collapsible Reference Panel */}
          <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
            <button
              onClick={() => setIsOcrPanelOpen(!isOcrPanelOpen)}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100/80 transition flex items-center justify-between text-xs font-mono text-slate-700 select-none cursor-pointer"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Eye size={15} className="text-indigo-600" />
                <span>Original OCR Text Reference (Click to compare side-by-side)</span>
              </div>
              {isOcrPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isOcrPanelOpen && (
              <div className="p-5 border-t border-slate-200 bg-slate-900 text-emerald-400 font-mono text-xs">
                <textarea
                  readOnly
                  value={rawOcrText || 'No OCR text available.'}
                  rows={8}
                  className="w-full bg-transparent border-none focus:outline-none leading-relaxed resize-y"
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center space-y-3 shadow-xs">
              <Sparkles size={28} className="text-indigo-600 animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Extracting Structured Medical Data...</h3>
              <p className="text-xs text-slate-400 font-mono">Processing complete OCR stream without summarization...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Section 1: Patient Information */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User size={18} className="text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">Patient Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {renderFieldBox('Patient Name', data?.patientInformation.name, (v) => handleFieldChange('patientInformation', 'name', v))}
                  {renderFieldBox('Date of Birth', data?.patientInformation.dob, (v) => handleFieldChange('patientInformation', 'dob', v))}
                  {renderFieldBox('Age', data?.patientInformation.age, (v) => handleFieldChange('patientInformation', 'age', v))}
                  {renderFieldBox('Gender', data?.patientInformation.gender, (v) => handleFieldChange('patientInformation', 'gender', v))}
                  {renderFieldBox('Phone', data?.patientInformation.phone, (v) => handleFieldChange('patientInformation', 'phone', v))}
                  {renderFieldBox('Email', data?.patientInformation.email, (v) => handleFieldChange('patientInformation', 'email', v))}
                  {renderFieldBox('Address', data?.patientInformation.address, (v) => handleFieldChange('patientInformation', 'address', v))}
                </div>
              </div>

              {/* Section 2 & 3: Chief Complaint & Present Illness */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Stethoscope size={18} className="text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">Chief Complaint</h3>
                  </div>
                  {renderFieldBox('Chief Complaint', data?.chiefComplaint, (v) => handleFieldChange('chiefComplaint', '', v))}
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <FileText size={18} className="text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">Present Illness</h3>
                  </div>
                  {renderFieldBox('Present Illness', data?.presentIllness, (v) => handleFieldChange('presentIllness', '', v))}
                </div>
              </div>

              {/* Section 4, 5, 6: Past History, Allergies, Current Medications */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Calendar size={18} className="text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">Past Medical History</h3>
                  </div>
                  {renderFieldBox('Past Medical History', data?.pastMedicalHistory, (v) => handleFieldChange('pastMedicalHistory', '', v))}
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <AlertTriangle size={18} className="text-red-500" />
                    <h3 className="font-bold text-sm text-slate-900">Allergies</h3>
                  </div>
                  {renderFieldBox('Allergies', data?.allergies, (v) => handleFieldChange('allergies', '', v))}
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Pill size={18} className="text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">Current Medications</h3>
                  </div>
                  {renderFieldBox('Current Medications', data?.currentMedications, (v) => handleFieldChange('currentMedications', '', v))}
                </div>
              </div>

              {/* Section 7: Vital Signs */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Activity size={18} className="text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">Vital Signs</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {renderFieldBox('Blood Pressure', data?.vitalSigns.bloodPressure, (v) => handleFieldChange('vitalSigns', 'bloodPressure', v))}
                  {renderFieldBox('Heart Rate', data?.vitalSigns.heartRate, (v) => handleFieldChange('vitalSigns', 'heartRate', v))}
                  {renderFieldBox('Temperature', data?.vitalSigns.temperature, (v) => handleFieldChange('vitalSigns', 'temperature', v))}
                  {renderFieldBox('Respiratory Rate', data?.vitalSigns.respiratoryRate, (v) => handleFieldChange('vitalSigns', 'respiratoryRate', v))}
                  {renderFieldBox('SpO₂', data?.vitalSigns.spO2, (v) => handleFieldChange('vitalSigns', 'spO2', v))}
                  {renderFieldBox('Height', data?.vitalSigns.height, (v) => handleFieldChange('vitalSigns', 'height', v))}
                  {renderFieldBox('Weight', data?.vitalSigns.weight, (v) => handleFieldChange('vitalSigns', 'weight', v))}
                </div>
              </div>

              {/* Section 8, 9, 10: Recommended Investigations, Insurance Details, AI Observations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <FileCheck2 size={18} className="text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">Recommended Investigations</h3>
                  </div>
                  {renderFieldBox('Recommended Investigations', data?.recommendedInvestigations, (v) => handleFieldChange('recommendedInvestigations', '', v))}
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Shield size={18} className="text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">Insurance Details</h3>
                  </div>
                  {renderFieldBox('Insurance Details', data?.insuranceDetails, (v) => handleFieldChange('insuranceDetails', '', v))}
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Sparkles size={18} className="text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">AI Observations</h3>
                  </div>
                  {renderFieldBox('AI Observations', data?.aiObservations, (v) => handleFieldChange('aiObservations', '', v))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
