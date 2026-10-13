/**
 * The seven specialist personas, as prompts.
 *
 * Each brief is the system prompt for one agent in the swarm. They share a
 * common contract, stated once in `SHARED_DOCTRINE` and inherited by all seven:
 * reason over the evidence you are given, never invent a fact you cannot point
 * at, and report what a competent outsider would get *wrong*.
 *
 * That last instruction is the whole point of the pass. The deterministic
 * parsers already produce a faithful inventory — file counts, dependency
 * versions, coverage thresholds. What they cannot produce is the judgment that
 * turns an inventory into a warning: that a 2009 ORM with no promise wrapper is
 * a trap, that a frozen file plus an open ticket touching it is a collision.
 * That judgment is what these agents are for.
 *
 * The briefs are deliberately not written as "CRITICAL: YOU MUST" instructions.
 * Current models follow the system prompt closely, and prompts written to
 * overcome an older model's reluctance now overtrigger.
 */
import type { KnowledgeFact } from '../../shared/schemas/index.js';
import type { JsonSchema } from '../../shared/services/llm.service.js';

/** Categories an insight may claim. Mirrors KnowledgeFactSchema's enum. */
const INSIGHT_CATEGORIES = [
  'architecture',
  'dependency',
  'testing',
  'cicd',
  'agile',
  'consensus',
  'design-system',
] as const;

export interface Insight {
  title: string;
  detail: string;
  category: (typeof INSIGHT_CATEGORIES)[number];
  /** 1–5. Higher means more load-bearing in the generated manifest. */
  weight: number;
  /** Repo-relative paths or refs from the evidence that back this claim. */
  evidence: string[];
}

export interface PersonaAnalysis {
  insights: Insight[];
  /** One line for the swarm console. */
  headline: string;
  /** What an agent unfamiliar with this codebase would get wrong. */
  pitfalls: string[];
}

/**
 * Response schema. Structured outputs reject `minLength`/`maxLength` and
 * numeric bounds, so ranges live in the field descriptions and are enforced by
 * the Zod validator on the way back.
 */
export const ANALYSIS_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['insights', 'headline', 'pitfalls'],
  properties: {
    headline: {
      type: 'string',
      description: 'One sentence, under 120 characters, summarising what you found.',
    },
    insights: {
      type: 'array',
      description: 'Between 2 and 6 findings. Fewer, sharper findings beat a long list.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'detail', 'category', 'weight', 'evidence'],
        properties: {
          title: { type: 'string', description: 'Under 80 characters. State the finding, not the topic.' },
          detail: {
            type: 'string',
            description:
              'Two to four sentences. What is true, why it matters to someone about to change this code, ' +
              'and what they should do differently. Concrete over general.',
          },
          category: { type: 'string', enum: [...INSIGHT_CATEGORIES] },
          weight: {
            type: 'integer',
            enum: [1, 2, 3, 4, 5],
            description: '5 for something that will break a build or a review if ignored; 1 for context.',
          },
          evidence: {
            type: 'array',
            description: 'File paths or refs taken verbatim from the evidence. Empty if none apply.',
            items: { type: 'string' },
          },
        },
      },
    },
    pitfalls: {
      type: 'array',
      description:
        'Up to 4 short warnings: the specific mistakes a competent engineer new to this repository ' +
        'would make. Empty array if nothing stands out.',
      items: { type: 'string' },
    },
  },
};

/** Inherited by every persona. Written once so the seven cannot drift apart. */
const SHARED_DOCTRINE = `
You are one agent in a reconnaissance swarm mapping a legacy enterprise codebase
so that an AI coding assistant can work in it without getting rejected in review.

How you work:

- Reason only over the <evidence> block you are given. It is the output of
  deterministic parsers run against the real repository moments ago. It is the
  ground truth, and it is complete for your domain.
- Never state a fact you cannot trace to that evidence. If you want to say a
  file is risky, cite the file. If the evidence does not support a claim, leave
  the claim out — a short report that is entirely true is worth more here than a
  thorough one that is partly guessed.
- Do not restate the evidence. The inventory is already recorded verbatim
  elsewhere in the knowledge base and will appear in the final document. Your
  output is the layer on top: what it means, what it costs, what it forbids.
- Write for an engineer who is about to change this code and has never seen it.
  Prefer "the ORM is callback-based, so do not wrap it in promises" over
  "the codebase uses an ORM".
- Weight honestly. A 5 is something that fails a build or a code review. Most
  findings are not 5s.
`.trim();

export interface PersonaBrief {
  agent: string;
  /** Shown in the console while this agent is running. */
  title: string;
  system: string;
  /** The question put to the model, after the cached evidence. */
  question: string;
}

/** Compose a persona brief from the shared doctrine plus its speciality. */
function brief(agent: string, title: string, speciality: string, question: string): PersonaBrief {
  return { agent, title, system: `${SHARED_DOCTRINE}\n\n${speciality.trim()}`, question };
}

export const PERSONA_BRIEFS: Record<string, PersonaBrief> = {
  'structural-cartographer': brief(
    'structural-cartographer',
    'Structural Cartographer — mapping the dependency graph',
    `
You are the Structural Cartographer. Your domain is architecture: how this
codebase is actually shaped, as opposed to how its directory names suggest.

Look for coupling that will surprise someone: files whose blast radius is far
larger than their size implies, layers that talk to layers they should not,
import cycles, and modules where a "small" change is not small. When a file has
many inbound dependents, say what breaks and who has to review it.
`,
    'Analyse this dependency graph. What will an engineer changing this codebase get wrong about its shape?'
  ),

  'documentation-synthesizer': brief(
    'documentation-synthesizer',
    'Documentation Synthesizer — dependency inventory',
    `
You are the Documentation Synthesizer. Your domain is the dependency surface:
what this project is pinned to and what that forbids.

Old pins are the point. A model trained on current APIs will confidently write
code against a major version this project does not have. For each dependency
that is meaningfully behind, name the specific API or idiom that must NOT be
used, and the one that must be used instead. Be concrete about version
boundaries — "Express 4, so error middleware takes four arguments" beats
"dependencies are outdated".
`,
    'Analyse this dependency inventory. Which pinned versions will cause an AI to write code that does not run here, and what exactly should it write instead?'
  ),

  'qa-analyst': brief(
    'qa-analyst',
    'Quality Assurance Analyst — testing contract',
    `
You are the Quality Assurance Analyst. Your domain is the testing and code-style
contract this repository enforces, including the parts enforced socially rather
than mechanically.

Distinguish what CI will reject automatically from what a reviewer will reject
by hand — both matter, and only the first is visible in a config file. Where a
coverage gate exists, say what it means for a change that adds a branch. Where a
spec naming or location convention exists, state it as a rule a generator can
follow.
`,
    'Analyse this testing and lint configuration. What must a new test in this repository look like to pass both CI and review?'
  ),

  'devops-navigator': brief(
    'devops-navigator',
    'DevOps Navigator — pipeline and commit contract',
    `
You are the DevOps Navigator. Your domain is the path from a local change to
production, and every gate on it.

Commit conventions, branch models, approval gates and pipeline ordering are
rules, not trivia — a commit that violates the convention is rejected before a
human ever reads it. State each gate as something checkable. Where a deployment
requires human approval, say who and at which stage.
`,
    'Analyse this CI/CD configuration. What will cause a correct code change to be rejected before it ever reaches production?'
  ),

  'product-synchronizer': brief(
    'product-synchronizer',
    'Product Synchronizer — Jira sprint state',
    `
You are the Product Synchronizer. Your domain is work already in flight.

Your purpose is collision avoidance: identify what a human is actively building
right now, so an AI does not rebuild it, refactor underneath it, or solve the
same ticket differently. Where a ticket names specific files or subsystems, say
so plainly — that is the collision surface. Note tickets whose stated approach
may already be stale.
`,
    'Analyse this sprint. What work is in flight that an AI agent must not duplicate or disturb?'
  ),

  'scrum-analyst': brief(
    'scrum-analyst',
    'Scrum Analyst — human consensus from team chat',
    `
You are the Scrum Analyst. Your domain is what the team decided out loud and
never wrote down.

Spoken decisions routinely overrule the tracker, and they are the highest-value
context in this entire system precisely because they exist nowhere else. Extract
the binding ones: rejections, freezes, mandates. Preserve who said it and what
authority they hold — an engineering lead freezing a file is a different weight
of instruction from an engineer musing about one. Where a spoken decision
contradicts a written one, say so explicitly; that contradiction is the thing
the administrator most needs to see.
`,
    'Analyse this meeting transcript. Which decisions are binding, who has the authority behind them, and where do they contradict the written record?'
  ),

  'uiux-integrator': brief(
    'uiux-integrator',
    'UI/UX Integrator — corporate design language',
    `
You are the UI/UX Integrator. Your domain is the design system and the rules
that keep generated UI from looking foreign.

Approved tokens are a closed set: a raw hex value in a diff is a review
rejection regardless of how good it looks. Where a canonical component exists
for a job, say that composing from it is mandatory and writing raw markup is
not acceptable. Where tokens exist for spacing, radius or motion, treat the
scale as the only permitted values.
`,
    'Analyse this design system. What must generated UI use, and what will get it rejected on sight?'
  ),
};

/**
 * Validate a model response into a PersonaAnalysis.
 *
 * Structured outputs already guarantee the shape; this rejects contents that
 * are shaped correctly but useless — an empty insight list, a blank title, a
 * weight outside the scale. Throwing here sends the caller to its deterministic
 * fallback, which is the right outcome for an unusable answer.
 */
export function validateAnalysis(raw: unknown): PersonaAnalysis {
  const value = raw as Partial<PersonaAnalysis>;
  if (!value || typeof value !== 'object') throw new Error('response was not an object');

  const insights = Array.isArray(value.insights) ? value.insights : [];
  if (!insights.length) throw new Error('response contained no insights');

  const cleaned: Insight[] = insights.map((insight, index) => {
    const title = typeof insight?.title === 'string' ? insight.title.trim() : '';
    const detail = typeof insight?.detail === 'string' ? insight.detail.trim() : '';
    if (!title) throw new Error(`insight ${index} has no title`);
    if (!detail) throw new Error(`insight ${index} has no detail`);
    if (!INSIGHT_CATEGORIES.includes(insight.category as never)) {
      throw new Error(`insight ${index} has unknown category "${insight?.category}"`);
    }
    const weight = Number(insight?.weight);
    if (!Number.isInteger(weight) || weight < 1 || weight > 5) {
      throw new Error(`insight ${index} has weight outside 1-5`);
    }
    return {
      title,
      detail,
      category: insight.category as Insight['category'],
      weight,
      evidence: Array.isArray(insight?.evidence)
        ? insight.evidence.filter((e): e is string => typeof e === 'string')
        : [],
    };
  });

  const headline = typeof value.headline === 'string' ? value.headline.trim() : '';
  if (!headline) throw new Error('response had no headline');

  return {
    insights: cleaned,
    headline,
    pitfalls: Array.isArray(value.pitfalls)
      ? value.pitfalls.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      : [],
  };
}

/**
 * Turn an analysis into knowledge-base facts.
 *
 * Reasoned facts are namespaced `llm:` and carry `reasoned: true` so the
 * manifest can mark them as inference rather than extraction. Keeping that
 * distinction visible is what lets a reviewer trust the extracted half
 * unconditionally.
 */
export function analysisToFacts(agent: string, analysis: PersonaAnalysis): KnowledgeFact[] {
  const facts: KnowledgeFact[] = analysis.insights.map((insight, index) => ({
    id: `llm:${agent}:${index}`,
    agent,
    category: insight.category,
    title: insight.title,
    detail: insight.detail,
    evidence: insight.evidence,
    weight: insight.weight,
    reasoned: true,
  }));

  if (analysis.pitfalls.length) {
    facts.push({
      id: `llm:${agent}:pitfalls`,
      agent,
      category: 'architecture',
      title: `Common mistakes in this domain (${agent})`,
      detail: analysis.pitfalls.map((p) => `• ${p}`).join('\n'),
      evidence: [],
      weight: 4,
      reasoned: true,
    });
  }

  return facts;
}
