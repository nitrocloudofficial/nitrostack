import { Module, ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { McpBridge } from '../shared/mcp-bridge.js';

@Controller()
export class ReportService {
  private bridge = new McpBridge('nitro.agents.report.__init__');

  @Tool({ name: 'generate_report', description: 'Generate reports', inputSchema: z.any(), metadata: { category: 'report-mcp' } })
  async generate_report(params: any) {
    return this.bridge.callTool('generate_report', { document_json: '{}' });
  }

  async _generate_report(params: any) { return this.bridge.callTool('generate_report', params); }
  async export_pdf(params: any) { return this.bridge.callTool('export_pdf', params); }
  async export_docx(params: any) { return this.bridge.callTool('export_docx', params); }
  async export_markdown(params: any) { return this.bridge.callTool('export_markdown', params); }
  async export_html(params: any) { return this.bridge.callTool('export_html', params); }
  async export_bibtex(params: any) { return this.bridge.callTool('export_bibtex', params); }
}

@Module({
  name: 'report-mcp',
  controllers: [ReportService]
})
export class ReportModule {}
