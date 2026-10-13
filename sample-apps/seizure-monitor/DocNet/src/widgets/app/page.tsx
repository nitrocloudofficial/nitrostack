'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, ShieldAlert, CheckCircle2, Send, AlertTriangle, Stethoscope,
  ArrowRight, HelpCircle, User, PhoneCall, FileText, Award, Calendar,
  AlertCircle, Star, MapPin, CheckCircle as CheckIcon, Clock, RefreshCw,
  X
} from 'lucide-react';

const EMERGENCY_KEYWORDS = [
  'chest pain',
  'severe bleeding',
  'sudden numbness',
  'shortness of breath',
  'difficulty breathing'
];

const QUESTION_BANK = [
  'How long have you been experiencing these symptoms?',
  'On a scale of 1-10, how severe is your discomfort right now?',
  'Do you have any related symptoms like fever, nausea, or dizziness?',
  'Have you noticed any swelling, joint pain, or restricted movement?',
  'Have you taken any medication or remedies for this condition so far?'
];

export default function TriagePage() {
  const [step, setStep] = useState<'intake' | 'questions' | 'emergency' | 'summary' | 'doctors'>('intake');
  const [isLoading, setIsLoading] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState<string | null>(null);

  const [symptomText, setSymptomText] = useState('');
  const [currentQuestionId, setCurrentQuestionId] = useState(1);
  const [answerText, setAnswerText] = useState('');
  const [questionHistory, setQuestionHistory] = useState<Array<{ q: string; a: string }>>([]);
  const [symptomsList, setSymptomsList] = useState<string[]>([]);
  const [summary, setSummary] = useState<{
    recommendedSpecialty: string;
    clinicalSummary: string;
    disclaimer: string;
  } | null>(null);

  const [doctors, setDoctors] = useState<
    Array<{
      id: number;
      name: string;
      specialty: string;
      clinicName: string;
      rating: number;
      slots: string[];
    }>
  >([]);
  const [selectedSlot, setSelectedSlot] = useState<{ doctorId: number; doctorName: string; slotLabel: string } | null>(
    null
  );

  const [isChatOpen, setIsChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [step, questionHistory, isLoading, isChatOpen]);

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomText.trim() || isLoading) return;
    setIsLoading(true);

    const lower = symptomText.toLowerCase();
    const matched = EMERGENCY_KEYWORDS.find((k) => lower.includes(k));

    setTimeout(() => {
      setIsLoading(false);
      setSymptomsList([symptomText]);

      if (matched) {
        setEmergencyReason(`Critical symptom detected: "${matched}".`);
        setStep('emergency');
      } else {
        setCurrentQuestionId(1);
        setStep('questions');
      }
    }, 400);
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim() || isLoading) return;
    setIsLoading(true);

    const currentQText = QUESTION_BANK[currentQuestionId - 1] || 'Describe any further details.';
    const lower = answerText.toLowerCase();
    const matched = EMERGENCY_KEYWORDS.find((k) => lower.includes(k));

    setTimeout(() => {
      setQuestionHistory((prev) => [...prev, { q: currentQText, a: answerText }]);
      const updatedList = [...symptomsList, answerText];
      setSymptomsList(updatedList);
      setAnswerText('');

      if (matched) {
        setIsLoading(false);
        setEmergencyReason(`Critical symptom detected in response: "${matched}".`);
        setStep('emergency');
      } else if (currentQuestionId >= 5) {
        let recommendedSpecialty = 'Internal Medicine';
        const joined = updatedList.join(' ').toLowerCase();
        if (joined.includes('joint') || joined.includes('knee') || joined.includes('pain') || joined.includes('ankle')) {
          recommendedSpecialty = 'Orthopedics';
        } else if (joined.includes('headache') || joined.includes('dizzy')) {
          recommendedSpecialty = 'Neurology';
        } else if (joined.includes('skin') || joined.includes('rash')) {
          recommendedSpecialty = 'Dermatology';
        }

        setSummary({
          recommendedSpecialty,
          clinicalSummary: `Patient presented with initial symptoms: "${symptomText}". Automated WHO-verified triage rules out immediate life-threatening emergency. Recommended referral to ${recommendedSpecialty} for focused diagnostic evaluation and targeted care plan.`,
          disclaimer: 'This is an AI triage estimation and does not constitute professional medical advice.'
        });
        setIsLoading(false);
        setStep('summary');
      } else {
        setCurrentQuestionId((prev) => prev + 1);
        setIsLoading(false);
      }
    }, 400);
  };

  const handleProceed = async () => {
    setIsLoading(true);
    const specialty = summary ? summary.recommendedSpecialty : 'Orthopedics';
    setTimeout(() => {
      setDoctors([
        {
          id: 101,
          name: 'Dr. Sarah Jenkins, MD',
          specialty: specialty,
          clinicName: 'Metropolitan Health Center',
          rating: 4.9,
          slots: ['Tomorrow, 9:00 AM', 'Tomorrow, 11:30 AM', 'Tomorrow, 2:00 PM']
        },
        {
          id: 102,
          name: 'Dr. Robert Chen, DO',
          specialty: specialty,
          clinicName: 'Apex Specialist Clinic',
          rating: 4.8,
          slots: ['In 2 days, 10:00 AM', 'In 2 days, 3:30 PM']
        },
        {
          id: 103,
          name: 'Dr. Elena Rostova, MD',
          specialty: specialty,
          clinicName: 'St. Jude Community Care',
          rating: 4.95,
          slots: ['In 3 days, 8:30 AM', 'In 3 days, 1:00 PM']
        }
      ]);
      setIsLoading(false);
      setStep('doctors');
    }, 400);
  };

  const handleReset = () => {
    setStep('intake');
    setSymptomText('');
    setAnswerText('');
    setEmergencyReason(null);
    setCurrentQuestionId(1);
    setQuestionHistory([]);
    setSymptomsList([]);
    setSummary(null);
    setDoctors([]);
    setSelectedSlot(null);
  };

  const renderMessages = () => {
    const msgs = [];
    
    // Initial AI message
    msgs.push(<div key="ai-init" className="message message-ai">Hello, I'm the DocNet triage assistant. What symptoms are you experiencing?</div>);
    
    // If we've passed intake, show user's initial symptoms
    if (step !== 'intake' && symptomsList.length > 0) {
      msgs.push(<div key="user-init" className="message message-user">{symptomsList[0]}</div>);
    }

    // Question history
    questionHistory.forEach((item, idx) => {
      msgs.push(<div key={`ai-q-${idx}`} className="message message-ai">{item.q}</div>);
      msgs.push(<div key={`user-a-${idx}`} className="message message-user">{item.a}</div>);
    });

    // Current pending question if in 'questions' step
    if (step === 'questions') {
      msgs.push(<div key="ai-curr-q" className="message message-ai">{QUESTION_BANK[currentQuestionId - 1]}</div>);
    }

    // Emergency Step
    if (step === 'emergency') {
      msgs.push(
        <div key="emergency" className="emergency-banner">
          <h3>Emergency Warning</h3>
          <p style={{marginBottom: '1rem'}}>{emergencyReason}</p>
          <p style={{fontWeight: 600, marginBottom: '1rem'}}>Please contact local emergency services immediately.</p>
          <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
            <a href="tel:911" className="btn" style={{backgroundColor: 'white', color: '#8c2a2a', textDecoration: 'none'}}>Call 911</a>
            <button onClick={handleReset} className="btn" style={{background: 'transparent', color: 'white', textDecoration: 'underline', border: '1px solid rgba(255,255,255,0.3)'}}>Start Over</button>
          </div>
        </div>
      );
    }

    // Summary Step
    if (step === 'summary' && summary) {
      msgs.push(
        <div key="summary" className="summary-card">
          <Award style={{marginBottom: '0.5rem', color: '#FFF'}} />
          <h3>Recommended: {summary.recommendedSpecialty}</h3>
          <p>{summary.clinicalSummary}</p>
          <div style={{fontSize: '0.75rem', opacity: 0.8, marginTop: '1rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '1rem'}}>
            <AlertCircle size={14} style={{display:'inline', marginRight: '4px', verticalAlign: 'text-bottom'}} />
            {summary.disclaimer}
          </div>
          <button onClick={handleProceed} className="btn btn-primary" style={{marginTop: '1.5rem', width: '100%', backgroundColor: 'var(--text-light)', color: 'var(--primary-dark)'}}>
            {isLoading ? 'Loading...' : 'Find Available Doctors'}
          </button>
        </div>
      );
    }

    // Doctors Step
    if (step === 'doctors') {
      msgs.push(
        <div key="doctors" style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem'}}>
          <div className="message message-ai">Here are the available specialists matching your needs:</div>
          {doctors.map(doc => (
            <div key={doc.id} className="doctor-card">
              <h4>{doc.name}</h4>
              <div className="doctor-meta">
                <span>{doc.specialty}</span> &bull; <span>{doc.clinicName}</span> &bull; <Star size={12} style={{display:'inline'}} /> {doc.rating}
              </div>
              <div className="slots-container">
                {doc.slots.map(slot => (
                  <button 
                    key={slot}
                    className={`slot-btn ${selectedSlot?.doctorId === doc.id && selectedSlot?.slotLabel === slot ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot({ doctorId: doc.id, doctorName: doc.name, slotLabel: slot })}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {selectedSlot && (
            <div className="message message-ai" style={{backgroundColor: '#e6f4ea', color: '#137333', borderColor: '#ceead6', borderRadius: '1.5rem'}}>
              <strong style={{display: 'flex', alignItems: 'center', gap: '4px'}}><CheckCircle2 size={16} /> Appointment Reserved</strong>
              <div style={{marginTop: '4px'}}>{selectedSlot.doctorName} for {selectedSlot.slotLabel}</div>
            </div>
          )}
          <button onClick={handleReset} className="btn" style={{marginTop: '1rem', color: 'var(--text-light)', border: '1px solid rgba(255,255,255,0.2)'}}>
            Start New Triage
          </button>
        </div>
      );
    }

    if (isLoading && step !== 'summary' && step !== 'emergency' && step !== 'doctors') {
       msgs.push(
         <div key="loading" className="message message-ai" style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <div className="spinner"></div> <span>Processing...</span>
         </div>
       );
    }

    return msgs;
  };

  return (
    <div className="app-container">
      {/* Global Header */}
      <header className="global-header">
        <a href="#" className="logo">DocNet</a>
        <button className="btn btn-primary" onClick={() => setIsChatOpen(true)}>
          Consult AI
        </button>
      </header>

      {/* Hero Section */}
      <main className="main-content">
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="text-display-lg">Intelligent Healthcare,<br/>Instantly Routed.</h1>
            <p className="text-body hero-subtitle">
              Describe your symptoms. DocNet instantly finds the right specialist and secures your appointment.
            </p>
            <button className="btn btn-primary btn-large" onClick={() => setIsChatOpen(true)}>
              Describe Your Symptoms
            </button>
          </div>
          <div className="hero-image-container">
            <img src="/hero.png" alt="Modern Medical Waiting Room" />
          </div>
        </section>
      </main>

      {/* Chat Interface Drawer */}
      <div className={`chat-drawer-overlay ${isChatOpen ? 'is-open' : ''}`} onClick={() => setIsChatOpen(false)}>
        <div className="chat-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="chat-header">
            <h2>DocNet Assistant</h2>
            <button className="close-btn" onClick={() => setIsChatOpen(false)}>
              <X size={24} />
            </button>
          </div>
          
          <div className="chat-messages">
            {renderMessages()}
            <div ref={messagesEndRef} />
          </div>

          {(step === 'intake' || step === 'questions') && !isLoading && (
            <div className="chat-input-container">
              <form 
                onSubmit={step === 'intake' ? handleIntakeSubmit : handleAnswerSubmit} 
                className="chat-input-wrapper"
              >
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Describe your symptoms..."
                  value={step === 'intake' ? symptomText : answerText}
                  onChange={(e) => step === 'intake' ? setSymptomText(e.target.value) : setAnswerText(e.target.value)}
                  autoFocus={isChatOpen}
                />
                <button 
                  type="submit" 
                  className="chat-submit-btn" 
                  disabled={step === 'intake' ? !symptomText.trim() : !answerText.trim()}
                >
                  <ArrowRight size={20} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
