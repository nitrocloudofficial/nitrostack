import { Injectable } from '@nitrostack/core';
import { GoogleAuthService } from '../../services/google-auth.service.js';
import { google } from 'googleapis';

@Injectable()
export class CalendarService {
  constructor(private googleAuth: GoogleAuthService) {}

  private async getCalendarClient() {
    const auth = await this.googleAuth.getAuthClient();
    return google.calendar({ version: 'v3', auth });
  }

  private getLocalTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }

  private parseCalendarDate(value: string) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { date: value };
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid datetime provided: ${value}`);
    }

    const dateTime = parsed.toISOString();
    const hasOffset = /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
    const result: { dateTime: string; timeZone?: string } = { dateTime };

    if (!hasOffset) {
      result.timeZone = this.getLocalTimeZone();
    }

    return result;
  }

  private parseStartEndValue(value: string) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { date: value };
    }

    if (/^\d{1,2}:\d{2}$/.test(value)) {
      const now = new Date();
      const [hh, mm] = value.split(':').map(Number);
      const local = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
      return { dateTime: local.toISOString(), timeZone: this.getLocalTimeZone() };
    }

    return this.parseCalendarDate(value);
  }

  private makeDefaultEnd(start: string) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      const [year, month, day] = start.split('-').map(Number);
      const endDate = new Date(year, month - 1, day + 1);
      return { date: endDate.toISOString().slice(0, 10) };
    }

    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error(`Invalid datetime provided: ${start}`);
    }

    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const payload: { dateTime: string; timeZone?: string } = { dateTime: endDate.toISOString() };
    if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(start)) {
      payload.timeZone = this.getLocalTimeZone();
    }
    return payload;
  }

  private buildLocalDate(date: string) {
    const parts = date.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      throw new Error(`Invalid date provided: ${date}`);
    }
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }

  async getSchedule(range: 'today' | 'tomorrow' | 'week') {
    const calendar = await this.getCalendarClient();

    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (range === 'tomorrow') {
      timeMin.setDate(timeMin.getDate() + 1);
      timeMax.setDate(timeMax.getDate() + 1);
    } else if (range === 'week') {
      timeMax.setDate(timeMax.getDate() + 7);
    }

    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone: this.getLocalTimeZone(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items?.map(event => ({
        title: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        description: event.description,
        location: event.location,
      })) || [];

      return { events };
    } catch (error: any) {
      throw new Error(`Calendar fetch failed: ${error.message || 'unknown error'}`);
    }
  }

  async getScheduleForDate(date: string) {
    const calendar = await this.getCalendarClient();
    const target = this.buildLocalDate(date);

    const timeMin = new Date(target);
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date(target);
    timeMax.setHours(23, 59, 59, 999);

    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone: this.getLocalTimeZone(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items?.map(event => ({
        title: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        description: event.description,
        location: event.location,
      })) || [];

      return { events };
    } catch (error: any) {
      throw new Error(`Calendar fetch failed: ${error.message || 'unknown error'}`);
    }
  }

  async findFreeSlots(date: string) {
    return { slots: [{ start: '14:00', end: '15:00' }] };
  }

  async addEvent(title: string, start: string, end: string) {
    const calendar = await this.getCalendarClient();

    const requestBody: any = {
      summary: title,
      start: this.parseStartEndValue(start),
      end: this.parseStartEndValue(end)
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody
    });

    return {
      success: true,
      event: {
        title: response.data.summary,
        start: response.data.start?.dateTime || response.data.start?.date,
        end: response.data.end?.dateTime || response.data.end?.date,
        id: response.data.id
      }
    };
  }

  async addRecurringEvent(title: string, startDateTime: string, rrule: string, endDateTime?: string) {
    const calendar = await this.getCalendarClient();

    const start = this.parseStartEndValue(startDateTime);
    const end = endDateTime ? this.parseStartEndValue(endDateTime) : this.makeDefaultEnd(startDateTime);

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        start,
        end,
        recurrence: [rrule]
      }
    });

    return { success: true, eventId: response.data.id };
  }

  async moveEventByTitle(date: string, title: string, newStart: string, newEnd: string) {
    const calendar = await this.getCalendarClient();
    const day = this.buildLocalDate(date);
    const timeMin = day.toISOString();
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax: dayEnd.toISOString(),
      timeZone: this.getLocalTimeZone(),
      singleEvents: true,
      orderBy: 'startTime',
      q: title
    });

    const ev = (response.data.items || []).find(e => e.summary === title);
    if (!ev || !ev.id) throw new Error('Event not found');

    const updateBody: any = {
      start: this.parseStartEndValue(newStart),
      end: this.parseStartEndValue(newEnd)
    };

    const updated = await calendar.events.patch({
      calendarId: 'primary',
      eventId: ev.id,
      requestBody: updateBody
    });

    return { success: true, event: updated.data };
  }

  async deleteEventByTitle(date: string, title: string) {
    const calendar = await this.getCalendarClient();
    const day = this.buildLocalDate(date);
    const timeMin = day.toISOString();
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax: dayEnd.toISOString(),
      timeZone: this.getLocalTimeZone(),
      singleEvents: true,
      orderBy: 'startTime',
      q: title
    });

    const ev = (response.data.items || []).find(e => e.summary === title);
    if (!ev || !ev.id) throw new Error('Event not found');

    await calendar.events.delete({ calendarId: 'primary', eventId: ev.id });
    return { success: true };
  }

  async findEventByTitle(title: string) {
    const calendar = await this.getCalendarClient();
    const now = new Date();
    const future = new Date(now);
    future.setFullYear(future.getFullYear() + 1);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      timeZone: this.getLocalTimeZone(),
      singleEvents: true,
      orderBy: 'startTime',
      q: title
    });

    return { events: response.data.items || [] };
  }

  async exportEventsForRange(timeMinIso: string, timeMaxIso: string) {
    const calendar = await this.getCalendarClient();
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMinIso,
      timeMax: timeMaxIso,
      timeZone: this.getLocalTimeZone(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    const items = response.data.items || [];
    const rows = items.map(it => ({
      title: it.summary || '',
      start: it.start?.dateTime || it.start?.date || '',
      end: it.end?.dateTime || it.end?.date || '',
      description: it.description || '',
      location: it.location || ''
    }));

    const header = 'title,start,end,description,location';
    const csv = [header, ...rows.map(r => `${JSON.stringify(r.title)},${JSON.stringify(r.start)},${JSON.stringify(r.end)},${JSON.stringify(r.description)},${JSON.stringify(r.location)}`)].join('\n');
    return { csv, items: rows };
  }
}
