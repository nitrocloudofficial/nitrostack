import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { findMeetingSlot, bookMeeting } from '../../scheduling.js';
import { AuditService } from '../../services/audit.service.js';

function parseAttendees(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
      } catch (_) {}
    }
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * MCP tool wrappers for the scheduling functions.
 *
 * Input schemas support both native types and UI form text coercions.
 */
export class SchedulingTools {
  @Tool({
    name: 'find_meeting_slot',
    description:
      'Find available meeting slots across multiple attendees\' calendars. ' +
      'Returns up to 3 conflict-free proposed time slots, any scheduling ' +
      'conflicts encountered, and reasoning about the search.',
    inputSchema: z.object({
      attendees: z.preprocess(
        (val) => parseAttendees(val),
        z.array(z.string()).min(1).describe('List of attendee names or emails')
      ),
      durationMinutes: z.coerce
        .number()
        .positive()
        .describe('Required meeting duration in minutes'),
      urgency: z
        .enum(['low', 'medium', 'high'])
        .describe(
          'Search urgency — high: 1-day window, medium: 3-day, low: 7-day'
        ),
      preferredDate: z.string().optional().describe('Optional ISO date (e.g. "2026-07-30") to begin search from'),
    }),
    examples: {
      request: {
        attendees: ['alice', 'bob', 'charlie'],
        durationMinutes: 60,
        urgency: 'high',
      },
      response: {
        proposedSlots: [
          '2025-01-15T10:30:00.000Z',
          '2025-01-15T12:00:00.000Z',
          '2025-01-15T15:00:00.000Z',
        ],
        conflicts: [
          'alice: 2025-01-15T09:00:00Z – 2025-01-15T10:00:00Z',
          'charlie: 2025-01-15T09:30:00Z – 2025-01-15T10:30:00Z',
        ],
        reasoning:
          'Searched a 1-day window (urgency: high) across 3 attendee(s)\' ' +
          'working hours (9:00–18:00 UTC) and found 3 conflict-free slot(s).',
      },
    },
  })
  async findSlot(input: any, ctx: ExecutionContext) {
    const startTime = Date.now();
    const attendees = parseAttendees(input.attendees);
    const durationMinutes = Number(input.durationMinutes) || 30;
    const urgency = (input.urgency as 'low' | 'medium' | 'high') || 'high';
    const preferredDate = input.preferredDate;

    ctx.logger.info('Finding meeting slot', {
      attendees,
      durationMinutes,
      urgency,
      preferredDate,
    });

    try {
      const result = await findMeetingSlot({
        attendees,
        durationMinutes,
        urgency,
        preferredDate,
      });

      ctx.logger.info('Slot search complete', {
        slotsFound: result.proposedSlots.length,
        conflictsFound: result.conflicts.length,
      });

      AuditService.log({
        type: 'tool_result',
        tool: 'find_meeting_slot',
        input,
        output: result,
        latencyMs: Date.now() - startTime,
      });

      return result;
    } catch (err: any) {
      AuditService.log({
        type: 'tool_result',
        tool: 'find_meeting_slot',
        input,
        output: { error: err.message },
        latencyMs: Date.now() - startTime,
      });
      throw err;
    }
  }

  @Tool({
    name: 'book_meeting',
    description:
      'Book a previously proposed meeting slot for the given attendees. ' +
      'Validates the slot is a valid ISO date and attendees are non-empty, ' +
      'then confirms the booking with a unique meeting ID.',
    inputSchema: z.object({
      slot: z
        .string()
        .describe('ISO 8601 timestamp of the slot to book'),
      attendees: z.preprocess(
        (val) => parseAttendees(val),
        z.array(z.string()).min(1).describe('List of attendee names for the meeting')
      ),
    }),
    examples: {
      request: {
        slot: '2025-01-15T10:30:00.000Z',
        attendees: ['alice', 'bob'],
      },
      response: {
        confirmed: true,
        meetingId: 'meeting-1705312200000',
      },
    },
  })
  async book(input: any, ctx: ExecutionContext) {
    const startTime = Date.now();
    const attendees = parseAttendees(input.attendees);
    const slot = String(input.slot || '').trim();

    ctx.logger.info('Booking meeting', {
      slot,
      attendees,
    });

    try {
      const result = await bookMeeting({
        slot,
        attendees,
      });

      ctx.logger.info('Booking result', {
        confirmed: result.confirmed,
        meetingId: result.meetingId,
      });

      AuditService.log({
        type: 'tool_result',
        tool: 'book_meeting',
        input,
        output: result,
        latencyMs: Date.now() - startTime,
      });

      return result;
    } catch (err: any) {
      AuditService.log({
        type: 'tool_result',
        tool: 'book_meeting',
        input,
        output: { error: err.message },
        latencyMs: Date.now() - startTime,
      });
      throw err;
    }
  }
}
