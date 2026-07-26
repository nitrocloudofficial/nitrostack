import { GraphState } from '@omnitrace/types';
import { Annotation } from '@langchain/langgraph';

// Using LangGraph's Annotation for state
export const StateAnnotation = Annotation.Root({
  status: Annotation<GraphState['status']>({
    reducer: (curr, next) => next || curr,
    default: () => 'PENDING'
  }),
  pipelineContext: Annotation<GraphState['pipelineContext']>({
    reducer: (curr, next) => (next ? { ...(curr || {}), ...next } as any : curr),
    default: () => undefined
  }),
  // ── ci-mcp GraphRAG outputs (populated by diagnosticAgent) ─────────────────
  ciGraphContext: Annotation<string>({
    reducer: (curr, next) => next || curr,
    default: () => ''
  }),
  suggestedFiles: Annotation<string[]>({
    reducer: (curr, next) => (next && next.length ? next : curr),
    default: () => []
  }),
  ciErrors: Annotation<string>({
    reducer: (curr, next) => next || curr,
    default: () => ''
  }),
  // ── Existing fields ─────────────────────────────────────────────────────────
  jobLogs: Annotation<string>({
    reducer: (curr, next) => next || curr,
    default: () => ''
  }),
  traceId: Annotation<string>({
    reducer: (curr, next) => next || curr,
    default: () => ''
  }),
  traceSpans: Annotation<string>({
    reducer: (curr, next) => next || curr,
    default: () => ''
  }),
  domErrors: Annotation<string>({
    reducer: (curr, next) => next || curr,
    default: () => ''
  }),
  rcaSummary: Annotation<string>({
    reducer: (curr, next) => next || curr,
    default: () => ''
  }),
  patchDiff: Annotation<string>({
    reducer: (curr, next) => next || curr,
    default: () => ''
  }),
  slackThreadId: Annotation<string>({
    reducer: (curr, next) => next || curr,
    default: () => ''
  }),
  error: Annotation<string>({
    reducer: (curr, next) => next || curr,
    default: () => ''
  })
});
