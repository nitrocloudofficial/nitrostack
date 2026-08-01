import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import {
  MAX_RESULTS,
  SIMULATED_NOTICE,
  getGuideline,
  getPatient,
  getStudies,
  getStudy,
  searchGuidelines,
  searchStudies,
  splitFindings,
} from './pacs.fixtures.js';
import { getDataSource, isSimulated } from './pacs.datasource.js';

/**
 * PACS bridge tools -- read-only context for the clinical agent.
 *
 * Every tool here RETRIEVES. None mutates state, runs inference, or
 * advances the clinical pipeline. That boundary is deliberate: MCP is a
 * data/context surface for external AI clients, not a remote control
 * plane for the clinical engine. Diagnosis stays inside the governed
 * LangGraph flow behind the human-in-the-loop interrupt and the
 * hash-chained audit log, where it can be reviewed and attributed --
 * exposing it as an RPC would route around all of that.
 *
 * Explicitly NOT here, and not to be added:
 *   - run_pipeline / analyze_xray / diagnose / run_perception
 *   - finalize_case / approve_report / save_notes / write_* / delete_*
 *   - anything loading, rebuilding, signing, or serving the FAISS index
 *
 * ---------------------------------------------------------------------
 * EVERY RECORD RETURNED IS SIMULATED (see pacs.fixtures.ts). Responses
 * carry dataSource, a notice, and per-record simulated:true.
 *
 * This server has NO authentication and sits on a public URL. That is
 * survivable only because the data is fabricated. DataSourceGuard
 * (pacs.datasource.ts) refuses to boot if that stops being true without
 * auth in place.
 * ---------------------------------------------------------------------
 *
 * Logging: ctx.logger only. stdout carries the JSON-RPC frames, so a
 * stray console.log corrupts the stream and kills the session.
 *
 * Missing IDs return a structured { found: false, ... } object rather
 * than throwing. A not-found lookup is an ordinary answer to a
 * reasonable question; a thrown error would read to the calling agent as
 * a broken tool and invites a retry loop.
 */

/** Stamped on every response so a payload is self-describing in a log. */
function envelope() {
  return {
    dataSource: getDataSource(),
    notice: SIMULATED_NOTICE,
    queriedAt: new Date().toISOString(),
  };
}

/** Shared PHI/auth caveat appended to every tool description. */
const PHI_NOTE =
  'PHI SENSITIVITY: returns patient-linked clinical data (simulated). Do not point this ' +
  'server at a real PACS until authentication is configured -- it is currently unauthenticated.';

export class PacsTools {
  // ───────────────────────────────────────────────────────────────────
  // Prior studies (original tool -- contract unchanged)
  // ───────────────────────────────────────────────────────────────────

  @Tool({
    name: 'query_prior_studies',
    description:
      'Query the hospital PACS archive for a patient\'s prior imaging studies. Returns DICOM ' +
      'study metadata (study date, modality, view position, and the prior report impression) ' +
      'ordered oldest to newest, for comparison against the current radiograph. NOTE: this ' +
      'server is backed by a simulated archive -- every study is marked simulated:true and must ' +
      'not be treated as real patient history. ' + PHI_NOTE,
    inputSchema: z.object({
      patientId: z
        .string()
        .min(1)
        .describe('Patient identifier to look up in the PACS archive, e.g. "P-80213-XX"'),
    }),
    examples: {
      request: { patientId: 'P-80213-XX' },
      response: { patientId: 'P-80213-XX', dataSource: 'SIMULATED', studyCount: 2, studies: [] },
    },
  })
  async queryPriorStudies(input: { patientId: string }, ctx: ExecutionContext) {
    const patientId = String(input.patientId ?? '').trim();
    ctx.logger.info('PACS prior-study query received', { patientId });

    if (!patientId) {
      ctx.logger.warn('PACS query rejected: empty patientId');
      throw new Error('patientId must be a non-empty string.');
    }

    const studies = getStudies(patientId);
    if (studies.length === 0) {
      ctx.logger.info('No prior studies on file for patient', { patientId });
    } else {
      ctx.logger.info('Returning prior studies', { patientId, studyCount: studies.length });
    }

    return { patientId, ...envelope(), studyCount: studies.length, studies };
  }

  // ───────────────────────────────────────────────────────────────────
  // Patient context
  // ───────────────────────────────────────────────────────────────────

  @Tool({
    name: 'get_patient_metadata',
    description:
      'Retrieve demographics and imaging context for a patient (age, sex, and the view ' +
      'positions seen across their prior studies), for comparison against a current study. ' +
      'Read-only. ' + PHI_NOTE,
    inputSchema: z.object({
      patientId: z.string().min(1).describe('Patient identifier, e.g. "P-80213-XX"'),
    }),
    examples: {
      request: { patientId: 'P-80213-XX' },
      response: { found: true, patientId: 'P-80213-XX', age: 54, sex: 'F' },
    },
  })
  async getPatientMetadata(input: { patientId: string }, ctx: ExecutionContext) {
    const patientId = String(input.patientId ?? '').trim();
    ctx.logger.info('Patient metadata lookup', { patientId });

    const patient = getPatient(patientId);
    if (!patient) {
      ctx.logger.info('No patient record on file', { patientId });
      return { found: false, patientId, ...envelope(), reason: 'No such patient in the archive.' };
    }

    const studies = getStudies(patientId);
    return {
      found: true,
      patientId: patient.patientId,
      age: patient.age,
      sex: patient.sex,
      // Distinct views across priors, plus per-study history: which
      // projection a prior used determines whether it is comparable at all.
      viewPositionHistory: [...new Set(studies.map((s) => s.viewPosition))],
      studyViewHistory: studies.map((s) => ({
        studyId: s.studyId, studyDate: s.studyDate, viewPosition: s.viewPosition,
      })),
      priorStudyCount: studies.length,
      simulated: patient.simulated,
      ...envelope(),
    };
  }

  @Tool({
    name: 'list_patient_studies_summary',
    description:
      'List a lightweight index of a patient\'s prior studies (studyId, date, modality, view ' +
      'position) without impression text, to pair with query_prior_studies or to pick studyIds ' +
      'for compare_studies. Read-only. ' + PHI_NOTE,
    inputSchema: z.object({
      patientId: z.string().min(1).describe('Patient identifier, e.g. "P-80213-XX"'),
    }),
    examples: {
      request: { patientId: 'P-80213-XX' },
      response: { found: true, studyCount: 2, studies: [{ studyId: 'ST-1001' }] },
    },
  })
  async listPatientStudiesSummary(input: { patientId: string }, ctx: ExecutionContext) {
    const patientId = String(input.patientId ?? '').trim();
    ctx.logger.info('Study summary index requested', { patientId });

    const studies = getStudies(patientId).slice(0, MAX_RESULTS);
    return {
      found: studies.length > 0,
      patientId,
      studyCount: studies.length,
      studies: studies.map((s) => ({
        studyId: s.studyId,
        studyDate: s.studyDate,
        modality: s.modality,
        viewPosition: s.viewPosition,
        simulated: s.simulated,
      })),
      ...envelope(),
    };
  }

  @Tool({
    name: 'search_studies_by_criteria',
    description:
      'Filter a patient\'s prior studies by modality, view position, and/or date range. ' +
      'Returns the same lightweight index as list_patient_studies_summary. Read-only. ' + PHI_NOTE,
    inputSchema: z.object({
      patientId: z.string().min(1).describe('Patient identifier, e.g. "P-80213-XX"'),
      modality: z.string().optional().describe('DICOM modality to match, e.g. "CR"'),
      view: z.string().optional().describe('View position to match: PA, AP, or LATERAL'),
      dateFrom: z.string().optional().describe('Earliest study date, inclusive (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Latest study date, inclusive (YYYY-MM-DD)'),
    }),
    examples: {
      request: { patientId: 'P-80213-XX', modality: 'CR', dateFrom: '2026-01-01' },
      response: { found: true, studyCount: 2, studies: [] },
    },
  })
  async searchStudiesByCriteria(
    input: { patientId: string; modality?: string; view?: string; dateFrom?: string; dateTo?: string },
    ctx: ExecutionContext,
  ) {
    const patientId = String(input.patientId ?? '').trim();
    const criteria = {
      modality: input.modality, view: input.view, dateFrom: input.dateFrom, dateTo: input.dateTo,
    };
    ctx.logger.info('Filtered study search', { patientId, ...criteria });

    const studies = searchStudies(patientId, criteria).slice(0, MAX_RESULTS);
    return {
      found: studies.length > 0,
      patientId,
      criteria,
      studyCount: studies.length,
      studies: studies.map((s) => ({
        studyId: s.studyId,
        studyDate: s.studyDate,
        modality: s.modality,
        viewPosition: s.viewPosition,
        simulated: s.simulated,
      })),
      ...envelope(),
    };
  }

  // ───────────────────────────────────────────────────────────────────
  // Single-study detail
  // ───────────────────────────────────────────────────────────────────

  @Tool({
    name: 'get_study_report_impression',
    description:
      'Retrieve the radiologist report impression text for one prior study, given a studyId ' +
      'from list_patient_studies_summary or query_prior_studies. Read-only. ' + PHI_NOTE,
    inputSchema: z.object({
      studyId: z.string().min(1).describe('Study identifier, e.g. "ST-1001"'),
    }),
    examples: {
      request: { studyId: 'ST-1001' },
      response: { found: true, studyId: 'ST-1001', reportImpression: '...' },
    },
  })
  async getStudyReportImpression(input: { studyId: string }, ctx: ExecutionContext) {
    const studyId = String(input.studyId ?? '').trim();
    ctx.logger.info('Report impression requested', { studyId });

    const study = getStudy(studyId);
    if (!study) {
      ctx.logger.info('No such study', { studyId });
      return { found: false, studyId, ...envelope(), reason: 'No such study in the archive.' };
    }

    return {
      found: true,
      studyId: study.studyId,
      patientId: study.patientId,
      studyDate: study.studyDate,
      reportImpression: study.reportImpression,
      reportedBy: study.reportedBy,
      simulated: study.simulated,
      ...envelope(),
    };
  }

  @Tool({
    name: 'get_study_metadata',
    description:
      'Retrieve fuller DICOM-style metadata for one study: acquisition parameters (kVp, ' +
      'exposure, tube current, detector), acquiring device, body part, and view position. ' +
      'Read-only. ' + PHI_NOTE,
    inputSchema: z.object({
      studyId: z.string().min(1).describe('Study identifier, e.g. "ST-1001"'),
    }),
    examples: {
      request: { studyId: 'ST-1001' },
      response: { found: true, studyId: 'ST-1001', modality: 'CR' },
    },
  })
  async getStudyMetadata(input: { studyId: string }, ctx: ExecutionContext) {
    const studyId = String(input.studyId ?? '').trim();
    ctx.logger.info('Study metadata requested', { studyId });

    const study = getStudy(studyId);
    if (!study) {
      ctx.logger.info('No such study', { studyId });
      return { found: false, studyId, ...envelope(), reason: 'No such study in the archive.' };
    }

    // Impression is deliberately omitted -- get_study_report_impression
    // owns that. Keeps each response minimal and the tools distinct.
    return {
      found: true,
      studyId: study.studyId,
      studyInstanceUid: study.studyInstanceUid,
      patientId: study.patientId,
      studyDate: study.studyDate,
      modality: study.modality,
      bodyPartExamined: study.bodyPartExamined,
      viewPosition: study.viewPosition,
      studyDescription: study.studyDescription,
      acquisition: study.acquisition,
      device: study.device,
      simulated: study.simulated,
      ...envelope(),
    };
  }

  // ───────────────────────────────────────────────────────────────────
  // Comparison
  // ───────────────────────────────────────────────────────────────────

  @Tool({
    name: 'compare_studies',
    description:
      'Compare the report impressions of two prior studies and return a structured diff of ' +
      'finding clauses: new (in B only), resolved (in A only), and unchanged (in both). This ' +
      'is a TEXT diff of what the two reports said, not an adjudicated clinical comparison -- ' +
      'a clinician confirms progression. Read-only. ' + PHI_NOTE,
    inputSchema: z.object({
      studyIdA: z.string().min(1).describe('Earlier study identifier, e.g. "ST-1001"'),
      studyIdB: z.string().min(1).describe('Later study identifier, e.g. "ST-1002"'),
    }),
    examples: {
      request: { studyIdA: 'ST-2001', studyIdB: 'ST-2002' },
      response: { found: true, newFindings: [], resolvedFindings: [], unchangedFindings: [] },
    },
  })
  async compareStudies(input: { studyIdA: string; studyIdB: string }, ctx: ExecutionContext) {
    const studyIdA = String(input.studyIdA ?? '').trim();
    const studyIdB = String(input.studyIdB ?? '').trim();
    ctx.logger.info('Study comparison requested', { studyIdA, studyIdB });

    const studyA = getStudy(studyIdA);
    const studyB = getStudy(studyIdB);

    const missing = [!studyA && studyIdA, !studyB && studyIdB].filter(Boolean);
    if (missing.length > 0) {
      ctx.logger.info('Comparison aborted: unknown studyId(s)', { missing });
      return {
        found: false, studyIdA, studyIdB, ...envelope(),
        reason: `No such study in the archive: ${missing.join(', ')}`,
      };
    }

    // Cross-patient comparison is refused rather than computed. Diffing
    // two different people's reports would produce a confident-looking
    // "new finding" list that is clinically meaningless.
    if (studyA!.patientId !== studyB!.patientId) {
      ctx.logger.warn('Comparison refused: studies belong to different patients', {
        studyIdA, studyIdB, patientA: studyA!.patientId, patientB: studyB!.patientId,
      });
      return {
        found: false, studyIdA, studyIdB, ...envelope(),
        reason:
          'Refusing to compare studies from different patients ' +
          `(${studyA!.patientId} vs ${studyB!.patientId}).`,
      };
    }

    const findingsA = splitFindings(studyA!.reportImpression);
    const findingsB = splitFindings(studyB!.reportImpression);
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const setA = new Set(findingsA.map(normalize));
    const setB = new Set(findingsB.map(normalize));

    // Chronology is reported, not assumed: if the caller passes them in
    // the wrong order, "new" would otherwise silently mean "resolved".
    const chronological = studyA!.studyDate <= studyB!.studyDate;

    return {
      found: true,
      patientId: studyA!.patientId,
      priorStudy: { studyId: studyA!.studyId, studyDate: studyA!.studyDate, impression: studyA!.reportImpression },
      laterStudy: { studyId: studyB!.studyId, studyDate: studyB!.studyDate, impression: studyB!.reportImpression },
      chronological,
      chronologyNote: chronological
        ? 'studyIdA precedes studyIdB; "new" means present in the later study.'
        : 'WARNING: studyIdA is LATER than studyIdB. The diff below is computed as given, so ' +
          '"new" and "resolved" are inverted relative to time.',
      newFindings: findingsB.filter((f) => !setA.has(normalize(f))),
      resolvedFindings: findingsA.filter((f) => !setB.has(normalize(f))),
      unchangedFindings: findingsB.filter((f) => setA.has(normalize(f))),
      comparisonMethod: 'clause-level text diff of report impressions (not clinical adjudication)',
      simulated: true,
      ...envelope(),
    };
  }

  // ───────────────────────────────────────────────────────────────────
  // Guidelines
  //
  // Fixture-backed. This does NOT touch the medagent FAISS index -- that
  // index is signed, lives on the Python side, and is never loaded,
  // rebuilt, re-signed, or served over MCP. Wiring real guidelines here
  // must go through a read-only export, never the signed index.
  // ───────────────────────────────────────────────────────────────────

  @Tool({
    name: 'search_clinical_guidelines',
    description:
      'Search the clinical guideline knowledge base by free text and return the top matching ' +
      'snippets with citations. Results are FIXTURES (source: FIXTURE_NOT_LIVE_GUIDELINES), not ' +
      'live guideline text, and must not be cited as clinical authority. Read-only retrieval: ' +
      'does not touch the signed vector index. PHI SENSITIVITY: none -- returns guideline text ' +
      'only, no patient data.',
    inputSchema: z.object({
      query: z.string().min(1).describe('Free-text clinical query, e.g. "pleural effusion assessment"'),
      topK: z.number().int().min(1).max(MAX_RESULTS).optional()
        .describe(`Maximum results to return (default 3, max ${MAX_RESULTS})`),
    }),
    examples: {
      request: { query: 'empiric antibiotics for pneumonia', topK: 2 },
      response: { resultCount: 2, results: [{ guidelineId: 'GL-CAP-001' }] },
    },
  })
  async searchClinicalGuidelines(input: { query: string; topK?: number }, ctx: ExecutionContext) {
    const query = String(input.query ?? '').trim();
    const topK = Math.min(input.topK ?? 3, MAX_RESULTS);
    ctx.logger.info('Guideline search', { query, topK });

    const hits = searchGuidelines(query, topK);
    return {
      query,
      topK,
      resultCount: hits.length,
      results: hits.map((g) => ({
        guidelineId: g.guidelineId,
        title: g.title,
        society: g.society,
        year: g.year,
        citation: g.citation,
        snippet: g.snippet,
        matchScore: g.matchScore,
        source: g.source,
        simulated: g.simulated,
      })),
      retrievalMethod: 'keyword overlap over fixtures (no vector index, no embeddings)',
      ...envelope(),
    };
  }

  @Tool({
    name: 'get_guideline_by_id',
    description:
      'Retrieve the full fixture text of one guideline returned by search_clinical_guidelines. ' +
      'Results are FIXTURES (source: FIXTURE_NOT_LIVE_GUIDELINES), not live guideline text, and ' +
      'must not be cited as clinical authority. Read-only. PHI SENSITIVITY: none -- guideline ' +
      'text only, no patient data.',
    inputSchema: z.object({
      guidelineId: z.string().min(1).describe('Guideline identifier, e.g. "GL-CAP-001"'),
    }),
    examples: {
      request: { guidelineId: 'GL-CAP-001' },
      response: { found: true, guidelineId: 'GL-CAP-001', fullText: '...' },
    },
  })
  async getGuidelineById(input: { guidelineId: string }, ctx: ExecutionContext) {
    const guidelineId = String(input.guidelineId ?? '').trim();
    ctx.logger.info('Guideline lookup', { guidelineId });

    const guideline = getGuideline(guidelineId);
    if (!guideline) {
      ctx.logger.info('No such guideline', { guidelineId });
      return {
        found: false, guidelineId, ...envelope(),
        reason: 'No such guideline in the fixture set.',
      };
    }

    return {
      found: true,
      guidelineId: guideline.guidelineId,
      title: guideline.title,
      society: guideline.society,
      year: guideline.year,
      citation: guideline.citation,
      fullText: guideline.fullText,
      source: guideline.source,
      simulated: guideline.simulated,
      ...envelope(),
    };
  }
}

// Referenced so the simulated-mode contract is explicit at module scope:
// in SIMULATED mode every tool above reads fixtures and nothing else.
export const SERVES_FIXTURES_ONLY = isSimulated();
