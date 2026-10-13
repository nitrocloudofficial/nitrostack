import { Module, ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { McpBridge } from '../shared/mcp-bridge.js';

@Controller()
export class EvidenceService {
  private bridge = new McpBridge('nitro.agents.evidence.__init__');

  @Tool({ name: 'analyze_evidence', description: 'Analyze evidence and claims', inputSchema: z.any(), metadata: { category: 'evidence-mcp' } })
  async analyze_evidence(params: any) {
    return this.bridge.callTool('verify_claim', { claim_text: 'test claim' });
  }

  async extract_evidence(params: any) { return this.bridge.callTool('extract_evidence', params); }
  async build_chain(params: any) { return this.bridge.callTool('build_chain', params); }
  async verify_claim(params: any) { return this.bridge.callTool('verify_claim', params); }
  async confidence_score(params: any) { return this.bridge.callTool('confidence_score', params); }
  async explain_source(params: any) { return this.bridge.callTool('explain_source', params); }
}

@Module({
  name: 'evidence-mcp',
  controllers: [EvidenceService]
})
export class EvidenceModule {}
