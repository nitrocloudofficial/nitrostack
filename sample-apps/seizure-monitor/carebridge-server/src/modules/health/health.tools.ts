import { ToolDecorator as Tool, Widget, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { PatientRepository } from '../../data/patient.repository.js';
import { HistoricalLabAnalysis } from './health.types.js';

/**
 * Health Intelligence Tools Provider
 * Person 3 Lead
 * EHR & FHIR Repository Integrated
 */
@Injectable()
export class HealthIntelligenceTools {
  constructor(private patientRepo: PatientRepository = new PatientRepository()) {}

  @Tool({
    name: 'get_patient_context',
    description: 'Retrieves patient profile, baseline vitals, recent weekly health state, medical history, and timeline events dynamically by patientId.',
    inputSchema: z.object({
      patientId: z.string().optional().describe('ID of the patient context to retrieve. Defaults to demo patient PAT-88421.'),
    }),
  })
  @Widget('doctor-brief')
  async getPatientContext(
    input: { patientId?: string },
    _context: ExecutionContext
  ) {
    const profile = await this.patientRepo.getPatientProfile(input.patientId);
    const baselineVitals = await this.patientRepo.getBaselineVitals(input.patientId);
    const currentState = await this.patientRepo.getCurrentState(input.patientId);
    const labHistory = await this.patientRepo.getLabHistory(input.patientId);
    const timelineEvents = await this.patientRepo.getTimelineEvents(input.patientId);

    return {
      profile,
      baselineVitals,
      currentState,
      labHistory,
      timelineEvents,
    };
  }

  @Tool({
    name: 'analyze_health_history',
    description: 'Analyzes longitudinal lab trends (e.g., 6-month Hemoglobin decline) and connects current symptoms with historical medical context for a patient.',
    inputSchema: z.object({
      patientId: z.string().optional().describe('Patient ID to analyze. Defaults to demo patient.'),
      query: z.string().optional().describe('Specific symptom or test query to correlate with historical lab data.'),
    }),
  })
  @Widget('health-timeline')
  async analyzeHealthHistory(
    input: { patientId?: string; query?: string },
    _context: ExecutionContext
  ): Promise<HistoricalLabAnalysis> {
    const labHistory = await this.patientRepo.getLabHistory(input.patientId);
    const readings = labHistory.map(entry => ({
      date: entry.date,
      value: entry.value,
      unit: entry.unit,
    }));

    const trajectory = labHistory.map(e => `${e.month}: ${e.value} ${e.unit}`).join(' -> ');
    const isDeclining = labHistory.length > 1 && labHistory[0].value > labHistory[labHistory.length - 1].value;

    return {
      testName: 'Hemoglobin (Hb)',
      trendDirection: isDeclining ? 'declining' : 'stable',
      readings,
      observationSummary: `Hemoglobin longitudinal trend: ${trajectory}`,
      clinicalRelevance: isDeclining
        ? `Observation: Declining historical trend from ${labHistory[0].value} g/dL down to ${labHistory[labHistory.length - 1].value} g/dL over history may correlate with fatigue.`
        : `Observation: Hemoglobin levels remain stable across recorded history.`,
    };
  }

  @Tool({
    name: 'generate_health_timeline',
    description: 'Generates a rich visual health timeline combining longitudinal lab results, guardian vitals events, and today\'s symptom report.',
    inputSchema: z.object({
      patientId: z.string().optional().describe('Patient ID. Defaults to demo patient.'),
    }),
  })
  @Widget('health-timeline')
  async generateHealthTimeline(
    input: { patientId?: string },
    _context: ExecutionContext
  ) {
    const labHistory = await this.patientRepo.getLabHistory(input.patientId);
    const current = await this.patientRepo.getCurrentState(input.patientId);

    const labReadings = labHistory.map(e => ({
      month: e.month,
      date: e.date,
      value: e.value,
      unit: e.unit,
      flag: e.flag,
    }));

    const vitalEvents = [
      { date: 'Recent', label: `Sleep: ${current.sleepHours}h, Resting HR: ${current.restingHeartRateBpm} bpm` },
    ];

    const trajectory = labHistory.map(e => `${e.month}: ${e.value} ${e.unit}`).join(' → ');

    return {
      testName: 'Hemoglobin (Hb)',
      trendDirection: labHistory.length > 1 && labHistory[0].value > labHistory[labHistory.length - 1].value ? 'declining' : 'stable',
      labReadings,
      vitalEvents,
      todaySymptom: current.reportedSymptoms.join(', ') || 'No acute symptoms reported',
      observationSummary: `Hb longitudinal trend: ${trajectory}`,
      clinicalRelevance: 'Observation: Medical history trend analyzed dynamically from EHR repository. No causal claims asserted.',
    };
  }

  @Tool({
    name: 'generate_doctor_brief',
    description: 'Generates a complete, presentation-ready clinician handoff brief including chief complaint, baseline changes, lab trends, medications, and recommended actions.',
    inputSchema: z.object({
      patientId: z.string().optional().describe('Patient ID. Defaults to demo patient.'),
      triageUrgency: z.enum(['Emergency', 'Urgent', 'Routine evaluation', 'Monitor/self-care']).optional().describe('Override triage urgency. Defaults to Routine evaluation.'),
    }),
  })
  @Widget('doctor-brief')
  async generateDoctorBrief(
    input: { patientId?: string; triageUrgency?: string },
    _context: ExecutionContext
  ) {
    const profile = await this.patientRepo.getPatientProfile(input.patientId);
    const baseline = await this.patientRepo.getBaselineVitals(input.patientId);
    const current = await this.patientRepo.getCurrentState(input.patientId);
    const labHistory = await this.patientRepo.getLabHistory(input.patientId);

    const urgency = (input.triageUrgency ?? 'Routine evaluation') as 'Emergency' | 'Urgent' | 'Routine evaluation' | 'Monitor/self-care';
    const labTrajectory = labHistory.map(e => `${e.value} ${e.unit}`).join(' → ');
    const latestHb = labHistory[labHistory.length - 1];

    return {
      patientId: profile.id,
      generatedAt: new Date().toISOString(),
      patientName: profile.name,
      patientAge: profile.age,
      patientGender: profile.gender,
      primaryCondition: profile.primaryCondition,
      medications: profile.medications,
      chiefComplaint: current.reportedSymptoms.length > 0 ? current.reportedSymptoms.join(', ') : 'Routine health check and baseline vitals evaluation',
      duration: '> 7 days',
      baselineChanges: [
        `Sleep: ${baseline.sleepHours}h → ${current.sleepHours}h`,
        `Resting HR: ${baseline.restingHeartRateBpm} bpm → ${current.restingHeartRateBpm} bpm`,
        `Activity: ${baseline.dailySteps.toLocaleString()} → ${current.dailySteps.toLocaleString()} steps`,
        `Meal pattern: ${baseline.mealsPerDay} meals/day → ${current.mealRegularity}`,
      ],
      labObservations: [
        `Hb trajectory: ${labTrajectory}`,
        `Latest Hb: ${latestHb.value} g/dL (${latestHb.flag === 'low' ? 'BELOW' : 'within'} reference range ${latestHb.referenceRange})`,
      ],
      triageUrgency: urgency,
      escalationReasons: [
        'Concurrent baseline vitals shift detected',
        `Haemoglobin latest reading: ${latestHb.value} g/dL`,
      ],
      recommendedActions: [
        'Schedule primary care visit within 48–72 hours',
        'Request CBC and Iron/Ferritin panel if symptomatic',
        'Continue Guardian AI passive vitals tracking',
      ],
      clinicianNotes: 'Patient health data retrieved dynamically from FHIR EHR repository.',
      disclaimer: 'DISCLAIMER: CareBridge AI provides medical triage and care navigation guidance only. This output does NOT constitute a definitive medical diagnosis.',
    };
  }

  @Tool({
    name: 'export_fhir_bundle',
    description: 'Exports raw HL7 FHIR R4 JSON Bundle for a given patient ID, enabling EHR interoperability.',
    inputSchema: z.object({
      patientId: z.string().optional().describe('Patient ID to export. Defaults to PAT-88421.'),
    }),
  })
  async exportFhirBundle(
    input: { patientId?: string },
    _context: ExecutionContext
  ) {
    const bundle = await this.patientRepo.toFhirBundle(input.patientId);
    return {
      status: 'success',
      standard: 'HL7 FHIR R4',
      bundle,
    };
  }

  @Tool({
    name: 'seed_mongodb_database',
    description: 'Triggers seeding or verification of MongoDB Atlas collections (patients, observations, clinical guidelines).',
    inputSchema: z.object({}),
  })
  async seedMongodbDatabase(
    _input: {},
    _context: ExecutionContext
  ) {
    const mongoService = new (await import('../../data/mongo.service.js')).MongoService();
    const success = await mongoService.seedDatabaseIfEmpty();
    return {
      status: success ? 'success' : 'fallback',
      database: 'carebridge_db',
      cluster: 'MongoDB Atlas (cluster0.zjfovlk.mongodb.net)',
      message: success
        ? 'MongoDB Atlas collections (patients, observations, clinical_guidelines) initialized and verified.'
        : 'MongoDB Atlas connection offline. Server operating in high-performance in-memory FHIR fallback mode.',
    };
  }
}
