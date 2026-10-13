import { Module, ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { McpBridge } from '../shared/mcp-bridge.js';

@Controller()
export class WorkspaceService {
  private bridge = new McpBridge('nitro.agents.workspace.__init__');

  @Tool({ name: 'open_workspace', description: 'Open workspace', inputSchema: z.any(), metadata: { category: 'workspace-mcp' } })
  async open_workspace(params: any) {
    return this.bridge.callTool('create_workspace', { name: 'test' });
  }

  async create_workspace(params: any) { return this.bridge.callTool('create_workspace', params); }
  async load_workspace(params: any) { return this.bridge.callTool('load_workspace', params); }
  async save_workspace(params: any) { return this.bridge.callTool('save_workspace', params); }
  async embed_graph(params: any) { return this.bridge.callTool('embed_graph', params); }
  async embed_evidence(params: any) { return this.bridge.callTool('embed_evidence', params); }
  async update_document(params: any) { return this.bridge.callTool('update_document', params); }
}

@Module({
  name: 'workspace-mcp',
  controllers: [WorkspaceService]
})
export class WorkspaceModule {}
