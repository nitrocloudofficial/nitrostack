"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchAgent = patchAgent;
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
const google_genai_1 = require("@langchain/google-genai");
// ─── MCP client helpers ───────────────────────────────────────────────────────
async function callGitMcpTool(toolName, args) {
    const transport = new stdio_js_1.StdioClientTransport({
        command: 'node',
        args: [process.env.GIT_MCP_PATH ?? 'packages/mcp-servers/git-mcp/dist/index.js'],
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
/**
 * Parse SEARCH/REPLACE blocks from model output.
 * Port of kassi's remediate.parse_blocks().
 */
function parseBlocks(text) {
    const BLOCK = /<{5,}\s*SEARCH\s*\n([\s\S]*?)\n={5,}\s*\n([\s\S]*?)\n>{5,}\s*REPLACE/g;
    const blocks = [];
    const cleaned = text.replace(/```/g, '');
    let m;
    while ((m = BLOCK.exec(cleaned)) !== null) {
        blocks.push({ search: m[1], replace: m[2] });
    }
    return blocks;
}
async function callSlackMcpTool(toolName, args) {
    const transport = new stdio_js_1.StdioClientTransport({
        command: 'node',
        args: [process.env.SLACK_MCP_PATH ?? 'packages/mcp-servers/slack-mcp/dist/index.js'],
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
// ─── patchAgent ───────────────────────────────────────────────────────────────
async function patchAgent(state) {
    const ctx = state.pipelineContext;
    console.log(`[Patch Synthesizer] Generating patch grounded on GraphRAG context`);
    // Determine which file to fix
    const targetFile = state.suggestedFiles?.[0];
    let fileContent = '';
    if (targetFile && ctx?.owner && ctx?.repo && ctx?.commit_sha) {
        try {
            console.log(`[Patch Synthesizer] Reading ${targetFile} via git-mcp`);
            fileContent = await callGitMcpTool('read_file_at_commit', {
                repo: `${ctx.owner}/${ctx.repo}`,
                commit: ctx.commit_sha,
                path: targetFile,
            });
        }
        catch (err) {
            console.warn(`[Patch Synthesizer] git-mcp read failed: ${err.message}`);
        }
    }
    let patchDiff = '';
    let rcaSummary = '';
    try {
        const model = new google_genai_1.ChatGoogleGenerativeAI({
            model: 'gemini-3-flash-preview',
            apiKey: process.env.GEMINI_API_KEY,
        });
        // Ground the prompt on the GraphRAG context and the actual file content.
        // The SEARCH/REPLACE format mirrors kassi/remediate.py's SEARCH_REPLACE_SYSTEM.
        const prompt = `
You are an expert SRE proposing the smallest code fix for a CI pipeline failure.
Ground every claim strictly in the provided context — never invent file paths, line numbers, or error messages.

CI Failure Context (graph-grounded, do not invent anything beyond this):
${state.ciGraphContext || state.jobLogs || 'No context available'}

${fileContent ? `Current file (${targetFile}):\n${fileContent}` : ''}

Provide your response in exactly this JSON format:
{
  "rcaSummary": "One-paragraph root cause analysis citing the failing step and error category",
  "targetFile": "The exact path of the file that needs to be fixed. If the fix belongs in a different file than the 'Current file' provided above (e.g. backend/requirements.txt), specify that path here.",
  "patchedFileContent": "The complete, fully-patched content of the target file. Do not use diffs or blocks, output the entire updated file."
}

Rules:
- Keep the change minimal. Do not remove error handling or comments.
- If you need to fix a file that was not provided in the 'Current file', you MUST still output its full, correct content from scratch.
- If no fix is possible, set patchedFileContent to an empty string and explain in rcaSummary.
- No prose outside the JSON object.
`.trim();
        const response = await model.invoke(prompt);
        const content = response.content.toString();
        // Try to parse structured JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            rcaSummary = parsed.rcaSummary ?? '';
            if (parsed.patchedFileContent && parsed.targetFile) {
                patchDiff = parsed.patchedFileContent;
                // Override suggested files with the LLM's chosen target file
                state.suggestedFiles = [parsed.targetFile];
                console.log(`[Patch Synthesizer] Generated full patched file content for ${parsed.targetFile}`);
            }
            else {
                patchDiff = `[NOTE] No file content generated. RCA: ${rcaSummary}`;
            }
        }
        else {
            rcaSummary = 'Error parsing LLM response';
            patchDiff = 'Error parsing diff';
        }
    }
    catch (error) {
        console.error('[Patch Synthesizer] LLM Error:', error);
        patchDiff = `LLM Failed: ${error.message}`;
        rcaSummary = 'Failed to synthesize patch due to LLM error.';
    }
    console.log(`[Patch Synthesizer] Patch ready. Sending to Slack.`);
    let slackThreadId = 'slack-thread-123';
    const channelId = process.env.SLACK_CHANNEL_ID;
    if (channelId) {
        try {
            const slackResult = await callSlackMcpTool('post_interactive_alert', {
                channel_id: channelId,
                rca_summary: `*Run ID:* ${ctx?.run_id || 'unknown'}\n\n${rcaSummary}`,
                diff_patch: patchDiff,
                action_buttons: ['Approve', 'Reject']
            });
            console.log(`[Patch Synthesizer] Slack: ${slackResult}`);
            const match = slackResult.match(/Thread ID:\s*(\S+)/);
            if (match)
                slackThreadId = match[1];
        }
        catch (err) {
            console.warn(`[Patch Synthesizer] Slack MCP call failed: ${err.message}`);
        }
    }
    return {
        status: 'PENDING_APPROVAL', // Halts execution, waits for Slack webhook
        patchDiff,
        rcaSummary,
        slackThreadId,
        suggestedFiles: state.suggestedFiles,
    };
}
