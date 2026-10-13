import { z } from "@nitrostack/core";

export const NoteType = z.enum([
  "observation",
  "analysis",
  "hypothesis",
  "finding",
  "recommendation",
]);

export const NoteSchema = z.object({
  id: z.string().uuid(),

  investigationId: z.string().uuid(),

  title: z.string().min(3).max(150),

  content: z.string(),

  type: NoteType,

  author: z.string(),

  evidenceIds: z.array(z.string()).default([]),

  entityIds: z.array(z.string()).default([]),

  tags: z.array(z.string()).default([]),

  createdAt: z.string(),

  updatedAt: z.string(),
});

export type Note = z.infer<typeof NoteSchema>;