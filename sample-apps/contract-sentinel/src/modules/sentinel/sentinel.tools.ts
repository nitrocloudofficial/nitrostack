import { Injectable, ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { ContractStoreService } from '../intake/contract-store.service.js';
import { PortfolioViewService } from './portfolio-view.service.js';
import { RiskScoringService } from './risk-scoring.service.js';
import { NOT_LEGAL_ADVICE, type ContractStatus } from '../intake/contract.types.js';

@Injectable({ deps: [ContractStoreService, RiskScoringService, PortfolioViewService] })
export class SentinelTools {
  constructor(
    private store: ContractStoreService,
    private scoring: RiskScoringService,
    private view: PortfolioViewService,
  ) {}

  /**
   * The autonomous agent loop: perceive → decide → act.
   *
   * Declared with `taskSupport: 'optional'` so it can be invoked as an MCP Task
   * (task-augmented `tools/call`, with progress reported through `ctx.task`) or
   * synchronously on demand. In production this would be driven by a scheduler
   * (e.g. nightly cron) rather than by a user question — nothing about the loop
   * depends on a prompt: it reads the whole portfolio, scores every contract,
   * and mutates status/recommendations by itself.
   */
  @Tool({
    name: 'run-sentinel-cycle',
    title: 'Run sentinel cycle (agent loop)',
    description:
      'Run the autonomous Contract Sentinel agent loop over the entire tracked portfolio: perceive every contract, score its clause risk with full evidence, decide whether it needs action (deadline close, high risk score, or never reviewed), then act by setting status to needs_attention and recording a recommended action (renew as-is / renegotiate with talking points / let lapse). Designed to run on a schedule in production; runnable on demand here. Renders the contract-board widget.',
    inputSchema: z.object({
      dryRun: z
        .boolean()
        .optional()
        .describe('When true, score and decide but do not write status changes back to the portfolio'),
      onlyContractId: z
        .string()
        .optional()
        .describe('Restrict the cycle to a single contract id instead of the whole portfolio'),
    }),
    taskSupport: 'optional',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    invocation: { invoking: 'Running sentinel cycle…', invoked: 'Sentinel cycle complete' },
    examples: {
      request: { dryRun: false },
      response: {
        cycle: {
          contractsPerceived: 9,
          contractsNeedingAction: 6,
          statusesUpdated: 6,
        },
      },
    },
  })
  @Widget({
    route: 'contract-board',
    prefersBorder: true,
    csp: { resourceDomains: ['https://images.unsplash.com'] },
  })
  async runSentinelCycle(input: { dryRun?: boolean; onlyContractId?: string }, ctx: ExecutionContext) {
    const dryRun = input?.dryRun === true;
    const startedAt = new Date();

    // ------------------------------------------------------------- PERCEIVE
    ctx.task?.updateProgress('Perceiving: reading every tracked contract from the portfolio…');
    const all = this.store.list();
    const perceived = input?.onlyContractId
      ? all.filter((contract) => contract.id === input.onlyContractId)
      : all;

    ctx.logger.info('Sentinel cycle perceive phase complete', {
      contractsPerceived: perceived.length,
      dryRun,
    });

    if (perceived.length === 0) {
      const emptyBoard = this.view.buildBoard('all');
      return {
        cycle: {
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          dryRun,
          scheduleNote:
            'In production this loop runs unattended on a schedule (e.g. nightly cron / queue worker); on-demand invocation here is only for inspection.',
          contractsPerceived: 0,
          contractsNeedingAction: 0,
          statusesUpdated: 0,
          decisions: [],
        },
        ...emptyBoard,
        message: input?.onlyContractId
          ? `No tracked contract with id "${input.onlyContractId}".`
          : 'No contracts are tracked yet. Ingest one with ingest-contract.',
        disclaimer: NOT_LEGAL_ADVICE,
      };
    }

    // --------------------------------------------------------------- DECIDE
    ctx.task?.updateProgress(`Deciding: scoring ${perceived.length} contracts against company profile…`);

    const decisions = perceived.map((contract, index) => {
      ctx.task?.throwIfCancelled();
      const assessment = this.scoring.assess(contract, startedAt);
      ctx.task?.updateProgress(
        `Scored ${index + 1}/${perceived.length}: ${contract.title} → ${assessment.riskScore} (${assessment.classification})`,
      );
      return { contract, assessment };
    });

    // ------------------------------------------------------------------ ACT
    ctx.task?.updateProgress('Acting: flagging contracts that need attention…');

    let statusesUpdated = 0;
    const actions = decisions.map(({ contract, assessment }) => {
      const previousStatus: ContractStatus = contract.status;
      const nextStatus: ContractStatus = assessment.needsAction ? 'needs_attention' : 'reviewed';
      const detail = `${assessment.recommendedAction.label}: ${assessment.recommendedAction.talkingPoints.join(' | ')}`;

      if (!dryRun) {
        this.store.applyCycleResult(contract.id, {
          status: nextStatus,
          riskScore: assessment.riskScore,
          classification: assessment.classification,
          recommendedAction: assessment.recommendedAction.action,
          recommendedActionDetail: detail,
        });
        if (previousStatus !== nextStatus) statusesUpdated += 1;
      }

      return {
        contractId: contract.id,
        title: contract.title,
        counterparty: contract.counterparty,
        imageUrl: contract.imageUrl,
        riskScore: assessment.riskScore,
        classification: assessment.classification,
        dangerThreshold: assessment.dangerThreshold,
        previousStatus,
        newStatus: dryRun ? previousStatus : nextStatus,
        needsAction: assessment.needsAction,
        actionReasons: assessment.actionReasons,
        recommendedAction: assessment.recommendedAction.action,
        recommendedActionLabel: assessment.recommendedAction.label,
        talkingPoints: assessment.recommendedAction.talkingPoints,
        deadline: contract.deadline,
        daysUntilDeadline: assessment.daysUntilDeadline,
        drivingClause: {
          label: assessment.drivingClause.label,
          weight: assessment.drivingClause.weight,
          clauseText: assessment.drivingClause.clauseText,
          rationale: assessment.drivingClause.rationale,
        },
        allFactors: assessment.factors.map((factor) => ({
          label: factor.label,
          weight: factor.weight,
          clauseText: factor.clauseText,
          rationale: factor.rationale,
        })),
        scoreExplanation: assessment.scoreExplanation,
        profileAdjustment: assessment.profileAdjustment,
        disclaimer: assessment.disclaimer,
      };
    });

    const board = this.view.buildBoard('all');
    const needingAction = actions.filter((action) => action.needsAction).length;

    ctx.logger.info('Sentinel cycle complete', {
      contractsPerceived: perceived.length,
      contractsNeedingAction: needingAction,
      statusesUpdated,
      dryRun,
    });

    ctx.task?.updateProgress(
      `Cycle complete: ${needingAction}/${perceived.length} contracts flagged as needs_attention.`,
    );

    return {
      cycle: {
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        dryRun,
        scheduleNote:
          'In production this loop runs unattended on a schedule (e.g. nightly cron / queue worker) and can be invoked as an MCP Task with progress notifications; the on-demand call here executes the identical perceive → decide → act loop.',
        phases: {
          perceive: `Read ${perceived.length} tracked contract(s) from the portfolio resource.`,
          decide: `Scored every contract against the company profile (danger threshold ${board.dangerThreshold}) and attached the driving clause text plus a not-legal-advice disclaimer to each score.`,
          act: dryRun
            ? 'Dry run — no statuses were written back.'
            : `Set ${needingAction} contract(s) to needs_attention and recorded a recommended action for every contract.`,
        },
        contractsPerceived: perceived.length,
        contractsNeedingAction: needingAction,
        statusesUpdated,
        decisions: actions,
      },
      ...board,
      disclaimer: NOT_LEGAL_ADVICE,
    };
  }

  @Tool({
    name: 'review-portfolio',
    title: 'Review contract portfolio',
    description:
      'Return the contract board: every tracked contract as a card with its risk score, classification (safe or danger), the exact clause text that drove the score, and the recommended action. Optionally filter to safe, danger, or contracts needing attention. Renders the contract-board widget.',
    inputSchema: z.object({
      filter: z
        .enum(['all', 'safe', 'danger', 'needs_attention'])
        .optional()
        .describe('Which contracts to include; defaults to all'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    invocation: { invoking: 'Building contract board…', invoked: 'Contract board ready' },
    examples: {
      request: { filter: 'danger' },
      response: {
        summary: { total: 6, safe: 0, danger: 6, needsAttention: 6, averageScore: 62 },
      },
    },
  })
  @Widget({
    route: 'contract-board',
    prefersBorder: true,
    csp: { resourceDomains: ['https://images.unsplash.com'] },
  })
  async reviewPortfolio(input: { filter?: 'all' | 'safe' | 'danger' | 'needs_attention' }, ctx: ExecutionContext) {
    const filter = input?.filter ?? 'all';
    const board = this.view.buildBoard(filter);

    ctx.logger.info('Portfolio reviewed', {
      filter,
      total: board.summary.total,
      danger: board.summary.danger,
    });

    return {
      ...board,
      message: `${board.summary.total} contract(s): ${board.summary.safe} safe, ${board.summary.danger} danger, ${board.summary.needsAttention} needing attention. Every score lists the clause text that caused it.`,
      disclaimer: NOT_LEGAL_ADVICE,
    };
  }
}
