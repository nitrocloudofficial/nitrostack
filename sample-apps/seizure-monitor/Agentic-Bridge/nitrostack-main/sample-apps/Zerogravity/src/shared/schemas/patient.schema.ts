import { z } from 'zod';

export const PatientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  dateOfBirth: z.string(),
  medicalHistory: z.array(z.string()).optional(),
});

export type Patient = z.infer<typeof PatientSchema>;
