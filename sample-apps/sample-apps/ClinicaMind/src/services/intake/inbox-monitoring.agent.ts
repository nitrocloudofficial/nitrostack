import { IntakeRepository, IntakePackageEntity } from '../../db/repositories/intake.repository.js';

export interface IngestPackageInput {
  senderEmail: string;
  subject: string;
  attachments: Array<{
    fileName: string;
    documentType: string;
    contentBase64?: string;
    fileBuffer?: Buffer;
    mimeType?: string;
  }>;
}

export class InboxMonitoringAgent {
  static async detectAndCreatePackage(input: IngestPackageInput): Promise<IntakePackageEntity> {
    const pkgId = `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const pkgNumber = `PKG-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

    console.log(`[InboxMonitoringAgent] 📬 New Patient Package email detected from ${input.senderEmail} with subject: "${input.subject}"`);

    const newPackage = IntakeRepository.createPackage({
      id: pkgId,
      packageNumber: pkgNumber,
      senderEmail: input.senderEmail,
      subject: input.subject,
      status: 'PROCESSING',
      receivedAt: new Date().toISOString()
    });

    return newPackage;
  }
}
