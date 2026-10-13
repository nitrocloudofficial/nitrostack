import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { CalendarService } from '../calendar/calendar.service.js';
import { GmailService } from '../gmail/gmail.service.js';
import { TodoService } from '../todo/todo.service.js';
import { CampusInfoService } from '../campus-info/campus-info.service.js';

@Injectable()
export class PlannerTools {
  constructor(
    private calendarService: CalendarService,
    private gmailService: GmailService,
    private todoService: TodoService,
    private campusInfoService: CampusInfoService
  ) {}

  @Tool({
    name: 'generate_daily_brief',
    description: "Generate the student's prioritized daily brief",
    taskSupport: 'optional',
    inputSchema: z.object({}),
    examples: {
      request: {},
      response: { summary: 'Good morning! Here is your daily brief.', priorities: [] }
    }
  })
  @Widget('daily-brief')
  async generateDailyBrief(input: any, ctx: ExecutionContext) {
    if (ctx.task) ctx.task.updateProgress('Gathering calendar...');
    const schedule = await this.calendarService.getSchedule('today');

    if (ctx.task) ctx.task.updateProgress('Checking email...');
    const emails = await this.gmailService.getUnreadAcademic();

    if (ctx.task) ctx.task.updateProgress('Checking tasks...');
    const tasks = await this.todoService.getPending();

    if (ctx.task) ctx.task.updateProgress('Checking campus announcements...');
    const announcements = await this.campusInfoService.getHighPriorityAnnouncements();

    if (ctx.task) ctx.task.throwIfCancelled();

    return this.prioritize(schedule, emails, tasks, announcements);
  }

  private prioritize(schedule: any, emails: any, tasks: any, announcements: any) {
    return { 
      summary: "Good morning! Here is your daily brief.",
      schedule, 
      emails, 
      tasks, 
      announcements,
      priorities: [
        "Read high-priority announcements.",
        "Check upcoming assignment deadlines.",
        "Attend scheduled lectures."
      ]
    };
  }

  @Tool({
    name: 'plan_week',
    description: "Plan the student's week",
    inputSchema: z.object({}),
    examples: { request: {}, response: { plan: 'Weekly plan details' } }
  })
  async planWeek(input: any, ctx: ExecutionContext) {
    return { plan: 'Weekly plan details' };
  }
}

