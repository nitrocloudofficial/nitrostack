/**
 * Get Knowledge Graph Tool
 *
 * Returns the test/panel/specialist relationship graph so it can be
 * rendered by the knowledge-graph widget. Takes no meaningful input —
 * it's a fixed structural view of the canonical test registry.
 */

import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { buildKnowledgeGraph } from '../knowledgeGraph.js';

const GetKnowledgeGraphInputSchema = z.object({});

const GetKnowledgeGraphOutputSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      type: z.enum(['test', 'panel', 'specialist'])
    })
  ),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string()
    })
  )
});

export class GetKnowledgeGraphTools {
  @Tool({
    name: 'get_knowledge_graph',
    description: 'Get the test/panel/specialist relationship graph: which canonical lab tests belong to which panel, and which panel routes to which specialist.',
    inputSchema: GetKnowledgeGraphInputSchema,
    outputSchema: GetKnowledgeGraphOutputSchema,
    examples: {
      request: {},
      response: JSON.parse(JSON.stringify(buildKnowledgeGraph()))
    }
  })
  @Widget('knowledge-graph')
  async getKnowledgeGraph(
    _input: z.infer<typeof GetKnowledgeGraphInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof GetKnowledgeGraphOutputSchema>> {
    ctx.logger.info('Building test/panel/specialist knowledge graph');
    return buildKnowledgeGraph();
  }
}
