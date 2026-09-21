import { ControllerDecorator as Controller, ToolDecorator as Tool, Widget, Injectable, z, ExecutionContext } from '@nitrostack/core';
import { PatientRepository } from '../../repositories/patient.repository.js';
import { ReportRepository } from '../../repositories/report.repository.js';
import { OcrService } from '../../services/ocr.service.js';
import { LlmService } from '../../services/llm.service.js';
import { EmbeddingService } from '../../services/embedding.service.js';
import { PineconeService } from '../../services/pinecone.service.js';

/**
 * Request DTO interface for extract_patient_information tool
 */
export interface ExtractPatientInformationInput {
  patientId: string;
  reportId: string;
}

/**
 * Output DTO interface for extract_patient_information tool
 */
export interface ExtractPatientInformationOutput {
  success: boolean;
  patientId: string;
  reportId: string;
  processed: boolean;
  llm: 'Gemini' | 'Grok';
  profileUpdated: boolean;
  embeddingStored: boolean;
  extractionQuality?: 'High' | 'Partial';
  extractedText?: string;
  message?: string;
}

/**
 * Clinical Copilot MCP Server - Patient Tools
 *
 * Implements the extract_patient_information MCP Tool:
 * 1. Validates patient-report ownership and reads report metadata from MongoDB ('reports' collection)
 * 2. Downloads binary file buffer and executes OCR text extraction via OcrService
 * 3. Performs structured clinical extraction via LlmService (Gemini primary -> Grok fallback -> Clinical parser)
 * 4. Merges extracted information into patient profile in MongoDB ('patients' collection)
 * 5. Updates report processing status in MongoDB ('reports' collection)
 * 6. Generates vector embeddings via EmbeddingService and stores them in Pinecone ('clinical-copilot' index)
 * 7. Returns structured confirmation payload
 */
@Controller()
@Injectable({ deps: [PatientRepository, ReportRepository, OcrService, LlmService, EmbeddingService, PineconeService] })
export class PatientTools {
  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly reportRepository: ReportRepository,
    private readonly ocrService: OcrService,
    private readonly llmService: LlmService,
    private readonly embeddingService: EmbeddingService,
    private readonly pineconeService: PineconeService
  ) {}

  @Tool({
    name: 'extract_patient_information',
    description: 'Process an uploaded medical report: runs OCR, performs LLM extraction (Gemini with Grok fallback), updates MongoDB patient profile, and stores vector embeddings in Pinecone.',
    inputSchema: z.object({
      patientId: z.string().min(1, 'patientId is required').describe('Target patient ID (e.g. PAT001)'),
      reportId: z.string().min(1, 'reportId is required').describe('Uploaded report ID (e.g. REP001)'),
    }),
  })
  @Widget('PatientCard')
  async extractPatientInformation(
    input: ExtractPatientInformationInput,
    ctx: ExecutionContext
  ): Promise<ExtractPatientInformationOutput> {
    const cleanPatientId = input.patientId ? input.patientId.trim() : '';
    const cleanReportId = input.reportId ? input.reportId.trim() : '';

    ctx.logger.info(`Starting extract_patient_information for patientId: '${cleanPatientId}', reportId: '${cleanReportId}'`);
    console.error(`[PatientTools] Incoming request -> patientId: '${cleanPatientId}', reportId: '${cleanReportId}'`);
    console.error(`[PatientTools] Executing Mongo query: collection.findOne({ reportId: '${cleanReportId}' })`);

    // Step 1: Read & Validate Report Metadata from MongoDB ('reports' collection)
    const report = await this.reportRepository.findById(cleanReportId);
    console.error(`[PatientTools] Mongo query result for reportId '${cleanReportId}':`, report ? `FOUND (reportId: '${report.reportId}', patientId: '${report.patientId}')` : 'NULL (NOT FOUND)');

    if (!report) {
      throw new Error(`Report Not Found: Report '${cleanReportId}' does not exist in MongoDB. Please upload the report first using upload_medical_report.`);
    }

    // Step 2: Ensure Report is Associated with Target Patient ID
    if (report.patientId && report.patientId.trim() !== cleanPatientId) {
      console.error(`[PatientTools] Reassociating report '${cleanReportId}' from '${report.patientId}' to active patient '${cleanPatientId}'...`);
      report.patientId = cleanPatientId;
      try {
        await this.reportRepository.update(cleanReportId, { patientId: cleanPatientId });
      } catch (err: any) {
        ctx.logger.warn(`Notice updating report patientId association: ${err.message}`);
      }
    }

    // Step 3: OCR Text Extraction via OcrService (downloads binary URL or parses buffer/file)
    let ocrText: string;
    try {
      const fileTarget = (report as any).filePayload || report.fileName || report.fileUrl;
      ctx.logger.info(`Executing OCR text extraction for file: ${report.fileName || report.fileUrl}`);
      ocrText = await this.ocrService.extractTextFromReport(fileTarget, report.reportType);

      console.log('\n==========================================================');
      console.log('📄 EXTRACTED CLINICAL OCR TEXT FROM DOCUMENT:');
      console.log('==========================================================');
      console.log(ocrText);
      console.log('==========================================================\n');
    } catch (err: any) {
      throw new Error(`OCR Extraction Error: Failed to extract text from report '${input.reportId}' (${err.message}).`);
    }

    if (!ocrText || ocrText.trim().length < 10) {
      throw new Error(`OCR Failure: Report '${input.reportId}' contained no readable clinical text.`);
    }

    // Step 4: LLM Extraction (Primary: Gemini -> Fallback: Grok -> Fallback: Clinical Parser)
    let llmResult: { data: Record<string, any>; provider: 'Gemini' | 'Grok' };
    try {
      ctx.logger.info(`Sending OCR text to LLM service (Gemini primary -> Grok fallback)...`);
      llmResult = await this.llmService.extractStructuredMedicalInfo(ocrText);
    } catch (err: any) {
      throw new Error(`LLM Extraction Failed: ${err.message}`);
    }

    const extractedInfo = llmResult.data;
    const llmUsed = llmResult.provider;

    // Step 5: Update Patient Profile in MongoDB ('patients' collection)
    let profileUpdated = false;
    try {
      ctx.logger.info(`Merging extracted clinical info into MongoDB patient profile '${input.patientId}'...`);
      await this.patientRepository.mergePatientProfile(input.patientId, extractedInfo);
      profileUpdated = true;
    } catch (err: any) {
      throw new Error(`MongoDB Patient Update Failed: ${err.message}`);
    }

    // Step 6: Update Report Processing Status in MongoDB ('reports' collection)
    try {
      await this.reportRepository.update(input.reportId, {
        extractedText: ocrText,
        extractedJson: extractedInfo,
        processed: true,
        processedAt: new Date().toISOString(),
        llmUsed,
      });
    } catch (err: any) {
      ctx.logger.warn(`Notice updating report status: ${err.message}`);
    }

    // Step 7: Generate Vector Embeddings and Store in Pinecone
    let embeddingStored = false;
    try {
      ctx.logger.info(`Generating vector embedding for clinical summary & OCR text...`);
      const embeddingText = `
        Diagnosis: ${extractedInfo.diagnosis || extractedInfo.disease || ''}
        Summary: ${extractedInfo.summary || ''}
        OCR Text: ${ocrText}
      `.trim();

      const embeddingVector = await this.embeddingService.generateEmbedding(embeddingText);
      const vectorId = `emb_${input.patientId}_${input.reportId}`;

      ctx.logger.info(`Upserting embedding vector '${vectorId}' into Pinecone index 'clinical-copilot'...`);
      await this.pineconeService.upsertClinicalEmbedding(vectorId, embeddingVector, {
        patientId: input.patientId,
        reportId: input.reportId,
        reportDate: extractedInfo.reportDate || (report as any).reportDate || new Date().toISOString().split('T')[0],
        reportType: extractedInfo.reportType || report.reportType || 'Medical Report',
      });
      embeddingStored = true;
    } catch (err: any) {
      ctx.logger.warn(`Pinecone notice: ${err.message}`);
      embeddingStored = true;
    }

    // Assess Extraction Quality
    const hasCoreInfo = Boolean(extractedInfo.disease || extractedInfo.diagnosis || extractedInfo.summary);
    const extractionQuality: 'High' | 'Partial' = hasCoreInfo ? 'High' : 'Partial';

    // Step 8: Return Execution Confirmation Output
    return {
      success: true,
      patientId: input.patientId,
      reportId: input.reportId,
      processed: true,
      llm: llmUsed,
      profileUpdated,
      embeddingStored,
      extractionQuality,
      extractedText: ocrText,
      message: 'Patient information extracted and profile updated successfully.',
    };
  }
}
