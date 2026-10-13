import { z } from 'zod';
import { UuidSchema } from './common.js';

export const DepartmentSchema = z.object({
  department_id: UuidSchema,
  name: z.string().min(1),
  jurisdiction_scope: z.string().min(1),
  specializations: z.array(z.string()),
  current_caseload: z.number().int().nonnegative(),
  capacity: z.number().int().positive(),
  contact_channel: z.string().min(1),
});

export const PersonnelSchema = z.object({
  personnel_id: UuidSchema,
  name: z.string().min(1),
  role: z.string().min(1),
  department_id: UuidSchema,
  specializations: z.array(z.string()),
  current_case_count: z.number().int().nonnegative(),
  availability_status: z.string().min(1),
});

export type Department = z.infer<typeof DepartmentSchema>;
export type Personnel = z.infer<typeof PersonnelSchema>;
