import getDb from '../database.js';

export interface AllergyEntity {
  id: string;
  patientId: string;
  allergen: string;
  reaction?: string;
  severity?: 'MILD' | 'MODERATE' | 'SEVERE' | 'ANAPHYLAXIS';
  diagnosedDate?: string;
}

export interface MedicalHistoryEntity {
  id: string;
  patientId: string;
  condition: string;
  diagnosedDate?: string;
  resolved: number;
  notes?: string;
}

export interface MedicationEntity {
  id: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate?: string;
  endDate?: string;
  prescribedBy?: string;
  reasonForDiscontinuation?: string;
}

export interface VitalEntity {
  id: string;
  patientId: string;
  visitId?: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  respRate?: number;
  temperature?: number;
  spO2?: number;
  recordedAt?: string;
}

export interface LabReportEntity {
  id: string;
  patientId: string;
  visitId?: string;
  testName: string;
  category?: string;
  resultValue: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal: number;
  reportDate?: string;
}

export interface PatientDocumentEntity {
  id: string;
  patientId: string;
  documentType: string;
  title: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt?: string;
}

export interface FamilyHistoryEntity {
  id: string;
  patientId: string;
  relation: string;
  condition: string;
  notes?: string;
}

export class ClinicalRecordsRepository {
  // Family History
  static addFamilyHistory(family: FamilyHistoryEntity): FamilyHistoryEntity {
    const db = getDb();
    return db.insert('family_history', family);
  }

  // Allergies
  static getAllergies(patientId: string): AllergyEntity[] {
    const db = getDb();
    return db.getTable<AllergyEntity>('allergies').filter((a) => a.patientId === patientId);
  }

  static addAllergy(allergy: AllergyEntity): AllergyEntity {
    const db = getDb();
    return db.insert('allergies', allergy);
  }

  // Medical History
  static getMedicalHistory(patientId: string): MedicalHistoryEntity[] {
    const db = getDb();
    return db.getTable<MedicalHistoryEntity>('medical_history').filter((m) => m.patientId === patientId);
  }

  static addMedicalHistory(history: MedicalHistoryEntity): MedicalHistoryEntity {
    const db = getDb();
    return db.insert('medical_history', history);
  }

  // Current Medications
  static getCurrentMedications(patientId: string): MedicationEntity[] {
    const db = getDb();
    return db.getTable<MedicationEntity>('current_medications').filter((m) => m.patientId === patientId);
  }

  static addCurrentMedication(med: MedicationEntity): MedicationEntity {
    const db = getDb();
    return db.insert('current_medications', med);
  }

  // Vitals
  static getVitals(patientId: string): VitalEntity[] {
    const db = getDb();
    return db.getTable<VitalEntity>('vitals').filter((v) => v.patientId === patientId).sort((a, b) => (b.recordedAt || '').localeCompare(a.recordedAt || ''));
  }

  static addVitals(vital: VitalEntity): VitalEntity {
    const db = getDb();
    const now = vital.recordedAt || new Date().toISOString();
    return db.insert('vitals', { ...vital, recordedAt: now });
  }

  // Lab Reports
  static getLabReports(patientId: string): LabReportEntity[] {
    const db = getDb();
    return db.getTable<LabReportEntity>('lab_reports').filter((l) => l.patientId === patientId).sort((a, b) => (b.reportDate || '').localeCompare(a.reportDate || ''));
  }

  static addLabReport(report: LabReportEntity): LabReportEntity {
    const db = getDb();
    const now = report.reportDate || new Date().toISOString();
    return db.insert('lab_reports', { ...report, reportDate: now });
  }

  // Patient Documents
  static getDocuments(patientId: string): PatientDocumentEntity[] {
    const db = getDb();
    return db.getTable<PatientDocumentEntity>('patient_documents').filter((d) => d.patientId === patientId).sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
  }

  static addDocument(doc: PatientDocumentEntity): PatientDocumentEntity {
    const db = getDb();
    const now = doc.uploadedAt || new Date().toISOString();
    return db.insert('patient_documents', { ...doc, uploadedAt: now });
  }
}
