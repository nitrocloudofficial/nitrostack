import { Module, ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { McpBridge } from '../shared/mcp-bridge.js';

@Controller()
export class ResearchService {
  private bridge = new McpBridge('nitro.agents.research.__init__');

  @Tool({ name: 'research_search', description: 'Execute full research search', inputSchema: z.any(), metadata: { category: 'research-mcp' } })
  async research_search(params: any) {
    return this.bridge.callTool('search_papers', { query: 'quantum logic' });
  }

  async search_papers(params: any) { return this.bridge.callTool('search_papers', params); }
  async search_author(params: any) { return this.bridge.callTool('search_author', params); }
  async search_keyword(params: any) { return this.bridge.callTool('search_keyword', params); }
  async search_doi(params: any) { return this.bridge.callTool('search_doi', params); }
  async normalize_results(params: any) { return this.bridge.callTool('normalize_results', params); }
  async rank_results(params: any) { return this.bridge.callTool('rank_results', params); }
}

@Module({
  name: 'research-mcp',
  controllers: [ResearchService]
})
export class ResearchModule {}
