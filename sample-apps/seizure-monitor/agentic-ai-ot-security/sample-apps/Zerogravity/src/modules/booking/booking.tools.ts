import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { DataService } from '../../shared/services/data.service.js';

// Helper function to generate next weekday 10:00 AM slot
function generateNextWeekdaySlot(): string {
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setDate(nextDay.getDate() + 1);

  // Skip weekends (0 = Sunday, 6 = Saturday)
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }

  // Set time to 10:00 AM
  nextDay.setHours(10, 0, 0, 0);

  return nextDay.toISOString();
}

@Injectable({ deps: [DataService] })
export class ConfirmBookingChoiceTool {
  constructor(private dataService: DataService) {}

  @Tool({
    name: 'confirm-booking-choice',
    description: 'Confirm or reject a doctor/hospital booking choice. If confirmed, creates a booking with a next-weekday 10:00 AM appointment slot.',
    inputSchema: z.object({
      recordId: z.string().describe('The intake record ID'),
      doctorId: z.string().describe('The selected doctor ID'),
      hospitalId: z.string().describe('The selected hospital ID'),
      confirmed: z.boolean().describe('Whether the user confirmed the booking choice')
    }),
    examples: {
      request: {
        recordId: 'intake-001',
        doctorId: 'doc-001',
        hospitalId: 'hosp-001',
        confirmed: true
      },
      response: {
        booked: true,
        bookingId: 'booking-1234567890',
        appointmentSlot: '2026-07-21T10:00:00.000Z'
      }
    }
  })
  async confirmBookingChoice(
    input: {
      recordId: string;
      doctorId: string;
      hospitalId: string;
      confirmed: boolean;
    },
    ctx: ExecutionContext
  ) {
    if (!input.confirmed) {
      return {
        booked: false,
        message: 'No booking made. You can choose a different option.'
      };
    }

    try {
      const appointmentSlot = generateNextWeekdaySlot();
      const bookingId = this.dataService.storeBooking({
        recordId: input.recordId,
        doctorId: input.doctorId,
        hospitalId: input.hospitalId,
        appointmentSlot
      });

      return {
        booked: true,
        bookingId,
        appointmentSlot
      };
    } catch (error) {
      ctx.logger.error('Error confirming booking', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to confirm booking');
    }
  }
}

@Injectable({ deps: [DataService] })
export class GenerateVisitSummaryTool {
  constructor(private dataService: DataService) {}

  @Tool({
    name: 'generate-visit-summary',
    description: 'Generate a comprehensive visit summary combining intake, triage, and booking information.',
    inputSchema: z.object({
      recordId: z.string().describe('The intake record ID'),
      bookingId: z.string().describe('The booking ID')
    }),
    examples: {
      request: {
        recordId: 'intake-001',
        bookingId: 'booking-1234567890'
      },
      response: {
        name: 'John Doe',
        age: 35,
        weight: 75,
        symptoms: ['fever', 'cough'],
        predictedCondition: 'Acute Respiratory Distress / Asthma / Pneumonia',
        urgencyLevel: 'moderate',
        doctorName: 'Dr. Jane Smith',
        hospitalName: 'City Medical Center',
        appointmentSlot: '2026-07-21T10:00:00.000Z'
      }
    }
  })
  async generateVisitSummary(
    input: {
      recordId: string;
      bookingId: string;
    },
    ctx: ExecutionContext
  ) {
    try {
      // Fetch intake record
      const intakeRecord = this.dataService.getIntakeRecord(input.recordId);
      if (!intakeRecord) {
        throw new Error(`Intake record not found: ${input.recordId}`);
      }

      // Fetch booking
      const booking = this.dataService.getBooking(input.bookingId);
      if (!booking) {
        throw new Error(`Booking not found: ${input.bookingId}`);
      }

      // Fetch triage result
      const triageResult = this.dataService.getTriageResult(input.recordId);

      // Look up doctor name
      const allDoctors = this.dataService.getDoctors();
      const doctor = allDoctors.find((d) => d.id === booking.doctorId);
      const doctorName = doctor ? doctor.name : 'Unknown Doctor';

      // Look up hospital name
      const hospital = this.dataService.getHospitalById(booking.hospitalId);
      const hospitalName = hospital ? hospital.name : 'Unknown Hospital';

      return {
        name: intakeRecord.name,
        age: intakeRecord.age,
        weight: intakeRecord.weight,
        symptoms: intakeRecord.symptoms,
        predictedCondition: triageResult?.predictedCondition || 'Pending triage analysis',
        urgencyLevel: triageResult?.urgencyLevel || intakeRecord.urgency,
        doctorName,
        hospitalName,
        appointmentSlot: booking.appointmentSlot
      };
    } catch (error) {
      ctx.logger.error('Error generating visit summary', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to generate visit summary');
    }
  }
}
