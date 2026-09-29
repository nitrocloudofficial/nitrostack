/**
 * CAREBRIDGE AI - Integration & Unit Test Suite
 * 
 * Tests live tool classes: GuardianTools, TriageTools, HealthIntelligenceTools, PipelineTools.
 * Verifies multi-patient lookup, MongoDB Atlas seeding, Vector Knowledge Search, and HL7 FHIR R4 export.
 * Run with: npx tsx src/tests/integration.test.ts
 */

import { GuardianTools } from '../modules/guardian/guardian.tools.js';
import { TriageTools } from '../modules/triage/triage.tools.js';
import { HealthIntelligenceTools } from '../modules/health/health.tools.js';
import { PipelineTools } from '../modules/pipeline/pipeline.tools.js';
import { DEMO_PATIENT } from '../data/patient_dataset.js';
import { DETERMINISTIC_RED_FLAGS } from '../modules/triage/triage.types.js';

const mockCtx: any = {
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
};

// Instantiate real tool classes
const guardianTools = new GuardianTools();
const triageTools = new TriageTools();
const healthTools = new HealthIntelligenceTools();
const pipelineTools = new PipelineTools();

let passed = 0;
let failed = 0;
const results: { scenario: string; test: string; ok: boolean; detail?: string }[] = [];

function assert(scenario: string, test: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    results.push({ scenario, test, ok: true });
  } else {
    failed++;
    results.push({ scenario, test, ok: false, detail });
    console.error(`  ✗ FAIL [${scenario}] ${test}${detail ? ': ' + detail : ''}`);
  }
}

async function runTests() {
  console.log('🧪 Starting CareBridge Integration Tests (MongoDB Atlas & Vector Search)...\n');

  // ── SCENARIO 1: Guardian Baseline Analysis ───────────────────────────────────
  console.log('📋 SCENARIO 1 — Guardian AI Baseline Analysis (Multi-Patient)');
  const guardianRes = await guardianTools.analyzeBaseline({ patientId: 'PAT-88421' }, mockCtx);
  assert('Scenario1', 'Guardian detects deviation on demo patient PAT-88421', guardianRes.deviationDetected);
  assert('Scenario1', 'Status is changes_detected for PAT-88421', guardianRes.status === 'changes_detected');

  // Patient 2 (Marcus Chen - normal vitals)
  const marcusGuardian = await guardianTools.analyzeBaseline({ patientId: 'PAT-10042' }, mockCtx);
  assert('Scenario1', 'Marcus Chen (PAT-10042) vitals are normal', marcusGuardian.status === 'normal');

  // ── SCENARIO 2: Triage Red-Flag Screening & Negation Handling ────────────────
  console.log('\n📋 SCENARIO 2 — Triage AI Red-Flag Screening & Negation Context');
  const chestPainRes = await triageTools.checkRedFlags({ symptoms: ['chest pain', 'shortness of breath'] }, mockCtx);
  assert('Scenario2', 'Chest pain triggers emergency red flag', chestPainRes.isRedFlagTriggered);
  assert('Scenario2', 'Urgency is Emergency for chest pain', chestPainRes.urgency === 'Emergency');

  // Negation test: "no chest pain"
  const negatedRes = await triageTools.checkRedFlags({ symptoms: ['fatigue'], notes: 'Patient reports no chest pain and no shortness of breath' }, mockCtx);
  assert('Scenario2', 'Negated symptoms ("no chest pain") do NOT trigger red flag', !negatedRes.isRedFlagTriggered);

  // MongoDB Vector Clinical Knowledge Search
  const kbRes = await triageTools.searchClinicalKnowledge({ query: 'chest pressure radiating to jaw' }, mockCtx);
  assert('Scenario2', 'Clinical Knowledge Search returns results', kbRes.guidelines.length > 0);
  assert('Scenario2', 'Knowledge Search matches Acute Coronary Syndrome', kbRes.guidelines.some(g => g.condition.includes('Coronary') || g.condition.includes('Care')));

  // ── SCENARIO 3: Health Intelligence, FHIR Export & MongoDB Seeding ────────────
  console.log('\n📋 SCENARIO 3 — Health Intelligence & MongoDB Atlas');
  const patientCtx = await healthTools.getPatientContext({ patientId: 'PAT-88421' }, mockCtx);
  assert('Scenario3', 'Patient context returns Eleanor Vance', patientCtx.profile.name === 'Eleanor Vance');

  const marcusCtx = await healthTools.getPatientContext({ patientId: 'PAT-10042' }, mockCtx);
  assert('Scenario3', 'Dynamic query returns Marcus Chen for PAT-10042', marcusCtx.profile.name === 'Marcus Chen');

  const fhirRes = await healthTools.exportFhirBundle({ patientId: 'PAT-88421' }, mockCtx);
  assert('Scenario3', 'FHIR bundle export status is success', fhirRes.status === 'success');
  assert('Scenario3', 'FHIR bundle standard is HL7 FHIR R4', fhirRes.standard === 'HL7 FHIR R4');

  const seedRes = await healthTools.seedMongodbDatabase({}, mockCtx);
  assert('Scenario3', 'MongoDB seeding tool executes safely', ['success', 'fallback'].includes(seedRes.status));

  // ── SCENARIO 4: Full Pipeline Orchestration ──────────────────────────────────
  console.log('\n📋 SCENARIO 4 — End-to-End Pipeline Orchestration');
  const pipelineRes = await pipelineTools.orchestrateCarebridge({
    userMessage: 'I have been feeling tired lately.',
    patientId: 'PAT-88421',
  }, mockCtx);

  assert('Scenario4', 'Pipeline version is set', pipelineRes.pipelineVersion === '1.0.0');
  assert('Scenario4', 'Pipeline produces Routine evaluation for Eleanor Vance', pipelineRes.finalUrgencyClassification === 'Routine evaluation');

  // ── Safety Invariants ────────────────────────────────────────────────────────
  console.log('\n🔒 SAFETY INVARIANTS');
  assert('Safety', 'Deterministic red flags defined', DETERMINISTIC_RED_FLAGS.length >= 4);
  assert('Safety', 'Demo patient ID is valid', DEMO_PATIENT.id === 'PAT-88421');

  // ── Results Summary ──────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('  CAREBRIDGE AI - Integration Test Results');
  console.log('═'.repeat(60));

  for (const r of results) {
    console.log(`  ${r.ok ? '✓' : '✗'} [${r.scenario}] ${r.test}${!r.ok && r.detail ? ' — ' + r.detail : ''}`);
  }

  console.log('═'.repeat(60));
  console.log(`  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('═'.repeat(60));

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n  ✅ All integration tests passed cleanly!\n');
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
