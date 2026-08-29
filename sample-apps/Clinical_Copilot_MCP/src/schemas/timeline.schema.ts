import { z } from '@nitrostack/core';

/**
 * Clinical Copilot MCP Server - Timeline Schema
 *
 * Defines Zod schema and TypeScript interfaces for patient event timelines in the MongoDB 'timelines' collection.
 */

export const TimelineEventSchema = z.object({
  eventId: z.string().describe('Unique identifier for timeline event'),
  date: z.string().describe('Extracted report date in YYYY-MM-DD format (NEVER uploadedAt)'),
  title: z.string().describe('Headline title of clinical event'),
  description: z.string().describe('Detailed clinical description'),
  reportId: z.string().describe('Associated report ID reference'),
  reportType: z.string().describe('Category of medical document or event'),
  doctor: z.string().optional().describe('Attending doctor name'),
  hospital: z.string().optional().describe('Hospital or medical facility name'),
});

export const TimelineSchema = z.object({
  patientId: z.string().describe('Target patient ID'),
  generatedAt: z.string().describe('ISO timestamp when timeline was generated'),
  events: z.array(TimelineEventSchema).default([]).describe('Chronologically sorted clinical timeline events'),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type TimelineDocument = z.infer<typeof TimelineSchema>;
