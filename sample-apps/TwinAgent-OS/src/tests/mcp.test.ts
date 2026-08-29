import { describe, it, expect } from 'vitest';
import { mcpRegistry } from '../core/mcp/registry.js';

describe('MCP Ready Architecture Engine', () => {
  it('should expose registered core MCP tools', () => {
    const tools = mcpRegistry.getTools();
    expect(tools.length).toBeGreaterThan(0);

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('predictBurnout');
    expect(toolNames).toContain('predictProjectRisk');
    expect(toolNames).toContain('searchKnowledge');
  });

  it('should validate tool schema definition', () => {
    const tool = mcpRegistry.getTools().find((t) => t.name === 'updateTask');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('Update status');
  });
});
