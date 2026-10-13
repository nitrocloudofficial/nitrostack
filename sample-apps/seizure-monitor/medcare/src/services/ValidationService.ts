/**
 * ValidationService
 *
 * Central Zod schema registry for both inbound requests and outbound
 * responses. The Secure Data Gateway validates every request before
 * routing it, and validates every response before returning it to the
 * caller — this is what "Response Validation" (preventing sensitive
 * field leakage / malformed AI output) means in practice.
 *
 * New AI tasks or endpoints register their schemas here instead of
 * scattering ad-hoc validation through the codebase.
 */

import { z, type ZodTypeAny } from 'zod';
import type { IValidationService } from '../interfaces/gateway.interfaces.js';
import { ValidationError, ResponseValidationError } from '../utils/errors.js';

// ---------------------------------------------------------------------------
// Request Schemas
// ---------------------------------------------------------------------------

const patientIdSchema = z.string().regex(/^P\d{3,}$/, 'Patient ID must look like "P001".');

const geneConflictSchema = z.object({
  drug: z.string(),
  severity: z.enum(['high', 'moderate', 'low']),
  risk: z.string(),
  recommendation: z.string(),
  fdaBoxedWarning: z.boolean()
});

const medicineAnalysisRequestSchema = z.object({
  patientRecord: z.object({
    name: z.string().optional(),
    diagnosis: z.string().optional(),
    geneConflicts: z.array(geneConflictSchema),
    activeMedications: z.array(z.string()),
    allergies: z.array(z.object({ substance: z.string() }))
  }),
  prescription: z.string().min(1),
  knownInteractions: z.array(
    z.object({ drug: z.string(), description: z.string(), severity: z.enum(['high', 'moderate', 'low']) })
  )
});

const labEntrySchema = z.object({
  test: z.string(),
  value: z.number(),
  unit: z.string(),
  referenceRange: z.string(),
  status: z.enum(['normal', 'above_range', 'below_range', 'critical', 'unknown']),
  date: z.string()
});

const reportSummaryRequestSchema = z.object({
  reportText: z.string().min(1).max(20_000).optional(),
  labHistory: z.array(labEntrySchema).optional()
});

const emergencyAnalysisRequestSchema = z.object({
  bloodType: z.string(),
  criticalAllergies: z.array(z.object({ substance: z.string(), reaction: z.string(), severity: z.string() })),
  criticalConditions: z.array(z.object({ name: z.string(), severity: z.string() })),
  activeMedicationNames: z.array(z.string()),
  geneticAlerts: z.array(z.object({ gene: z.string(), phenotype: z.string(), emergencyRelevance: z.string() }))
});

const drugOriginRequestSchema = z.object({
  drugName: z.string().min(1),
  ndcCode: z.string().optional(),
  batchNumber: z.string().optional()
});

const fileUploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  contentBase64: z.string().min(1)
});

// ---------------------------------------------------------------------------
// Response Schemas
// ---------------------------------------------------------------------------

const aiResponseEnvelopeSchema = z.object({
  task: z.string(),
  output: z.record(z.unknown()),
  agent: z.string(),
  tookMs: z.number().nonnegative()
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const REQUEST_SCHEMAS: Record<string, ZodTypeAny> = {
  'medicine-analysis': medicineAnalysisRequestSchema,
  'report-summary': reportSummaryRequestSchema,
  'emergency-analysis': emergencyAnalysisRequestSchema,
  'drug-origin': drugOriginRequestSchema,
  'file-upload': fileUploadRequestSchema
};

const RESPONSE_SCHEMAS: Record<string, ZodTypeAny> = {
  'ai-response': aiResponseEnvelopeSchema
};

export class ValidationService implements IValidationService {
  validateRequest<T>(schemaName: string, payload: unknown): T {
    const schema = REQUEST_SCHEMAS[schemaName];
    if (!schema) {
      throw new ValidationError(`No request schema registered for "${schemaName}".`);
    }
    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new ValidationError(`Request failed validation: ${result.error.issues.map(i => i.message).join('; ')}`);
    }
    return result.data as T;
  }

  validateResponse<T>(schemaName: string, payload: unknown): T {
    const schema = RESPONSE_SCHEMAS[schemaName];
    if (!schema) {
      throw new ResponseValidationError(`No response schema registered for "${schemaName}".`);
    }
    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new ResponseValidationError(`Response failed validation: ${result.error.issues.map(i => i.message).join('; ')}`);
    }
    return result.data as T;
  }

  /** Allows new modules to register additional schemas without editing this file's internals. */
  registerRequestSchema(name: string, schema: ZodTypeAny): void {
    REQUEST_SCHEMAS[name] = schema;
  }

  registerResponseSchema(name: string, schema: ZodTypeAny): void {
    RESPONSE_SCHEMAS[name] = schema;
  }
}
