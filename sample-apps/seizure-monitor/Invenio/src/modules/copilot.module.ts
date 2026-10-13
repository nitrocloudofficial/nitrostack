import { Module, ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { McpBridge } from '../shared/mcp-bridge.js';

@Controller()
export class CopilotService {
  private bridge = new McpBridge('nitro.agents.copilot.__init__');

  @Tool({ name: 'research_copilot', description: 'AI Copilot interactions', inputSchema: z.any(), metadata: { category: 'copilot-mcp' } })
  async research_copilot(params: any) {
    return this.bridge.callTool('suggest_next_action', { context_json: '{}' });
  }

  async summarize(params: any) { return this.bridge.callTool('summarize', params); }
  async explain_pipeline(params: any) { return this.bridge.callTool('explain_pipeline', params); }
  async suggest_next_action(params: any) { return this.bridge.callTool('suggest_next_action', params); }
  async inspect_context(params: any) { return this.bridge.callTool('inspect_context', params); }
}

@Module({
  name: 'copilot-mcp',
  controllers: [CopilotService]
})
export class CopilotModule {}
