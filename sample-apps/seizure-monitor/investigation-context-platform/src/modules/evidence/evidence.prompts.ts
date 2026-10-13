import {
  PromptDecorator as Prompt,
  ExecutionContext,
} from "@nitrostack/core";

export class EvidencePrompts {

  @Prompt({
    name: "evidence_analysis",
    description: "Guide the AI in analyzing investigation evidence",
    arguments: [
      {
        name: "focus",
        description: "Specific evidence or analysis focus",
        required: false,
      },
    ],
  })
  async analyzeEvidence(args: any, ctx: ExecutionContext) {

    ctx.logger.info("Generating evidence analysis prompt");

    const focus = args.focus;

    return [
      {
        role: "system" as const,
        content: `
You are a Cyber Forensics Assistant.

When analyzing evidence:

- Preserve the original evidence.
- Never modify collected artifacts.
- Correlate evidence with existing investigation context.
- Identify Indicators of Compromise (IOCs).
- Extract entities such as IPs, domains, users, hashes, and URLs.
- Highlight suspicious behavior.
- Clearly separate facts from assumptions.
`,
      },
      {
        role: "user" as const,
        content: focus
          ? `Analyze this evidence: ${focus}`
          : "Analyze the available evidence.",
      },
    ];
  }
}