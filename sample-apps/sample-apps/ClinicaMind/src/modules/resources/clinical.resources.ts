import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';
import { PatientRepository } from '../../db/repositories/patient.repository.js';
import { VisitRepository } from '../../db/repositories/visit.repository.js';
import { ClinicalRecordsRepository } from '../../db/repositories/clinical-records.repository.js';

@Injectable()
export class ClinicalResourcesService {

  @Resource({
    uri: 'patient://active',
    name: 'Patient Record',
    description: 'Target patient EHR demographic, baseline health status, and vital signs.',
    mimeType: 'application/json'
  })
  async getPatientRecord(ctx: ExecutionContext) {
    const patients = PatientRepository.getAll();
    const patient = patients[0] || null;
    if (!patient) {
      return { status: 'empty', message: 'No patient recorded in database' };
    }
    const vitals = ClinicalRecordsRepository.getVitals(patient.id);
    return {
      patientId: patient.id,
      mrn: patient.mrn,
      name: `${patient.firstName} ${patient.lastName}`,
      dob: patient.dob,
      gender: patient.gender,
      primaryPhysician: patient.primaryDoctor || 'Unassigned',
      vitals: vitals[0] || {}
    };
  }

  @Resource({
    uri: 'consultation://current',
    name: 'Current Consultation Data',
    description: 'Live active clinical consultation audio transcript, status, and metadata.',
    mimeType: 'application/json'
  })
  async getCurrentConsultation(ctx: ExecutionContext) {
    const visits = VisitRepository.getAll();
    const activeVisit = visits.find((v) => v.visitStatus === 'IN_PROGRESS') || visits[0] || null;
    if (!activeVisit) {
      return { status: 'empty', message: 'No active consultation visit recorded' };
    }
    return {
      consultationId: activeVisit.id,
      patientId: activeVisit.patientId,
      startedAt: activeVisit.startedAt,
      status: activeVisit.visitStatus,
      chiefComplaint: activeVisit.chiefComplaint
    };
  }

  @Resource({
    uri: 'visits://active',
    name: 'Previous Visits',
    description: 'Chronological summary of past hospital encounters and outpatient visits.',
    mimeType: 'application/json'
  })
  async getPreviousVisits(ctx: ExecutionContext) {
    const visits = VisitRepository.getAll();
    return {
      count: visits.length,
      visits: visits.map((v) => ({ id: v.id, patientId: v.patientId, startedAt: v.startedAt, status: v.visitStatus }))
    };
  }

  @Resource({
    uri: 'medications://active',
    name: 'Medication List',
    description: 'Current active prescription and over-the-counter medications list.',
    mimeType: 'application/json'
  })
  async getMedicationList(ctx: ExecutionContext) {
    const patients = PatientRepository.getAll();
    const patient = patients[0];
    if (!patient) return { count: 0, medications: [] };
    const meds = ClinicalRecordsRepository.getCurrentMedications(patient.id);
    return {
      patientId: patient.id,
      medications: meds
    };
  }

  @Resource({
    uri: 'guidelines://cap',
    name: 'CAP Guidelines',
    description: 'Evidence-based Infectious Disease Society & JAMA Community-Acquired Pneumonia (CAP) treatment protocols.',
    mimeType: 'application/json'
  })
  async getCapGuidelines(ctx: ExecutionContext) {
    return {
      topic: 'Community-Acquired Pneumonia (CAP)',
      standardFirstLine: 'Amoxicillin 1g TID OR Azithromycin 500mg Day 1 then 250mg QD',
      penicillinAllergyProtocol: 'Respiratory Fluoroquinolone (Levofloxacin 750mg QD x5-7 days OR Moxifloxacin 400mg QD)',
      citations: ['JAMA 2026 CAP Antibiotic Selection Guidelines', 'IDSA 2025 Clinical Practice Guideline']
    };
  }
}
