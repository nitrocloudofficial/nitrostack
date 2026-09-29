import { ToolDecorator as Tool, Widget, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { PatientRepository } from '../../data/patient.repository.js';
import { DETERMINISTIC_RED_FLAGS } from '../triage/triage.types.js';
import { isKeywordTriggered } from '../triage/triage.tools.js';
import { PipelineResult } from './pipeline.types.js';

/**
 * Pipeline Tools Provider - Person 4 Lead
 * Milestone 3: Intelligence Pipeline
 * EHR & FHIR Repository Integrated
 */
@Injectable()
export class PipelineTools {
  constructor(private patientRepo: PatientRepository = new PatientRepository()) {}

  @Tool({
    name: 'orchestrate_carebridge',
    description:
      'Runs the full CAREBRIDGE AI intelligence pipeline from a single user message. ' +
      'Chains: Guardian baseline analysis → patient context → health history intelligence → ' +
      'triage follow-up questions → deterministic red-flag check → urgency classification. ' +
      'Use this when a patient reports a health concern to trigger the complete care navigation workflow.',
    inputSchema: z.object({
      userMessage: z
        .string()
        .describe('The patient\'s health concern in their own words, e.g. "I\'ve been feeling tired lately."'),
      patientId: z.string().optional().describe('Patient ID. Defaults to demo patient PAT-88421.'),
      additionalSymptoms: z
        .array(z.string())
        .optional()
        .describe('Any additional specific symptoms to include in red-flag screening.'),
    }),
  })
  @Widget('carebridge-pipeline')
  async orchestrateCarebridge(
    input: { userMessage: string; patientId?: string; additionalSymptoms?: string[] },
    _context: ExecutionContext
  ): Promise<PipelineResult> {
    // Dynamic EHR Repository Lookup
    const profile = await this.patientRepo.getPatientProfile(input.patientId);
    const baseline = await this.patientRepo.getBaselineVitals(input.patientId);
    const current = await this.patientRepo.getCurrentState(input.patientId);
    const labHistory = await this.patientRepo.getLabHistory(input.patientId);

    // ── STEP 1: Guardian AI ─ Baseline Deviation Analysis ────────────────
    const sleepDiffPct = baseline.sleepHours === 0 ? 0 : Math.round(((current.sleepHours - baseline.sleepHours) / baseline.sleepHours) * 100);
    const hrDiffPct = baseline.restingHeartRateBpm === 0 ? 0 : Math.round(((current.restingHeartRateBpm - baseline.restingHeartRateBpm) / baseline.restingHeartRateBpm) * 100);
    const stepsDiffPct = baseline.dailySteps === 0 ? 0 : Math.round(((current.dailySteps - baseline.dailySteps) / baseline.dailySteps) * 100);

    const guardianSignals: string[] = [];
    if (current.sleepHours < baseline.sleepHours) guardianSignals.push(`sleep decreased (${sleepDiffPct}%)`);
    if (current.restingHeartRateBpm > baseline.restingHeartRateBpm) guardianSignals.push(`resting heart rate increased (+${hrDiffPct}%)`);
    if (current.dailySteps < baseline.dailySteps) guardianSignals.push(`activity decreased (${stepsDiffPct}%)`);
    if (current.mealRegularity !== 'Regular') guardianSignals.push(`meal regularity changed (${current.mealRegularity})`);

    const guardianAnalysis = {
      deviationDetected: guardianSignals.length > 0,
      signals: guardianSignals,
      status: (guardianSignals.length > 0 ? 'changes_detected' : 'normal') as 'normal' | 'changes_detected' | 'significant_deviation',
      details: {
        sleepChange: `${baseline.sleepHours}h -> ${current.sleepHours}h (${sleepDiffPct}%)`,
        hrChange: `${baseline.restingHeartRateBpm} bpm -> ${current.restingHeartRateBpm} bpm (+${hrDiffPct}%)`,
        activityChange: `${baseline.dailySteps.toLocaleString()} steps -> ${current.dailySteps.toLocaleString()} steps (${stepsDiffPct}%)`,
        mealChange: `${baseline.mealsPerDay} meals/day -> ${current.mealRegularity}`,
      },
    };

    // ── STEP 2: Patient Context ───────────────────────────────────────────
    const patientSummary = {
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      primaryCondition: profile.primaryCondition,
      currentSymptoms: [...current.reportedSymptoms, ...(input.additionalSymptoms ?? [])],
    };

    // ── STEP 3: Health Intelligence ─ Longitudinal Lab Trend ─────────────
    const trajectory = labHistory.map(e => `${e.month}: ${e.value} ${e.unit}`).join(' → ');
    const latestHb = labHistory[labHistory.length - 1];

    const historicalIntelligence = {
      testName: 'Hemoglobin (Hb)',
      trendDirection: labHistory.length > 1 && labHistory[0].value > labHistory[labHistory.length - 1].value ? 'declining' : 'stable',
      observationSummary: `Hb longitudinal trend: ${trajectory}`,
      clinicalRelevance:
        `Observation: Lab trends evaluated from FHIR repository for patient ${profile.id}. ` +
        `(Provided as clinical evidence only — no causal claim is asserted.)`,
    };

    // ── STEP 4: Triage ─ Adaptive Follow-up Questions ────────────────────
    const triageFollowUpQuestions = [
      {
        id: 'Q1',
        questionText: 'How long have you been feeling tired?',
        options: ['Less than 3 days', '4–7 days', '1–2 weeks', 'More than 2 weeks'],
      },
      {
        id: 'Q2',
        questionText: 'Is the fatigue affecting your ability to carry out daily tasks?',
        options: ['Not at all', 'Mildly', 'Moderately', 'Severely'],
      },
      {
        id: 'Q3',
        questionText: 'Are you experiencing any of the following alongside tiredness?',
        options: ['Shortness of breath', 'Chest discomfort', 'Dizziness or fainting', 'None of the above'],
      },
    ];

    // ── STEP 5: Deterministic Red-Flag Check ─────────────────────────────
    const allSymptomText = [
      input.userMessage,
      ...patientSummary.currentSymptoms,
    ].join(' ').toLowerCase();

    const matchedRedFlags: string[] = [];
    let isEmergency = false;
    let isUrgent = false;

    for (const rule of DETERMINISTIC_RED_FLAGS) {
      for (const keyword of rule.triggerKeywords) {
        if (isKeywordTriggered(allSymptomText, keyword)) {
          matchedRedFlags.push(`${rule.id}: "${keyword}" → ${rule.category}`);
          if (rule.category === 'Emergency') isEmergency = true;
          if (rule.category === 'Urgent') isUrgent = true;
        }
      }
    }

    const redFlagUrgency = isEmergency ? 'Emergency' : isUrgent ? 'Urgent' : null;

    // ── STEP 6: Urgency Classification (Guardian + History + Red Flags) ──
    const escalationFactors: string[] = [];

    if (guardianAnalysis.deviationDetected) {
      escalationFactors.push(`Guardian AI detected ${guardianSignals.length} baseline shift(s): ${guardianSignals.join(', ')}`);
    }
    if (latestHb && latestHb.value < 12.0) {
      escalationFactors.push(`Haemoglobin is below normal reference (${latestHb.value} g/dL < 12.0 g/dL)`);
    }
    if (matchedRedFlags.length > 0) {
      escalationFactors.push(`Deterministic red-flag triggered: ${matchedRedFlags.join(', ')}`);
    }

    // Final urgency: red-flag overrides everything, otherwise use context
    let finalUrgency: 'Emergency' | 'Urgent' | 'Routine evaluation' | 'Monitor/self-care';
    let recommendedAction: string;

    if (redFlagUrgency === 'Emergency') {
      finalUrgency = 'Emergency';
      recommendedAction = 'Call emergency medical services (911/112) immediately.';
    } else if (redFlagUrgency === 'Urgent') {
      finalUrgency = 'Urgent';
      recommendedAction = 'Seek same-day clinical evaluation at an urgent care center.';
    } else if (escalationFactors.length >= 2) {
      finalUrgency = 'Routine evaluation';
      recommendedAction = 'Schedule a primary care appointment within 48–72 hours. Bring recent lab results.';
    } else {
      finalUrgency = 'Monitor/self-care';
      recommendedAction = 'Monitor symptoms closely. If fatigue persists beyond 7 days or worsens, contact your healthcare provider.';
    }

    return {
      pipelineVersion: '1.0.0',
      userMessage: input.userMessage,
      guardianAnalysis,
      patientSummary,
      historicalIntelligence,
      triageFollowUpQuestions,
      redFlagAssessment: {
        isRedFlagTriggered: matchedRedFlags.length > 0,
        matchedRedFlags,
        urgency: redFlagUrgency ?? 'None',
        recommendedAction,
      },
      finalUrgencyClassification: finalUrgency,
      escalationFactors,
      safetyDisclaimer:
        'DISCLAIMER: CareBridge AI provides medical triage and care navigation guidance only. ' +
        'This output does NOT constitute a definitive medical diagnosis. Always consult a qualified healthcare professional.',
    };
  }
}
