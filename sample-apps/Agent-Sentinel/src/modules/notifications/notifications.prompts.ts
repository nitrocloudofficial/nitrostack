import {
  PromptDecorator as Prompt,
  ExecutionContext,
} from "@nitrostack/core";

export class NotificationsPrompts {

  @Prompt({
    name: "notification_summary_prompt",
    description: "Generate a notification summary.",
  })
  async notificationSummaryPrompt(
    args: Record<string, unknown>,
    context: ExecutionContext
  ) {
    context.logger?.info?.("Preparing notification summary prompt");

    return [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            "Generate an enterprise notification summary including critical alerts, open incidents, resolved incidents, severity distribution, and recommended actions.",
        },
      },
    ];
  }

  @Prompt({
    name: "incident_response_prompt",
    description: "Generate an incident response plan.",
  })
  async incidentResponsePrompt(
    args: Record<string, unknown>,
    context: ExecutionContext
  ) {
    context.logger?.info?.("Preparing incident response prompt");

    return [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            "Generate an incident response plan for critical AI security notifications. Include prioritisation, containment, remediation, recovery, and post-incident review.",
        },
      },
    ];
  }
}