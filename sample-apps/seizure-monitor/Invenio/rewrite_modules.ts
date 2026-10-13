import fs from 'fs';
import path from 'path';

const files = {
  'research.module.ts': {
    mcp: 'research-mcp',
    service: 'ResearchService',
    tool: 'research_search',
    desc: 'Execute full research search',
    methods: ['search_papers', 'search_author', 'search_keyword', 'search_doi', 'normalize_results', 'rank_results'],
    impl: `return this.bridge.callTool('search_papers', { query: 'quantum logic' });`
  },
  'correlation.module.ts': {
    mcp: 'correlation-mcp',
    service: 'CorrelationService',
    tool: 'analyze_correlation',
    desc: 'Analyze research correlations',
    methods: ['build_graph', 'compute_similarity', 'detect_clusters', 'detect_gaps', 'find_opportunities', 'explain_relationship'],
    impl: `return this.bridge.callTool('compute_similarity', { node_a: 'a', node_b: 'b' });`
  },
  'evidence.module.ts': {
    mcp: 'evidence-mcp',
    service: 'EvidenceService',
    tool: 'analyze_evidence',
    desc: 'Analyze evidence and claims',
    methods: ['extract_evidence', 'build_chain', 'verify_claim', 'confidence_score', 'explain_source'],
    impl: `return this.bridge.callTool('verify_claim', { claim_text: 'test claim' });`
  },
  'knowledge-graph.module.ts': {
    mcp: 'knowledge-graph-mcp',
    service: 'KnowledgeGraphService',
    tool: 'build_knowledge_graph',
    desc: 'Build knowledge graph',
    methods: ['create_graph', 'merge_nodes', 'query_graph', 'related_topics', 'shortest_path'],
    impl: `return this.bridge.callTool('query_graph', { query: 'test' });`
  },
  'planner.module.ts': {
    mcp: 'planner-mcp',
    service: 'PlannerService',
    tool: 'execute_autonomous_research',
    desc: 'Execute autonomous research plan',
    methods: ['plan_research', 'evaluate_plan', 'delegate_task'],
    impl: `return this.bridge.callTool('plan_research', { query: 'test' });`
  },
  'workflow.module.ts': {
    mcp: 'workflow-mcp',
    service: 'WorkflowService',
    tool: 'manage_workflow',
    desc: 'Manage workflow pipelines',
    methods: ['start_pipeline', 'pause_pipeline', 'resume_pipeline', 'cancel_pipeline', 'status', 'stream_logs'],
    impl: `return this.bridge.callTool('status', {});`
  },
  'workspace.module.ts': {
    mcp: 'workspace-mcp',
    service: 'WorkspaceService',
    tool: 'open_workspace',
    desc: 'Open workspace',
    methods: ['create_workspace', 'load_workspace', 'save_workspace', 'embed_graph', 'embed_evidence', 'update_document'],
    impl: `return this.bridge.callTool('create_workspace', { name: 'test' });`
  },
  'copilot.module.ts': {
    mcp: 'copilot-mcp',
    service: 'CopilotService',
    tool: 'research_copilot',
    desc: 'AI Copilot interactions',
    methods: ['summarize', 'explain_pipeline', 'suggest_next_action', 'inspect_context'],
    impl: `return this.bridge.callTool('suggest_next_action', { context_json: '{}' });`
  },
  'report.module.ts': {
    mcp: 'report-mcp',
    service: 'ReportService',
    tool: 'generate_report',
    desc: 'Generate reports',
    methods: ['_generate_report', 'export_pdf', 'export_docx', 'export_markdown', 'export_html', 'export_bibtex'],
    impl: `return this.bridge.callTool('generate_report', { document_json: '{}' });`
  },
  'settings.module.ts': {
    mcp: 'settings-mcp',
    service: 'SettingsService',
    tool: 'manage_settings',
    desc: 'Manage settings',
    methods: ['load_settings', 'save_settings', 'manage_api_keys'],
    impl: `return this.bridge.callTool('load_settings', {});`
  }
};

for (const [filename, info] of Object.entries(files)) {
  const p = path.join(process.cwd(), 'src', 'modules', filename);
  
  const pyModule = info.mcp.replace('-mcp', '').replace('-', '_');
  
  let content = `import { Module, ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { McpBridge } from '../shared/mcp-bridge.js';

@Controller()
export class ${info.service} {
  private bridge = new McpBridge('nitro.agents.${pyModule}.__init__');

  @Tool({ name: '${info.tool}', description: '${info.desc}', inputSchema: z.any(), metadata: { category: '${info.mcp}' } })
  async ${info.tool}(params: any) {
    ${info.impl}
  }

${info.methods.map(m => `  async ${m}(params: any) { return this.bridge.callTool('${m.replace(/^_/, '')}', params); }`).join('\n')}
}

@Module({
  name: '${info.mcp}',
  controllers: [${info.service}]
})
export class ${info.service.replace('Service', 'Module')} {}
`;

  fs.writeFileSync(p, content);
  console.log(`Wrote ${filename}`);
}
