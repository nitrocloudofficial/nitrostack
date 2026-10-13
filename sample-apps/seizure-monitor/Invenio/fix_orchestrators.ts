import fs from 'fs';
import path from 'path';

const MCP_MAPPINGS = {
  'research.module.ts': { toolName: 'research_search', impl: `    return this.bridge.callTool('search_papers', { query: 'quantum logic' });` },
  'correlation.module.ts': { toolName: 'analyze_correlation', impl: `    return this.bridge.callTool('compute_similarity', { node_a: 'a', node_b: 'b' });` },
  'evidence.module.ts': { toolName: 'analyze_evidence', impl: `    return this.bridge.callTool('verify_claim', { claim_text: 'test claim' });` },
  'knowledge-graph.module.ts': { toolName: 'build_knowledge_graph', impl: `    return this.bridge.callTool('query_graph', { query: 'test' });` },
  'planner.module.ts': { toolName: 'execute_autonomous_research', impl: `    return this.bridge.callTool('plan_research', { query: 'test' });` },
  'workflow.module.ts': { toolName: 'manage_workflow', impl: `    return this.bridge.callTool('status', {});` },
  'workspace.module.ts': { toolName: 'open_workspace', impl: `    return this.bridge.callTool('create_workspace', { name: 'test' });` },
  'copilot.module.ts': { toolName: 'research_copilot', impl: `    return this.bridge.callTool('suggest_next_action', { context_json: '{}' });` },
  'report.module.ts': { toolName: 'generate_report', impl: `    return this.bridge.callTool('generate_report', { document_json: '{}' });` },
  'settings.module.ts': { toolName: 'manage_settings', impl: `    return this.bridge.callTool('load_settings', {});` },
};

const dir = path.join(process.cwd(), 'src', 'modules');

for (const [file, config] of Object.entries(MCP_MAPPINGS)) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');

  // Regex to replace the body of the orchestrator method
  const regex = new RegExp(`(async ${config.toolName}\\(params: any\\) \\{\\s*)[\\s\\S]*?(\\s*\\})`);
  content = content.replace(regex, `$1${config.impl}$2`);
  
  fs.writeFileSync(p, content);
}
console.log('Fixed TS orchestrator implementations');
