"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGraph = createGraph;
const langgraph_1 = require("@langchain/langgraph");
const langgraph_checkpoint_postgres_1 = require("@langchain/langgraph-checkpoint-postgres");
const pg_1 = __importDefault(require("pg"));
const state_1 = require("./state");
const diagnostic_1 = require("../agents/diagnostic");
const trace_1 = require("../agents/trace");
const patch_1 = require("../agents/patch");
const verifier_1 = require("../agents/verifier");
const issue_1 = require("../agents/issue");
const pool = new pg_1.default.Pool({
    connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/omnitrace',
});
let checkpointer = null;
async function createGraph() {
    if (!checkpointer) {
        checkpointer = new langgraph_checkpoint_postgres_1.PostgresSaver(pool);
        await checkpointer.setup();
    }
    const workflow = new langgraph_1.StateGraph(state_1.StateAnnotation)
        .addNode('diagnostic', diagnostic_1.diagnosticAgent)
        .addNode('trace', trace_1.traceAgent)
        .addNode('patch', patch_1.patchAgent)
        .addNode('verifier', verifier_1.verifierAgent)
        .addNode('issue', issue_1.issueAgent)
        .addEdge(langgraph_1.START, 'diagnostic')
        .addEdge('diagnostic', 'trace')
        .addEdge('trace', 'patch')
        .addConditionalEdges('patch', (state) => {
        if (state.status === 'APPROVED' || state.status === 'PENDING_APPROVAL')
            return 'verifier';
        return langgraph_1.END;
    })
        .addEdge('verifier', 'issue')
        .addEdge('issue', langgraph_1.END);
    return workflow.compile({ checkpointer, interruptBefore: ['verifier'] });
}
