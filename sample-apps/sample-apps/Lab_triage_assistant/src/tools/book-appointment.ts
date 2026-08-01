/**
 * Book Appointment Tool
 *
 * Confirms a booking for a specific doctor + slot (from get_available_slots),
 * along with basic patient intake details (name, age, gender, phone).
 * Mock/in-memory — resets on server restart, no external database.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { bookAppointment } from '../appointments.js';

const BookAppointmentInputSchema = z.object({
  doctorId: z.string().describe('Doctor id from get_available_slots'),
  slot: z.string().describe('ISO datetime of the chosen slot, from get_available_slots'),
  patientId: z.string().default('').describe('Optional patient identifier for record-keeping'),
  reason: z.string().default('').describe('Brief reason for the visit, e.g. "Creatinine borderline follow-up"'),
  patientName: z.string().describe('Patient full name'),
  patientAge: z.number().optional().describe('Patient age in years'),
  patientGender: z.enum(['male', 'female', 'other']).optional().describe('Patient gender'),
  patientPhone: z.string().optional().describe('Patient contact phone number')
});

const BookAppointmentOutputSchema = z.object({
  confirmationId: z.string(),
  doctorId: z.string(),
  doctorName: z.string(),
  specialist: z.string(),
  slot: z.string(),
  reason: z.string(),
  patientName: z.string(),
  confirmationText: z.string()
});

export class BookAppointmentTools {
  @Tool({
    name: 'book_appointment',
    description: 'Book a confirmed appointment slot with a doctor, with basic patient intake details. Takes a doctorId and slot from get_available_slots. Fails clearly if the slot was just taken by someone else, or if patientName is missing.',
    inputSchema: BookAppointmentInputSchema,
    outputSchema: BookAppointmentOutputSchema,
    examples: {
      request: {
        doctorId: 'doc_neph_1',
        slot: '2026-08-03T10:00:00.000Z',
        patientId: 'pat_ayesha_123',
        reason: 'Creatinine borderline follow-up',
        patientName: 'Ayesha Khan',
        patientAge: 34,
        patientGender: 'female',
        patientPhone: '+91 98765 43210'
      },
      response: {
        confirmationId: 'appt_ab12cd34',
        doctorId: 'doc_neph_1',
        doctorName: 'Dr. Patel',
        specialist: 'Nephrologist',
        slot: '2026-08-03T10:00:00.000Z',
        reason: 'Creatinine borderline follow-up',
        patientName: 'Ayesha Khan',
        confirmationText: 'Appointment confirmed for Ayesha Khan with Dr. Patel (Nephrologist) on Monday, August 3, 2026 at 10:00 AM.'
      }
    }
  })
  async bookAppointmentSlot(
    input: z.infer<typeof BookAppointmentInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof BookAppointmentOutputSchema>> {
    const patientId = input.patientId ?? '';
    const reason = input.reason ?? '';

    ctx.logger.info(`Booking appointment: doctorId=${input.doctorId} slot=${input.slot} patientName=${input.patientName}`);
    const record = bookAppointment(input.doctorId, input.slot, patientId, reason, {
      name: input.patientName,
      age: input.patientAge,
      gender: input.patientGender,
      phone: input.patientPhone
    });

    const confirmationText = `Appointment confirmed for ${record.patient.name} with ${record.doctorName} (${record.specialist}) on ${new Date(
      record.slot
    ).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}.`;

    return {
      confirmationId: record.confirmationId,
      doctorId: record.doctorId,
      doctorName: record.doctorName,
      specialist: record.specialist,
      slot: record.slot,
      reason: record.reason,
      patientName: record.patient.name,
      confirmationText
    };
  }
}
