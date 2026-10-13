import { PatientRepository, PatientEntity } from '../db/repositories/patient.repository.js';
import { ClinicalRecordsRepository } from '../db/repositories/clinical-records.repository.js';
import { VisitRepository } from '../db/repositories/visit.repository.js';
import { AuditRepository } from '../db/repositories/audit.repository.js';

export class PatientService {
  static getPatients(searchQuery?: string) {
    if (searchQuery && searchQuery.trim().length > 0) {
      return PatientRepository.search(searchQuery.trim());
    }
    return PatientRepository.getAll();
  }

  static getPatientProfile(id: string) {
    const patient = PatientRepository.getById(id);
    if (!patient) return null;

    const allergies = ClinicalRecordsRepository.getAllergies(id);
    const medicalHistory = ClinicalRecordsRepository.getMedicalHistory(id);
    const medications = ClinicalRecordsRepository.getCurrentMedications(id);
    const vitals = ClinicalRecordsRepository.getVitals(id);
    const labReports = ClinicalRecordsRepository.getLabReports(id);
    const documents = ClinicalRecordsRepository.getDocuments(id);
    const visits = VisitRepository.getAll(id);

    return {
      ...patient,
      allergies,
      medicalHistory,
      medications,
      vitals,
      labReports,
      documents,
      visits
    };
  }

  static createPatient(data: Omit<PatientEntity, 'id'> & { id?: string }) {
    const id = data.id || 'p-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const mrn = data.mrn || 'MRN-' + Math.floor(100000 + Math.random() * 900000);

    const created = PatientRepository.create({
      ...data,
      id,
      mrn
    });

    AuditRepository.log('PATIENT_CREATED', 'Patient', id, { mrn, name: `${data.firstName} ${data.lastName}` });
    return created;
  }

  static updatePatient(id: string, updates: Partial<PatientEntity>) {
    const updated = PatientRepository.update(id, updates);
    if (updated) {
      AuditRepository.log('PATIENT_UPDATED', 'Patient', id, updates);
    }
    return updated;
  }

  static deletePatient(id: string) {
    const deleted = PatientRepository.delete(id);
    if (deleted) {
      AuditRepository.log('PATIENT_DELETED', 'Patient', id);
    }
    return deleted;
  }
}
