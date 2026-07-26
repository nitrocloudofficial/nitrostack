import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { getMockCalendarEvents } from '../calendar/calendar.tools.js';

export class ContextTools {
  @Tool({
    name: 'buildUserContext',
    description: 'Build the current user context, including active project, upcoming meetings within the hour, and key collaborators.',
    inputSchema: z.object({})
  })
  async buildUserContext(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Building user context');

    const now = new Date();
    const calendarEvents = getMockCalendarEvents();

    // Find a meeting starting within the next 60 minutes
    const upcomingMeeting = calendarEvents.find(event => {
      const eventTime = new Date(event.timestamp).getTime();
      const diffMs = eventTime - now.getTime();
      // Return true if meeting starts in future and within 1 hour (60 mins)
      return diffMs > 0 && diffMs <= 60 * 60 * 1000;
    }) || null;

    const activeProject = 'Project Focus';
    
    // Key collaborators mapped from our mock sources
    const keyCollaborators = [
      'Sarah Chen',
      'David Miller',
      'david-miller',
      'sarah-chen'
    ];

    return {
      activeProject,
      upcomingMeeting,
      keyCollaborators
    };
  }
}
