import { StateGraph, START, END } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import pg from 'pg';
import { StateAnnotation } from './state';
import { diagnosticAgent } from '../agents/diagnostic';
import { traceAgent } from '../agents/trace';
import { patchAgent } from '../agents/patch';
import { verifierAgent } from '../agents/verifier';
import { issueAgent } from '../agents/issue';

const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/omnitrace',
});

let checkpointer: PostgresSaver | null = null;

export async function createGraph() {
  if (!checkpointer) {
    checkpointer = new PostgresSaver(pool);
    await checkpointer.setup();
  }

  const workflow = new StateGraph(StateAnnotation)
    .addNode('diagnostic', diagnosticAgent)
    .addNode('trace', traceAgent)
    .addNode('patch', patchAgent)
    .addNode('verifier', verifierAgent)
    .addNode('issue', issueAgent)
    .addEdge(START, 'diagnostic')
    .addEdge('diagnostic', 'trace')
    .addEdge('trace', 'patch')
    .addConditionalEdges('patch', (state) => {
      if (state.status === 'APPROVED' || state.status === 'PENDING_APPROVAL') return 'verifier';
      return END;
    })
    .addEdge('verifier', 'issue')
    .addEdge('issue', END);

  return workflow.compile({ checkpointer, interruptBefore: ['verifier'] });
}
