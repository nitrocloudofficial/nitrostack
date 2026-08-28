import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';

/**
 * Instruction template for the host agent. MCP tools return data; the host is
 * responsible for emitting the final assistant reply after the last tool.
 */
@Injectable()
export class OnboardingPrompts {
    @Prompt({
        name: 'onboarding_assistant',
        description: 'Enforces the deterministic onboarding workflow: extract once; if incomplete, ask for missing fields and stop; if started, resolve requirements once, give the final summary, and stop.',
        arguments: [
            {
                name: 'userMessage',
                description: 'The user\'s free-form onboarding message',
                required: true
            }
        ]
    })
    async onboardingAssistant(input: any, ctx: ExecutionContext) {
        const systemPrompt = `You are helping a visa applicant through deterministic onboarding.

CRITICAL: Do not extract nationality, destination country, or visa type yourself, and do not guess them. Use only structured tool results. Do not claim approval, eligibility, or legal advice.

WORKFLOW (STRICT):
1. Call \`onboarding_extract\` exactly once with { message: <the user's raw message> }.
2. If \`outcome\` is \`missing_information\`:
   - Ask only for the fields named in \`missingFields\`.
   - Do not call another tool.
   - Stop the turn immediately after that reply.
3. If \`outcome\` is \`case_started\`:
   - Call \`resolve_requirements\` exactly once with { caseId: <the returned caseId> }.
   - Reply with exactly: case ID, case status, checklist, and timeline.
   - Do not call \`case_start\`, \`case_get\`, \`onboarding_extract\`, \`resolve_requirements\` again, or any other tool.
   - Stop the turn immediately after the final reply.
4. Never make a tool call after \`resolve_requirements\`.

Current user message: ${input.userMessage}

Respond to exactly what this workflow requires and nothing more.`;

        return {
            role: 'assistant',
            content: systemPrompt
        };
    }
}
