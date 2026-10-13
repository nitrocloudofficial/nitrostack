import { Module, ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { McpBridge } from '../shared/mcp-bridge.js';

@Controller()
export class SettingsService {
  private bridge = new McpBridge('nitro.agents.settings.__init__');

  @Tool({ name: 'manage_settings', description: 'Manage settings', inputSchema: z.any(), metadata: { category: 'settings-mcp' } })
  async manage_settings(params: any) {
    return this.bridge.callTool('load_settings', {});
  }

  async load_settings(params: any) { return this.bridge.callTool('load_settings', params); }
  async save_settings(params: any) { return this.bridge.callTool('save_settings', params); }
  async manage_api_keys(params: any) { return this.bridge.callTool('manage_api_keys', params); }
}

@Module({
  name: 'settings-mcp',
  controllers: [SettingsService]
})
export class SettingsModule {}
