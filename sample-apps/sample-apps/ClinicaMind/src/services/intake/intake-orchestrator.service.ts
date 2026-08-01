import { InboxMonitoringAgent, IngestPackageInput } from './inbox-monitoring.agent.js';
import { DocumentDownloadAgent } from './document-download.agent.js';
import { OcrAgent } from './ocr.agent.js';
import { MedicalExtractionAgent } from './medical-extraction.agent.js';
import { DatabasePopulationAgent, DoctorVerificationPayload } from './database-population.agent.js';
import { NotificationAgent } from './notification.agent.js';
import { IntakeRepository, IntakePackageEntity } from '../../db/repositories/intake.repository.js';

export class IntakeOrchestratorService {
  /**
   * Complete Autonomous Ingestion Flow (Steps 1-12):
   * Detect Email -> Download Attachments -> OCR -> AI Extraction -> Save Draft -> Notify Doctor
   */
  static async processAutonomousIntake(input: IngestPackageInput): Promise<{
    packageEntity: IntakePackageEntity;
    extractedProfile: any;
  }> {
    console.log(`[IntakeOrchestrator] 🚀 Launching Autonomous Patient Intake Workflow for "${input.subject}"...`);

    // 1. Detect Email Package
    const pkg = await InboxMonitoringAgent.detectAndCreatePackage(input);

    // 2 & 3. Download & Store Attachments
    const attachments = await DocumentDownloadAgent.downloadAndStoreAttachments(pkg.id, input.attachments);

    // 4. Run OCR on every PDF, PNG, JPEG, Scanned image, etc.
    const ocrMap = await OcrAgent.processPackageOcr(attachments);

    // 5 & 6. AI Extraction & Multi-document Merge across 17 clinical fields
    const extractedProfile = await MedicalExtractionAgent.extractAndMergeClinicalData(
      attachments,
      ocrMap,
      input.subject
    );

    // 7, 8, 9, 10. Store extracted JSON profile & update package status to PENDING_VERIFICATION
    const updatedPkg = IntakeRepository.updatePackageStatus(pkg.id, 'PENDING_VERIFICATION', {
      extractedPatient: JSON.stringify(extractedProfile)
    }) || pkg;

    // 12. Notify Doctor
    NotificationAgent.notifyDoctorNewPackage(pkg.packageNumber, input.senderEmail, extractedProfile.name);

    console.log(`[IntakeOrchestrator] 🎉 Autonomous Intake Complete for Package ${pkg.packageNumber}. Patient "${extractedProfile.name}" is now AWAITING VERIFICATION!`);

    return {
      packageEntity: updatedPkg,
      extractedProfile
    };
  }

  /**
   * Doctor Review & Verification (Approve, Reject, Edit, Merge)
   */
  static async verifyIntakePackage(payload: DoctorVerificationPayload) {
    return DatabasePopulationAgent.populateDatabaseOnApproval(payload);
  }
}
