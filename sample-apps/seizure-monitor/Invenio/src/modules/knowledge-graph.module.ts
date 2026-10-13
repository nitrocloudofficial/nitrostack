import { Module, ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { McpBridge } from '../shared/mcp-bridge.js';

@Controller()
export class KnowledgeGraphService {
  private bridge = new McpBridge('nitro.agents.knowledge_graph.__init__');

  @Tool({ name: 'build_knowledge_graph', description: 'Build knowledge graph', inputSchema: z.any(), metadata: { category: 'knowledge-graph-mcp' } })
  async build_knowledge_graph(params: any) {
    return this.bridge.callTool('query_graph', { query: 'test' });
  }

  async create_graph(params: any) { return this.bridge.callTool('create_graph', params); }
  async merge_nodes(params: any) { return this.bridge.callTool('merge_nodes', params); }
  async query_graph(params: any) { return this.bridge.callTool('query_graph', params); }
  async related_topics(params: any) { return this.bridge.callTool('related_topics', params); }
  async shortest_path(params: any) { return this.bridge.callTool('shortest_path', params); }
}

@Module({
  name: 'knowledge-graph-mcp',
  controllers: [KnowledgeGraphService]
})
export class KnowledgeGraphModule {}
