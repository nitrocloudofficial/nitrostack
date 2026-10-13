/**
 * Zod schemas for meeting-related tools
 */

import { z } from 'zod';

// Input schemas
export const SummarizeMeetingInputSchema = z.object({
  transcript: z.string().min(10, 'Transcript must be at least 10 characters')
});

export const ExtractActionItemsInputSchema = z.object({
  transcript: z.string().min(10, 'Transcript must be at least 10 characters')
});

// Output schemas
export const MeetingSummarySchema = z.object({
  title: z.string(),
  attendees: z.array(z.string()),
  duration: z.string(),
  keyPoints: z.array(z.string()),
  decisions: z.array(z.string()),
  nextSteps: z.array(z.string())
});

export const ActionItemSchema = z.object({
  task: z.string(),
  owner: z.string(),
  deadline: z.string().datetime(),
  priority: z.enum(['low', 'medium', 'high', 'critical'])
});

export const ActionItemsListSchema = z.object({
  items: z.array(ActionItemSchema),
  meetingTitle: z.string()
});

// Type exports
export type SummarizeMeetingInput = z.infer<typeof SummarizeMeetingInputSchema>;
export type ExtractActionItemsInput = z.infer<typeof ExtractActionItemsInputSchema>;
export type MeetingSummary = z.infer<typeof MeetingSummarySchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
export type ActionItemsList = z.infer<typeof ActionItemsListSchema>;
