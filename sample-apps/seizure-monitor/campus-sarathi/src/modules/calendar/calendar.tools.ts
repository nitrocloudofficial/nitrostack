import { ToolDecorator as Tool, Widget, Cache, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { CalendarService } from './calendar.service.js';

@Injectable()
export class CalendarTools {
  constructor(private calendarService: CalendarService) {}

  @Tool({
    name: 'get_today_schedule',
    description: "Get the student's schedule for today",
    inputSchema: z.object({}),
    examples: {
      request: {},
      response: { events: [{ title: 'AI Lecture', start: '10:00', end: '11:00' }] }
    }
  })
  @Widget('schedule-card')
  @Cache({ ttl: 60 })
  async getTodaySchedule(input: any, ctx: ExecutionContext) {
    return this.calendarService.getSchedule('today');
  }

  @Tool({
    name: 'get_tomorrow_schedule',
    description: "Get the student's schedule for tomorrow",
    inputSchema: z.object({}),
    examples: {
      request: {},
      response: { events: [{ title: 'AI Lecture', start: '10:00', end: '11:00' }] }
    }
  })
  @Widget('schedule-card')
  @Cache({ ttl: 60 })
  async getTomorrowSchedule(input: any, ctx: ExecutionContext) {
    return this.calendarService.getSchedule('tomorrow');
  }

  @Tool({
    name: 'get_week_schedule',
    description: "Get the student's schedule for the week",
    inputSchema: z.object({}),
    examples: {
      request: {},
      response: { events: [{ title: 'AI Lecture', start: '10:00', end: '11:00' }] }
    }
  })
  @Widget('schedule-card')
  @Cache({ ttl: 60 })
  async getWeekSchedule(input: any, ctx: ExecutionContext) {
    return this.calendarService.getSchedule('week');
  }

  @Tool({
    name: 'find_free_slots',
    description: "Find free slots in the student's calendar for a given date",
    inputSchema: z.object({ date: z.string() }),
    examples: {
      request: { date: '2023-10-25' },
      response: { slots: [{ start: '14:00', end: '15:00' }] }
    }
  })
  async findFreeSlots(input: { date: string }, ctx: ExecutionContext) {
    return this.calendarService.findFreeSlots(input.date);
  }

  @Tool({
    name: 'get_schedule_for_date',
    description: "Get the student's schedule for a specific date",
    inputSchema: z.object({ date: z.string() }),
    examples: {
      request: { date: '2025-07-26' },
      response: { events: [{ title: 'AI Lecture', start: '10:00', end: '11:00' }] }
    }
  })
  @Widget('schedule-card')
  @Cache({ ttl: 60 })
  async getScheduleForDate(input: { date: string }, ctx: ExecutionContext) {
    return this.calendarService.getScheduleForDate(input.date);
  }

  @Tool({
    name: 'add_calendar_event',
    description: "Add a new event to the student's calendar",
    inputSchema: z.object({ title: z.string(), start: z.string(), end: z.string() }),
    examples: {
      request: { title: 'Study Session', start: '14:00', end: '15:00' },
      response: { success: true, event: { title: 'Study Session', start: '14:00', end: '15:00' } }
    }
  })
  async addCalendarEvent(input: { title: string, start: string, end: string }, ctx: ExecutionContext) {
    return this.calendarService.addEvent(input.title, input.start, input.end);
  }

  @Tool({
    name: 'add_recurring_event',
    description: 'Create a recurring calendar event. Provide an ISO start datetime and an RRULE (e.g. "RRULE:FREQ=WEEKLY;BYDAY=MO")',
    inputSchema: z.object({ title: z.string(), start: z.string(), rrule: z.string() }),
    examples: { request: { title: 'Weekly Standup', start: '2026-07-27T10:00:00', rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO' } }
  })
  async addRecurringEvent(input: { title: string, start: string, rrule: string }, ctx: ExecutionContext) {
    return this.calendarService.addRecurringEvent(input.title, input.start, input.rrule);
  }

  @Tool({
    name: 'move_event_by_title',
    description: 'Move an event identified by title on a given date to a new start/end',
    inputSchema: z.object({ date: z.string(), title: z.string(), newStart: z.string(), newEnd: z.string() }),
    examples: { request: { date: '2026-07-28', title: 'Advisor meeting', newStart: '2026-07-28T16:00:00', newEnd: '2026-07-28T17:00:00' } }
  })
  async moveEventByTitle(input: { date: string, title: string, newStart: string, newEnd: string }, ctx: ExecutionContext) {
    return this.calendarService.moveEventByTitle(input.date, input.title, input.newStart, input.newEnd);
  }

  @Tool({
    name: 'delete_event_by_title',
    description: 'Delete an event by title on a given date',
    inputSchema: z.object({ date: z.string(), title: z.string() }),
    examples: { request: { date: '2026-07-26', title: 'Practice' } }
  })
  async deleteEventByTitle(input: { date: string, title: string }, ctx: ExecutionContext) {
    return this.calendarService.deleteEventByTitle(input.date, input.title);
  }

  @Tool({
    name: 'get_event_details',
    description: 'Find events by title and return details',
    inputSchema: z.object({ title: z.string() }),
    examples: { request: { title: 'Exam review' } }
  })
  async getEventDetails(input: { title: string }, ctx: ExecutionContext) {
    return this.calendarService.findEventByTitle(input.title);
  }

  @Tool({
    name: 'export_events_range',
    description: 'Export events between two ISO datetimes as CSV and JSON rows',
    inputSchema: z.object({ timeMin: z.string(), timeMax: z.string() }),
    examples: { request: { timeMin: '2026-07-27T00:00:00Z', timeMax: '2026-08-03T00:00:00Z' } }
  })
  async exportEventsRange(input: { timeMin: string, timeMax: string }, ctx: ExecutionContext) {
    return this.calendarService.exportEventsForRange(input.timeMin, input.timeMax);
  }
}
