"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueAgent = issueAgent;
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
async function callIssueMcpTool(toolName, args) {
    const transport = new stdio_js_1.StdioClientTransport({
        command: 'node',
        args: [process.env.ISSUE_MCP_PATH ?? '../../packages/mcp-servers/issue-mcp/dist/index.js'],
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
async function issueAgent(state) {
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
    }
    catch (error) {
        console.error(`[Issue Agent] Failed to create or update issue: ${error.message}`);
    }
    return {}; // No state update strictly required for this step
}
