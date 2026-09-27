import {
  ToolDecorator as Tool,
  z,
  ExecutionContext,
  Injectable,
} from "@nitrostack/core";

import { NotificationsEngine } from "./notifications.engine.js";

@Injectable()
export class NotificationsTools {
  constructor(
    private readonly engine: NotificationsEngine
  ) {}

  @Tool({
    name: "get_notifications",
    description: "Returns all enterprise notifications.",
    inputSchema: z.object({}),
  })
  async getNotifications(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching notifications");

    return await this.engine.getNotifications();
  }

  @Tool({
    name: "get_critical_notifications",
    description: "Returns all critical notifications.",
    inputSchema: z.object({}),
  })
  async getCriticalNotifications(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching critical notifications");

    return await this.engine.getCriticalNotifications();
  }

  @Tool({
    name: "get_open_notifications",
    description: "Returns all open notifications.",
    inputSchema: z.object({}),
  })
  async getOpenNotifications(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching open notifications");

    return await this.engine.getOpenNotifications();
  }

  @Tool({
    name: "get_notification_summary",
    description: "Returns notification statistics.",
    inputSchema: z.object({}),
  })
  async getNotificationSummary(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching notification summary");

    return await this.engine.getNotificationSummary();
  }
}