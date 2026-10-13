'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { Activity, Stethoscope, Mail, PlusCircle, Inbox, User } from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '../components/Sidebar';
import { RightInfoPanel } from '../components/RightInfoPanel';
import { ConsultationHeroCard } from '../components/ConsultationHeroCard';
import { CopilotDrawer } from '../components/CopilotDrawer';
import { AudioStreamRecorder } from '../components/AudioStreamRecorder';

import { SpeechNode } from '../components/canvas/SpeechNode';
import { SupervisorNode } from '../components/canvas/SupervisorNode';
import { HistoryNode } from '../components/canvas/HistoryNode';
import { MedicationNode } from '../components/canvas/MedicationNode';
import { ResearchNode } from '../components/canvas/ResearchNode';
import { GapNode } from '../components/canvas/GapNode';
import { ReportNode } from '../components/canvas/ReportNode';

export default function ClinicaMindWorkspace() {
  const [isListening, setIsListening] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [transcript, setTranscript] = useState('');
  const [patientId, setPatientId] = useState('');
  const [graphData, setGraphData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Fetch real backend patients
  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await fetch('/api/patients');
        const json = await res.json();
        if (json.success && json.data) {
          setPatients(json.data);
          if (json.data.length > 0) {
            setSelectedPatient(json.data[0]);
            setPatientId(json.data[0].id);
          } else {
            setSelectedPatient(null);
            setPatientId('');
          }
        }
      } catch (err) {
        console.error('Failed to load patients from backend:', err);
      }
    }
    loadPatients();
  }, []);

  const nodeTypes = useMemo(() => ({
    speech: SpeechNode,
    supervisor: SupervisorNode,
    history: HistoryNode,
    medication: MedicationNode,
    research: ResearchNode,
    gap: GapNode,
    report: ReportNode
  }), []);

  const runOrchestration = async (text: string, pid: string) => {
    if (!text || text.trim().length === 0 || !pid) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, patientId: pid })
      });

      if (response.ok) {
        const json = await response.json();
        setGraphData(json.data);
      }
    } catch (error) {
      console.error('Error connecting to NitroStack backend:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (transcript && transcript.trim().length > 0 && patientId) {
      runOrchestration(transcript, patientId);
    }
  }, [transcript, patientId]);

  const handlePatientSelect = (pId: string) => {
    const p = patients.find(patient => patient.id === pId) || null;
    setSelectedPatient(p);
    setPatientId(pId);
    setTranscript('');
    setGraphData(null);
  };

  return (
    <div className="page-container font-sans overflow-hidden">
      {/* 1. Sidebar Navigation */}
      <Sidebar onOpenCopilot={() => setIsCopilotOpen(true)} />

      {/* 2. Main Workspace Layout */}
      <div className="workspace">
        {/* Workspace Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl shadow-md shadow-indigo-200">
              <Stethoscope size={20} className="text-white" />
            </div>
            <div>
              <h1 className="heading-4 flex items-center gap-2">
                AI Clinical Decision Support Workspace
                <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                  NitroStack Canvas
                </span>
              </h1>
              <p className="body-sm">Real-time collaborative multi-agent reasoning graph</p>
            </div>
          </div>

          {/* Clean Active Patient Selector */}
          <div className="flex items-center gap-2">
            <span className="label-text mr-1">Active Patient EHR:</span>
            {patients.length > 0 ? (
              <select
                value={patientId}
                onChange={(e) => handlePatientSelect(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-xl focus:outline-none focus:border-indigo-500 font-mono"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} (MRN: {p.mrn})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-amber-700 font-mono bg-amber-50 px-2 py-1 border border-amber-200 rounded font-bold">
                No patients available
              </span>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="content-area">
          {patients.length === 0 ? (
            /* Mandatory Zero-Patient Empty State */
            <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-6 shadow-xs my-auto max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto shadow-xs">
                <Inbox size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900">No patients available.</h2>
                <p className="text-sm text-slate-500 font-medium">
                  Connect Gmail to import a patient or create one manually later.
                </p>
              </div>
              <div className="flex items-center justify-center gap-4 pt-2">
                <Link
                  href="/settings/integrations/gmail"
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md shadow-indigo-200 transition"
                >
                  <Mail size={16} />
                  <span>Connect Gmail</span>
                </Link>
                <Link
                  href="/patients"
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs px-5 py-3 rounded-xl transition"
                >
                  <PlusCircle size={16} />
                  <span>Create Patient Manually</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Active Patient Workspace */
            <>
              <ConsultationHeroCard
                isListening={isListening}
                onToggleListening={() => setIsListening(!isListening)}
                transcript={transcript}
                onRefresh={() => runOrchestration(transcript, patientId)}
                isLoading={isLoading}
                graphData={graphData}
              />

              <AudioStreamRecorder
                onTranscriptUpdate={(newText) => {
                  setTranscript(newText);
                  runOrchestration(newText, patientId);
                }}
                isListening={isListening}
                onToggleListening={() => setIsListening(!isListening)}
              />

              <div className="h-[560px] panel relative min-h-[500px]">
                <div className="absolute top-3 left-3 z-10 glass-card px-3 py-1.5 text-xs font-mono text-slate-700 font-bold flex items-center gap-2 shadow-xs">
                  <Activity size={14} className="text-emerald-500 animate-pulse" />
                  <span>Multi-Agent Live Graph</span>
                </div>

                {graphData ? (
                  <ReactFlow
                    nodes={graphData.nodes}
                    edges={graphData.edges}
                    nodeTypes={nodeTypes}
                    fitView
                    nodesFocusable={true}
                    edgesFocusable={true}
                    className="bg-slate-50/50"
                  >
                    <Background color="#cbd5e1" gap={24} size={1} />
                    <Controls className="!bg-white !border-slate-200 !text-slate-700 !shadow-md" />
                    <MiniMap
                      nodeColor={(n) => {
                        switch (n.type) {
                          case 'speech': return '#4f46e5';
                          case 'supervisor': return '#2563eb';
                          case 'history': return '#059669';
                          case 'medication': return '#7c3aed';
                          case 'research': return '#0891b2';
                          case 'gap': return '#ea580c';
                          case 'report': return '#475569';
                          default: return '#64748b';
                        }
                      }}
                      className="!bg-white/90 !border-slate-200 rounded-xl !shadow-md"
                    />
                  </ReactFlow>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 font-mono text-xs">
                    <span>Start Audio Consultation or speak into microphone to trigger dynamic multi-agent execution...</span>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <RightInfoPanel activePatient={selectedPatient} />

      <CopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        patientId={patientId}
        patientName={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'No Active Patient'}
        transcript={transcript}
      />
    </div>
  );
}
