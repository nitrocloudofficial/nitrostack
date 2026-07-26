/**
 * Zod schemas for task-related tools
 */

import { z } from 'zod';

// Input schemas
export const CreateTaskInputSchema = z.object({
  task: z.string().min(3, 'Task title must be at least 3 characters'),
  owner: z.string().min(2, 'Owner name must be at least 2 characters'),
  deadline: z.string().datetime('Invalid deadline format'),
  priority: z.enum(['low', 'medium', 'high', 'critical'])
});

// Output schemas
export const TaskObjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  owner: z.string(),
  deadline: z.string().datetime(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['pending', 'in_progress', 'completed']),
  createdAt: z.string().datetime()
});

export const SendReminderInputSchema = z.object({
  taskId: z.string()
});

export const ReminderConfirmationSchema = z.object({
  success: z.boolean(),
  taskId: z.string(),
  taskTitle: z.string(),
  owner: z.string(),
  deadline: z.string().datetime(),
  message: z.string()
});

// Type exports
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;
export type TaskObject = z.infer<typeof TaskObjectSchema>;
export type SendReminderInput = z.infer<typeof SendReminderInputSchema>;
export type ReminderConfirmation = z.infer<typeof ReminderConfirmationSchema>;
