import { Tool } from '../../tool.js';
import { SearchDetailLevel } from './types.js';

export type DetailLevel = SearchDetailLevel;

export async function serializeTool(tool: Tool, detail: DetailLevel = 'detailed'): Promise<string> {
  const mcpTool = await tool.toMcpTool();
  const schema = (mcpTool.inputSchema as Record<string, any>) || {};
  const properties = schema?.properties || {};
  const requiredSet = new Set(Array.isArray(schema?.required) ? schema.required : []);

  switch (detail) {
    case 'brief':
      return `- **${tool.name}**: ${tool.description || 'No description'}`;

    case 'detailed': {
      const lines: string[] = [
        `### ${tool.name}`,
        tool.description || 'No description',
        '**Parameters**:',
      ];

      const propKeys = Object.keys(properties);
      if (propKeys.length === 0) {
        lines.push('  *(none)*');
      } else {
        for (const key of propKeys) {
          const prop = properties[key] || {};
          const isReq = requiredSet.has(key) ? 'required' : 'optional';
          const type = prop.type || 'any';
          const desc = prop.description ? `: ${prop.description}` : '';
          const defaultVal =
            prop.default !== undefined ? ` (default: ${JSON.stringify(prop.default)})` : '';
          lines.push(`  - \`${key}\` (${type}, ${isReq})${defaultVal}${desc}`);
        }
      }
      return lines.join('\n');
    }

    case 'full':
      return `### ${tool.name}\n${tool.description || ''}\n\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\``;
  }
}

export async function serializeTools(
  tools: Tool[],
  detail: DetailLevel = 'detailed'
): Promise<string> {
  if (tools.length === 0) return 'No matching tools found.';
  const serialized = await Promise.all(tools.map((t) => serializeTool(t, detail)));
  return serialized.join('\n\n');
}
