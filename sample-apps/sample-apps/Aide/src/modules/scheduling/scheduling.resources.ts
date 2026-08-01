import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Exposes the mock calendar data as an MCP resource at `calendar://availability`.
 */
export class SchedulingResources {
  @Resource({
    uri: 'calendar://availability',
    name: 'Calendar Availability',
    description:
      'Calendar availability data for all known attendees, including ' +
      'busy blocks and working hours.',
    mimeType: 'application/json',
    examples: {
      response: {
        alice: {
          busy: [
            { start: '2025-01-15T09:00:00Z', end: '2025-01-15T10:00:00Z' },
          ],
          workingHours: {
            start: '2025-01-15T09:00:00Z',
            end: '2025-01-15T18:00:00Z',
          },
        },
      },
    },
  })
  async getAvailability(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching calendar availability');

    const members = await prisma.member.findMany({
      include: {
        calendarBusyBlocks: true,
        calendarWorkingHours: true
      }
    });

    const calendar: any = {};
    for (const m of members) {
      if (m.email) {
        calendar[m.email] = {
          busy: m.calendarBusyBlocks.map((b: any) => ({ start: b.start, end: b.end })),
          workingHours: m.calendarWorkingHours ? { start: m.calendarWorkingHours.start, end: m.calendarWorkingHours.end } : undefined
        };
      }
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(calendar, null, 2),
        },
      ],
    };
  }
}
