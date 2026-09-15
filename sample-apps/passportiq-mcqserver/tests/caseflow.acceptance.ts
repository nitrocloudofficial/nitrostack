/**
 * Caseflow acceptance suite — the passport application lifecycle.
 *
 * The 18 lifecycle tools are the main body of the project, so this suite tests
 * the four claims that the lifecycle layer actually makes. Rendering a board is
 * not one of them.
 *
 *   1. THE STATE MACHINE REFUSES ILLEGAL ORDERS. You cannot book a Passport Seva
 *      Kendra appointment before the fee is paid, and you cannot pay twice. If an
 *      out-of-order call succeeds, the "lifecycle" is a set of independent
 *      mutations wearing a workflow's clothes, and this suite should fail.
 *
 *   2. THE AGENT DRIVES, BUT ONLY WHERE IT IS PERMITTED. advance_case must walk a
 *      fresh case through six real transitions unattended — and must then stop at
 *      officer_review of its own accord. No step budget, however large, may cross
 *      that gate.
 *
 *   3. THE HUMAN GATE IS STRUCTURAL, NOT ADVISORY. `officer_review` has no
 *      transition marked autonomous, so the agent's action space provably excludes
 *      granting a passport. This is asserted against CASE_TRANSITIONS itself
 *      rather than against runtime behaviour, because a data-level guarantee
 *      cannot be bypassed by a future code path.
 *
 *   4. THE JOURNAL IS ATTRIBUTED AND ORDERED. Every stage change lands in the case
 *      journal with the tool that caused it, the actor, and a rationale composed
 *      before the action. An audit that cannot say who did what is not an audit.
 */
import { bootHarness, check, equal, report, section, throws } from './harness.js';
import {
  CASE_TRANSITIONS,
  STAGE_LABELS,
  type CaseStage,
} from '../src/contracts/index.js';

/** A complete, valid application body — the happy path input. */
function freshApplication(name: string, tatkal = false) {
  return {
    fullName: name,
    dateOfBirth: '1992-04-17',
    applicationType: 'fresh' as const,
    tatkal,
    phone: '9820011223',
    email: `${name.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
    address: {
      line1: '14 Shivaji Nagar',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411005',
    },
    // The full mandatory checklist for a fresh application. An incomplete file is
    // legitimately refused at verification, so a happy-path test must supply it.
    documents: [
      { type: 'aadhaar' },
      { type: 'birth_certificate' },
      { type: 'address_proof' },
      { type: 'photograph' },
    ],
  };
}

interface SubmitResult {
  arn: string;
  applicationId: string;
  stage: CaseStage;
  feeDue: { amount: number; currency: string };
  checklist: { required: string[]; supplied: string[]; missing: string[] };
  nextStep: string;
}

interface AdvanceResult {
  arn: string;
  fromStage: CaseStage;
  toStage: CaseStage;
  stepsExecuted: number;
  stepsFailed: number;
  steps: Array<{
    tool: string;
    from: CaseStage;
    to: CaseStage | null;
    ok: boolean;
    rationale: string;
    outcome: string;
  }>;
  stopped: string;
  handedToOfficer: boolean;
  waitingOnHuman: boolean;
  nextAutonomousStep: string | null;
}

interface CaseFileResult {
  arn: string;
  stage: CaseStage;
  journal: Array<{ seq: number; stage: CaseStage; tool: string; actor: string; rationale: string }>;
  nextStep: { tool: string | null } | null;
  legalTransitions: Array<{ to: CaseStage; autonomous: boolean }>;
}

interface BoardResult {
  totals: { cases: number; waitingOnHuman: number; breached: number; closed: number };
  columns: Array<{ stage: CaseStage; label: string; cases: unknown[] }>;
}

async function main(): Promise<void> {
  const harness = await bootHarness();

  // =========================================================================
  section('The lifecycle surface is registered as MCP tools');
  // =========================================================================
  const tools = harness.toolNames();

  // The citizen-facing half.
  for (const name of [
    'submit_passport_application',
    'pay_application_fee',
    'book_psk_appointment',
    'complete_psk_visit',
    'submit_clarification_response',
    'withdraw_passport_application',
  ]) {
    check(`intake tool registered: ${name}`, tools.includes(name));
  }

  // The government-facing half.
  for (const name of [
    'run_case_verification',
    'initiate_police_verification',
    'record_police_verification',
    'print_passport_booklet',
    'dispatch_passport',
    'confirm_delivery',
  ]) {
    check(`processing tool registered: ${name}`, tools.includes(name));
  }

  // The read + control surface.
  for (const name of [
    'get_case_file',
    'list_passport_cases',
    'get_caseflow_board',
    'track_passport_application',
    'advance_case',
    'caseflow_autopilot',
  ]) {
    check(`query tool registered: ${name}`, tools.includes(name));
  }

  // =========================================================================
  section('Claim 1 — the state machine refuses illegal orders');
  // =========================================================================
  const filed = await harness.call<SubmitResult>(
    'submit_passport_application',
    freshApplication('Ordering Test'),
  );
  check('filing mints an ARN', /^ARN-\d{4}-\d{6}$/.test(filed.arn), filed.arn);
  equal('a new case starts at "submitted"', filed.stage, 'submitted');
  equal('the fresh-application fee is the schedule amount', filed.feeDue.amount, 1500);
  equal('a complete checklist reports nothing missing', filed.checklist.missing.length, 0);
  equal('the tool names the next step', filed.nextStep, 'pay_application_fee');

  // Booking before paying must be refused BY THE STATE MACHINE, not by the tool
  // happening to read an absent receipt.
  await throws('booking a PSK appointment before the fee is paid is refused', () =>
    harness.call('book_psk_appointment', { arn: filed.arn }),
  );

  // Verification cannot be reached from 'submitted' either — skipping the Kendra
  // visit entirely would mean verifying documents nobody ever produced.
  await throws('verification cannot skip the Kendra visit', () =>
    harness.call('run_case_verification', { arn: filed.arn }),
  );

  // Printing cannot precede the grant: a booklet for an ungranted application is
  // the single worst outcome this workflow could produce.
  await throws('a booklet cannot be printed before the passport is granted', () =>
    harness.call('print_passport_booklet', { arn: filed.arn }),
  );

  // And paying twice is refused, so a replayed request cannot double-charge.
  await harness.call('pay_application_fee', { arn: filed.arn, method: 'upi' });
  await throws('the fee cannot be collected twice', () =>
    harness.call('pay_application_fee', { arn: filed.arn, method: 'upi' }),
  );

  // =========================================================================
  section('Claim 2 — the agent drives, then stops at the gate on its own');
  // =========================================================================
  const driven = await harness.call<SubmitResult>(
    'submit_passport_application',
    freshApplication('Autonomy Test'),
  );

  // A deliberately generous budget: the point is that the budget is NOT what
  // stops the agent. If 40 steps still halts at officer_review, the halt is a
  // property of the design rather than of the limit.
  const run = await harness.call<AdvanceResult>('advance_case', {
    arn: driven.arn,
    maxSteps: 40,
  });

  equal('the run starts from "submitted"', run.fromStage, 'submitted');
  equal('the run ends at "officer_review"', run.toStage, 'officer_review');
  check(
    'the agent executed the six intermediate transitions unattended',
    run.stepsExecuted >= 6,
    `stepsExecuted=${run.stepsExecuted}`,
  );
  equal('no step failed on the happy path', run.stepsFailed, 0);
  check('the run reports the hand-off', run.handedToOfficer);
  check('the run reports that it is waiting on a human', run.waitingOnHuman);
  equal('there is no autonomous step left to take', run.nextAutonomousStep, null);
  check(
    'the stop reason names the human, not an error',
    /human|officer/i.test(run.stopped),
    run.stopped,
  );

  // Every executed step must carry reasoning. A step without a rationale is an
  // unexplained action in a government file.
  for (const step of run.steps.filter((s) => s.tool !== '—')) {
    check(
      `step ${step.tool} carries a rationale`,
      typeof step.rationale === 'string' && step.rationale.length > 20,
      step.rationale,
    );
    check(`step ${step.tool} carries an outcome`, step.outcome.length > 0);
  }

  // The agent must not have called officer_grant_passport anywhere in the run.
  check(
    'the agent never invoked officer_decide',
    run.steps.every((s) => s.tool !== 'officer_decide'),
  );

  // A second advance from the gate must change nothing at all.
  const again = await harness.call<AdvanceResult>('advance_case', {
    arn: driven.arn,
    maxSteps: 40,
  });
  equal('re-running the agent at the gate moves nothing', again.toStage, 'officer_review');
  equal('re-running the agent at the gate executes nothing', again.stepsExecuted, 0);

  // =========================================================================
  section('Claim 3 — the human gate is structural, not advisory');
  // =========================================================================
  // Asserted against the transition table itself. Runtime behaviour can be
  // changed by a new code path; a stage with no autonomous exit cannot be
  // crossed by any agent that only executes autonomous transitions.
  const fromOfficerReview = CASE_TRANSITIONS.filter((t) => t.from === 'officer_review');
  check(
    'officer_review has outgoing transitions at all',
    fromOfficerReview.length > 0,
    `${fromOfficerReview.length}`,
  );
  check(
    'NONE of officer_review\u2019s transitions are marked autonomous',
    fromOfficerReview.every((t) => t.autonomous === false),
    fromOfficerReview.map((t) => `${t.to}:${String(t.autonomous)}`).join(', '),
  );

  // officer_decide is the human's tool. It must never appear as an autonomous
  // transition anywhere in the table — not just out of officer_review.
  const decideTransitions = CASE_TRANSITIONS.filter((t) => t.tool === 'officer_decide');
  check('officer_decide appears in the transition table', decideTransitions.length >= 3);
  check(
    'officer_decide is not autonomous anywhere in the table',
    decideTransitions.every((t) => t.autonomous === false),
  );

  // Every stage label must exist, or the board renders a blank lane header.
  const stagesInTable = new Set<CaseStage>();
  for (const t of CASE_TRANSITIONS) {
    stagesInTable.add(t.from);
    stagesInTable.add(t.to);
  }
  for (const stage of stagesInTable) {
    check(`stage "${stage}" has a human-readable label`, Boolean(STAGE_LABELS[stage]));
  }

  // =========================================================================
  section('Claim 4 — the journal is attributed and ordered');
  // =========================================================================
  const file = await harness.call<CaseFileResult>('get_case_file', { arn: driven.arn });
  equal('the case file reports the gate stage', file.stage, 'officer_review');
  check('the journal has an entry per transition', file.journal.length >= 6, `${file.journal.length}`);

  let lastSeq = -1;
  let ordered = true;
  for (const entry of file.journal) {
    if (entry.seq <= lastSeq) ordered = false;
    lastSeq = entry.seq;
  }
  check('journal sequence numbers are strictly increasing', ordered);

  for (const entry of file.journal) {
    check(
      `journal entry ${entry.seq} names the tool that caused it`,
      typeof entry.tool === 'string' && entry.tool.length > 0,
    );
    check(
      `journal entry ${entry.seq} names an actor`,
      typeof entry.actor === 'string' && entry.actor.length > 0,
    );
  }

  // At the gate, the only legal exits must all be non-autonomous.
  check(
    'at the gate every legal transition requires a human',
    file.legalTransitions.length > 0 && file.legalTransitions.every((t) => !t.autonomous),
  );

  // =========================================================================
  section('The board and the tracker are projections of the same register');
  // =========================================================================
  const board = await harness.call<BoardResult>('get_caseflow_board', {});
  const laneTotal = board.columns.reduce((sum, col) => sum + col.cases.length, 0);
  equal('board lane counts sum to the register total', laneTotal, board.totals.cases);
  check('the board reports the gate queue', board.totals.waitingOnHuman >= 1);
  check(
    'the driven case appears in the officer_review lane',
    (board.columns.find((c) => c.stage === 'officer_review')?.cases.length ?? 0) >= 1,
  );

  const tracked = await harness.call<{ arn: string; status: string; statusMessage: string }>(
    'track_passport_application',
    { arn: driven.arn },
  );
  equal('the tracker resolves the same ARN', tracked.arn, driven.arn);
  check(
    'the citizen message is plain language, not a stage id',
    !tracked.statusMessage.includes('officer_review'),
    tracked.statusMessage,
  );

  // An unknown ARN must be refused, not answered with an empty shell.
  await throws('an unknown ARN is refused', () =>
    harness.call('track_passport_application', { arn: 'ARN-1999-000001' }),
  );

  // =========================================================================
  section('A malformed application is refused by field name');
  // =========================================================================
  await throws(
    'an incomplete form names the missing fields',
    () => harness.call('submit_passport_application', { fullName: 'x' }),
    'dateOfBirth',
  );

  // =========================================================================
  section('The orchestrator runs a bounded, narrated pass');
  // =========================================================================
  const tick = await harness.call<{
    action: string;
    tick: { casesConsidered: number; casesAdvanced: number; blockedOnHuman: number } | null;
    status: { ticks: number };
    message?: string;
  }>('caseflow_autopilot', { action: 'tick' });
  equal('a tick reports itself as a tick', tick.action, 'tick');
  check('a tick considered at least one case', (tick.tick?.casesConsidered ?? 0) >= 1);
  check('a tick is counted on the status', tick.status.ticks >= 1);

  report('Caseflow acceptance');
}

void main();
