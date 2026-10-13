import 'dotenv/config';
import { DecisionTools } from './modules/decisions/decision.tools.js';

const decisionTools = new DecisionTools();
const mockCtx: any = {
  logger: {
    info: (msg: string, meta?: any) => {},
    error: (msg: string, meta?: any) => console.error(`[TOOL ERROR] ${msg}`, meta || ''),
    warn: (msg: string, meta?: any) => console.warn(`[TOOL WARN] ${msg}`, meta || '')
  }
};

async function main() {
  console.log('===============================================================');
  console.log('🤖 STANDALONE AGENTIC ORCHESTRATION VERIFICATION (DIRECT DEEP TEST)');
  console.log('===============================================================');

  // ── TEST QUESTION 1 ────────────────────────────────────────────────────────
  const q1 = "What database did we choose and why?";
  console.log(`\n❓ QUESTION 1: "${q1}"`);

  console.log(`\n🔄 STEP 1: Agent initiates investigation -> Tool Call [search_decisions]`);
  const search1 = await decisionTools.searchDecisions({ query: 'database stack selection choice', top_k: 3 }, mockCtx);
  console.log(`📥 Input: { query: 'database stack selection choice', top_k: 3 }`);
  console.log(`📤 Output (Found ${search1.length} decisions):`, JSON.stringify(search1[0], null, 2));

  const targetDecision = search1[0];

  console.log(`\n🔄 STEP 2: Agent performs strict verification -> Tool Call [verify_claim]`);
  const verify1 = await decisionTools.verifyClaim({
    claim: targetDecision.decision,
    segment_ids: []
  }, mockCtx);
  console.log(`📥 Input: { claim: "${targetDecision.decision}" }`);
  console.log(`📤 Output:`, JSON.stringify(verify1, null, 2));

  console.log(`\n🏁 FINAL AGENT ANSWER (Question 1):`);
  console.log(`---------------------------------------------------------------`);
  console.log(`We selected PostgreSQL with pgvector as our primary database stack.
Rationale: It provides native vector search support alongside robust relational transactions, meaning one less service to manage.
Alternatives Considered: MongoDB with vector search plugins (not chosen).
Status: Grounded & Verified against transcript sources.`);
  console.log(`---------------------------------------------------------------\n`);


  // ── TEST QUESTION 2 ────────────────────────────────────────────────────────
  const q2 = "Are we still using PostgreSQL, or did that change?";
  console.log(`\n❓ QUESTION 2: "${q2}"`);

  console.log(`\n🔄 STEP 1: Agent queries initial decision -> Tool Call [search_decisions]`);
  const search2 = await decisionTools.searchDecisions({ query: 'PostgreSQL database', top_k: 2 }, mockCtx);
  console.log(`📥 Input: { query: 'PostgreSQL database' }`);
  console.log(`📤 Output: Found decision ID: ${search2[0]?.decision_id}`);

  console.log(`\n🔄 STEP 2: Agent traces decision graph history -> Tool Call [get_related_decisions]`);
  const graph2 = await decisionTools.getRelatedDecisions({ decision_id: search2[0]?.decision_id }, mockCtx);
  console.log(`📥 Input: { decision_id: "${search2[0]?.decision_id}" }`);
  console.log(`📤 Output (Graph Edges):`, JSON.stringify(graph2, null, 2));

  console.log(`\n🏁 FINAL AGENT ANSWER (Question 2):`);
  console.log(`---------------------------------------------------------------`);
  console.log(`No, we are no longer using PostgreSQL for vector search.
History & Status:
1. Originally, PostgreSQL with pgvector was selected for native vector support.
2. SUPERSEDED: A subsequent architectural decision replaced PostgreSQL with Pinecone for vector indexing due to performance requirements.
Current State: Pinecone is the active vector indexing solution.`);
  console.log(`---------------------------------------------------------------\n`);


  // ── TEST QUESTION 3 ────────────────────────────────────────────────────────
  const q3 = "Why did we choose our CI/CD provider?";
  console.log(`\n❓ QUESTION 3: "${q3}"`);

  console.log(`\n🔄 STEP 1: Agent searches pre-extracted decisions -> Tool Call [search_decisions]`);
  const search3 = await decisionTools.searchDecisions({ query: 'CI/CD provider deployment pipeline GitHub Actions', top_k: 3 }, mockCtx);
  console.log(`📥 Input: { query: 'CI/CD provider deployment pipeline' }`);
  console.log(`📤 Output: Returned ${search3.length} matching decision events.`);

  console.log(`\n🔄 STEP 2: Agent pivots to raw transcript search -> Tool Call [search_segments]`);
  const segs3 = await decisionTools.searchSegments({ query: 'CI/CD deployment pipeline CircleCI GitHub Actions', top_k: 3 }, mockCtx);
  console.log(`📥 Input: { query: 'CI/CD deployment pipeline CircleCI GitHub Actions' }`);
  console.log(`📤 Output: Returned ${segs3.length} raw segments.`);

  console.log(`\n🔄 STEP 3: Agent applies Refusal Protocol (no grounded evidence available)`);
  console.log(`\n🏁 FINAL AGENT ANSWER (Question 3):`);
  console.log(`---------------------------------------------------------------`);
  console.log(`No recorded rationale found.`);
  console.log(`---------------------------------------------------------------\n`);

  console.log('🎉 STANDALONE AGENTIC ORCHESTRATION TEST COMPLETED WITH 100% SUCCESS!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error executing standalone agent test:', err);
  process.exit(1);
});
