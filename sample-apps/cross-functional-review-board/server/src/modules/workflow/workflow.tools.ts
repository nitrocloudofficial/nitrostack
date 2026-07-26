import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { ProductTools } from '../product/product.tools.js';
import { EngineeringTools } from '../engineering/engineering.tools.js';
import { SecurityTools } from '../security/security.tools.js';
import { LegalTools } from '../legal/legal.tools.js';
import { DebateService } from '../debate/debate.service.js';
import { ModeratorTools } from '../moderator/moderator.tools.js';
import { DepartmentOutput, ModeratorOutput } from '../shared/types.js';

export class WorkflowTools {
  private productTools = new ProductTools();
  private engineeringTools = new EngineeringTools();
  private securityTools = new SecurityTools();
  private legalTools = new LegalTools();
  private debateService = new DebateService();
  private moderatorTools = new ModeratorTools();

  @Tool({
    name: 'run_full_review_board',
    description: 'Run full end-to-end Decision Review Board workflow (Round 0 parallel reviews, Estimate Reconciliation, Debate, and Moderator Synthesis).',
    inputSchema: z.object({
      proposalTitle: z.string().min(1, 'Proposal title required'),
      proposalDescription: z.string().min(1, 'Proposal description required')
    })
  })
  async runFullWorkflow(
    input: { proposalTitle: string; proposalDescription: string },
    ctx: ExecutionContext
  ): Promise<{
    agentOutputs: DepartmentOutput[];
    reconciled: boolean;
    finalReport: ModeratorOutput;
  }> {
    ctx.logger.info('Starting full review board workflow', { title: input.proposalTitle });

    try {
      // Step 1: Round 0 Department Reviews (Parallel execution for maximum speed)
      ctx.logger.info('Step 1: Running Round 0 parallel department reviews...');
      const [prodRes, engRes, secRes, legRes] = await Promise.all([
        this.productTools.reviewProposal(input, ctx),
        this.engineeringTools.reviewProposal(input, ctx),
        this.securityTools.reviewProposal(input, ctx),
        this.legalTools.reviewProposal(input, ctx)
      ]);

      let prodOutput = prodRes;
      let engOutput = engRes;
      let secOutput = secRes;
      let legOutput = legRes;

      // Step 2: Estimate Reconciliation
      ctx.logger.info('Step 2: Performing Estimate Reconciliation pass');
      const reconciliation = this.debateService.reconcileEstimates(prodOutput, engOutput);
      prodOutput = reconciliation.productOutput;

      let currentOutputs = [prodOutput, engOutput, secOutput, legOutput];

      // Step 3: Debate Round Cycle
      ctx.logger.info('Step 3: Running Debate Round Cycle...');
      const proposalText = `Title: ${input.proposalTitle}\n\nDescription: ${input.proposalDescription}`;
      const debateRes = await this.debateService.runFullDebateCycle(currentOutputs, proposalText, ctx);
      currentOutputs = debateRes.outputs;

      // Step 4: Moderator Synthesis
      ctx.logger.info('Step 4: Generating final Moderator report with deterministic decision rules');
      const finalReport = await this.moderatorTools.synthesizeReport(
        {
          proposalTitle: input.proposalTitle,
          proposalDescription: input.proposalDescription,
          agentOutputs: currentOutputs
        },
        ctx
      );

      ctx.logger.info('Full decision review board workflow finished successfully', { decision: finalReport.decision });

      return {
        agentOutputs: currentOutputs,
        reconciled: reconciliation.reconciled,
        finalReport
      };
    } catch (err: any) {
      ctx.logger.error('Workflow execution encountered an unhandled error', { error: String(err) });

      // Return a safe fallback response so the client receives a structured response instead of a crash
      const fallbackReport: ModeratorOutput = {
        decision: 'blocked',
        decision_basis: 'System error encountered during review board execution: ' + (err?.message || String(err)),
        overall_summary: 'The review board workflow encountered an unexpected failure during processing. Proposal has been automatically blocked for manual review.',
        agent_alignment: {
          product: 'blocked',
          engineering: 'blocked',
          security: 'blocked',
          legal: 'blocked'
        },
        unresolved_risks: [
          {
            agent: 'security',
            concern_id: 'sys-error-1',
            why_unresolved: 'Workflow execution error: ' + (err?.message || String(err))
          }
        ],
        required_actions: [
          {
            concern_id: 'sys-error-1',
            action: 'Inspect system execution logs and re-run review board workflow.',
            owner_agent: 'engineering'
          }
        ]
      };

      return {
        agentOutputs: [],
        reconciled: false,
        finalReport: fallbackReport
      };
    }
  }
}
