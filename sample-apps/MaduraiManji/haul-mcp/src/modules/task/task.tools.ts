import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { db } from '../../db/database.js';

export class TaskTools {
  @Tool({
    name: 'create_task',
    description: `Use this tool whenever the user mentions assigning work, creating a to-do, or someone needs to complete something. 
Examples: "create a task for developer to finish authentication by Friday", "assign UI design to the designer due Wednesday", "add a task: marketing campaign next week".
Extracts the title, person/team responsible (owner), and deadline from the user's message.`,
    inputSchema: z.object({
      title: z.string().describe('The task title or description'),
      owner: z.string().describe('Who is responsible — person name, role, or team (e.g. "Developer", "Aksha", "Marketing Team")'),
      deadline: z.string().describe('When it is due — natural language is fine (e.g. "Friday", "July 28", "End of sprint")')
    })
  })
  async createTask(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Creating task: "${input.title}" for ${input.owner}, due ${input.deadline}`);
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO tasks (title, owner, deadline, status) VALUES (?, ?, ?, ?)`,
        [input.title, input.owner, input.deadline, 'active'],
        function (err: Error | null) {
          if (err) return reject(err);
          resolve({
            success: true,
            message: `✅ Task created successfully!\n\nTitle: ${input.title}\nOwner: ${input.owner}\nDeadline: ${input.deadline}\n\n— Haul makes life easier 🚀`,
            taskId: this.lastID
          });
        }
      );
    });
  }

  @Tool({
    name: 'list_tasks',
    description: `Use this to show all existing tasks. Call this when the user asks "show me the tasks", "what tasks do we have?", "list all tasks", or wants to review current work items.`,
    inputSchema: z.object({
      status: z.string().optional().describe('Filter by status: "active", "completed", "overdue". Leave empty for all tasks.')
    })
  })
  async listTasks(input: any, ctx: ExecutionContext) {
    return new Promise((resolve, reject) => {
      const query = input.status
        ? `SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC`
        : `SELECT * FROM tasks ORDER BY created_at DESC`;
      const params = input.status ? [input.status] : [];

      db.all(query, params, (err: Error | null, rows: any[]) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) {
          return resolve({ message: 'No tasks found.\n\n— Haul makes life easier 🚀' });
        }

        let mdTable = '| ID | Task | Owner | Deadline | Status |\n|---|---|---|---|---|\n';
        rows.forEach(r => {
          const statusIcon = r.status === 'completed' ? '✅ Done' : '⏳ Active';
          mdTable += `| ${r.id} | ${r.title} | ${r.owner} | ${r.deadline} | ${statusIcon} |\n`;
        });

        resolve({
          message: `### 📋 Current Tasks\n\n${mdTable}\n\n— Haul makes life easier 🚀`
        });
      });
    });
  }

  @Tool({
    name: 'update_task_status',
    description: `Mark a task as completed, overdue, or active. Use when the user says "mark task as done", "complete the authentication task", or "task X is finished".`,
    inputSchema: z.object({
      taskId: z.number().describe('The numeric ID of the task to update'),
      status: z.enum(['active', 'completed', 'overdue']).describe('New status to set')
    })
  })
  async updateTaskStatus(input: any, ctx: ExecutionContext) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE tasks SET status = ? WHERE id = ?`,
        [input.status, input.taskId],
        function (err: Error | null) {
          if (err) return reject(err);
          if (this.changes === 0) return resolve({ success: false, message: `No task found with ID ${input.taskId}.\n\n— Haul makes life easier 🚀` });
          resolve({ success: true, message: `Task #${input.taskId} has been marked as ${input.status}.\n\n— Haul makes life easier 🚀` });
        }
      );
    });
  }
}
