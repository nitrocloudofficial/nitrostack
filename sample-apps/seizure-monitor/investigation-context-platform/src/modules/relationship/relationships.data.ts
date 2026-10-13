import { z } from "@nitrostack/core";

export const RelationshipType = z.enum([
  "connected_to",
  "logged_into",
  "accessed",
  "downloaded",
  "uploaded",
  "created",
  "owns",
  "uses",
  "communicated_with",
  "resolved_to",
  "related_to",
]);

export const RelationshipSchema = z.object({

  id: z.string().uuid(),

  investigationId: z.string().uuid(),

  sourceEntityId: z.string().uuid(),

  targetEntityId: z.string().uuid(),

  relationship: RelationshipType,

  confidence: z.number().min(0).max(100).default(100),

  description: z.string().optional(),

  createdAt: z.string(),

  updatedAt: z.string(),
});

export type Relationship = z.infer<typeof RelationshipSchema>;