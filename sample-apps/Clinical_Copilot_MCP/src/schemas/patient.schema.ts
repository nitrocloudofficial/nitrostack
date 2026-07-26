import { z } from '@nitrostack/core';

/**
 * Clinical Copilot MCP Server - Patient Schema
 *
 * Defines Zod schema and TypeScript interfaces for patient records in the MongoDB 'patients' collection.
 */

export const PatientSchema = z.object({
  patientId: z.string().describe('Unique identifier for the patient (MRN or UUID)'),
  name: z.string().describe('Full name of the patient'),
  age: z.number().describe('Age of patient in years'),
  gender: z.string().describe('Biological gender'),
  disease: z.string().describe('Primary disease condition'),
  diagnosis: z.string().describe('Clinical diagnosis notes'),
  medications: z.array(z.string()).default([]).describe('List of currently prescribed medications'),
  labValues: z.record(z.any()).default({}).describe('Structured lab markers and clinical values'),
  doctor: z.string().describe('Attending physician name'),
  hospital: z.string().describe('Primary hospital or medical facility name'),
  createdAt: z.string().optional().describe('ISO timestamp of record creation'),
  updatedAt: z.string().optional().describe('ISO timestamp of last record update'),
});

export type PatientDocument = z.infer<typeof PatientSchema>;
