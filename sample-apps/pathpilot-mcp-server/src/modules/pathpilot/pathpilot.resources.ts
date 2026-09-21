import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { FULL_STACK_SKILLS } from '../../domain/skillMatrix.js';
import { TECHNOLOGY_DETECTION_RULES } from '../../domain/rules.js';
import { CONFIG } from '../../infrastructure/config.js';
import { SKILL_NORMALIZATION } from '../../adapters/linkedinMcpAdapter.js';

const FULL_STACK_ROADMAP_4_WEEK = {
  version: 'v1',
  pathway: 'full-stack-developer',
  durationWeeks: 4,
  prerequisites: [],
  weeks: [
    {
      week: 1,
      title: 'Foundations: HTML, CSS, JavaScript',
      focus: ['HTML', 'CSS', 'JavaScript'],
      deliverables: [
        '3-page semantic HTML portfolio with responsive layout',
        'DOM manipulation with event listeners',
        'Async pattern exercise (fetch + try/catch)',
      ],
      checkpoints: {
        HTML: 'At least 6 semantic tags across pages',
        CSS: 'Flexbox or Grid + at least one media query',
        JavaScript: 'Array methods + async/await in 2+ files',
      },
    },
    {
      week: 2,
      title: 'Typed UI: TypeScript + React',
      focus: ['TypeScript', 'React', 'Git'],
      deliverables: [
        'React task tracker with useState/useEffect',
        'TypeScript interfaces for props and state',
        '4+ well-scoped commits across feature branches',
      ],
      checkpoints: {
        TypeScript: 'tsconfig + 3+ typed components',
        React: '3 components, 2 hooks, props flow',
        Git: '8+ commits with messages',
      },
    },
    {
      week: 3,
      title: 'Backend: Node, Express, REST, Database',
      focus: ['Node.js', 'Express', 'REST API Integration', 'Database'],
      deliverables: [
        'Express API with 4 CRUD routes + middleware',
        'Client fetch/axios integration with UI handling',
        'Persistence via Mongoose/Prisma/Postgres with 2 models',
      ],
      checkpoints: {
        Node: 'package.json scripts + entry server',
        Express: 'cors + JSON middleware + 4 routes',
        'REST API Integration': 'client calls with loading/error UI',
        Database: '2 models and CRUD queries',
      },
    },
    {
      week: 4,
      title: 'Integrate and Deploy',
      focus: ['Deployment', 'REST API Integration', 'React', 'Database'],
      deliverables: [
        'Connect React frontend to Express backend',
        'Vercel/Netlify/Dockerfile + GitHub Actions workflow',
        'Live URL in README',
      ],
      checkpoints: {
        Deployment: 'Config file + deployed URL',
      },
    },
  ],
};

export class PathPilotResources {
  @Resource({
    uri: 'pathpilot://skill-matrix/full-stack/v1',
    name: 'Full-Stack Developer Skill Matrix v1',
    description: 'Target skills, evidence thresholds, and source/status definitions for the full-stack-developer pathway.',
    mimeType: 'application/json',
  })
  async getSkillMatrix(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Serving skill-matrix resource');
    const data = {
      version: 'v1',
      pathway: 'full-stack-developer',
      statusDefinitions: [
        { status: 'Verified', meaning: 'GitHub code/config provides multiple independent qualifying signals.', confidenceRange: [75, 100], canBeSetBy: ['github'] },
        { status: 'Partial', meaning: 'Some GitHub signals exist, but evidence is weak or incomplete.', confidenceRange: [25, 74], canBeSetBy: ['github'] },
        { status: 'Missing', meaning: 'No qualifying signal found within inspected scope.', confidenceRange: [0, 24], canBeSetBy: ['github'] },
        { status: 'Self-reported', meaning: 'Skill in user-authorized LinkedIn data but lacks GitHub verification. Not scored as verified.', confidenceRange: null, canBeSetBy: ['linkedin'] },
      ],
      skills: FULL_STACK_SKILLS.map((s) => ({
        name: s.name,
        order: s.order,
        description: s.description,
        prerequisites: s.prerequisites,
        thresholds: {
          verified: s.verifiedThreshold,
          partial: s.partialThreshold,
        },
        nextEvidencePrompt: s.nextEvidencePrompt,
      })),
    };
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) }] };
  }

  @Resource({
    uri: 'pathpilot://rules/technology-detection/v1',
    name: 'Technology Detection Rules v1',
    description: 'GitHub detector rules, weights, and signal sources for evidence engine transparency.',
    mimeType: 'application/json',
  })
  async getTechnologyRules(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Serving technology-detection rules resource');
    const data = {
      version: 'v1',
      detectionStages: ['Validate', 'Collect', 'Normalize', 'Detect', 'Aggregate', 'Explain', 'Publish'],
      rules: TECHNOLOGY_DETECTION_RULES.map((r) => ({
        id: r.id,
        skill: r.skill,
        description: r.description,
        weight: r.weight,
      })),
      notes: [
        'Only GitHub-backed detection contributes to verification confidence.',
        'LinkedIn data is source-aware context and never increases a verification score.',
        'Each non-missing finding must include evidence items with paths and excerpts.',
      ],
    };
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) }] };
  }

  @Resource({
    uri: 'pathpilot://rules/profile-normalization/v1',
    name: 'Profile Normalization Rules v1',
    description: 'LinkedIn field mappings, allowed profile signals, and skill canonicalization for consent-aware profile handling.',
    mimeType: 'application/json',
  })
  async getProfileNormalization(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Serving profile-normalization resource');
    const data = {
      version: 'v1',
      consent: 'Only user-authorized LinkedIn profile fields are retrieved; never scrape or guess.',
      allowedFields: ['skills', 'positions (title, company, dates, description)', 'education (school, degree, field, dates)', 'certifications (name, issuer, date)', 'projects (name, description, url, dates)'],
      skillCanonicalization: Object.fromEntries(
        Object.entries(SKILL_NORMALIZATION).map(([k, v]) => [k, v])
      ),
      governance: [
        'LinkedIn skills are labeled Self-reported, not Verified.',
        'Personal contact fields are NEVER returned to clients or persisted.',
        'Raw profile content is redacted, ephemeral, and request-scoped.',
      ],
    };
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) }] };
  }

  @Resource({
    uri: 'pathpilot://roadmaps/full-stack/4-week/v1',
    name: 'Full-Stack Developer 4-Week Baseline Roadmap v1',
    description: 'Baseline 4-week sequence, checkpoints, and prerequisites used by the AI roadmap service to calculate a change.',
    mimeType: 'application/json',
  })
  async getRoadmap(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Serving baseline roadmap resource');
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(FULL_STACK_ROADMAP_4_WEEK, null, 2) }] };
  }

  @Resource({
    uri: 'pathpilot://policies/analysis-limits/v1',
    name: 'Analysis Limits and Privacy Policies v1',
    description: 'File/profile allowlist, budgets, excluded paths, and redaction rules used by analysis pipeline.',
    mimeType: 'application/json',
  })
  async getAnalysisLimits(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Serving analysis-limits resource');
    const data = {
      version: 'v1',
      budget: CONFIG.budget,
      excludedPathPatterns: CONFIG.excludedPathPatterns.map((r) => r.source),
      excludedFilePatterns: CONFIG.excludedFilePatterns.map((r) => r.source),
      secretRedactionPatterns: CONFIG.secretPatterns.map((r) => r.source),
      retention: {
        repositorySnapshot: 'ephemeral by default',
        profileSnapshot: 'ephemeral by default',
        unifiedAnalysis: 'short-TTL cache only; saved history is explicit future user choice',
        tokensAndPii: 'NEVER in models, logs, or client responses',
      },
      writeSafety: 'MVP registers NO mutation-capable MCP tools. No writes to GitHub or LinkedIn.',
    };
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) }] };
  }

  @Resource({
    uri: 'pathpilot://schemas/evidence-card/v1',
    name: 'Evidence Card UI Schema v1',
    description: 'UI data contract for frontend evidence cards. Keeps frontend cards stable across analysis changes.',
    mimeType: 'application/json',
  })
  async getEvidenceCardSchema(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Serving evidence-card schema resource');
    const data = {
      version: 'v1',
      cardContract: {
        skill: 'string — canonical skill name from skill matrix',
        status: 'enum — "Verified" | "Partial" | "Missing" | "Self-reported"',
        confidence: 'number? (0-100) — GitHub-only confidence. Null for Self-reported.',
        summary: 'string — plain-language explanation for learners',
        sources: 'Array<{ provider: "github"|"linkedin"; label: string }>',
        evidenceHighlights: 'string[] — up to 3 human-readable evidence lines from GitHub or LinkedIn',
        nextStep: 'string — one practical next evidence step for this skill',
      },
      statusAccessibility: [
        'Verified: use + icon + green — text is the primary indicator',
        'Partial: use ~ icon + yellow — text is the primary indicator',
        'Missing: use - icon + gray — text is the primary indicator',
        'Self-reported: use ○ icon + blue with "(self-reported)" suffix — text is the primary indicator',
      ],
      safetyRule: 'Card wording must say "not verified in the selected repository," NEVER "the learner does not know this."',
    };
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) }] };
  }
}
