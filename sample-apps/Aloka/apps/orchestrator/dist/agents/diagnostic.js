"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnosticAgent = diagnosticAgent;
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
// ─── MCP client factory ───────────────────────────────────────────────────────
/** Lazily create a ci-mcp stdio client and call one tool, then close. */
async function callCiMcpTool(toolName, args) {
    const transport = new stdio_js_1.StdioClientTransport({
        command: 'node',
        args: [process.env.CI_MCP_PATH ?? 'packages/mcp-servers/ci-mcp/dist/index.js'],
        env: { ...process.env },
    });
    const client = new index_js_1.Client({ name: 'orchestrator', version: '1.0.0' });
    await client.connect(transport);
    try {
        const result = await client.callTool({ name: toolName, arguments: args });
        const content = result.content;
        return content.find(c => c.type === 'text')?.text ?? '';
    }
    finally {
        await client.close();
    }
}
// ─── Parse suggestedFiles from CIRetrievedContext.toText() ───────────────────
function parseSuggestedFiles(contextText) {
    const match = contextText.match(/### Suggested Files to Fix \(graph heuristic\)\n([\s\S]*?)(?:\n###|$)/);
    if (!match)
        return [];
    return match[1]
        .split('\n')
        .map(l => l.trim().replace(/^-\s*/, ''))
        .filter(Boolean);
}
// ─── diagnosticAgent ──────────────────────────────────────────────────────────
async function diagnosticAgent(state) {
    const ctx = state.pipelineContext;
    if (!ctx?.owner || !ctx?.repo || !ctx?.run_id) {
        console.error('[Diagnostic Agent] Missing owner/repo/run_id in pipelineContext');
        return {
            status: 'FAILED',
            error: 'pipelineContext must include owner, repo, and run_id',
        };
    }
    console.log(`[Diagnostic Agent] Calling get_ci_graphrag_context for ${ctx.owner}/${ctx.repo} run ${ctx.run_id}`);
    try {
        // Primary tool: get the full graph-grounded CI failure context from ci-mcp.
        // ci-mcp fetches all GitHub data, builds the CIPipelineGraph, runs BFS retrieval,
        // and returns CIRetrievedContext.toText() — LLM-ready, sanitized.
        const ciGraphContext = await callCiMcpTool('get_ci_graphrag_context', {
            owner: ctx.owner,
            repo: ctx.repo,
            run_id: ctx.run_id,
        });
        if (ciGraphContext.startsWith('[ERROR]')) {
            console.error(`[Diagnostic Agent] ci-mcp returned error: ${ciGraphContext}`);
            return {
                status: 'FAILED',
                ciGraphContext,
                error: ciGraphContext,
            };
        }
        // Parse suggested files from the structured text output
        const suggestedFiles = parseSuggestedFiles(ciGraphContext);
        console.log(`[Diagnostic Agent] GraphRAG context received. ` +
            `Suggested files: ${suggestedFiles.join(', ') || 'none (using changed files fallback)'}`);
        return {
            status: 'PATCHING',
            ciGraphContext,
            suggestedFiles,
            jobLogs: ciGraphContext, // backward compatible with patchAgent existing field
        };
    }
    catch (err) {
        const errMsg = `[Diagnostic Agent] ci-mcp call failed: ${err.message}`;
        console.error(errMsg);
        return {
            status: 'FAILED',
            error: errMsg,
        };
    }
}
