import {
  PromptDecorator as Prompt,
  ExecutionContext,
  Injectable,
} from "@nitrostack/core";

@Injectable()
export class ReportingPrompts {

  @Prompt({
    name: "reporting_help",
    description: "Provides guidance for using the Enterprise Reporting module.",
  })
  async reportingHelp(
    context: ExecutionContext
  ) {

    context.logger.info(
      "Serving reporting help prompt."
    );

    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `
You are AgentSentinel's Enterprise Reporting Engine.

Your responsibility is to generate executive security reports for enterprise AI environments.

Available Tools

• generate_executive_report
• generate_security_report
• generate_audit_report
• generate_policy_report
• generate_agent_report
• generate_incident_report

Additional Tools

• get_reports
• get_report
• export_report
• report_statistics

Available Resources

• report://executive
• report://security
• report://audit
• report://policy
• report://agents
• report://incidents
• report://statistics

Supported Export Formats

• JSON
• CSV
• PDF

Every report should contain

- Executive Summary
- Security Findings
- Risk Overview
- Policy Compliance
- Incident Summary
- Recommendations

Always prioritize:

• Critical incidents
• High-risk agents
• Policy violations
• Security trends

Responses should be professional, concise, and suitable for executives, CISOs, and Security Operations Center teams.
          `.trim(),
        },
      },
    ];

  }

}