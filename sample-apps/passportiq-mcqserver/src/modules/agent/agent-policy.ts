/**
 * The agent's world model and its deterministic fallback planner.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS AGENTIC AND run_verification_pipeline IS NOT
 * ---------------------------------------------------------------------------
 * run_verification_pipeline walks a `const` array of stage names. Its output is
 * the same shape for a clean application and for a fraud ring, and you can read
 * the sequence off the source code without running it.
 *
 * The agent has no such array. Each turn it builds an `AgentObservation` from
 * what it has actually learned so far, and `nextAction()` returns ONE action
 * chosen from that observation. Three consequences follow, and they are the
 * difference between an agent and a script:
 *
 *   1. THE SEQUENCE DIVERGES. A clean application never reaches
 *      visual_similarity_flag; the agent stops early because its stopping
 *      condition is satisfied. A ring subject gets extra turns spent on the
 *      graph and on photograph comparison. Same code, different trajectories.
 *
 *   2. ARGUMENTS ARE DERIVED AT RUNTIME. `visual_similarity_flag` needs a
 *      *target* application. Nothing hardcodes it: the agent reads the duplicate
 *      signals it just collected, finds the counterpart that shares a document
 *      image, and compares against that. It cannot know the target before it
 *      runs, because the target is a finding.
 *
 *   3. IT REACTS TO ITS OWN UNCERTAINTY. A low `confidence` from score_risk
 *      makes the agent spend more turns gathering evidence rather than
 *      concluding. Below AGENT_CONFIDENCE_FLOOR it refuses to conclude at all
 *      and escalates to a human.
 *
 * ---------------------------------------------------------------------------
 * WHY A DETERMINISTIC PLANNER EXISTS AT ALL
 * ---------------------------------------------------------------------------
 * The LLM planner (AgentPlannerService) is the primary decision-maker when a key
 * is configured. This module is the floor underneath it, and it is not a
 * downgrade to be embarrassed about — it is what makes the agent demonstrable
 * on a conference wifi with no API key, and what stops a hallucinated action
 * name from stalling a government workflow. The LLM proposes; this module
 * validates and, when the proposal is unusable, decides.
 *
 * Both paths draw from the SAME enumerated action space (AgentActionSchema), so
 * the agent's authority is identical either way. Notably absent from that enum:
 * `officer_decide`. The agent cannot decide an application's outcome even if a
 * model tells it to.
 */
import type { AgentAction, AgentGoal, AgentStep } from '../../contracts/index.js';
import type { DetectDuplicateSignalsToolOutput } from '../../contracts/index.js';
import type { BuildRiskGraphToolOutput } from '../../contracts/index.js';
import type { SeededApplication } from '../../contracts/index.js';
import type { PipelineStateService } from '../pipeline/services/pipeline-state.service.js';

/**
 * Confidence below which the agent will not conclude on its own.
 *
 * This is a policy decision with a real-world justification: a passport is an
 * identity document, and a wrong approval is not recoverable by an apology. When
 * the machine is unsure, the correct behaviour is to say so and route to a
 * human, not to emit a confident-sounding guess.
 */
export const AGENT_CONFIDENCE_FLOOR = 0.7;

/**
 * Hard turn budget. The loop is bounded so a planner that keeps proposing the
 * same action cannot run forever; hitting it produces stopReason 'max_steps',
 * which is explicitly NOT reported as a finished investigation.
 */
export const AGENT_MAX_STEPS = 16;

/** Stages the agent must have completed before it is allowed to conclude. */
export const REQUIRED_BEFORE_CONCLUSION: readonly AgentAction[] = [
  'document_validate',
  'ocr_extract',
  'check_identity_consistency',
  'check_address_consistency',
  'detect_duplicate_signals',
  'build_risk_graph',
  'evaluate_rules',
  'score_risk',
  'explain_risk',
];

/**
 * Everything the agent knows right now.
 *
 * Built fresh each turn from recorded stage output — never accumulated
 * incrementally. Rebuilding is deliberate: an incrementally-mutated observation
 * can drift out of sync with what the tools actually returned, and then the
 * trace the officer audits no longer describes the run that happened.
 */
export interface AgentObservation {
  applicationId: string;
  applicantName: string;
  applicationType: string;
  /** Stage names recorded in PipelineStateService for this application. */
  completedStages: string[];
  /**
   * Document TYPES the agent has already sent through ocr_extract this run.
   *
   * Types, not ids: `ocr_extract` keys on documentType (it is what OcrService
   * looks the attachment up by), so tracking ids here would mean the agent could
   * never tell that a document had been read and would re-read it until its step
   * budget ran out.
   */
  ocrDone: string[];
  /** Document types still unread. Drives whether another ocr_extract turn is due. */
  ocrPending: string[];
  /**
   * Types whose extraction FAILED. Excluded from `ocrPending` so a document the
   * reader cannot handle costs one turn rather than the whole budget — while
   * still being visible, because an unread document must lower confidence rather
   * than silently disappear.
   */
  ocrFailed: string[];
  documentsComplete: boolean | null;
  missingDocuments: string[];
  identityConsistent: boolean | null;
  addressConsistent: boolean | null;
  duplicateSignalCount: number;
  highSeveritySignalCount: number;
  linkedApplicationIds: string[];
  /**
   * Applications that share a document IMAGE with the subject — the runtime-derived
   * target list for visual_similarity_flag. Empty for a clean application, which
   * is exactly why a clean application never runs that stage.
   */
  photoMatchCandidates: string[];
  clusterSize: number;
  isCoordinatedPattern: boolean;
  violationCount: number;
  highSeverityViolations: number;
  riskScore: number | null;
  riskBand: 'low' | 'medium' | 'high' | null;
  scoreConfidence: number | null;
  recommendation: 'approve' | 'clarify' | 'reject' | 'escalate' | null;
  /** Target ids already compared this run, so the agent does not repeat itself. */
  visualComparisonsDone: string[];
  /** Actions that threw. The agent routes around them instead of retrying blindly. */
  failedActions: string[];
}

export interface PolicyDecision {
  action: AgentAction;
  actionInput: Record<string, unknown>;
  /** First-person reasoning, recorded verbatim into the audit trace. */
  thought: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Observation construction
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/**
 * Build the observation for this turn.
 *
 * `steps` is the agent's own history, needed for the things PipelineStateService
 * cannot tell us: it stores ONE payload per stage name, so after three
 * ocr_extract calls only the last document's result survives. Which documents
 * have been read is therefore reconstructed from the trace, not from state.
 */
export function observe(
  application: SeededApplication,
  state: PipelineStateService,
  steps: readonly AgentStep[]
): AgentObservation {
  const applicationId = application.applicationId;
  const stage = (name: string): Record<string, unknown> | undefined =>
    asRecord(state.getStageResult(applicationId, name));

  const documents = stage('document_validate');
  const identity = stage('check_identity_consistency');
  const address = stage('check_address_consistency');
  const duplicates = stage('detect_duplicate_signals') as
    | (DetectDuplicateSignalsToolOutput & Record<string, unknown>)
    | undefined;
  const graph = stage('build_risk_graph') as
    | (BuildRiskGraphToolOutput & Record<string, unknown>)
    | undefined;
  const rules = stage('evaluate_rules');
  const score = stage('score_risk');
  const explanation = stage('explain_risk');

  // --- which documents has this run already read? -------------------------
  const ocrTarget = (step: AgentStep): string => String(step.actionInput['documentType'] ?? '');

  const ocrDone = steps
    .filter((s) => s.action === 'ocr_extract' && s.status === 'ok')
    .map(ocrTarget)
    .filter((t) => t.length > 0);

  const ocrFailed = steps
    .filter((s) => s.action === 'ocr_extract' && s.status === 'failed')
    .map(ocrTarget)
    .filter((t) => t.length > 0 && !ocrDone.includes(t));

  // Distinct types, because ocr_extract reads BY type: two documents of the same
  // type would otherwise queue two turns that do identical work.
  const allDocumentTypes = [...new Set(application.documents.map((d) => d.type as string))];
  const ocrPending = allDocumentTypes.filter(
    (t) => !ocrDone.includes(t) && !ocrFailed.includes(t)
  );

  // --- duplicate signals --------------------------------------------------
  const signals = Array.isArray(duplicates?.signals) ? duplicates.signals : [];
  const highSeveritySignalCount = signals.filter((s) => s.severity === 'high').length;

  /**
   * Photograph-reuse counterparts. `document_similarity` is the signal type
   * GraphService emits for a shared imageHash, so these are precisely the
   * applications whose photograph is worth comparing against — a finding that
   * only exists after detect_duplicate_signals has run.
   */
  const photoMatchCandidates = [
    ...new Set(
      signals
        .filter((s) => s.type === 'document_similarity')
        .map((s) => s.matchedApplicationId)
        .filter((id) => id !== applicationId)
    ),
  ];

  const linkedFromGraph = asStringArray(asRecord(graph?.['clusterSummary'])?.['linkedApplicationIds']);
  const linkedFromSignals = [...new Set(signals.map((s) => s.matchedApplicationId))];
  const linkedApplicationIds = linkedFromGraph.length > 0 ? linkedFromGraph : linkedFromSignals;

  // --- rules --------------------------------------------------------------
  const violations = Array.isArray(rules?.['violations']) ? (rules['violations'] as unknown[]) : [];
  const highSeverityViolations = violations.filter(
    (v) => asRecord(v)?.['severity'] === 'high'
  ).length;

  const band = score?.['band'];

  return {
    applicationId,
    applicantName: application.fullName,
    applicationType: application.applicationType,
    completedStages: state.getCompletedStages(applicationId),
    ocrDone,
    ocrPending,
    ocrFailed: [...new Set(ocrFailed)],
    documentsComplete: asBool(documents?.['complete']),
    missingDocuments: asStringArray(documents?.['missingDocuments']),
    identityConsistent: asBool(identity?.['consistent']),
    addressConsistent: asBool(address?.['consistent']),
    duplicateSignalCount: signals.length,
    highSeveritySignalCount,
    linkedApplicationIds,
    photoMatchCandidates,
    clusterSize: asNumber(graph?.['clusterSize']) ?? 1,
    isCoordinatedPattern:
      asBool(asRecord(graph?.['clusterSummary'])?.['isCoordinatedPattern']) ?? false,
    violationCount: violations.length,
    highSeverityViolations,
    riskScore: asNumber(score?.['score']),
    riskBand: band === 'low' || band === 'medium' || band === 'high' ? band : null,
    scoreConfidence: asNumber(score?.['confidence']),
    recommendation: normaliseRecommendation(explanation?.['recommendedAction']),
    visualComparisonsDone: steps
      .filter((s) => s.action === 'visual_similarity_flag')
      .map((s) => String(s.actionInput['compareToApplicationId'] ?? ''))
      .filter((id) => id.length > 0),
    failedActions: steps.filter((s) => s.status === 'failed').map((s) => s.action),
  };
}

function normaliseRecommendation(
  value: unknown
): 'approve' | 'clarify' | 'reject' | 'escalate' | null {
  return value === 'approve' || value === 'clarify' || value === 'reject' || value === 'escalate'
    ? value
    : null;
}

// ---------------------------------------------------------------------------
// The deterministic planner
// ---------------------------------------------------------------------------

/**
 * Choose the next action from the current observation.
 *
 * Read top-to-bottom this is a priority ladder, not a pipeline: each clause asks
 * "given what I now know, is this the most valuable thing I could do next?" The
 * ordering encodes investigative judgement — establish the paperwork exists
 * before reading it, read it before comparing it, compare it before deciding
 * whether the comparison implicates other people.
 *
 * Returns `handoff_to_officer` when the agent is done. Never returns null, so
 * the loop always terminates on an explicit terminal action rather than by
 * falling off the end.
 */
export function nextAction(
  obs: AgentObservation,
  goal: AgentGoal,
  stepsTaken: number
): PolicyDecision {
  const done = (action: AgentAction): boolean =>
    obs.completedStages.includes(action) && !obs.failedActions.includes(action);

  // Out of budget: conclude with whatever is known, flagged as incomplete.
  if (stepsTaken >= AGENT_MAX_STEPS - 1) {
    return {
      action: 'handoff_to_officer',
      actionInput: { applicationId: obs.applicationId },
      thought:
        `I have used my full step budget (${AGENT_MAX_STEPS}) without reaching a confident ` +
        `conclusion. Rather than keep spending turns, I am handing this to an officer with ` +
        `everything I gathered so far and a note that the investigation is incomplete.`,
      confidence: 0.4,
    };
  }

  // --- 1. Does the paperwork even exist? ---------------------------------
  if (!done('document_validate')) {
    return {
      action: 'document_validate',
      actionInput: { applicationId: obs.applicationId },
      thought:
        `I know nothing about ${obs.applicantName}'s file yet. Before I read or compare ` +
        `anything I need to know which required documents are actually present for a ` +
        `'${obs.applicationType}' application, and whether any have expired. Everything ` +
        `downstream is uninterpretable without that.`,
      confidence: 0.5,
    };
  }

  // --- 2. Read the documents ---------------------------------------------
  if (obs.ocrPending.length > 0) {
    const documentType = obs.ocrPending[0] as string;
    return {
      action: 'ocr_extract',
      actionInput: { applicationId: obs.applicationId, documentType },
      thought:
        `The checklist is resolved${
          obs.missingDocuments.length > 0
            ? ` (missing: ${obs.missingDocuments.join(', ')})`
            : ' and complete'
        }. Now I need the fields off each document. Reading the ${documentType} — ` +
        `${obs.ocrPending.length} document type(s) still unread. I cannot compare names or ` +
        `addresses I have not read.`,
      confidence: 0.55,
    };
  }

  // --- 3. Do the documents agree with each other? ------------------------
  if (!done('check_identity_consistency')) {
    return {
      action: 'check_identity_consistency',
      actionInput: { applicationId: obs.applicationId },
      thought:
        `All ${obs.ocrDone.length} document(s) are read. The first thing worth testing is ` +
        `whether they describe the same person — a name or date-of-birth that shifts between ` +
        `documents is the cheapest signal of a fabricated identity.`,
      confidence: 0.6,
    };
  }

  if (!done('check_address_consistency')) {
    return {
      action: 'check_address_consistency',
      actionInput: { applicationId: obs.applicationId },
      thought:
        obs.identityConsistent === false
          ? `Identity fields already disagree across documents. That raises rather than ` +
            `lowers the value of checking the address, because a fabricated file usually ` +
            `has more than one inconsistency. Checking address next.`
          : `Identity fields agree across documents. Now checking the address, which is the ` +
            `field most often shared by applications filed by the same facilitator.`,
      confidence: 0.6,
    };
  }

  // --- 4. Is anyone else using these identifiers? ------------------------
  if (!done('detect_duplicate_signals')) {
    return {
      action: 'detect_duplicate_signals',
      actionInput: { applicationId: obs.applicationId },
      thought:
        `This file is internally ${
          obs.identityConsistent === false || obs.addressConsistent === false
            ? 'inconsistent'
            : 'coherent'
        }, but internal coherence says nothing about whether these identifiers belong to ` +
        `someone else. Checking the rest of the queue for reuse of this passport number, ` +
        `phone, email, address and document images. This is the step a single-file review ` +
        `cannot do.`,
      confidence: 0.65,
    };
  }

  // --- 5. If there are links, map them -----------------------------------
  if (!done('build_risk_graph')) {
    return {
      action: 'build_risk_graph',
      actionInput: { applicationId: obs.applicationId },
      thought:
        obs.duplicateSignalCount === 0
          ? `No reused identifiers came back. I still want the graph, because confirming an ` +
            `applicant is genuinely isolated is a finding — it is what lets me recommend ` +
            `approval rather than merely failing to find anything.`
          : `${obs.duplicateSignalCount} reuse signal(s) came back (${obs.highSeveritySignalCount} ` +
            `high severity) against ${obs.linkedApplicationIds.length} other application(s). ` +
            `Individually these could be coincidence. Building the graph tells me whether they ` +
            `form one connected cluster, which coincidence does not explain.`,
      confidence: 0.7,
    };
  }

  // --- 6. Runtime-targeted photograph comparison -------------------------
  // Only reachable when detect_duplicate_signals actually found a shared image.
  // The target is a finding, not a parameter — see the module header, point (2).
  const photoTarget = obs.photoMatchCandidates.find(
    (id) => !obs.visualComparisonsDone.includes(id)
  );
  if (photoTarget && !obs.failedActions.includes('visual_similarity_flag')) {
    return {
      action: 'visual_similarity_flag',
      actionInput: {
        applicationId: obs.applicationId,
        compareToApplicationId: photoTarget,
      },
      thought:
        `The cluster contains a reused document image, so ${photoTarget} is worth a direct ` +
        `photograph comparison. I chose that target from my own findings — I had no way to ` +
        `know it before detect_duplicate_signals ran. Flagging it as advisory only: this is ` +
        `not a biometric match and must not be presented as one.`,
      confidence: 0.72,
    };
  }

  // --- 7. Apply the cited rulebook ---------------------------------------
  if (!done('evaluate_rules')) {
    return {
      action: 'evaluate_rules',
      actionInput: { applicationId: obs.applicationId },
      thought:
        `I have the facts: checklist, extracted fields, consistency, reuse signals and the ` +
        `cluster${obs.clusterSize > 1 ? ` of ${obs.clusterSize}` : ''}. Now I apply the rulebook ` +
        `so every finding carries a citation. An officer cannot act on "the model thought it ` +
        `looked wrong" — they need the clause.`,
      confidence: 0.75,
    };
  }

  // --- 8. Score -----------------------------------------------------------
  if (!done('score_risk')) {
    return {
      action: 'score_risk',
      actionInput: { applicationId: obs.applicationId },
      thought:
        `${obs.violationCount} rule(s) fired (${obs.highSeverityViolations} high severity). ` +
        `Converting the findings into a weighted score so this file can be ranked against the ` +
        `rest of the queue rather than judged in isolation.`,
      confidence: 0.8,
    };
  }

  // --- 9. Uncertainty triggers MORE work, not a conclusion ---------------
  // A low-confidence score means coverage was thin. Re-reading documents is the
  // cheapest way to raise it, so the agent spends a turn there instead of
  // concluding on a weak basis.
  if (
    obs.scoreConfidence !== null &&
    obs.scoreConfidence < AGENT_CONFIDENCE_FLOOR &&
    obs.ocrPending.length > 0
  ) {
    const documentType = obs.ocrPending[0];
    if (documentType) {
      return {
        action: 'ocr_extract',
        actionInput: { applicationId: obs.applicationId, documentType },
        thought:
          `The score came back at ${obs.riskScore} but with confidence ` +
          `${obs.scoreConfidence.toFixed(2)}, below my floor of ${AGENT_CONFIDENCE_FLOOR}. A ` +
          `low-confidence score is not a conclusion. Reading the ${documentType} to raise ` +
          `coverage before I say anything an officer might act on.`,
        confidence: obs.scoreConfidence,
      };
    }
  }

  // --- 10. Explain in officer language -----------------------------------
  if (!done('explain_risk')) {
    return {
      action: 'explain_risk',
      actionInput: { applicationId: obs.applicationId },
      thought:
        `Score is ${obs.riskScore}/100 (${obs.riskBand ?? 'unbanded'}). A number is not ` +
        `actionable on its own, so I am generating the officer-readable explanation: what ` +
        `drove the score, the supporting evidence, and the questions worth asking the ` +
        `applicant.`,
      confidence: 0.85,
    };
  }

  // --- 11. Fraud-hypothesis goal: widen to the cluster -------------------
  // The goal changes the trajectory, which is the clearest single proof that the
  // sequence is not fixed.
  if (goal === 'investigate_fraud_signal' && obs.clusterSize > 1) {
    const unexamined = obs.photoMatchCandidates.filter(
      (id) => !obs.visualComparisonsDone.includes(id)
    );
    if (unexamined.length > 0 && !obs.failedActions.includes('visual_similarity_flag')) {
      return {
        action: 'visual_similarity_flag',
        actionInput: {
          applicationId: obs.applicationId,
          compareToApplicationId: unexamined[0] as string,
        },
        thought:
          `My goal on this run is to chase the fraud hypothesis specifically, and the cluster ` +
          `still has an uncompared photograph counterpart (${unexamined[0]}). Following it ` +
          `before I conclude.`,
        confidence: 0.8,
      };
    }
  }

  // --- 12. Conclude -------------------------------------------------------
  return {
    action: 'handoff_to_officer',
    actionInput: { applicationId: obs.applicationId },
    thought: concludingThought(obs),
    confidence: concludingConfidence(obs),
  };
}

function concludingThought(obs: AgentObservation): string {
  if (obs.isCoordinatedPattern) {
    return (
      `I have everything I need and the picture is coherent: ${obs.applicantName} sits in a ` +
      `connected cluster of ${obs.clusterSize} applications whose overlap pattern is not ` +
      `explainable as coincidence, scoring ${obs.riskScore}/100. This is a network finding, ` +
      `which is exactly the class of case I must not close myself. Handing to an officer with ` +
      `a senior-review flag.`
    );
  }

  if ((obs.riskScore ?? 0) >= 60) {
    return (
      `Investigation complete. ${obs.applicantName} scores ${obs.riskScore}/100 on ` +
      `${obs.violationCount} cited rule violation(s). High enough that an approval would need ` +
      `justifying, so I am handing over with the evidence rather than recommending closure.`
    );
  }

  if (obs.duplicateSignalCount === 0 && obs.violationCount === 0) {
    return (
      `Investigation complete and it is clean: documents present, fields consistent across ` +
      `them, no identifier reuse anywhere in the queue, no rule violations. Score ` +
      `${obs.riskScore}/100. I am recommending approval — but the decision is the officer's, ` +
      `and I have no route to make it.`
    );
  }

  return (
    `Investigation complete. Score ${obs.riskScore}/100 with ${obs.violationCount} rule ` +
    `violation(s) and ${obs.duplicateSignalCount} reuse signal(s). Not clean enough to ` +
    `recommend approval, not severe enough to call fraud. That ambiguity is precisely what a ` +
    `human should resolve, so I am asking for clarification rather than guessing.`
  );
}

function concludingConfidence(obs: AgentObservation): number {
  const missing = REQUIRED_BEFORE_CONCLUSION.filter(
    (stage) => !obs.completedStages.includes(stage)
  ).length;

  // Start from the score's own confidence — it already accounts for stage
  // coverage and OCR read quality — then penalise anything still missing here.
  const base = obs.scoreConfidence ?? 0.5;
  const penalty = missing * 0.08 + obs.failedActions.length * 0.05;

  // A coordinated ring is the one case where the agent is MORE sure, not less:
  // multiple independent identifier types overlapping is a strong joint signal.
  const bonus = obs.isCoordinatedPattern ? 0.1 : 0;

  return Math.max(0.2, Math.min(0.97, base - penalty + bonus));
}

/**
 * Validate an LLM-proposed action against the enumerated space and the current
 * observation.
 *
 * Rejects three distinct failure modes that all look the same from the outside:
 * an action outside the allow-list (hallucinated tool), an action that cannot run
 * yet (missing prerequisite), and an action that would repeat completed work
 * (loop). Returning a reason string rather than a boolean means the trace records
 * WHY the model's suggestion was overridden, which is what makes the override
 * auditable rather than mysterious.
 */
export function validateProposal(
  action: string,
  actionInput: Record<string, unknown>,
  obs: AgentObservation
): { ok: true } | { ok: false; reason: string } {
  const allowed: readonly AgentAction[] = [...REQUIRED_BEFORE_CONCLUSION, 'visual_similarity_flag', 'handoff_to_officer'];

  if (!allowed.includes(action as AgentAction)) {
    return {
      ok: false,
      reason:
        `'${action}' is not in the agent's action allow-list. The agent may only call ` +
        `verification tools and handoff_to_officer — never officer_decide.`,
    };
  }

  if (action === 'visual_similarity_flag') {
    const target = actionInput['compareToApplicationId'];
    if (typeof target !== 'string' || target.length === 0) {
      return { ok: false, reason: 'visual_similarity_flag requires compareToApplicationId.' };
    }
    if (target === obs.applicationId) {
      return { ok: false, reason: 'Cannot compare an application against itself.' };
    }
    if (obs.visualComparisonsDone.includes(target)) {
      return { ok: false, reason: `Already compared against ${target} on this run.` };
    }
  }

  if (action === 'ocr_extract') {
    const documentType = actionInput['documentType'];
    if (typeof documentType !== 'string' || documentType.length === 0) {
      return { ok: false, reason: 'ocr_extract requires documentType.' };
    }
    if (obs.ocrDone.includes(documentType)) {
      return { ok: false, reason: `Already read the ${documentType} on this run.` };
    }
  }

  // Prerequisite ordering: scoring before the facts exist produces a confident
  // number with nothing behind it, which is worse than no number.
  const prerequisites: Partial<Record<AgentAction, AgentAction[]>> = {
    check_identity_consistency: ['ocr_extract'],
    check_address_consistency: ['ocr_extract'],
    build_risk_graph: ['detect_duplicate_signals'],
    visual_similarity_flag: ['detect_duplicate_signals'],
    evaluate_rules: ['document_validate', 'detect_duplicate_signals'],
    score_risk: ['evaluate_rules'],
    explain_risk: ['score_risk'],
  };

  for (const required of prerequisites[action as AgentAction] ?? []) {
    if (!obs.completedStages.includes(required)) {
      return {
        ok: false,
        reason: `${action} needs ${required} to have run first, and it has not.`,
      };
    }
  }

  // Repeating a completed, non-repeatable stage is a loop, not diligence.
  const repeatable: readonly AgentAction[] = ['ocr_extract', 'visual_similarity_flag'];
  if (!repeatable.includes(action as AgentAction) && obs.completedStages.includes(action)) {
    return { ok: false, reason: `${action} has already completed on this application.` };
  }

  return { ok: true };
}
