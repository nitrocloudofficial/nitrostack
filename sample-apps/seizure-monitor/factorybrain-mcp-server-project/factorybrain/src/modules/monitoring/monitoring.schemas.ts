import { z } from '@nitrostack/core';
export const trackingInputSchema = z.object({
  workflowId: z.string().min(1), ticketId: z.string().min(1), machineId: z.string().min(1), notifiedAt: z.string().datetime(),
  approval: z.object({ approvalId: z.string().min(1), status: z.literal('Approved') }).passthrough(),
  notifications: z.array(z.object({ notificationId: z.string(), status: z.enum(['Sent', 'Failed']) }).passthrough()).min(1),
}).passthrough();
export const externalStatusSchema = z.object({
  eventId: z.string().min(1), workflowId: z.string().min(1), source: z.enum(['procurement', 'maintenance', 'machine']),
  status: z.string().min(1), occurredAt: z.string().datetime(), details: z.record(z.unknown()).optional(),
});
