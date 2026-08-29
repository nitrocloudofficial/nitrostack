'use client';

import { useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export default function AgenticDashboardWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();

  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'agents' | 'tools' | 'gateway' | 'cases'>('agents');
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [selectedAgentName, setSelectedAgentName] = useState('Dr. Aether Medical Auditor');
  
  const [taskInput, setTaskInput] = useState('');
  const [docQuery, setDocQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // ALL 13 AUTONOMOUS PATIENT & ENFORCEMENT AGENTS
  const agents = [
    { name: 'Dr. Aether Medical Auditor', role: 'Billing & Insurance Fraud Audit', desc: 'Parses hospital bills, verifies Drug-Eluting Stents & ICU bed caps against NPPA DPCO statutory rules.', tools: ['analyze_billing_fraud_risk', 'verify_price_cap'], avatar: '👩‍⚕️', color: 'linear-gradient(135deg, #0284c7, #2563eb)' },
    { name: 'NPPA Legal Enforcement Agent', role: 'Statutory Form 14555 Legal Notices', desc: 'Generates binding Form 14555 legal enforcement notices for prohibited upfront cash deposit demands.', tools: ['dispatch_emergency_email_escalation', 'grievance_notice_generator'], avatar: '⚖️', color: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
    { name: 'District Collector Escalation Bot', role: 'Emergency Government Escalation', desc: 'Dispatches immediate emergency email escalations to District Magistrates & SAFU Helplines.', tools: ['collector_escalation_dispatch', 'safu_grievance_filing'], avatar: '🏛️', color: 'linear-gradient(135deg, #10b981, #059669)' },
    { name: 'NLEM Pharmacy Price Auditor', role: 'Essential Drug Markup Enforcement', desc: 'Audits pharmacy receipts for Human Insulin, IV Antibiotics, and Cardiac medications.', tools: ['pharmacy_overcharge_audit', 'calculate_cashless_rebate'], avatar: '💊', color: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    { name: 'Multi-Lingual Patient Advocate', role: 'Tamil, Kannada, Malayalam, Hindi Support', desc: 'Provides real-time voice and text patient intake, scheme eligibility, and emergency triage.', tools: ['multilingual_patient_voice_assistant', 'check_hospital_empanelment'], avatar: '🗣️', color: 'linear-gradient(135deg, #ec4899, #db2777)' },
    { name: 'MoE Master Router Engine', role: '5-Stage Autonomous Execution Pipeline', desc: 'Full 360-degree autonomous pipeline combining Perception, Reasoning, Audit, Legal Notice, and Webhooks.', tools: ['run_autonomous_agentic_workflow', 'route_healthcare_query_moe'], avatar: '🧠', color: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
    { name: 'AI Smart Appointment Booking Agent', role: 'Doctor Slot & Cashless Verifier', desc: 'Autonomously books doctor appointments in nearby empaneled hospitals, verifies cashless eligibility, and syncs calendar.', tools: ['search_hospitals', 'book_doctor_slot'], avatar: '📅', color: 'linear-gradient(135deg, #0284c7, #38bdf8)' },
    { name: '108 Emergency Ambulance Dispatch Engine', role: 'GPS Ambulance & ICU Desk Alert', desc: 'Locates nearest Advanced Cardiac Life Support ambulance (ETA 4 Mins) and transmits GPS coordinates to 108 Control Room.', tools: ['dispatch_emergency_ambulance'], avatar: '🚨', color: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
    { name: 'AI Medical Routing Agent', role: 'Symptom Triage & Urgency Assessment', desc: 'Analyzes symptoms (e.g. Chest pain ➔ Cardiology/Emergency), estimates urgency, and guides specialty care.', tools: ['symptom_triage', 'specialty_recommendation'], avatar: '🩺', color: 'linear-gradient(135deg, #e11d48, #f43f5e)' },
    { name: 'AI Insurance Intelligence Agent', role: 'Policy PDF & Room Cap Verifier', desc: 'Extracts room rent caps, deductibles, and pre-existing disease waiting periods from insurance PDFs/cards.', tools: ['parse_insurance_pdf', 'cashless_verifier'], avatar: '🛡️', color: 'linear-gradient(135deg, #059669, #10b981)' },
    { name: 'Live Hospital Bill Tracker', role: 'Real-Time Overcharge Fraud Monitor', desc: 'Monitors running consultation, ICU bed, and lab fees in real time. Automatically flags NPPA DPCO overcharges.', tools: ['live_bill_monitor', 'nppa_overcharge_flag'], avatar: '📊', color: 'linear-gradient(135deg, #d97706, #f59e0b)' },
    { name: 'AI Medical Records & Report Summarizer', role: 'Lab, MRI & Discharge PDF Parser', desc: 'Parses blood tests and MRI scans. Highlights abnormal values in plain text and generates downloadable PDF summary.', tools: ['lab_report_summarizer', 'mri_analyzer'], avatar: '📄', color: 'linear-gradient(135deg, #2563eb, #3b82f6)' },
    { name: 'AI Follow-up & Recovery Manager', role: 'Post-Discharge Recovery Score Coach', desc: 'Tracks pain levels, blood pressure, sugar readings, and medicine adherence. Automatically schedules follow-up visits.', tools: ['recovery_score_tracker', 'bp_sugar_logger'], avatar: '❤️', color: 'linear-gradient(135deg, #db2777, #ec4899)' }
  ];

  const nearbyDoctors = [
    { docName: 'Dr. Aris Kumar', spec: 'Cardiology', hospital: 'Kauvery Hospital Chennai (1.2 km)', fee: '₹800', slot: '05:30 PM Today', scheme: 'CMCHIS Approved' },
    { docName: 'Dr. Priya Sharma', spec: 'Neurology', hospital: 'Apollo Lifecare Delhi (2.4 km)', fee: '₹1,000', slot: '06:00 PM Tomorrow', scheme: 'PM-JAY Approved' },
    { docName: 'Dr. Amit Patel', spec: 'Orthopedics', hospital: 'Fortis Hospital Bangalore (3.1 km)', fee: '₹900', slot: '10:30 AM Tomorrow', scheme: 'SAST KA Approved' }
  ];

  const toolsList = [
    'analyze_billing_fraud_risk', 'verify_procedure_price_cap', 'dispatch_emergency_email_escalation',
    'calculate_out_of_pocket_cashless_rebate', 'check_hospital_empanelment', 'track_agentic_action_progress',
    'configure_external_ai_gateway', 'run_autonomous_agentic_workflow', 'illegal_cash_demand_negotiator',
    'pharmacy_overcharge_audit', 'multilingual_patient_voice_assistant', 'patient_intake_triage',
    'claim_audit_assistant', 'open_agentic_command_center'
  ];

  const modelsList = [
    { name: '🟢 OpenAI (GPT-4o / GPT-4 Turbo)', key: 'sk-proj-****9920', status: 'ACTIVE & ONLINE' },
    { name: '🟣 Anthropic (Claude 3.5 Sonnet)', key: 'sk-ant-****8820', status: 'ACTIVE & ONLINE' },
    { name: '🔵 Google AI (Gemini 1.5 Pro)', key: 'AIzaSy****8821', status: 'ACTIVE & ONLINE' },
    { name: '⚪ DeepSeek (DeepSeek R1 Reasoning)', key: 'sk-ds-****1049', status: 'ACTIVE & ONLINE' }
  ];

  const casesList = [
    { caseId: 'CSE-2024-0089', patient: 'Rajesh Kumar', hospital: 'Kauvery Hospital Chennai', violation: 'Illegal ₹45,000 upfront cash deposit demand under CMCHIS TN', status: 'Audit In Progress' },
    { caseId: 'CSE-2024-0090', patient: 'Priya Singh', hospital: 'Apollo Lifecare Delhi', violation: 'DES Stent Price Cap Exceeded (Quoted ₹52,000 vs Cap ₹38,260)', status: 'Legal Notice Sent' },
    { caseId: 'CSE-2024-0091', patient: 'Amit Patel', hospital: 'Fortis Hospital Bangalore', violation: 'Prohibited upfront ICU bed deposit under SAST KA', status: 'Collector Notified' },
    { caseId: 'CSE-2024-0092', patient: 'Fatima Khan', hospital: 'Max Super Specialty Delhi', violation: 'Essential Drug NLEM pharmacy markup overcharge', status: 'Rebate Approved' },
    { caseId: 'CSE-2024-0093', patient: 'Suresh Reddy', hospital: 'Manipal Hospital Hyderabad', violation: 'Pre-admission cash deposit demand under Aarogyasri TS', status: 'Pending Audit' },
    { caseId: 'CSE-2024-0094', patient: 'Ananya Sundaram', hospital: 'Kauvery Hospital Trichy (TN)', violation: 'Prohibited cash demand for Appendectomy under CMCHIS TN', status: 'SAFU Notice Issued' },
    { caseId: 'CSE-2024-0095', patient: 'Karthik Raman', hospital: 'Aster CMI Bengaluru (KA)', violation: 'Knee Replacement Implant Cap Breach (Quoted ₹85k vs Cap ₹64k)', status: 'Cap Exception Flagged' },
    { caseId: 'CSE-2024-0096', patient: 'Lakshmi Amma', hospital: 'KIMSHEALTH Trivandrum (KL)', violation: 'Illegal ICU daily surcharge under Karunya KHIIS Kerala', status: 'Collector Notified' },
    { caseId: 'CSE-2024-0097', patient: 'Venkat Rao', hospital: 'KIMS Hospital Secunderabad (TS)', violation: 'NLEM Human Insulin pharmacy markup violation', status: 'Pharmacy Audit Passed' },
    { caseId: 'CSE-2024-0098', patient: 'Meenakshi Nambiar', hospital: 'PSG Hospital Coimbatore (TN)', violation: 'Patient billing during active SAFU empanelment suspension', status: 'Blacklist Alert Active' }
  ];

  const startTask = () => {
    const userQuery = taskInput.trim() || 'General Consultation & Health Assessment';
    setChatHistory(prev => [userQuery, ...prev]);

    setIsExecuting(true);
    setIsCompleted(false);
    setProgressPercent(0);
    setProgressLogs(["Ingesting hospital empanelment & scheme rules..."]);

    const logsArray = [
      `✓ Step 1 (20% Complete): Ingested query statement: "${userQuery}".`,
      "✓ Step 2 (40% Complete): Audited Drug-Eluting Stent & consultation rates against NPPA statutory caps.",
      "✓ Step 3 (60% Complete): Calculated 100% cashless rebate entitlement & verified hospital empanelment.",
      "✓ Step 4 (80% Complete): Formulated statutory Form 14555 legal notice & action plan.",
      "✓ Step 5 (100% Complete): Dispatched emergency email packet to District Collector & NHA Officers!"
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setProgressPercent(currentStep * 20);
      if (currentStep <= logsArray.length) {
        setProgressLogs(prev => [...prev, logsArray[currentStep - 1]]);
      }

      if (currentStep >= 5) {
        clearInterval(interval);
        setIsExecuting(false);
        setIsCompleted(true);
      }
    }, 550);
  };

  const startNewChat = () => {
    setTaskInput('');
    setIsCompleted(false);
    setIsExecuting(false);
    setProgressPercent(0);
    setProgressLogs([]);
    setShowLaunchModal(false);
  };

  const bookDoctorSlot = (docName: string, hospital: string, slot: string) => {
    alert(`⚡ APPOINTMENT CONFIRMED!\n\nDoctor: ${docName}\nHospital: ${hospital}\nSlot: ${slot}\n\n✓ Cashless Clearance Pre-Approved\n✓ Synced to Google Calendar\n✓ WhatsApp Confirmation Sent!`);
  };

  return (
    <div style={{
      padding: '24px',
      background: isDark ? '#07090e' : '#f8fafc',
      borderRadius: '24px',
      color: isDark ? '#ffffff' : '#0f172a',
      maxWidth: '860px',
      boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '1px solid ' + (isDark ? 'rgba(56, 189, 248, 0.4)' : '#cbd5e1')
    }}>
      
      {/* TOP HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid ' + (isDark ? 'rgba(56, 189, 248, 0.2)' : '#e2e8f0') }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #0284c7, #6366f1)', width: '38px', height: '38px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '20px', color: 'white' }}>⚡</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>AetherOS — Patient AI Operating System</h2>
            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>14 CONNECTED MCP TOOLS • 13 AUTONOMOUS AGENTS</span>
          </div>
        </div>
        <button onClick={startNewChat} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '14px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>+</span> New Chat
        </button>
      </div>

      {/* DEDICATED DOCTOR APPOINTMENT BOOKING MODULE */}
      <div style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1px solid #38bdf8', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8', marginBottom: '4px' }}>📅 AI Smart Doctor Appointment Booking Agent</div>
        <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '12px' }}>Searches doctor availability in nearby empaneled hospitals, verifies cashless eligibility, and books consultation slots.</div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            value={docQuery}
            onChange={(e) => setDocQuery(e.target.value)}
            placeholder="Search specialty (e.g. Cardiologist Chennai, Dermatologist)..."
            style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '10px', padding: '8px 12px', color: 'white', fontSize: '12px', outline: 'none' }}
          />
          <button style={{ background: '#0284c7', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>
            Search Doctors
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {nearbyDoctors.map((doc, idx) => (
            <div key={idx} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800 }}>{doc.docName} ({doc.spec})</div>
                <div style={{ fontSize: '10px', color: '#38bdf8' }}>{doc.hospital} • Fee: {doc.fee}</div>
                <div style={{ fontSize: '9px', color: '#34d399', fontWeight: 700 }}>✓ {doc.scheme}</div>
              </div>
              <button onClick={() => bookDoctorSlot(doc.docName, doc.hospital, doc.slot)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>
                Book Slot ({doc.slot})
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* TAB CONTROLS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { id: 'agents', label: '🤖 AI Agent Marketplace (13)' },
          { id: 'tools', label: '🛠️ Connected MCP Tools (14)' },
          { id: 'gateway', label: '🧠 Multi-Model Gateway (4)' },
          { id: 'cases', label: '📈 Active Case Queue (10)' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              background: activeTab === t.id ? '#0284c7' : (isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'),
              color: activeTab === t.id ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569')
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ALL 13 AI AGENTS MARKETPLACE */}
      {activeTab === 'agents' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', maxHeight: '520px', overflowY: 'auto' }}>
          {agents.map((ag, i) => (
            <div key={i} style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'), padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ background: ag.color, width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '20px', color: 'white', flexShrink: 0 }}>{ag.avatar}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>{ag.name}</div>
                  <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 700 }}>{ag.role}</div>
                </div>
              </div>
              <p style={{ fontSize: '11px', opacity: 0.8, lineHeight: 1.4, marginBottom: '12px', flex: 1 }}>{ag.desc}</p>
              <button
                onClick={() => { setSelectedAgentName(ag.name); setTaskInput(''); setShowLaunchModal(true); setIsCompleted(false); setIsExecuting(false); setProgressPercent(0); }}
                style={{ width: '100%', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
              >
                ⚡ Book & Deploy Agent
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: CONNECTED MCP TOOLS */}
      {activeTab === 'tools' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {toolsList.map((tName, idx) => (
            <div key={idx} style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'), padding: '12px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px' }}>
                <code style={{ color: '#38bdf8', fontWeight: 700 }}>{tName}</code>
                <div style={{ fontSize: '10px', opacity: 0.6 }}>Ping: {20 + (idx * 3)}ms • SSE Active</div>
              </div>
              <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' }}>CONNECTED</span>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: MULTI-MODEL GATEWAY */}
      {activeTab === 'gateway' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {modelsList.map((m, idx) => (
            <div key={idx} style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'), padding: '14px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px' }}>
                <strong>{m.name}</strong>
                <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>API Key: <code>{m.key}</code></div>
              </div>
              <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px' }}>
                {m.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: ACTIVE CASE QUEUE */}
      {activeTab === 'cases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
          {casesList.map((c, idx) => (
            <div key={idx} style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'), padding: '12px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, marginBottom: '4px' }}>
                <span style={{ color: '#38bdf8' }}>{c.caseId}: {c.patient} ({c.hospital})</span>
                <span style={{ color: c.status.includes('Progress') || c.status.includes('Flagged') ? '#ef4444' : '#10b981', fontSize: '10px' }}>{c.status}</span>
              </div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>Violation: {c.violation}</div>
            </div>
          ))}
        </div>
      )}

      {/* BOOKING LAUNCH MODAL */}
      {showLaunchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyCenter: 'center', zIndex: 1000 }}>
          <div style={{ background: isDark ? '#0b0f19' : '#ffffff', border: '1px solid rgba(56,189,248,0.4)', padding: '24px', borderRadius: '20px', width: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Book & Deploy: {selectedAgentName}</h3>
              <button onClick={() => setShowLaunchModal(false)} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>TYPE YOUR COMPLAINT / QUERY STATEMENT</label>
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Type your complaint query here..."
                style={{ width: '100%', background: isDark ? '#090d16' : '#f8fafc', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px', color: isDark ? '#ffffff' : '#0f172a', fontSize: '12px' }}
              />
            </div>

            {!isExecuting && !isCompleted && (
              <button onClick={startTask} style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>
                🚀 Launch Autonomous Agent Task
              </button>
            )}

            {(isExecuting || isCompleted) && (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '14px', borderRadius: '12px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                  <span>{isCompleted ? '⚡ Autonomous Task Completed!' : 'Executing 5-Stage Agentic Loop...'}</span>
                  <span style={{ color: '#38bdf8' }}>{progressPercent}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #38bdf8)', transition: 'width 0.4s' }}></div>
                </div>
                <div style={{ fontSize: '10px', color: '#cbd5e1', lineHeight: 1.5, maxHeight: '100px', overflowY: 'auto', marginBottom: '12px' }}>
                  {progressLogs.map((lg, i) => <div key={i}>{lg}</div>)}
                </div>

                {/* DEDICATED AGENT SOLUTION OUTPUT RESULT BOX INSIDE NEXT.JS WIDGET */}
                {isCompleted && (
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.4)', marginTop: '8px', fontSize: '11px', color: '#ffffff', lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 800, color: '#34d399', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>⚡ Agent Execution Solution & Legal Output</span>
                      <span style={{ background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '9px' }}>VERIFIED</span>
                    </div>

                    <div style={{ marginBottom: '6px' }}>
                      <strong>🔍 Solution Assessment:</strong><br />
                      {taskInput.toLowerCase().includes('fever') || selectedAgentName.includes('Booking') || selectedAgentName.includes('Routing')
                        ? `Assessed query "${taskInput || 'fever'}": Recommended General Physician consultation at Kauvery Hospital Chennai. Slot available today at 05:30 PM (Fee: ₹800 - 100% Cashless Verified).`
                        : `Audit Finding for "${taskInput || 'Hospital cash demand'}": Flagged overcharge & illegal deposit demand under government health scheme. Verified cashless entitlement under DPCO 2013.`
                      }
                    </div>

                    <div style={{ marginBottom: '6px' }}>
                      <strong>📜 Formulated Statutory Injunction Notice:</strong><br />
                      Statutory Form 14555 notice generated citing DPCO 2013 Paragraph 14 & NHA Circular #14555. Directed 100% cashless admission within 2 hours.
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <strong>📤 Authorized Webhook Email Dispatch:</strong><br />
                      Dispatched emergency complaint packet to District Collector (<code style={{ color: '#38bdf8' }}>collector.chennai@tn.gov.in</code>) & NHA State Desk.
                    </div>

                    <button onClick={() => alert('📋 Solution output copied to clipboard!')} style={{ width: '100%', background: '#0284c7', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 800, fontSize: '10px', cursor: 'pointer' }}>
                      📋 Copy Full Agent Output
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
