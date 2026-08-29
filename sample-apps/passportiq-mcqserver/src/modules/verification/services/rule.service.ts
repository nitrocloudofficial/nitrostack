/**
 * RuleService — the deterministic government rulebook behind `evaluate_rules`.
 *
 * Every rule is a named, cited, severity-graded predicate over facts that EARLIER
 * stages already established. This stage derives nothing of its own: it reads the
 * recorded stage results out of `PipelineStateService`, which is the integration
 * contract with Backend B (`detect_duplicate_signals` and `build_risk_graph` are
 * consumed here, never re-run).
 *
 * ---------------------------------------------------------------------------
 * WHY "SKIPPED" IS A FIRST-CLASS OUTCOME
 * ---------------------------------------------------------------------------
 * A rule whose upstream stage has not run is reported in `skippedRuleIds`, not
 * silently treated as passing. That distinction is the whole reason this service
 * is worth reviewing: "we checked and it was fine" and "we never checked" look
 * identical in a boolean, and only one of them is safe to approve on. The officer
 * UI renders skipped rules as caveats, and `score_risk` lowers its own confidence
 * when they appear.
 *
 * ---------------------------------------------------------------------------
 * WHY THE RULES ARE DATA, NOT `if` STATEMENTS
 * ---------------------------------------------------------------------------
 * `RULES` is an array of definitions with an `evaluate` function each, so the
 * rulebook can be listed (`listRules()`), published as an MCP resource, quoted in
 * a clarification letter, and counted in tests — none of which is possible if the
 * policy lives inside a chain of branches. `evaluatedRuleIds` proves which rules
 * actually ran on this application.
 *
 * Fully deterministic. No model, no clock beyond `asOf`, no network.
 */
import { Injectable } from '@nitrostack/core';
import type {
  EvaluateRulesResult,
  RuleViolation,
  SeededApplication,
  Severity,
} from '../../../contracts/index.js';
import { ApplicationService } from '../../pipeline/services/application.service.js';
import { PipelineStateService } from '../../pipeline/services/pipeline-state.service.js';
import { humanise } from './document.service.js';
import { OcrService } from './ocr.service.js';

/** Below this age an application is a minor application under the Passport Rules. */
export const MINOR_AGE_THRESHOLD = 18;

/**
 * A read of an OCR field below this confidence is reported as a rule violation
 * rather than trusted. It does NOT make the application fraudulent — it makes the
 * application unverified, which is a clarification, not a rejection.
 */
export const OCR_CONFIDENCE_FLOOR = 0.75;

/** Everything a rule is allowed to look at. Read-only by construction. */
interface RuleContext {
  application: SeededApplication;
  /** Recorded stage payloads, keyed by stage name. Missing = stage never ran. */
  stage: (name: string) => Record<string, unknown> | undefined;
  /** Aggregate OCR view across every document read so far. */
  ocrConfidence: { lowest: number | null; uncertainFields: string[]; documentsRead: number };
  asOf: Date;
}

/** What a fired rule reports. `severity` overrides the definition's default. */
interface RuleOutcome {
  detail: string;
  evidence?: string[];
  severity?: Severity;
}

interface RuleDefinition {
  ruleId: string;
  /** Short human name — this is the `rule` field in the violation payload. */
  rule: string;
  /** Statutory / policy hook, so the officer can cite it in a letter. */
  citation: string;
  severity: Severity;
  /** The stage whose facts this rule reasons over. */
  sourceStage: string;
  /**
   * Stages that must have completed for this rule to be meaningful. If any is
   * missing the rule is SKIPPED, not passed.
   */
  requires: readonly string[];
  evaluate: (context: RuleContext) => RuleOutcome | null;
}

// ---------------------------------------------------------------------------
// The rulebook
// ---------------------------------------------------------------------------

/**
 * Rule ID prefixes: DOC document set, IDN identity, ADR address, DUP duplicate
 * identifiers, GRF graph/network, PHO photograph, OCR extraction quality,
 * MIN minor, REN renewal, LST lost/replacement.
 */
const RULES: readonly RuleDefinition[] = [
  // ---- DOC: the document set ---------------------------------------------
  {
    ruleId: 'DOC-001',
    rule: 'Required document missing',
    citation: 'Passport Rules 1980, Schedule III — documents to accompany an application',
    severity: 'medium',
    sourceStage: 'document_validate',
    requires: ['document_validate'],
    evaluate: ({ stage }) => {
      const missing = asStringArray(stage('document_validate')?.['missingDocuments']);
      if (missing.length === 0) return null;

      return {
        // Parental consent is a statutory precondition on a minor application, not
        // a paperwork gap, so its absence escalates the whole rule.
        severity: missing.includes('parent_consent') ? 'high' : 'medium',
        detail:
          `${missing.length} required document(s) not attached: ` +
          `${missing.map(humanise).join(', ')}.`,
        evidence: missing.map((type) => `Missing: ${humanise(type)}`),
      };
    },
  },
  {
    ruleId: 'DOC-002',
    rule: 'Supporting document expired',
    citation: 'Passport Rules 1980, Schedule III — supporting documents must be currently valid',
    severity: 'high',
    sourceStage: 'document_validate',
    requires: ['document_validate'],
    evaluate: ({ stage }) => {
      const expired = asStringArray(stage('document_validate')?.['expiredDocuments']);
      if (expired.length === 0) return null;

      return {
        detail:
          `${expired.length} submitted document(s) have expired and cannot support this ` +
          `application: ${expired.map(humanise).join(', ')}.`,
        evidence: expired.map((type) => `Expired: ${humanise(type)}`),
      };
    },
  },
  {
    ruleId: 'DOC-003',
    rule: 'Supporting document expiring shortly',
    citation: 'Internal processing standard — proofs must outlast the processing window',
    severity: 'low',
    sourceStage: 'document_validate',
    requires: ['document_validate'],
    evaluate: ({ stage }) => {
      const soon = asStringArray(stage('document_validate')?.['expiringSoonDocuments']);
      if (soon.length === 0) return null;

      return {
        detail:
          `${soon.map(humanise).join(', ')} expire(s) within the processing window — request a ` +
          `current copy before issuance.`,
        evidence: soon.map((type) => `Expiring soon: ${humanise(type)}`),
      };
    },
  },

  // ---- IDN: identity across documents -------------------------------------
  {
    ruleId: 'IDN-010',
    rule: 'Name differs across documents',
    citation: 'Passport Act 1967, s.5(2)(b) — particulars furnished must be verified as true',
    severity: 'medium',
    sourceStage: 'check_identity_consistency',
    requires: ['check_identity_consistency'],
    evaluate: ({ stage }) => {
      const mismatch = findMismatch(stage('check_identity_consistency'), 'fullName');
      if (!mismatch) return null;

      return {
        severity: mismatch.severity,
        detail: mismatch.detail,
        evidence: sourceEvidence(mismatch.sources),
      };
    },
  },
  {
    ruleId: 'IDN-011',
    rule: 'Date of birth differs across documents',
    citation: 'Passport Act 1967, s.5(2)(b) — date of birth is a core particular',
    severity: 'high',
    sourceStage: 'check_identity_consistency',
    requires: ['check_identity_consistency'],
    evaluate: ({ stage }) => {
      const mismatch = findMismatch(stage('check_identity_consistency'), 'dateOfBirth');
      if (!mismatch) return null;

      // Never downgraded. There is no such thing as an almost-correct date of
      // birth on a passport: two different dates mean one document is wrong.
      return { detail: mismatch.detail, evidence: sourceEvidence(mismatch.sources) };
    },
  },

  // ---- ADR: address ------------------------------------------------------
  {
    ruleId: 'ADR-020',
    rule: 'Address differs from proof of address',
    citation: 'Passport Rules 1980, Schedule III — proof of present residential address',
    severity: 'medium',
    sourceStage: 'check_address_consistency',
    requires: ['check_address_consistency'],
    evaluate: ({ stage }) => {
      const result = stage('check_address_consistency');
      if (result?.['consistent'] === true) return null;

      const mismatches = asRecordArray(result?.['mismatches']);
      if (mismatches.length === 0) return null;

      const fields = mismatches.map((row) => String(row['field'] ?? 'address'));
      const worst = worstOf(mismatches.map((row) => asSeverity(row['severity'])));

      return {
        severity: worst,
        detail:
          `Address particulars disagree between the application form and the submitted ` +
          `proof(s): ${fields.join(', ')}. Police verification will be raised against the ` +
          `form address.`,
        evidence: mismatches.flatMap((row) => sourceEvidence(row['sources'])),
      };
    },
  },

  // ---- DUP: reused identifiers (consumes Backend B) -----------------------
  {
    // ID is load-bearing: the Backend B acceptance suite asserts this exact rule
    // fires from detect_duplicate_signals output, which is how the cross-role
    // integration contract is proven rather than assumed.
    ruleId: 'DUP-010',
    rule: 'Identifiers reused across applications',
    citation: 'Passport Act 1967, s.12(1)(b) — furnishing false information / identity fraud',
    severity: 'high',
    sourceStage: 'detect_duplicate_signals',
    requires: ['detect_duplicate_signals'],
    evaluate: ({ stage }) => {
      const signals = asRecordArray(stage('detect_duplicate_signals')?.['signals']);
      const high = signals.filter((signal) => signal['severity'] === 'high');
      if (high.length === 0) return null;

      const linked = [
        ...new Set(high.map((signal) => String(signal['matchedApplicationId']))),
      ].sort();

      return {
        detail:
          `${high.length} high-severity reused identifier(s) link this application to ` +
          `${linked.length} other application(s): ${linked.join(', ')}. Reused identifiers ` +
          `across live applications indicate possible identity fraud.`,
        evidence: high.map((signal) => {
          const evidence = asRecord(signal['evidence']);
          return (
            `${String(evidence['reason'] ?? signal['type'])} with ` +
            `${String(signal['matchedApplicationId'])}` +
            (evidence['sharedValue'] ? ` (${String(evidence['sharedValue'])})` : '')
          );
        }),
      };
    },
  },
  {
    ruleId: 'DUP-011',
    rule: 'Passport number claimed by another live application',
    citation: 'Passport Act 1967, s.10(3)(b) — impounding where a passport was wrongly obtained',
    severity: 'high',
    sourceStage: 'detect_duplicate_signals',
    requires: ['detect_duplicate_signals'],
    evaluate: ({ stage }) => {
      const signals = asRecordArray(stage('detect_duplicate_signals')?.['signals']);
      const passport = signals.filter((signal) => signal['type'] === 'passport_number_match');
      if (passport.length === 0) return null;

      const matched = [
        ...new Set(passport.map((signal) => String(signal['matchedApplicationId']))),
      ].sort();

      return {
        detail:
          `The passport number on this application is also quoted by ${matched.join(', ')}. ` +
          `A single passport number cannot support two live applications — issuance must be ` +
          `held until the duplicate is resolved.`,
        evidence: matched.map((id) => `Same passport number as ${id}`),
      };
    },
  },

  // ---- GRF: the network view (consumes Backend B) -------------------------
  {
    // ID is load-bearing — see DUP-010. This is the rule that proves
    // build_risk_graph output is genuinely consumed downstream.
    ruleId: 'GRF-020',
    rule: 'Coordinated application cluster',
    citation: 'MEA fraud-detection advisory — coordinated multi-application submissions',
    severity: 'high',
    sourceStage: 'build_risk_graph',
    requires: ['build_risk_graph'],
    evaluate: ({ stage }) => {
      const summary = asRecord(stage('build_risk_graph')?.['clusterSummary']);
      if (summary['isCoordinatedPattern'] !== true) return null;

      const kinds = asStringArray(summary['sharedSignalKinds']);
      const linked = asStringArray(summary['linkedApplicationIds']);

      return {
        detail:
          `This application sits in a densely connected cluster of ${linked.length + 1} ` +
          `applications sharing ${kinds.length} distinct identifier types ` +
          `(${kinds.join(', ')}). That combination is consistent with a coordinated group ` +
          `rather than coincidence.`,
        evidence: [
          `Cluster members: ${[...linked].sort().join(', ')}`,
          `Cluster density: ${String(summary['density'] ?? 'unknown')}`,
          ...kinds.map((kind) => `Shared across cluster: ${kind}`),
        ],
      };
    },
  },
  {
    ruleId: 'GRF-021',
    rule: 'Application linked to other applicants',
    citation: 'MEA fraud-detection advisory — cross-application link analysis',
    severity: 'low',
    sourceStage: 'build_risk_graph',
    requires: ['build_risk_graph'],
    evaluate: ({ stage }) => {
      const graph = stage('build_risk_graph');
      const summary = asRecord(graph?.['clusterSummary']);
      const linked = asStringArray(summary['linkedApplicationIds']);

      // Suppressed when GRF-020 has already fired: telling the officer twice that
      // the applicant is linked adds noise, not information.
      if (linked.length === 0 || summary['isCoordinatedPattern'] === true) return null;

      return {
        severity: linked.length >= 2 ? 'medium' : 'low',
        detail:
          `Linked to ${linked.length} other application(s) by shared identifiers ` +
          `(${asStringArray(summary['sharedSignalKinds']).join(', ')}). Not conclusive on its ` +
          `own — sharing a household address or phone number is common — but it must be seen ` +
          `alongside the other findings.`,
        evidence: linked.map((id) => `Linked application: ${id}`),
      };
    },
  },

  // ---- PHO: the photograph -----------------------------------------------
  {
    ruleId: 'PHO-030',
    rule: 'Photograph reused from another application',
    citation: 'Passport Rules 1980, Schedule III — photograph must be of the applicant',
    severity: 'high',
    sourceStage: 'detect_duplicate_signals',
    requires: ['detect_duplicate_signals'],
    evaluate: ({ stage }) => {
      const signals = asRecordArray(stage('detect_duplicate_signals')?.['signals']);
      const reused = signals.filter((signal) => signal['type'] === 'document_similarity');
      if (reused.length === 0) return null;

      const matched = [
        ...new Set(reused.map((signal) => String(signal['matchedApplicationId']))),
      ].sort();

      return {
        detail:
          `A submitted document image is byte-identical to one filed with ${matched.join(', ')}. ` +
          `The same scan appearing on two applications cannot be explained by resemblance — ` +
          `one of the two files is not the applicant's own.`,
        evidence: reused.map((signal) => {
          const evidence = asRecord(signal['evidence']);
          return (
            `Identical image hash with ${String(signal['matchedApplicationId'])}` +
            (evidence['normalizedValue'] ? ` (${String(evidence['normalizedValue'])})` : '')
          );
        }),
      };
    },
  },

  // ---- OCR: how much of the above can be trusted --------------------------
  {
    ruleId: 'OCR-040',
    rule: 'Document field could not be read confidently',
    citation: 'Internal processing standard — particulars must be legible to be verified',
    severity: 'low',
    sourceStage: 'ocr_extract',
    requires: ['ocr_extract'],
    evaluate: ({ ocrConfidence }) => {
      if (ocrConfidence.documentsRead === 0) return null;
      if (ocrConfidence.uncertainFields.length === 0) return null;

      return {
        detail:
          `${ocrConfidence.uncertainFields.length} field(s) were extracted below the ` +
          `${OCR_CONFIDENCE_FLOOR} confidence floor ` +
          `(${ocrConfidence.uncertainFields.join(', ')}). The consistency checks above are ` +
          `therefore weaker than they appear — prefer clarification over refusal on this basis ` +
          `alone.`,
        evidence: ocrConfidence.uncertainFields.map((field) => `Low-confidence read: ${field}`),
      };
    },
  },

  // ---- Application-type preconditions ------------------------------------
  {
    ruleId: 'MIN-050',
    rule: 'Minor application requires parental consent and officer sign-off',
    citation: 'Passport Rules 1980, Schedule III(E) — Annexure D consent for minors',
    severity: 'low',
    sourceStage: 'document_validate',
    requires: ['document_validate'],
    evaluate: ({ application, stage, asOf }) => {
      const isMinorByAge = ageInYears(application.dateOfBirth, asOf) < MINOR_AGE_THRESHOLD;
      const isMinorByType = application.applicationType === 'minor';
      if (!isMinorByAge && !isMinorByType) return null;

      const missing = asStringArray(stage('document_validate')?.['missingDocuments']);

      // The consent-absent case is DOC-001's high-severity branch. This rule
      // covers the other half: consent IS present, and a human still has to sign.
      if (missing.includes('parent_consent')) return null;

      // A form filed as an adult application by someone under 18 is a filing
      // error that changes which documents are required — worth flagging louder.
      if (isMinorByAge && !isMinorByType) {
        return {
          severity: 'high',
          detail:
            `Applicant is ${ageInYears(application.dateOfBirth, asOf)} years old but the form ` +
            `was filed as a '${application.applicationType}' application. Minor applications ` +
            `require Annexure D parental consent, which this checklist did not demand.`,
          evidence: [`Date of birth: ${application.dateOfBirth}`],
        };
      }

      return {
        detail:
          `Minor application with parental consent on file. Requires an officer's explicit ` +
          `sign-off; it cannot be cleared on document checks alone.`,
        evidence: [`Date of birth: ${application.dateOfBirth}`],
      };
    },
  },
  {
    ruleId: 'REN-060',
    rule: 'Renewal without the previous passport',
    citation: 'Passport Rules 1980 — re-issue requires the original passport for cancellation',
    severity: 'high',
    sourceStage: 'document_validate',
    requires: ['document_validate'],
    evaluate: ({ application }) => {
      if (application.applicationType !== 'renewal') return null;
      if (application.documents.some((document) => document.type === 'old_passport')) return null;

      return {
        detail:
          `Filed as a renewal, but no previous passport is attached. A re-issue cannot proceed ` +
          `without the original for cancellation — either the passport is produced or this is ` +
          `a lost/damaged replacement, which requires an FIR copy instead.`,
        evidence: [`Application type: renewal`, `Documents on file: ${application.documents.length}`],
      };
    },
  },
  {
    ruleId: 'LST-070',
    rule: 'Lost-passport replacement without an FIR copy',
    citation: 'Passport Rules 1980 — replacement of a lost passport requires a police report',
    severity: 'high',
    sourceStage: 'document_validate',
    requires: ['document_validate'],
    evaluate: ({ application }) => {
      if (application.applicationType !== 'lost_replacement') return null;
      if (application.documents.some((document) => document.type === 'fir_copy')) return null;

      return {
        detail:
          `Filed as a lost-passport replacement with no FIR copy attached. A police report is a ` +
          `statutory precondition — without it there is no record that the previous passport is ` +
          `out of circulation.`,
        evidence: [`Application type: lost_replacement`],
      };
    },
  },
];

@Injectable({ deps: [ApplicationService, PipelineStateService, OcrService] })
export class RuleService {
  constructor(
    private readonly applications: ApplicationService,
    private readonly state: PipelineStateService,
    private readonly ocr: OcrService
  ) {}

  /** The whole rulebook, for the MCP resource and the officer's rule reference. */
  listRules(): Array<Omit<RuleDefinition, 'evaluate'>> {
    return RULES.map(({ evaluate: _evaluate, ...definition }) => definition);
  }

  /**
   * Run every rule whose prerequisites are satisfied.
   *
   * @param asOf injectable "today", so the age and expiry branches are testable.
   */
  evaluate(applicationId: string, asOf: Date = new Date()): EvaluateRulesResult {
    const application = this.applications.getApplication(applicationId);

    const context: RuleContext = {
      application,
      stage: (name) => {
        const result = this.state.getStageResult(applicationId, name);
        return result && typeof result === 'object'
          ? (result as Record<string, unknown>)
          : undefined;
      },
      ocrConfidence: this.summariseOcr(applicationId),
      asOf,
    };

    const violations: RuleViolation[] = [];
    const evaluatedRuleIds: string[] = [];
    const skippedRuleIds: string[] = [];

    for (const definition of RULES) {
      const unmet = definition.requires.filter((stage) => !this.state.hasStage(applicationId, stage));

      if (unmet.length > 0) {
        // NOT a pass. See the class comment.
        skippedRuleIds.push(definition.ruleId);
        continue;
      }

      evaluatedRuleIds.push(definition.ruleId);

      const outcome = definition.evaluate(context);
      if (!outcome) continue;

      violations.push({
        rule: definition.rule,
        detail: outcome.detail,
        ruleId: definition.ruleId,
        severity: outcome.severity ?? definition.severity,
        citation: definition.citation,
        sourceStage: definition.sourceStage,
        evidence: outcome.evidence ?? [],
      });
    }

    // Worst first, then by rule ID so the order is stable across runs.
    violations.sort(
      (a, b) => severityRank(b.severity) - severityRank(a.severity) || a.ruleId.localeCompare(b.ruleId)
    );

    return {
      applicationId: application.applicationId,
      violations,
      // `passed` means no rule fired. It deliberately says nothing about skipped
      // rules — `skippedRuleIds` carries that, and score_risk reads it.
      passed: violations.length === 0,
      evaluatedRuleIds,
      skippedRuleIds,
      // Same rows, alias field. Kept because the acceptance suite and the branch's
      // earlier consumers read `firedRules`.
      firedRules: violations,
      worstSeverity: violations.length === 0 ? null : violations[0]!.severity,
    };
  }

  /**
   * Aggregate the per-document OCR reads into one confidence view.
   *
   * Goes through OcrService rather than the recorded `ocr_extract` stage payload
   * on purpose: state records ONE payload per stage name, so the recorded value is
   * whichever document happened to be read last. A rule about extraction quality
   * has to see every document or it is reporting on an arbitrary one.
   */
  private summariseOcr(applicationId: string): RuleContext['ocrConfidence'] {
    const extractions = this.ocr.getExtractions(applicationId);

    const uncertainFields = [
      ...new Set(
        extractions.flatMap((extraction) =>
          (extraction.uncertainFields ?? []).map(
            (field) => `${field} (${extraction.documentType})`
          )
        )
      ),
    ];

    const lowest = extractions.reduce<number | null>(
      (worst, extraction) => (worst === null ? extraction.confidence : Math.min(worst, extraction.confidence)),
      null
    );

    return { lowest, uncertainFields, documentsRead: extractions.length };
  }
}

// ---------------------------------------------------------------------------
// Narrowing helpers — every stage payload arrives as `unknown`
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => Boolean(asRecord(row))) : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asSeverity(value: unknown): Severity {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'medium';
}

/** Pull one field's mismatch row out of a ConsistencyResult payload. */
function findMismatch(
  result: Record<string, unknown> | undefined,
  field: string
): { detail: string; severity: Severity; sources: unknown } | null {
  const row = asRecordArray(result?.['mismatches']).find((entry) => entry['field'] === field);
  if (!row) return null;

  return {
    detail: String(row['detail'] ?? `${field} differs across documents.`),
    severity: asSeverity(row['severity']),
    sources: row['sources'],
  };
}

/** Turn a `sources` map into officer-facing evidence lines. */
function sourceEvidence(sources: unknown): string[] {
  return Object.entries(asRecord(sources)).map(
    ([label, value]) => `${label.replace(/_/g, ' ')}: ${String(value)}`
  );
}

function severityRank(severity: Severity): number {
  return severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;
}

function worstOf(severities: readonly Severity[]): Severity {
  return severities.reduce<Severity>(
    (worst, current) => (severityRank(current) > severityRank(worst) ? current : worst),
    'low'
  );
}

/** Whole years between a YYYY-MM-DD date of birth and `asOf`. */
export function ageInYears(dateOfBirth: string, asOf: Date = new Date()): number {
  const born = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(born.getTime())) return 0;

  let age = asOf.getUTCFullYear() - born.getUTCFullYear();
  const monthDelta = asOf.getUTCMonth() - born.getUTCMonth();

  // Birthday has not happened yet this year.
  if (monthDelta < 0 || (monthDelta === 0 && asOf.getUTCDate() < born.getUTCDate())) {
    age -= 1;
  }

  return Math.max(0, age);
}
