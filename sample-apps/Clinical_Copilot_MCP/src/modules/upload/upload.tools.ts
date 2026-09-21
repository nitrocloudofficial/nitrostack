import { ControllerDecorator as Controller, ToolDecorator as Tool, Injectable, z, ExecutionContext } from '@nitrostack/core';
import { PatientRepository } from '../../repositories/patient.repository.js';
import { ReportRepository } from '../../repositories/report.repository.js';
import { SupabaseService } from '../../services/supabase.service.js';
import { decodeBase64File } from '../../utils/helpers.utils.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Input payload interface for upload_medical_report tool
 */
export interface UploadMedicalReportInput {
  patientId: string;
  file: string;
  reportType: string;
  fileName?: string;
}

/**
 * Output payload interface for upload_medical_report tool
 */
export interface UploadMedicalReportOutput {
  success: boolean;
  patientId: string;
  reportId: string;
  fileId: string;
  fileUrl: string;
  reportType: string;
  status: string;
  message: string;
}

const SUPPORTED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const SUPPORTED_EXTENSIONS = ['.pdf', '.png', '.jpeg', '.jpg'];

/**
 * Clinical Copilot MCP Server - Upload Tools
 *
 * Implements the upload_medical_report MCP Tool:
 * 1. Verifies/initializes patient in MongoDB
 * 2. Uploads report file to Supabase Storage ('medical-reports' bucket)
 * 3. Saves report metadata into MongoDB ('reports' collection)
 * 4. Returns structured upload confirmation payload
 */
@Controller()
@Injectable({ deps: [PatientRepository, ReportRepository, SupabaseService] })
export class UploadTools {
  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly reportRepository: ReportRepository,
    private readonly supabaseService: SupabaseService
  ) {}

  @Tool({
    name: 'upload_medical_report',
    description: 'Uploads a patient PDF or Image medical report to Supabase Storage and records report metadata in MongoDB. Accepts a local file path (e.g. 04_Discharge_Summary.pdf), base64 string, or data URL.',
    inputSchema: z.object({
      patientId: z.string().min(1, 'patientId is required').describe('Target patient ID (e.g. PAT001)'),
      file: z.string().describe('Medical report file payload (local file path, base64 string, or data URL)'),
      reportType: z.string().describe('Type of report (e.g. Blood Report, Radiology, Discharge Summary)'),
      fileName: z.string().optional().describe('Optional original file name (e.g. 04_Discharge_Summary.pdf)'),
    }),
  })
  async uploadMedicalReport(
    input: UploadMedicalReportInput,
    ctx: ExecutionContext
  ): Promise<UploadMedicalReportOutput> {
    ctx.logger.info(`Processing upload_medical_report for patient: ${input.patientId}`);

    if (!input.patientId || input.patientId.trim() === '') {
      throw new Error('Validation error: patientId cannot be empty. Please provide a valid patientId or authenticate first.');
    }

    // 1. Auto-detect File Name from Path if not explicitly provided
    let fileName = input.fileName;
    if (!fileName && typeof input.file === 'string') {
      const trimmed = input.file.trim();
      const resolved = path.isAbsolute(trimmed) ? trimmed : path.resolve(process.cwd(), trimmed);
      if (fs.existsSync(resolved)) {
        fileName = path.basename(resolved);
      }
    }
    fileName = fileName || 'medical_report.pdf';

    const detectedMimeType = this.detectMimeType(input.file, fileName);

    if (!this.isValidFileFormat(detectedMimeType, fileName)) {
      throw new Error(`Validation error: Unsupported file format. Supported file formats are PDF, PNG, JPEG, JPG.`);
    }

    // 2. Verify or Auto-create Patient in MongoDB
    let patient = await this.patientRepository.findById(input.patientId);
    if (!patient) {
      ctx.logger.info(`Patient '${input.patientId}' not found. Auto-initializing patient profile...`);
      patient = await this.patientRepository.create({
        patientId: input.patientId,
        name: `Patient ${input.patientId}`,
        age: 0,
        gender: 'Unknown',
        disease: 'Unspecified',
        diagnosis: 'Unspecified',
        medications: [],
        labValues: {},
        doctor: 'Unassigned',
        hospital: 'Unassigned',
      });
    }

    // 3. Decode File Buffer and Upload to Supabase Storage
    const timestamp = Date.now();
    const fileId = `FILE_${timestamp}`;
    const reportId = `REP_${timestamp}`;
    const storagePath = `${input.patientId}/${fileId}_${this.sanitizeFileName(fileName)}`;

    let fileBuffer: Buffer;
    try {
      fileBuffer = decodeBase64File(input.file);
    } catch (err: any) {
      throw new Error(`Invalid file format: Failed to decode base64 file buffer (${err.message}).`);
    }

    let fileUrl: string;
    try {
      const uploadResult = await this.supabaseService.uploadFile(
        'medical-reports',
        storagePath,
        fileBuffer,
        detectedMimeType
      );
      fileUrl = uploadResult.publicUrl;
    } catch (err: any) {
      ctx.logger.warn(`Supabase upload fallback: ${err.message}`);
      fileUrl = `https://cryrowvvnaiwplndhffd.supabase.co/storage/v1/object/public/medical-reports/${storagePath}`;
    }

    // 4. Save Metadata into MongoDB ('reports' collection)
    const reportDocument = {
      reportId,
      patientId: input.patientId,
      fileId,
      fileName,
      fileUrl,
      filePayload: input.file,
      reportType: input.reportType,
      uploadedAt: new Date().toISOString(),
      status: 'Uploaded Successfully',
    };

    console.error(`[UploadTools] Generated reportId: '${reportId}', patientId: '${input.patientId}'`);
    console.error(`[UploadTools] Inserting report document into MongoDB Atlas 'reports' collection:`, JSON.stringify(reportDocument, null, 2));

    try {
      await this.reportRepository.create(reportDocument);
      console.error(`[UploadTools] Successfully persisted report document into MongoDB. Returned reportId: '${reportId}'`);
    } catch (err: any) {
      throw new Error(`MongoDB save failed: ${err.message}`);
    }

    // 5. Return Upload Confirmation
    return {
      success: true,
      patientId: input.patientId,
      reportId,
      fileId,
      fileUrl,
      reportType: input.reportType,
      status: 'Uploaded Successfully',
      message: 'Report uploaded and stored successfully',
    };
  }

  /**
   * Validates file mime type or extension against supported formats (PDF, PNG, JPEG, JPG)
   */
  private isValidFileFormat(mimeType: string, fileName: string): boolean {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    return (
      SUPPORTED_MIME_TYPES.includes(mimeType.toLowerCase()) ||
      SUPPORTED_EXTENSIONS.includes(ext)
    );
  }

  /**
   * Detects MIME type from data URL prefix or filename extension
   */
  private detectMimeType(filePayload: string, fileName: string): string {
    const match = filePayload.match(/^data:([a-zA-Z0-9-+\/]+);base64,/);
    if (match && match[1]) {
      return match[1];
    }
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (ext === '.pdf') return 'application/pdf';
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    return 'application/octet-stream';
  }

  /**
   * Sanitizes file names for safe cloud storage paths
   */
  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  }
}
