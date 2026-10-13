import { Module, ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { McpBridge } from '../shared/mcp-bridge.js';

@Controller()
export class WorkflowService {
  private bridge = new McpBridge('nitro.agents.workflow.__init__');

  @Tool({ name: 'manage_workflow', description: 'Manage workflow pipelines', inputSchema: z.any(), metadata: { category: 'workflow-mcp' } })
  async manage_workflow(params: any) {
    return this.bridge.callTool('status', { run_id: 'test' });
  }

  async start_pipeline(params: any) { return this.bridge.callTool('start_pipeline', params); }
  async pause_pipeline(params: any) { return this.bridge.callTool('pause_pipeline', params); }
  async resume_pipeline(params: any) { return this.bridge.callTool('resume_pipeline', params); }
  async cancel_pipeline(params: any) { return this.bridge.callTool('cancel_pipeline', params); }
  async status(params: any) { return this.bridge.callTool('status', params); }
  async stream_logs(params: any) { return this.bridge.callTool('stream_logs', params); }
}

@Module({
  name: 'workflow-mcp',
  controllers: [WorkflowService]
})
export class WorkflowModule {}
