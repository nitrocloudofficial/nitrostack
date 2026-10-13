import { z } from "@nitrostack/core";

export const TaskStatus = z.enum([
  "todo",
  "in_progress",
  "completed",
  "blocked",
]);

export const TaskPriority = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export const TaskSchema = z.object({
  id: z.string().uuid(),

  investigationId: z.string().uuid(),

  title: z.string().min(3).max(150),

  description: z.string(),

  assignedTo: z.string(),

  status: TaskStatus.default("todo"),

  priority: TaskPriority.default("medium"),

  dueDate: z.string().optional(),

  evidenceIds: z.array(z.string()).default([]),

  entityIds: z.array(z.string()).default([]),

  createdAt: z.string(),

  updatedAt: z.string(),
});

export type Task = z.infer<typeof TaskSchema>;