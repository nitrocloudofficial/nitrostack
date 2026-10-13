import { ToolDecorator as Tool, UseInterceptors, ExecutionContext, z } from "@nitrostack/core";
import { InvestigationTraceInterceptor } from "../investigation/investigation.interceptor.js";
import { FINDING_CLASSES, type FindingClass } from "../triage/triage-rules.js";
import { suggestMitigations } from "./mitigation-rules.js";

const FINDING_CLASS_VALUES = FINDING_CLASSES as unknown as [FindingClass, ...FindingClass[]];

export class MitigationTools {
  @Tool({
    name: "suggest_mitigation",
    description:
      "For a finding with no fix yet (or any finding you want a stopgap for), suggests compensating controls — " +
      "WAF rules, feature flags, network restrictions, monitoring — from a fixed, reviewable rule set. This is a " +
      "suggestion for a human to evaluate and apply, never an automatic action; WARDEN does not touch firewalls, " +
      "feature flags, or WAF configuration itself.",
    inputSchema: z.object({
      finding_class: z.enum(FINDING_CLASS_VALUES).describe("The class of finding to suggest a compensating control for — same taxonomy as triage_finding."),
    }),
  })
  @UseInterceptors(InvestigationTraceInterceptor)
  async suggestMitigation(input: { finding_class: FindingClass }, _ctx: ExecutionContext) {
    const mitigations = suggestMitigations(input.finding_class);
    return {
      finding_class: input.finding_class,
      mitigations,
      note:
        mitigations.length > 0
          ? "These are suggestions for a human to evaluate and apply — WARDEN does not execute any of them."
          : "No standard compensating control is defined for this finding class yet.",
    };
  }
}
