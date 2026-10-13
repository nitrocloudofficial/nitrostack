/**
 * Patient Context Tool
 *
 * Captures basic patient context (age, sex, known conditions, current
 * medications) into a structured record and a one-line summary. Stateless
 * — nothing is persisted. Meant to feed downstream explanations
 * (explain_triage, explain_recommendation) so they can be phrased with
 * awareness of who the patient is, without affecting the clinical
 * classification logic in flag_critical.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

const PatientContextInputSchema = z.object({
  age: z.number().optional().describe('Patient age in years'),
  sex: z.enum(['male', 'female', 'other']).optional().describe('Patient sex'),
  knownConditions: z.array(z.string()).default([]).describe('Known existing conditions, e.g. "diabetes", "pregnant", "hypertension"'),
  currentMedications: z.array(z.string()).default([]).describe('Medications the patient currently takes')
});

const PatientContextOutputSchema = z.object({
  age: z.number().optional(),
  sex: z.enum(['male', 'female', 'other']).optional(),
  knownConditions: z.array(z.string()),
  currentMedications: z.array(z.string()),
  contextSummary: z.string().describe('One-line human-readable summary of the patient context, for use in downstream explanations')
});

function buildContextSummary(input: z.infer<typeof PatientContextInputSchema>): string {
  const parts: string[] = [];

  if (input.age !== undefined) parts.push(`${input.age}-year-old`);
  if (input.sex) parts.push(input.sex);
  parts.push(parts.length > 0 ? 'patient' : 'Patient');

  if (input.knownConditions.length > 0) {
    parts.push(`with known ${input.knownConditions.join(', ')}`);
  }
  if (input.currentMedications.length > 0) {
    parts.push(`currently on ${input.currentMedications.join(', ')}`);
  }

  return parts.join(' ');
}

export class PatientContextTools {
  @Tool({
    name: 'patient_context',
    description: 'Capture basic patient context (age, sex, known conditions, medications) to inform downstream recommendations and explanations. Stateless, nothing is stored.',
    inputSchema: PatientContextInputSchema,
    outputSchema: PatientContextOutputSchema,
    examples: {
      request: {
        age: 45,
        sex: 'female',
        knownConditions: ['diabetes'],
        currentMedications: ['metformin']
      },
      response: {
        age: 45,
        sex: 'female',
        knownConditions: ['diabetes'],
        currentMedications: ['metformin'],
        contextSummary: '45-year-old female patient with known diabetes currently on metformin'
      }
    }
  })
  async patientContext(
    input: z.infer<typeof PatientContextInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof PatientContextOutputSchema>> {
    ctx.logger.info('Building patient context', { hasAge: input.age !== undefined, conditionCount: input.knownConditions.length });

    return {
      ...input,
      contextSummary: buildContextSummary(input)
    };
  }
}
