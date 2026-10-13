import { Injectable } from '@nitrostack/core';
import { PatientService } from '../../services/patient.service.js';
import { PatientRepository } from '../../db/repositories/patient.repository.js';
import { VisitRepository } from '../../db/repositories/visit.repository.js';
import { ClinicalRecordsRepository } from '../../db/repositories/clinical-records.repository.js';

export interface PatientDocument {
  id: string;
  name: string;
  category: 'Photograph' | 'Govt ID' | 'Insurance Card' | 'Prescription' | 'History PDF' | 'MRI' | 'CT' | 'X-ray' | 'ECG' | 'Ultrasound' | 'Blood Report' | 'Lab Report' | 'Other';
  uploadDate: string;
  fileSize: string;
  url?: string;
  summary?: string;
}

export interface VisitRecord {
  id: string;
  visitDate: string;
  chiefComplaint: string;
  doctor: string;
  symptoms: string[];
  diagnosis: string;
  medications: string[];
  testsRecommended: string[];
  researchCitations: string[];
  aiNotes: string;
  generatedReport: string;
  followUpPlan: string;
  status: 'COMPLETED' | 'ACTIVE' | 'SCHEDULED';
}

export interface PatientProfile {
  patientId: string;
  name: string;
  age: number;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
  };
  lifestyle: {
    smoking: 'Never' | 'Former' | 'Current' | 'Chain Smoker';
    alcohol: 'None' | 'Occasional' | 'Moderate' | 'Heavy';
    exercise: string;
    diet: string;
  };
  familyHistory: string[];
  pastSurgeries: string[];
  conditions: string[];
  allergies: string[];
  medications: string[];
  recentLabs: string[];
  documents: PatientDocument[];
  visitHistory: VisitRecord[];
  riskCategory: 'CRITICAL RISK' | 'HIGH RISK' | 'MODERATE RISK' | 'LOW RISK';
}

@Injectable({ deps: [] })
export class HistoryService {

  getAllPatients(): PatientProfile[] {
    const patients = PatientRepository.getAll();
    return patients.map((p) => this.getPatientProfile(p.id)!);
  }

  getPatientProfile(patientId: string): PatientProfile | null {
    const profile = PatientService.getPatientProfile(patientId);
    if (!profile) return null;

    const birthYear = new Date(profile.dob).getFullYear() || 1980;
    const age = new Date().getFullYear() - birthYear;

    return {
      patientId: profile.id,
      name: `${profile.firstName} ${profile.lastName}`,
      age: age || 40,
      gender: profile.gender || 'Unknown',
      dateOfBirth: profile.dob || '',
      phone: profile.phone || '',
      email: profile.email || '',
      address: profile.address || '',
      emergencyContact: {
        name: profile.emergencyContact || 'N/A',
        relationship: 'Contact',
        phone: profile.emergencyContact || ''
      },
      insurance: {
        provider: profile.insurance || 'Unspecified',
        policyNumber: 'N/A',
        groupNumber: 'N/A'
      },
      lifestyle: {
        smoking: 'Never',
        alcohol: 'None',
        exercise: 'Moderate',
        diet: 'Balanced'
      },
      familyHistory: [],
      pastSurgeries: [],
      conditions: profile.medicalHistory.map((m) => m.condition),
      allergies: profile.allergies.map((a) => a.allergen),
      medications: profile.medications.map((m) => `${m.medicationName} ${m.dosage}`),
      recentLabs: profile.labReports.map((l) => `${l.testName}: ${l.resultValue}`),
      documents: profile.documents.map((d) => ({
        id: d.id,
        name: d.title,
        category: d.documentType as any,
        uploadDate: d.uploadedAt ? d.uploadedAt.split('T')[0] : '',
        fileSize: d.fileSize ? `${(d.fileSize / 1024).toFixed(0)} KB` : '1 MB'
      })),
      visitHistory: profile.visits.map((v) => ({
        id: v.id,
        visitDate: v.startedAt ? v.startedAt.split('T')[0] : '',
        chiefComplaint: v.chiefComplaint || '',
        doctor: v.doctorId || 'Dr. Marcus Vance',
        symptoms: v.symptoms ? JSON.parse(v.symptoms) : [],
        diagnosis: v.diagnosis ? JSON.parse(v.diagnosis).join(', ') : '',
        medications: v.medicationsOrdered ? JSON.parse(v.medicationsOrdered) : [],
        testsRecommended: v.testsOrdered ? JSON.parse(v.testsOrdered) : [],
        researchCitations: v.researchFindings ? JSON.parse(v.researchFindings) : [],
        aiNotes: v.aiSummary || '',
        generatedReport: v.clinicalNotes || '',
        followUpPlan: v.followUpPlan || '',
        status: v.visitStatus as any
      })),
      riskCategory: 'MODERATE RISK'
    };
  }

  getPatientHistory(patientId: string) {
    const profile = this.getPatientProfile(patientId);
    if (!profile) {
      return {
        patientId,
        name: 'Unknown Patient',
        age: 0,
        gender: 'N/A',
        conditions: [],
        allergies: [],
        medications: [],
        recentLabs: []
      };
    }
    return {
      patientId: profile.patientId,
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      conditions: profile.conditions,
      allergies: profile.allergies,
      medications: profile.medications,
      recentLabs: profile.recentLabs
    };
  }

  addVisitRecord(patientId: string, visit: Omit<VisitRecord, 'id'>): VisitRecord {
    const id = `v-${Date.now()}`;
    VisitRepository.create({
      id,
      patientId,
      chiefComplaint: visit.chiefComplaint,
      visitStatus: 'COMPLETED',
      startedAt: new Date().toISOString(),
      symptoms: JSON.stringify(visit.symptoms),
      diagnosis: JSON.stringify([visit.diagnosis]),
      medicationsOrdered: JSON.stringify(visit.medications),
      testsOrdered: JSON.stringify(visit.testsRecommended),
      researchFindings: JSON.stringify(visit.researchCitations),
      aiSummary: visit.aiNotes,
      clinicalNotes: visit.generatedReport,
      followUpPlan: visit.followUpPlan
    });

    return {
      ...visit,
      id
    };
  }

  createPatient(newProfile: Omit<PatientProfile, 'patientId' | 'documents' | 'visitHistory'>): PatientProfile {
    const id = (Math.floor(1000 + Math.random() * 9000)).toString();
    const nameParts = newProfile.name.split(' ');
    const firstName = nameParts[0] || newProfile.name;
    const lastName = nameParts.slice(1).join(' ') || 'Patient';

    PatientRepository.create({
      id,
      mrn: `MRN-${id}`,
      firstName,
      lastName,
      dob: newProfile.dateOfBirth || '1980-01-01',
      gender: newProfile.gender || 'Unknown',
      phone: newProfile.phone || '',
      email: newProfile.email || '',
      address: newProfile.address || ''
    });

    return this.getPatientProfile(id)!;
  }

  addDocumentToPatient(patientId: string, doc: Omit<PatientDocument, 'id'>): PatientDocument {
    const id = `doc-${Date.now()}`;
    ClinicalRecordsRepository.addDocument({
      id,
      patientId,
      documentType: doc.category,
      title: doc.name,
      filePath: doc.url || `/uploads/${doc.name}`
    });

    return {
      ...doc,
      id
    };
  }
}
