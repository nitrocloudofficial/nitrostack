import { Module, ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { McpBridge } from '../shared/mcp-bridge.js';

@Controller()
export class PlannerService {
  private bridge = new McpBridge('nitro.agents.planner.__init__');

  @Tool({ name: 'execute_autonomous_research', description: 'Execute autonomous research plan', inputSchema: z.any(), metadata: { category: 'planner-mcp' } })
  async execute_autonomous_research(params: any) {
    return this.bridge.callTool('execute_autonomous_research', { query: 'test' });
  }

  async plan_research(params: any) { return this.bridge.callTool('plan_research', params); }
  async evaluate_plan(params: any) { return this.bridge.callTool('evaluate_plan', params); }
  async delegate_task(params: any) { return this.bridge.callTool('delegate_task', params); }
}

@Module({
  name: 'planner-mcp',
  controllers: [PlannerService]
})
export class PlannerModule {}
