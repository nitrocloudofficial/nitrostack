import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { RiskService, AgentKey } from './risk.service.js';

const AGENT_KEYS = ['corporate', 'financial', 'liability', 'privacy'] as const;

@Injectable({ deps: [RiskService] })
export class RiskTools {
  constructor(private riskService: RiskService) {}

  @Tool({
    name: 'list_risk_agents',
    description:
      'List the specialized risk agents and the clause categories each one queries from the graph.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  })
  async listAgents(_input: any, ctx: ExecutionContext) {
    ctx.logger.info('Listing risk agents');
    return { agents: this.riskService.listAgents() };
  }

  @Tool({
    name: 'analyze_corporate',
    description:
      'Corporate Due-Diligence Agent. Queries entity, jurisdiction, assignment, and termination nodes to flag contracting-entity, governing-law, change-of-control, and termination-symmetry risks.',
    inputSchema: z.object({
      graphId: z.string().describe('Graph id from build_graph')
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true }
  })
  async analyzeCorporate(input: any, ctx: ExecutionContext) {
    return this.run('corporate', input.graphId, ctx);
  }

  @Tool({
    name: 'analyze_financial',
    description:
      'Financial & Renewal Risk Agent. Queries payment, renewal, SLA, and audit nodes to flag payment-term, auto-renewal, pricing-escalation, and service-credit risks.',
    inputSchema: z.object({
      graphId: z.string().describe('Graph id from build_graph')
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true }
  })
  async analyzeFinancial(input: any, ctx: ExecutionContext) {
    return this.run('financial', input.graphId, ctx);
  }

  @Tool({
    name: 'analyze_liability',
    description:
      'Liability & Indemnification Agent. Queries liability, indemnity, and IP-ownership nodes to quantify worst-case exposure — caps, cap carve-outs, consequential-damage exclusions, and indemnity symmetry.',
    inputSchema: z.object({
      graphId: z.string().describe('Graph id from build_graph')
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true }
  })
  async analyzeLiability(input: any, ctx: ExecutionContext) {
    return this.run('liability', input.graphId, ctx);
  }

  @Tool({
    name: 'analyze_privacy',
    description:
      'Privacy & Compliance Agent. Queries data-protection and confidentiality nodes to flag breach-notification gaps, missing regulatory framing, sub-processor discretion, and deletion obligations.',
    inputSchema: z.object({
      graphId: z.string().describe('Graph id from build_graph')
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true }
  })
  async analyzePrivacy(input: any, ctx: ExecutionContext) {
    return this.run('privacy', input.graphId, ctx);
  }

  @Tool({
    name: 'analyze_all_risks',
    description:
      'Run all four specialized agents concurrently against the graph and return their merged findings, sorted most severe first. This is the normal entry point for a full analysis.',
    inputSchema: z.object({
      graphId: z.string().describe('Graph id from build_graph')
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true }
  })
  async analyzeAll(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Running full multi-agent analysis', { graphId: input.graphId });

    const result = await this.riskService.runAllAgents(input.graphId);

    ctx.logger.info('risk.analysis_completed', {
      graphId: input.graphId,
      totalScore: result.totalScore,
      findingCount: result.findings.length
    });

    return result;
  }

  private async run(agent: AgentKey, graphId: string, ctx: ExecutionContext) {
    ctx.logger.info(`Running ${agent} agent`, { graphId });
    const report = await this.riskService.runAgent(agent, graphId);
    ctx.logger.info('risk.agent_completed', {
      agent,
      graphId,
      findingCount: report.findings.length,
      score: report.score
    });
    return report;
  }
}

export { AGENT_KEYS };
