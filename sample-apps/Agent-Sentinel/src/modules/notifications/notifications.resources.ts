import {
  ResourceDecorator as Resource,
  ExecutionContext,
  Injectable,
} from "@nitrostack/core";

import { NotificationsEngine } from "./notifications.engine.js";

@Injectable()
export class NotificationsResources {
  constructor(
    private readonly engine: NotificationsEngine
  ) {}

  @Resource({
    uri: "notifications://all",
    name: "Enterprise Notifications",
    description: "Returns all enterprise notifications.",
    mimeType: "application/json",
  })
  async notifications(
    context: ExecutionContext
  ) {
    return {
      type: "text" as const,
      text: JSON.stringify(
        await this.engine.getNotifications(),
        null,
        2
      ),
    };
  }

  @Resource({
    uri: "notifications://summary",
    name: "Notification Summary",
    description: "Returns notification summary.",
    mimeType: "application/json",
  })
  async summary(
    context: ExecutionContext
  ) {
    return {
      type: "text" as const,
      text: JSON.stringify(
        await this.engine.getNotificationSummary(),
        null,
        2
      ),
    };
  }
}