import { Injectable } from "@nitrostack/core";
import { notifications } from "./notifications.data.js";

@Injectable()
export class NotificationsEngine {
  async getNotifications() {
    return notifications;
  }

  async getCriticalNotifications() {
    return notifications.filter(
      (n) => n.severity === "Critical"
    );
  }

  async getOpenNotifications() {
    return notifications.filter(
      (n) => n.status === "Open"
    );
  }

  async getNotificationSummary() {
    return {
      total: notifications.length,
      critical: notifications.filter(
        (n) => n.severity === "Critical"
      ).length,
      open: notifications.filter(
        (n) => n.status === "Open"
      ).length,
      resolved: notifications.filter(
        (n) => n.status === "Resolved"
      ).length,
    };
  }
}