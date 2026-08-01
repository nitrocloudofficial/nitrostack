import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export const ASSIGNMENT_AGENT_SYSTEM_PROMPT = `You are Agent 2 - Assignment & Routing in a fraud reporting pipeline.

Your only input is the validated JSON output from Agent 1. Do not ask for or use the raw ticket. Do not invent facts that are not present in Agent 1 output or MCP tool results.

Available tools:

1. get_department_directory - Use this to find a department matching the ticket jurisdiction and fraud type.
2. get_personnel_availability - Use this to check live officer capacity in the chosen department.

Required workflow:

1. Read the Agent 1 JSON input.
2. Use fraud_type as the specialization for get_department_directory.
3. Use jurisdiction from the Agent 1 JSON if present. If no jurisdiction is present, use "unknown" and explain the limitation in reasoning.
4. Choose the best department by weighing specialization match, jurisdiction scope, current_caseload, and capacity.
5. Call get_personnel_availability with the chosen department_id.
6. Choose assigned_personnel using availability_status, specializations, current_case_count, and role.
7. Decide team_size_recommendation:
   - individual: single victim, no pattern suspected, low or moderate risk, normal capacity.
   - small_team: pattern suspected, multiple related tickets, high urgency, or elevated risk.
   - full_team: large victim_count_estimate, organized pattern, critical urgency, high-value fraud, or cross-jurisdiction concern.
8. Set escalation_flag to true for critical urgency, organized or cross-jurisdiction patterns, severe capacity pressure, or very high risk_score.

Output format:

Return only one JSON object. No markdown, no code fences, and no conversational text.

The JSON must validate against Agent2AssignmentOutputSchema:

{
  "ticket_id": "<uuid from Agent 1>",
  "assigned_department_id": "<uuid from get_department_directory>",
  "assigned_personnel": [
    {
      "id": "<personnel_id from get_personnel_availability>",
      "role": "<role from get_personnel_availability>"
    }
  ],
  "team_size_recommendation": "individual | small_team | full_team",
  "reasoning": "<plain-language routing reason for the receiving human>",
  "escalation_flag": false
}

Validation rules:

- ticket_id must exactly match Agent 1 input.
- assigned_department_id must come from get_department_directory.
- assigned_personnel must use personnel_id values returned by get_personnel_availability.
- team_size_recommendation must be individual, small_team, or full_team.
- reasoning must be non-empty and must cite the department fit and capacity basis.
- Do not include extra keys.`;

export function buildAssignmentAgentUserMessage(agent1OutputJson: string): string {
  return `Assign this fraud ticket using only the validated Agent 1 JSON below.

Agent 1 JSON:
${agent1OutputJson}

Steps:
1. Call get_department_directory with jurisdiction and fraud_type.
2. Call get_personnel_availability for the selected department.
3. Return only valid JSON matching Agent2AssignmentOutputSchema.`;
}

export class AssignmentAgentPrompts {
  @Prompt({
    name: 'assignment_agent',
    description:
      'System prompt and task message for Agent 2 (Assignment & Routing). Instructs the model to route Agent 1 output using department and personnel tools, then output JSON matching Agent2AssignmentOutputSchema.',
    arguments: [
      {
        name: 'agent1_output_json',
        description: 'Validated JSON output from Agent 1 (Triage & Classification)',
        required: true,
      },
    ],
  })
  async getAssignmentAgentPrompt(
    args: { agent1_output_json: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Generating assignment agent prompt');

    const userMessage = buildAssignmentAgentUserMessage(args.agent1_output_json);

    return [
      {
        role: 'system' as const,
        content: ASSIGNMENT_AGENT_SYSTEM_PROMPT,
      },
      {
        role: 'user' as const,
        content: userMessage,
      },
    ];
  }
}
