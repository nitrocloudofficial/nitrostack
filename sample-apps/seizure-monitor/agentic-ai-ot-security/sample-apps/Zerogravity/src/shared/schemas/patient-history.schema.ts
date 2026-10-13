import { z } from 'zod';

export const MedicationSchema = z.object({
  name: z.string().describe('Medication name'),
  dosage: z.string().describe('Dosage and frequency'),
  startDate: z.string().describe('Start date (ISO 8601)'),
  indication: z.string().describe('Reason for medication'),
});

export const AllergySchema = z.object({
  allergen: z.string().describe('Allergen name (drug or substance)'),
  reactionType: z.string().describe('Type of allergic reaction'),
  severity: z.enum(['mild', 'moderate', 'severe']).describe('Severity level'),
  dateReported: z.string().describe('Date reported (ISO 8601)'),
});

export const ConditionSchema = z.object({
  name: z.string().describe('Condition name'),
  status: z.enum(['active', 'resolved', 'chronic']).describe('Current status'),
  diagnosisDate: z.string().describe('Diagnosis date (ISO 8601)'),
  notes: z.string().optional().describe('Additional clinical notes'),
});

export const PastReactionSchema = z.object({
  drug: z.string().describe('Drug that caused reaction'),
  reactionType: z.string().describe('Type of reaction'),
  date: z.string().describe('Date of reaction (ISO 8601)'),
  severity: z.enum(['mild', 'moderate', 'severe']).describe('Severity level'),
});

export const PatientHistorySchema = z.object({
  patientId: z.string().describe('Patient ID'),
  medications: z.array(MedicationSchema).describe('Current medications'),
  allergies: z.array(AllergySchema).describe('Known allergies'),
  conditions: z.array(ConditionSchema).describe('Active and chronic conditions'),
  pastReactions: z.array(PastReactionSchema).describe('Past adverse drug reactions'),
  lastUpdated: z.string().describe('Last update timestamp (ISO 8601)'),
});

export type Medication = z.infer<typeof MedicationSchema>;
export type Allergy = z.infer<typeof AllergySchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type PastReaction = z.infer<typeof PastReactionSchema>;
export type PatientHistory = z.infer<typeof PatientHistorySchema>;
