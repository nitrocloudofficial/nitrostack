import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StateAnnotation } from '../graph/state.js';

async function callIssueMcpTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  const transport = new StdioClientTransport({
    command: 'node',
    args:    [process.env.ISSUE_MCP_PATH ?? '../../packages/mcp-servers/issue-mcp/dist/index.js'],
    env:     { ...process.env } as Record<string, string>,
  });

  const client = new Client({ name: 'orchestrator', version: '1.0.0' });
  await client.connect(transport);

  try {
    const result = await client.callTool({ name: toolName, arguments: args });
    const content = result.content as Array<{ type: string; text?: string }>;
    return content.find(c => c.type === 'text')?.text ?? '';
  } finally {
    await client.close();
  }
}

export async function issueAgent(state: typeof StateAnnotation.State) {
  console.log('[Issue Agent] Creating or updating issue tracker ticket...');

  try {
    const result = await callIssueMcpTool('create_or_update_issue', {
      project_key: 'KAN',
      title: `Pipeline Failure: ${state.ciGraphContext ? 'Build failed' : 'Incident'}`,
      description: `RCA Summary:\n${state.rcaSummary || 'N/A'}\n\nTrace Spans:\n${state.traceSpans || 'N/A'}`,
      priority: 'P1',
      trace_id: state.traceId || 'unknown'
    });

    console.log(`[Issue Agent] Successfully processed ticket: ${result}`);
  } catch (error: any) {
    console.error(`[Issue Agent] Failed to create or update issue: ${error.message}`);
  }

  return {}; // No state update strictly required for this step
}
