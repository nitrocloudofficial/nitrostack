/**
 * Agent acceptance suite.
 *
 * The thing under test is not "does the agent produce output" — it is the two
 * claims that distinguish an agent from a script, plus the one safety property
 * that makes autonomy acceptable in a government workflow:
 *
 *   1. TRAJECTORIES DIVERGE. A clean application and a fraud-ring subject must
 *      produce DIFFERENT action sequences from the same code. If both produce the
 *      same sequence, the "agent" is a pipeline with extra steps and this suite
 *      should fail.
 *
 *   2. ARGUMENTS ARE DERIVED AT RUNTIME. visual_similarity_flag must only fire
 *      when a shared document image was actually found, and its target must be one
 *      of the applications that finding named.
 *
 *   3. THE AGENT CANNOT DECIDE. officer_decide must not be reachable from the
 *      agent's action space, and every handoff must assert humanDecisionRequired.
 *
 * Anything else here is supporting detail.
 */
import { bootHarness, check, equal, report, section, throws } from './harness.js';
import type { AgentRun, TriageResult } from '../src/contracts/index.js';
import { AGENT_MAX_STEPS, REQUIRED_BEFORE_CONCLUSION } from '../src/modules/agent/agent-policy.js';
import { AgentMemoryService } from '../src/modules/agent/services/agent-memory.service.js';

/** The RING-ALPHA subject — four applications sharing several identifiers. */
const RING_SUBJECT = 'PIQ-2026-2001';
/** A deliberately unremarkable application: no ring, no shared identifiers. */
const CLEAN_SUBJECT = 'PIQ-2026-1001';

async function main(): Promise<void> {
  const harness = await bootHarness();

  // =========================================================================
  section('The agent surface is registered');
  // =========================================================================
  const tools = harness.toolNames();
  for (const name of [
    'agent_investigate',
    'agent_triage_queue',
    'agent_recommend_decision',
    'get_agent_trace',
  ]) {
    check(`${name} is registered`, tools.includes(name));
  }

  // The containment boundary. If officer_decide ever appears in the agent's
  // action enum this assertion is the thing that catches it.
  const { AgentActionSchema } = await import('../src/contracts/agent.contract.js');
  check(
    'officer_decide is NOT in the agent action space',
    !AgentActionSchema.options.includes('officer_decide' as never),
    `actions: ${AgentActionSchema.options.join(', ')}`
  );
  check(
    'handoff_to_officer IS in the agent action space',
    AgentActionSchema.options.includes('handoff_to_officer' as never)
  );

  // =========================================================================
  section('A clean application: the agent walks the full investigation');
  // =========================================================================
  const clean = await harness.call<AgentRun>('agent_investigate', {
    applicationId: CLEAN_SUBJECT,
  });

  check('clean run terminated by handing off', clean.stopReason === 'handoff', clean.stopReason);
  check('clean run produced a handoff object', clean.handoff !== null);
  check(
    'clean run stayed inside its step budget',
    clean.steps.length <= AGENT_MAX_STEPS,
    `${clean.steps.length} steps`
  );
  check(
    'clean run reached a risk score',
    typeof clean.riskScore === 'number',
    `score=${clean.riskScore}`
  );

  const cleanActions = clean.steps.map((s) => s.action);
  for (const stage of REQUIRED_BEFORE_CONCLUSION) {
    check(`clean run performed ${stage}`, cleanActions.includes(stage));
  }
  check(
    'clean run did NOT compare photographs (nothing implicated anyone)',
    !cleanActions.includes('visual_similarity_flag'),
    cleanActions.join(' > ')
  );
  check(
    'every clean step carries first-person reasoning',
    clean.steps.every((s) => s.thought.trim().length > 20)
  );
  check(
    'every clean step records how it was planned',
    clean.steps.every((s) => s.plannedBy === 'llm' || s.plannedBy === 'policy')
  );

  // =========================================================================
  section('A fraud-ring subject: the trajectory DIVERGES');
  // =========================================================================
  const ring = await harness.call<AgentRun>('agent_investigate', {
    applicationId: RING_SUBJECT,
    goal: 'investigate_fraud_signal',
  });

  const ringActions = ring.steps.map((s) => s.action);

  // THE central claim of the whole agentic layer.
  check(
    'the ring subject produced a DIFFERENT action sequence than the clean file',
    ringActions.join('>') !== cleanActions.join('>'),
    `ring: ${ringActions.join(' > ')}`
  );
  check(
    'the ring subject DID compare photographs',
    ringActions.includes('visual_similarity_flag'),
    ringActions.join(' > ')
  );

  // Runtime-derived arguments: the comparison target must be a real counterpart
  // that the agent's own findings named, not a constant.
  const comparison = ring.steps.find((s) => s.action === 'visual_similarity_flag');
  const target = comparison ? String(comparison.actionInput['compareToApplicationId'] ?? '') : '';
  check(
    'the photograph comparison target was chosen at runtime, not hardcoded',
    target.length > 0 && target !== RING_SUBJECT && target.startsWith('PIQ-'),
    `target=${target || '(none)'}`
  );

  check('the ring subject scored high', (ring.riskScore ?? 0) >= 60, `score=${ring.riskScore}`);
  equal('the ring subject was escalated', ring.handoff?.recommendation, 'escalate');
  check('the ring subject requires senior review', ring.handoff?.requiresSeniorReview === true);
  check(
    'the escalation names the other cluster members in the checklist',
    (ring.handoff?.officerChecklist ?? []).some((item) => /PIQ-2026-200/.test(item)),
    JSON.stringify(ring.handoff?.officerChecklist)
  );

  // =========================================================================
  section('The agent recommends; it never decides');
  // =========================================================================
  check('handoff asserts a human decision is required', ring.handoff?.humanDecisionRequired === true);
  check('clean handoff asserts it too', clean.handoff?.humanDecisionRequired === true);
  check(
    'no step in either run touched officer_decide',
    ![...ringActions, ...cleanActions].includes('officer_decide' as never)
  );

  const recommendation = await harness.call<{
    recommendation: string;
    humanDecisionRequired: boolean;
    runId: string;
    officerChecklist: string[];
  }>('agent_recommend_decision', { applicationId: RING_SUBJECT });

  equal('agent_recommend_decision reads back the stored run', recommendation.runId, ring.runId);
  check('the recommendation restates human authority', recommendation.humanDecisionRequired === true);
  check('the recommendation carries an officer checklist', recommendation.officerChecklist.length > 0);

  await throws(
    'agent_recommend_decision refuses to invent a recommendation with no run behind it',
    () => harness.call('agent_recommend_decision', { applicationId: 'PIQ-2026-3001' }),
    'No completed agent investigation'
  );

  // =========================================================================
  section('The reasoning trace is auditable');
  // =========================================================================
  const trace = await harness.call<{ found: boolean; run: AgentRun | null }>('get_agent_trace', {
    runId: ring.runId,
  });
  check('the trace is retrievable by runId', trace.found && trace.run !== null);
  equal('the retrieved trace has every step', trace.run?.steps.length, ring.steps.length);

  const byApplication = await harness.call<{ found: boolean; availableRunIds: string[] }>(
    'get_agent_trace',
    { applicationId: RING_SUBJECT }
  );
  check('the trace is retrievable by applicationId', byApplication.found);
  check(
    'run history is listed for the application',
    byApplication.availableRunIds.includes(ring.runId)
  );

  await throws(
    'get_agent_trace requires at least one selector',
    () => harness.call('get_agent_trace', {}),
    'requires either runId or applicationId'
  );

  check(
    'every step records a duration and a timestamp',
    ring.steps.every((s) => s.durationMs >= 0 && s.at.length > 0)
  );
  check(
    'every step records the confidence at that point',
    ring.steps.every((s) => s.confidence >= 0 && s.confidence <= 1)
  );

  // =========================================================================
  section('Queue triage correlates ACROSS applications');
  // =========================================================================
  const triage = await harness.call<TriageResult>('agent_triage_queue', {});

  check('every application was swept', triage.processed >= 9, `processed=${triage.processed}`);
  check('the queue is ordered by priority starting at 1', triage.queue[0]?.priority === 1);
  check(
    'priorities are dense and strictly increasing',
    triage.queue.every((row, index) => row.priority === index + 1)
  );
  check(
    'senior-review cases sort ahead of the rest',
    (() => {
      const lastSenior = triage.queue.reduce(
        (last, row, index) => (row.requiresSeniorReview ? index : last),
        -1
      );
      const firstNonSenior = triage.queue.findIndex((row) => !row.requiresSeniorReview);
      return firstNonSenior === -1 || lastSenior < firstNonSenior;
    })()
  );

  // The finding that no single-file review can produce.
  check(
    'the sweep detected at least one multi-application ring',
    triage.detectedRings.length > 0,
    `rings=${triage.detectedRings.length}`
  );
  const alpha = triage.detectedRings.find((r) => r.applicationIds.includes(RING_SUBJECT));
  check('RING-ALPHA was detected as a ring', alpha !== undefined);
  check('RING-ALPHA has four members', alpha?.size === 4, `size=${alpha?.size}`);
  check(
    'the ring headline names the shared identifiers',
    (alpha?.sharedSignals.length ?? 0) > 1,
    JSON.stringify(alpha?.sharedSignals)
  );
  check(
    'every ring member appears in the ring membership',
    ['PIQ-2026-2001', 'PIQ-2026-2002', 'PIQ-2026-2003', 'PIQ-2026-2004'].every((id) =>
      alpha?.applicationIds.includes(id)
    )
  );
  check(
    'every queue row is traceable to the run that ranked it',
    triage.queue.every((row) => row.runId.length > 0)
  );
  check(
    'the ring subject was escalated by the sweep',
    triage.escalated.includes(RING_SUBJECT),
    JSON.stringify(triage.escalated)
  );

  // =========================================================================
  section('Memory retains the runs for audit');
  // =========================================================================
  const memory = harness.resolve(AgentMemoryService);
  const stats = memory.getStats();

  check('memory retained every run', stats.totalRuns >= 11, `runs=${stats.totalRuns}`);
  check('memory retained the reasoning steps', stats.totalSteps > 20, `steps=${stats.totalSteps}`);
  check('memory recorded escalations', stats.escalated > 0, `escalated=${stats.escalated}`);
  check('no run is left dangling as active', stats.activeRuns === 0);

  // =========================================================================
  section('The agent respects its guard rails');
  // =========================================================================
  await throws(
    'an unknown application is rejected with the known ids',
    () => harness.call('agent_investigate', { applicationId: 'PIQ-9999-0000' }),
    'PIQ-'
  );
  await throws(
    'a missing applicationId is rejected by the tool, not by a downstream crash',
    () => harness.call('agent_investigate', {}),
    'invalid input'
  );

  const budgeted = await harness.call<AgentRun>('agent_investigate', {
    applicationId: 'PIQ-2026-1002',
    maxSteps: 2,
  });
  check('a step budget is honoured', budgeted.steps.length <= 2, `${budgeted.steps.length} steps`);
  check(
    'a truncated run still hands off rather than reporting success',
    budgeted.handoff !== null && budgeted.handoff.requiresSeniorReview === true
  );
  check(
    'a truncated run says the investigation was incomplete',
    (budgeted.handoff?.officerChecklist ?? []).some((item) => /INCOMPLETE/i.test(item)),
    JSON.stringify(budgeted.handoff?.officerChecklist)
  );

  report('Agent acceptance');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
