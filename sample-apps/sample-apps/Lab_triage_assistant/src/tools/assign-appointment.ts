/**
 * Assign Appointment Tool
 *
 * Produces a department-level follow-up recommendation only.
 * The LLM should decide which department fits best from the flagged lab
 * results; this tool only checks whether the current doctor specialty still
 * matches that department and returns a simple follow-up suggestion.
 */

import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { getDoctorById } from '../resources/doctors.js';

const RoutingItemSchema = z.object({
  specialist: z.string(),
  urgency: z.enum(['SEE TODAY', 'ROUTINE FOLLOW-UP']),
  reason: z.string()
});

const AssignAppointmentInputSchema = z.object({
  routing: z.array(RoutingItemSchema).default([]),
  recommendedDepartment: z.string().default(''),
  patientId: z.string().default(''),
  previousDoctorId: z.string().default('')
});

const FollowUpPlanSchema = z.object({
  sameDepartment: z.boolean(),
  currentDoctorSpecialty: z.string().nullable(),
  recommendedDepartment: z.string(),
  followUpNote: z.string()
});

const AssignAppointmentOutputSchema = z.object({
  followUpPlan: FollowUpPlanSchema,
  confirmationText: z.string()
});

function resolveCurrentDoctorSpecialty(previousDoctorId: string) {
  const previousDoctor = getDoctorById(previousDoctorId);

  if (!previousDoctor) {
    return null;
  }

  return previousDoctor.specialist;
}

export class AssignAppointmentTools {
  @Tool({
    name: 'assign_appointment',
    description: 'Produce a department-level follow-up recommendation from the LLM department choice. Returns whether the current doctor specialty matches and what department to consult next. No doctor names are returned.',
    inputSchema: AssignAppointmentInputSchema,
    outputSchema: AssignAppointmentOutputSchema,
    examples: {
      request: {
        routing: [
          { specialist: 'Endocrinology', urgency: 'SEE TODAY', reason: 'FastingGlucose is critical (250 mg/dL)' },
          { specialist: 'Nephrology', urgency: 'ROUTINE FOLLOW-UP', reason: 'Creatinine is borderline (1.5 mg/dL)' }
        ],
        recommendedDepartment: 'Endocrinology',
        patientId: 'pat_ayesha_123',
        previousDoctorId: 'doc_gp_001'
      },
      response: {
        followUpPlan: {
          sameDepartment: false,
          currentDoctorSpecialty: 'General Physician',
          recommendedDepartment: 'Endocrinology',
          followUpNote: 'The analysis suggests a new department. Please consult Endocrinology next.'
        },
        confirmationText: 'Department follow-up suggestion ready.'
      }
    }
  })
  @Widget('triage-panel')
  async assignAppointment(
    input: z.infer<typeof AssignAppointmentInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof AssignAppointmentOutputSchema>> {
    ctx.logger.info('Building department follow-up plan', {
      patientId: input.patientId,
      routingCount: input.routing?.length ?? 0
    });

    const routing = input.routing ?? [];
    const currentDoctorSpecialty = resolveCurrentDoctorSpecialty(input.previousDoctorId);
    const fallbackDepartment = routing[0]?.specialist ?? 'General Medicine';
    const recommendedDepartment = input.recommendedDepartment.trim() || fallbackDepartment;
    const sameDepartment = currentDoctorSpecialty
      ? currentDoctorSpecialty.toLowerCase() === recommendedDepartment.toLowerCase()
      : false;

    const followUpNote = sameDepartment
      ? `The current doctor specialty already matches ${recommendedDepartment}.`
      : `The analysis suggests a new department. Please consult ${recommendedDepartment} next.`;

    const confirmationText = 'Department follow-up suggestion ready.';

    return {
      followUpPlan: {
        sameDepartment,
        currentDoctorSpecialty,
        recommendedDepartment,
        followUpNote
      },
      confirmationText
    };
  }
}