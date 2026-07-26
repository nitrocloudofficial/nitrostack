"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.traceAgent = traceAgent;
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
// ─── MCP client factory ───────────────────────────────────────────────────────
/** Spawn an otel-mcp stdio client, call one tool, then close. */
async function callOtelMcpTool(toolName, args) {
    const transport = new stdio_js_1.StdioClientTransport({
        command: 'node',
        args: [process.env.OTEL_MCP_PATH ?? 'packages/mcp-servers/otel-mcp/dist/index.js'],
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
// ─── traceAgent ───────────────────────────────────────────────────────────────
/**
 * FR-2.2 — Distributed Trace Correlation.
 *
 * Runs after diagnosticAgent. Attempts to:
 *   1. Extract a W3C traceparent / correlation ID from the CI log context.
 *   2. Query otel-mcp (local OTel log file) to get structured span data for
 *      the failing trace — error spans, service call chain, and RPC/DB traces.
 *   3. Fetch the service dependency graph for the same trace.
 *
 * The agent is deliberately non-blocking: if no trace ID is found (e.g. the
 * microservice logs were not instrumented or the CI logs do not contain a
 * traceparent header) the pipeline continues to patchAgent with empty trace
 * fields. This avoids blocking the patch flow for non-distributed failures.
 */
async function traceAgent(state) {
    const ciContext = state.ciGraphContext;
    if (!ciContext) {
        console.warn('[Trace Agent] No ciGraphContext in state — skipping trace correlation.');
        return {};
    }
    console.log('[Trace Agent] Extracting trace ID from CI log context...');
    // ── Step 1: Extract trace ID from CI log output ────────────────────────────
    let traceId;
    try {
        traceId = await callOtelMcpTool('extract_trace_id', { log_text: ciContext });
    }
    catch (err) {
        console.warn(`[Trace Agent] extract_trace_id failed: ${err.message} — skipping.`);
        return {};
    }
    if (!traceId) {
        console.warn('[Trace Agent] No traceparent / correlation ID found in CI logs — skipping trace correlation.');
        return {};
    }
    console.log(`[Trace Agent] Found trace ID: ${traceId}. Querying otel-mcp...`);
    // ── Step 2: Fetch span context from the local OTel log file ───────────────
    let spanContext = '';
    try {
        spanContext = await callOtelMcpTool('get_trace_context', {
            trace_id: traceId,
            log_file_path: process.env.OTEL_LOG_FILE,
        });
        if (spanContext.startsWith('[ERROR]')) {
            console.error(`[Trace Agent] get_trace_context error: ${spanContext}`);
        }
        else {
            console.log('[Trace Agent] Span context retrieved successfully.');
        }
    }
    catch (err) {
        console.warn(`[Trace Agent] get_trace_context failed: ${err.message}`);
    }
    // ── Step 3: Fetch service dependency graph ─────────────────────────────────
    let depGraph = '';
    try {
        depGraph = await callOtelMcpTool('get_service_dependency_graph', { trace_id: traceId });
        if (depGraph.startsWith('[ERROR]')) {
            console.warn(`[Trace Agent] get_service_dependency_graph returned error: ${depGraph}`);
            depGraph = '';
        }
    }
    catch (err) {
        console.warn(`[Trace Agent] get_service_dependency_graph failed: ${err.message}`);
    }
    // ── Compose traceSpans output ──────────────────────────────────────────────
    const traceSpans = [
        spanContext,
        depGraph ? `\n### Service Dependency Graph\n${depGraph}` : '',
    ].filter(Boolean).join('\n');
    console.log('[Trace Agent] Trace correlation complete.');
    return {
        traceId,
        traceSpans: traceSpans || `[INFO] Trace ID ${traceId} found but no span data available.`,
    };
}
