/**
 * Get Available Slots Tool
 *
 * Lists open mock appointment slots for a specialist, across every doctor
 * of that specialty in the mock registry. Feed a chosen slot into
 * book_appointment to confirm it.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { getAvailableSlots } from '../appointments.js';

const GetAvailableSlotsInputSchema = z.object({
  specialist: z.string().describe('Specialist type to find appointment slots for, e.g. Nephrologist, Endocrinologist')
});

const GetAvailableSlotsOutputSchema = z.object({
  slots: z.array(
    z.object({
      doctorId: z.string(),
      doctorName: z.string(),
      specialist: z.string(),
      slot: z.string().describe('ISO datetime of the open slot')
    })
  )
});

export class GetAvailableSlotsTools {
  @Tool({
    name: 'get_available_slots',
    description: 'List available (mock) appointment slots for a specialist. Feed a chosen slot into book_appointment to confirm it.',
    inputSchema: GetAvailableSlotsInputSchema,
    outputSchema: GetAvailableSlotsOutputSchema,
    examples: {
      request: { specialist: 'Nephrologist' },
      response: {
        slots: [
          { doctorId: 'doc_neph_1', doctorName: 'Dr. Patel', specialist: 'Nephrologist', slot: '2026-08-03T10:00:00.000Z' },
          { doctorId: 'doc_neph_1', doctorName: 'Dr. Patel', specialist: 'Nephrologist', slot: '2026-08-03T15:00:00.000Z' }
        ]
      }
    }
  })
  async getAvailableSlotsForSpecialist(
    input: z.infer<typeof GetAvailableSlotsInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof GetAvailableSlotsOutputSchema>> {
    const specialist = input.specialist ?? '';
    const slots = getAvailableSlots(specialist);
    ctx.logger.info(`Found ${slots.length} available slot(s) for ${specialist}`);
    return { slots };
  }
}
