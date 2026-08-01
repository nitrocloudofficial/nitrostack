import { Injectable, ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { ContractStoreService } from './contract-store.service.js';
import { NOT_LEGAL_ADVICE } from './contract.types.js';

@Injectable({ deps: [ContractStoreService] })
export class IntakeTools {
  constructor(private store: ContractStoreService) {}

  @Tool({
    name: 'set-company-profile',
    title: 'Set company profile',
    description:
      'Store the company context (industry, headcount, jurisdiction, risk tolerance) for this session. Every other Contract Sentinel tool reads this profile when scoring contracts.',
    inputSchema: z.object({
      industry: z.string().describe('Industry the company operates in, e.g. "fintech"'),
      companySize: z.number().int().positive().describe('Number of employees, e.g. 200'),
      jurisdiction: z
        .string()
        .describe('Primary legal jurisdiction the company operates in, e.g. "Ireland"'),
      riskTolerance: z
        .enum(['low', 'medium', 'high'])
        .describe('How much contractual risk the company is willing to accept'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    invocation: { invoking: 'Storing company profile…', invoked: 'Company profile stored' },
    examples: {
      request: { industry: 'fintech', companySize: 200, jurisdiction: 'Ireland', riskTolerance: 'low' },
      response: {
        stored: true,
        profile: { industry: 'fintech', companySize: 200, jurisdiction: 'Ireland', riskTolerance: 'low' },
      },
    },
  })
  async setCompanyProfile(
    input: {
      industry: string;
      companySize: number;
      jurisdiction: string;
      riskTolerance: 'low' | 'medium' | 'high';
    },
    ctx: ExecutionContext,
  ) {
    const profile = this.store.setProfile(input);
    this.store.ensureSeeded();
    const trackedCount = this.store.list().length;

    ctx.logger.info('Company profile stored', {
      industry: profile.industry,
      companySize: profile.companySize,
      jurisdiction: profile.jurisdiction,
      riskTolerance: profile.riskTolerance,
    });

    const toleranceEffect =
      profile.riskTolerance === 'low'
        ? 'Low tolerance: risk scores are amplified and the danger threshold drops to 45, so borderline clauses will be flagged.'
        : profile.riskTolerance === 'high'
          ? 'High tolerance: risk scores are dampened and the danger threshold rises to 70, so only severe clauses are flagged.'
          : 'Medium tolerance: scores are used as-is with a danger threshold of 55.';

    const crossBorderNote = `Contracts governed outside ${profile.jurisdiction} will be scored as a jurisdiction-mismatch risk.`;

    return {
      stored: true,
      profile: {
        industry: profile.industry,
        companySize: profile.companySize,
        jurisdiction: profile.jurisdiction,
        riskTolerance: profile.riskTolerance,
        setAt: profile.setAt,
      },
      sessionContext: `Session context set: a ${profile.companySize}-person ${profile.industry} company in ${profile.jurisdiction} with ${profile.riskTolerance} risk tolerance.`,
      scoringImpact: [toleranceEffect, crossBorderNote],
      trackedContracts: trackedCount,
      nextSteps: [
        'Use ingest-contract to add a contract from its raw text.',
        'Use run-sentinel-cycle to score the whole portfolio and flag what needs attention.',
      ],
      disclaimer: NOT_LEGAL_ADVICE,
    };
  }

  @Tool({
    name: 'ingest-contract',
    title: 'Ingest contract',
    description:
      'Store a contract from its raw text. Assigns a unique id, extracts key clauses, the deadline date and the obligations into structured data, and adds it to the tracked contract portfolio.',
    inputSchema: z.object({
      contractText: z.string().min(20).describe('The full raw text of the contract to ingest'),
      title: z
        .string()
        .optional()
        .describe('Optional display title; derived from the contract text when omitted'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    invocation: { invoking: 'Parsing contract…', invoked: 'Contract ingested' },
    examples: {
      request: {
        contractText:
          'Master Services Agreement between Acme Fintech Ltd and Northgate Cloud Services. Term expires 2026-09-15 with auto-renewal for 24 months unless written notice is given 90 days prior.',
      },
      response: {
        contractId: 'ctr_northgate_cloud_services_master_se',
        deadline: '2026-09-15',
        clauseCount: 4,
        obligationCount: 1,
      },
    },
  })
  async ingestContract(input: { contractText: string; title?: string }, ctx: ExecutionContext) {
    const contract = this.store.ingest(input.contractText, { title: input.title });
    const profile = this.store.getEffectiveProfile();

    ctx.logger.info('Contract ingested', {
      contractId: contract.id,
      counterparty: contract.counterparty,
      deadline: contract.deadline,
      clauses: contract.clauses.length,
    });

    const daysUntilDeadline = contract.deadline
      ? Math.round((Date.parse(`${contract.deadline}T00:00:00Z`) - Date.now()) / 86_400_000)
      : null;

    return {
      contractId: contract.id,
      title: contract.title,
      counterparty: contract.counterparty,
      contractType: contract.contractType,
      status: contract.status,
      imageUrl: contract.imageUrl,
      deadline: contract.deadline,
      deadlineNote: contract.deadline
        ? `Deadline ${contract.deadline} (${daysUntilDeadline} days from today).`
        : 'No explicit deadline date could be extracted from this contract text.',
      clauses: contract.clauses.map((clause) => ({
        type: clause.type,
        label: clause.label,
        text: clause.text,
      })),
      clauseCount: contract.clauses.length,
      obligations: contract.obligations.map((obligation) => ({
        owedBy: obligation.owedBy,
        text: obligation.text,
      })),
      obligationCount: contract.obligations.length,
      appliedProfile: profile.isDefault
        ? 'No company profile set yet — default medium risk tolerance will be used until set-company-profile is called.'
        : `Scored against a ${profile.companySize}-person ${profile.industry} company in ${profile.jurisdiction} (${profile.riskTolerance} risk tolerance).`,
      trackedContracts: this.store.list().length,
      nextStep:
        'Run run-sentinel-cycle to score this contract alongside the rest of the portfolio and get a recommended action.',
      disclaimer: NOT_LEGAL_ADVICE,
    };
  }
}
