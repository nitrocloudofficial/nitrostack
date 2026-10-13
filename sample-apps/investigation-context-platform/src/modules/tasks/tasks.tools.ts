import {
  ToolDecorator as Tool,
  ExecutionContext,
  Widget,
  z,
} from "@nitrostack/core";

import { randomUUID } from "crypto";
import { TaskSchema } from "./tasks.data.js";

export class TasksTools {
  @Tool({
    name: "create_task",
    description: "Create a new investigation task",

    inputSchema: z.object({
      investigationId: z.string().uuid(),

      title: z.string(),

      description: z.string(),

      assignedTo: z.string(),

      priority: z.enum([
        "low",
        "medium",
        "high",
        "critical",
      ]),

      dueDate: z.string().optional(),

      evidenceIds: z.array(z.string()).optional(),

      entityIds: z.array(z.string()).optional(),
    }),
  })
  @Widget("task-card")
  async createTask(input: any, ctx: ExecutionContext) {
    ctx.logger.info("Creating task");

    const now = new Date().toISOString();

    const task = TaskSchema.parse({
      id: randomUUID(),

      investigationId: input.investigationId,

      title: input.title,

      description: input.description,

      assignedTo: input.assignedTo,

      priority: input.priority,

      dueDate: input.dueDate,

      evidenceIds: input.evidenceIds ?? [],

      entityIds: input.entityIds ?? [],

      status: "todo",

      createdAt: now,

      updatedAt: now,
    });

    return {
      success: true,
      message: "Task created successfully",
      task,
    };
  }
}