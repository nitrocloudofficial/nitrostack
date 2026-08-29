import { ToolDecorator as Tool, Widget, UseGuards, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { TasksService } from './tasks.service.js';
import { JWTGuard } from '../../guards/jwt.guard.js';

export class TasksTools {
  constructor(private tasksService: TasksService) {}

  @Tool({
    name: 'list_tasks',
    description: 'List tasks, optionally filtered by assignee and/or status — powers both the Team Lead and Teammate dashboards',
    inputSchema: z.object({
      assigned_to: z.string().optional().describe('Filter to one user'),
      status: z.enum(['proposed', 'accepted', 'denied', 'in_progress', 'done']).optional()
    })
  })
  @Widget('task-board')
  async listTasks(input: { assigned_to?: string; status?: string }) {
    const tasks = await this.tasksService.list(input.assigned_to, input.status);
    return { tasks };
  }

  @Tool({
    name: 'create_task',
    description:
      'Team Lead Dashboard: assign a task, usually generated from a meeting keynote. Runs through the Task Analyzer (see analyze_task in the agents module) before it reaches the teammate.',
    inputSchema: z.object({
      meeting_id: z.string().optional(),
      title: z.string(),
      description: z.string().optional(),
      assigned_to: z.string().optional(),
      due_date: z.string().optional().describe('ISO 8601 date')
    })
  })
  @UseGuards(JWTGuard)
  async createTask(
    input: {
      meeting_id?: string;
      title: string;
      description?: string;
      assigned_to?: string;
      due_date?: string;
    },
    ctx: ExecutionContext
  ) {
    return this.tasksService.create({ ...input, assigned_by: ctx.auth?.subject as string | undefined });
  }

  @Tool({
    name: 'decide_task',
    description: 'Teammate Dashboard: accept or deny a proposed task, with an optional reason',
    inputSchema: z.object({
      task_id: z.string(),
      status: z.enum(['accepted', 'denied']),
      denial_reason: z.string().optional()
    })
  })
  @UseGuards(JWTGuard)
  async decideTask(input: { task_id: string; status: 'accepted' | 'denied'; denial_reason?: string }) {
    if (input.status === 'denied' && !input.denial_reason) {
      throw new Error('denial_reason is required when denying a task');
    }
    return this.tasksService.decide(input.task_id, input.status, input.denial_reason);
  }

  @Tool({
    name: 'complete_task',
    description: 'Mark an accepted task done',
    inputSchema: z.object({ task_id: z.string() })
  })
  @UseGuards(JWTGuard)
  async completeTask(input: { task_id: string }) {
    return this.tasksService.markDone(input.task_id);
  }
}
