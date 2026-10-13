import { Injectable } from '@nitrostack/core';
import { MongoService } from './mongo.service.js';
import {
  PatientProfile,
  HealthBaseline,
  CurrentHealthState,
  LabResultEntry,
  HealthTimelineEvent,
  DEMO_PATIENT,
  DEMO_PATIENT_BASELINE,
  DEMO_PATIENT_CURRENT,
  DEMO_PATIENT_LAB_HISTORY,
  DEMO_PATIENT_TIMELINE,
} from './patient_dataset.js';
import {
  FHIRBundle,
  FHIRPatient,
  FHIRObservation,
  LOINC_CODES,
} from './fhir.types.js';

interface PatientRecord {
  profile: PatientProfile;
  baseline: HealthBaseline;
  current: CurrentHealthState;
  labHistory: LabResultEntry[];
  timeline: HealthTimelineEvent[];
}

/**
 * Multi-Patient Health Data Repository & FHIR Interoperability Provider
 * Backed by MongoDB Atlas cloud database with in-memory fallback.
 */
@Injectable()
export class PatientRepository {
  private patients: Map<string, PatientRecord> = new Map();

  constructor(private mongoService: MongoService = new MongoService()) {
    this.seedRepository();
  }

  /**
   * Seed local repository fallback
   */
  private seedRepository() {
    this.patients.set('PAT-88421', {
      profile: DEMO_PATIENT,
      baseline: DEMO_PATIENT_BASELINE,
      current: DEMO_PATIENT_CURRENT,
      labHistory: DEMO_PATIENT_LAB_HISTORY,
      timeline: DEMO_PATIENT_TIMELINE,
    });

    this.patients.set('PAT-10042', {
      profile: {
        id: 'PAT-10042',
        name: 'Marcus Chen',
        age: 54,
        gender: 'Male',
        primaryCondition: 'Type 2 Diabetes & Early Cardiac Risk',
        allergies: ['Sulfa drugs'],
        medications: ['Metformin 500mg twice daily', 'Atorvastatin 20mg'],
      },
      baseline: { sleepHours: 7.8, restingHeartRateBpm: 64, dailySteps: 9200, mealsPerDay: 3 },
      current: { sleepHours: 7.8, restingHeartRateBpm: 64, dailySteps: 9200, mealRegularity: 'Regular', reportedSymptoms: [], recordedAt: new Date().toISOString() },
      labHistory: [
        { month: 'January', date: '2026-01-10', testName: 'Hemoglobin (Hb)', value: 14.2, unit: 'g/dL', referenceRange: '13.5 - 17.5 g/dL', flag: 'normal' },
        { month: 'April', date: '2026-04-12', testName: 'Hemoglobin (Hb)', value: 14.1, unit: 'g/dL', referenceRange: '13.5 - 17.5 g/dL', flag: 'normal' },
        { month: 'July', date: '2026-07-15', testName: 'Hemoglobin (Hb)', value: 14.0, unit: 'g/dL', referenceRange: '13.5 - 17.5 g/dL', flag: 'normal' },
      ],
      timeline: [
        { id: 'EVT-201', date: '2026-01-10', category: 'lab_result', title: 'Routine HbA1c & CBC', description: 'All lab parameters within normal limits.', severity: 'info' },
      ],
    });

    this.patients.set('PAT-99120', {
      profile: {
        id: 'PAT-99120',
        name: 'Sarah Connor',
        age: 39,
        gender: 'Female',
        primaryCondition: 'Moderate Persistent Asthma',
        allergies: ['NSAIDs', 'Dust mites'],
        medications: ['Fluticasone inhaler twice daily', 'Albuterol PRN'],
      },
      baseline: { sleepHours: 8.0, restingHeartRateBpm: 62, dailySteps: 10500, mealsPerDay: 3 },
      current: { sleepHours: 6.2, restingHeartRateBpm: 78, dailySteps: 6100, mealRegularity: 'Regular', reportedSymptoms: ['Mild wheezing on exertion'], recordedAt: new Date().toISOString() },
      labHistory: [
        { month: 'February', date: '2026-02-05', testName: 'Hemoglobin (Hb)', value: 13.8, unit: 'g/dL', referenceRange: '12.0 - 15.5 g/dL', flag: 'normal' },
        { month: 'June', date: '2026-06-20', testName: 'Hemoglobin (Hb)', value: 13.6, unit: 'g/dL', referenceRange: '12.0 - 15.5 g/dL', flag: 'normal' },
      ],
      timeline: [
        { id: 'EVT-301', date: '2026-06-20', category: 'symptom_report', title: 'Asthma Symptom Log', description: 'Occasional nighttime cough reported.', severity: 'warning' },
      ],
    });
  }

  private async fetchRecordFromMongo(patientId: string): Promise<PatientRecord | null> {
    if (!this.mongoService.isDbConnected()) {
      await this.mongoService.initConnection();
    }
    const patientsCol = this.mongoService.getCollection('patients');
    const obsCol = this.mongoService.getCollection('observations');

    if (!patientsCol) return null;

    try {
      const pDoc = await patientsCol.findOne({ patientId });
      if (!pDoc) return null;

      let labHistory = pDoc.labHistory;
      if (!labHistory && obsCol) {
        labHistory = await obsCol.find({ patientId }).toArray();
      }

      return {
        profile: pDoc.profile,
        baseline: pDoc.baseline,
        current: pDoc.current,
        labHistory: labHistory || [],
        timeline: pDoc.timeline || [],
      };
    } catch (err: any) {
      console.warn(`⚠️ Mongo lookup failed for ${patientId}:`, err.message);
      return null;
    }
  }

  private async resolvePatientRecord(patientId?: string): Promise<PatientRecord> {
    const targetId = patientId || 'PAT-88421';

    // Try Mongo Atlas first
    const mongoRecord = await this.fetchRecordFromMongo(targetId);
    if (mongoRecord) return mongoRecord;

    // Fallback to local map
    if (this.patients.has(targetId)) {
      return this.patients.get(targetId)!;
    }
    return this.patients.get('PAT-88421')!;
  }

  async getPatientProfile(patientId?: string): Promise<PatientProfile> {
    const rec = await this.resolvePatientRecord(patientId);
    return rec.profile;
  }

  async getBaselineVitals(patientId?: string): Promise<HealthBaseline> {
    const rec = await this.resolvePatientRecord(patientId);
    return rec.baseline;
  }

  async getCurrentState(patientId?: string): Promise<CurrentHealthState> {
    const rec = await this.resolvePatientRecord(patientId);
    return rec.current;
  }

  async getLabHistory(patientId?: string): Promise<LabResultEntry[]> {
    const rec = await this.resolvePatientRecord(patientId);
    return rec.labHistory;
  }

  async getTimelineEvents(patientId?: string): Promise<HealthTimelineEvent[]> {
    const rec = await this.resolvePatientRecord(patientId);
    return rec.timeline;
  }

  /**
   * Converts a patient dataset into an HL7 FHIR R4 JSON Bundle
   */
  async toFhirBundle(patientId?: string): Promise<FHIRBundle> {
    const record = await this.resolvePatientRecord(patientId);
    const { profile, current, labHistory } = record;

    const fhirPatient: FHIRPatient = {
      resourceType: 'Patient',
      id: profile.id,
      active: true,
      name: [{ family: profile.name.split(' ').slice(-1)[0], given: profile.name.split(' ').slice(0, -1) }],
      gender: profile.gender.toLowerCase() as 'male' | 'female',
      birthDate: `${new Date().getFullYear() - profile.age}-01-01`,
    };

    const observations: FHIRObservation[] = [
      {
        resourceType: 'Observation',
        id: `obs-hr-${profile.id}`,
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: LOINC_CODES.RESTING_HEART_RATE.code, display: LOINC_CODES.RESTING_HEART_RATE.display }],
        },
        subject: { reference: `Patient/${profile.id}` },
        effectiveDateTime: current.recordedAt,
        valueQuantity: { value: current.restingHeartRateBpm, unit: 'beats/min', system: 'http://unitsofmeasure.org', code: '/min' },
      },
      {
        resourceType: 'Observation',
        id: `obs-sleep-${profile.id}`,
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: LOINC_CODES.SLEEP_DURATION.code, display: LOINC_CODES.SLEEP_DURATION.display }],
        },
        subject: { reference: `Patient/${profile.id}` },
        effectiveDateTime: current.recordedAt,
        valueQuantity: { value: current.sleepHours, unit: 'h', system: 'http://unitsofmeasure.org', code: 'h' },
      },
    ];

    labHistory.forEach((lab, index) => {
      observations.push({
        resourceType: 'Observation',
        id: `obs-hb-${profile.id}-${index}`,
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: LOINC_CODES.HEMOGLOBIN.code, display: LOINC_CODES.HEMOGLOBIN.display }],
        },
        subject: { reference: `Patient/${profile.id}` },
        effectiveDateTime: lab.date,
        valueQuantity: { value: lab.value, unit: lab.unit, system: 'http://unitsofmeasure.org', code: 'g/dL' },
      });
    });

    return {
      resourceType: 'Bundle',
      id: `bundle-${profile.id}`,
      type: 'collection',
      timestamp: new Date().toISOString(),
      total: 1 + observations.length,
      entry: [
        { fullUrl: `urn:uuid:patient-${profile.id}`, resource: fhirPatient },
        ...observations.map(obs => ({ fullUrl: `urn:uuid:${obs.id}`, resource: obs })),
      ],
    };
  }
}
