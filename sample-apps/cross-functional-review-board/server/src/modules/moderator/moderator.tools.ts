import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { LLMService, defaultLLMService } from '../shared/llm/llm.service.js';
import {
  BaseDepartmentOutputSchema,
  DepartmentOutput,
  ModeratorOutput,
  ModeratorOutputSchema,
  ModeratorDecision,
  Concern
} from '../shared/types.js';

export class ModeratorTools {
  private llmService: LLMService;

  constructor(llmService?: LLMService) {
    this.llmService = llmService ?? defaultLLMService;
  }

  @Tool({
    name: 'synthesize_final_report',
    description: 'Synthesize outputs from Product, Engineering, Security, and Legal agents into a final report using 100% deterministic decision logic.',
    inputSchema: z.object({
      proposalTitle: z.string().min(1, 'Title required'),
      proposalDescription: z.string().min(1, 'Description required'),
      agentOutputs: z.array(BaseDepartmentOutputSchema)
    })
  })
  async synthesizeReport(input: any, ctx: ExecutionContext): Promise<ModeratorOutput> {
    ctx.logger.info('Synthesizing final report (Moderator)', { title: input.proposalTitle });

    const agentOutputs: DepartmentOutput[] = input.agentOutputs;
    const allConcerns: (Concern & { agent: string })[] = [];
    
    agentOutputs.forEach(output => {
      output.concerns.forEach(c => {
        allConcerns.push({ ...c, agent: output.agent });
      });
    });

    // --- Deterministic Decision Engine (Rules 1-4) ---
    const hasEscalatedSecOrLeg = allConcerns.some(
      c => (c.agent === 'security' || c.agent === 'legal') && c.status === 'escalated' && c.severity === 'high'
    );
    const hasBlockedVerdict = agentOutputs.some(a => a.verdict === 'blocked');
    const hasFlaggedVerdict = agentOutputs.some(a => a.verdict === 'flagged');
    const hasUnresolvedConcerns = allConcerns.some(c => c.status !== 'resolved');

    let decision: ModeratorDecision;
    let decisionBasis: string;

    if (hasEscalatedSecOrLeg) {
      decision = 'blocked';
      decisionBasis = 'Rule 1: An escalated High-Severity Security or Legal concern exists — domain owners hold veto authority. Deployment cannot proceed.';
    } else if (hasBlockedVerdict) {
      decision = 'blocked';
      decisionBasis = 'Rule 2: At least one department output verdict is blocked due to unmitigatable high-risk policy violations. Deployment cannot proceed.';
    } else if (hasFlaggedVerdict || hasUnresolvedConcerns) {
      decision = 'approved_with_conditions';
      decisionBasis = 'Rule 3: The proposal demonstrates clear business value and is technically feasible. However, deployment is contingent upon completion of mandatory actions identified during cross-functional review.';
    } else {
      decision = 'approved';
      decisionBasis = 'Rule 4: All department verdicts are approved and all concerns have been fully resolved.';
    }

    // Build unresolved risks & required actions deterministically from concerns
    const unresolved_risks = allConcerns
      .filter(c => c.status !== 'resolved')
      .map(c => ({
        concern_id: c.id,
        agent: c.agent as 'product' | 'engineering' | 'security' | 'legal',
        why_unresolved: `[Severity: ${c.severity}] ${c.issue}`
      }));

    const required_actions = allConcerns
      .filter(c => c.status !== 'resolved')
      .map(c => ({
        action: c.recommendation,
        owner_agent: c.agent as 'product' | 'engineering' | 'security' | 'legal',
        concern_id: c.id
      }));

    const agent_alignment = {
      product: (agentOutputs.find(a => a.agent === 'product')?.verdict ?? 'approved') as any,
      engineering: (agentOutputs.find(a => a.agent === 'engineering')?.verdict ?? 'approved') as any,
      security: (agentOutputs.find(a => a.agent === 'security')?.verdict ?? 'approved') as any,
      legal: (agentOutputs.find(a => a.agent === 'legal')?.verdict ?? 'approved') as any
    };

    // Use LLM ONLY to generate the executive summary prose
    const summaryPrompt = `You are the Moderator of a Decision Review Board.
The decision has ALREADY been calculated deterministically as: "${decision}".
Decision Basis: "${decisionBasis}"

Agent Alignment: ${JSON.stringify(agent_alignment)}
Unresolved Risks: ${JSON.stringify(unresolved_risks)}

Write a concise 2-3 sentence executive summary for senior leaders summarizing why this proposal is ${decision}. Return ONLY plain text prose (no JSON, no markdown fences).`;

    const userPrompt = `Proposal Title: ${input.proposalTitle}\n\nProposal Description: ${input.proposalDescription}`;

    let overall_summary = '';
    try {
      overall_summary = await this.llmService.generateText(summaryPrompt, userPrompt, { temperature: 0.2 });
    } catch {
      overall_summary = decision === 'approved_with_conditions'
        ? 'The proposal demonstrates clear business value and technical feasibility. However, production deployment is contingent upon completing mandatory security, legal, and engineering actions.'
        : decision === 'blocked'
        ? 'The proposal has been blocked due to severe unresolved privacy, legal, or security policy violations that cannot be mitigated.'
        : 'The proposal has been fully approved with zero outstanding policy blockers.';
    }

    const finalReport: ModeratorOutput = {
      decision,
      decision_basis: decisionBasis,
      overall_summary: overall_summary.trim(),
      unresolved_risks,
      required_actions,
      agent_alignment
    };

    // Validate report against ModeratorOutputSchema before returning
    const validatedReport = ModeratorOutputSchema.parse(finalReport);

    ctx.logger.info('Report synthesis complete', { decision: validatedReport.decision });
    return validatedReport;
  }
}
