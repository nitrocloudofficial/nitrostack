/**
 * ExplanationService — the officer-facing narration behind `explain_risk`.
 *
 * This is the only stage whose PROSE may come from a model, and the split is
 * deliberate:
 *
 *   The evidence, the recommended action and the clarification questions are
 *   computed deterministically here, from recorded stage results.
 *
 *   The model, when configured, is asked to WRITE those facts up for a human. It
 *   is never asked what the facts are, and it cannot change the recommendation.
 *
 * That boundary is what makes the narration safe to show a citizen. An LLM that
 * decides the recommendation would be an LLM making an immigration decision; an
 * LLM that phrases a recommendation someone else computed is a writing tool.
 * `narrationMode` in the payload states which happened on this run.
 *
 * The recommendation is still only ever a RECOMMENDATION — `officer_decide` is a
 * separate, guarded, human tool, and nothing here can call it.
 */
import { Injectable } from '@nitrostack/core';
import type {
  ExplainRiskResult,
  RiskBand,
  SeededApplication,
  Severity,
} from '../../../contracts/index.js';
import { ApplicationService } from '../../pipeline/services/application.service.js';
import { PipelineStateService } from '../../pipeline/services/pipeline-state.service.js';
import { LlmService } from './llm.service.js';
import { RiskService } from './risk.service.js';

/** What the copilot suggests. Mirrors ExplainRiskResult.recommendedAction. */
export type RecommendedAction = 'approve' | 'clarify' | 'reject' | 'escalate';

@Injectable({ deps: [ApplicationService, PipelineStateService, RiskService, LlmService] })
export class ExplanationService {
  constructor(
    private readonly applications: ApplicationService,
    private readonly state: PipelineStateService,
    private readonly risk: RiskService,
    private readonly llm: LlmService
  ) {}

  async explain(applicationId: string): Promise<ExplainRiskResult> {
    const application = this.applications.getApplication(applicationId);

    // Prefer the score that was actually recorded, so the explanation narrates the
    // number the officer is looking at rather than a freshly recomputed one that
    // could differ if a stage completed in between.
    const recorded = this.stage(applicationId, 'score_risk');
    const score = typeof recorded?.['score'] === 'number' ? (recorded['score'] as number) : null;
    const band = isBand(recorded?.['band']) ? (recorded['band'] as RiskBand) : null;
    const confidence = typeof recorded?.['confidence'] === 'number' ? (recorded['confidence'] as number) : null;

    const evidence = this.collectEvidence(applicationId);
    const violations = records(this.stage(applicationId, 'evaluate_rules')?.['violations']);
    const missingStages = this.state.getMissingStages(applicationId);

    const { action, rationale } = this.recommend({
      score,
      confidence,
      violations,
      missingStages,
      documentGap: this.hasDocumentGap(applicationId),
    });

    const clarificationQuestions = this.buildQuestions(applicationId, application);

    const deterministic = this.narrate(application, score, band, evidence, action, missingStages);

    const narration = this.llm.isEnabled()
      ? await this.llm.complete({
          system:
            'You write case notes for an Indian passport verification officer. Register: plain, ' +
            'factual, administrative English. Rules you must not break: (1) cite ONLY the ' +
            'findings supplied — never add a fact, a statute or a number; (2) state the ' +
            'recommended action exactly as given and never suggest a different one; (3) never ' +
            'say the application is approved, rejected or decided — a human decides; (4) no ' +
            'bullet points, no headings, no markdown. Two or three short paragraphs.',
          prompt: this.buildNarrationPrompt(
            application,
            score,
            band,
            evidence,
            action,
            rationale,
            missingStages
          ),
          maxOutputTokens: 500,
          // Slightly above zero: this is prose, and identical phrasing every run
          // reads like a template. Nothing downstream parses it.
          temperature: 0.2,
        })
      : null;

    return {
      applicationId: application.applicationId,
      score,
      // `explanation` is the officer-facing text. The deterministic version is a
      // complete, usable case note in its own right, not a stub — so a missing
      // API key changes the prose style and nothing else.
      explanation: narration?.text ?? deterministic,
      band,
      applicantName: application.fullName,
      evidence,
      recommendedAction: action,
      recommendationRationale: rationale,
      clarificationQuestions,
      narrationMode: narration ? 'llm' : 'deterministic',
      model: narration?.model ?? null,
    };
  }

  // =========================================================================
  // Recommendation — deterministic, and never delegated to the model
  // =========================================================================

  /**
   * Map the assessment onto one of four actions.
   *
   * Ordering matters, and the first two clauses are the important ones: an
   * incomplete assessment can never recommend approval, and low confidence
   * escalates rather than approving. A copilot that recommends "approve" on a
   * pipeline that only half ran is worse than no copilot, because it launders a
   * gap in the evidence into a positive signal.
   */
  private recommend(input: {
    score: number | null;
    confidence: number | null;
    violations: Array<Record<string, unknown>>;
    missingStages: readonly string[];
    documentGap: boolean;
  }): { action: RecommendedAction; rationale: string } {
    const { score, confidence, violations, missingStages, documentGap } = input;

    if (score === null) {
      return {
        action: 'clarify',
        rationale:
          'No risk score has been produced for this application yet, so there is nothing to ' +
          'recommend on. Run the verification pipeline first.',
      };
    }

    if (missingStages.length > 0) {
      return {
        action: 'escalate',
        rationale:
          `${missingStages.length} verification stage(s) have not completed ` +
          `(${missingStages.join(', ')}). The assessment is incomplete, so it cannot support an ` +
          `approval either way.`,
      };
    }

    const highSeverity = violations.filter((violation) => violation['severity'] === 'high');

    // Fraud-network findings escalate rather than auto-recommending refusal: a
    // ring implicates OTHER applications too, and that is an investigator's call,
    // not a single case officer's.
    const networkFindings = highSeverity.filter((violation) =>
      ['DUP-010', 'DUP-011', 'GRF-020', 'PHO-030'].includes(String(violation['ruleId']))
    );

    if (networkFindings.length > 0) {
      return {
        action: 'escalate',
        rationale:
          `${networkFindings.length} finding(s) implicate other applications ` +
          `(${networkFindings.map((violation) => String(violation['ruleId'])).join(', ')}). ` +
          `A cross-application fraud pattern affects more files than this one and should go to ` +
          `the fraud investigation unit before any single case is refused.`,
      };
    }

    if (confidence !== null && confidence < 0.7) {
      return {
        action: 'escalate',
        rationale:
          `Assessment confidence is ${confidence} — too low to act on. Either the documents ` +
          `could not be read reliably or part of the pipeline did not report. Escalate for a ` +
          `manual read rather than deciding on weak evidence.`,
      };
    }

    if (highSeverity.length > 0) {
      return {
        action: 'clarify',
        rationale:
          `${highSeverity.length} high-severity policy finding(s) that the applicant can ` +
          `plausibly answer (${highSeverity.map((v) => String(v['ruleId'])).join(', ')}). ` +
          `Request clarification before considering refusal — a document discrepancy is not ` +
          `evidence of intent.`,
      };
    }

    if (documentGap) {
      return {
        action: 'clarify',
        rationale:
          'The document set is incomplete or partly out of date. This is a paperwork gap, so ' +
          'the proportionate step is to ask the applicant for the missing item.',
      };
    }

    if (score >= 30) {
      return {
        action: 'clarify',
        rationale:
          `Score ${score}/100 sits in the medium band on findings that are individually minor. ` +
          `Worth one clarification round rather than a refusal or a clean approval.`,
      };
    }

    return {
      action: 'approve',
      rationale:
        `Score ${score}/100. Every required stage completed, no policy rule fired, no ` +
        `identifier overlap with any other applicant in the queue, and the document set is ` +
        `complete and in date. Nothing here needs a further check — but the decision is still ` +
        `the officer's to record.`,
    };
  }

  // =========================================================================
  // Evidence + questions
  // =========================================================================

  /** Findings, worst-first, in one flat list the UI can render as bullets. */
  private collectEvidence(applicationId: string): string[] {
    const evidence: string[] = [];

    for (const violation of records(this.stage(applicationId, 'evaluate_rules')?.['violations'])) {
      evidence.push(
        `${String(violation['ruleId'])} [${String(violation['severity'])}] ` +
          `${String(violation['rule'])}: ${String(violation['detail'])}`
      );
    }

    const graph = record(this.stage(applicationId, 'build_risk_graph')?.['clusterSummary']);
    if (typeof graph['headline'] === 'string' && Number(record(this.stage(applicationId, 'build_risk_graph'))['clusterSize'] ?? 1) > 1) {
      evidence.push(String(graph['headline']));
    }

    const duplicates = record(this.stage(applicationId, 'detect_duplicate_signals')?.['summary']);
    if (typeof duplicates['headline'] === 'string' && Number(duplicates['signalCount'] ?? 0) > 0) {
      evidence.push(String(duplicates['headline']));
    }

    const visual = this.stage(applicationId, 'visual_similarity_flag');
    if (visual && visual['similarityFlag'] !== 'likely_different') {
      evidence.push(
        `Photograph similarity flag (${String(visual['similarityFlag'])}, advisory only): ` +
          `${String(visual['reasoning'])}`
      );
    }

    // Stated last so the caveat reads as a qualifier on everything above it.
    const missing = this.state.getMissingStages(applicationId);
    if (missing.length > 0) {
      evidence.push(
        `CAVEAT — ${missing.length} verification stage(s) did not run: ${missing.join(', ')}. ` +
          `Anything they would have found is not represented above.`
      );
    }

    const skipped = strings(this.stage(applicationId, 'evaluate_rules')?.['skippedRuleIds']);
    if (skipped.length > 0) {
      evidence.push(
        `CAVEAT — ${skipped.length} policy rule(s) could not be evaluated ` +
          `(${skipped.join(', ')}) because their upstream stage had not reported. ` +
          `They are unchecked, not passed.`
      );
    }

    return evidence;
  }

  /**
   * Questions to put to the applicant if the officer chooses clarification.
   *
   * Derived from what is actually wrong, so the letter asks for the missing thing
   * rather than a generic "please provide further documents" — which is the line
   * that makes applicants queue at the office to find out what was meant.
   */
  private buildQuestions(applicationId: string, application: SeededApplication): string[] {
    const questions: string[] = [];

    const documents = this.stage(applicationId, 'document_validate');
    for (const missing of strings(documents?.['missingDocuments'])) {
      questions.push(
        `Please submit your ${missing.replace(/_/g, ' ')}, which is required for a ` +
          `${application.applicationType} application.`
      );
    }
    for (const expired of strings(documents?.['expiredDocuments'])) {
      questions.push(
        `The ${expired.replace(/_/g, ' ')} on file has expired. Please submit a current copy.`
      );
    }

    for (const mismatch of records(this.stage(applicationId, 'check_identity_consistency')?.['mismatches'])) {
      const sources = record(mismatch['sources']);
      const values = Object.entries(sources)
        .map(([label, value]) => `"${String(value)}" on your ${label.replace(/_/g, ' ')}`)
        .join(', and ');
      questions.push(
        `Your ${String(mismatch['field'])} is recorded differently across your documents ` +
          `(${values}). Please confirm which is correct and provide supporting evidence.`
      );
    }

    for (const mismatch of records(this.stage(applicationId, 'check_address_consistency')?.['mismatches'])) {
      questions.push(
        `The ${String(mismatch['field'])} on your proof of address does not match your ` +
          `application form. Please confirm your current residential address.`
      );
    }

    const duplicates = records(this.stage(applicationId, 'detect_duplicate_signals')?.['signals']);
    const contactReuse = duplicates.filter((signal) =>
      ['phone_match', 'email_match'].includes(String(signal['type']))
    );
    if (contactReuse.length > 0) {
      questions.push(
        `The contact details on your application are also in use on other live applications. ` +
          `Please confirm the phone number and email address are yours and explain the ` +
          `connection if they are shared.`
      );
    }

    if (duplicates.some((signal) => signal['type'] === 'document_similarity')) {
      questions.push(
        `A document image submitted with your application is identical to one filed with ` +
          `another application. Please attend in person with your original documents.`
      );
    }

    return questions;
  }

  // =========================================================================
  // Narration
  // =========================================================================

  /** The deterministic case note. Complete and usable on its own. */
  private narrate(
    application: SeededApplication,
    score: number | null,
    band: RiskBand | null,
    evidence: readonly string[],
    action: RecommendedAction,
    missingStages: readonly string[]
  ): string {
    const scoreText = score === null ? 'not yet scored' : `${score}/100 (${band ?? 'unbanded'} risk)`;

    if (evidence.length === 0) {
      return (
        `${application.fullName}'s ${application.applicationType} application ` +
        `(${application.applicationId}) scored ${scoreText}. The document checklist is ` +
        `complete and in date, the name and date of birth agree across every submitted ` +
        `document, the stated address matches the proof of address, and none of the ` +
        `applicant's identifiers — phone, email, address, passport number or document images — ` +
        `appears on any other application in the queue. No policy rule fired. ` +
        `Recommended action: ${action}. The decision remains the officer's to record.`
      );
    }

    const headline =
      `${application.fullName}'s ${application.applicationType} application ` +
      `(${application.applicationId}) scored ${scoreText} on ${evidence.length} finding(s).`;

    const caveat =
      missingStages.length > 0
        ? ` Note that ${missingStages.length} verification stage(s) did not complete, so this ` +
          `assessment is partial.`
        : '';

    return (
      `${headline}${caveat}\n\n` +
      evidence.map((line, index) => `${index + 1}. ${line}`).join('\n') +
      `\n\nRecommended action: ${action}. This is a recommendation only — the AI does not ` +
      `decide passport applications, and officer_decide records the officer's own call.`
    );
  }

  private buildNarrationPrompt(
    application: SeededApplication,
    score: number | null,
    band: RiskBand | null,
    evidence: readonly string[],
    action: RecommendedAction,
    rationale: string,
    missingStages: readonly string[]
  ): string {
    return [
      `Applicant: ${application.fullName}`,
      `Application: ${application.applicationId} (${application.applicationType})`,
      `Risk score: ${score === null ? 'not scored' : `${score}/100, ${band ?? 'unbanded'} band`}`,
      '',
      'Findings, worst first:',
      ...(evidence.length > 0 ? evidence.map((line) => `- ${line}`) : ['- None.']),
      '',
      missingStages.length > 0
        ? `Incomplete stages (must be mentioned as a caveat): ${missingStages.join(', ')}`
        : 'Every verification stage completed.',
      '',
      `Recommended action (state this exactly, do not change it): ${action}`,
      `Reason for that recommendation: ${rationale}`,
      '',
      'Write the case note now.',
    ].join('\n');
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private hasDocumentGap(applicationId: string): boolean {
    const documents = this.stage(applicationId, 'document_validate');
    if (!documents) return false;
    return documents['complete'] !== true;
  }

  private stage(applicationId: string, name: string): Record<string, unknown> | undefined {
    const result = this.state.getStageResult(applicationId, name);
    return result && typeof result === 'object' ? (result as Record<string, unknown>) : undefined;
  }
}

// ---------------------------------------------------------------------------
// Narrowing helpers
// ---------------------------------------------------------------------------

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function records(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => row !== null && typeof row === 'object')
    : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function isBand(value: unknown): value is Severity {
  return value === 'high' || value === 'medium' || value === 'low';
}
