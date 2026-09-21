/**
 * ForgeOps — Orchestrator MCP Tools
 *
 * High-level tools for the Copilot agent:
 *   - get_incident_summary: Full incident context
 *   - get_timeline: Chronological event timeline
 *   - get_causal_graph: Root cause analysis graph
 *   - get_recommendations: Ranked action recommendations
 *   - get_business_impact: Financial and operational impact
 *
 * These aggregate data from other MCP servers (MES, Maintenance, Quality,
 * Materials, Simulation) to provide the Copilot with high-level orchestration.
 */
import { ToolDecorator as Tool, ExecutionContext, z } from '../../nitrostack.js';
import {
  INCIDENT,
  TIMELINE_EVENTS,
  CAUSAL_GRAPH,
  RECOMMENDATIONS,
  BUSINESS_IMPACT,
} from '../../data/incident-data.js';

export class OrchestratorTools {
  @Tool({
    name: 'get_incident_summary',
    description: 'Get the full incident summary including affected batch, line, plant, severity, KPI change, causal chain, and current status.',
    inputSchema: z.object({
      incident_id: z.string().optional().describe('Incident identifier (defaults to current active incident)'),
    }),
  })
  async getIncidentSummary(input: { incident_id?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Orchestrator: Retrieving incident summary', { incident_id: input.incident_id });
    return {
      source: 'orchestrator',
      record_id: `incident:${INCIDENT.incident_id}`,
      timestamp: new Date().toISOString(),
      ...INCIDENT,
    };
  }

  @Tool({
    name: 'get_timeline',
    description: 'Get the chronological event timeline across all data sources (MES, IoT, Maintenance, Quality) for the current incident.',
    inputSchema: z.object({
      batch_id: z.string().optional().describe('Batch identifier (defaults to B-2407-184)'),
      source_filter: z.string().optional().describe('Filter by source (mes, iot, maintenance, quality)'),
      severity_filter: z.string().optional().describe('Filter by severity (info, warning, critical)'),
    }),
  })
  async getTimeline(
    input: { batch_id?: string; source_filter?: string; severity_filter?: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Orchestrator: Retrieving timeline');

    let events = [...TIMELINE_EVENTS];

    if (input.source_filter) {
      events = events.filter((e) => e.source === input.source_filter);
    }
    if (input.severity_filter) {
      events = events.filter((e) => e.severity === input.severity_filter);
    }

    return {
      source: 'orchestrator',
      record_id: `timeline:${input.batch_id || 'B-2407-184'}`,
      timestamp: new Date().toISOString(),
      batch_id: input.batch_id || 'B-2407-184',
      events,
      total_count: events.length,
    };
  }

  @Tool({
    name: 'get_causal_graph',
    description: 'Get the root cause analysis causal graph with nodes (factors), edges (causal relationships), influence scores, confidence levels, and evidence types.',
    inputSchema: z.object({
      batch_id: z.string().optional().describe('Batch identifier'),
    }),
  })
  async getCausalGraph(input: { batch_id?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Orchestrator: Retrieving causal graph');
    return {
      source: 'orchestrator',
      record_id: `causal:${input.batch_id || 'B-2407-184'}`,
      timestamp: new Date().toISOString(),
      batch_id: input.batch_id || 'B-2407-184',
      ...CAUSAL_GRAPH,
    };
  }

  @Tool({
    name: 'get_recommendations',
    description: 'Get ranked action recommendations with predicted yield, confidence, cost, risk, implementation difficulty, and evidence references.',
    inputSchema: z.object({
      batch_id: z.string().optional().describe('Batch identifier'),
    }),
  })
  async getRecommendations(input: { batch_id?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Orchestrator: Retrieving recommendations');
    return {
      source: 'orchestrator',
      record_id: `recommendations:${input.batch_id || 'B-2407-184'}`,
      timestamp: new Date().toISOString(),
      batch_id: input.batch_id || 'B-2407-184',
      recommendations: RECOMMENDATIONS,
    };
  }

  @Tool({
    name: 'get_business_impact',
    description: 'Get the financial and operational impact analysis for the incident including current losses, recommended action savings, payback period.',
    inputSchema: z.object({
      batch_id: z.string().optional().describe('Batch identifier'),
    }),
  })
  async getBusinessImpact(input: { batch_id?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Orchestrator: Retrieving business impact');
    return {
      source: 'orchestrator',
      record_id: `impact:${input.batch_id || 'B-2407-184'}`,
      timestamp: new Date().toISOString(),
      batch_id: input.batch_id || 'B-2407-184',
      ...BUSINESS_IMPACT,
    };
  }
}
