/**
 * Suggest Doctor Tool
 *
 * Consolidates route_specialist + check_existing_doctor into a single call:
 * routes abnormal lab results to the right specialist and checks whether
 * the patient already has one, so a client doesn't need to plan two
 * sequential tool calls itself. Delegates to the existing tools rather
 * than reimplementing their logic.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { RouteSpecialistTools } from './route-specialist.js';
import { CheckExistingDoctorTools } from './check-existing-doctor.js';

const FlaggedTestSchema = z.object({
  testName: z.string(),
  value: z.number(),
  unit: z.string(),
  status: z.enum(['NORMAL', 'BORDERLINE', 'CRITICAL']),
  panel: z.string(),
  normalRange: z.object({ min: z.number(), max: z.number() }).optional(),
  criticalRange: z.object({ min: z.number(), max: z.number() }).optional()
});

const ExistingDoctorSchema = z.object({
  specialty: z.string().describe('Specialist type, e.g. Nephrologist, Cardiologist'),
  name: z.string().describe('Doctor name, e.g. Dr. Rao')
});

const SuggestDoctorInputSchema = z.object({
  flagged: z.array(FlaggedTestSchema).describe('Flagged test results from the flag_critical tool'),
  existingDoctors: z.array(ExistingDoctorSchema).default([]).describe('Doctors the patient already sees, by specialty')
});

const SuggestDoctorOutputSchema = z.object({
  decisions: z.array(
    z.object({
      specialist: z.string(),
      urgency: z.enum(['SEE TODAY', 'ROUTINE FOLLOW-UP']),
      reason: z.string(),
      action: z.enum(['CONTINUE_WITH_DOCTOR', 'BOOK_NEW_SPECIALIST']),
      existingDoctorName: z.string().optional()
    })
  )
});

const routeSpecialistTools = new RouteSpecialistTools();
const checkExistingDoctorTools = new CheckExistingDoctorTools();

export class SuggestDoctorTools {
  @Tool({
    name: 'suggest_doctor',
    description: 'Route abnormal (BORDERLINE/CRITICAL) lab results to the right specialist and check whether the patient already has one, in a single call. Combines route_specialist and check_existing_doctor.',
    inputSchema: SuggestDoctorInputSchema,
    outputSchema: SuggestDoctorOutputSchema,
    examples: {
      request: {
        flagged: [
          { testName: 'Creatinine', value: 1.5, unit: 'mg/dL', status: 'BORDERLINE', panel: 'KFT' },
          { testName: 'FastingGlucose', value: 250, unit: 'mg/dL', status: 'CRITICAL', panel: 'Glucose' }
        ],
        existingDoctors: [
          { specialty: 'Nephrologist', name: 'Dr. Rao' }
        ]
      },
      response: {
        decisions: [
          {
            specialist: 'Nephrologist',
            urgency: 'ROUTINE FOLLOW-UP',
            reason: 'Creatinine is borderline (1.5 mg/dL)',
            action: 'CONTINUE_WITH_DOCTOR',
            existingDoctorName: 'Dr. Rao'
          },
          {
            specialist: 'Endocrinologist',
            urgency: 'SEE TODAY',
            reason: 'FastingGlucose is critical (250 mg/dL)',
            action: 'BOOK_NEW_SPECIALIST'
          }
        ]
      }
    }
  })
  async suggestDoctor(
    input: z.infer<typeof SuggestDoctorInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof SuggestDoctorOutputSchema>> {
    ctx.logger.info(`Suggesting doctors for ${input.flagged.length} flagged test(s)`);

    const routingResult = await routeSpecialistTools.routeSpecialist({ flagged: input.flagged }, ctx);
    const decisionResult = await checkExistingDoctorTools.checkExistingDoctor(
      { routing: routingResult.routing, existingDoctors: input.existingDoctors },
      ctx
    );

    ctx.logger.info(`suggest_doctor complete: ${decisionResult.decisions.length} recommendation(s)`);

    return decisionResult;
  }
}
