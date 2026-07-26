import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { GraphService } from './graph.service.js';

const CLAUSE_CATEGORIES = [
  'parties', 'term_and_termination', 'payment', 'renewal', 'liability',
  'indemnity', 'data_protection', 'confidentiality', 'ip_ownership',
  'governing_law', 'jurisdiction', 'sla', 'audit', 'publicity',
  'assignment', 'force_majeure', 'other'
] as const;

@Injectable({ deps: [GraphService] })
export class GraphTools {
  constructor(private graphService: GraphService) {}

  @Tool({
    name: 'build_graph',
    description:
      'Build the clause knowledge graph from REDACTED contract text. Extracts clauses, categories, parties, and dependencies, then stores them in an in-memory graphology graph. Pass only redacted text — never the original document.',
    inputSchema: z.object({
      redactedText: z.string().describe('Redacted contract text from redact_document'),
      doctype: z.string().describe('Contract type selected by the user'),
      sessionId: z.string().describe('Session id from redact_document')
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true }
  })
  async buildGraph(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Building contract graph', {
      doctype: input.doctype,
      sessionId: input.sessionId,
      chars: input.redactedText.length
    });

    const result = await this.graphService.buildFromText(
      input.redactedText,
      input.doctype,
      input.sessionId
    );

    ctx.logger.info('graph.built', {
      graphId: result.graphId,
      nodeCount: result.nodeCount,
      edgeCount: result.edgeCount,
      source: result.source
    });

    // Return metadata plus the export; agents query by graphId rather than
    // re-sending the whole structure.
    return result;
  }

  @Tool({
    name: 'query_graph',
    description:
      'Return the sub-graph for a set of clause categories, including 1-hop neighbours and attached entity nodes. Specialized risk agents use this instead of re-parsing text.',
    inputSchema: z.object({
      graphId: z.string().describe('Graph id from build_graph'),
      categories: z
        .array(z.enum(CLAUSE_CATEGORIES))
        .describe('Clause categories to retrieve')
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  })
  async queryGraph(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Querying graph', { graphId: input.graphId, categories: input.categories });
    return this.graphService.query(input.graphId, input.categories);
  }

  @Tool({
    name: 'get_graph',
    description: 'Return the full serialized graph (nodes and edges) for a graph id.',
    inputSchema: z.object({
      graphId: z.string().describe('Graph id from build_graph')
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  })
  async getGraph(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Exporting graph', { graphId: input.graphId });
    const result = this.graphService.getExport(input.graphId);
    if (!result) return { error: `Unknown graphId: ${input.graphId}` };
    return result;
  }

  @Tool({
    name: 'get_clause_dependents',
    description:
      'List clauses that reference or depend on a given clause. Use this before proposing a redline, to confirm the edit will not break a dependent definition elsewhere in the contract.',
    inputSchema: z.object({
      graphId: z.string().describe('Graph id from build_graph'),
      clauseId: z.string().describe('Clause node id, e.g. c7')
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  })
  async getClauseDependents(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Resolving clause dependents', { clauseId: input.clauseId });
    return { clauseId: input.clauseId, dependents: this.graphService.dependents(input.graphId, input.clauseId) };
  }
}
