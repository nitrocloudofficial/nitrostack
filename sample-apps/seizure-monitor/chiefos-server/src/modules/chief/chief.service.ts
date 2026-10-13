import { Injectable } from "@nitrostack/core";

export interface WorkRequest {
  id: string;
  type: "email" | "meeting" | "calendar" | "task";
  title: string;
  description: string;
}

export interface ChiefRecommendation {
  selectedAgent: string;
  priority: "low" | "medium" | "high" | "critical";
  confidence: number;
  requiresApproval: boolean;
  action: string;
  reason: string;
}

@Injectable()
export class ChiefService {

  async initialize(): Promise<void> {
    console.log("ChiefOS Ready");
  }

  async triageWorkItem(
    workItem: WorkRequest
  ): Promise<ChiefRecommendation> {

    const text =
      `${workItem.title} ${workItem.description}`.toLowerCase();

    let priority: "low" | "medium" | "high" | "critical" = "low";
    let confidence = 0.8;

    if (
      text.includes("critical") ||
      text.includes("security") ||
      text.includes("production")
    ) {
      priority = "critical";
      confidence = 0.99;
    }
    else if (
      text.includes("urgent") ||
      text.includes("deadline") ||
      text.includes("asap")
    ) {
      priority = "high";
      confidence = 0.94;
    }
    else if (
      text.includes("meeting") ||
      text.includes("review")
    ) {
      priority = "medium";
      confidence = 0.87;
    }

    return {

      selectedAgent: this.selectAgent(workItem.type),

      priority,

      confidence,

      requiresApproval:
        priority === "high" ||
        priority === "critical",

      action: this.getAction(workItem.type, priority),

      reason:
        `Automatically classified as ${priority} priority.`

    };

  }

  private selectAgent(type: string): string {

    switch (type) {

      case "email":
        return "Email Triage Agent";

      case "meeting":
        return "Meeting Scheduler Agent";

      case "calendar":
        return "Calendar Agent";

      case "task":
        return "Task Manager Agent";

      default:
        return "General Agent";

    }

  }

  private getAction(
    type: string,
    priority: string
  ): string {

    if (priority === "critical")
      return "Immediate human approval required";

    if (priority === "high")
      return "Recommend approval";

    switch (type) {

      case "email":
        return "Summarize email";

      case "meeting":
        return "Schedule meeting";

      case "calendar":
        return "Resolve calendar";

      case "task":
        return "Prioritize task";

      default:
        return "Review manually";

    }

  }

}