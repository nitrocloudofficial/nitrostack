import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StateAnnotation } from '../graph/state.js';

// ─── MCP client factory ───────────────────────────────────────────────────────

/** Lazily create a ci-mcp stdio client and call one tool, then close. */
async function callCiMcpTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  const transport = new StdioClientTransport({
    command: 'node',
    args:    [process.env.CI_MCP_PATH ?? 'packages/mcp-servers/ci-mcp/dist/index.js'],
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

// ─── Parse suggestedFiles from CIRetrievedContext.toText() ───────────────────

function parseSuggestedFiles(contextText: string): string[] {
  const match = contextText.match(/### Suggested Files to Fix \(graph heuristic\)\n([\s\S]*?)(?:\n###|$)/);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map(l => l.trim().replace(/^-\s*/, ''))
    .filter(Boolean);
}

// ─── diagnosticAgent ──────────────────────────────────────────────────────────

export async function diagnosticAgent(state: typeof StateAnnotation.State) {
  const ctx = state.pipelineContext;
  if (!ctx?.owner || !ctx?.repo || !ctx?.run_id) {
    console.error('[Diagnostic Agent] Missing owner/repo/run_id in pipelineContext');
    return {
      status: 'FAILED' as const,
      error:  'pipelineContext must include owner, repo, and run_id',
    };
  }

  console.log(`[Diagnostic Agent] Calling get_ci_graphrag_context for ${ctx.owner}/${ctx.repo} run ${ctx.run_id}`);

  try {
    // Primary tool: get the full graph-grounded CI failure context from ci-mcp.
    // ci-mcp fetches all GitHub data, builds the CIPipelineGraph, runs BFS retrieval,
    // and returns CIRetrievedContext.toText() — LLM-ready, sanitized.
    const ciGraphContext = await callCiMcpTool('get_ci_graphrag_context', {
      owner:  ctx.owner,
      repo:   ctx.repo,
      run_id: ctx.run_id,
    });

    if (ciGraphContext.startsWith('[ERROR]')) {
      console.error(`[Diagnostic Agent] ci-mcp returned error: ${ciGraphContext}`);
      return {
        status:         'FAILED' as const,
        ciGraphContext,
        error:          ciGraphContext,
      };
    }

    // Parse suggested files from the structured text output
    const suggestedFiles = parseSuggestedFiles(ciGraphContext);

    console.log(
      `[Diagnostic Agent] GraphRAG context received. ` +
      `Suggested files: ${suggestedFiles.join(', ') || 'none (using changed files fallback)'}`
    );

    return {
      status:         'PATCHING' as const,
      ciGraphContext,
      suggestedFiles,
      jobLogs:        ciGraphContext, // backward compatible with patchAgent existing field
    };
  } catch (err: any) {
    const errMsg = `[Diagnostic Agent] ci-mcp call failed: ${err.message}`;
    console.error(errMsg);
    return {
      status: 'FAILED' as const,
      error:  errMsg,
    };
  }
}
