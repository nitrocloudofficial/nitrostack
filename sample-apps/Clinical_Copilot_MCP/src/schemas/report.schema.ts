import { z } from '@nitrostack/core';

/**
 * Clinical Copilot MCP Server - Medical Report Schema
 *
 * Defines Zod schema and TypeScript interfaces for report records in the MongoDB 'reports' collection.
 */

export const ReportSchema = z.object({
  reportId: z.string().describe('Unique identifier for the medical report (e.g. REP001)'),
  patientId: z.string().describe('Target patient ID (e.g. PAT001)'),
  fileId: z.string().describe('Storage file ID (e.g. FILE001)'),
  fileName: z.string().describe('Original name of uploaded document file'),
  fileUrl: z.string().describe('Public Supabase storage URL'),
  reportType: z.string().describe('Type of report (e.g. Blood Report, Radiology, Discharge Note)'),
  uploadedAt: z.string().describe('ISO timestamp of document upload'),
  status: z.string().describe('Processing and storage status'),
});

export type ReportDocument = z.infer<typeof ReportSchema>;
