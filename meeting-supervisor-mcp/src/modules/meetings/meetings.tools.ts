import { Tool, Widget, UseGuards, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { MeetingsService } from './meetings.service.js';
import { JWTGuard } from '../../guards/jwt.guard.js';

export class MeetingsTools {
  constructor(private meetingsService: MeetingsService) {}

  @Tool({
    name: 'list_meetings',
    description: 'List meetings, optionally filtered by status',
    inputSchema: z.object({
      status: z
        .enum(['scheduled', 'in_progress', 'completed', 'missed', 'rescheduled'])
        .optional()
        .describe('Filter by meeting status')
    }),
    examples: {
      request: { status: 'scheduled' },
      response: { meetings: [{ id: 'uuid', title: 'Sprint Planning', status: 'scheduled' }] }
    }
  })
  @Widget('meeting-dashboard')
  async listMeetings(input: { status?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Listing meetings', { status: input.status });
    const meetings = await this.meetingsService.list(input.status);
    return { meetings };
  }

  @Tool({
    name: 'get_meeting',
    description: 'Get full details for one meeting, including transcript and keynotes',
    inputSchema: z.object({ meeting_id: z.string().describe('Meeting UUID') })
  })
  async getMeeting(input: { meeting_id: string }) {
    return this.meetingsService.getById(input.meeting_id);
  }

  @Tool({
    name: 'create_meeting',
    description: 'Schedule a new meeting',
    inputSchema: z.object({
      title: z.string(),
      scheduled_start: z.string().describe('ISO 8601 datetime'),
      scheduled_end: z.string().describe('ISO 8601 datetime'),
      organizer_id: z.string().optional(),
      participant_ids: z.array(z.string()).default([])
    })
  })
  @UseGuards(JWTGuard)
  async createMeeting(
    input: {
      title: string;
      scheduled_start: string;
      scheduled_end: string;
      organizer_id?: string;
      participant_ids?: string[];
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Creating meeting', { title: input.title, by: ctx.auth?.subject });
    return this.meetingsService.create(input);
  }

  @Tool({
    name: 'complete_meeting',
    description:
      'Mark a meeting completed. Optionally attach a transcript, which queues it for keynote extraction (see analyze_meeting in the agents module).',
    inputSchema: z.object({
      meeting_id: z.string(),
      transcript: z.string().optional()
    })
  })
  @UseGuards(JWTGuard)
  async completeMeeting(input: { meeting_id: string; transcript?: string }) {
    return this.meetingsService.complete(input.meeting_id, input.transcript);
  }

  @Tool({
    name: 'mark_meeting_missed',
    description: 'Mark a meeting as missed, making it eligible for the rescheduling logic',
    inputSchema: z.object({ meeting_id: z.string() })
  })
  @UseGuards(JWTGuard)
  async markMissed(input: { meeting_id: string }) {
    return this.meetingsService.markMissed(input.meeting_id);
  }
}
