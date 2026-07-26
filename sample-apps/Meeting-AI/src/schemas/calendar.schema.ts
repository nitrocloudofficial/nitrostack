/**
 * Zod schemas for calendar-related tools
 */

import { z } from 'zod';

// Input schemas
export const ScheduleFollowUpInputSchema = z.object({
  meetingTitle: z.string().min(3, 'Meeting title must be at least 3 characters'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
});

// Output schemas
export const CalendarEventObjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  time: z.string(),
  attendees: z.array(z.string()),
  description: z.string().optional(),
  createdAt: z.string().datetime()
});

export const DashboardDataSchema = z.object({
  recentMeetings: z.array(z.object({
    id: z.string(),
    title: z.string(),
    date: z.string().datetime(),
    attendees: z.array(z.string())
  })),
  pendingTasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    owner: z.string(),
    deadline: z.string().datetime(),
    priority: z.enum(['low', 'medium', 'high', 'critical'])
  })),
  completedTasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    owner: z.string(),
    completedAt: z.string().datetime().optional()
  })),
  upcomingDeadlines: z.array(z.object({
    id: z.string(),
    title: z.string(),
    owner: z.string(),
    deadline: z.string().datetime(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    daysUntilDue: z.number()
  })),
  stats: z.object({
    totalMeetings: z.number(),
    totalPendingTasks: z.number(),
    totalCompletedTasks: z.number(),
    upcomingDeadlineCount: z.number()
  })
});

// Type exports
export type ScheduleFollowUpInput = z.infer<typeof ScheduleFollowUpInputSchema>;
export type CalendarEventObject = z.infer<typeof CalendarEventObjectSchema>;
export type DashboardData = z.infer<typeof DashboardDataSchema>;
