import { Module, ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { McpBridge } from '../shared/mcp-bridge.js';

@Controller()
export class CorrelationService {
  private bridge = new McpBridge('nitro.agents.correlation.__init__');

  @Tool({ name: 'analyze_correlation', description: 'Analyze research correlations', inputSchema: z.any(), metadata: { category: 'correlation-mcp' } })
  async analyze_correlation(params: any) {
    return this.bridge.callTool('compute_similarity', { node_a: 'a', node_b: 'b' });
  }

  async build_graph(params: any) { return this.bridge.callTool('build_graph', params); }
  async compute_similarity(params: any) { return this.bridge.callTool('compute_similarity', params); }
  async detect_clusters(params: any) { return this.bridge.callTool('detect_clusters', params); }
  async detect_gaps(params: any) { return this.bridge.callTool('detect_gaps', params); }
  async find_opportunities(params: any) { return this.bridge.callTool('find_opportunities', params); }
  async explain_relationship(params: any) { return this.bridge.callTool('explain_relationship', params); }
}

@Module({
  name: 'correlation-mcp',
  controllers: [CorrelationService]
})
export class CorrelationModule {}
