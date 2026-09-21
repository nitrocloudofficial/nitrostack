/**
 * MeetingMind AI Tools
 * All 6 MCP tools for meeting management
 */

import { Injectable, ToolDecorator as Tool, ExecutionContext, Widget } from '@nitrostack/core';
import { z } from 'zod';
import { MeetingAnalyzerService } from '../../services/meeting-analyzer.service.js';
import { taskStore } from '../../fixtures/tasks.js';
import { calendarStore } from '../../fixtures/calendar.js';
import { recentMeetings } from '../../fixtures/meetings.js';
import {
  SummarizeMeetingInputSchema,
  ExtractActionItemsInputSchema,
  MeetingSummarySchema,
  ActionItemsListSchema
} from '../../schemas/meeting.schema.js';
import {
  CreateTaskInputSchema,
  TaskObjectSchema,
  SendReminderInputSchema,
  ReminderConfirmationSchema
} from '../../schemas/task.schema.js';
import {
  ScheduleFollowUpInputSchema,
  CalendarEventObjectSchema,
  DashboardDataSchema
} from '../../schemas/calendar.schema.js';

@Injectable({ deps: [MeetingAnalyzerService] })
export class MeetingMindTools {
  constructor(private meetingAnalyzer: MeetingAnalyzerService) {}

  /**
   * Tool 1: Summarize a meeting transcript
   */
  @Tool({
    name: 'summarizeMeeting',
    description: 'Analyze a meeting transcript and generate a structured summary with key points and decisions',
    inputSchema: SummarizeMeetingInputSchema,
    outputSchema: MeetingSummarySchema
  })
  @Widget('meeting-summary-card')
  async summarizeMeeting(
    input: z.infer<typeof SummarizeMeetingInputSchema>,
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Summarizing meeting transcript', { transcriptLength: input.transcript.length });

    const summary = this.meetingAnalyzer.summarizeMeeting(input.transcript);

    ctx.logger.info('Meeting summary generated', {
      title: summary.title,
      attendeeCount: summary.attendees.length,
      keyPointsCount: summary.keyPoints.length
    });

    return summary;
  }

  /**
   * Tool 2: Extract action items from transcript
   */
  @Tool({
    name: 'extractActionItems',
    description: 'Extract action items from a meeting transcript with assigned owners, deadlines, and priorities',
    inputSchema: ExtractActionItemsInputSchema,
    outputSchema: ActionItemsListSchema
  })
  @Widget('action-items-table')
  async extractActionItems(
    input: z.infer<typeof ExtractActionItemsInputSchema>,
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Extracting action items from transcript');

    const items = this.meetingAnalyzer.extractActionItems(input.transcript);

    ctx.logger.info('Action items extracted', { count: items.length });

    return {
      items,
      meetingTitle: 'Meeting Action Items'
    };
  }

  /**
   * Tool 3: Create a task
   */
  @Tool({
    name: 'createTask',
    description: 'Create a new task and add it to the task store',
    inputSchema: CreateTaskInputSchema,
    outputSchema: TaskObjectSchema
  })
  async createTask(
    input: z.infer<typeof CreateTaskInputSchema>,
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Creating new task', { title: input.task, owner: input.owner });

    const task = taskStore.addTask({
      title: input.task,
      owner: input.owner,
      deadline: input.deadline,
      priority: input.priority,
      status: 'pending'
    });

    ctx.logger.info('Task created successfully', { taskId: task.id });

    return task;
  }

  /**
   * Tool 4: Schedule a follow-up meeting
   */
  @Tool({
    name: 'scheduleFollowUp',
    description: 'Schedule a follow-up meeting and add it to the calendar',
    inputSchema: ScheduleFollowUpInputSchema,
    outputSchema: CalendarEventObjectSchema
  })
  async scheduleFollowUp(
    input: z.infer<typeof ScheduleFollowUpInputSchema>,
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Scheduling follow-up meeting', {
      title: input.meetingTitle,
      date: input.date,
      time: input.time
    });

    const event = calendarStore.addEvent({
      title: `Follow-up: ${input.meetingTitle}`,
      date: input.date,
      time: input.time,
      attendees: ['Team Members'],
      description: `Follow-up meeting for: ${input.meetingTitle}`
    });

    ctx.logger.info('Follow-up meeting scheduled', { eventId: event.id });

    return event;
  }

  /**
   * Tool 5: Send a reminder for a task
   */
  @Tool({
    name: 'sendReminder',
    description: 'Send a reminder notification for a specific task',
    inputSchema: SendReminderInputSchema,
    outputSchema: ReminderConfirmationSchema
  })
  async sendReminder(
    input: z.infer<typeof SendReminderInputSchema>,
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Sending reminder for task', { taskId: input.taskId });

    const task = taskStore.getTask(input.taskId);

    if (!task) {
      ctx.logger.warn('Task not found for reminder', { taskId: input.taskId });
      return {
        success: false,
        taskId: input.taskId,
        taskTitle: 'Unknown',
        owner: 'Unknown',
        deadline: new Date().toISOString(),
        message: `Task ${input.taskId} not found`
      };
    }

    ctx.logger.info('Reminder sent successfully', {
      taskId: task.id,
      taskTitle: task.title,
      owner: task.owner
    });

    return {
      success: true,
      taskId: task.id,
      taskTitle: task.title,
      owner: task.owner,
      deadline: task.deadline,
      message: `Reminder sent for task: "${task.title}" assigned to ${task.owner}. Deadline: ${this.formatDeadline(task.deadline)}`
    };
  }

  /**
   * Tool 6: Get dashboard data
   */
  @Tool({
    name: 'getDashboardData',
    description: 'Retrieve aggregated dashboard data including recent meetings, pending tasks, completed tasks, and upcoming deadlines',
    inputSchema: z.object({}),
    outputSchema: DashboardDataSchema
  })
  @Widget('dashboard-widget')
  async getDashboardData(
    _input: Record<string, never>,
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Fetching dashboard data');

    const allTasks = taskStore.getAllTasks();
    const pendingTasks = taskStore.getPendingTasks();
    const completedTasks = taskStore.getCompletedTasks();
    const upcomingDeadlines = taskStore.getUpcomingDeadlines(7);

    const dashboardData = {
      recentMeetings: recentMeetings.map(m => ({
        id: m.id,
        title: m.title,
        date: m.date,
        attendees: m.attendees
      })),
      pendingTasks: pendingTasks.map(t => ({
        id: t.id,
        title: t.title,
        owner: t.owner,
        deadline: t.deadline,
        priority: t.priority
      })),
      completedTasks: completedTasks.map(t => ({
        id: t.id,
        title: t.title,
        owner: t.owner,
        completedAt: t.createdAt
      })),
      upcomingDeadlines: upcomingDeadlines.map(t => {
        const now = new Date();
        const deadline = new Date(t.deadline);
        const daysUntilDue = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: t.id,
          title: t.title,
          owner: t.owner,
          deadline: t.deadline,
          priority: t.priority,
          daysUntilDue
        };
      }),
      stats: {
        totalMeetings: recentMeetings.length,
        totalPendingTasks: pendingTasks.length,
        totalCompletedTasks: completedTasks.length,
        upcomingDeadlineCount: upcomingDeadlines.length
      }
    };

    ctx.logger.info('Dashboard data retrieved', {
      pendingTasksCount: pendingTasks.length,
      completedTasksCount: completedTasks.length,
      upcomingDeadlinesCount: upcomingDeadlines.length
    });

    return dashboardData;
  }

  /** Formats an ISO deadline string as MM/DD/YYYY in UTC, avoiding locale/timezone drift */
  private formatDeadline(isoString: string): string {
    const d = new Date(isoString);
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();
    return `${month}/${day}/${year}`;
  }
}