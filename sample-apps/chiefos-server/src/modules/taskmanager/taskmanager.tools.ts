import { ToolDecorator as Tool, z, ExecutionContext, Injectable, Widget } from '@nitrostack/core';

/**
 * Task Manager Tools
 * 
 * Tools for managing tasks, priorities, and task triaging
 */
@Injectable()
export class TaskManagerTools {
  @Tool({
    name: 'create_task',
    description: 'Create a new task with title, description, priority, and due date',
    inputSchema: z.object({
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      priority: z.enum(['low', 'medium', 'high', 'critical']).describe('Task priority level'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      assignee: z.string().optional().describe('Assignee email address'),
    }),
  })
  async createTask(
    input: {
      title: string;
      description?: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      dueDate?: string;
      assignee?: string;
    },
    context: ExecutionContext
  ) {
    context.logger.info('Creating task', { title: input.title, priority: input.priority });

    const taskId = `task_${Date.now()}`;

    return {
      taskId,
      title: input.title,
      description: input.description || '',
      priority: input.priority,
      dueDate: input.dueDate || null,
      assignee: input.assignee || null,
      status: 'created',
      requiresApproval: input.priority === 'critical',
      createdAt: new Date().toISOString(),
    };
  }

  @Tool({
    name: 'triage_tasks',
    description: 'Analyze and prioritize a batch of tasks based on urgency, importance, and dependencies',
    inputSchema: z.object({
      tasks: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          dueDate: z.string().optional(),
        })
      ).describe('Array of tasks to triage'),
    }),
  })
  @Widget({ route: 'task-list' })
  async triageTasks(
    input: {
      tasks: Array<{ id: string; title: string; description: string; dueDate?: string }>;
    },
    context: ExecutionContext
  ) {
    context.logger.info('Triaging tasks', { count: input.tasks.length });

    const triaged = input.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: this.calculatePriority(task.title, task.description, task.dueDate),
      urgency: this.calculateUrgency(task.dueDate),
      estimatedEffort: this.estimateEffort(task.description),
    }));

    // Sort by priority
    triaged.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });

    return {
      total: input.tasks.length,
      triaged,
      topPriority: triaged[0] || null,
      criticalCount: triaged.filter((t) => t.priority === 'critical').length,
      highCount: triaged.filter((t) => t.priority === 'high').length,
    };
  }

  @Tool({
    name: 'update_task_status',
    description: 'Update the status of a task (e.g., in-progress, completed, blocked)',
    inputSchema: z.object({
      taskId: z.string().describe('Task ID'),
      status: z.enum(['created', 'in-progress', 'completed', 'blocked', 'cancelled']).describe('New task status'),
      notes: z.string().optional().describe('Status update notes'),
    }),
  })
  async updateTaskStatus(
    input: {
      taskId: string;
      status: 'created' | 'in-progress' | 'completed' | 'blocked' | 'cancelled';
      notes?: string;
    },
    context: ExecutionContext
  ) {
    context.logger.info('Updating task status', { taskId: input.taskId, status: input.status });

    return {
      taskId: input.taskId,
      status: input.status,
      notes: input.notes || '',
      updatedAt: new Date().toISOString(),
      requiresApproval: input.status === 'completed',
    };
  }

  @Tool({
    name: 'get_task_summary',
    description: 'Get a summary of all tasks grouped by status and priority',
    inputSchema: z.object({
      assignee: z.string().optional().describe('Filter by assignee email'),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Filter by priority'),
    }),
  })
  async getTaskSummary(
    input: { assignee?: string; priority?: string },
    context: ExecutionContext
  ) {
    context.logger.info('Getting task summary', { assignee: input.assignee });

    const tasks = this.generateSampleTasks();
    const filtered = tasks.filter((t) => {
      if (input.assignee && t.assignee !== input.assignee) return false;
      if (input.priority && t.priority !== input.priority) return false;
      return true;
    });

    return {
      total: filtered.length,
      byStatus: {
        created: filtered.filter((t) => t.status === 'created').length,
        inProgress: filtered.filter((t) => t.status === 'in-progress').length,
        completed: filtered.filter((t) => t.status === 'completed').length,
        blocked: filtered.filter((t) => t.status === 'blocked').length,
      },
      byPriority: {
        critical: filtered.filter((t) => t.priority === 'critical').length,
        high: filtered.filter((t) => t.priority === 'high').length,
        medium: filtered.filter((t) => t.priority === 'medium').length,
        low: filtered.filter((t) => t.priority === 'low').length,
      },
      overdueTasks: filtered.filter((t) => this.isOverdue(t.dueDate)).length,
    };
  }

  // Helper methods
  private calculatePriority(
    title: string,
    description: string,
    dueDate?: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const content = `${title} ${description}`.toLowerCase();

    if (content.includes('critical') || content.includes('emergency') || content.includes('urgent')) {
      return 'critical';
    }
    if (content.includes('important') || content.includes('asap')) {
      return 'high';
    }
    if (content.includes('soon') || this.isUrgent(dueDate)) {
      return 'medium';
    }

    return 'low';
  }

  private calculateUrgency(dueDate?: string): 'immediate' | 'soon' | 'later' {
    if (!dueDate) return 'later';

    const due = new Date(dueDate);
    const now = new Date();
    const daysUntilDue = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 1) return 'immediate';
    if (daysUntilDue <= 7) return 'soon';
    return 'later';
  }

  private estimateEffort(description: string): 'small' | 'medium' | 'large' {
    const length = description.length;
    if (length < 50) return 'small';
    if (length < 200) return 'medium';
    return 'large';
  }

  private isUrgent(dueDate?: string): boolean {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    const daysUntilDue = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 3;
  }

  private isOverdue(dueDate?: string): boolean {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    return due < new Date();
  }

  private generateSampleTasks(): Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
    assignee?: string;
  }> {
    return [
      {
        id: 'task_1',
        title: 'Review proposal',
        status: 'in-progress',
        priority: 'high',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        id: 'task_2',
        title: 'Update documentation',
        status: 'created',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        id: 'task_3',
        title: 'Critical bug fix',
        status: 'in-progress',
        priority: 'critical',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ];
  }
}
