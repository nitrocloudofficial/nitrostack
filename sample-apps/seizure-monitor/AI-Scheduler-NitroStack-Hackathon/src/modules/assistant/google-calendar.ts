import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

export interface GoogleCalendarEventInput {
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  calendarId?: string;
  timeZone?: string;
}

export interface GoogleCalendarCreateResult {
  id?: string;
  htmlLink?: string;
  status: 'success' | 'skipped';
  message: string;
  event?: Record<string, unknown>;
}

export class GoogleCalendarService {
  private readonly calendarId: string;
  private readonly timeZone: string;

  constructor() {
    this.calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary';
    this.timeZone = process.env.GOOGLE_CALENDAR_TIMEZONE ?? 'UTC';
  }

  getAuthorizationUrl() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/auth/callback';

    if (!clientId || !clientSecret) {
      return null;
    }

    const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    return oauth.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/calendar'
      ],
      prompt: 'select_account consent'
    });
  }

  buildPayload(input: GoogleCalendarEventInput) {
    return {
      summary: input.title,
      description: input.description ?? '',
      start: {
        dateTime: input.startTime,
        timeZone: input.timeZone ?? this.timeZone
      },
      end: {
        dateTime: input.endTime,
        timeZone: input.timeZone ?? this.timeZone
      }
    };
  }

  async createEvent(input: GoogleCalendarEventInput, userTokens?: any): Promise<GoogleCalendarCreateResult> {
    if (!this.isConfigured() && !userTokens?.access_token) {
      return {
        status: 'skipped',
        message: 'Google Calendar integration requires Google Account authorization. Please sign in with Google to enable automatic Calendar sync.',
        event: this.buildPayload(input)
      };
    }

    try {
      const auth = await this.getAuth(userTokens);
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.insert({
        calendarId: input.calendarId ?? this.calendarId,
        requestBody: this.buildPayload(input)
      });

      return {
        status: 'success',
        message: 'Event created in Google Calendar.',
        id: response.data.id ?? undefined,
        htmlLink: response.data.htmlLink ?? undefined,
        event: response.data as Record<string, unknown>
      };
    } catch (err: any) {
      return {
        status: 'skipped',
        message: `Google Calendar sync skipped: ${err.message || 'Authentication error'}`,
        event: this.buildPayload(input)
      };
    }
  }

  async deleteEvent(eventId: string, userTokens?: any): Promise<{ status: 'success' | 'failed'; message: string }> {
    if (!eventId) {
      return { status: 'failed', message: 'No event ID provided.' };
    }
    try {
      const auth = await this.getAuth(userTokens);
      const calendar = google.calendar({ version: 'v3', auth });
      await calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId
      });
      return { status: 'success', message: 'Event deleted from Google Calendar.' };
    } catch (err: any) {
      return { status: 'failed', message: `Failed to delete calendar event: ${err.message}` };
    }
  }

  async updateEvent(eventId: string, input: GoogleCalendarEventInput, userTokens?: any): Promise<GoogleCalendarCreateResult> {
    if (!eventId) {
      return this.createEvent(input, userTokens);
    }
    try {
      const auth = await this.getAuth(userTokens);
      const calendar = google.calendar({ version: 'v3', auth });
      const response = await calendar.events.patch({
        calendarId: input.calendarId ?? this.calendarId,
        eventId: eventId,
        requestBody: this.buildPayload(input)
      });
      return {
        status: 'success',
        message: 'Event updated in Google Calendar.',
        id: response.data.id ?? undefined,
        htmlLink: response.data.htmlLink ?? undefined,
        event: response.data as Record<string, unknown>
      };
    } catch (err: any) {
      return {
        status: 'skipped',
        message: `Failed to update calendar event: ${err.message}`,
        event: this.buildPayload(input)
      };
    }
  }

  private isConfigured(): boolean {
    return Boolean(
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) ||
      (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_ACCESS_TOKEN && process.env.GOOGLE_REFRESH_TOKEN)
    );
  }

  private async getAuth(userTokens?: any) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/auth/callback';

    if (userTokens && userTokens.access_token && clientId && clientSecret) {
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      oauth2Client.setCredentials(userTokens);
      return oauth2Client;
    }

    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentialsPath) {
      return new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });
    }

    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      const credentials = JSON.parse(serviceAccountJson) as {
        client_email?: string;
        private_key?: string;
      };

      return new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });
    }

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (email && privateKey) {
      return new google.auth.JWT({
        email,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });
    }

    if (clientId && clientSecret) {
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
      if (accessToken && refreshToken) {
        oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
        return oauth2Client;
      }
    }

    throw new Error('Google Calendar credentials missing. Please sign in with Google or authorize Calendar permissions.');
  }
}

export function buildGoogleCalendarEventPayload(input: GoogleCalendarEventInput) {
  return new GoogleCalendarService().buildPayload(input);
}
