import { Injectable } from '@nitrostack/core';
import { google } from 'googleapis';

/**
 * Google Calendar OAuth2 + bi-directional sync (plan.md Section 3.A.2).
 * The handshake shape is real; token exchange and sync are stubbed
 * until GOOGLE_CLIENT_ID/SECRET are set and a token store is wired to
 * users.google_calendar_token (see database/schema.sql).
 */
@Injectable()
export class CalendarService {
  private oauth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  getAuthUrl(): string {
    return this.oauth2Client().generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar']
    });
  }

  async exchangeCode(code: string) {
    const client = this.oauth2Client();
    const { tokens } = await client.getToken(code);
    // TODO(Phase 1): persist `tokens` on users.google_calendar_token
    return tokens;
  }

  async syncEvents(_userId: string) {
    // TODO(Phase 4): pull events via calendar.events.list, push
    // confirmed meetings out, and hand conflicts to the Supervisor
    // Agent (see modules/agents/agents.service.ts#suggestMeetingSlots)
    throw new Error('Calendar sync not yet implemented — needs a stored refresh token.');
  }
}
