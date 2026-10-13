import { ToolDecorator as Tool, Widget, Cache, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { TodoService } from './todo.service.js';

@Injectable()
export class TodoTools {
  constructor(private todoService: TodoService) {}

  @Tool({
    name: 'get_pending_tasks',
    description: "Get pending tasks for the student",
    inputSchema: z.object({}),
    examples: {
      request: {},
      response: { tasks: [{ id: '1', title: 'Finish AI essay', due: '2023-10-25' }] }
    }
  })
  @Widget('task-board')
  @Cache({ ttl: 60 })
  async getPendingTasks(input: any, ctx: ExecutionContext) {
    return this.todoService.getPending();
  }

  @Tool({
    name: 'get_tasks_for_date',
    description: "Get pending tasks for a specific date",
    inputSchema: z.object({ date: z.string() }),
    examples: {
      request: { date: '2025-07-26' },
      response: { tasks: [{ id: '1', title: 'Finish AI essay', due: '2025-07-26' }] }
    }
  })
  @Widget('task-board')
  @Cache({ ttl: 60 })
  async getTasksForDate(input: { date: string }, ctx: ExecutionContext) {
    return this.todoService.getTasksForDate(input.date);
  }

  @Tool({
    name: 'create_task',
    description: "Create a new task",
    inputSchema: z.object({ title: z.string(), due: z.string().optional() }),
    examples: {
      request: { title: 'Read chapter 4' },
      response: { success: true, task: { id: '2', title: 'Read chapter 4' } }
    }
  })
  async createTask(input: { title: string, due?: string }, ctx: ExecutionContext) {
    return this.todoService.createTask(input.title, input.due);
  }

  @Tool({
    name: 'complete_task',
    description: "Mark a task as complete",
    inputSchema: z.object({ id: z.string() }),
    examples: {
      request: { id: '1' },
      response: { success: true, id: '1' }
    }
  })
  async completeTask(input: { id: string }, ctx: ExecutionContext) {
    return this.todoService.completeTask(input.id);
  }

  @Tool({
    name: 'update_task',
    description: "Update an existing task",
    inputSchema: z.object({ id: z.string(), title: z.string().optional(), due: z.string().optional() }),
    examples: {
      request: { id: '1', title: 'Updated title' },
      response: { success: true, task: { id: '1', title: 'Updated title' } }
    }
  })
  async updateTask(input: { id: string, title?: string, due?: string }, ctx: ExecutionContext) {
    return this.todoService.updateTask(input.id, input.title, input.due);
  }

  @Tool({
    name: 'delete_task',
    description: "Delete a task",
    inputSchema: z.object({ id: z.string() }),
    examples: {
      request: { id: '1' },
      response: { success: true, id: '1' }
    }
  })
  async deleteTask(input: { id: string }, ctx: ExecutionContext) {
    return this.todoService.deleteTask(input.id);
  }
}
