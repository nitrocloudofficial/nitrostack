/**
 * FORAY — THE PERMISSIONS MATRIX
 *
 * MIRROR OF api/schema.py (PERMISSIONS / DENIAL_RULES). foray_plan.md §6.3.
 *
 *   If you change one side, change the other IN THE SAME COMMIT.
 *   `npm run check:matrix` fails the build when they drift.
 *
 * This table IS the architecture. It is not a policy document — the Warden
 * guard reads it on every single tool call, and writes an AccessLog row on
 * denial. That log row is demo beat 6.
 */

export type Scope =
  | 'course_content'
  | 'raw_reflection'
  | 'individual_mastery'
  | 'cohort_aggregate'
  | 'multi_cohort'
  // ── S7 ──
  | 'student_profile'   // roster summaries: names, scenarios, COUNTS. No raw text.
  | 'chat_log';         // raw chat transcripts — the regulation log

export type Role =
  | 'elicitor'
  | 'diagnostician'
  | 'grounding_verifier'
  | 'mastery_updater'
  | 'root_cause_analyst'
  | 'intervention_designer'
  | 'compass'
  | 'student'
  | 'faculty';

// Course material is the prescribed textbook. It is not student data, so
// every role reads it — foray_plan.md §3.1: "Course Content ... Consumers:
// All agents. Read-only." Withholding it from the Grounding Verifier makes
// R-02 impossible to satisfy, since retrieval IS its job.
const CONTENT: Scope[] = ['course_content'];

export const PERMISSIONS: Record<Role, Scope[]> = {
  // ── Loop 1 agents: see the words, never the cohort ──
  // Elicitor and Diagnostician also hold chat_log: the Elicitor IS the
  // conversation, and the Diagnostician analyses it turn by turn.
  elicitor:              [...CONTENT, 'raw_reflection', 'chat_log'],
  diagnostician:         [...CONTENT, 'raw_reflection', 'chat_log'],
  grounding_verifier:    [...CONTENT, 'raw_reflection'],
  mastery_updater:       [...CONTENT, 'individual_mastery'],
  // ── Loop 2 agents: see the cohort, structurally never the words ──
  root_cause_analyst:    [...CONTENT, 'cohort_aggregate'],
  intervention_designer: [...CONTENT, 'cohort_aggregate'],
  // ── Loop 3 ──
  compass:               [...CONTENT, 'individual_mastery'],
  // ── Humans ──
  student:               [...CONTENT, 'raw_reflection', 'individual_mastery',
                          'chat_log'],   // their OWN transcript
  faculty:               [...CONTENT, 'cohort_aggregate', 'multi_cohort',
                          'student_profile'],
  //                       ^ NOTE what is absent: raw_reflection,
  //                         individual_mastery and chat_log. Faculty sees
  //                         the roster and the counts — never the words.
  //                         That absence is beat 6.
};

/**
 * Which scope each tool reads or writes.
 *
 * Every tool MUST appear here. An unmapped tool is denied by default —
 * fail closed, never open. A gate that fails open is not a gate.
 */
export const TOOL_SCOPES: Record<string, Scope> = {
  // Course Content server — read-only, open to all roles
  get_concept:         'course_content',
  get_prereqs:         'course_content',
  get_material_chunks: 'course_content',

  // Student Model server — Loop 1 + Compass only. Faculty blocked.
  get_reflection: 'raw_reflection',
  put_diagnosis:  'raw_reflection',
  get_mastery:    'individual_mastery',
  put_mastery:    'individual_mastery',

  // Cohort Analytics server — returns no raw text. Structurally cannot.
  get_clusters:         'cohort_aggregate',
  get_cohort_mastery:   'cohort_aggregate',
  put_intervention:     'cohort_aggregate',
  get_topic_questions:  'cohort_aggregate',   // R-12: counts, never text

  // Class Records server — roster is summaries; the chat log is the
  // regulation record. Faculty gets the first, never the second.
  get_roster:   'student_profile',
  get_chat_log: 'chat_log',
};

/** Rule id + text + requirement id, for the AccessLog row. */
export function denialReason(
  role: string,
  scope: string,
): { rule: string; reqId: string } {
  const key = `${role}:${scope}`;
  const table: Record<string, { rule: string; reqId: string }> = {
    'faculty:raw_reflection': {
      rule: 'P-03: faculty role cannot access raw reflection text',
      reqId: 'R-03',
    },
    'faculty:individual_mastery': {
      rule: 'P-04: faculty role cannot access an individual student\'s mastery',
      reqId: 'R-03',
    },
    'root_cause_analyst:raw_reflection': {
      rule: 'P-05: cohort agents are never given raw student text',
      reqId: 'R-03',
    },
    'intervention_designer:raw_reflection': {
      rule: 'P-05: cohort agents are never given raw student text',
      reqId: 'R-03',
    },
    'faculty:chat_log': {
      rule: 'P-06: faculty role cannot read raw chat transcripts',
      reqId: 'R-11',
    },
  };
  return (
    table[key] ?? {
      rule: `P-00: role '${role}' has no grant for scope '${scope}'`,
      reqId: 'R-03',
    }
  );
}

export function isAllowed(role: string, scope: Scope): boolean {
  const grants = PERMISSIONS[role as Role];
  if (!grants) return false;        // unknown role → denied. Fail closed.
  return grants.includes(scope);
}
