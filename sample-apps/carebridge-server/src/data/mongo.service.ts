import { Injectable } from '@nitrostack/core';
import { MongoClient, Db, Collection, Document } from 'mongodb';
import {
  DEMO_PATIENT,
  DEMO_PATIENT_BASELINE,
  DEMO_PATIENT_CURRENT,
  DEMO_PATIENT_LAB_HISTORY,
  DEMO_PATIENT_TIMELINE,
} from './patient_dataset.js';

export interface MongoGuidelineDoc {
  id: string;
  condition: string;
  category: 'Emergency' | 'Urgent' | 'Routine' | 'Self-care';
  keywords: string[];
  protocolSummary: string;
  recommendedAction: string;
  embedding?: number[]; // 1536-dimensional vector embedding for MongoDB Vector Search
  score?: number;      // Vector search similarity score
}

const DEFAULT_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://pappusheth:Bi5KbzBdapvjE4KA@cluster0.zjfovlk.mongodb.net/carebridge_db?retryWrites=true&w=majority';

/**
 * Deterministic helper to generate a normalized 1536-dimensional vector embedding
 * representing clinical concepts for MongoDB Atlas Vector Search.
 */
export function generateClinicalVector(text: string): number[] {
  const VECTOR_DIM = 1536;
  const vector = new Array(VECTOR_DIM).fill(0.001);
  const lower = text.toLowerCase();

  // Map medical concepts to distinct vector dimensions
  if (lower.includes('chest') || lower.includes('heart') || lower.includes('coronary') || lower.includes('bnp') || lower.includes('cardiac')) {
    for (let i = 0; i < 200; i++) vector[i] += 0.45;
  }
  if (lower.includes('stroke') || lower.includes('speech') || lower.includes('facial') || lower.includes('neuro') || lower.includes('migraine')) {
    for (let i = 200; i < 400; i++) vector[i] += 0.45;
  }
  if (lower.includes('fatigue') || lower.includes('hemoglobin') || lower.includes('anemia') || lower.includes('tired')) {
    for (let i = 400; i < 600; i++) vector[i] += 0.45;
  }
  if (lower.includes('faint') || lower.includes('syncope') || lower.includes('dizziness') || lower.includes('dehydration')) {
    for (let i = 600; i < 800; i++) vector[i] += 0.45;
  }
  if (lower.includes('asthma') || lower.includes('wheezing') || lower.includes('breath') || lower.includes('hypoxia') || lower.includes('spo2')) {
    for (let i = 800; i < 1000; i++) vector[i] += 0.45;
  }
  if (lower.includes('diabetes') || lower.includes('glucose') || lower.includes('hba1c') || lower.includes('ketoacidosis')) {
    for (let i = 1000; i < 1200; i++) vector[i] += 0.45;
  }
  if (lower.includes('leg') || lower.includes('swelling') || lower.includes('dvt') || lower.includes('clot') || lower.includes('thrombosis')) {
    for (let i = 1200; i < 1400; i++) vector[i] += 0.45;
  }

  // Normalize vector
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => Number((val / norm).toFixed(6)));
}

/**
 * Calculates Cosine Similarity between two 1536-dim vector embeddings
 */
export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : Number((dotProduct / denominator).toFixed(4));
}

@Injectable()
export class MongoService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;

  constructor() {
    this.initConnection().catch(err => {
      console.warn('⚠️ MongoService initial connection deferred:', err.message);
    });
  }

  async initConnection(): Promise<boolean> {
    if (this.isConnected && this.db) return true;

    try {
      this.client = new MongoClient(DEFAULT_URI, { serverSelectionTimeoutMS: 4000 });
      await this.client.connect();
      this.db = this.client.db('carebridge_db');
      this.isConnected = true;
      console.log('✅ MongoService: Connected to MongoDB Atlas cluster (carebridge_db)');

      await this.seedDatabaseIfEmpty();
      return true;
    } catch (err: any) {
      console.warn(`⚠️ MongoService: Cloud connection unavailable (${err.message}). Using local FHIR repository fallback.`);
      this.isConnected = false;
      return false;
    }
  }

  isDbConnected(): boolean {
    return this.isConnected && this.db !== null;
  }

  getCollection<T extends Document = any>(name: string): Collection<T> | null {
    if (!this.isConnected || !this.db) return null;
    return this.db.collection<T>(name);
  }

  async seedDatabaseIfEmpty(): Promise<boolean> {
    if (!this.db) return false;

    try {
      const patientsCol = this.db.collection('patients');
      const obsCol = this.db.collection('observations');
      const guidelinesCol = this.db.collection('clinical_guidelines');

      const patientCount = await patientsCol.countDocuments();
      if (patientCount < 6) {
        console.log('🌱 Seeding expanded MongoDB Atlas patients collection (6 patients)...');
        await patientsCol.deleteMany({});
        await patientsCol.insertMany([
          // Patient 1: Eleanor Vance
          {
            patientId: 'PAT-88421',
            profile: DEMO_PATIENT,
            baseline: DEMO_PATIENT_BASELINE,
            current: DEMO_PATIENT_CURRENT,
            timeline: DEMO_PATIENT_TIMELINE,
          },
          // Patient 2: Marcus Chen
          {
            patientId: 'PAT-10042',
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
            timeline: [{ id: 'EVT-201', date: '2026-01-10', category: 'lab_result', title: 'Routine HbA1c & CBC', description: 'All lab parameters within normal limits.', severity: 'info' }],
          },
          // Patient 3: Sarah Connor
          {
            patientId: 'PAT-99120',
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
            timeline: [{ id: 'EVT-301', date: '2026-06-20', category: 'symptom_report', title: 'Asthma Symptom Log', description: 'Occasional nighttime cough reported.', severity: 'warning' }],
          },
          // Patient 4: David Miller (Congestive Heart Failure)
          {
            patientId: 'PAT-30114',
            profile: {
              id: 'PAT-30114',
              name: 'David Miller',
              age: 72,
              gender: 'Male',
              primaryCondition: 'Congestive Heart Failure (NYHA Class II)',
              allergies: ['ACE Inhibitors'],
              medications: ['Entresto 49/51mg twice daily', 'Furosemide 40mg daily', 'Carvedilol 12.5mg'],
            },
            baseline: { sleepHours: 7.2, restingHeartRateBpm: 68, dailySteps: 5400, mealsPerDay: 3 },
            current: { sleepHours: 5.5, restingHeartRateBpm: 84, dailySteps: 2100, mealRegularity: 'Irregular', reportedSymptoms: ['Bilateral ankle swelling', 'Shortness of breath lying flat'], recordedAt: new Date().toISOString() },
            timeline: [{ id: 'EVT-401', date: '2026-07-28', category: 'vitals_change', title: 'Fluid Retention Shift', description: 'Weight increased by 4 lbs over 48 hours. SPO2 at 94%.', severity: 'urgent' }],
          },
          // Patient 5: Priya Patel (Acute Migraine & Dehydration)
          {
            patientId: 'PAT-40552',
            profile: {
              id: 'PAT-40552',
              name: 'Priya Patel',
              age: 28,
              gender: 'Female',
              primaryCondition: 'Episodic Migraine with Aura',
              allergies: ['Codeine'],
              medications: ['Sumatriptan 50mg PRN', 'Magnesium Glycinate 400mg'],
            },
            baseline: { sleepHours: 7.5, restingHeartRateBpm: 66, dailySteps: 8500, mealsPerDay: 3 },
            current: { sleepHours: 4.8, restingHeartRateBpm: 76, dailySteps: 4200, mealRegularity: 'Skipped Meals', reportedSymptoms: ['Throbbing unilateral headache', 'Light sensitivity'], recordedAt: new Date().toISOString() },
            timeline: [{ id: 'EVT-501', date: '2026-07-30', category: 'symptom_report', title: 'Acute Migraine Episode', description: 'Patient reports severe left-sided headache following sleep reduction.', severity: 'info' }],
          },
          // Patient 6: Carlos Rodriguez (Post-Surgical Knee & DVT Risk)
          {
            patientId: 'PAT-51209',
            profile: {
              id: 'PAT-51209',
              name: 'Carlos Rodriguez',
              age: 45,
              gender: 'Male',
              primaryCondition: 'Post-ACL Reconstruction Recovery',
              allergies: ['Latex'],
              medications: ['Xarelto 10mg daily', 'Acetaminophen 500mg'],
            },
            baseline: { sleepHours: 7.6, restingHeartRateBpm: 65, dailySteps: 11000, mealsPerDay: 3 },
            current: { sleepHours: 6.8, restingHeartRateBpm: 74, dailySteps: 3100, mealRegularity: 'Regular', reportedSymptoms: ['Right calf tenderness and tightness'], recordedAt: new Date().toISOString() },
            timeline: [{ id: 'EVT-601', date: '2026-07-31', category: 'symptom_report', title: 'Post-Op Leg Discomfort', description: 'Calf discomfort reported 10 days post-knee surgery.', severity: 'urgent' }],
          },
        ]);
      }

      const obsCount = await obsCol.countDocuments();
      if (obsCount < 10) {
        console.log('🌱 Seeding expanded MongoDB Atlas observations collection...');
        await obsCol.deleteMany({});
        const obsDocs = [
          ...DEMO_PATIENT_LAB_HISTORY.map(entry => ({ patientId: 'PAT-88421', ...entry })),
          { patientId: 'PAT-10042', testName: 'HbA1c', month: 'July', date: '2026-07-15', value: 6.8, unit: '%', referenceRange: '< 5.7 %', flag: 'high' },
          { patientId: 'PAT-10042', testName: 'Fasting Blood Glucose', month: 'July', date: '2026-07-15', value: 128, unit: 'mg/dL', referenceRange: '70 - 99 mg/dL', flag: 'high' },
          { patientId: 'PAT-30114', testName: 'NT-proBNP', month: 'July', date: '2026-07-28', value: 1450, unit: 'pg/mL', referenceRange: '< 300 pg/mL', flag: 'critical' },
          { patientId: 'PAT-30114', testName: 'Serum Creatinine', month: 'July', date: '2026-07-28', value: 1.6, unit: 'mg/dL', referenceRange: '0.7 - 1.3 mg/dL', flag: 'high' },
          { patientId: 'PAT-51209', testName: 'D-Dimer', month: 'July', date: '2026-07-31', value: 0.85, unit: 'mg/L FEU', referenceRange: '< 0.50 mg/L FEU', flag: 'high' },
        ];
        await obsCol.insertMany(obsDocs);
      }

      const guideCount = await guidelinesCol.countDocuments();
      if (guideCount < 10) {
        console.log('🌱 Seeding expanded MongoDB Atlas clinical guidelines VectorDB collection (10 guidelines)...');
        await guidelinesCol.deleteMany({});
        const guidelines: MongoGuidelineDoc[] = [
          {
            id: 'GUIDE-101',
            condition: 'Acute Coronary Syndrome / Chest Pain',
            category: 'Emergency',
            keywords: ['chest pain', 'chest pressure', 'radiating pain', 'crushing chest'],
            protocolSummary: 'Acute onset substernal chest discomfort radiating to jaw, neck, or left arm requires immediate emergency response.',
            recommendedAction: 'Call emergency services (911/112) immediately. Administer aspirin if not contraindicated.',
            embedding: generateClinicalVector('Acute Coronary Syndrome chest pain pressure radiating heart'),
          },
          {
            id: 'GUIDE-102',
            condition: 'Acute Cerebrovascular Event / Stroke',
            category: 'Emergency',
            keywords: ['slurred speech', 'facial drooping', 'arm weakness', 'stroke'],
            protocolSummary: 'Sudden onset facial asymmetry, arm weakness, or speech impairment indicates probable acute stroke.',
            recommendedAction: 'Transport to nearest stroke center via emergency medical services immediately.',
            embedding: generateClinicalVector('Acute Cerebrovascular Event stroke slurred speech facial drooping neuro'),
          },
          {
            id: 'GUIDE-103',
            condition: 'Anemia & Progressive Fatigue',
            category: 'Routine',
            keywords: ['fatigue', 'tiredness', 'low hemoglobin', 'dizziness', 'anemia'],
            protocolSummary: 'Longitudinal drop in Hemoglobin (< 12.0 g/dL in females, < 13.5 g/dL in males) correlates with persistent fatigue and lethargy.',
            recommendedAction: 'Schedule primary care evaluation within 48-72h for CBC, Iron, and Ferritin workup.',
            embedding: generateClinicalVector('Anemia Progressive Fatigue tiredness low hemoglobin dizziness'),
          },
          {
            id: 'GUIDE-104',
            condition: 'Syncope & Orthostatic Hypotension',
            category: 'Urgent',
            keywords: ['fainting', 'syncope', 'lightheadedness', 'pass out'],
            protocolSummary: 'Transient loss of consciousness requires same-day clinical assessment for cardiac vs neurogenic etiologies.',
            recommendedAction: 'Seek urgent care evaluation same-day. Avoid driving or operating machinery.',
            embedding: generateClinicalVector('Syncope Orthostatic Hypotension fainting pass out lightheadedness'),
          },
          {
            id: 'GUIDE-105',
            condition: 'Congestive Heart Failure Exacerbation',
            category: 'Urgent',
            keywords: ['ankle swelling', 'weight gain', 'shortness of breath lying flat', 'bnp', 'heart failure'],
            protocolSummary: 'Rapid weight gain (>3 lbs in 2 days) with bilateral lower extremity edema and orthopnea suggests acute CHF fluid overload.',
            recommendedAction: 'Contact cardiology provider same-day for diuretic dosage adjustment or urgent clinical evaluation.',
            embedding: generateClinicalVector('Congestive Heart Failure exacerbation ankle swelling weight gain breath lying flat bnp'),
          },
          {
            id: 'GUIDE-106',
            condition: 'Diabetic Ketoacidosis & Severe Hyperglycemia',
            category: 'Emergency',
            keywords: ['high blood sugar', 'glucose', 'hba1c', 'excessive thirst', 'fruity breath'],
            protocolSummary: 'Marked elevation in blood glucose accompanied by ketonuria, fruity breath, or confusion indicates diabetic emergency.',
            recommendedAction: 'Seek immediate emergency medical evaluation for IV hydration and insulin protocol.',
            embedding: generateClinicalVector('Diabetic Ketoacidosis severe hyperglycemia glucose hba1c thirst fruity breath'),
          },
          {
            id: 'GUIDE-107',
            condition: 'Acute Asthma Exacerbation & Hypoxia',
            category: 'Emergency',
            keywords: ['wheezing', 'asthma attack', 'gasping', 'spo2 low', 'unable to complete sentences'],
            protocolSummary: 'Severe bronchospasm unresponsive to rescue inhaler with oxygen saturation < 92% requires emergency intervention.',
            recommendedAction: 'Use albuterol rescue inhaler immediately and call emergency services (911/112).',
            embedding: generateClinicalVector('Acute Asthma Exacerbation hypoxia wheezing gasping low spo2 breath'),
          },
          {
            id: 'GUIDE-108',
            condition: 'Deep Vein Thrombosis (DVT) & Pulmonary Embolism Risk',
            category: 'Urgent',
            keywords: ['calf pain', 'leg tenderness', 'unilateral leg swelling', 'd-dimer', 'post-op leg pain'],
            protocolSummary: 'Unilateral calf swelling and focal pain following surgery or prolonged immobility raises clinical suspicion for deep vein thrombosis.',
            recommendedAction: 'Seek urgent medical evaluation same-day for venous duplex ultrasound and D-Dimer screening.',
            embedding: generateClinicalVector('Deep Vein Thrombosis DVT pulmonary embolism calf pain leg swelling d-dimer post-op'),
          },
          {
            id: 'GUIDE-109',
            condition: 'Acute Migraine with Neurological Features',
            category: 'Routine',
            keywords: ['migraine', 'throbbing headache', 'aura', 'photophobia', 'headache'],
            protocolSummary: 'Unilateral throbbing headache preceded by visual aura in known migraineur without focal neurological deficits.',
            recommendedAction: 'Take prescribed abortive therapy (triptan) in dark, quiet environment. Hydrate adequately.',
            embedding: generateClinicalVector('Acute Migraine aura photophobia throbbing headache migraine'),
          },
          {
            id: 'GUIDE-110',
            condition: 'Hypertensive Emergency',
            category: 'Emergency',
            keywords: ['high blood pressure', 'hypertension', 'systolic > 180', 'headache with high bp'],
            protocolSummary: 'Systolic BP > 180 mmHg or Diastolic BP > 120 mmHg associated with target organ damage symptoms (headache, chest discomfort).',
            recommendedAction: 'Seek immediate emergency clinical evaluation to safely reduce blood pressure.',
            embedding: generateClinicalVector('Hypertensive Emergency high blood pressure hypertension systolic chest headache'),
          },
        ];
        await guidelinesCol.insertMany(guidelines);
      }

      return true;
    } catch (err: any) {
      console.warn('⚠️ Seeding MongoDB Atlas failed:', err.message);
      return false;
    }
  }

  async searchClinicalKnowledge(queryText: string): Promise<MongoGuidelineDoc[]> {
    if (!await this.initConnection() || !this.db) {
      return [
        {
          id: 'FALLBACK-101',
          condition: 'Clinical Care Navigation Protocol',
          category: 'Routine',
          keywords: ['fatigue', 'triage'],
          protocolSummary: 'CareBridge standard clinical guidance protocol.',
          recommendedAction: 'Consult a primary care physician for routine evaluation.',
        },
      ];
    }

    const queryVector = generateClinicalVector(queryText);

    try {
      const guidelinesCol = this.db.collection<MongoGuidelineDoc>('clinical_guidelines');

      try {
        const vectorPipeline = [
          {
            $vectorSearch: {
              index: 'vector_index',
              path: 'embedding',
              queryVector: queryVector,
              numCandidates: 20,
              limit: 5,
            },
          },
          {
            $project: {
              id: 1,
              condition: 1,
              category: 1,
              keywords: 1,
              protocolSummary: 1,
              recommendedAction: 1,
              score: { $meta: 'vectorSearchScore' },
            },
          },
        ];

        const vectorResults = await guidelinesCol.aggregate<MongoGuidelineDoc>(vectorPipeline).toArray();
        if (vectorResults && vectorResults.length > 0) {
          return vectorResults;
        }
      } catch (vectorErr: any) {
        // Fallback to vector cosine similarity calculation
      }

      const allGuidelines = await guidelinesCol.find({}).toArray();
      const queryLower = queryText.toLowerCase();

      const scoredResults = allGuidelines.map(g => {
        let score = 0;
        if (g.embedding && Array.isArray(g.embedding)) {
          score = calculateCosineSimilarity(queryVector, g.embedding);
        }
        if (g.keywords.some(kw => queryLower.includes(kw.toLowerCase()))) {
          score += 0.3;
        }
        return { ...g, score: Number(score.toFixed(4)) };
      });

      scoredResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      return scoredResults;
    } catch (err: any) {
      console.warn('⚠️ MongoDB Vector Search error:', err.message);
      return [];
    }
  }
}
