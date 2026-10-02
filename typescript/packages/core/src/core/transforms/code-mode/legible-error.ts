import { Tool } from '../../tool.js';

/**
 * When guest sandbox code calls a tool with invalid or missing arguments,
 * formatLegibleToolError extracts the canonical parameter schema and formats
 * an actionable, self-correcting error message for the LLM.
 */
export async function formatLegibleToolError(tool: Tool, rawError: unknown): Promise<string> {
  const mcpTool = await tool.toMcpTool();
  const schema = (mcpTool.inputSchema as Record<string, any>) || {};
  const properties = schema?.properties || {};
  const requiredSet = new Set(Array.isArray(schema?.required) ? schema.required : []);

  const paramSummary = Object.keys(properties)
    .map((key) => `${key}${requiredSet.has(key) ? '*' : ''}`)
    .join(', ');

  const baseMessage = rawError instanceof Error ? rawError.message : String(rawError);
  return `callTool('${tool.name}') failed: ${baseMessage}\nValid parameters for ${tool.name} (* = required): ${paramSummary || '(none)'}`;
}
