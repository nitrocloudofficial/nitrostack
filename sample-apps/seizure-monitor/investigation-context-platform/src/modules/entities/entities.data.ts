import { z } from "@nitrostack/core";

export const EntityType = z.enum([
  "person",
  "device",
  "ip",
  "domain",
  "email",
  "organization",
  "url",
  "file",
  "hash",
  "process",
  "registry",
  "other",
]);

export const EntitySchema = z.object({
  id: z.string().uuid(),

  investigationId: z.string().uuid(),

  name: z.string().min(1).max(255),

  type: EntityType,

  value: z.string(),

  description: z.string().optional(),

  confidence: z.number().min(0).max(100).default(100),

  discoveredFrom: z.string().optional(),

  createdAt: z.string(),

  updatedAt: z.string(),

  tags: z.array(z.string()).default([]),
});

export type Entity = z.infer<typeof EntitySchema>;