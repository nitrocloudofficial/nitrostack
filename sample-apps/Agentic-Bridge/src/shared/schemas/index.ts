/**
 * Shared Zod schemas — end-to-end type safety from the LLM prompt schema
 * down to the runtime execution environment.
 *
 * Every @Tool inputSchema in this project is composed from the primitives here,
 * so an agent can never pass a hallucinated parameter into an enterprise API.
 */
import { z } from '@nitrostack/core';

/* ------------------------------------------------------------------ *
 * Target selection
 * ------------------------------------------------------------------ */

/**
 * Every reconnaissance tool accepts the same target selector.
 * Omitting `target` uses the bundled legacy fixture, which makes every tool
 * demo-safe with zero arguments.
 */
export const TargetSchema = z.object({
  target: z
    .string()
    .optional()
    .describe(
      'The codebase to analyse. Either a GitHub repository URL — ' +
        'https://github.com/<owner>/<repo>, optionally /tree/<branch> — which is shallow-cloned ' +
        'into a temp directory and deleted afterwards, or an absolute path to a directory on the ' +
        'machine hosting this server. Prefer the URL form: it is the only one that works when ' +
        'this server runs remotely, since it cannot read the calling machine\'s disk. ' +
        'Omit to use the bundled Aurora Billing legacy fixture.'
    ),
});

export const RunRefSchema = z.object({
  run_id: z
    .string()
    .optional()
    .describe('Swarm run id. Omit to use the most recent run.'),
});

/* ------------------------------------------------------------------ *
 * Codebase / structural cartography
 * ------------------------------------------------------------------ */

export const CodebaseNodeSchema = z.object({
  path: z.string().describe('Repo-relative file path'),
  language: z.string().describe('Detected language'),
  loc: z.number().describe('Non-blank lines of code'),
  layer: z
    .enum(['route', 'service', 'data-access', 'middleware', 'ui-component', 'ui-view', 'config', 'test', 'batch', 'docs', 'other'])
    .describe('Architectural layer this file belongs to'),
  imports: z.array(z.string()).describe('Repo-relative paths this file imports'),
  importedBy: z.array(z.string()).describe('Repo-relative paths that import this file'),
  exports: z.array(z.string()).describe('Named exports detected in this file'),
  symbols: z.array(z.string()).describe('Top-level function/class names'),
});
export type CodebaseNode = z.infer<typeof CodebaseNodeSchema>;

export const DependencySpecSchema = z.object({
  ecosystem: z.enum(['npm', 'maven', 'pypi', 'go', 'nuget']),
  manifest: z.string(),
  name: z.string(),
  version: z.string(),
  scope: z.enum(['runtime', 'dev', 'test', 'build']),
  docsUrl: z.string().optional(),
});
export type DependencySpec = z.infer<typeof DependencySpecSchema>;

/* ------------------------------------------------------------------ *
 * Agile / human-consensus sources
 * ------------------------------------------------------------------ */

export const JiraTicketSchema = z.object({
  key: z.string(),
  type: z.string(),
  status: z.string(),
  assignee: z.string().optional(),
  summary: z.string(),
  description: z.string(),
  labels: z.array(z.string()).default([]),
  storyPoints: z.number().optional(),
  updated: z.string().optional(),
});
export type JiraTicket = z.infer<typeof JiraTicketSchema>;

export const JiraSprintSchema = z.object({
  board: z.string(),
  sprint: z.object({
    id: z.number(),
    name: z.string(),
    state: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    goal: z.string().optional(),
  }),
  issues: z.array(JiraTicketSchema),
});
export type JiraSprint = z.infer<typeof JiraSprintSchema>;

export const MeetingDecisionSchema = z.object({
  id: z.string(),
  timestamp: z.string().optional(),
  speaker: z.string().optional(),
  text: z.string(),
  /** Technologies / subsystems this utterance is about. */
  entities: z.array(z.string()).default([]),
  /** Whether the speaker is adopting or rejecting the entities. */
  polarity: z.enum(['adopt', 'reject', 'freeze', 'mandate', 'neutral']).default('neutral'),
  authority: z.enum(['lead', 'ops', 'engineer', 'unknown']).default('unknown'),
});
export type MeetingDecision = z.infer<typeof MeetingDecisionSchema>;

export const MeetingTranscriptSchema = z.object({
  source: z.string(),
  title: z.string(),
  occurredAt: z.string().optional(),
  attendees: z.array(z.string()).default([]),
  decisions: z.array(MeetingDecisionSchema),
  rawLineCount: z.number(),
});
export type MeetingTranscript = z.infer<typeof MeetingTranscriptSchema>;

/* ------------------------------------------------------------------ *
 * Conflict detection & human-in-the-loop resolution
 * ------------------------------------------------------------------ */

export const ConflictSchema = z.object({
  id: z.string(),
  kind: z.enum(['contradiction', 'semantic-drift']),
  topic: z.string(),
  /** Cosine similarity between the two sources' topic vectors. */
  similarity: z.number(),
  /** How strongly the two sources disagree on the decision itself (0..1). */
  divergence: z.number(),
  sourceA: z.object({ origin: z.string(), ref: z.string(), text: z.string() }),
  sourceB: z.object({ origin: z.string(), ref: z.string(), text: z.string() }),
  /** Machine-suggested winner, always overridable by the administrator. */
  recommendation: z.enum(['a', 'b']),
  recommendationReason: z.string(),
  status: z.enum(['open', 'resolved']).default('open'),
  resolution: z
    .object({
      chosen: z.enum(['a', 'b', 'custom']),
      directive: z.string(),
      resolvedBy: z.string(),
      resolvedAt: z.string(),
    })
    .optional(),
});
export type Conflict = z.infer<typeof ConflictSchema>;

export const ConflictResolutionSchema = z.object({
  conflict_id: z.string().describe('Id of the conflict being resolved'),
  chosen: z
    .enum(['a', 'b', 'custom'])
    .describe("Which source is authoritative: 'a', 'b', or 'custom' to supply your own directive"),
  directive: z
    .string()
    .optional()
    .describe("Required when chosen='custom'. The authoritative instruction to write into CLAUDE.md."),
  resolved_by: z.string().default('admin').describe('Who made the call (for the audit trail)'),
});

/* ------------------------------------------------------------------ *
 * Dynamic skill generation (metaprogramming)
 * ------------------------------------------------------------------ */

/** A field in a generated skill's input schema. */
export const SkillParamSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/, 'snake_case identifier'),
  type: z.enum(['string', 'number', 'boolean']),
  description: z.string(),
  required: z.boolean().default(true),
});

export const SkillSpecSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9_]{2,63}$/, 'snake_case tool name, 3-64 chars')
    .describe('MCP tool name the swarm is minting, e.g. query_legacy_orm'),
  description: z.string().min(10).describe('What the skill does and when an agent should reach for it'),
  params: z.array(SkillParamSchema).default([]).describe('Input parameters, becomes the Zod inputSchema'),
  /**
   * The skill body. Executed with `params` in scope and must return a
   * JSON-serialisable value. Runs in a restricted sandbox — see SkillRuntime.
   */
  body: z
    .string()
    .min(1)
    .describe(
      'JavaScript function body. Receives `params` (validated input) and `api` ' +
        '(readFile, listFiles, grep, resolve) and must return a JSON-serialisable value.'
    ),
  rationale: z
    .string()
    .default('')
    .describe('Why the swarm decided this skill was needed — surfaced in CLAUDE.md'),
});
export type SkillSpec = z.infer<typeof SkillSpecSchema>;

export const GeneratedSkillSchema = SkillSpecSchema.extend({
  createdAt: z.string(),
  createdBy: z.string(),
  sourceFile: z.string(),
  registered: z.boolean(),
});
export type GeneratedSkill = z.infer<typeof GeneratedSkillSchema>;

/* ------------------------------------------------------------------ *
 * Pipeline builder
 * ------------------------------------------------------------------ */

export const PIPELINE_NODE_TYPES = [
  'understand',
  'think',
  'explore',
  'design',
  'develop',
  'write_tests',
  'run_tests',
  'push',
  'deploy',
  'update_jira',
  'send_slack_message',
] as const;

export const PipelineNodeTypeSchema = z.enum(PIPELINE_NODE_TYPES);
export type PipelineNodeType = (typeof PIPELINE_NODE_TYPES)[number];

export const PipelineNodeSchema = z.object({
  id: z.string(),
  type: PipelineNodeTypeSchema,
  label: z.string().optional(),
  /** Pause the run here and wait for an administrator decision. */
  requiresApproval: z.boolean().default(false),
  config: z.record(z.string()).default({}),
});

export const PipelineGraphSchema = z.object({
  name: z.string().min(1).describe('Pipeline name, e.g. "Aurora feature SDLC"'),
  description: z.string().default(''),
  nodes: z.array(PipelineNodeSchema).min(1).describe('Ordered pipeline stages'),
  edges: z
    .array(z.object({ from: z.string(), to: z.string() }))
    .default([])
    .describe('Directed edges. Omit for a straight sequential chain through `nodes`.'),
});
export type PipelineGraph = z.infer<typeof PipelineGraphSchema>;

/* ------------------------------------------------------------------ *
 * Knowledge base
 * ------------------------------------------------------------------ */

export const KnowledgeFactSchema = z.object({
  id: z.string(),
  /** Which swarm persona produced this fact. */
  agent: z.string(),
  category: z.enum([
    'architecture',
    'dependency',
    'testing',
    'cicd',
    'agile',
    'consensus',
    'design-system',
    'skill',
    'manual',
  ]),
  title: z.string(),
  detail: z.string(),
  /** Repo-relative paths or external refs backing this fact. */
  evidence: z.array(z.string()).default([]),
  /** Higher = more load-bearing in the generated manifest. */
  weight: z.number().default(1),
  /**
   * True when a model inferred this fact rather than a parser extracting it.
   *
   * The distinction is load-bearing and deliberately visible: extracted facts
   * are reproducible and carry an evidence path, reasoned ones are judgment.
   * The manifest labels them separately so a reviewer can trust the extracted
   * half without having to audit the whole document.
   *
   * Optional rather than defaulted so the many deterministic call sites that
   * predate it keep constructing facts without naming it; absent reads as false.
   */
  reasoned: z.boolean().optional(),
});
export type KnowledgeFact = z.infer<typeof KnowledgeFactSchema>;

export const SWARM_AGENTS = [
  'structural-cartographer',
  'documentation-synthesizer',
  'qa-analyst',
  'devops-navigator',
  'product-synchronizer',
  'scrum-analyst',
  'uiux-integrator',
] as const;
export type SwarmAgent = (typeof SWARM_AGENTS)[number];

export const SwarmRunSchema = z.object({
  id: z.string(),
  target: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  status: z.enum(['running', 'awaiting-resolution', 'completed', 'failed']),
  agents: z.array(
    z.object({
      agent: z.string(),
      status: z.enum(['pending', 'running', 'done', 'failed']),
      factCount: z.number().default(0),
      durationMs: z.number().default(0),
      summary: z.string().default(''),
      error: z.string().optional(),
    })
  ),
  conflictIds: z.array(z.string()).default([]),
  manifestPath: z.string().optional(),
  error: z.string().optional(),
});
export type SwarmRun = z.infer<typeof SwarmRunSchema>;
