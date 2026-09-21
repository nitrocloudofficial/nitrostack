import {
  PromptDecorator as Prompt,
  Injectable,
  ExecutionContext,
} from "@nitrostack/core";

@Injectable()
export class AuditPrompts {

  @Prompt({
    name: "audit_help",
    description: "Enterprise Audit and Forensics Guide"
  })
  async helpPrompt(
    args: Record<string, unknown>,
    context: ExecutionContext
  ) {

    context.logger.info("Serving Audit Help Prompt");

    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `
You are using the AgentSentinel Enterprise Audit Module.

=========================================
PURPOSE
=========================================

The Audit Module records every security
and operational event performed by AI agents.

It enables:

• Compliance
• Incident Investigation
• Timeline Reconstruction
• Enterprise Reporting
• Risk Analytics

=========================================
AVAILABLE TOOLS
=========================================

1. record_event

Records an enterprise audit event.

-----------------------------------------

2. get_audit_history

Returns audit history for all agents
or a specific AI agent.

-----------------------------------------

3. investigate_incident

Creates a forensic incident report.

The report contains:

• Timeline
• Risk Analysis
• Severity
• Recommendations

-----------------------------------------

4. export_audit_report

Exports a complete enterprise audit report.

=========================================
AVAILABLE RESOURCES
=========================================

audit://logs

Returns all audit events.

-----------------------------------------

audit://statistics

Returns audit analytics.

-----------------------------------------

audit://incident-history

Returns high-risk security incidents.

=========================================
BEST PRACTICES
=========================================

• Record every AI action.

• Never delete audit history.

• Investigate HIGH and CRITICAL incidents.

• Export reports regularly.

• Preserve timestamps.

• Keep forensic evidence immutable.

=========================================
AGENTSENTINEL
Enterprise AI Security Operations Center
`
        }
      }
    ];

  }

}