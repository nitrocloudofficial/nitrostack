import fs from 'fs';
import path from 'path';

const files = {
  'research.module.ts': {
    title: 'Research MCP',
    category: '1. Research Data'
  },
  'correlation.module.ts': {
    title: 'Correlation MCP',
    category: '2. Analytics'
  },
  'evidence.module.ts': {
    title: 'Evidence MCP',
    category: '2. Analytics'
  },
  'knowledge_graph.module.ts': {
    title: 'Knowledge Graph MCP',
    category: '2. Analytics'
  },
  'planner.module.ts': {
    title: 'Planner Agent',
    category: '0. Orchestration'
  },
  'workflow.module.ts': {
    title: 'Workflow Agent',
    category: '0. Orchestration'
  },
  'workspace.module.ts': {
    title: 'Workspace MCP',
    category: '3. Outputs'
  },
  'copilot.module.ts': {
    title: 'Copilot Agent',
    category: '0. Orchestration'
  },
  'report.module.ts': {
    title: 'Report MCP',
    category: '3. Outputs'
  },
  'settings.module.ts': {
    title: 'Settings MCP',
    category: '4. Configuration'
  }
};

for (const [file, meta] of Object.entries(files)) {
  const filePath = path.join('src', 'modules', file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the `@Tool({ ... })` line
  content = content.replace(
    /@Tool\({ name: '([^']+)', description: '([^']+)', inputSchema: z.any\(\), metadata: \{ category: '[^']+' \} }\)/g,
    `@Tool({ name: '$1', title: '${meta.title}', description: '$2', inputSchema: z.any(), metadata: { category: '${meta.category}' } })`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}
