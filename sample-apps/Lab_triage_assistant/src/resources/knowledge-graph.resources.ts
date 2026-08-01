/**
 * Knowledge Graph Resource
 *
 * Exposes the test/panel/specialist relationship graph as an MCP
 * resource so it's inspectable in NitroStudio, not just a hidden
 * constant used internally by the widget.
 */

import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { buildKnowledgeGraph } from '../knowledgeGraph.js';

export class KnowledgeGraphResources {
  @Resource({
    uri: 'labs://knowledge-graph',
    name: 'Test/Panel/Specialist Knowledge Graph',
    description: 'Nodes and edges linking each canonical lab test to its panel (CBC, KFT, LFT, Lipid, Glucose, Thyroid) and each panel to the specialist it routes to.',
    mimeType: 'application/json',
    examples: {
      response: JSON.parse(JSON.stringify(buildKnowledgeGraph()))
    }
  })
  async getKnowledgeGraph(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching test/panel/specialist knowledge graph resource');

    const graph = buildKnowledgeGraph();

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(graph, null, 2)
      }]
    };
  }
}
