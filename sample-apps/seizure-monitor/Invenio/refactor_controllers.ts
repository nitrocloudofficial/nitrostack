import fs from 'fs';
import path from 'path';

const MCP_MAPPINGS = {
  'research.module.ts': { toolName: 'research_search', desc: 'Execute full research search', mcp: 'research-mcp', impl: `    const papers = await this.search_papers(params);
    const normalized = await this.normalize_results({ papers });
    return await this.rank_results({ papers: normalized });` },
  'correlation.module.ts': { toolName: 'analyze_correlation', desc: 'Analyze research correlations', mcp: 'correlation-mcp', impl: `    const graph = await this.build_graph(params);
    return await this.compute_similarity({ graph });` },
  'evidence.module.ts': { toolName: 'analyze_evidence', desc: 'Analyze evidence and claims', mcp: 'evidence-mcp', impl: `    const claims = await this.extract_evidence(params);
    return await this.build_chain({ claims });` },
  'knowledge-graph.module.ts': { toolName: 'build_knowledge_graph', desc: 'Build knowledge graph', mcp: 'knowledge-graph-mcp', impl: `    const graph = await this.create_graph(params);
    return await this.query_graph({ graph });` },
  'planner.module.ts': { toolName: 'execute_autonomous_research', desc: 'Execute autonomous research plan', mcp: 'planner-mcp', impl: `    const plan = await this.plan_research(params);
    return await this.evaluate_plan({ plan });` },
  'workflow.module.ts': { toolName: 'manage_workflow', desc: 'Manage workflow pipelines', mcp: 'workflow-mcp', impl: `    const status = await this.status(params);
    return { status, message: 'Workflow managed' };` },
  'workspace.module.ts': { toolName: 'open_workspace', desc: 'Open workspace', mcp: 'workspace-mcp', impl: `    return await this.load_workspace(params);` },
  'copilot.module.ts': { toolName: 'research_copilot', desc: 'AI Copilot interactions', mcp: 'copilot-mcp', impl: `    return await this.summarize(params);` },
  'report.module.ts': { toolName: 'generate_report', desc: 'Generate reports', mcp: 'report-mcp', impl: `    return await this.generate_report(params);` },
  'settings.module.ts': { toolName: 'manage_settings', desc: 'Manage settings', mcp: 'settings-mcp', impl: `    return await this.load_settings(params);` },
};

const dir = path.join(process.cwd(), 'src', 'modules');

for (const [file, config] of Object.entries(MCP_MAPPINGS)) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');

  // Strip existing @Tool decorators
  content = content.replace(/^\s*@Tool\(\{[^}]+\}\)\s*\n/gm, '');

  // But we have an issue: for 'report.module.ts', the existing tool is also named 'generate_report'.
  // If we inject a new 'generate_report', we'll have duplicate methods.
  // So we rename the existing one to `_generate_report` if there's a conflict.
  if (file === 'report.module.ts') {
    content = content.replace(/async generate_report\(/g, 'async _generate_report(');
    config.impl = `    return await this._generate_report(params);`;
  }
  
  if (file === 'workflow.module.ts') {
    // workflow might not have status, let's see. 
    // We will just use start_pipeline for it.
    config.impl = `    return await this.start_pipeline(params);`;
  }

  // Inject the new public tool at the top of the class
  const orchestrator = `
  @Tool({ name: '${config.toolName}', description: '${config.desc}', inputSchema: z.any(), metadata: { category: '${config.mcp}' } })
  async ${config.toolName}(params: any) {
${config.impl}
  }
`;

  content = content.replace(/export class [^\s]+ {/, (match) => {
    return match + '\n' + orchestrator;
  });

  fs.writeFileSync(p, content);
  console.log(`Refactored ${file}`);
}
