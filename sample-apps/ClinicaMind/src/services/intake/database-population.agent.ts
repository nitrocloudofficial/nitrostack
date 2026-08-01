import { PatientRepository } from '../../db/repositories/patient.repository.js';
import { ClinicalRecordsRepository } from '../../db/repositories/clinical-records.repository.js';
import { AuditRepository } from '../../db/repositories/audit.repository.js';
import { IntakeRepository } from '../../db/repositories/intake.repository.js';
import { ExtractedPatientProfile } from './medical-extraction.agent.js';
import getDb from '../../db/database.js';

export interface DoctorVerificationPayload {
  packageId: string;
  action: 'APPROVE' | 'REJECT' | 'MERGE';
  doctorNotes?: string;
  rejectionReason?: string;
  targetPatientId?: string; // For MERGE action
  editedProfile?: Partial<ExtractedPatientProfile>;
}

export class DatabasePopulationAgent {
  static async populateDatabaseOnApproval(
    payload: DoctorVerificationPayload
  ): Promise<{ success: boolean; patientId?: string; message: string }> {
    const pkg = IntakeRepository.getPackageById(payload.packageId);
    if (!pkg) {
      return { success: false, message: 'Intake package not found.' };
    }

    if (payload.action === 'REJECT') {
      IntakeRepository.updatePackageStatus(payload.packageId, 'REJECTED', {
        rejectionReason: payload.rejectionReason || 'Rejected by Doctor'
      });
      AuditRepository.log('INTAKE_PACKAGE_REJECTED', 'IntakePackage', payload.packageId, {
        reason: payload.rejectionReason
      });
      return { success: true, message: 'Intake package rejected.' };
    }

    // Merge or parse extracted profile
    let profile: ExtractedPatientProfile;
    try {
      const rawExtracted = pkg.extractedPatient ? JSON.parse(pkg.extractedPatient) : {};
      profile = { ...rawExtracted, ...(payload.editedProfile || {}) };
    } catch (e) {
      return { success: false, message: 'Invalid extracted patient profile.' };
    }

    const attachments = IntakeRepository.getAttachmentsByPackageId(payload.packageId);
    let patientId: string;
    let mrn: string;

    if (payload.action === 'MERGE' && payload.targetPatientId) {
      // MERGE with existing patient
      patientId = payload.targetPatientId;
      const existingPatient = PatientRepository.getById(patientId);
      if (!existingPatient) {
        return { success: false, message: 'Target patient for merge not found.' };
      }
      mrn = existingPatient.mrn;
      console.log(`[DatabasePopulationAgent] 🔀 Merging intake package ${pkg.packageNumber} into existing patient: ${patientId} (${mrn})`);
    } else {
      // CREATE NEW PATIENT
      patientId = `pat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      mrn = `MRN-${Math.floor(100000 + Math.random() * 900000)}`;

      PatientRepository.create({
        id: patientId,
        mrn,
        firstName: profile.firstName || profile.name.split(' ')[0] || 'Unknown',
        lastName: profile.lastName || profile.name.split(' ').slice(1).join(' ') || 'Patient',
        dob: profile.dob || '1990-01-01',
        gender: profile.gender || 'Other',
        bloodGroup: profile.bloodGroup || 'Unknown',
        phone: profile.phone || 'N/A',
        email: profile.email || '',
        address: profile.address || '',
        emergencyContact: `${profile.emergencyContact?.name || ''} (${profile.emergencyContact?.relationship || ''}): ${profile.emergencyContact?.phone || ''}`,
        insurance: `${profile.insurance?.provider || 'Default'} (Policy: ${profile.insurance?.policyNumber || 'N/A'})`,
        primaryDoctor: 'Dr. Marcus Vance, MD'
      });

      console.log(`[DatabasePopulationAgent] 👤 Created new Patient record: ${patientId} (${profile.name}, MRN: ${mrn})`);
    }

    // 1. Populate Digital Folder Documents
    for (const att of attachments) {
      ClinicalRecordsRepository.addDocument({
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        patientId,
        documentType: att.documentType,
        title: att.fileName,
        filePath: att.filePath,
        fileSize: att.fileSize,
        mimeType: att.mimeType
      });
    }

    // 2. Populate Allergies
    if (profile.knownAllergies && Array.isArray(profile.knownAllergies)) {
      for (const alg of profile.knownAllergies) {
        if (alg && alg !== 'None' && alg !== 'None known') {
          const isSeveritySevere = alg.toLowerCase().includes('anaphylaxis') ? 'ANAPHYLAXIS' : 'MODERATE';
          ClinicalRecordsRepository.addAllergy({
            id: `alg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            patientId,
            allergen: alg.split('(')[0].trim(),
            reaction: alg,
            severity: isSeveritySevere
          });
        }
      }
    }

    // 3. Populate Medical History
    if (profile.medicalHistory && Array.isArray(profile.medicalHistory)) {
      for (const cond of profile.medicalHistory) {
        if (cond && cond !== 'None') {
          ClinicalRecordsRepository.addMedicalHistory({
            id: `medh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            patientId,
            condition: cond,
            resolved: 0
          });
        }
      }
    }

    // 4. Populate Current Medications
    if (profile.currentMedications && Array.isArray(profile.currentMedications)) {
      for (const med of profile.currentMedications) {
        if (med && med !== 'None') {
          const medParts = med.split(' ');
          ClinicalRecordsRepository.addCurrentMedication({
            id: `currm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            patientId,
            medicationName: medParts[0] || med,
            dosage: medParts[1] || 'Standard',
            frequency: medParts.slice(2).join(' ') || 'Daily',
            prescribedBy: 'Extracted EHR'
          });
        }
      }
    }

    // 5. Populate Family History
    if (profile.familyHistory && Array.isArray(profile.familyHistory)) {
      for (const fam of profile.familyHistory) {
        if (fam && fam !== 'None') {
          const parts = fam.split(':');
          ClinicalRecordsRepository.addFamilyHistory({
            id: `famh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            patientId,
            relation: parts[0] ? parts[0].trim() : 'Family',
            condition: parts[1] ? parts[1].trim() : fam
          });
        }
      }
    }

    // 6. Populate Vitals
    if (profile.vitals) {
      ClinicalRecordsRepository.addVitals({
        id: `vit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        patientId,
        bpSystolic: profile.vitals.bpSystolic || 120,
        bpDiastolic: profile.vitals.bpDiastolic || 80,
        heartRate: profile.vitals.heartRate || 72,
        respRate: profile.vitals.respRate || 16,
        temperature: profile.vitals.temperature || 98.6,
        spO2: profile.vitals.spO2 || 98
      });
    }

    // 7. Update Intake Package Status
    const finalStatus = payload.action === 'MERGE' ? 'MERGED' : 'APPROVED';
    IntakeRepository.updatePackageStatus(payload.packageId, finalStatus, {
      mergedPatientId: patientId,
      reviewedBy: 'Dr. Marcus Vance, MD',
      extractedPatient: JSON.stringify(profile)
    });

    // 8. Create Audit Log Entry
    AuditRepository.log(
      payload.action === 'MERGE' ? 'INTAKE_PATIENT_MERGED' : 'INTAKE_PATIENT_APPROVED',
      'Patient',
      patientId,
      {
        packageNumber: pkg.packageNumber,
        senderEmail: pkg.senderEmail,
        patientName: profile.name,
        mrn,
        action: payload.action
      }
    );

    console.log(`[DatabasePopulationAgent] ✅ Successfully populated database tables for patient: ${patientId} (Status: ${finalStatus})`);

    return {
      success: true,
      patientId,
      message: `Patient ${profile.name} (MRN: ${mrn}) successfully ${finalStatus === 'MERGED' ? 'merged' : 'registered'} in database!`
    };
  }
}
