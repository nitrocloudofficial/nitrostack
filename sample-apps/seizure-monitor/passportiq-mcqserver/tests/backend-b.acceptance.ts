/**
 * Backend B acceptance tests — run against the REAL booted server.
 *
 * These go through McpApplicationFactory.create(), the real DI singletons, the
 * real @OnEvent subscriptions, the real ExecutionContext bridge and the real
 * guard (see harness.ts). A pass here means the wiring the demo runs is the
 * wiring that was tested.
 *
 * Ordered deliberately: the guard must be proven to BLOCK before anything runs
 * the pipeline, because once stages are recorded that state cannot be un-seen.
 *
 * Run: npm test
 */
import {
  PIPELINE_STAGES,
  REQUIRED_STAGES_BEFORE_DECISION,
  DetectDuplicateSignalsToolOutputSchema,
  BuildRiskGraphToolOutputSchema,
  DecisionRecordSchema,
  PipelineStageCompletedEventSchema,
} from '../src/contracts/index.js';
import { AuditLogService } from '../src/modules/pipeline/services/audit-log.service.js';
import { DashboardGatewayService } from '../src/modules/pipeline/services/dashboard-gateway.service.js';
import { PipelineStateService } from '../src/modules/pipeline/services/pipeline-state.service.js';
import { bootHarness, check, equal, report, section, throws } from './harness.js';

const SUBJECT = 'PIQ-2026-2001';
const CLEAN = 'PIQ-2026-1002';
/** Never passed to ANY tool in this suite — the true "no progress" baseline. */
const UNTOUCHED = 'PIQ-2026-1003';

const h = await bootHarness();

// ---------------------------------------------------------------------------
section('Server boots and registers every expected tool');
// ---------------------------------------------------------------------------
{
  const names = h.toolNames();

  const backendB = [
    'detect_duplicate_signals',
    'build_risk_graph',
    'officer_decide',
    'run_verification_pipeline',
    'list_applications',
    'get_application',
    'list_applicant_clusters',
    'get_pipeline_events',
    'get_pipeline_progress',
    'get_audit_trail',
  ];
  for (const name of backendB) {
    check(`Backend B tool '${name}' is registered`, names.includes(name));
  }

  // Every required stage must have a tool, or the guard can never open.
  for (const stage of REQUIRED_STAGES_BEFORE_DECISION) {
    check(`required stage '${stage}' has a registered tool`, names.includes(stage));
  }

  check(
    'no duplicate tool registrations',
    new Set(names).size === names.length,
    `${names.length} tools, ${new Set(names).size} unique`
  );
}

// ---------------------------------------------------------------------------
section('PipelineCompleteGuard BLOCKS a decision before verification');
// ---------------------------------------------------------------------------
{
  // The project's central claim: the AI never auto-approves. Asserted first,
  // while pipeline state for SUBJECT is still empty.
  await throws(
    'officer_decide is refused before any stage has run',
    () => h.call('officer_decide', { applicationId: SUBJECT, decision: 'approve' }),
    'Cannot record a decision'
  );

  await throws(
    'the refusal names the missing stages',
    () => h.call('officer_decide', { applicationId: SUBJECT, decision: 'approve' }),
    'score_risk'
  );

  const audit = await h.call<{ total: number }>('get_audit_trail', {});
  equal('a blocked decision writes NOTHING to the audit trail', audit.total, 0);
}

// ---------------------------------------------------------------------------
section('detect_duplicate_signals matches the frozen contract');
// ---------------------------------------------------------------------------
{
  const raw = await h.call(SUBJECT ? 'detect_duplicate_signals' : '', { applicationId: SUBJECT });
  const parsed = DetectDuplicateSignalsToolOutputSchema.safeParse(raw);
  check(
    'output validates against DetectDuplicateSignalsToolOutputSchema',
    parsed.success,
    parsed.success ? undefined : JSON.stringify(parsed.error.issues.slice(0, 3))
  );

  if (parsed.success) {
    const result = parsed.data;

    // contracts.md §2 froze this enum. Backend A parses it with z.enum, which
    // THROWS on an unknown value — so an out-of-enum type here breaks their tool
    // mid-demo, not ours.
    const allowed = new Set([
      'passport_number_match',
      'name_dob_match',
      'email_match',
      'phone_match',
      'document_similarity',
      'manual_review_flag',
    ]);
    check(
      'every signal.type is inside the frozen contracts.md §2 enum',
      result.signals.every((s) => allowed.has(s.type))
    );

    check(
      'every signal has a confidence in [0,1]',
      result.signals.every((s) => s.confidence >= 0 && s.confidence <= 1)
    );
    check(
      'signalIds are unique',
      new Set(result.signals.map((s) => s.signalId)).size === result.signals.length
    );
    check(
      'no signal points at the subject itself',
      result.signals.every((s) => s.matchedApplicationId !== SUBJECT)
    );

    // The compat view Backend A's score_risk reads.
    // These compat fields are OPTIONAL in the schema (contracts.md §2 does not
    // define them; they are Backend B's additive view for score_risk), so they are
    // read defensively — `?? []` then assert non-empty, which fails loudly if the
    // tool ever stops emitting them rather than throwing on undefined.
    check('reusedPhone is populated', (result.reusedPhone ?? []).length > 0);
    check('reusedAddress is populated', (result.reusedAddress ?? []).length > 0);
    check('reusedDocumentImage is populated', (result.reusedDocumentImage ?? []).length > 0);
    equal('linkedApplicantIds has all 3 ring members', result.linkedApplicantIds.length, 3);
    equal('summary.highestSeverity is high', result.summary.highestSeverity, 'high');
    check('summary.headline is a usable sentence', result.summary.headline.length > 40);
  }

  const clean = await h.call<{ signals: unknown[]; summary: { highestSeverity: string } }>(
    'detect_duplicate_signals',
    { applicationId: CLEAN }
  );
  equal('a clean applicant yields zero signals', clean.signals.length, 0);
  equal("a clean applicant's highestSeverity is 'none'", clean.summary.highestSeverity, 'none');
}

// ---------------------------------------------------------------------------
section('build_risk_graph matches the frozen contract');
// ---------------------------------------------------------------------------
{
  const raw = await h.call('build_risk_graph', { applicationId: SUBJECT });
  const parsed = BuildRiskGraphToolOutputSchema.safeParse(raw);
  check(
    'output validates against BuildRiskGraphToolOutputSchema',
    parsed.success,
    parsed.success ? undefined : JSON.stringify(parsed.error.issues.slice(0, 3))
  );

  if (parsed.success) {
    const graph = parsed.data;
    const ids = new Set(graph.nodes.map((n) => n.nodeId));

    // Frontend B's GraphView renders edges by looking nodes up by id. A dangling
    // endpoint is a blank node or a crash on stage.
    check(
      'every edge endpoint resolves to a node',
      graph.edges.every((e) => ids.has(e.from) && ids.has(e.to))
    );

    // Both field spellings, because the two specs disagreed and both are consumed.
    check(
      'nodes carry BOTH nodeId and id',
      graph.nodes.every((n) => n.nodeId === n.id)
    );
    check(
      'edges carry BOTH from/to and source/target',
      graph.edges.every((e) => e.from === e.source && e.to === e.target)
    );

    check('no self-edges', graph.edges.every((e) => e.from !== e.to));
    equal('clusterSize agrees with the node count', graph.clusterSize, graph.nodes.length);
  }

  // The optional identifier-node view must not corrupt the default one.
  const expanded = await h.call<{ nodes: { nodeId: string; kind: string }[] }>('build_risk_graph', {
    applicationId: SUBJECT,
    includeIdentifierNodes: true,
  });
  check(
    'includeIdentifierNodes adds namespaced identifier nodes',
    expanded.nodes.some((n) => n.nodeId.startsWith('id:'))
  );
  check(
    'identifier nodes are namespaced so they cannot collide with application IDs',
    expanded.nodes.filter((n) => n.nodeId.startsWith('id:')).every((n) => n.kind !== 'application')
  );

  const singleton = await h.call<{ clusterSize: number; nodes: unknown[]; edges: unknown[] }>(
    'build_risk_graph',
    { applicationId: CLEAN }
  );
  equal('a clean applicant graph has exactly one node', singleton.nodes.length, 1);
  equal('a clean applicant graph has no edges', singleton.edges.length, 0);
}

// ---------------------------------------------------------------------------
section('run_verification_pipeline drives every stage and emits as it goes');
// ---------------------------------------------------------------------------
{
  const gateway = h.resolve(DashboardGatewayService);
  const before = gateway.getEvents(SUBJECT).length;

  const run = await h.call<{
    stages: { stage: string; status: string }[];
    progress: { missingStages: string[]; percentComplete: number };
    decisionReady: boolean;
  }>('run_verification_pipeline', { applicationId: SUBJECT });

  const failed = run.stages.filter((s) => s.status === 'failed');
  equal('no stage failed', failed.map((s) => s.stage), []);

  for (const stage of REQUIRED_STAGES_BEFORE_DECISION) {
    check(
      `stage '${stage}' completed`,
      run.stages.some((s) => s.stage === stage && s.status === 'completed')
    );
  }

  // The optional stage must be SKIPPED, not failed, and must not block.
  check(
    'visual_similarity_flag is skipped or unregistered, never failed',
    run.stages.some(
      (s) =>
        s.stage === 'visual_similarity_flag' &&
        (s.status === 'skipped' || s.status === 'not_registered')
    )
  );

  equal('no required stage is outstanding', run.progress.missingStages, []);
  equal('progress reports 100%', run.progress.percentComplete, 100);
  check('decisionReady flips to true', run.decisionReady === true);

  const after = gateway.getEvents(SUBJECT).length;
  check(
    `events were emitted during the run (${after - before} new)`,
    after - before >= REQUIRED_STAGES_BEFORE_DECISION.length,
    'ctx.emit bridge may not be installed'
  );

  // Every event must satisfy the envelope Frontend A's timeline parses.
  const stageEvents = gateway
    .getEvents(SUBJECT)
    .filter((e) => e.event === 'pipeline.stage_completed');
  check(
    'every stage event validates against PipelineStageCompletedEventSchema',
    stageEvents.every((e) => PipelineStageCompletedEventSchema.safeParse(e.payload).success)
  );
  check(
    'event sequence numbers are strictly increasing',
    stageEvents.every((e, i) => i === 0 || e.sequence > stageEvents[i - 1]!.sequence)
  );
}

// ---------------------------------------------------------------------------
section('Backend A stages consumed Backend B output (integration contract)');
// ---------------------------------------------------------------------------
{
  const state = h.resolve(PipelineStateService);

  // The reason build_risk_graph and detect_duplicate_signals exist: a downstream
  // scorer must be able to READ them. This asserts the read actually happened,
  // rather than just that both tools ran.
  const rules = state.getStageResult(SUBJECT, 'evaluate_rules') as
    | { firedRules?: { ruleId: string }[] }
    | undefined;
  const ruleIds = (rules?.firedRules ?? []).map((r) => r.ruleId);

  check(
    'a duplicate-signal rule fired (DUP-010) from detect_duplicate_signals output',
    ruleIds.includes('DUP-010'),
    `fired: ${ruleIds.join(', ') || 'none'}`
  );
  check(
    'a graph rule fired (GRF-020) from build_risk_graph output',
    ruleIds.includes('GRF-020'),
    `fired: ${ruleIds.join(', ') || 'none'}`
  );

  const score = state.getRiskScore(SUBJECT);
  check(`risk score was recorded and read back (${score})`, typeof score === 'number');
  check('the ring subject scores as high risk', (score ?? 0) >= 60, `score=${score}`);

  const contributions =
    (state.getStageResult(SUBJECT, 'score_risk') as { contributions?: { factor: string }[] })
      ?.contributions ?? [];
  check(
    'the score is explicitly graph-weighted',
    contributions.some((c) => c.factor.startsWith('graph:')),
    `factors: ${contributions.map((c) => c.factor).join(', ')}`
  );
}

// ---------------------------------------------------------------------------
section('PipelineCompleteGuard ALLOWS the decision once verification is complete');
// ---------------------------------------------------------------------------
{
  const raw = await h.call('officer_decide', {
    applicationId: SUBJECT,
    decision: 'reject',
    note: 'Reused document photograph and address across three linked applications.',
  });

  const parsed = DecisionRecordSchema.safeParse(raw);
  check(
    'the decision validates against DecisionRecordSchema',
    parsed.success,
    parsed.success ? undefined : JSON.stringify(parsed.error.issues.slice(0, 3))
  );

  if (parsed.success) {
    const record = parsed.data;
    equal('decision is recorded as given', record.decision, 'reject');
    equal('status is derived from the decision', record.status, 'rejected');
    check('an officer is attributed', record.officer.length > 0);
    check('decidedAt is an ISO timestamp', !Number.isNaN(Date.parse(record.decidedAt)));

    // The audit snapshot: what the officer could actually see when they decided.
    equal(
      'all required stages are snapshotted on the record',
      record.stagesCompleted.length,
      REQUIRED_STAGES_BEFORE_DECISION.length
    );
    check('the risk score at decision time is snapshotted', record.riskScoreAtDecision !== null);
    equal('the linked applications are snapshotted', record.linkedApplicationIds.length, 3);
  }

  const trail = await h.call<{ total: number; entries: { applicationId: string }[] }>(
    'get_audit_trail',
    {}
  );
  equal('the audit trail now has exactly one entry', trail.total, 1);
  equal('the entry is for the subject', trail.entries[0]?.applicationId, SUBJECT);

  equal(
    'AuditLogService received the decision over the event bus',
    h.resolve(AuditLogService).size(),
    1
  );

  // An unrelated application must NOT have been unlocked by the subject's run.
  await throws(
    'a different application is still blocked (state is per-application)',
    () => h.call('officer_decide', { applicationId: CLEAN, decision: 'approve' }),
    'Cannot record a decision'
  );
}

// ---------------------------------------------------------------------------
section('Read tools expose the pipeline correctly');
// ---------------------------------------------------------------------------
{
  const list = await h.call<{
    total: number;
    applications: { applicationId: string; decisionReady: boolean; verificationProgress: number }[];
  }>('list_applications', {});
  equal('all 9 applications are listed', list.total, 9);

  const subjectRow = list.applications.find((a) => a.applicationId === SUBJECT);
  check('the subject row reports decisionReady', subjectRow?.decisionReady === true);
  equal('the subject row reports 100% progress', subjectRow?.verificationProgress, 100);

  // CLEAN is NOT untouched — earlier sections called detect_duplicate_signals and
  // build_risk_graph against it, and those tools legitimately record their stages.
  // So assert partial-but-not-complete here, and use a genuinely untouched
  // application for the true zero case.
  const cleanRow = list.applications.find((a) => a.applicationId === CLEAN);
  check(
    'a partially-verified row reports partial progress',
    (cleanRow?.verificationProgress ?? -1) > 0 && (cleanRow?.verificationProgress ?? 100) < 100,
    `progress=${cleanRow?.verificationProgress}`
  );
  check('a partially-verified row is not decisionReady', cleanRow?.decisionReady === false);

  const untouchedRow = list.applications.find((a) => a.applicationId === UNTOUCHED);
  equal('a never-verified row reports 0% progress', untouchedRow?.verificationProgress, 0);
  check('a never-verified row is not decisionReady', untouchedRow?.decisionReady === false);

  const progress = await h.call<{ decisionReady: boolean; blockedReason: string | null }>(
    'get_pipeline_progress',
    { applicationId: SUBJECT }
  );
  check('progress reports the gate open', progress.decisionReady === true);
  equal('no blockedReason when unlocked', progress.blockedReason, null);

  const blocked = await h.call<{ decisionReady: boolean; blockedReason: string | null }>(
    'get_pipeline_progress',
    { applicationId: CLEAN }
  );
  check('an unverified application reports the gate shut', blocked.decisionReady === false);
  check(
    'blockedReason explains WHY, so the UI need not guess',
    (blocked.blockedReason ?? '').includes('stage')
  );

  // Cursor semantics — Frontend A polls with these.
  const page1 = await h.call<{ events: unknown[]; latestSequence: number }>('get_pipeline_events', {
    applicationId: SUBJECT,
    sinceSequence: 0,
  });
  check('the full stream is returned from sequence 0', page1.events.length > 0);

  const page2 = await h.call<{ events: unknown[] }>('get_pipeline_events', {
    applicationId: SUBJECT,
    sinceSequence: page1.latestSequence,
  });
  equal('polling from the latest cursor returns nothing new', page2.events.length, 0);

  const clusters = await h.call<{
    clusterCount: number;
    isolatedApplicationCount: number;
    clusters: { size: number }[];
  }>('list_applicant_clusters', {});
  equal('two multi-application clusters are found', clusters.clusterCount, 2);
  equal('three applicants are isolated', clusters.isolatedApplicationCount, 3);
  equal('the largest cluster is reported first', clusters.clusters[0]?.size, 4);

  const detail = await h.call<{ linkedApplicationIds: string[]; decision: unknown }>(
    'get_application',
    { applicationId: SUBJECT }
  );
  equal('the case file lists the linked applications', detail.linkedApplicationIds.length, 3);
  check('the case file carries the recorded decision', detail.decision !== null);
}

// ---------------------------------------------------------------------------
section('Error handling is explicit, not silent');
// ---------------------------------------------------------------------------
{
  await throws(
    'an unknown applicationId is rejected by name',
    () => h.call('detect_duplicate_signals', { applicationId: 'PIQ-DOES-NOT-EXIST' }),
    'not found'
  );

  await throws(
    'the error lists the known application IDs',
    () => h.call('build_risk_graph', { applicationId: 'nope' }),
    'PIQ-2026-2001'
  );

  // REGRESSION GUARD. core@1.0.14 does NOT validate tool input against
  // inputSchema (it only converts it to JSON Schema for tools/list), so before
  // officer_decide parsed its own input, decision:'maybe' was accepted and
  // written to the append-only audit trail with status undefined.
  const auditBefore = await h.call<{ total: number }>('get_audit_trail', {});

  await throws(
    'an off-enum decision value is rejected',
    () => h.call('officer_decide', { applicationId: SUBJECT, decision: 'maybe' }),
    'invalid input'
  );

  const auditAfter = await h.call<{ total: number }>('get_audit_trail', {});
  equal(
    'a rejected decision wrote NOTHING to the append-only audit trail',
    auditAfter.total,
    auditBefore.total
  );

  await throws(
    'a missing decision is rejected',
    () => h.call('officer_decide', { applicationId: SUBJECT }),
    'invalid input'
  );
}

// ---------------------------------------------------------------------------
section('Repeat runs stay deterministic');
// ---------------------------------------------------------------------------
{
  // A second pipeline run must produce identical findings — the demo is rehearsed
  // repeatedly against the same application, and a differing reveal is fatal.
  const first = JSON.stringify(await h.call('build_risk_graph', { applicationId: SUBJECT }));
  await h.call('run_verification_pipeline', { applicationId: SUBJECT });
  const second = JSON.stringify(await h.call('build_risk_graph', { applicationId: SUBJECT }));
  check('build_risk_graph is unchanged after a full pipeline re-run', first === second);

  const state = h.resolve(PipelineStateService);
  equal(
    'a re-run leaves the application decision-ready',
    state.isPipelineComplete(SUBJECT),
    true
  );

  equal(
    'PIPELINE_STAGES and the guard agree on the optional stage',
    PIPELINE_STAGES.length - REQUIRED_STAGES_BEFORE_DECISION.length,
    1
  );
}

report('Backend B acceptance');
