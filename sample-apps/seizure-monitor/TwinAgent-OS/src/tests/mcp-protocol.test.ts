import { describe, it, expect } from 'vitest';
import { mcpHandlers } from '../mcp/handlers/index.js';
import { mcpToolDefinitions } from '../mcp/tools/index.js';
import { mcpResourceDefinitions, mcpResourceHandlers } from '../mcp/resources/index.js';
import { mcpPromptDefinitions, mcpPromptHandlers } from '../mcp/prompts/index.js';
import { mcpRegistry } from '../mcp/registry/index.js';

describe('Official MCP Protocol Server Integration', () => {
  it('should expose 15 official MCP Tools via registry matching backend capabilities', () => {
    const tools = mcpRegistry.getTools();
    expect(tools.length).toBe(15);
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('predictProjectRisk');
    expect(toolNames).toContain('predictBurnout');
    expect(toolNames).toContain('updateTask');
    expect(toolNames).toContain('searchKnowledge');
    expect(toolNames).toContain('organizationHealth');
    expect(toolNames).toContain('recommendAssignee');
    expect(toolNames).toContain('findExpert');
    expect(toolNames).toContain('runWorkflow');
    expect(toolNames).toContain('approveAction');
    expect(toolNames).toContain('syncConnector');
  });

  it('should format tool execution outputs according to official MCP response spec', async () => {
    const res = await mcpHandlers.organizationHealth({ organizationId: 'test-org-id' });
    expect(res).toHaveProperty('content');
    expect(Array.isArray(res.content)).toBe(true);
    expect(res.content[0]).toHaveProperty('type', 'text');
    if (res.content[0].type === 'text') {
      expect(typeof res.content[0].text).toBe('string');
    }
  });

  it('should handle invalid tool input via Zod validation gracefully', async () => {
    const res = await mcpHandlers.predictProjectRisk({});
    expect(res.isError).toBe(true);
    if (res.content[0].type === 'text') {
      expect(res.content[0].text).toContain('Error executing MCP Tool');
    }
  });

  it('should expose read-only MCP Resources and read resource data', async () => {
    expect(mcpResourceDefinitions.length).toBeGreaterThanOrEqual(4);
    const systemHealth = await mcpResourceHandlers.readResource('twinagent://system/health', 'org-1');
    expect(systemHealth.contents[0].text).toContain('TwinAgent OS Backend');
  });

  it('should expose official MCP Prompt templates', () => {
    expect(mcpPromptDefinitions.length).toBe(3);
    const prompt = mcpPromptHandlers.getPrompt('summarize_project_risk', { projectId: 'p-123' });
    expect(prompt.messages[0].content.text).toContain('p-123');
  });
});
