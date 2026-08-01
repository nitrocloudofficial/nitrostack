/**
 * Shared simulated PACS dataset -- the single source every PACS tool
 * reads from.
 *
 * WHY ONE STORE: the tools cross-reference each other. A studyId handed
 * out by list_patient_studies_summary has to resolve in
 * get_study_report_impression and compare_studies. When each tool owned
 * its own fixtures those IDs drifted apart and the tools silently
 * disagreed about the same patient -- which, on a clinical surface, is
 * worse than having no data at all.
 *
 * ---------------------------------------------------------------------
 * EVERY RECORD HERE IS FABRICATED. There is no PACS and no guideline
 * index behind this file. Records carry `simulated: true`, guideline
 * records additionally carry source: 'FIXTURE_NOT_LIVE_GUIDELINES', and
 * every tool response repeats the marker at the top level. Prior imaging
 * and guideline citations are both read as authority: rendered next to a
 * real radiograph, invented history is indistinguishable from the real
 * record at a glance.
 * ---------------------------------------------------------------------
 *
 * Deterministic by construction: static literals, no randomness, no
 * clock-dependent values. Same input always yields the same output, so
 * demos and tests are stable.
 *
 * Pure in-memory lookups -- no I/O, no network, no DB. The arrays below
 * are built once at module load; handlers only filter them. That is what
 * keeps every call effectively instant, and why no cache is warranted.
 */

export type Sex = 'M' | 'F' | 'O';
export type ViewPosition = 'PA' | 'AP' | 'LATERAL';

export interface PatientRecord {
  patientId: string;
  age: number;
  sex: Sex;
  simulated: true;
}

export interface StudyRecord {
  studyId: string;            // short handle used across tools
  studyInstanceUid: string;   // DICOM (0020,000D)
  patientId: string;
  studyDate: string;          // YYYY-MM-DD
  modality: string;           // (0008,0060)
  bodyPartExamined: string;   // (0018,0015)
  viewPosition: ViewPosition; // (0018,5101)
  studyDescription: string;
  reportImpression: string;
  reportedBy: string;
  /** Fuller DICOM-ish detail, surfaced by get_study_metadata. */
  acquisition: {
    kvp: number;
    exposureTimeMs: number;
    xRayTubeCurrentMa: number;
    detectorType: string;
  };
  device: {
    manufacturer: string;
    modelName: string;
    stationName: string;
    softwareVersion: string;
  };
  simulated: true;
}

export interface GuidelineRecord {
  guidelineId: string;
  title: string;
  society: string;
  year: number;
  citation: string;
  /** Short passage returned by search; full text via get_guideline_by_id. */
  snippet: string;
  fullText: string;
  keywords: string[];
  source: 'FIXTURE_NOT_LIVE_GUIDELINES';
  simulated: true;
}

/** Repeated verbatim on every tool response. */
export const SIMULATED_NOTICE =
  'SIMULATED DATA -- fixtures from a stand-in PACS, not real patient records or live ' +
  'clinical guidelines. Do not use for clinical decision-making.';

// ─────────────────────────────────────────────────────────────────────
// Patients
// ─────────────────────────────────────────────────────────────────────

const PATIENTS: PatientRecord[] = [
  { patientId: 'P-80213-XX', age: 54, sex: 'F', simulated: true },
  { patientId: 'P-44190-KL', age: 71, sex: 'M', simulated: true },
  { patientId: 'P-10577-QT', age: 33, sex: 'F', simulated: true },
];

// ─────────────────────────────────────────────────────────────────────
// Studies
//
// P-80213-XX's two studies are byte-for-byte the ones query_prior_studies
// has always returned (same UIDs, dates, and impressions). They are
// pinned: the Python integration suite asserts against these exact
// values, and changing them here would break that contract silently.
// ─────────────────────────────────────────────────────────────────────

const STUDIES: StudyRecord[] = [
  {
    studyId: 'ST-1001',
    studyInstanceUid: '1.2.826.0.1.3680043.8.498.10001',
    patientId: 'P-80213-XX',
    studyDate: '2026-01-09',
    modality: 'CR',
    bodyPartExamined: 'CHEST',
    viewPosition: 'PA',
    studyDescription: 'Chest radiograph, routine pre-operative screening',
    reportImpression: 'No acute cardiopulmonary process. Lungs clear bilaterally.',
    reportedBy: 'SIMULATED-RADIOLOGIST',
    acquisition: { kvp: 120, exposureTimeMs: 8, xRayTubeCurrentMa: 320, detectorType: 'FLAT_PANEL' },
    device: {
      manufacturer: 'SIMULATED Imaging Systems',
      modelName: 'FixtureRad 500',
      stationName: 'SIM-CR-01',
      softwareVersion: '0.0.0-fixture',
    },
    simulated: true,
  },
  {
    studyId: 'ST-1002',
    studyInstanceUid: '1.2.826.0.1.3680043.8.498.10002',
    patientId: 'P-80213-XX',
    studyDate: '2026-07-02',
    modality: 'CR',
    bodyPartExamined: 'CHEST',
    viewPosition: 'AP',
    studyDescription: 'Chest radiograph, productive cough',
    reportImpression:
      'Mild haziness at the right lung base, nonspecific. No confirmed consolidation at this ' +
      'time. Recommend clinical correlation and follow-up imaging if symptoms persist.',
    reportedBy: 'SIMULATED-RADIOLOGIST',
    acquisition: { kvp: 110, exposureTimeMs: 10, xRayTubeCurrentMa: 280, detectorType: 'FLAT_PANEL' },
    device: {
      manufacturer: 'SIMULATED Imaging Systems',
      modelName: 'FixtureRad 500',
      stationName: 'SIM-CR-02',
      softwareVersion: '0.0.0-fixture',
    },
    simulated: true,
  },
  {
    studyId: 'ST-2001',
    studyInstanceUid: '1.2.826.0.1.3680043.8.498.20001',
    patientId: 'P-44190-KL',
    studyDate: '2025-11-14',
    modality: 'CR',
    bodyPartExamined: 'CHEST',
    viewPosition: 'PA',
    studyDescription: 'Chest radiograph, dyspnoea on exertion',
    reportImpression:
      'Cardiomegaly with mild pulmonary vascular congestion. Small left pleural effusion. ' +
      'No focal consolidation.',
    reportedBy: 'SIMULATED-RADIOLOGIST',
    acquisition: { kvp: 125, exposureTimeMs: 7, xRayTubeCurrentMa: 340, detectorType: 'FLAT_PANEL' },
    device: {
      manufacturer: 'SIMULATED Imaging Systems',
      modelName: 'FixtureRad 700',
      stationName: 'SIM-CR-03',
      softwareVersion: '0.0.0-fixture',
    },
    simulated: true,
  },
  {
    studyId: 'ST-2002',
    studyInstanceUid: '1.2.826.0.1.3680043.8.498.20002',
    patientId: 'P-44190-KL',
    studyDate: '2026-05-30',
    modality: 'CR',
    bodyPartExamined: 'CHEST',
    viewPosition: 'AP',
    studyDescription: 'Chest radiograph, follow-up',
    reportImpression:
      'Cardiomegaly unchanged. Left pleural effusion has resolved. New right lower lobe ' +
      'consolidation consistent with pneumonia.',
    reportedBy: 'SIMULATED-RADIOLOGIST',
    acquisition: { kvp: 115, exposureTimeMs: 9, xRayTubeCurrentMa: 300, detectorType: 'FLAT_PANEL' },
    device: {
      manufacturer: 'SIMULATED Imaging Systems',
      modelName: 'FixtureRad 700',
      stationName: 'SIM-CR-03',
      softwareVersion: '0.0.0-fixture',
    },
    simulated: true,
  },
  {
    studyId: 'ST-3001',
    studyInstanceUid: '1.2.826.0.1.3680043.8.498.30001',
    patientId: 'P-10577-QT',
    studyDate: '2026-03-21',
    modality: 'CR',
    bodyPartExamined: 'CHEST',
    viewPosition: 'LATERAL',
    studyDescription: 'Chest radiograph, atypical chest pain',
    reportImpression: 'Normal chest radiograph. No acute abnormality.',
    reportedBy: 'SIMULATED-RADIOLOGIST',
    acquisition: { kvp: 118, exposureTimeMs: 8, xRayTubeCurrentMa: 310, detectorType: 'FLAT_PANEL' },
    device: {
      manufacturer: 'SIMULATED Imaging Systems',
      modelName: 'FixtureRad 500',
      stationName: 'SIM-CR-01',
      softwareVersion: '0.0.0-fixture',
    },
    simulated: true,
  },
];

// ─────────────────────────────────────────────────────────────────────
// Guidelines
//
// NOT the medagent FAISS index. That index is signed, lives on the Python
// side, and is never loaded, rebuilt, re-signed, or served over MCP.
// These are short stand-in passages written for this fixture server. When
// real guidelines are wired in they must come from a read-only export,
// never the signed index.
// ─────────────────────────────────────────────────────────────────────

const GUIDELINES: GuidelineRecord[] = [
  {
    guidelineId: 'GL-CAP-001',
    title: 'Empiric antibiotic therapy in community-acquired pneumonia',
    society: 'SIMULATED-ATS/IDSA',
    year: 2019,
    citation: 'SIMULATED-ATS/IDSA CAP Guideline (2019), §Empiric Therapy',
    snippet:
      'Empiric antibiotic therapy for community-acquired pneumonia should be guided by severity ' +
      'assessment and local resistance patterns.',
    fullText:
      'Empiric antibiotic therapy for community-acquired pneumonia should be guided by severity ' +
      'assessment and local resistance patterns. For outpatient-managed, low-severity disease, ' +
      'amoxicillin is first-line in most settings. Patients with high-severity disease or signs ' +
      'of sepsis should be assessed for ICU admission and started on combination therapy that ' +
      'covers atypical organisms. Therapy should be reviewed against culture results once ' +
      'available. [SIMULATED PASSAGE -- not the published guideline text.]',
    keywords: ['pneumonia', 'antibiotic', 'empiric', 'therapy', 'cap', 'severity', 'consolidation'],
    source: 'FIXTURE_NOT_LIVE_GUIDELINES',
    simulated: true,
  },
  {
    guidelineId: 'GL-CAP-002',
    title: 'Radiographic findings supporting a pneumonia diagnosis',
    society: 'SIMULATED-ATS/IDSA',
    year: 2019,
    citation: 'SIMULATED-ATS/IDSA CAP Guideline (2019), §Diagnostic Imaging',
    snippet:
      'Focal consolidation with air bronchograms in a dependent lobe supports a bacterial ' +
      'pneumonia diagnosis when correlated clinically.',
    fullText:
      'Focal consolidation with air bronchograms in a dependent lobe supports a bacterial ' +
      'pneumonia diagnosis when correlated clinically. Radiographic findings alone are not ' +
      'diagnostic: consolidation may lag clinical presentation and can persist after clinical ' +
      'resolution. Follow-up imaging is recommended where symptoms do not resolve as expected. ' +
      '[SIMULATED PASSAGE -- not the published guideline text.]',
    keywords: ['consolidation', 'radiograph', 'imaging', 'pneumonia', 'air bronchogram', 'diagnosis'],
    source: 'FIXTURE_NOT_LIVE_GUIDELINES',
    simulated: true,
  },
  {
    guidelineId: 'GL-EFF-001',
    title: 'Assessment of pleural effusion on chest radiography',
    society: 'SIMULATED-ACR',
    year: 2021,
    citation: 'SIMULATED-ACR Appropriateness Criteria (2021), §Pleural Effusion',
    snippet:
      'Blunting of the costophrenic angle is the earliest radiographic sign of pleural effusion ' +
      'on an upright projection.',
    fullText:
      'Blunting of the costophrenic angle is the earliest radiographic sign of pleural effusion ' +
      'on an upright projection; roughly 200 mL is required before it becomes apparent on a PA ' +
      'view. Lateral decubitus imaging or ultrasound is more sensitive for small effusions and ' +
      'is preferred when the clinical suspicion is high despite a normal frontal radiograph. ' +
      '[SIMULATED PASSAGE -- not the published guideline text.]',
    keywords: ['effusion', 'pleural', 'costophrenic', 'radiograph', 'decubitus', 'ultrasound'],
    source: 'FIXTURE_NOT_LIVE_GUIDELINES',
    simulated: true,
  },
  {
    guidelineId: 'GL-HW-001',
    title: 'External hardware as a confounder on chest radiography',
    society: 'SIMULATED-ACR',
    year: 2021,
    citation: 'SIMULATED-ACR Appropriateness Criteria (2021), §Technical Confounders',
    snippet:
      'ECG leads, pacemakers, lines, and clothing artefact project as dense opacities and are a ' +
      'common source of false-positive opacity findings.',
    fullText:
      'ECG leads, pacemakers, central lines, surgical clips, telemetry buttons, and clothing ' +
      'artefact project as dense opacities and are a common source of false-positive opacity ' +
      'findings, particularly for automated analysis. Correlate any suspected focal opacity ' +
      'against the visible hardware before reporting. An opacity may be both genuine and ' +
      'overlapped by hardware; hardware alone does not exclude disease. ' +
      '[SIMULATED PASSAGE -- not the published guideline text.]',
    keywords: ['hardware', 'ecg', 'pacemaker', 'artefact', 'false positive', 'opacity', 'lead'],
    source: 'FIXTURE_NOT_LIVE_GUIDELINES',
    simulated: true,
  },
  {
    guidelineId: 'GL-CARD-001',
    title: 'Cardiothoracic ratio and the assessment of cardiomegaly',
    society: 'SIMULATED-ACR',
    year: 2020,
    citation: 'SIMULATED-ACR Appropriateness Criteria (2020), §Cardiac Silhouette',
    snippet:
      'A cardiothoracic ratio above 0.50 on an upright PA radiograph suggests cardiomegaly, but ' +
      'is unreliable on AP or rotated projections.',
    fullText:
      'A cardiothoracic ratio above 0.50 on an upright PA radiograph suggests cardiomegaly. The ' +
      'measurement is unreliable on AP or rotated projections, where magnification inflates the ' +
      'cardiac silhouette. Borderline values in isolation frequently reflect technique rather ' +
      'than true cardiac enlargement; correlate with echocardiography where it matters ' +
      'clinically. [SIMULATED PASSAGE -- not the published guideline text.]',
    keywords: ['cardiomegaly', 'cardiothoracic', 'ratio', 'cardiac', 'silhouette', 'echocardiography'],
    source: 'FIXTURE_NOT_LIVE_GUIDELINES',
    simulated: true,
  },
];

// ─────────────────────────────────────────────────────────────────────
// Lookups -- centralized so the tools stay thin
// ─────────────────────────────────────────────────────────────────────

/** Indexed once at module load; handlers never rebuild these. */
const PATIENTS_BY_ID = new Map(PATIENTS.map((p) => [p.patientId, p]));
const STUDIES_BY_ID = new Map(STUDIES.map((s) => [s.studyId, s]));
const GUIDELINES_BY_ID = new Map(GUIDELINES.map((g) => [g.guidelineId, g]));

/** Hard ceiling on any list-returning tool, so a response cannot balloon. */
export const MAX_RESULTS = 50;

export function getPatient(patientId: string): PatientRecord | undefined {
  return PATIENTS_BY_ID.get(patientId.trim());
}

/** A patient's studies, oldest first -- the order a progression reads in. */
export function getStudies(patientId: string): StudyRecord[] {
  return STUDIES
    .filter((s) => s.patientId === patientId.trim())
    .sort((a, b) => a.studyDate.localeCompare(b.studyDate));
}

export function getStudy(studyId: string): StudyRecord | undefined {
  return STUDIES_BY_ID.get(studyId.trim());
}

export function getGuideline(guidelineId: string): GuidelineRecord | undefined {
  return GUIDELINES_BY_ID.get(guidelineId.trim());
}

export interface StudyCriteria {
  modality?: string;
  view?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Filtered study lookup. Absent criteria are simply not applied. */
export function searchStudies(patientId: string, criteria: StudyCriteria = {}): StudyRecord[] {
  return getStudies(patientId).filter((study) => {
    if (criteria.modality && study.modality.toUpperCase() !== criteria.modality.trim().toUpperCase()) return false;
    if (criteria.view && study.viewPosition.toUpperCase() !== criteria.view.trim().toUpperCase()) return false;
    if (criteria.dateFrom && study.studyDate < criteria.dateFrom.trim()) return false;
    if (criteria.dateTo && study.studyDate > criteria.dateTo.trim()) return false;
    return true;
  });
}

/**
 * Keyword-overlap search over the fixture guidelines.
 *
 * Deliberately a simple scored term match, NOT a vector search: this
 * server has no embedding model and no index, and pretending otherwise
 * would imply retrieval quality that is not there. Ranked by how many
 * query terms hit a record's keywords/title/snippet.
 */
export function searchGuidelines(query: string, topK: number): Array<GuidelineRecord & { matchScore: number }> {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  if (terms.length === 0) return [];

  return GUIDELINES
    .map((g) => {
      const haystack = `${g.title} ${g.snippet} ${g.keywords.join(' ')}`.toLowerCase();
      const matchScore = terms.reduce((score, term) => (haystack.includes(term) ? score + 1 : score), 0);
      return { ...g, matchScore };
    })
    .filter((g) => g.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.guidelineId.localeCompare(b.guidelineId))
    .slice(0, Math.min(topK, MAX_RESULTS));
}

/**
 * Splits an impression into comparable finding clauses.
 *
 * Sentence/clause splitting, not clinical NLP -- compare_studies presents
 * the result as "text that changed between reports", never as an
 * adjudicated clinical delta.
 */
export function splitFindings(impression: string): string[] {
  return impression
    .split(/(?<=\.)\s+|;\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export const FIXTURE_STATS = {
  patients: PATIENTS.length,
  studies: STUDIES.length,
  guidelines: GUIDELINES.length,
};
