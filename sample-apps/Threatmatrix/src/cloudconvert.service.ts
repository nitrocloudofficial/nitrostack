/**
 * ThreatMatrix CloudConvert Integration Service
 * Converts complex document formats (DOCX, PPTX, XLSX, RTF, EML, EPUB, etc.) into text/PDF
 * for full forensic threat analysis.
 */
import CloudConvert from 'cloudconvert';
import { config } from './config.js';
import { logger } from './logger.js';

export class CloudConvertService {
  private cloudConvert: CloudConvert | null = null;

  constructor() {
    if (config.cloudConvertApiKey) {
      this.cloudConvert = new CloudConvert(config.cloudConvertApiKey);
      logger.info('Initialized CloudConvertService with API key.');
    } else {
      logger.info('CloudConvertService initialized without API key (fallback local extraction mode active).');
    }
  }

  public isAvailable(): boolean {
    return this.cloudConvert !== null;
  }

  /**
   * Converts document buffer (DOCX, PPTX, XLSX, etc.) into plain text or PDF text stream.
   */
  public async convertDocumentToText(fileBuffer: Buffer, filename: string, inputFormat: string): Promise<string> {
    if (!this.cloudConvert) {
      throw new Error('CloudConvert API key is not configured (CLOUDCONVERT_API_KEY).');
    }

    try {
      logger.info('Creating CloudConvert job for document analysis', { filename, inputFormat });

      // Create conversion job to txt
      const job = await this.cloudConvert.jobs.create({
        tasks: {
          'upload-file': {
            operation: 'import/upload',
          },
          'convert-file': {
            operation: 'convert',
            input: 'upload-file',
            output_format: 'txt',
          },
          'export-file': {
            operation: 'export/url',
            input: 'convert-file',
          },
        },
      });

      const uploadTask = job.tasks.find((task) => task.name === 'upload-file');
      if (!uploadTask || !uploadTask.result || !uploadTask.result.form) {
        throw new Error('CloudConvert failed to generate upload task URL');
      }

      // Upload file buffer using standard fetch/FormData or cloudconvert built-in stream
      await this.cloudConvert.tasks.upload(uploadTask, fileBuffer as any, filename);

      // Wait for job completion
      const completedJob = await this.cloudConvert.jobs.wait(job.id);
      const exportTask = completedJob.tasks.find((task) => task.name === 'export-file');

      if (!exportTask || !exportTask.result || !exportTask.result.files || exportTask.result.files.length === 0) {
        throw new Error('CloudConvert failed to export converted document text');
      }

      const fileUrl = exportTask.result.files[0].url;
      if (!fileUrl) throw new Error('CloudConvert returned empty file download URL');

      // Fetch converted text content
      const res = await fetch(fileUrl);
      const extractedText = await res.text();
      return extractedText;
    } catch (err: any) {
      logger.error('CloudConvert document conversion failed', { error: err.message, filename });
      throw new Error(`CloudConvert conversion failed: ${err.message}`);
    }
  }
}
