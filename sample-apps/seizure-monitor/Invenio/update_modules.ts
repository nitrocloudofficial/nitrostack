import fs from 'fs';
import path from 'path';

const map: Record<string, string> = {
  'research.module.ts': 'research-mcp',
  'correlation.module.ts': 'correlation-mcp',
  'evidence.module.ts': 'evidence-mcp',
  'knowledge-graph.module.ts': 'knowledge-graph-mcp',
  'planner.module.ts': 'planner-mcp',
  'workflow.module.ts': 'workflow-mcp',
  'workspace.module.ts': 'workspace-mcp',
  'report.module.ts': 'report-mcp',
  'copilot.module.ts': 'copilot-mcp',
  'settings.module.ts': 'settings-mcp'
};

const dir = path.join(process.cwd(), 'src', 'modules');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.module.ts'));

for (const file of files) {
  if (!map[file]) continue;
  const mcpId = map[file];
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  
  // Replace the module name
  content = content.replace(/@Module\(\{\s*name:\s*'[^']+',/g, `@Module({\n  name: '${mcpId}',`);
  
  fs.writeFileSync(p, content);
  console.log(`Updated module name in ${file} to ${mcpId}`);
}
