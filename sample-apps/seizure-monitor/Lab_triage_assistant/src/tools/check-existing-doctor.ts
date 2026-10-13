/**
 * Check Existing Doctor Tool
 *
 * Cross-references specialist routing recommendations against the patient's
 * existing doctors to avoid recommending a duplicate booking.
 * Input: routing from route_specialist, plus the patient's existing doctors
 * Output: per-specialist action — continue with existing doctor, or book a new specialist
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

export type BookingAction = 'CONTINUE_WITH_DOCTOR' | 'BOOK_NEW_SPECIALIST';

export interface DoctorDecision {
  specialist: string;
  urgency: 'SEE TODAY' | 'ROUTINE FOLLOW-UP';
  reason: string;
  action: BookingAction;
  existingDoctorName?: string;
}

/**
 * Input schema: routing from route_specialist, plus the patient's existing doctors
 */
const RoutingEntrySchema = z.object({
  specialist: z.string(),
  urgency: z.enum(['SEE TODAY', 'ROUTINE FOLLOW-UP']),
  reason: z.string()
});

const ExistingDoctorSchema = z.object({
  specialty: z.string().describe('Specialist type, e.g. Nephrologist, Cardiologist'),
  name: z.string().describe('Doctor name, e.g. Dr. Rao')
});

const CheckExistingDoctorInputSchema = z.object({
  routing: z.array(RoutingEntrySchema).describe('Specialist routing recommendations from the route_specialist tool'),
  existingDoctors: z.array(ExistingDoctorSchema).default([]).describe('Doctors the patient already sees, by specialty')
});

/**
 * Output schema
 */
const CheckExistingDoctorOutputSchema = z.object({
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

/**
 * For each routed specialist, decide whether the patient can continue with
 * an existing doctor of that specialty or needs to book a new one.
 */
function resolveBookings(
  routing: z.infer<typeof RoutingEntrySchema>[],
  existingDoctors: z.infer<typeof ExistingDoctorSchema>[]
): DoctorDecision[] {
  const bySpecialty = new Map(
    existingDoctors.map(doctor => [doctor.specialty.toLowerCase(), doctor.name])
  );

  return routing.map(entry => {
    const existingDoctorName = bySpecialty.get(entry.specialist.toLowerCase());

    return existingDoctorName
      ? { ...entry, action: 'CONTINUE_WITH_DOCTOR' as const, existingDoctorName }
      : { ...entry, action: 'BOOK_NEW_SPECIALIST' as const };
  });
}

/**
 * Check Existing Doctor Tool
 *
 * Chains after route_specialist: matches each recommended specialist against
 * the patient's existing doctors so the same specialty isn't booked twice.
 */
export class CheckExistingDoctorTools {
  @Tool({
    name: 'check_existing_doctor',
    description: 'Match specialist routing recommendations against the patient\'s existing doctors to avoid duplicate bookings. Takes the routing output from route_specialist.',
    inputSchema: CheckExistingDoctorInputSchema,
    outputSchema: CheckExistingDoctorOutputSchema,
    examples: {
      request: {
        routing: [
          { specialist: 'Nephrologist', urgency: 'ROUTINE FOLLOW-UP', reason: 'Creatinine is borderline (1.5 mg/dL)' },
          { specialist: 'Endocrinologist', urgency: 'SEE TODAY', reason: 'FastingGlucose is critical (250 mg/dL)' }
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
  async checkExistingDoctor(
    input: z.infer<typeof CheckExistingDoctorInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof CheckExistingDoctorOutputSchema>> {
    ctx.logger.info(
      `Checking ${input.routing.length} specialist recommendation(s) against ${input.existingDoctors.length} existing doctor(s)`
    );

    const decisions = resolveBookings(input.routing, input.existingDoctors);

    const continuing = decisions.filter(d => d.action === 'CONTINUE_WITH_DOCTOR').length;
    ctx.logger.info(`${continuing} continuing with existing doctor, ${decisions.length - continuing} need a new booking`);

    return { decisions };
  }
}
