import { createMockContext } from '@nitrostack/core/testing';
import { FinanceStore } from './dist/services/finance-store.service.js';
import { DecisionService } from './dist/modules/decision/decision.service.js';
import { WorkflowService } from './dist/modules/workflow/workflow.service.js';
import { ReflectionService } from './dist/modules/reflection/reflection.service.js';
import { PlannerService } from './dist/modules/planner/planner.service.js';

const ctx = createMockContext();
const store = new FinanceStore();
const decisionEngine = new DecisionService(store);
const workflowEngine = new WorkflowService(store);
const reflectionEngine = new ReflectionService(store);
const planner = new PlannerService(store, decisionEngine, workflowEngine, reflectionEngine);

console.log('=== TEST 1: DecisionModule Business Rules ===');
const rule1 = decisionEngine.evaluateEmergencyFundPriority(0, 180000);
console.log('Rule 1 (Emergency Priority):', rule1.action_recommendation);

console.log('\n=== TEST 2: WorkflowModule Confidence Scoring & Retry ===');
const csvSample = 'date,description,amount\n2026-06-01,Stipend,60000\n2026-06-02,Rent,18000\n2026-06-03,Spotify,119';
const mockIngestFn = async (txt) => ({ success: true, transactions_added: 3, skipped_rows: 0 });
const stepRes = await workflowEngine.executeCsvIngestionWithRetry(csvSample, 'statement.csv', mockIngestFn, ctx);
console.log('Ingestion Step Result:', { step: stepRes.step_name, confidence: stepRes.confidence });

console.log('\n=== TEST 3: Multi-Step Single Prompt Compound Pipeline Test ===');
console.log('User Input Prompt: "analyze my finances and tell me if I can afford an iPhone for 75000"');
const compoundRes = await planner.routeAndExecuteByContent('analyze my finances and tell me if I can afford an iPhone for 75000', ctx);

console.log('\n✅ WORKFLOW NAME:', compoundRes.workflow_name);
console.log('📋 FULL SEQUENCE OF TOOLS CALLED IN ONE SINGLE TURN (NO MANUAL INPUT BETWEEN STEPS):');
console.log(compoundRes.steps_executed.join(' -> '));

console.log('\n💬 FINAL CONSOLIDATED CHAT RESPONSE:');
console.log(compoundRes.consolidated_summary);

if (compoundRes.steps_executed.length >= 6) {
  console.log('\n✅ VERIFIED: Full multi-step workflow executed continuously in a single turn without waiting for user input between steps!');
} else {
  console.error('\n❌ ERROR: Workflow stopped early!');
  process.exit(1);
}

process.exit(0);
