import { ToolDecorator as Tool, UseGuards, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { CalendarService } from './calendar.service.js';
import { JWTGuard } from '../../guards/jwt.guard.js';

export class CalendarTools {
  constructor(private calendarService: CalendarService) {}

  @Tool({
    name: 'get_calendar_auth_url',
    description: 'Get the Google consent URL to start the Calendar OAuth2 flow',
    inputSchema: z.object({})
  })
  async getAuthUrl() {
    return { auth_url: this.calendarService.getAuthUrl() };
  }

  @Tool({
    name: 'complete_calendar_auth',
    description: 'Exchange a Google OAuth2 code for tokens after the user approves access',
    inputSchema: z.object({ code: z.string() })
  })
  @UseGuards(JWTGuard)
  async completeAuth(input: { code: string }, ctx: ExecutionContext) {
    ctx.logger.info('Completing calendar OAuth', { user: ctx.auth?.subject });
    const tokens = await this.calendarService.exchangeCode(input.code);
    return { connected: true, has_refresh_token: Boolean(tokens.refresh_token) };
  }

  @Tool({
    name: 'sync_calendar',
    description: 'Bi-directional sync between Meeting Supervisor and Google Calendar',
    inputSchema: z.object({})
  })
  @UseGuards(JWTGuard)
  async sync(_input: unknown, ctx: ExecutionContext) {
    return this.calendarService.syncEvents(ctx.auth?.subject as string);
  }
}
