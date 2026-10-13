import { z } from "@nitrostack/core";

/*
|--------------------------------------------------------------------------
| Evidence Enums
|--------------------------------------------------------------------------
*/

export const EvidenceType = z.enum([
  "log",
  "image",
  "document",
  "email",
  "pcap",
  "memory",
  "disk",
  "url",
  "ip",
  "domain",
  "hash",
  "malware",
  "other",
]);

export const EvidenceStatus = z.enum([
  "collected",
  "verified",
  "analyzing",
  "completed",
  "archived",
]);

/*
|--------------------------------------------------------------------------
| Evidence Schema
|--------------------------------------------------------------------------
*/

export const EvidenceSchema = z.object({
  id: z.string().uuid(),

  investigationId: z.string().uuid(),

  title: z.string().min(3).max(150),

  description: z.string(),

  type: EvidenceType,

  status: EvidenceStatus.default("collected"),

  source: z.string(),

  collectedBy: z.string(),

  collectedAt: z.string(),

  createdAt: z.string(),

  updatedAt: z.string(),

  tags: z.array(z.string()).default([]),

  hash: z.string().optional(),

  fileName: z.string().optional(),

  mimeType: z.string().optional(),

  fileSize: z.number().optional(),
});

export type Evidence = z.infer<typeof EvidenceSchema>;