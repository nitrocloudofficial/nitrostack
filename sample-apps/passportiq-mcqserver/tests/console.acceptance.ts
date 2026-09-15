/**
 * Console acceptance: the automated officer workflow, asserted end to end.
 *
 * This suite exists because the console is where the product actually lives, and
 * every claim the demo makes about it must be checkable rather than asserted in a
 * README. It boots the real application in-process (no HTTP, no fixtures, the same
 * DI container production uses) and drives the read model and the autopilot exactly
 * the way the browser does.
 *
 * The important assertion is the LAST one. A system that can approve a passport on
 * its own is a liability regardless of how good its scoring is, so the test proves
 * the guard blocks a premature decision, and that the agent — after doing all the
 * work — still hands off without deciding.
 */
import 'reflect-metadata';
import { bootHarness, check, section, report } from './harness.js';
import { ConsoleStateService } from '../src/modules/console/services/console-state.service.js';
import { ConsoleEventHubService } from '../src/modules/console/services/console-event-hub.service.js';
import { AutopilotService } from '../src/modules/console/services/autopilot.service.js';
import type { AgentRun } from '../src/contracts/index.js';

async function main(): Promise<void> {
  console.log('PassportIQ — console acceptance\n' + '='.repeat(46));

  const harness = await bootHarness();

  const state = harness.resolve(ConsoleStateService);
  const hub = harness.resolve(ConsoleEventHubService);
  const autopilot = harness.resolve(AutopilotService);

  // -------------------------------------------------------------------------
  section('Read model — the officer queue');

  const overview = state.getOverview();
  check(
    'overview reports the nine seeded applications',
    overview.totals.applications === 9,
    `got ${overview.totals.applications}`
  );
  check('queue is fully populated', overview.queue.length === 9, `got ${overview.queue.length}`);
  check(
    'at least one identifier-sharing cluster is detected',
    overview.totals.rings >= 1,
    `got ${overview.totals.rings}`
  );
  check(
    'the largest cluster is the four-application ring',
    overview.totals.largestRing === 4,
    `got ${overview.totals.largestRing}`
  );

  const top = overview.queue[0];
  check(
    'the ring leader is ranked first before anything has been scored',
    top?.applicationId === 'PIQ-2026-2001',
    `got ${top?.applicationId}`
  );
  check(
    'the top row carries an officer-readable reason for its position',
    typeof top?.headline === 'string' && top.headline.length > 30,
    top?.headline
  );
  check(
    'the top row exposes its linked applications',
    (top?.linkedApplicationIds?.length ?? 0) === 3,
    `got ${top?.linkedApplicationIds?.length}`
  );

  // Ordering is the product. An officer who has to sort the queue themselves has
  // not been helped.
  const order = state.getPriorityOrder();
  check('priority order covers every application', order.length === 9, `got ${order.length}`);
  check('priority order agrees with the queue', order[0] === overview.queue[0]?.applicationId);

  // -------------------------------------------------------------------------
  section('Human-in-the-loop gate — before any work is done');

  let blocked = false;
  let blockMessage = '';
  try {
    await harness.call('officer_decide', {
      applicationId: 'PIQ-2026-2001',
      decision: 'approve',
      note: 'Attempting to approve before the pipeline has run at all.',
    });
  } catch (err) {
    blocked = true;
    blockMessage = err instanceof Error ? err.message : String(err);
  }
  check('a decision on an unverified application is refused', blocked);
  check(
    'the refusal names the outstanding stages',
    /stage/i.test(blockMessage),
    blockMessage.slice(0, 160)
  );

  // -------------------------------------------------------------------------
  section('Verification pipeline — the automated workflow');

  const before = hub.getLatestId();
  await harness.call('run_verification_pipeline', { applicationId: 'PIQ-2026-2001' });

  const view = state.getApplicationView('PIQ-2026-2001');
  check(
    'the pipeline produced a risk score',
    typeof view.risk.score === 'number',
    String(view.risk.score)
  );
  check('the ring leader scores high risk', (view.risk.score ?? 0) >= 70, String(view.risk.score));
  check('the risk band matches the score', view.risk.band === 'high', view.risk.band);

  const signals = view.duplicateSignals as { signals?: unknown[] } | null;
  check(
    'duplicate signals were found across other applications',
    (signals?.signals?.length ?? 0) > 0,
    `got ${signals?.signals?.length}`
  );

  const graph = view.graph as { nodes?: unknown[] } | null;
  check('a relationship graph was built', (graph?.nodes?.length ?? 0) > 0);

  const rules = view.rules as {
    evaluatedRuleIds?: string[];
    violations?: unknown[];
  } | null;
  check(
    'the rulebook was evaluated against the application',
    (rules?.evaluatedRuleIds?.length ?? 0) > 0,
    `got ${rules?.evaluatedRuleIds?.length}`
  );
  check(
    'the ring leader trips at least one cited government rule',
    (rules?.violations?.length ?? 0) > 0,
    `got ${rules?.violations?.length}`
  );
  check('the pipeline reports itself complete', view.progress.pipelineComplete === true);

  const emitted = hub.getLatestId() - before;
  check('the pipeline streamed progress events to the console', emitted > 0, `got ${emitted}`);

  // -------------------------------------------------------------------------
  section('Officer decision — now permitted');

  let recorded = false;
  try {
    await harness.call('officer_decide', {
      applicationId: 'PIQ-2026-2001',
      decision: 'clarify',
      note: 'Reused identifiers across four live applications require applicant clarification before any approval.',
    });
    recorded = true;
  } catch (err) {
    recorded = false;
    console.error('    unexpected:', err instanceof Error ? err.message : err);
  }
  check('a justified decision is accepted once verification is complete', recorded);

  const decided = state.getApplicationView('PIQ-2026-2001');
  check(
    'the decision is attributed to a named officer',
    typeof decided.decision?.officer === 'string' && decided.decision.officer.length > 0,
    decided.decision?.officer
  );
  check(
    'the decision is written to the audit trail',
    state.getAuditTrail('PIQ-2026-2001').total > 0
  );

  // -------------------------------------------------------------------------
  section('Autopilot — autonomous, and still not allowed to decide');

  const sweep = await autopilot.sweep();
  check('a sweep ran and reported a summary', sweep !== null);
  check(
    'the sweep investigated applications on its own',
    (sweep?.applicationsInvestigated ?? 0) > 0,
    `got ${sweep?.applicationsInvestigated}`
  );
  check(
    'the sweep reported which cases it could not resolve',
    Array.isArray(sweep?.escalated),
    `got ${typeof sweep?.escalated}`
  );

  const runs = state.getAgentRuns(50) as AgentRun[];
  check('agent runs are recorded in memory', runs.length > 0, `got ${runs.length}`);

  // Every application the sweep touched, minus the one an officer already decided.
  const swept = state
    .getPriorityOrder()
    .filter((id) => id !== 'PIQ-2026-2001');
  let autoDecided = 0;
  for (const id of swept) {
    if (state.getApplicationView(id).decision) autoDecided += 1;
  }
  // THE ASSERTION THAT MATTERS.
  check(
    'the autopilot recorded ZERO decisions of its own',
    autoDecided === 0,
    `${autoDecided} application(s) were decided without an officer`
  );

  const runWithSteps = runs.find((run) => Array.isArray(run.steps) && run.steps.length > 0);
  check('agent runs expose their reasoning steps for review', runWithSteps !== undefined);
  check(
    'no agent step called officer_decide',
    !runs.some((run) =>
      (run.steps ?? []).some((step) => String(step.action) === 'officer_decide')
    )
  );

  // A sweep that finds nothing to do must stay quiet. The autopilot re-derives
  // the same idle status on every scheduled tick once the queue is clear, and
  // announcing that unconditionally published an identical state_changed frame
  // every interval forever — burying the pipeline, agent and decision events the
  // activity stream exists to surface. Draining the queue and sweeping twice more
  // must add no new autopilot frames.
  while ((await autopilot.sweep()) !== null) {
    // Drain: keep sweeping until the autopilot reports nothing left to work on.
  }
  const autopilotFrames = () =>
    hub.getEvents(0, 500).filter((entry) => entry.event === 'autopilot.state_changed').length;
  const framesWhenIdle = autopilotFrames();
  await autopilot.sweep();
  await autopilot.sweep();
  check(
    'an idle sweep does not republish an unchanged status',
    autopilotFrames() === framesWhenIdle,
    `${autopilotFrames() - framesWhenIdle} duplicate frame(s) emitted`
  );

  autopilot.stop('acceptance suite finished');

  // -------------------------------------------------------------------------
  section('Console MCP tools');

  const queueTool = await harness.call<Record<string, unknown>>('get_officer_queue', { limit: 5 });
  check(
    'get_officer_queue returns rows',
    Array.isArray(queueTool.queue) && (queueTool.queue as unknown[]).length > 0
  );

  const statusTool = await harness.call<{
    status?: { sweepsCompleted?: number; mode?: string };
    narrative?: string;
  }>('autopilot_status', {});
  check(
    'autopilot_status reports sweep counters',
    typeof statusTool.status?.sweepsCompleted === 'number' &&
      typeof statusTool.status?.mode === 'string',
    JSON.stringify(statusTool.status).slice(0, 120)
  );
  check(
    'autopilot_status explains itself in plain language',
    typeof statusTool.narrative === 'string' && statusTool.narrative.length > 20
  );

  const activity = await harness.call<Record<string, unknown>>('get_console_activity', {
    limit: 10,
  });
  check('get_console_activity replays the event stream', Array.isArray(activity.events));

  report('Console acceptance');
}

main().catch((err) => {
  console.error('\nFATAL', err);
  process.exit(1);
});
