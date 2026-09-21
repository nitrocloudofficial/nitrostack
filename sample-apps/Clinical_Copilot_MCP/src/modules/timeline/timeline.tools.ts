import { ControllerDecorator as Controller, ToolDecorator as Tool, Widget, Injectable, z, ExecutionContext } from '@nitrostack/core';
import { PatientRepository } from '../../repositories/patient.repository.js';
import { ReportRepository } from '../../repositories/report.repository.js';
import { TimelineRepository } from '../../repositories/timeline.repository.js';
import { TimelineService } from '../../services/timeline.service.js';
import { TimelineEvent } from '../../schemas/timeline.schema.js';

/**
 * Input DTO interface for update_medical_timeline tool
 */
export interface UpdateMedicalTimelineInput {
  patientId: string;
}

/**
 * Output DTO interface for update_medical_timeline tool
 */
export interface UpdateMedicalTimelineOutput {
  success: boolean;
  patientId: string;
  timelineGenerated: boolean;
  totalEvents: number;
  timeline: TimelineEvent[];
  message?: string;
}

/**
 * Clinical Copilot MCP Server - Timeline Tools
 *
 * Implements the update_medical_timeline MCP Tool:
 * 1. Verifies patient exists in MongoDB ('patients' collection)
 * 2. Reads all processed reports for the patient from MongoDB ('reports' collection)
 * 3. Extracts, deduplicates, and sorts medical events chronologically by reportDate (Oldest -> Newest) via TimelineService
 * 4. Persists the generated timeline into MongoDB ('timelines' collection)
 * 5. Returns execution confirmation payload containing the complete timeline event list
 */
@Controller()
@Injectable({ deps: [PatientRepository, ReportRepository, TimelineRepository, TimelineService] })
export class TimelineTools {
  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly reportRepository: ReportRepository,
    private readonly timelineRepository: TimelineRepository,
    private readonly timelineService: TimelineService
  ) {}

  @Tool({
    name: 'update_medical_timeline',
    description: 'Generates and updates a patient\'s complete chronological medical timeline from all processed reports.',
    inputSchema: z.object({
      patientId: z.string().min(1, 'patientId is required').describe('Target patient ID (e.g. PAT001)'),
    }),
  })
  @Widget('Timeline')
  async updateMedicalTimeline(
    input: UpdateMedicalTimelineInput,
    ctx: ExecutionContext
  ): Promise<UpdateMedicalTimelineOutput> {
    ctx.logger.info(`Executing update_medical_timeline for patient: ${input.patientId}`);

    if (!input.patientId || input.patientId.trim() === '') {
      throw new Error('Validation error: patientId cannot be empty. Please provide a valid patientId.');
    }

    // 1. Verify Patient Exists in MongoDB
    const patient = await this.patientRepository.findById(input.patientId);
    if (!patient) {
      throw new Error(`Patient Not Found: Patient with ID '${input.patientId}' does not exist in MongoDB.`);
    }

    // 2. Fetch All Reports for Patient
    let allReports: any[];
    try {
      allReports = await this.reportRepository.findByPatientId(input.patientId);
    } catch (err: any) {
      throw new Error(`MongoDB Error: Failed to fetch reports for patient '${input.patientId}' (${err.message}).`);
    }

    if (!allReports || allReports.length === 0) {
      throw new Error(`No Reports Found: No medical reports found for patient '${input.patientId}'.`);
    }

    // 3. Filter for Processed Reports Only (processed === true)
    const processedReports = allReports.filter((report) => report.processed === true);
    if (processedReports.length === 0) {
      throw new Error(`No Processed Reports: No processed medical reports found for patient '${input.patientId}'. Please run extract_patient_information first.`);
    }

    // 4. Generate Chronological & Deduplicated Timeline Events via TimelineService
    ctx.logger.info(`Generating timeline events from ${processedReports.length} processed report(s)...`);
    const timelineEvents = this.timelineService.generateTimelineFromReports(processedReports);

    // 5. Persist Timeline to MongoDB ('timelines' collection)
    try {
      await this.timelineRepository.saveTimeline(input.patientId, timelineEvents);
      ctx.logger.info(`Successfully saved ${timelineEvents.length} timeline event(s) to MongoDB for patient ${input.patientId}.`);
    } catch (err: any) {
      throw new Error(`MongoDB Error: Failed to save timeline to database (${err.message}).`);
    }

    // 6. Return Execution Output with Full Timeline Events List
    return {
      success: true,
      patientId: input.patientId,
      timelineGenerated: true,
      totalEvents: timelineEvents.length,
      timeline: timelineEvents,
      message: `Medical timeline updated successfully with ${timelineEvents.length} chronological event(s).`,
    };
  }
}
