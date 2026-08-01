'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '../../components/Sidebar';
import { PatientOnboardingModal } from '../../components/PatientOnboardingModal';
import { IntakeVerificationDrawer } from '../../components/IntakeVerificationDrawer';
import { Search, UserPlus, ArrowRight, ShieldAlert, Inbox, Sparkles, FileText, CheckCircle2, RefreshCw } from 'lucide-react';

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [intakePackages, setIntakePackages] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const json = await res.json();
        setPatients(json.patients || []);
      }
    } catch (e) {
      console.error('Error fetching patients:', e);
    }
  };

  const fetchIntakePackages = async () => {
    try {
      const res = await fetch('/api/intake/packages?status=PENDING_VERIFICATION');
      if (res.ok) {
        const json = await res.json();
        setIntakePackages(json.packages || []);
        setPendingCount(json.pendingCount || 0);
      }
    } catch (e) {
      console.error('Error fetching intake packages:', e);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchIntakePackages();
  }, []);

  const handleSimulateSampleEmail = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/intake/sample', { method: 'POST' });
      if (res.ok) {
        await fetchIntakePackages();
      }
    } catch (e) {
      console.error('Error simulating intake email:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patientId.includes(searchTerm) ||
    p.conditions.some((c: string) => c.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 sticky top-0 backdrop-blur-xs z-20 shadow-xs">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Patients Directory & Digital Folders
              <span className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                {patients.length} Active Profiles
              </span>
              {pendingCount > 0 && (
                <span className="text-xs font-mono bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-bold animate-pulse">
                  {pendingCount} Intake Verification Awaiting
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 font-medium">Autonomous Gmail Intake, AI Document OCR Extraction & EMR Registry</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSimulateSampleEmail}
              disabled={isSimulating}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-indigo-300 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-700 transition"
            >
              <Sparkles size={14} className="text-indigo-400" />
              <span>{isSimulating ? 'Ingesting Package...' : '⚡ Simulate Inbound Patient Email'}</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-indigo-200 transition"
            >
              <UserPlus size={16} />
              <span>+ Create Patient Manually</span>
            </button>
          </div>
        </header>

        {/* Patients Hub Content */}
        <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Autonomous Inbox Monitoring Banner */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Inbox size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">Autonomous Doctor Inbox Monitoring Agent</h3>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                    ACTIVE MONITORING
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Receptionist forwards patient packages (Forms, Insurance, ID, Reports, Imaging) → ClinicaMind runs OCR, AI entity extraction & alerts doctor.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Awaiting Doctor Verification</span>
                <span className="text-lg font-bold text-amber-400 font-mono">{pendingCount} Packages</span>
              </div>
              <button
                onClick={fetchIntakePackages}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                title="Refresh Intake Queue"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Pending Doctor Verification Queue */}
          {intakePackages.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <span>Pending Doctor Verification Queue</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-bold">{intakePackages.length}</span>
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {intakePackages.map(pkg => (
                  <div
                    key={pkg.id}
                    onClick={() => {
                      setSelectedPackageId(pkg.id);
                      setIsDrawerOpen(true);
                    }}
                    className="bg-white border-2 border-amber-200 hover:border-indigo-500 rounded-2xl p-5 cursor-pointer transition shadow-xs hover:shadow-md space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
                          {pkg.packageNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {pkg.extractedPatient?.name || 'Extracted Patient Profile'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                        Review & Edit →
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p><span className="font-bold text-slate-700">Subject:</span> {pkg.subject}</p>
                      <p><span className="font-bold text-slate-700">Sender:</span> {pkg.senderEmail}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        📎 {pkg.attachmentsCount} Attachments • DOB: {pkg.extractedPatient?.dob || 'N/A'} • Risk: {pkg.extractedPatient?.riskCategory || 'HIGH'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient by name, ID, or condition..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Filter Risk:</span>
              <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded font-bold cursor-pointer">Critical</span>
              <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded font-bold cursor-pointer">High</span>
              <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded font-bold cursor-pointer">Low</span>
            </div>
          </div>

          {/* Patients Directory Grid / Empty State */}
          {filteredPatients.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Inbox size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No patients available.</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Connect Gmail to import a patient or create one manually later.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Link
                  href="/settings/integrations/gmail"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-2"
                >
                  <Sparkles size={14} />
                  <span>Connect Gmail</span>
                </Link>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition border border-slate-200"
                >
                  + Create Patient Manually
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {filteredPatients.map((patient) => {
                const isCritical = patient.riskCategory === 'CRITICAL RISK' || patient.riskCategory === 'HIGH RISK';
                return (
                  <div
                    key={patient.patientId}
                    className="bg-white border border-slate-200/80 hover:border-indigo-500/50 rounded-2xl p-6 space-y-4 transition shadow-xs hover:shadow-md flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold text-sm">
                            {patient.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition">{patient.name}</h3>
                            <span className="text-xs font-mono text-slate-500">ID: {patient.patientId} • {patient.age}y / {patient.gender}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isCritical ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                          {patient.riskCategory}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-mono block">Conditions:</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {patient.conditions?.map((c: string, idx: number) => (
                              <span key={idx} className="bg-white text-slate-700 border border-slate-200 text-[10px] px-2 py-0.5 rounded">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-mono block">Allergies:</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {patient.allergies?.map((a: string, idx: number) => (
                              <span key={idx} className="bg-red-100 text-red-700 border border-red-200 text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                <ShieldAlert size={10} /> {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono text-[11px]">
                        📁 {patient.documents?.length || 0} Files • 🏥 {patient.visitHistory?.length || 0} Visits
                      </span>
                      <Link
                        href={`/patients/${patient.patientId}`}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 text-[11px] shadow-xs"
                      >
                        <span>Open Folder</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <PatientOnboardingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchPatients();
          fetchIntakePackages();
        }}
      />

      <IntakeVerificationDrawer
        isOpen={isDrawerOpen}
        packageId={selectedPackageId}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedPackageId(null);
        }}
        onSuccess={() => {
          fetchPatients();
          fetchIntakePackages();
        }}
      />
    </div>
  );
}
