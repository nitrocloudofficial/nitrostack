import getDb from '../database.js';

export interface IntakePackageEntity {
  id: string;
  packageNumber: string;
  senderEmail: string;
  subject: string;
  status: 'RECEIVED' | 'PROCESSING' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'MERGED';
  receivedAt: string;
  extractedPatient?: string; // JSON string of 17 extracted fields
  mergedPatientId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntakeAttachmentEntity {
  id: string;
  packageId: string;
  fileName: string;
  documentType: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  ocrText?: string;
  extractedMetadata?: string;
  uploadedAt: string;
}

export class IntakeRepository {
  static createPackage(pkg: Omit<IntakePackageEntity, 'createdAt' | 'updatedAt'>): IntakePackageEntity {
    const db = getDb();
    const now = new Date().toISOString();
    const entity: IntakePackageEntity = {
      ...pkg,
      createdAt: now,
      updatedAt: now
    };
    db.insert('intake_packages', entity);
    return entity;
  }

  static getPackageById(id: string): IntakePackageEntity | undefined {
    const db = getDb();
    const pkgs = db.getTable('intake_packages');
    return pkgs.find(p => p.id === id);
  }

  static getPackages(statusFilter?: string): IntakePackageEntity[] {
    const db = getDb();
    const pkgs = db.getTable('intake_packages');
    if (statusFilter) {
      return pkgs.filter(p => p.status === statusFilter);
    }
    return pkgs.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }

  static updatePackageStatus(
    id: string,
    status: IntakePackageEntity['status'],
    extraData?: { mergedPatientId?: string; reviewedBy?: string; rejectionReason?: string; extractedPatient?: string }
  ): IntakePackageEntity | null {
    const db = getDb();
    const now = new Date().toISOString();
    const updatePayload: any = {
      status,
      updatedAt: now,
      ...(extraData?.reviewedBy ? { reviewedBy: extraData.reviewedBy, reviewedAt: now } : {}),
      ...(extraData?.mergedPatientId ? { mergedPatientId: extraData.mergedPatientId } : {}),
      ...(extraData?.rejectionReason ? { rejectionReason: extraData.rejectionReason } : {}),
      ...(extraData?.extractedPatient ? { extractedPatient: extraData.extractedPatient } : {})
    };

    return db.update('intake_packages', id, updatePayload);
  }

  static addAttachment(attachment: IntakeAttachmentEntity): IntakeAttachmentEntity {
    const db = getDb();
    db.insert('intake_attachments', attachment);
    return attachment;
  }

  static getAttachmentsByPackageId(packageId: string): IntakeAttachmentEntity[] {
    const db = getDb();
    const attachments = db.getTable('intake_attachments');
    return attachments.filter(a => a.packageId === packageId);
  }

  static updateAttachmentOcr(attachmentId: string, ocrText: string, extractedMetadata?: string) {
    const db = getDb();
    return db.update('intake_attachments', attachmentId, { ocrText, extractedMetadata });
  }
}
