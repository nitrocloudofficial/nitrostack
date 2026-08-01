/**
 * PharmaGuard Module — Multi-Agent Architecture
 * 
 * Instead of one monolithic tools class, the system is split into
 * 4 specialized agents, each responsible for a specific domain:
 * 
 * 🏥 Patient Agent    — Patient profile management & file ingestion
 * 🛡️ Safety Agent     — All Allopathic drug safety checks (9 tools)
 * 🌿 AYUSH Agent      — India-localized herb-drug interaction checks
 * 📊 Report Agent     — Risk aggregation & clinical report generation
 * 
 * This multi-agent design:
 * 1. Reduces token overhead — LLM only needs to understand relevant tools
 * 2. Enables independent scaling — each agent can be upgraded separately
 * 3. Cleanly separates concerns — patient data, safety logic, AYUSH, reporting
 */
import { Module } from '@nitrostack/core';
import { PatientAgent } from './agents/patient-agent.tools.js';
import { SafetyAgent } from './agents/safety-agent.tools.js';
import { AyushAgent } from './agents/ayush-agent.tools.js';
import { ReportAgent } from './agents/report-agent.tools.js';
import { PharmaGuardResources } from './pharma-guard.resources.js';
import { PharmaGuardPrompts } from './pharma-guard.prompts.js';

@Module({
  name: 'pharma-guard',
  description: 'AI Medication Safety Copilot — multi-agent clinical risk analysis with AYUSH herb-drug interaction support',
  controllers: [
    PatientAgent,      // 🏥 get_patient_profile, ingest_patient_record
    SafetyAgent,       // 🛡️ 9 safety check tools (interactions, allergies, disease, age, renal, pregnancy, duplicates, alternatives, NLP)
    AyushAgent,        // 🌿 check_ayush_interaction (India-localized)
    ReportAgent,       // 📊 aggregate_risk_score, generate_doctor_report (@Widget)
    PharmaGuardResources,
    PharmaGuardPrompts,
  ]
})
export class PharmaGuardModule {}
