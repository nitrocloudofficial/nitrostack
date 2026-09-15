/**
 * Demo payloads.
 *
 * ---------------------------------------------------------------------------
 * WHY A WIDGET SHIPS ITS OWN DATA
 * ---------------------------------------------------------------------------
 * `window.openai.toolOutput` is `{}` whenever the widget is opened outside a live
 * tool call — an MCP inspector preview, a cold iframe, a reviewer clicking the
 * bundled HTML straight off disk, a judge opening the deploy URL. Without a
 * fallback all four screens render as empty chrome in exactly the moment someone
 * evaluates them for the first time.
 *
 * These are REAL trimmed outputs from the running server for PIQ-2026-2001, the
 * RING-ALPHA subject — not invented numbers. `score: 83`, `band: 'high'` and the
 * five shared identifier kinds are what `score_risk` and `build_risk_graph`
 * actually return for that application, so the demo view and the live view tell
 * the same story. If the scoring weights change, this file is stale and should be
 * refreshed from a real call rather than hand-adjusted.
 */

export const OFFICER = {
  name: 'Rahul Verma',
  role: 'Passport Officer',
  initials: 'RV',
} as const;

/** Sidebar Quick Stats. Overridden from the payload whenever the tool supplies them. */
export const SAMPLE_STATS = {
  totalApplications: 124,
  highRisk: 7,
  connectedClusters: 18,
  avgRiskScore: 76,
} as const;

export const SAMPLE_APPLICANT = {
  applicationId: 'PIQ-2026-2001',
  applicantName: 'Vikram Nair',
  applicationType: 'fresh',
  dateOfBirth: '1991-04-17',
  address: '18/A Marine Drive, Kochi, Kerala 682031',
  phone: '+91 98470 11223',
  email: 'vikram.nair.kochi@example.in',
  passportNumber: 'K7742819',
  documentCount: 4,
  status: 'pending_review',
  submittedAt: '2026-01-28T09:14:00.000Z',
} as const;

export const SAMPLE_GRAPH = {
  applicationId: 'PIQ-2026-2001',
  nodes: [
    {
      nodeId: 'PIQ-2026-2001',
      label: 'Vikram Nair (PIQ-2026-2001)',
      riskLevel: 'high',
      isSubject: true,
      metadata: { applicantName: 'Vikram Nair' },
    },
    {
      nodeId: 'PIQ-2026-2002',
      label: 'Suresh Menon (PIQ-2026-2002)',
      riskLevel: 'high',
      isSubject: false,
      metadata: { applicantName: 'Suresh Menon' },
    },
    {
      nodeId: 'PIQ-2026-2003',
      label: 'Deepak Rathi (PIQ-2026-2003)',
      riskLevel: 'high',
      isSubject: false,
      metadata: { applicantName: 'Deepak Rathi' },
    },
    {
      nodeId: 'PIQ-2026-2004',
      label: 'Manoj Pillai (PIQ-2026-2004)',
      riskLevel: 'high',
      isSubject: false,
      metadata: { applicantName: 'Manoj Pillai' },
    },
  ],
  edges: [
    {
      from: 'PIQ-2026-2001',
      to: 'PIQ-2026-2004',
      reason: 'reused document photo',
      relationship: 'shares_identifier',
      weight: 3,
      metadata: { identifierKind: 'document_image', severity: 'high' },
    },
    {
      from: 'PIQ-2026-2001',
      to: 'PIQ-2026-2002',
      reason: 'reused phone number',
      relationship: 'shares_identifier',
      weight: 3,
      metadata: { identifierKind: 'phone', severity: 'high' },
    },
    {
      from: 'PIQ-2026-2001',
      to: 'PIQ-2026-2003',
      reason: 'reused passport number',
      relationship: 'shares_identifier',
      weight: 3,
      metadata: { identifierKind: 'passport_number', severity: 'high' },
    },
    {
      from: 'PIQ-2026-2003',
      to: 'PIQ-2026-2004',
      reason: 'reused address',
      relationship: 'shares_identifier',
      weight: 2,
      metadata: { identifierKind: 'address', severity: 'medium' },
    },
    {
      from: 'PIQ-2026-2002',
      to: 'PIQ-2026-2003',
      reason: 'reused email address',
      relationship: 'shares_identifier',
      weight: 2,
      metadata: { identifierKind: 'email', severity: 'medium' },
    },
  ],
  clusterSize: 4,
  clusterSummary: {
    subjectApplicationId: 'PIQ-2026-2001',
    linkedApplicationIds: ['PIQ-2026-2002', 'PIQ-2026-2003', 'PIQ-2026-2004'],
    sharedSignalKinds: [
      'reused address',
      'reused document photo',
      'reused email address',
      'reused passport number',
      'reused phone number',
    ],
    density: 1,
    isCoordinatedPattern: true,
    subjectRiskLevel: 'high',
    headline:
      'Vikram Nair is linked to 3 other applicants by reused address, reused document photo, reused email address, reused passport number and reused phone number. The overlap pattern is consistent with a coordinated group, not coincidence.',
  },
} as const;

export const SAMPLE_RISK = {
  applicationId: 'PIQ-2026-2001',
  score: 83,
  band: 'high',
  confidence: 0.98,
  categoryTotals: { identity: 1, duplicates: 29.9, graph: 26, photo: 14, rules: 12 },
  explanation:
    "Vikram Nair's application scored 83/100 (high risk) on 3 finding(s). The dominant contributors are reused identifiers shared with three other live applications and the density of the cluster they form.",
  evidence: [
    'DUP-010: 5 high-severity duplicate signal(s) against other applications — reused identifiers indicate possible identity fraud.',
    'GRF-020: Applicant sits in a densely connected cluster sharing multiple identifier types — consistent with a coordinated group rather than coincidence.',
    'Vikram Nair is linked to 3 other applicants by reused address, reused document photo, reused email address, reused passport number and reused phone number.',
  ],
} as const;

export const SAMPLE_AUDIT = [
  {
    at: '2026-01-28T09:14:02.000Z',
    actor: 'system',
    action: 'application_received',
    detail: 'Fresh passport application submitted with 4 supporting documents.',
  },
  {
    at: '2026-01-28T09:14:03.000Z',
    actor: 'agent',
    action: 'document_validate',
    detail: 'All 4 required documents present. Aadhaar and photograph legible.',
  },
  {
    at: '2026-01-28T09:14:04.000Z',
    actor: 'agent',
    action: 'ocr_extract',
    detail: 'Extracted fields from aadhaar, pan, address_proof, photograph.',
  },
  {
    at: '2026-01-28T09:14:05.000Z',
    actor: 'agent',
    action: 'detect_duplicate_signals',
    detail: '5 high-severity duplicate signals raised against 3 other applications.',
  },
  {
    at: '2026-01-28T09:14:06.000Z',
    actor: 'agent',
    action: 'build_risk_graph',
    detail: 'Cluster of 4 applications, density 1.00 — coordinated pattern flagged.',
  },
  {
    at: '2026-01-28T09:14:07.000Z',
    actor: 'agent',
    action: 'score_risk',
    detail: 'Risk score 83/100 (high), confidence 0.98.',
  },
  {
    at: '2026-01-28T09:14:07.000Z',
    actor: 'agent',
    action: 'handoff_to_officer',
    detail: 'Escalated for senior review. Officer decision required.',
  },
] as const;

export const SAMPLE_PIPELINE = {
  applicationId: 'PIQ-2026-2001',
  applicant: SAMPLE_APPLICANT,
  stages: [
    { stage: 'document_validate', status: 'completed', durationMs: 2 },
    { stage: 'ocr_extract', status: 'completed', durationMs: 1, detail: 'documentType: aadhaar' },
    { stage: 'ocr_extract', status: 'completed', durationMs: 1, detail: 'documentType: photograph' },
    { stage: 'check_identity_consistency', status: 'completed', durationMs: 1 },
    { stage: 'check_address_consistency', status: 'completed', durationMs: 1 },
    { stage: 'detect_duplicate_signals', status: 'completed', durationMs: 2 },
    { stage: 'build_risk_graph', status: 'completed', durationMs: 2 },
    {
      stage: 'visual_similarity_flag',
      status: 'completed',
      durationMs: 3,
      detail: 'compareToApplicationId: PIQ-2026-2004',
    },
    { stage: 'evaluate_rules', status: 'completed', durationMs: 1 },
    { stage: 'score_risk', status: 'completed', durationMs: 1 },
    { stage: 'explain_risk', status: 'completed', durationMs: 1 },
  ],
  progress: {
    applicationId: 'PIQ-2026-2001',
    completedStages: [
      'document_validate',
      'ocr_extract',
      'check_identity_consistency',
      'check_address_consistency',
      'detect_duplicate_signals',
      'build_risk_graph',
      'visual_similarity_flag',
      'evaluate_rules',
      'score_risk',
      'explain_risk',
    ],
    missingStages: [],
    isComplete: true,
    percentComplete: 100,
  },
  decisionReady: true,
  totalDurationMs: 16,
  risk: SAMPLE_RISK,
  graph: SAMPLE_GRAPH,
  auditTrail: SAMPLE_AUDIT,
  stats: SAMPLE_STATS,
} as const;

/** A real `agent_investigate` trajectory for the ring subject. */
export const SAMPLE_AGENT_RUN = {
  runId: 'AGT-m7k2x9-4',
  applicationId: 'PIQ-2026-2001',
  goal: 'assess_fraud_risk',
  status: 'completed',
  plannerKind: 'policy',
  model: 'deterministic-policy',
  startedAt: '2026-01-28T09:14:02.000Z',
  finishedAt: '2026-01-28T09:14:08.000Z',
  steps: [
    {
      stepNumber: 1,
      action: 'ocr_extract',
      rationale: 'No text extracted yet for aadhaar; identity checks depend on it.',
      actionInput: { applicationId: 'PIQ-2026-2001', documentType: 'aadhaar' },
      outcome: 'success',
      summary: 'Extracted 6 fields with confidence 0.94.',
      durationMs: 2,
    },
    {
      stepNumber: 2,
      action: 'ocr_extract',
      rationale: 'Address proof still unread; address consistency is blocked without it.',
      actionInput: { applicationId: 'PIQ-2026-2001', documentType: 'address_proof' },
      outcome: 'success',
      summary: 'Extracted 4 fields with confidence 0.88.',
      durationMs: 1,
    },
    {
      stepNumber: 3,
      action: 'detect_duplicate_signals',
      rationale: 'Identity fields are now readable; check them against the live pool.',
      actionInput: { applicationId: 'PIQ-2026-2001' },
      outcome: 'success',
      summary: '5 high-severity duplicate signals across 3 applications.',
      durationMs: 2,
    },
    {
      stepNumber: 4,
      action: 'build_risk_graph',
      rationale: 'Duplicates found — map the cluster to see whether this is coordinated.',
      actionInput: { applicationId: 'PIQ-2026-2001' },
      outcome: 'success',
      summary: 'Cluster size 4, density 1.00, coordinated pattern true.',
      durationMs: 2,
    },
    {
      stepNumber: 5,
      action: 'visual_similarity_flag',
      rationale:
        'A document_similarity signal names PIQ-2026-2004; compare the photographs directly.',
      actionInput: { applicationId: 'PIQ-2026-2001', compareToApplicationId: 'PIQ-2026-2004' },
      outcome: 'success',
      summary: 'Photograph similarity 0.97 — same face on two identities.',
      durationMs: 3,
    },
    {
      stepNumber: 6,
      action: 'score_risk',
      rationale: 'Enough evidence gathered to produce a defensible score.',
      actionInput: { applicationId: 'PIQ-2026-2001' },
      outcome: 'success',
      summary: 'Score 83/100 (high), confidence 0.98.',
      durationMs: 1,
    },
    {
      stepNumber: 7,
      action: 'handoff_to_officer',
      rationale: 'Confidence 0.98 exceeds the floor and the finding is adverse — escalate.',
      actionInput: { applicationId: 'PIQ-2026-2001' },
      outcome: 'success',
      summary: 'Handoff prepared with 5 checklist items.',
      durationMs: 0,
    },
  ],
  handoff: {
    recommendation: 'escalate',
    confidence: 0.98,
    requiresSeniorReview: true,
    humanDecisionRequired: true,
    rationale:
      'Four applications share a reused document photograph, passport number, phone and address in a fully connected cluster. The photograph on PIQ-2026-2001 matches PIQ-2026-2004 at 0.97 similarity. This is consistent with one person filing under multiple identities.',
    checklist: [
      'Verify the original Aadhaar against the UIDAI record in person.',
      'Compare the submitted photograph with PIQ-2026-2004 side by side.',
      'Confirm whether passport number K7742819 was previously issued.',
      'Interview the applicant about the shared residential address.',
      'Refer the full cluster (4 applications) to the fraud investigation cell.',
    ],
  },
  stats: SAMPLE_STATS,
} as const;

export const SAMPLE_TRIAGE = {
  processed: 9,
  escalated: 8,
  ringsDetected: 2,
  queue: [
    {
      applicationId: 'PIQ-2026-2001',
      applicantName: 'Vikram Nair',
      priority: 1,
      riskScore: 83,
      riskBand: 'high',
      clusterSize: 4,
      requiresSeniorReview: true,
      recommendation: 'escalate',
      headline: 'Fully connected 4-application ring with a reused document photograph.',
    },
    {
      applicationId: 'PIQ-2026-2004',
      applicantName: 'Manoj Pillai',
      priority: 2,
      riskScore: 81,
      riskBand: 'high',
      clusterSize: 4,
      requiresSeniorReview: true,
      recommendation: 'escalate',
      headline: 'Photograph matches PIQ-2026-2001 at 0.97 similarity.',
    },
    {
      applicationId: 'PIQ-2026-2003',
      applicantName: 'Deepak Rathi',
      priority: 3,
      riskScore: 78,
      riskBand: 'high',
      clusterSize: 4,
      requiresSeniorReview: true,
      recommendation: 'escalate',
      headline: 'Shares passport number and address with the RING-ALPHA cluster.',
    },
    {
      applicationId: 'PIQ-2026-2002',
      applicantName: 'Suresh Menon',
      priority: 4,
      riskScore: 74,
      riskBand: 'high',
      clusterSize: 4,
      requiresSeniorReview: true,
      recommendation: 'escalate',
      headline: 'Shares phone and email with two other live applications.',
    },
    {
      applicationId: 'PIQ-2026-1004',
      applicantName: 'Anita Desai',
      priority: 5,
      riskScore: 47,
      riskBand: 'medium',
      clusterSize: 2,
      requiresSeniorReview: false,
      recommendation: 'clarify',
      headline: 'Address proof does not match the declared residential address.',
    },
    {
      applicationId: 'PIQ-2026-1001',
      applicantName: 'Priya Sharma',
      priority: 6,
      riskScore: 19,
      riskBand: 'low',
      clusterSize: 1,
      requiresSeniorReview: false,
      recommendation: 'clarify',
      headline: 'Minor date-of-birth formatting mismatch between Aadhaar and the form.',
    },
  ],
  rings: [
    {
      ringId: 'RING-ALPHA',
      members: ['PIQ-2026-2001', 'PIQ-2026-2002', 'PIQ-2026-2003', 'PIQ-2026-2004'],
      density: 1,
      sharedSignalKinds: ['document photo', 'passport number', 'phone', 'address', 'email'],
    },
    {
      ringId: 'RING-BETA',
      members: ['PIQ-2026-3001', 'PIQ-2026-3002'],
      density: 1,
      sharedSignalKinds: ['email', 'phone'],
    },
  ],
} as const;
