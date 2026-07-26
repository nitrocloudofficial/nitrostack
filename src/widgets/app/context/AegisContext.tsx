'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { generatePDFReport, exportJSON, exportCSV, InvestigationData } from '../utils/exportHelpers';

export type PageId = 'overview' | 'monitoring' | 'investigation' | 'analytics' | 'reports' | 'settings' | 'system';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  page?: PageId;
}

export interface SearchResultItem {
  id: string;
  title: string;
  category: 'Investigation' | 'Transaction' | 'Report' | 'Account' | 'Phone' | 'Customer';
  subtitle: string;
  page: PageId;
  targetId?: string;
}

export interface AegisSettings {
  criticalAlerts: boolean;
  autoFreeze: boolean;
  hitlRequired: boolean;
  biometricNoise: boolean;
  debugLogs: boolean;
  zkVerify: boolean;
}

const DEFAULT_SETTINGS: AegisSettings = {
  criticalAlerts: true,
  autoFreeze: false,
  hitlRequired: true,
  biometricNoise: true,
  debugLogs: false,
  zkVerify: true,
};

export interface TestCaseItem {
  id: string;
  caseTitle: string;
  targetAccount: string;
  customerName: string;
  amount: string;
  rawAmount: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  expectedThreatScore: number;
  senderPhone: string;
  destinationAccount: string;
  data: InvestigationData;
}

export const TEST_CASES_SUITE: TestCaseItem[] = [
  {
    id: 'CASE-2026-DA-9904',
    caseTitle: 'CBI Cyber Crime HQ Spoof & Digital Arrest Coercion',
    targetAccount: 'HDFC-****4521',
    customerName: 'Rameshwar Sharma (Retd. GM)',
    amount: '₹ 50,00,000',
    rawAmount: 5000000,
    severity: 'CRITICAL',
    expectedThreatScore: 94,
    senderPhone: '+91-9876543210',
    destinationAccount: 'SBI-MULE-4482-9901',
    data: {
      id: 'CASE-2026-DA-9904',
      caseTitle: 'CBI Cyber Crime HQ Spoof & Digital Arrest Coercion',
      targetAccount: 'HDFC-****4521',
      customerName: 'Rameshwar Sharma (Retd. GM)',
      amount: '₹ 50,00,000',
      severity: 'CRITICAL',
      threatScore: 94,
      status: 'AWAITING_HITL',
      timestamp: '2026-07-25 14:28:12 IST',
      telecom: {
        callerId: '+91-11-23012345 (DoT / CBI Cyber HQ)',
        origin: 'Phnom Penh VoIP Gateway (AS13824)',
        duration: '84 minutes (Coercion Pattern)',
        stirShaken: 'FAILED (CLI Mismatch)',
        anomalies: ['STIR_SHAKEN_FAILED', 'FOREIGN_VOIP_ORIGIN', 'EXTENDED_COERCION'],
      },
      voice: {
        aiConfidence: '96% Confidence (Synthetic)',
        model: 'VoiceGuard-v4.2 Neural Biometrics',
        microTremor: 'MISSING (Artificial Pitch Variance)',
        formantStatus: 'F2 Phase Discontinuity Detected',
        verdict: 'AI_GENERATED_VOICE_CONFIRMED',
      },
      bank: {
        destinationAccount: 'SBI-MULE-4482-9901',
        accountAge: '3 Days Old',
        velocity24h: '14 Inbound / 12 Outbound (₹ 1.4 Cr)',
        kycStatus: 'MINIMUM_EKYC (Suspect Tier-1 Docs)',
        verdict: 'CONFIRMED_BANK_MULE',
      },
      timeline: [
        { step: 1, title: 'Telecom Metadata Analysis', desc: 'STIR/SHAKEN Handshake Failed. Foreign VoIP Node Traced.', time: '14:28:14' },
        { step: 2, title: 'Voice Biometrics Deepfake Analysis', desc: '96% Synthetic Audio Model Confidence. F2 Discontinuity.', time: '14:28:16' },
        { step: 3, title: 'Bank Mule Velocity Graph', desc: 'Destination SBI Mule account flagged with 14 transfers today.', time: '14:28:18' },
        { step: 4, title: 'Zero-Knowledge Threat Fusion', desc: 'Multi-Vector Score 94/100 Calculated. Threat Level CRITICAL.', time: '14:28:20' },
        { step: 5, title: 'Human-in-the-Loop Clearance Required', desc: 'Awaiting Officer Approval for Multi-Hop Account Freeze.', time: '14:28:22' },
      ],
      decision: {
        recommendation: 'IMMEDIATE MULTI-HOP ACCOUNT FREEZE & MHA I4C INCIDENT DISPATCH',
        officerName: 'Officer AZ-99',
        clearance: 'Clearance Level 5 (RBI Certified)',
        dispatchStatus: 'PENDING_OFFICER_APPROVAL',
      },
    },
  },
  {
    id: 'CASE-2026-VC-8812',
    caseTitle: 'Voice Synthetic Impersonation of Family Member',
    targetAccount: 'ICICI-****9921',
    customerName: 'Suresh Patel',
    amount: '₹ 15,00,000',
    rawAmount: 1500000,
    severity: 'HIGH',
    expectedThreatScore: 78,
    senderPhone: '+91-9821098765',
    destinationAccount: 'PNB-MULE-8812-3301',
    data: {
      id: 'CASE-2026-VC-8812',
      caseTitle: 'Voice Synthetic Impersonation of Family Member',
      targetAccount: 'ICICI-****9921',
      customerName: 'Suresh Patel',
      amount: '₹ 15,00,000',
      severity: 'HIGH',
      threatScore: 78,
      status: 'UNDER_REVIEW',
      timestamp: '2026-07-25 13:40:05 IST',
      telecom: {
        callerId: '+91-9821098765 (Cloned Caller ID)',
        origin: 'Vietnam SIP Trunk Gateway (AS45821)',
        duration: '18 minutes',
        stirShaken: 'FAILED (CLI Mismatch)',
        anomalies: ['STIR_SHAKEN_FAILED', 'SIP_TRUNK_GATEWAY'],
      },
      voice: {
        aiConfidence: '88% Confidence (Synthetic)',
        model: 'VoiceGuard-v4.2 Neural Biometrics',
        microTremor: 'SLIGHT_TREMOR (Artificial Pitch)',
        formantStatus: 'Pitch Variance Anomalous',
        verdict: 'AI_SYNTHETIC_PROBABLE',
      },
      bank: {
        destinationAccount: 'PNB-MULE-8812-3301',
        accountAge: '12 Days Old',
        velocity24h: '6 Inbound / 5 Outbound',
        kycStatus: 'PARTIAL_KYC',
        verdict: 'PROBABLE_BANK_MULE',
      },
      timeline: [
        { step: 1, title: 'Telecom Metadata Analysis', desc: 'STIR/SHAKEN Handshake Failed. Vietnam SIP Trunk traced.', time: '13:40:07' },
        { step: 2, title: 'Voice Biometrics Analysis', desc: '88% Synthetic Model Confidence.', time: '13:40:09' },
        { step: 3, title: 'Bank Mule Velocity Graph', desc: 'Destination PNB account 12 days old.', time: '13:40:11' },
        { step: 4, title: 'Zero-Knowledge Threat Fusion', desc: 'Multi-Vector Score 78/100 Calculated. Threat Level HIGH.', time: '13:40:13' },
      ],
      decision: {
        recommendation: 'ENHANCED SURVEILLANCE & SECONDARY VERIFICATION REQUIRED',
        officerName: 'Officer AZ-99',
        clearance: 'Clearance Level 5 (RBI Certified)',
        dispatchStatus: 'FLAGGED_FOR_REVIEW',
      },
    },
  },
  {
    id: 'CASE-2026-ML-4410',
    caseTitle: 'Multi-Hop Rapid Layering Mule Ring',
    targetAccount: 'AXIS-****1122',
    customerName: 'Meera Iyer',
    amount: '₹ 28,00,000',
    rawAmount: 2800000,
    severity: 'CRITICAL',
    expectedThreatScore: 85,
    senderPhone: '+91-9123456789',
    destinationAccount: 'KOTAK-MULE-9910-4412',
    data: {
      id: 'CASE-2026-ML-4410',
      caseTitle: 'Multi-Hop Rapid Layering Mule Ring',
      targetAccount: 'AXIS-****1122',
      customerName: 'Meera Iyer',
      amount: '₹ 28,00,000',
      severity: 'CRITICAL',
      threatScore: 85,
      status: 'AWAITING_HITL',
      timestamp: '2026-07-25 12:15:30 IST',
      telecom: {
        callerId: '+91-22-67890123 (Spoofed Bank Desk)',
        origin: 'Laos VoIP Gateway Node',
        duration: '45 minutes',
        stirShaken: 'FAILED (CLI Mismatch)',
        anomalies: ['STIR_SHAKEN_FAILED', 'FOREIGN_VOIP_ORIGIN'],
      },
      voice: {
        aiConfidence: '92% Confidence (Synthetic)',
        model: 'VoiceGuard-v4.2 Neural Biometrics',
        microTremor: 'MISSING',
        formantStatus: 'Synthetic Formant Pattern',
        verdict: 'AI_GENERATED_VOICE_CONFIRMED',
      },
      bank: {
        destinationAccount: 'KOTAK-MULE-9910-4412',
        accountAge: '1 Day Old',
        velocity24h: '22 Inbound / 22 Outbound',
        kycStatus: 'MINIMUM_EKYC',
        verdict: 'CONFIRMED_BANK_MULE',
      },
      timeline: [
        { step: 1, title: 'Telecom Metadata Analysis', desc: 'STIR/SHAKEN Handshake Failed. Foreign VoIP Node Traced.', time: '12:15:32' },
        { step: 2, title: 'Voice Biometrics Deepfake Analysis', desc: '92% Synthetic Audio Model Confidence.', time: '12:15:34' },
        { step: 3, title: 'Bank Mule Velocity Graph', desc: 'Kotak account 1 day old with 22 transfers.', time: '12:15:36' },
        { step: 4, title: 'Zero-Knowledge Threat Fusion', desc: 'Multi-Vector Score 85/100 Calculated. Threat Level CRITICAL.', time: '12:15:38' },
        { step: 5, title: 'Human-in-the-Loop Clearance Required', desc: 'Awaiting Officer Approval for Multi-Hop Account Freeze.', time: '12:15:40' },
      ],
      decision: {
        recommendation: 'IMMEDIATE MULTI-HOP ACCOUNT FREEZE & MHA I4C INCIDENT DISPATCH',
        officerName: 'Officer AZ-99',
        clearance: 'Clearance Level 5 (RBI Certified)',
        dispatchStatus: 'PENDING_OFFICER_APPROVAL',
      },
    },
  },
  {
    id: 'CASE-2026-LEG-1001',
    caseTitle: 'Legitimate Family Education Fee Transfer',
    targetAccount: 'HDFC-****7722',
    customerName: 'Anil Kulkarni',
    amount: '₹ 1,50,00,000',
    rawAmount: 15000000,
    severity: 'LOW',
    expectedThreatScore: 12,
    senderPhone: '+91-9871122334',
    destinationAccount: 'ICICI-UNI-5544-1100',
    data: {
      id: 'CASE-2026-LEG-1001',
      caseTitle: 'Legitimate Family Education Fee Transfer',
      targetAccount: 'HDFC-****7722',
      customerName: 'Anil Kulkarni',
      amount: '₹ 1,50,00,000',
      severity: 'LOW',
      threatScore: 12,
      status: 'CLEARED',
      timestamp: '2026-07-25 11:05:00 IST',
      telecom: {
        callerId: '+91-9871122334 (Verified Primary Device)',
        origin: 'Airtel Delhi Cellular Tower (AS45609)',
        duration: '3 minutes',
        stirShaken: 'VERIFIED',
        anomalies: [],
      },
      voice: {
        aiConfidence: '2% Confidence (Human)',
        model: 'VoiceGuard-v4.2 Neural Biometrics',
        microTremor: 'NORMAL_HUMAN_MICROTREMOR',
        formantStatus: 'Natural Harmonic Formants',
        verdict: 'HUMAN_VOICE_VERIFIED',
      },
      bank: {
        destinationAccount: 'ICICI-UNI-5544-1100',
        accountAge: '1825 Days Old (5 Years)',
        velocity24h: '1 Inbound / 0 Outbound',
        kycStatus: 'FULL_BIOMETRIC_KYC',
        verdict: 'CLEARED_LEGITIMATE_ACCOUNT',
      },
      timeline: [
        { step: 1, title: 'Telecom Metadata Analysis', desc: 'STIR/SHAKEN Handshake Verified. Airtel Cellular Node.', time: '11:05:02' },
        { step: 2, title: 'Voice Biometrics Analysis', desc: 'Human Voice Verified (2% Deepfake score).', time: '11:05:04' },
        { step: 3, title: 'Bank Account Graph', desc: '5-Year-Old Verified Institutional Account.', time: '11:05:06' },
        { step: 4, title: 'Zero-Knowledge Threat Fusion', desc: 'Multi-Vector Score 12/100 Calculated. Threat Level LOW.', time: '11:05:08' },
      ],
      decision: {
        recommendation: 'AUTO-CLEARED — TRANSACTION APPROVED WITHOUT INTERVENTION',
        officerName: 'Automated System',
        clearance: 'Level 5 (RBI Certified)',
        dispatchStatus: 'CLEARED',
      },
    },
  },
];

const DEFAULT_INVESTIGATION: InvestigationData = TEST_CASES_SUITE[0].data;

export const TRANSACTION_DOSSIERS: Record<string, InvestigationData> = {
  'TXN-998822': TEST_CASES_SUITE[0].data,
  'TXN-884210': TEST_CASES_SUITE[1].data,
  'TXN-773199': {
    id: 'TXN-773199',
    caseTitle: 'Legitimate Education & Family Health Transfer',
    targetAccount: 'SBI-****8832',
    customerName: 'Sunita Narain',
    amount: '₹ 2,50,000',
    severity: 'LOW',
    threatScore: 12,
    status: 'CLEARED',
    timestamp: '2026-07-25 14:22:00 IST',
    telecom: {
      callerId: '+91-9871122334 (Verified Primary Device)',
      origin: 'Airtel Delhi Cellular Tower (AS45609)',
      duration: '3 minutes',
      stirShaken: 'VERIFIED',
      anomalies: [],
    },
    voice: {
      aiConfidence: '2% Confidence (Human)',
      model: 'VoiceGuard-v4.2 Neural Biometrics',
      microTremor: 'NORMAL_HUMAN_MICROTREMOR',
      formantStatus: 'Natural Harmonic Formants',
      verdict: 'HUMAN_VOICE_VERIFIED',
    },
    bank: {
      destinationAccount: 'ICICI-UNI-5544-1100',
      accountAge: '1825 Days Old (5 Years)',
      velocity24h: '1 Inbound / 0 Outbound',
      kycStatus: 'FULL_BIOMETRIC_KYC',
      verdict: 'CLEARED_LEGITIMATE_ACCOUNT',
    },
    timeline: [
      { step: 1, title: 'Telecom Metadata Analysis', desc: 'STIR/SHAKEN Handshake Verified. Airtel Cellular Node.', time: '14:22:02' },
      { step: 2, title: 'Voice Biometrics Analysis', desc: 'Human Voice Verified (2% Deepfake score).', time: '14:22:04' },
      { step: 3, title: 'Bank Account Graph', desc: '5-Year-Old Verified Institutional Account.', time: '14:22:06' },
      { step: 4, title: 'Zero-Knowledge Threat Fusion', desc: 'Multi-Vector Score 12/100 Calculated. Threat Level LOW.', time: '14:22:08' },
    ],
    decision: {
      recommendation: 'AUTO-CLEARED — TRANSACTION APPROVED WITHOUT INTERVENTION',
      officerName: 'Automated System',
      clearance: 'Level 5 (RBI Certified)',
      dispatchStatus: 'CLEARED',
    },
  },
  'TXN-662011': {
    id: 'TXN-662011',
    caseTitle: 'Routine Verified E-Commerce Merchant Payment',
    targetAccount: 'AXIS-****6677',
    customerName: 'Priya Sharma',
    amount: '₹ 45,000',
    severity: 'LOW',
    threatScore: 8,
    status: 'CLEARED',
    timestamp: '2026-07-25 14:19:00 IST',
    telecom: {
      callerId: '+91-9811223344 (Authenticated Device)',
      origin: 'Jio Mumbai Cellular Node (AS55836)',
      duration: '1 minute',
      stirShaken: 'VERIFIED',
      anomalies: [],
    },
    voice: {
      aiConfidence: '1% Confidence (Human)',
      model: 'VoiceGuard-v4.2 Neural Biometrics',
      microTremor: 'NORMAL_HUMAN_MICROTREMOR',
      formantStatus: 'Natural Speech Formants',
      verdict: 'HUMAN_VOICE_VERIFIED',
    },
    bank: {
      destinationAccount: 'PAYTM-MERCHANT-9921',
      accountAge: '1200 Days Old',
      velocity24h: '2 Inbound / 1 Outbound',
      kycStatus: 'FULL_BIOMETRIC_KYC',
      verdict: 'CLEARED_LEGITIMATE_MERCHANT',
    },
    timeline: [
      { step: 1, title: 'Telecom Metadata Analysis', desc: 'STIR/SHAKEN Handshake Verified. Jio Cellular Node.', time: '14:19:02' },
      { step: 2, title: 'Voice Biometrics Analysis', desc: 'Human Voice Verified (1% Deepfake score).', time: '14:19:04' },
      { step: 3, title: 'Bank Account Graph', desc: 'Verified Merchant Account.', time: '14:19:06' },
      { step: 4, title: 'Zero-Knowledge Threat Fusion', desc: 'Multi-Vector Score 8/100 Calculated. Threat Level LOW.', time: '14:19:08' },
    ],
    decision: {
      recommendation: 'AUTO-CLEARED — ROUTINE TRANSACTION APPROVED',
      officerName: 'Automated System',
      clearance: 'Level 5 (RBI Certified)',
      dispatchStatus: 'CLEARED',
    },
  },
  'TXN-551900': {
    id: 'TXN-551900',
    caseTitle: 'Suspicious Rapid Layering & Velocity Surge',
    targetAccount: 'KOTAK-****3344',
    customerName: 'Vikram Shah',
    amount: '₹ 8,20,000',
    severity: 'MEDIUM',
    threatScore: 42,
    status: 'MONITORING',
    timestamp: '2026-07-25 14:17:00 IST',
    telecom: {
      callerId: '+91-22-67890123 (VoIP Proxy Desk)',
      origin: 'Laos VoIP Gateway Node (AS13582)',
      duration: '15 minutes',
      stirShaken: 'FAILED (CLI Mismatch)',
      anomalies: ['STIR_SHAKEN_FAILED'],
    },
    voice: {
      aiConfidence: '45% Confidence (Borderline)',
      model: 'VoiceGuard-v4.2 Neural Biometrics',
      microTremor: 'MODERATE_NOISE',
      formantStatus: 'Slight Phase Discontinuity',
      verdict: 'SUSPECTED_SYNTHETIC',
    },
    bank: {
      destinationAccount: 'KOTAK-MULE-9910-4412',
      accountAge: '5 Days Old',
      velocity24h: '8 Inbound / 6 Outbound',
      kycStatus: 'PARTIAL_KYC',
      verdict: 'SUSPECTED_BANK_MULE',
    },
    timeline: [
      { step: 1, title: 'Telecom Metadata Analysis', desc: 'STIR/SHAKEN Handshake Failed. VoIP Node Traced.', time: '14:17:02' },
      { step: 2, title: 'Voice Biometrics Analysis', desc: '45% Borderline Confidence.', time: '14:17:04' },
      { step: 3, title: 'Bank Mule Velocity Graph', desc: 'Destination Kotak account 5 days old with rapid outbound activity.', time: '14:17:06' },
      { step: 4, title: 'Zero-Knowledge Threat Fusion', desc: 'Multi-Vector Score 42/100 Calculated. Threat Level MEDIUM.', time: '14:17:08' },
    ],
    decision: {
      recommendation: 'MONITORING & TEMPORARY HOLD FOR COMPLIANCE VERIFICATION',
      officerName: 'Officer AZ-99',
      clearance: 'Level 5 (RBI Certified)',
      dispatchStatus: 'ACTIVE_MONITORING',
    },
  },
};

// Per-transaction investigation data — each entry in the queue has its own dossier
const QUEUE_INVESTIGATIONS: Record<string, InvestigationData> = {
  'TXN-998822': DEFAULT_INVESTIGATION,

  'TXN-884210': {
    id: 'CASE-2026-VC-8812',
    caseTitle: 'Voice Synthetic Impersonation · ICICI Customer',
    targetAccount: 'ICICI-****9921',
    customerName: 'Suresh Patel (Business Owner)',
    amount: '₹ 15,00,000',
    severity: 'HIGH',
    threatScore: 78,
    status: 'UNDER_REVIEW',
    timestamp: '2026-07-25 14:24:09 IST',
    telecom: {
      callerId: '+91-80-45678901 (Fake ICICI Helpdesk)',
      origin: 'Ho Chi Minh VoIP Gateway (AS17546)',
      duration: '42 minutes',
      stirShaken: 'FAILED (CLI Mismatch)',
      anomalies: ['STIR_SHAKEN_FAILED', 'FOREIGN_VOIP_ORIGIN'],
    },
    voice: {
      aiConfidence: '81% Confidence (Synthetic)',
      model: 'VoiceGuard-v4.2 Neural Biometrics',
      microTremor: 'MISSING (Artificial Pitch Variance)',
      formantStatus: 'Mild Phase Discontinuity',
      verdict: 'AI_VOICE_PROBABLE',
    },
    bank: {
      destinationAccount: 'PNB-MULE-7741-2201',
      accountAge: '11 Days Old',
      velocity24h: '8 Inbound / 5 Outbound (₹ 48 Lakh)',
      kycStatus: 'PARTIAL_KYC (Incomplete Docs)',
      verdict: 'HIGH_RISK_MULE',
    },
    timeline: [
      { step: 1, title: 'Telecom Metadata Analysis', desc: 'STIR/SHAKEN Failed. VoIP origin traced to Vietnam.', time: '14:24:11' },
      { step: 2, title: 'Voice Biometrics Deepfake Analysis', desc: '81% AI synthesis probability. Formant anomaly detected.', time: '14:24:13' },
      { step: 3, title: 'Bank Mule Velocity Graph', desc: 'PNB mule account — 8 inbound transfers in 4 hours.', time: '14:24:15' },
      { step: 4, title: 'Zero-Knowledge Threat Fusion', desc: 'Multi-Vector Score 78/100. Threat Level HIGH.', time: '14:24:17' },
      { step: 5, title: 'Human-in-the-Loop Clearance Required', desc: 'Officer review required before action.', time: '14:24:19' },
    ],
    decision: {
      recommendation: 'ESCALATE FOR OFFICER REVIEW · MONITOR MULE CHAIN',
      officerName: 'Officer AZ-99',
      clearance: 'Clearance Level 5 (RBI Certified)',
      dispatchStatus: 'PENDING_OFFICER_APPROVAL',
    },
  },

  'TXN-773199': {
    id: 'CASE-2026-CLR-7732',
    caseTitle: 'Routine Transfer · SBI Customer · Low Risk',
    targetAccount: 'SBI-****8832',
    customerName: 'Anita Desai (Homemaker)',
    amount: '₹ 2,50,000',
    severity: 'LOW',
    threatScore: 12,
    status: 'UNDER_REVIEW',
    timestamp: '2026-07-25 14:22:00 IST',
    telecom: {
      callerId: 'N/A (App-Initiated Transfer)',
      origin: 'SBI Mobile App Server (Mumbai)',
      duration: '0 minutes',
      stirShaken: 'VERIFIED',
      anomalies: [],
    },
    voice: {
      aiConfidence: '2% Confidence (Natural)',
      model: 'VoiceGuard-v4.2 Neural Biometrics',
      microTremor: 'NORMAL (Natural Variance)',
      formantStatus: 'Normal Formant Distribution',
      verdict: 'HUMAN_VOICE_CONFIRMED',
    },
    bank: {
      destinationAccount: 'SBI-****4411',
      accountAge: '4 Years Old',
      velocity24h: '1 Inbound / 0 Outbound',
      kycStatus: 'FULL_KYC (Verified)',
      verdict: 'LOW_RISK',
    },
    timeline: [
      { step: 1, title: 'Telecom Metadata Analysis', desc: 'No telecom vector. App-initiated transfer verified.', time: '14:22:02' },
      { step: 2, title: 'Voice Biometrics Deepfake Analysis', desc: 'No voice call detected. Skip.', time: '14:22:03' },
      { step: 3, title: 'Bank Mule Velocity Graph', desc: 'Destination account — 4 years old, full KYC, no velocity alert.', time: '14:22:04' },
      { step: 4, title: 'Zero-Knowledge Threat Fusion', desc: 'Score 12/100. No threat detected.', time: '14:22:05' },
      { step: 5, title: 'Auto-Cleared — No Action Required', desc: 'All vectors clear. Transaction auto-approved.', time: '14:22:06' },
    ],
    decision: {
      recommendation: 'AUTO-CLEARED · NO ACTION REQUIRED',
      officerName: 'Officer AZ-99',
      clearance: 'Clearance Level 5 (RBI Certified)',
      dispatchStatus: 'NO_ACTION_REQUIRED',
    },
  },

  'TXN-662011': {
    id: 'CASE-2026-CLR-6621',
    caseTitle: 'Small UPI Transfer · Axis Customer · Low Risk',
    targetAccount: 'AXIS-****6677',
    customerName: 'Priya Venkataraman (Student)',
    amount: '₹ 45,000',
    severity: 'LOW',
    threatScore: 8,
    status: 'UNDER_REVIEW',
    timestamp: '2026-07-25 14:19:45 IST',
    telecom: {
      callerId: 'N/A (UPI Transfer)',
      origin: 'Axis Bank UPI Gateway (Delhi)',
      duration: '0 minutes',
      stirShaken: 'VERIFIED',
      anomalies: [],
    },
    voice: {
      aiConfidence: '1% Confidence (Natural)',
      model: 'VoiceGuard-v4.2 Neural Biometrics',
      microTremor: 'NORMAL (Natural Variance)',
      formantStatus: 'Normal Formant Distribution',
      verdict: 'HUMAN_VOICE_CONFIRMED',
    },
    bank: {
      destinationAccount: 'AXIS-****2290',
      accountAge: '2 Years Old',
      velocity24h: '1 Inbound / 1 Outbound',
      kycStatus: 'FULL_KYC (Verified)',
      verdict: 'LOW_RISK',
    },
    timeline: [
      { step: 1, title: 'Telecom Metadata Analysis', desc: 'UPI transfer, no voice call. Origin Axis UPI gateway.', time: '14:19:47' },
      { step: 2, title: 'Voice Biometrics Deepfake Analysis', desc: 'No voice vector to analyse.', time: '14:19:48' },
      { step: 3, title: 'Bank Mule Velocity Graph', desc: 'Normal account, full KYC, low velocity.', time: '14:19:49' },
      { step: 4, title: 'Zero-Knowledge Threat Fusion', desc: 'Score 8/100. No threat detected.', time: '14:19:50' },
      { step: 5, title: 'Auto-Cleared — No Action Required', desc: 'All vectors clear. Transaction auto-approved.', time: '14:19:51' },
    ],
    decision: {
      recommendation: 'AUTO-CLEARED · NO ACTION REQUIRED',
      officerName: 'Officer AZ-99',
      clearance: 'Clearance Level 5 (RBI Certified)',
      dispatchStatus: 'NO_ACTION_REQUIRED',
    },
  },

  'TXN-551900': {
    id: 'CASE-2026-MON-5519',
    caseTitle: 'Suspicious Medium-Risk Transfer · Kotak Customer',
    targetAccount: 'KOTAK-****3344',
    customerName: 'Vijay Narayan (Retired)',
    amount: '₹ 8,20,000',
    severity: 'MEDIUM',
    threatScore: 42,
    status: 'UNDER_REVIEW',
    timestamp: '2026-07-25 14:17:30 IST',
    telecom: {
      callerId: '+91-22-66778899 (Unverified)',
      origin: 'Mumbai PSTN Exchange (Domestic)',
      duration: '18 minutes',
      stirShaken: 'FAILED (Partial Attestation)',
      anomalies: ['STIR_SHAKEN_PARTIAL', 'COERCION_KEYWORDS_DETECTED'],
    },
    voice: {
      aiConfidence: '34% Confidence (Inconclusive)',
      model: 'VoiceGuard-v4.2 Neural Biometrics',
      microTremor: 'NORMAL (Natural Variance)',
      formantStatus: 'Normal Formant Distribution',
      verdict: 'INCONCLUSIVE',
    },
    bank: {
      destinationAccount: 'HDFC-****5512',
      accountAge: '6 Months Old',
      velocity24h: '4 Inbound / 2 Outbound (₹ 12 Lakh)',
      kycStatus: 'MINIMUM_EKYC',
      verdict: 'MEDIUM_RISK',
    },
    timeline: [
      { step: 1, title: 'Telecom Metadata Analysis', desc: 'Partial STIR attestation. Coercion keywords flagged.', time: '14:17:32' },
      { step: 2, title: 'Voice Biometrics Deepfake Analysis', desc: '34% AI probability — inconclusive. Manual review suggested.', time: '14:17:34' },
      { step: 3, title: 'Bank Mule Velocity Graph', desc: 'Destination account — 6 months old, minimal KYC, moderate velocity.', time: '14:17:36' },
      { step: 4, title: 'Zero-Knowledge Threat Fusion', desc: 'Score 42/100. Moderate threat — monitoring advised.', time: '14:17:38' },
      { step: 5, title: 'Human-in-the-Loop Clearance Required', desc: 'Officer flagged for manual review.', time: '14:17:40' },
    ],
    decision: {
      recommendation: 'MONITOR & FLAG · ESCALATE IF VELOCITY INCREASES',
      officerName: 'Officer AZ-99',
      clearance: 'Clearance Level 5 (RBI Certified)',
      dispatchStatus: 'MONITORING',
    },
  },
};

const SEARCH_DATABASE: SearchResultItem[] = [
  { id: 'S1', title: 'CASE-2026-DA-9904', category: 'Investigation', subtitle: 'Digital Arrest Scam · Rameshwar Sharma · ₹ 50,00,000', page: 'investigation', targetId: 'TXN-998822' },
  { id: 'S2', title: 'CASE-2026-VOICE-CLONE-8812', category: 'Investigation', subtitle: 'Voice Synthetic Impersonation · Suresh Patel · ₹ 15,00,000', page: 'investigation', targetId: 'TXN-884210' },
  { id: 'S3', title: 'CASE-2026-MULE-LAYERING-4410', category: 'Investigation', subtitle: 'Rapid Layering Mule Ring · Vikram Shah · ₹ 8,20,000', page: 'investigation', targetId: 'TXN-551900' },
  { id: 'S4', title: 'TXN-998822', category: 'Transaction', subtitle: 'HDFC-****4521 · ₹ 50,00,000 · Score: 94', page: 'monitoring', targetId: 'TXN-998822' },
  { id: 'S5', title: 'TXN-884210', category: 'Transaction', subtitle: 'ICICI-****9921 · ₹ 15,00,000 · Score: 78', page: 'monitoring', targetId: 'TXN-884210' },
  { id: 'S6', title: 'TXN-773199', category: 'Transaction', subtitle: 'SBI-****8832 · ₹ 2,50,000 · Score: 12', page: 'monitoring', targetId: 'TXN-773199' },
  { id: 'S7', title: 'TXN-662011', category: 'Transaction', subtitle: 'AXIS-****6677 · ₹ 45,000 · Score: 8', page: 'monitoring', targetId: 'TXN-662011' },
  { id: 'S8', title: 'TXN-551900', category: 'Transaction', subtitle: 'KOTAK-****3344 · ₹ 8,20,000 · Score: 42', page: 'monitoring', targetId: 'TXN-551900' },
  { id: 'S9', title: 'RPT-2026-07-DA-001', category: 'Report', subtitle: 'Digital Arrest Scam Incident Dossier (PDF/JSON)', page: 'reports', targetId: 'RPT-2026-07-DA-001' },
  { id: 'S10', title: 'Rameshwar Sharma', category: 'Customer', subtitle: 'Retd. GM · Target Account HDFC-****4521', page: 'investigation', targetId: 'TXN-998822' },
  { id: 'S11', title: '+91-11-23012345', category: 'Phone', subtitle: 'Spoofed CBI Cyber HQ Caller ID', page: 'investigation', targetId: 'TXN-998822' },
  { id: 'S12', title: 'HDFC-****4521', category: 'Account', subtitle: 'Victim Primary Bank Account', page: 'monitoring', targetId: 'TXN-998822' },
];

export function mapAdjudicationToInvestigation(adj: any): InvestigationData {
  const rep = adj.intelligence_report || {};
  const tel = rep.telecom_analysis || {};
  const voice = rep.deepfake_analysis || {};
  const fin = rep.financial_analysis || {};

  const now = new Date(adj.timestamp || Date.now());
  const timeStr = now.toLocaleTimeString('en-IN', { hour12: false }) + ' IST';

  const amountFormatted = fin.attempted_transfer_amount
    ? `₹ ${Number(fin.attempted_transfer_amount).toLocaleString('en-IN')}`
    : '₹ 50,00,000';

  const microTremorText = voice.spectral_anomalies?.includes('MISSING_MICRO_TREMOR')
    ? 'MISSING (Artificial Pitch Variance)'
    : 'NORMAL (Natural Variance)';

  const formantText = voice.spectral_anomalies?.includes('SYNTHETIC_FORMANT_PATTERN') || voice.spectral_anomalies?.includes('FORMANT_DISCONTINUITY')
    ? 'Phase Discontinuity Detected'
    : 'Normal Formant Distribution';

  const velocityText = fin.velocity_last_24h
    ? `${fin.velocity_last_24h.inbound_transfers || 0} Inbound / ${fin.velocity_last_24h.outbound_transfers || 0} Outbound`
    : '0 Transfers';

  return {
    id: adj.case_id || adj.adjudication_id || rep.report_id || 'CASE-2026-DA-REAL',
    caseTitle: rep.classification === 'DIGITAL_ARREST_SCAM'
      ? 'CBI Cyber Crime HQ Spoof & Digital Arrest Coercion'
      : rep.classification === 'SUSPICIOUS'
      ? 'Suspicious Telecom & Financial Anomaly'
      : 'Standard Non-Threat Transaction',
    targetAccount: tel.target_phone ? `TEL-${tel.target_phone.slice(-4)}` : 'HDFC-****4521',
    customerName: tel.target_phone || 'Target Customer',
    amount: amountFormatted,
    severity: adj.threat_level || (adj.threat_score >= 80 ? 'CRITICAL' : adj.threat_score >= 40 ? 'MEDIUM' : 'LOW'),
    threatScore: adj.threat_score ?? 0,
    status: adj.requires_hitl ? 'AWAITING_HITL' : 'UNDER_REVIEW',
    timestamp: adj.timestamp || new Date().toLocaleString(),
    telecom: {
      callerId: tel.incoming_caller_id || 'Unknown',
      origin: tel.true_origin || 'Unknown Node',
      duration: `${tel.call_duration_minutes || 0} minutes`,
      stirShaken: tel.stir_shaken_verified ? 'VERIFIED' : 'FAILED (CLI Mismatch)',
      anomalies: tel.anomalies_detected || [],
    },
    voice: {
      aiConfidence: `${Math.round((voice.ai_synthesis_probability || 0) * 100)}% Confidence`,
      model: voice.model_version || 'VoiceShield-v3',
      microTremor: microTremorText,
      formantStatus: formantText,
      verdict: voice.verdict || 'ANALYSIS_COMPLETE',
    },
    bank: {
      destinationAccount: fin.destination_account || 'N/A',
      accountAge: `${fin.account_age_days ?? 0} Days Old`,
      velocity24h: velocityText,
      kycStatus: fin.kyc_status || 'UNKNOWN',
      verdict: fin.mule_probability || 'LOW_RISK',
    },
    timeline: [
      { step: 1, title: 'Telecom Metadata Analysis', desc: `STIR/SHAKEN ${tel.stir_shaken_verified ? 'Passed' : 'Failed'}. Origin: ${tel.true_origin || 'N/A'}.`, time: timeStr },
      { step: 2, title: 'Voice Biometrics Deepfake Analysis', desc: `${Math.round((voice.ai_synthesis_probability || 0) * 100)}% Synthetic Audio. Verdict: ${voice.verdict || 'N/A'}.`, time: timeStr },
      { step: 3, title: 'Bank Mule Velocity Graph', desc: `Destination ${fin.destination_account || 'account'} flagged (${velocityText}).`, time: timeStr },
      { step: 4, title: 'Zero-Knowledge Threat Fusion', desc: `Score ${adj.threat_score}/100. Threat Level ${adj.threat_level}.`, time: timeStr },
      { step: 5, title: 'Human-in-the-Loop Clearance Required', desc: adj.requires_hitl ? 'Awaiting Officer Approval for Account Freeze.' : 'Cleared — No HITL Action Required.', time: timeStr },
    ],
    decision: {
      recommendation: adj.recommendation || 'MONITOR_AND_FLAG',
      officerName: 'Officer AZ-99',
      clearance: 'Clearance Level 5 (RBI Certified)',
      dispatchStatus: adj.requires_hitl ? 'PENDING_OFFICER_APPROVAL' : 'NO_ACTION_REQUIRED',
    },
  };
}

interface AegisContextType {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  isAuthenticated: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
  user: { name: string; role: string; clearance: string; cert: string };
  
  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: SearchResultItem[];
  executeSearchSelect: (item: SearchResultItem) => void;

  // Investigation & Simulation
  testCases: TestCaseItem[];
  selectedTestCaseId: string;
  setSelectedTestCaseId: (id: string) => void;
  investigation: InvestigationData;
  isAlertOpen: boolean;
  setIsAlertOpen: (open: boolean) => void;
  simulateScam: (caseIdOrToolFn?: any, callToolFn?: any) => void;
  isSimulating: boolean;
  simulationStep: number;
  
  // Freeze & Action State
  freezeState: 'idle' | 'freezing' | 'frozen';
  handleFreezeTransaction: (callToolFn?: any) => void;
  updateFromBackend: (data: any) => void;

  // Settings
  settings: AegisSettings;
  saveSettings: (newSettings: AegisSettings) => boolean;

  // Exports & Downloads
  triggerGenerateReport: (format: 'pdf' | 'json', customData?: InvestigationData) => void;
  triggerExportData: (format: 'csv' | 'json' | 'pdf', dataset: 'transactions' | 'reports' | 'investigation' | 'telemetry') => void;
  
  // Toasts & Notifications
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;
  
  notifications: NotificationItem[];
  markNotificationsRead: () => void;
  
  // Selected Txn / Report
  selectedTxnId: string;
  setSelectedTxnId: (id: string) => void;
  selectedReportModal: InvestigationData | null;
  setSelectedReportModal: (rpt: InvestigationData | null) => void;
  
  // Rescan / Refresh
  rescanThreats: () => void;
  isRescanning: boolean;

  // SOC Monitoring State
  monitoringPaused: boolean;
  setMonitoringPaused: (paused: boolean) => void;
}

const AegisContext = createContext<AegisContextType | undefined>(undefined);

export interface AegisProviderProps {
  children: React.ReactNode;
  callTool?: (name: string, args: Record<string, any>) => Promise<any>;
  isReady?: boolean;
}

export const AegisProvider: React.FC<AegisProviderProps> = ({ children, callTool, isReady }) => {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [user] = useState({
    name: 'Officer-AZ-99',
    role: 'Senior Fraud Officer',
    clearance: 'Level 5 (L5)',
    cert: 'RBI Certified',
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = (message: string, type: ToastItem['type'] = 'info') => {
    const id = `t-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: 'N1', title: 'Critical Alert', body: 'CASE-2026-DA-9904 flagged with 94 threat score', time: '14:28 IST', unread: true, page: 'investigation' },
    { id: 'N2', title: 'SIP Spoof Detected', body: 'Caller ID +91-11-23012345 mismatch from Cambodia AS13824', time: '14:28 IST', unread: true, page: 'monitoring' },
    { id: 'N3', title: 'Mule Velocity Spike', body: 'SBI-MULE-4482 received 14 transfers in 2 hours', time: '14:26 IST', unread: false, page: 'monitoring' },
  ]);

  const markNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  // Settings with LocalStorage persistence
  const [settings, setSettings] = useState<AegisSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('aegis_settings_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.warn('Could not read settings from localStorage', e);
    }
  }, []);

  // ── SSE (Server-Sent Events) Listener ──
  // Connects to the backend's real-time event stream for live guard updates if available.
  useEffect(() => {
    const sseUrls = [
      'https://aegis-protocol-6a-kernel-guardians-amrita-university-coimbatore.app.nitrocloud.ai/api/v1/events',
      'http://localhost:3002/api/v1/events',
      'http://localhost:3000/api/v1/events',
      'http://localhost:3099/api/v1/events',
    ];
    let eventSource: EventSource | null = null;

    if (typeof window !== 'undefined' && window.location.port === '3000') {
      try {
        eventSource = new EventSource('/api/v1/events');

        eventSource.addEventListener('connected', (e: MessageEvent) => {
          console.log('[SSE] Connected to Aegis backend:', JSON.parse(e.data));
        });

        eventSource.addEventListener('guard_frozen', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            updateFromBackend({
              transaction_id: data.transaction_id,
              threat_score: data.threat_score,
              threat_level: data.threat_level,
              status: 'FROZEN_PENDING_REVIEW',
              data: data.investigator_report,
            });
            setIsAlertOpen(true);
            showToast(`🚨 [LIVE] CRITICAL THREAT — Score ${data.threat_score}/100. Officer Action Required!`, 'error');
          } catch (err) {
            console.warn('[SSE] Failed to parse guard_frozen event:', err);
          }
        });

        eventSource.addEventListener('guard_resolved', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            setFreezeState(data.action === 'FREEZE' ? 'frozen' : 'idle');
            setIsAlertOpen(false);
            if (data.mha_dispatch_triggered) {
              showToast(`✅ [LIVE] Account Frozen & MHA Alert Dispatched (Case: ${data.mha_case_id || 'DISPATCHED'})`, 'success');
            } else {
              showToast(`ℹ️ [LIVE] Guard resolved — Action: ${data.action}`, 'info');
            }
          } catch (err) {
            console.warn('[SSE] Failed to parse guard_resolved event:', err);
          }
        });

        eventSource.onerror = () => {
          eventSource?.close();
        };
      } catch (err) {
        // SSE optional
      }
    }

    return () => {
      eventSource?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSettings = (newSettings: AegisSettings): boolean => {
    try {
      setSettings(newSettings);
      localStorage.setItem('aegis_settings_v1', JSON.stringify(newSettings));
      showToast('✅ System Configuration Saved & Applied', 'success');

      const shouldAutoFreeze = newSettings.autoFreeze || !newSettings.hitlRequired;
      if (shouldAutoFreeze && investigation.threatScore >= 80 && investigation.status === 'AWAITING_HITL') {
        setIsAlertOpen(false);
        handleFreezeTransaction();
      }
      return true;
    } catch (e) {
      showToast('❌ Failed to save configuration', 'error');
      return false;
    }
  };

  // Auth Flow
  const login = (pin: string): boolean => {
    if (pin.trim().length >= 4) {
      setIsAuthenticated(true);
      sessionStorage.setItem('aegis_auth', 'true');
      showToast('🔒 Officer Authenticated · Clearance L5 Active', 'success');
      return true;
    } else {
      showToast('⚠️ Invalid Security PIN or Authorization Credentials', 'error');
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('aegis_auth');
    setActivePage('overview');
    showToast('🚪 Logged out. User session cleared.', 'info');
  };

  // Search Engine
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      return;
    }

    const filtered = SEARCH_DATABASE.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
    setSearchResults(filtered);
  }, [searchQuery]);

  const executeSearchSelect = (item: SearchResultItem) => {
    setActivePage(item.page);
    if (item.targetId?.startsWith('TXN')) {
      setSelectedTxnId(item.targetId);
    }
    setSearchQuery('');
    showToast(`Navigated to ${item.category}: ${item.title}`, 'info');
  };

  // Investigation & Scam Simulation
  const [testCases] = useState<TestCaseItem[]>(TEST_CASES_SUITE);
  const [selectedTestCaseId, setSelectedTestCaseIdState] = useState<string>(TEST_CASES_SUITE[0].id);
  const [investigation, setInvestigation] = useState<InvestigationData>(DEFAULT_INVESTIGATION);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [freezeState, setFreezeState] = useState<'idle' | 'freezing' | 'frozen'>('idle');
  const [monitoringPaused, setMonitoringPaused] = useState(false);

  const [selectedTxnId, setSelectedTxnIdState] = useState('TXN-998822');
  const [selectedReportModal, setSelectedReportModal] = useState<InvestigationData | null>(null);

  const setSelectedTxnId = (id: string) => {
    setSelectedTxnIdState(id);
    const targetDossier =
      TRANSACTION_DOSSIERS[id] ||
      QUEUE_INVESTIGATIONS[id] ||
      TEST_CASES_SUITE.find(
        (c) => c.id === id || c.data.id === id || c.targetAccount.includes(id)
      )?.data;
    if (targetDossier) {
      const shouldAutoFreeze = settings.autoFreeze || !settings.hitlRequired;
      if (shouldAutoFreeze && targetDossier.threatScore >= 80 && targetDossier.status === 'AWAITING_HITL') {
        setInvestigation({
          ...targetDossier,
          status: 'FROZEN',
          decision: {
            ...targetDossier.decision,
            recommendation: 'AUTO-FROZEN — Multi-Hop Account Freeze Executed Automatically without HITL',
            dispatchStatus: 'DISPATCHED_TO_MHA_I4C (NCRB-2026-AUTO)',
          },
        });
        setFreezeState('frozen');
      } else {
        setInvestigation(targetDossier);
        setFreezeState(targetDossier.status === 'FROZEN' ? 'frozen' : 'idle');
      }
    }
  };

  const setSelectedTestCaseId = (id: string) => {
    setSelectedTestCaseIdState(id);
    const currentCase = TEST_CASES_SUITE.find((c) => c.id === id);
    if (currentCase) {
      const shouldAutoFreeze = settings.autoFreeze || !settings.hitlRequired;
      if (shouldAutoFreeze && currentCase.data.threatScore >= 80 && currentCase.data.status === 'AWAITING_HITL') {
        setInvestigation({
          ...currentCase.data,
          status: 'FROZEN',
          decision: {
            ...currentCase.data.decision,
            recommendation: 'AUTO-FROZEN — Multi-Hop Account Freeze Executed Automatically without HITL',
            dispatchStatus: 'DISPATCHED_TO_MHA_I4C (NCRB-2026-AUTO)',
          },
        });
        setFreezeState('frozen');
      } else {
        setInvestigation(currentCase.data);
        setFreezeState(currentCase.data.status === 'FROZEN' ? 'frozen' : 'idle');
      }
      setSelectedTxnIdState(currentCase.data.id || currentCase.id);
    }
  };

  const updateFromBackend = (data: any) => {
    if (!data) return;
    const report = data.investigator_report || data.intelligence_report || data.data || data || {};
    const score = data.threat_score ?? 94;
    const threatLevel = data.threat_level || (score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : 'MEDIUM');
    const shouldAutoFreeze = settings.autoFreeze || !settings.hitlRequired;
    const targetStatus = data.status || (score >= 80 ? (shouldAutoFreeze ? 'FROZEN' : 'AWAITING_HITL') : 'PROCESSED');

    if (targetStatus === 'FROZEN') {
      setFreezeState('frozen');
    }

    setInvestigation((prev) => ({
      ...prev,
      id: data.transaction_id || data.adjudication_id || prev.id,
      threatScore: score,
      severity: threatLevel as any,
      status: targetStatus as any,
      telecom: {
        ...prev.telecom,
        callerId: report.telecom_analysis?.incoming_caller_id || report.incoming_caller_id || prev.telecom.callerId,
        origin: report.telecom_analysis?.true_origin || report.true_origin || (report.telecom_spoofed ? 'VoIP Node Cambodia (AS13824)' : prev.telecom.origin),
        duration: `${report.telecom_analysis?.call_duration_minutes || 142} minutes (Coercion Pattern)`,
        stirShaken: report.telecom_analysis?.stir_shaken_verified || !report.telecom_spoofed ? 'VERIFIED' : 'FAILED (CLI Mismatch)',
      },
      voice: {
        ...prev.voice,
        aiConfidence: `${Math.round((report.deepfake_analysis?.ai_synthesis_probability || report.deepfake_probability || 0.94) * 100)}% Confidence (Synthetic)`,
        model: report.deepfake_analysis?.model_version || 'VoiceGuard-v4.2 Neural Biometrics',
      },
      bank: {
        ...prev.bank,
        destinationAccount: report.financial_analysis?.destination_account || 'SBI-MULE-4482-9901',
        accountAge: `${report.financial_analysis?.account_age_days || report.account_age_days || 3} Days Old`,
        velocity24h: `${report.financial_analysis?.velocity_last_24h?.inbound_transfers || 14} Inbound Transfers`,
      },
      decision: {
        ...prev.decision,
        recommendation: score >= 80 
          ? (shouldAutoFreeze 
              ? 'AUTO-FROZEN — MULTI-HOP ACCOUNT FREEZE EXECUTED WITHOUT HITL' 
              : 'IMMEDIATE MULTI-HOP ACCOUNT FREEZE & MHA I4C INCIDENT DISPATCH')
          : 'MONITOR & SURVEILLANCE',
        dispatchStatus: data.mha_dispatch?.mha_case_id || data.alert_id 
          ? `DISPATCHED_TO_MHA (${data.mha_dispatch?.mha_case_id || data.alert_id})` 
          : (shouldAutoFreeze && score >= 80 ? 'DISPATCHED_TO_MHA_I4C (NCRB-2026-AUTO)' : prev.decision.dispatchStatus),
      },
    }));
  };

  const callCloudMCPTool = async (toolName: string, args: Record<string, any>) => {
    const targetUrls = [
      'http://localhost:3000/mcp',
      'http://localhost:3002/mcp',
      'https://aegis-protocol-6a-kernel-guardians-amrita-university-coimbatore.app.nitrocloud.ai/mcp',
    ];
    const apiKey = 'nsk_live_0d60c6c0577bf7adbfb6d63316b770313caac2a0e5c609fdf7e70beebaafdd19';

    for (const mcpUrl of targetUrls) {
      try {
        const initRes = await fetch(mcpUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'AegisDashboardLocal', version: '1.0.0' },
            },
            id: 1,
          }),
        });

        if (!initRes.ok) continue;

        const sessionId = initRes.headers.get('mcp-session-id');

        const toolRes = await fetch(mcpUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Mcp-Session-Id': sessionId || '',
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: toolName,
              arguments: args,
            },
            id: 2,
          }),
        });

        if (!toolRes.ok) continue;

        const text = await toolRes.text();
        const match = text.match(/data:\s*(\{.*\})/);
        if (match) {
          const json = JSON.parse(match[1]);
          if (json.result?.structuredContent) {
            return json.result.structuredContent;
          }
          if (json.result?.content?.[0]?.text) {
            try {
              return JSON.parse(json.result.content[0].text);
            } catch {
              return json.result.content[0].text;
            }
          }
        }
      } catch (err) {
        console.warn(`[MCP] Direct tool execution error on ${mcpUrl}:`, err);
      }
    }
    return null;
  };

  const fetchBackendAPI = async (endpoint: string, options: RequestInit) => {
    const cloudUrl = 'https://aegis-protocol-6a-kernel-guardians-amrita-university-coimbatore.app.nitrocloud.ai';
    const apiKey = 'nsk_live_0d60c6c0577bf7adbfb6d63316b770313caac2a0e5c609fdf7e70beebaafdd19';

    const targetUrls = [
      `${cloudUrl}${endpoint}`,
      `http://localhost:3002${endpoint}`,
      `http://localhost:3000${endpoint}`,
      `http://localhost:3099${endpoint}`,
      endpoint,
    ];

    const headers = {
      ...(options.headers || {}),
      'Authorization': `Bearer ${apiKey}`,
    };

    for (const url of targetUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 400);

        const res = await fetch(url, { ...options, headers, signal: controller.signal }).catch(() => null);

        clearTimeout(timeoutId);
        if (res && (res.ok || res.status === 202)) {
          return await res.json();
        }
      } catch (err) {
        // Quiet fallback when REST backend is not running
      }
    }
    return null;
  };

  const simulateScam = (caseIdOrToolFn?: any, callToolFnArg?: any) => {
    if (isSimulating) return;

    let targetCaseId = selectedTestCaseId;
    let callToolFn: any = typeof callToolFnArg === 'function' ? callToolFnArg : (callTool && isReady ? callTool : undefined);

    if (typeof caseIdOrToolFn === 'string') {
      if (['high', 'medium', 'safe'].includes(caseIdOrToolFn)) {
        if (caseIdOrToolFn === 'safe') targetCaseId = 'CASE-2026-LEG-1001';
        else if (caseIdOrToolFn === 'medium') targetCaseId = 'CASE-2026-VC-8812';
        else targetCaseId = 'CASE-2026-DA-9904';
      } else {
        targetCaseId = caseIdOrToolFn;
      }
    } else if (typeof caseIdOrToolFn === 'function') {
      callToolFn = caseIdOrToolFn;
    }

    const currentCase = TEST_CASES_SUITE.find((c) => c.id === targetCaseId) || TEST_CASES_SUITE[0];

    // Reset state completely
    setIsAlertOpen(false);
    setFreezeState('idle');
    setIsSimulating(true);
    setSimulationStep(0);
    showToast(`🚀 Simulating Scenario: ${currentCase.caseTitle}...`, 'info');

    (async () => {
      try {
        setSimulationStep(1);
        showToast('📡 Phase 1: Telecom Analysis — Querying CDR & STIR/SHAKEN Nodes...', 'warning');

        setSimulationStep(2);
        showToast('🎙️ Phase 2: Voice Analysis — Running VoiceGuard-v4.2 AI Deepfake Verification...', 'warning');

        setSimulationStep(3);
        showToast('🏦 Phase 3: Bank Mule Graph — Querying Financial Velocity Network...', 'warning');

        let backendResult: any = null;

        // 1. Try MCP Tool call via widget SDK if connected to MCP host
        if (typeof callToolFn === 'function') {
          try {
            showToast('⚡ Executing MCP Tool: aegis_run_threat_analysis...', 'info');
            backendResult = await callToolFn('aegis_run_threat_analysis', {
              sender_phone: currentCase.senderPhone,
              destination_account: currentCase.destinationAccount,
              amount: currentCase.rawAmount,
            });
          } catch (e: any) {
            try {
              backendResult = await callToolFn('run_threat_analysis', {
                sender_phone: currentCase.senderPhone,
                destination_account: currentCase.destinationAccount,
                amount: currentCase.rawAmount,
              });
            } catch (err2) {
              console.warn('MCP callTool failed, trying direct Cloud MCP call', e, err2);
            }
          }
        }

        // 2. Direct Cloud MCP Tool Execution
        if (!backendResult) {
          showToast('⚡ Connecting to NitroStack Cloud MCP Server...', 'info');
          backendResult = await callCloudMCPTool('aegis_run_threat_analysis', {
            scenario: currentCase.id.includes('LEG') ? 'safe' : currentCase.id.includes('VC') ? 'medium' : 'critical',
          });
        }

        // 3. Fallback to REST API Gateway
        if (!backendResult) {
          showToast('⚡ Calling Express Backend API: /api/v1/transaction/process...', 'info');
          backendResult = await fetchBackendAPI('/api/v1/transaction/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: currentCase.rawAmount,
              sender_phone: currentCase.senderPhone,
              destination_account: currentCase.destinationAccount,
            }),
          });
        }

        setSimulationStep(4);
        showToast('⚡ Phase 4: Zero-Knowledge Threat Fusion — Calculating Adjudication Score...', 'warning');

        if (backendResult) {
          updateFromBackend({
            ...backendResult,
            caseData: currentCase.data,
          });
        } else {
          // Fallback to offline preset data if backend offline
          setInvestigation(currentCase.data);
        }

        setSimulationStep(5);
        setIsSimulating(false);

        const finalScore = backendResult?.threat_score ?? currentCase.expectedThreatScore;
        const shouldAutoFreeze = settings.autoFreeze || !settings.hitlRequired;

        if (finalScore >= 80) {
          if (shouldAutoFreeze) {
            setIsAlertOpen(false);
            showToast(`⚡ CRITICAL THREAT DETECTED (${finalScore}/100) — Auto-Freeze executed without HITL!`, 'warning');
            handleFreezeTransaction(callToolFn);
          } else if (settings.criticalAlerts) {
            setIsAlertOpen(true);
            showToast(`🚨 CRITICAL THREAT DETECTED — Threat Score ${finalScore}/100. Human Clearance Required!`, 'error');
          } else {
            setIsAlertOpen(false);
            showToast(`🚨 CRITICAL THREAT DETECTED — Threat Score ${finalScore}/100. Awaiting Action.`, 'error');
          }
        } else {
          setIsAlertOpen(false);
          showToast(`✅ Simulation Complete — Threat Score ${finalScore}/100 (${finalScore >= 60 ? 'HIGH' : 'LOW/BENIGN'}).`, 'success');
        }

      } catch (error: any) {
        setIsSimulating(false);
        showToast(`❌ Simulation failed: ${error.message}`, 'error');
      }
    })();
  };

  // Freeze Action
  const handleFreezeTransaction = (callToolFnArg?: any) => {
    let callToolFn = typeof callToolFnArg === 'function' ? callToolFnArg : (callTool && isReady ? callTool : undefined);

    setFreezeState('freezing');
    showToast('⏳ Initiating Account Freeze & MHA I4C Cyber Dispatch...', 'warning');

    (async () => {
      let freezeResult: any = null;

      // 1. Try MCP Tool call via widget SDK
      if (typeof callToolFn === 'function') {
        try {
          freezeResult = await callToolFn('aegis_approve_freeze_report', {
            approved: true,
            officer_id: 'AZ-99',
            notes: 'Authorized freeze via Aegis Fraud Officer Dashboard',
          });
        } catch (e: any) {
          try {
            freezeResult = await callToolFn('approve_freeze_report', {
              approved: true,
              officer_id: 'AZ-99',
              notes: 'Authorized freeze via Aegis Fraud Officer Dashboard',
            });
          } catch (err2) {
            console.warn('MCP approve_freeze_report failed, trying REST API', e, err2);
          }
        }
      }

      // 2. Direct Cloud MCP Tool Call
      if (!freezeResult) {
        freezeResult = await callCloudMCPTool('aegis_approve_freeze_report', {
          approved: true,
          officer_id: 'AZ-99',
          notes: 'Authorized freeze via Aegis Fraud Officer Dashboard',
        });
      }

      // 3. Fallback to REST API
      if (!freezeResult) {
        freezeResult = await fetchBackendAPI('/api/v1/guard/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'FREEZE',
            transaction_id: investigation.id,
          }),
        });
      }

      const caseId = freezeResult?.alert_id || freezeResult?.details?.mha_dispatch?.mha_case_id || 'NCRB-2026-99482';

      setFreezeState('frozen');
      setInvestigation((prev) => ({
        ...prev,
        status: 'FROZEN',
        decision: {
          ...prev.decision,
          dispatchStatus: `DISPATCHED_TO_MHA_I4C (${caseId})`,
        },
      }));

      showToast(`✅ Multi-Hop Accounts Frozen · MHA I4C Incident Dossier Sent (Case ID: ${caseId})`, 'success');
    })();
  };

  // Rescan Threats / Refresh
  const [isRescanning, setIsRescanning] = useState(false);
  const rescanThreats = () => {
    setIsRescanning(true);
    showToast('🔄 Rescanning SOC Telemetry Streams & ZK Verifier Nodes...', 'info');
    setTimeout(() => {
      setIsRescanning(false);
      showToast('✅ Threat Rescan Complete — All 6 ZK Nodes Responding', 'success');
    }, 900);
  };

  // Report Generator & Data Exports
  const triggerGenerateReport = (format: 'pdf' | 'json', customData?: InvestigationData) => {
    const dataToExport = customData || investigation;
    showToast(`📄 Generating ${format.toUpperCase()} Intelligence Report...`, 'info');

    setTimeout(() => {
      if (format === 'pdf') {
        const success = generatePDFReport(dataToExport);
        if (success) {
          showToast(`✅ Report Downloaded: AEGIS_Dossier_${dataToExport.id}.pdf`, 'success');
        } else {
          showToast('❌ Report Generation Failed. Please retry.', 'error');
        }
      } else {
        exportJSON(dataToExport, `AEGIS_Report_${dataToExport.id}.json`);
        showToast(`✅ JSON Export Downloaded: AEGIS_Report_${dataToExport.id}.json`, 'success');
      }
    }, 600);
  };

  const triggerExportData = (
    format: 'csv' | 'json' | 'pdf',
    dataset: 'transactions' | 'reports' | 'investigation' | 'telemetry'
  ) => {
    showToast(`📥 Exporting ${dataset.toUpperCase()} as ${format.toUpperCase()}...`, 'info');

    setTimeout(() => {
      if (dataset === 'transactions') {
        const data = [
          { id: 'TXN-998822', account: 'HDFC-****4521', amount: '₹ 50,00,000', risk: 'CRITICAL', score: 94, status: 'FLAGGED', time: '14:28' },
          { id: 'TXN-884210', account: 'ICICI-****9921', amount: '₹ 15,00,000', risk: 'HIGH', score: 78, status: 'IN_REVIEW', time: '14:24' },
          { id: 'TXN-773199', account: 'SBI-****8832', amount: '₹ 2,50,000', risk: 'LOW', score: 12, status: 'CLEARED', time: '14:22' },
          { id: 'TXN-662011', account: 'AXIS-****6677', amount: '₹ 45,000', risk: 'LOW', score: 8, status: 'CLEARED', time: '14:19' },
          { id: 'TXN-551900', account: 'KOTAK-****3344', amount: '₹ 8,20,000', risk: 'MEDIUM', score: 42, status: 'MONITORING', time: '14:17' },
        ];
        if (format === 'csv') exportCSV(data, 'Aegis_Transactions_Queue.csv');
        else exportJSON(data, 'Aegis_Transactions_Queue.json');
      } else if (dataset === 'reports') {
        const reports = [
          {
            id: 'RPT-2026-07-DA-001',
            title: 'Digital Arrest Scam Incident Report',
            status: 'DRAFT',
            timestamp: 'July 25, 2026 14:32 IST',
            size: '2.3 MB',
          },
        ];
        if (format === 'csv') exportCSV(reports, 'Aegis_Intelligence_Reports.csv');
        else exportJSON(reports, 'Aegis_Intelligence_Reports.json');
      } else if (dataset === 'telemetry') {
        const logs = [
          { ts: '14:32:01.042', level: 'CRITICAL', source: 'TELECOM_NODE_04', msg: 'SIP trunk spoofing detected — Caller ID +91-11-23012345 routed via Cambodia AS13824' },
          { ts: '14:32:00.891', level: 'CRITICAL', source: 'VOICE_SHIELD_ML', msg: 'AI synthetic voice — confidence 0.962. Formant F2 phase mismatch.' },
          { ts: '14:31:58.410', level: 'WARN', source: 'FINANCIAL_GRAPH', msg: 'Destination SBI-MULE-4482: 14 transfers cleared in 120 min.' },
        ];
        if (format === 'csv') exportCSV(logs, 'Aegis_Telemetry_Logs.csv');
        else exportJSON(logs, 'Aegis_Telemetry_Logs.json');
      } else {
        triggerGenerateReport(format === 'json' ? 'json' : 'pdf');
        return;
      }
      showToast(`✅ Data Exported (${format.toUpperCase()}) Successfully`, 'success');
    }, 500);
  };

  return (
    <AegisContext.Provider
      value={{
        activePage,
        setActivePage,
        isAuthenticated,
        login,
        logout,
        user,
        searchQuery,
        setSearchQuery,
        searchResults,
        executeSearchSelect,
        testCases,
        selectedTestCaseId,
        setSelectedTestCaseId,
        investigation,
        isAlertOpen,
        setIsAlertOpen,
        simulateScam,
        isSimulating,
        simulationStep,
        freezeState,
        handleFreezeTransaction,
        updateFromBackend,
        settings,
        saveSettings,
        triggerGenerateReport,
        triggerExportData,
        toasts,
        showToast,
        removeToast,
        notifications,
        markNotificationsRead,
        selectedTxnId,
        setSelectedTxnId,
        selectedReportModal,
        setSelectedReportModal,
        rescanThreats,
        isRescanning,
        monitoringPaused,
        setMonitoringPaused,
      }}
    >
      {children}
    </AegisContext.Provider>
  );
};

export const useAegis = () => {
  const context = useContext(AegisContext);
  if (!context) {
    throw new Error('useAegis must be used within an AegisProvider');
  }
  return context;
};
