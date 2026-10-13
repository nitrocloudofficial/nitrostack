import fs from 'fs';
import path from 'path';

const files = [
  'research.module.ts', 'correlation.module.ts', 'evidence.module.ts',
  'knowledge-graph.module.ts', 'planner.module.ts', 'workflow.module.ts',
  'workspace.module.ts', 'copilot.module.ts', 'report.module.ts', 'settings.module.ts'
];

for (const file of files) {
  const filePath = path.join('src', 'modules', file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Revert the cosmetic titles and categories back to the original category layout
  content = content.replace(
    /@Tool\(\{ name: '([^']+)', title: '([^']+)', description: '([^']+)', inputSchema: z\.any\(\), metadata: \{ category: '([^']+)' \} \}\)/g,
    (match, name, title, description, category) => {
      // Restore original categories based on the file name
      const originalCategory = file.replace('.module.ts', '-mcp');
      return `@Tool({ name: '${name}', description: '${description}', inputSchema: z.any(), metadata: { category: '${originalCategory}' } })`;
    }
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Reverted ${file}`);
}
