import {
  ToolDecorator as Tool,
  Widget,
  Injectable,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { AppointmentsService, BookingError } from './appointments.service.js';

const bookAppointmentInput = z.object({
  doctorId: z
    .string()
    .min(1)
    .describe('Doctor id from search-doctors, e.g. "doc_1".'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be ISO format YYYY-MM-DD')
    .describe('Appointment date, ISO format YYYY-MM-DD, e.g. "2026-07-28".'),
  startTime: z
    .string()
    .optional()
    .describe(
      'Slot start time. Accepts 24h "17:00" or 12h "5:00 PM". Required unless slotId is supplied.',
    ),
  slotId: z
    .string()
    .optional()
    .describe('Exact slotId from compare-slots. Takes precedence over startTime.'),
  patientName: z.string().optional().describe('Full name of the patient (optional).'),
  patientPhone: z.string().optional().describe('Patient contact phone number (optional).'),
  patientAge: z.number().int().min(0).max(120).optional().describe('Patient age in years.'),
  reason: z.string().optional().describe('Reason for the visit or presenting complaint.'),
});

const getAppointmentInput = z.object({
  bookingId: z
    .string()
    .min(1)
    .describe('Booking id returned by book-appointment, e.g. "booking_1a2b3c4d".'),
});

const cancelAppointmentInput = z.object({
  bookingId: z.string().min(1).describe('The bookingId to cancel.'),
  reason: z.string().min(1).describe('Reason for cancellation.'),
});

const rescheduleAppointmentInput = z.object({
  bookingId: z.string().min(1).describe('The bookingId to reschedule.'),
  newSlotId: z.string().min(1).describe('The new slotId to swap to.'),
  confirmModeChange: z.boolean().default(false).describe('Set to true ONLY if you explicitly asked the user to confirm a mode change (e.g. In-person to Video) and they agreed.'),
});

@Injectable({ deps: [AppointmentsService] })
export class AppointmentsTools {
  constructor(private readonly appointments: AppointmentsService) {}

  @Tool({
    name: 'book-appointment',
    title: 'Book appointment',
    description:
      'Book a consultation slot for a patient. Supply the doctorId, date, and slot time/id. Patient name and phone should be collected if possible, but are optional.',
    inputSchema: bookAppointmentInput,
    invocation: {
      invoking: 'Reserving the slot…',
      invoked: 'Appointment booked',
    },
    metadata: { category: 'appointments', tags: ['booking', 'slot', 'confirm'] },
  })
  async bookAppointment(
    input: z.infer<typeof bookAppointmentInput>,
    ctx: ExecutionContext,
  ) {
    try {
      const booking = await this.appointments.bookAppointment({
        ...input,
        patientName: input.patientName || '', // Handle missing
        patientPhone: input.patientPhone || '',
      });

      return {
        booked: true,
        bookingId: booking.bookingId,
        status: booking.status,
        slotLabel: booking.slot.label,
        summary: `Appointment confirmed with ${booking.doctor.name} at ${booking.hospital} on ${booking.slot.label}. Booking id ${booking.bookingId}.`,
        nextStep: `Call get-appointment with bookingId "${booking.bookingId}" to display the confirmation card.`,
      };
    } catch (error: any) {
      return { booked: false, error: true, message: error.message };
    }
  }

  @Tool({
    name: 'cancel-appointment',
    title: 'Cancel appointment',
    description: 'Cancel an existing appointment and release the slot back into inventory.',
    inputSchema: cancelAppointmentInput,
    invocation: { invoking: 'Cancelling appointment…', invoked: 'Appointment cancelled' },
  })
  async cancelAppointment(input: z.infer<typeof cancelAppointmentInput>, ctx: ExecutionContext) {
    try {
      const booking = await this.appointments.cancelAppointment(input.bookingId, input.reason);
      return {
        cancelled: true,
        bookingId: booking.bookingId,
        status: booking.status,
        summary: `Booking ${booking.bookingId} has been successfully cancelled. The slot has been released.`,
        nextStep: `Call get-appointment to show the updated cancelled status widget.`,
      };
    } catch (error: any) {
      return { cancelled: false, error: true, message: error.message };
    }
  }

  @Tool({
    name: 'reschedule-appointment',
    title: 'Reschedule appointment',
    description: 'Reschedule an appointment by swapping it to a new slot while preserving the bookingId.',
    inputSchema: rescheduleAppointmentInput,
    invocation: { invoking: 'Rescheduling appointment…', invoked: 'Appointment rescheduled' },
  })
  async rescheduleAppointment(input: z.infer<typeof rescheduleAppointmentInput>, ctx: ExecutionContext) {
    try {
      const booking = await this.appointments.rescheduleAppointment(input.bookingId, input.newSlotId, input.confirmModeChange);
      return {
        rescheduled: true,
        bookingId: booking.bookingId,
        status: booking.status,
        slotLabel: booking.slot.label,
        mode: booking.slot.mode,
        summary: `Booking ${booking.bookingId} successfully rescheduled to ${booking.slot.label}.`,
        nextStep: `Call get-appointment to show the updated widget.`,
      };
    } catch (error: any) {
      if (error.message.includes('MODE_CHANGE_REQUIRED')) {
        return {
          rescheduled: false,
          requiresConfirmation: true,
          error: true,
          message: error.message,
          summary: error.message, // Instruct the LLM to ask the user
        };
      }
      return { rescheduled: false, error: true, message: error.message };
    }
  }

  @Tool({
    name: 'get-appointment',
    title: 'Get appointment',
    description: 'Retrieve a booked appointment by bookingId and render the confirmation card.',
    inputSchema: getAppointmentInput,
    invocation: { invoking: 'Fetching your confirmation…', invoked: 'Confirmation ready' },
  })
  @Widget({
    route: 'booking',
    prefersBorder: true,
    csp: { resourceDomains: ['https://images.unsplash.com'] },
  })
  async getAppointment(
    input: z.infer<typeof getAppointmentInput>,
    ctx: ExecutionContext,
  ) {
    try {
      const booking = await this.appointments.getAppointment(input.bookingId);
      if (!booking) {
        return { error: true, message: `No appointment found with bookingId "${input.bookingId}".` };
      }
      return {
        found: true,
        ...booking,
        summary: `Booking ${booking.bookingId} is ${booking.status}. Mode: ${booking.slot.mode}. ${booking.doctor.name} at ${booking.hospital} on ${booking.slot.label}.`,
      };
    } catch (error: any) {
      return { error: true, message: `Get appointment failed: ${error.message}` };
    }
  }
}
