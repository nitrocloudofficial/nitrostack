import { ToolDecorator as Tool, z, ExecutionContext, Injectable, Widget } from '@nitrostack/core';

/**
 * Meeting Scheduler Tools
 * 
 * Tools for managing calendar events and scheduling meetings
 */
@Injectable()
export class MeetingSchedulerTools {
  @Tool({
    name: 'find_available_slots',
    description: 'Find available time slots for scheduling a meeting based on calendar availability',
    inputSchema: z.object({
      attendees: z.array(z.string()).describe('List of attendee email addresses'),
      duration: z.number().describe('Meeting duration in minutes'),
      dateRange: z.object({
        start: z.string().describe('Start date (YYYY-MM-DD)'),
        end: z.string().describe('End date (YYYY-MM-DD)'),
      }).describe('Date range to search for availability'),
    }),
  })
  async findAvailableSlots(
    input: {
      attendees: string[];
      duration: number;
      dateRange: { start: string; end: string };
    },
    context: ExecutionContext
  ) {
    context.logger.info('Finding available slots', {
      attendees: input.attendees.length,
      duration: input.duration,
    });

    // Simulate finding available slots
    const slots = this.generateAvailableSlots(input.duration, input.dateRange);

    return {
      attendees: input.attendees,
      duration: input.duration,
      availableSlots: slots,
      totalSlots: slots.length,
      recommendation: slots.length > 0 ? slots[0] : null,
    };
  }

  @Tool({
    name: 'schedule_meeting',
    description: 'Schedule a meeting with specified attendees at a given time',
    inputSchema: z.object({
      title: z.string().describe('Meeting title'),
      attendees: z.array(z.string()).describe('List of attendee email addresses'),
      startTime: z.string().describe('Meeting start time (ISO 8601 format)'),
      duration: z.number().describe('Meeting duration in minutes'),
      description: z.string().optional().describe('Meeting description'),
    }),
  })
  async scheduleMeeting(
    input: {
      title: string;
      attendees: string[];
      startTime: string;
      duration: number;
      description?: string;
    },
    context: ExecutionContext
  ) {
    context.logger.info('Scheduling meeting', { title: input.title, attendees: input.attendees.length });

    const meetingId = `mtg_${Date.now()}`;
    const endTime = new Date(new Date(input.startTime).getTime() + input.duration * 60000).toISOString();

    return {
      meetingId,
      title: input.title,
      attendees: input.attendees,
      startTime: input.startTime,
      endTime,
      duration: input.duration,
      description: input.description || '',
      status: 'scheduled',
      requiresApproval: input.attendees.length > 5,
      createdAt: new Date().toISOString(),
    };
  }

  @Tool({
    name: 'get_calendar_summary',
    description: 'Get a summary of upcoming meetings for a specific date or date range',
    inputSchema: z.object({
      email: z.string().describe('Calendar owner email address'),
      date: z.string().optional().describe('Specific date (YYYY-MM-DD) or leave empty for today'),
      days: z.number().optional().describe('Number of days to include in summary (default: 7)'),
    }),
  })
  @Widget({ route: 'meeting-review' })
  async getCalendarSummary(
    input: { email: string; date?: string; days?: number },
    context: ExecutionContext
  ) {
    context.logger.info('Getting calendar summary', { email: input.email });

    const daysToShow = input.days || 7;
    const meetings = this.generateMeetings(daysToShow);

    return {
      email: input.email,
      period: `${daysToShow} days`,
      totalMeetings: meetings.length,
      meetings,
      busyHours: this.calculateBusyHours(meetings),
      availableSlots: this.calculateAvailableSlots(meetings),
    };
  }

  @Tool({
    name: 'reschedule_meeting',
    description: 'Reschedule an existing meeting to a new time',
    inputSchema: z.object({
      meetingId: z.string().describe('ID of the meeting to reschedule'),
      newStartTime: z.string().describe('New start time (ISO 8601 format)'),
      reason: z.string().optional().describe('Reason for rescheduling'),
    }),
  })
  async rescheduleMeeting(
    input: { meetingId: string; newStartTime: string; reason?: string },
    context: ExecutionContext
  ) {
    context.logger.info('Rescheduling meeting', { meetingId: input.meetingId });

    return {
      meetingId: input.meetingId,
      newStartTime: input.newStartTime,
      reason: input.reason || 'No reason provided',
      status: 'rescheduled',
      requiresApproval: true,
      updatedAt: new Date().toISOString(),
    };
  }

  // Helper methods
  private generateAvailableSlots(
    duration: number,
    dateRange: { start: string; end: string }
  ): Array<{ start: string; end: string }> {
    const slots = [];
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      // Generate 3 slots per day: 9am, 2pm, 4pm
      const times = [9, 14, 16];
      for (const hour of times) {
        const slotStart = new Date(d);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);

        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        });
      }
    }

    return slots.slice(0, 10); // Return first 10 slots
  }

  private generateMeetings(days: number): Array<{
    id: string;
    title: string;
    startTime: string;
    duration: number;
    attendees: number;
  }> {
    const meetings = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(10, 0, 0, 0);

      meetings.push({
        id: `mtg_${i}`,
        title: `Meeting ${i + 1}`,
        startTime: date.toISOString(),
        duration: 60,
        attendees: Math.floor(Math.random() * 10) + 2,
      });
    }
    return meetings;
  }

  private calculateBusyHours(meetings: Array<{ startTime: string; duration: number }>): number {
    return meetings.reduce((total, m) => total + m.duration, 0) / 60;
  }

  private calculateAvailableSlots(meetings: Array<{ startTime: string; duration: number }>): number {
    const workHoursPerDay = 8;
    const busyDays = new Set(meetings.map((m) => new Date(m.startTime).toDateString()));
    return (7 - busyDays.size) * workHoursPerDay;
  }
}
