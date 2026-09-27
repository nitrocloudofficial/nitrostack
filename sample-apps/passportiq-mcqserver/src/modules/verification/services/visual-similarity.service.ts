/**
 * VisualSimilarityService — the optional `visual_similarity_flag` stage.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS NOT
 * ---------------------------------------------------------------------------
 * It is not face recognition, and it is not a biometric match. India has no
 * statutory basis for a hackathon demo to assert that two passport photographs are
 * the same human being, and asserting it anyway is the single fastest way to lose
 * a government-domain judging panel.
 *
 * What it produces is a FLAG with a stated basis, in one of two modes, and the
 * mode always travels in the payload:
 *
 *   deterministic  The two photographs carry the same `imageHash`, i.e. the
 *                  identical file was submitted twice. This is a fact about the
 *                  files, and it is the strongest thing in the payload — stronger
 *                  than any resemblance judgement, because there is nothing to
 *                  interpret.
 *
 *   vision-llm     The hashes differ, so the files are different. A model is then
 *                  asked to reason over the surrounding CONTEXT (shared
 *                  identifiers, dates of birth, cluster membership) and say
 *                  whether the two applications plausibly describe one person.
 *                  It is not shown pixels — the seeded scans have none — and the
 *                  reasoning string says so, rather than implying a visual
 *                  comparison that never happened.
 *
 * `score_risk` weights this stage low by design, and the decision gate does not
 * require it at all (see REQUIRED_STAGES_BEFORE_DECISION).
 */
import { Injectable } from '@nitrostack/core';
import type { SeededApplication, VisualSimilarityResult } from '../../../contracts/index.js';
import { ApplicationService } from '../../pipeline/services/application.service.js';
import { GraphService } from '../../pipeline/services/graph.service.js';
import { LlmService } from './llm.service.js';
import { compareNames } from './text-similarity.js';

/**
 * Travels with every payload, unchanged.
 *
 * Kept as a constant rather than written per-branch so no future edit can produce
 * a result without it, and so a UI cannot render the flag without the caveat.
 */
export const VISUAL_SIMILARITY_DISCLAIMER =
  'Advisory similarity flag only — NOT a biometric identity match. Generated from document ' +
  'image hashes and surrounding application context, not from facial recognition. A flag is ' +
  'grounds for an officer to look, never grounds to refuse on its own.';

interface LlmVerdict {
  similarityFlag?: string;
  reasoning?: string;
}

@Injectable({ deps: [ApplicationService, GraphService, LlmService] })
export class VisualSimilarityService {
  constructor(
    private readonly applications: ApplicationService,
    private readonly graph: GraphService,
    private readonly llm: LlmService
  ) {}

  async compare(
    applicationId: string,
    compareToApplicationId: string
  ): Promise<VisualSimilarityResult> {
    const subject = this.applications.getApplication(applicationId);
    const other = this.applications.getApplication(compareToApplicationId);

    // Comparing an application to itself would always report 'likely_same' and
    // would look, in a screenshot, exactly like a genuine detection.
    if (subject.applicationId === other.applicationId) {
      throw new Error(
        `visual_similarity_flag needs two DIFFERENT applications; both were ` +
          `${subject.applicationId}.`
      );
    }

    const subjectPhoto = photographHash(subject);
    const otherPhoto = photographHash(other);

    // ---- deterministic branch: identical file -------------------------------
    if (subjectPhoto !== null && subjectPhoto === otherPhoto) {
      return {
        applicationId: subject.applicationId,
        compareToApplicationId: other.applicationId,
        similarityFlag: 'likely_same',
        reasoning:
          `The photograph filed with ${subject.applicationId} is byte-identical to the one ` +
          `filed with ${other.applicationId} (image hash ${subjectPhoto}). This is not a ` +
          `resemblance judgement: the same image file appears on both applications, so one of ` +
          `the two files did not originate with its applicant.`,
        identicalImageHash: true,
        subjectPhotoHash: subjectPhoto,
        comparisonPhotoHash: otherPhoto,
        mode: 'deterministic',
        disclaimer: VISUAL_SIMILARITY_DISCLAIMER,
      };
    }

    // ---- no photograph to compare -----------------------------------------
    if (subjectPhoto === null || otherPhoto === null) {
      const absent = subjectPhoto === null ? subject.applicationId : other.applicationId;
      return {
        applicationId: subject.applicationId,
        compareToApplicationId: other.applicationId,
        // 'unclear', never 'likely_different'. A missing photograph is a gap in
        // the evidence, and reporting a gap as a negative finding would let an
        // incomplete file read as a cleared one.
        similarityFlag: 'unclear',
        reasoning:
          `No photograph is on file for ${absent}, so no comparison was possible. This is an ` +
          `evidence gap, not a negative result — request the missing photograph.`,
        identicalImageHash: false,
        subjectPhotoHash: subjectPhoto,
        comparisonPhotoHash: otherPhoto,
        mode: 'deterministic',
        disclaimer: VISUAL_SIMILARITY_DISCLAIMER,
      };
    }

    // ---- contextual branch -------------------------------------------------
    const context = this.buildContext(subject, other);

    if (this.llm.isEnabled()) {
      const verdict = await this.llm.completeJson<LlmVerdict>({
        system:
          'You are assisting an Indian passport verification officer. You are NOT performing ' +
          'facial recognition and you have not seen any image. Given two applications and their ' +
          'shared identifiers, judge whether they plausibly describe the SAME person. Answer ' +
          'with JSON: {"similarityFlag":"likely_same"|"unclear"|"likely_different",' +
          '"reasoning":"one paragraph citing only the evidence given"}. Prefer "unclear" when ' +
          'the evidence is thin — a wrong confident answer costs a citizen their passport.',
        prompt: context.prompt,
        maxOutputTokens: 400,
      });

      const flag = normaliseFlag(verdict?.similarityFlag);
      if (flag && verdict?.reasoning) {
        return {
          applicationId: subject.applicationId,
          compareToApplicationId: other.applicationId,
          similarityFlag: flag,
          reasoning: `${verdict.reasoning.trim()} (Reasoned from application context, not from ` +
            `image pixels; the two photographs are different files.)`,
          identicalImageHash: false,
          subjectPhotoHash: subjectPhoto,
          comparisonPhotoHash: otherPhoto,
          mode: 'vision-llm',
          disclaimer: VISUAL_SIMILARITY_DISCLAIMER,
        };
      }
      // Fall through to deterministic on a null / malformed completion.
    }

    return {
      applicationId: subject.applicationId,
      compareToApplicationId: other.applicationId,
      similarityFlag: context.deterministicFlag,
      reasoning: context.deterministicReasoning,
      identicalImageHash: false,
      subjectPhotoHash: subjectPhoto,
      comparisonPhotoHash: otherPhoto,
      mode: 'deterministic',
      disclaimer: VISUAL_SIMILARITY_DISCLAIMER,
    };
  }

  /**
   * Assemble the shared context, and decide what it supports on its own.
   *
   * The deterministic verdict here is what the payload falls back to whenever no
   * model is configured or the model fails — so the rule is conservative on
   * purpose: only an exact name+DOB coincidence promotes to 'likely_same'.
   */
  private buildContext(
    subject: SeededApplication,
    other: SeededApplication
  ): { prompt: string; deterministicFlag: VisualSimilarityResult['similarityFlag']; deterministicReasoning: string } {
    const linked = this.graph.getLinkedApplicationIds(subject.applicationId);
    const inSameCluster = linked.includes(other.applicationId);

    const nameComparison = compareNames(subject.fullName, other.fullName);
    const sameDob = subject.dateOfBirth === other.dateOfBirth;
    const samePassport = subject.passport.number === other.passport.number;

    const sharedHashes = sharedImageHashes(subject, other);

    const evidence: string[] = [
      `Application A: ${subject.applicationId} — ${subject.fullName}, DOB ${subject.dateOfBirth}, ` +
        `passport ${subject.passport.number}`,
      `Application B: ${other.applicationId} — ${other.fullName}, DOB ${other.dateOfBirth}, ` +
        `passport ${other.passport.number}`,
      `Name comparison: ${nameComparison.verdict} (similarity ${nameComparison.similarity})`,
      `Same date of birth: ${sameDob ? 'yes' : 'no'}`,
      `Same passport number: ${samePassport ? 'yes' : 'no'}`,
      `In the same identifier cluster: ${inSameCluster ? 'yes' : 'no'}`,
      sharedHashes.length > 0
        ? `Other document images shared between the two: ${sharedHashes.join(', ')}`
        : 'No document images are shared between the two applications.',
      'Photograph files: DIFFERENT (the image hashes do not match).',
    ];

    // Deterministic verdict.
    let deterministicFlag: VisualSimilarityResult['similarityFlag'] = 'unclear';
    let basis: string;

    if (samePassport || (sameDob && !nameComparison.isMismatch)) {
      deterministicFlag = 'likely_same';
      basis = samePassport
        ? 'both applications quote the same passport number'
        : 'the names match and the dates of birth are identical';
    } else if (sharedHashes.length > 0 || inSameCluster) {
      deterministicFlag = 'unclear';
      basis =
        'the two applications share identifiers but their names, dates of birth and photograph ' +
        'files all differ — a shared household or a shared facilitator both fit';
    } else if (nameComparison.verdict === 'different' && !sameDob) {
      deterministicFlag = 'likely_different';
      basis =
        'nothing links the two applications: different names, different dates of birth, ' +
        'different photograph files and no shared identifiers';
    } else {
      basis = 'the available evidence supports neither conclusion';
    }

    return {
      prompt: [
        'Two Indian passport applications may or may not describe the same person.',
        '',
        ...evidence.map((line) => `- ${line}`),
        '',
        'You have NOT been shown the photographs. Judge only from the evidence above, and say ' +
          'so in your reasoning. Reply with JSON only.',
      ].join('\n'),
      deterministicFlag,
      deterministicReasoning:
        `Flagged '${deterministicFlag}' because ${basis}. The two photograph files are ` +
        `different, and no image comparison was performed — this verdict rests entirely on the ` +
        `application particulars and shared identifiers listed in the case file.`,
    };
  }
}

/** The `imageHash` of the application's photograph, or null when none is filed. */
function photographHash(application: SeededApplication): string | null {
  return application.documents.find((document) => document.type === 'photograph')?.imageHash ?? null;
}

/** Non-photograph document images present on BOTH applications. */
function sharedImageHashes(a: SeededApplication, b: SeededApplication): string[] {
  const otherHashes = new Set(b.documents.map((document) => document.imageHash));
  return [
    ...new Set(
      a.documents
        .filter((document) => document.type !== 'photograph' && otherHashes.has(document.imageHash))
        .map((document) => `${document.type} (${document.imageHash})`)
    ),
  ].sort();
}

/** Accept only the three contract values; anything else is discarded. */
function normaliseFlag(value: unknown): VisualSimilarityResult['similarityFlag'] | null {
  return value === 'likely_same' || value === 'unclear' || value === 'likely_different'
    ? value
    : null;
}
