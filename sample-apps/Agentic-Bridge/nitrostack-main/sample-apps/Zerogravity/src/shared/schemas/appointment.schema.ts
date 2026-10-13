import { z } from 'zod';

export const AppointmentSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  hospitalId: z.string(),
  specialtyId: z.string(),
  dateTime: z.string(),
  status: z.enum(['scheduled', 'completed', 'cancelled']),
  notes: z.string().optional(),
});

export type Appointment = z.infer<typeof AppointmentSchema>;
