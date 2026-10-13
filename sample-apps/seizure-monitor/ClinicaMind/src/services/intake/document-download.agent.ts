import fs from 'fs';
import path from 'path';
import { IntakeRepository, IntakeAttachmentEntity } from '../../db/repositories/intake.repository.js';

export interface AttachmentInput {
  fileName: string;
  documentType: string;
  contentBase64?: string;
  fileBuffer?: Buffer;
  textContent?: string;
  mimeType?: string;
}

export class DocumentDownloadAgent {
  private static INTAKE_DIR = path.resolve(process.cwd(), 'data', 'intake');

  private static ensureStorageDir() {
    if (!fs.existsSync(this.INTAKE_DIR)) {
      fs.mkdirSync(this.INTAKE_DIR, { recursive: true });
    }
  }

  static async downloadAndStoreAttachments(
    packageId: string,
    attachments: AttachmentInput[]
  ): Promise<IntakeAttachmentEntity[]> {
    this.ensureStorageDir();
    const storedAttachments: IntakeAttachmentEntity[] = [];

    for (const att of attachments) {
      const attId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const safeName = att.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const targetPath = path.join(this.INTAKE_DIR, `${attId}_${safeName}`);

      let fileSize = 0;
      let mimeType = att.mimeType || 'application/octet-stream';

      if (att.contentBase64) {
        const buffer = Buffer.from(att.contentBase64, 'base64');
        fs.writeFileSync(targetPath, buffer);
        fileSize = buffer.length;
      } else if (att.fileBuffer) {
        fs.writeFileSync(targetPath, att.fileBuffer);
        fileSize = att.fileBuffer.length;
      } else {
        // Text/Mock content fallback
        const textData = att.textContent || `[Simulated attachment content for ${att.fileName}]`;
        fs.writeFileSync(targetPath, textData, 'utf-8');
        fileSize = Buffer.byteLength(textData);
        mimeType = 'text/plain';
      }

      console.log(`[DocumentDownloadAgent] 💾 Attachment stored: ${att.fileName} (${fileSize} bytes) -> ${targetPath}`);

      const attachmentEntity = IntakeRepository.addAttachment({
        id: attId,
        packageId,
        fileName: att.fileName,
        documentType: att.documentType,
        filePath: targetPath,
        fileSize,
        mimeType,
        uploadedAt: new Date().toISOString()
      });

      storedAttachments.push(attachmentEntity);
    }

    return storedAttachments;
  }
}
