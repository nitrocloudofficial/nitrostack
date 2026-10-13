import { z } from 'zod';

export const SpecialtySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  imageUrl: z.string(),
});

export type Specialty = z.infer<typeof SpecialtySchema>;
