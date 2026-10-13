import { ToolDecorator as Tool, ControllerDecorator as Controller, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { ReservationService } from '../services/reservation.service.js';

const emergencyReservationSchema = z.object({
  hospital_id: z.string().min(1).describe('Hospital identifier, e.g. "HOSP-001"'),
  patient_name: z.string().min(1).describe('Full name of the patient'),
  bed_type: z.enum(['ER', 'ICU']).optional().describe('Bed type to reserve (defaults to ER)'),
  patient_age: z.number().int().positive().optional(),
  notes: z.string().optional().describe('Any additional dispatch notes for the receiving hospital'),
});
type EmergencyReservationToolInput = z.infer<typeof emergencyReservationSchema>;

// See HospitalTools for why @Injectable({ deps }) must be stacked on @Controller.
@Controller()
@Injectable({ deps: [ReservationService] })
export class ReservationTools {
  constructor(private readonly reservationService: ReservationService) {}

  @Tool({
    name: 'request_emergency_reservation',
    description:
      'Reserve an ER or ICU bed at a hospital ahead of patient arrival. Decrements live bed availability and returns a confirmation code.',
    inputSchema: emergencyReservationSchema,
  })
  async requestEmergencyReservation(input: EmergencyReservationToolInput, ctx: ExecutionContext) {
    ctx.logger.info('Requesting emergency reservation', {
      hospitalId: input.hospital_id,
      bedType: input.bed_type ?? 'ER',
    });
    return this.reservationService.reserve(input);
  }
}
