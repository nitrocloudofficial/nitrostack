import { ToolDecorator as Tool, ExecutionContext, z } from "@nitrostack/core";
import { investigationStore } from "./store.js";

const CONFIDENCE_VALUES = ["high", "medium", "low"] as const;

export class InvestigationTools {
  @Tool({
    name: "note_decision",
    description:
      "Records a reasoning step in the current investigation's audit trail — what you chose, why, what you " +
      "discarded, and how confident you are. Call this after every meaningful choice, not just at the end. " +
      "This is what makes the agent's reasoning auditable instead of opaque.",
    inputSchema: z.object({
      investigation_id: z.string().describe("The investigation this decision belongs to."),
      decision: z.string().describe("What you decided."),
      reasoning: z.string().describe("Why you decided it."),
      confidence: z.enum(CONFIDENCE_VALUES).describe("How confident you are."),
      discarded: z.array(z.string()).optional().describe("Leads or options you considered and rejected."),
    }),
  })
  async noteDecision(
    input: {
      investigation_id: string;
      decision: string;
      reasoning: string;
      confidence: (typeof CONFIDENCE_VALUES)[number];
      discarded?: string[];
    },
    _ctx: ExecutionContext
  ) {
    investigationStore.addDecisionStep(
      input.investigation_id,
      input.decision,
      input.reasoning,
      input.confidence,
      input.discarded ?? []
    );
    const inv = investigationStore.get(input.investigation_id)!;

    return {
      recorded: true,
      investigation_id: input.investigation_id,
      step_number: inv.steps.length,
      resource: `cti://investigation/${input.investigation_id}`,
    };
  }
}
