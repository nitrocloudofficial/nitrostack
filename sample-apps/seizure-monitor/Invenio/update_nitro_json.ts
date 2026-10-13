import fs from 'fs';
import path from 'path';

const MCP_MAPPINGS: Record<string, string[]> = {
  'research-mcp': ['research_search'],
  'correlation-mcp': ['analyze_correlation'],
  'evidence-mcp': ['analyze_evidence'],
  'knowledge-graph-mcp': ['build_knowledge_graph'],
  'planner-mcp': ['execute_autonomous_research'],
  'workflow-mcp': ['manage_workflow'],
  'workspace-mcp': ['open_workspace'],
  'copilot-mcp': ['research_copilot'],
  'report-mcp': ['generate_report'],
  'settings-mcp': ['manage_settings']
};

const nitroPath = path.join(process.cwd(), 'nitro.json');
const nitroData = JSON.parse(fs.readFileSync(nitroPath, 'utf8'));

for (const app of nitroData.mcpApps) {
  if (MCP_MAPPINGS[app.id]) {
    app.tools = MCP_MAPPINGS[app.id];
  }
}

fs.writeFileSync(nitroPath, JSON.stringify(nitroData, null, 2));
console.log('Updated nitro.json');
