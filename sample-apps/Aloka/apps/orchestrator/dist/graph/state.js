"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateAnnotation = void 0;
const langgraph_1 = require("@langchain/langgraph");
// Using LangGraph's Annotation for state
exports.StateAnnotation = langgraph_1.Annotation.Root({
    status: (0, langgraph_1.Annotation)({
        reducer: (curr, next) => next || curr,
        default: () => 'PENDING'
    }),
    pipelineContext: (0, langgraph_1.Annotation)({
        reducer: (curr, next) => (next ? { ...(curr || {}), ...next } : curr),
        default: () => undefined
    }),
    // ── ci-mcp GraphRAG outputs (populated by diagnosticAgent) ─────────────────
    ciGraphContext: (0, langgraph_1.Annotation)({
        reducer: (curr, next) => next || curr,
        default: () => ''
    }),
    suggestedFiles: (0, langgraph_1.Annotation)({
        reducer: (curr, next) => (next && next.length ? next : curr),
        default: () => []
    }),
    ciErrors: (0, langgraph_1.Annotation)({
        reducer: (curr, next) => next || curr,
        default: () => ''
    }),
    // ── Existing fields ─────────────────────────────────────────────────────────
    jobLogs: (0, langgraph_1.Annotation)({
        reducer: (curr, next) => next || curr,
        default: () => ''
    }),
    traceId: (0, langgraph_1.Annotation)({
        reducer: (curr, next) => next || curr,
        default: () => ''
    }),
    traceSpans: (0, langgraph_1.Annotation)({
        reducer: (curr, next) => next || curr,
        default: () => ''
    }),
    domErrors: (0, langgraph_1.Annotation)({
        reducer: (curr, next) => next || curr,
        default: () => ''
    }),
    rcaSummary: (0, langgraph_1.Annotation)({
        reducer: (curr, next) => next || curr,
        default: () => ''
    }),
    patchDiff: (0, langgraph_1.Annotation)({
        reducer: (curr, next) => next || curr,
        default: () => ''
    }),
    slackThreadId: (0, langgraph_1.Annotation)({
        reducer: (curr, next) => next || curr,
        default: () => ''
    }),
    error: (0, langgraph_1.Annotation)({
        reducer: (curr, next) => next || curr,
        default: () => ''
    })
});
