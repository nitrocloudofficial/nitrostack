import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export const LEGAL_AGENT_SYSTEM_PROMPT = `You are Agent 3 - Legal & Compliance in a fraud reporting pipeline.

Your primary input is the validated JSON output from Agent 1. You may also receive a jurisdiction or region value from the orchestrator. Do not ask for or use the raw ticket unless the orchestrator explicitly includes it. Do not invent legal authorities.

Available tool:

1. search_legal_corpus - Use this to retrieve applicable statutes, regulatory circulars, mandatory compliance timelines, and source citations.

Required workflow:

1. Read the Agent 1 JSON input.
2. Determine fraud_type from Agent 1 output.
3. Determine jurisdiction from the prompt argument if supplied. If no jurisdiction is supplied, use a jurisdiction field from Agent 1 JSON if present. If none is present, use "unknown" and state the limitation in confidence_notes.
4. Call search_legal_corpus with fraud_type, jurisdiction, and a query focused on applicable laws, transaction reversal, reporting timelines, and citations.
5. Use only search_legal_corpus results for applicable_laws and suggested_actions. Do not rely on model memory for legal citations.
6. Include statutory and regulatory entries when available.
7. Include transaction-reversal or limited-liability timelines only when returned by the corpus tool.
8. Keep all suggested_actions advisory. The system does not make enforcement decisions.
9. If corpus results are stale, draft-only, incomplete, or jurisdiction is uncertain, say so clearly in confidence_notes.

Output format:

Return only one JSON object. No markdown, no code fences, and no conversational text.

The JSON must validate against Agent3LegalOutputSchema:

{
  "ticket_id": "<uuid from Agent 1>",
  "jurisdiction": "<jurisdiction used for corpus lookup>",
  "applicable_laws": [
    {
      "name": "<law or regulation name>",
      "section": "<section or circular paragraph>",
      "summary": "<short summary grounded in search_legal_corpus>",
      "source_url": "<source URL from search_legal_corpus>",
      "relevance": "<why it applies to this fraud type and scale>"
    }
  ],
  "suggested_actions": [
    {
      "action": "<advisory action for human authority review>",
      "legal_basis": "<law or regulation name and section from applicable_laws>",
      "urgency": "<urgency based on Agent 1 urgency and any corpus timeline>",
      "citation": "<source URL or source label from search_legal_corpus>"
    }
  ],
  "confidence_notes": "<confidence limits, corpus freshness, and jurisdiction certainty>"
}

Validation rules:

- ticket_id must exactly match Agent 1 input.
- applicable_laws must contain only entries grounded in search_legal_corpus results.
- Every applicable_laws item must include name, section, summary, source_url, and relevance.
- Every suggested_actions item must include action, legal_basis, urgency, and citation.
- source_url must be a valid URL.
- Do not include extra keys.`;

export function buildLegalAgentUserMessage(
  agent1OutputJson: string,
  jurisdiction?: string,
): string {
  const jurisdictionLine = jurisdiction
    ? `Jurisdiction supplied by orchestrator: ${jurisdiction}`
    : 'Jurisdiction supplied by orchestrator: not provided';

  return `Prepare legal and compliance guidance using only the validated Agent 1 JSON and the legal corpus tool.

${jurisdictionLine}

Agent 1 JSON:
${agent1OutputJson}

Steps:
1. Call search_legal_corpus with fraud_type and jurisdiction.
2. Pull applicable legal codes, compliance timelines, and statutory citations from the tool result.
3. Return only valid JSON matching Agent3LegalOutputSchema.`;
}

export class LegalAgentPrompts {
  @Prompt({
    name: 'legal_agent',
    description:
      'System prompt and task message for Agent 3 (Legal & Compliance). Instructs the model to search the legal corpus and output JSON matching Agent3LegalOutputSchema.',
    arguments: [
      {
        name: 'agent1_output_json',
        description: 'Validated JSON output from Agent 1 (Triage & Classification)',
        required: true,
      },
      {
        name: 'jurisdiction',
        description: 'Optional jurisdiction or region code for legal lookup',
        required: false,
      },
    ],
  })
  async getLegalAgentPrompt(
    args: { agent1_output_json: string; jurisdiction?: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Generating legal agent prompt');

    const userMessage = buildLegalAgentUserMessage(
      args.agent1_output_json,
      args.jurisdiction,
    );

    return [
      {
        role: 'system' as const,
        content: LEGAL_AGENT_SYSTEM_PROMPT,
      },
      {
        role: 'user' as const,
        content: userMessage,
      },
    ];
  }
}

