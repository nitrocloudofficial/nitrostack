import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export interface PromptMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export class VerichainPrompts {
    @Prompt({
        name: 'planner_prompt',
        description: 'Prompt template to guide the Planner Agent.',
        arguments: [
            { name: 'query', description: 'The request or problem to evaluate.', required: true }
        ]
    })
    async plannerPrompt(args: { query: string }, ctx: ExecutionContext): Promise<PromptMessage[]> {
        ctx.logger.info("MCP Prompt: Generating planner prompt template.");
        return [
            {
                role: 'user',
                content: `You are the Planner Agent. Analyze the user request: '${args.query}'.\n` +
                         "Draft a step-by-step verification plan identifying:\n" +
                         "1. What compliance standards apply.\n" +
                         "2. What key numerical, date, or signatory parameters need extraction.\n" +
                         "3. Which documents contain these facts."
            }
        ];
    }

    @Prompt({
        name: 'evidence_prompt',
        description: 'Prompt template for the Evidence Extraction Agent.',
        arguments: [
            { name: 'document_text', description: 'Raw document text context.', required: true }
        ]
    })
    async evidencePrompt(args: { document_text: string }, ctx: ExecutionContext): Promise<PromptMessage[]> {
        ctx.logger.info("MCP Prompt: Generating evidence prompt template.");
        return [
            {
                role: 'user',
                content: "Analyze the following document context:\n" +
                         `--- DOCUMENT START ---\n${args.document_text}\n--- DOCUMENT END ---\n` +
                         "Extract all key facts, numerical statements, signatory names, dates, or version labels. " +
                         "For each fact, write the entity, the specific claim statement, value, and location."
            }
        ];
    }

    @Prompt({
        name: 'verification_prompt',
        description: 'Prompt template for the Verification Agent to score credibility.',
        arguments: [
            { name: 'claims_json', description: 'JSON list of extracted claims.', required: true }
        ]
    })
    async verificationPrompt(args: { claims_json: string }, ctx: ExecutionContext): Promise<PromptMessage[]> {
        ctx.logger.info("MCP Prompt: Generating verification prompt template.");
        return [
            {
                role: 'user',
                content: "Review this JSON list of extracted claims:\n" +
                         `${args.claims_json}\n` +
                         "Evaluate the credibility score of each claim (0.0 to 1.0) and determine its verification status. " +
                         "Official documents (PDF, Docx contracts) score higher than loose notes (.txt files)."
            }
        ];
    }

    @Prompt({
        name: 'conflict_prompt',
        description: 'Prompt template for the Conflict Detection Agent to scan for contradictions.',
        arguments: [
            { name: 'claims_json', description: 'JSON list of verified claims.', required: true }
        ]
    })
    async conflictPrompt(args: { claims_json: string }, ctx: ExecutionContext): Promise<PromptMessage[]> {
        ctx.logger.info("MCP Prompt: Generating conflict prompt template.");
        return [
            {
                role: 'user',
                content: "Review these verified claims:\n" +
                         `${args.claims_json}\n` +
                         "Scan for discrepancies such as:\n" +
                         "1. Version differences (older dates vs newer dates).\n" +
                         "2. Budget discrepancies (different cost statements for same items).\n" +
                         "3. Legal/signatory mismatches or missing signatures."
            }
        ];
    }

    @Prompt({
        name: 'risk_prompt',
        description: 'Prompt template for the Risk Agent to rate financial/operational risk.',
        arguments: [
            { name: 'claims_json', description: 'JSON list of claims.', required: true },
            { name: 'conflicts_json', description: 'JSON list of detected conflicts.', required: true }
        ]
    })
    async riskPrompt(args: { claims_json: string, conflicts_json: string }, ctx: ExecutionContext): Promise<PromptMessage[]> {
        ctx.logger.info("MCP Prompt: Generating risk prompt template.");
        return [
            {
                role: 'user',
                content: "Based on these claims:\n" +
                         `${args.claims_json}\n` +
                         "and these detected conflicts:\n" +
                         `${args.conflicts_json}\n` +
                         "Calculate the risk percentage (0 to 100) across Financial, Compliance, Operational, and Business risks."
            }
        ];
    }

    @Prompt({
        name: 'decision_prompt',
        description: 'Prompt template for the Decision Agent to structure recommendations.',
        arguments: [
            { name: 'explanation_markdown', description: 'Final reasoning and risk markdown.', required: true }
        ]
    })
    async decisionPrompt(args: { explanation_markdown: string }, ctx: ExecutionContext): Promise<PromptMessage[]> {
        ctx.logger.info("MCP Prompt: Generating decision prompt template.");
        return [
            {
                role: 'user',
                content: "Review the final reasoning and risk evaluations:\n" +
                         `${args.explanation_markdown}\n` +
                         "Render the final recommendation status ('APPROVE', 'REJECT', or 'REVIEW') and state next steps."
            }
        ];
    }
}
