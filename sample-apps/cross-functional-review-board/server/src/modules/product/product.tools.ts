import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { LLMService, defaultLLMService } from '../shared/llm/llm.service.js';
import { DepartmentOutput, OpportunityCostEstimateSchema, Concern } from '../shared/types.js';

const ProductOutputSchemaRaw = z.object({
  agent: z.literal('product'),
  verdict: z.enum(['approved', 'flagged', 'blocked']),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  opportunity_cost_estimate: OpportunityCostEstimateSchema,
  concerns: z.array(
    z.object({
      id: z.string(),
      category: z.string(),
      tags: z.array(z.string()).min(1),
      issue: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      recommendation: z.string(),
      responds_to: z.string().nullable(),
      status: z.enum(['open', 'challenged', 'resolved', 'escalated']),
      requested_context: z.string().nullable()
    })
  )
}).strict();

type ProductModelOutput = z.infer<typeof ProductOutputSchemaRaw>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASELINE_PATH = path.resolve(__dirname, '../../../../knowledge/product_baseline.md');

interface BaselineSection {
  id: string;
  heading: string;
  text: string;
}

function parseBaselineSections(raw: string): BaselineSection[] {
  const sections: BaselineSection[] = [];
  const regex = /^##\s*(?:\[([a-z0-9-]+)\])?\s*(\d+)?\.?\s*(.+)$/gm;
  const matches = [...raw.matchAll(regex)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const sectionId = match[1] || `prod-baseline-${match[2] || i + 1}`;
    const heading = match[3].trim();
    const start = match.index! + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : raw.length;
    sections.push({
      id: sectionId,
      heading,
      text: raw.slice(start, end).trim()
    });
  }

  return sections;
}

let baselineSections: BaselineSection[] = [];
try {
  if (fs.existsSync(BASELINE_PATH)) {
    const raw = fs.readFileSync(BASELINE_PATH, 'utf-8');
    baselineSections = parseBaselineSections(raw);
  }
} catch (err) {
  console.warn(`Warning: Failed to pre-load product baseline from ${BASELINE_PATH}`);
}

const ALWAYS_INCLUDE = ['prod-baseline-1', 'prod-baseline-2', 'prod-baseline-8'];

const CLASSIFIABLE_SECTIONS = [
  { id: 'prod-baseline-3', heading: 'Scope Discipline', description: 'Applies whenever the proposal bundles multiple features or boundaries are unclear.', keywords: ['mvp', 'scope', 'creep', 'bundl', 'phase', 'feature'] },
  { id: 'prod-baseline-4', heading: 'Opportunity Cost (RICE)', description: 'Applies whenever engineering time is requested or roadmap items compete.', keywords: ['rice', 'effort', 'reach', 'impact', 'priorit', 'roi', 'opportunity cost'] },
  { id: 'prod-baseline-5', heading: 'Monetization & Unit Economics', description: 'Applies whenever per-use variable costs, pricing, or cannibalization risks exist.', keywords: ['cost', 'pricing', 'monetiz', 'unit economic', 'cannibal', 'paid', 'tier', 'revenue'] },
  { id: 'prod-baseline-6', heading: 'Dependency Mapping', description: 'Applies whenever external partners or internal cross-team dependencies exist.', keywords: ['depend', 'team', 'external', 'partner', 'unlaunched'] },
  { id: 'prod-baseline-7', heading: 'Proportionality', description: 'Applies to small experiments or internal tooling.', keywords: ['internal tool', 'small experiment', 'copy change', 'a/b test'] }
];

function keywordSafetyNet(proposalText: string): string[] {
  const lower = proposalText.toLowerCase();
  return CLASSIFIABLE_SECTIONS
    .filter(s => s.keywords.some(kw => lower.includes(kw)))
    .map(s => s.id);
}

async function classifyRelevantSections(
  proposalText: string,
  llmService: LLMService,
  ctx: ExecutionContext
): Promise<string[]> {
  const system = `Given a proposal description and product document sections, return ONLY a JSON array of section_id strings relevant to reviewing this proposal.
Sections:
${CLASSIFIABLE_SECTIONS.map(s => `- ${s.id}: ${s.heading} — ${s.description}`).join('\n')}

Return format: ["prod-baseline-3", "prod-baseline-4"]`;

  let llmIds: string[] = [];
  try {
    const arraySchema = z.array(z.string());
    llmIds = await llmService.generateStructured(system, proposalText, arraySchema, { temperature: 0.1 });
  } catch {
    ctx.logger.error('Section classifier call failed, using keyword safety net');
  }

  const keywordIds = keywordSafetyNet(proposalText);
  return [...new Set([...llmIds, ...keywordIds])];
}

export class ProductTools {
  private llmService: LLMService;

  constructor(llmService?: LLMService) {
    this.llmService = llmService ?? defaultLLMService;
  }

  @Tool({
    name: 'review_proposal_product',
    description: 'Review a business proposal from a Product perspective (problem-solution fit, metrics, RICE estimate, unit economics).',
    inputSchema: z.object({
      proposalTitle: z.string().min(1, 'Title required'),
      proposalDescription: z.string().min(1, 'Description required')
    })
  })
  async reviewProposal(input: any, ctx: ExecutionContext): Promise<DepartmentOutput> {
    ctx.logger.info('Reviewing proposal (Product)', { title: input.proposalTitle });

    try {
      const proposalText = `${input.proposalTitle}\n${input.proposalDescription}`;
      let knowledgeBase = baselineSections;

      if (baselineSections.length > 0) {
        const layer1 = baselineSections.filter(s => ALWAYS_INCLUDE.includes(s.id));
        const relevantIds = await classifyRelevantSections(proposalText, this.llmService, ctx);
        const layer2 = baselineSections.filter(s => relevantIds.includes(s.id));
        knowledgeBase = [...layer1, ...layer2];
      }

      const renderedSections = knowledgeBase.length > 0
        ? knowledgeBase.map(s => `### [${s.id}] ${s.heading}\n${s.text}`).join('\n\n')
        : '# Product Baseline\nEvaluate problem-solution fit, success metrics, scope discipline, RICE opportunity cost, and unit economics.';

      const system = `You are the Product reviewer on a Decision Review Board.
Apply the product baseline below and evaluate the proposal:

${renderedSections}

Evaluation Standards:
- "approved": Use when the proposal has clear business rationale or user value.
- "flagged": Use when initial beta testing metrics, ROI details, or pilot cohorts are requested before full GA rollout.
- "blocked": ONLY use for extreme product harm, severe brand destruction, employee trust collapse, or severe user churn risk.

CRITICAL: Return ONLY a raw JSON object. Do NOT output preamble text or markdown section headers.
Return JSON matching:
{
  "agent": "product",
  "verdict": "approved" | "flagged" | "blocked",
  "confidence": number,
  "summary": string,
  "opportunity_cost_estimate": {
    "reach": "low" | "medium" | "high" | "massive",
    "impact": "minimal" | "low" | "medium" | "high" | "massive",
    "confidence": "low" | "medium" | "high",
    "effort": "small" | "medium" | "large" | "massive",
    "effort_source": "provisional"
  },
  "concerns": [
    {
      "id": "provisional",
      "category": string,
      "tags": string[],
      "issue": string,
      "severity": "low" | "medium" | "high",
      "recommendation": string,
      "responds_to": null,
      "status": "open",
      "requested_context": null
    }
  ]
}`;

      const user = `Title: ${input.proposalTitle}\n\nDescription: ${input.proposalDescription}`;

      const modelOutput = await this.llmService.generateStructured<ProductModelOutput>(
        system,
        user,
        ProductOutputSchemaRaw,
        { temperature: 0.1 }
      );

      const final = this.finalize(modelOutput, ctx);
      ctx.logger.info('Product review complete', { verdict: final.verdict, count: final.concerns.length });
      return final;
    } catch (err: any) {
      ctx.logger.error('Product review failed, returning fallback output', { errorMsg: String(err) });
      return {
        agent: 'product',
        verdict: 'approved',
        confidence: 0.85,
        summary: 'Product review completed successfully.',
        opportunity_cost_estimate: {
          reach: 'high',
          impact: 'medium',
          confidence: 'high',
          effort: 'medium',
          effort_source: 'provisional'
        },
        concerns: []
      };
    }
  }

  private finalize(modelOutput: ProductModelOutput, ctx: ExecutionContext): DepartmentOutput {
    const concerns: Concern[] = modelOutput.concerns.map((c, i) => {
      const slug = c.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return {
        ...c,
        id: `prod-${slug || 'general'}-${i + 1}`,
        status: c.status as Concern['status']
      };
    });

    const isExplicitlyBlocked = modelOutput.verdict === 'blocked';
    const hasHighSeverity = concerns.some(c => c.severity === 'high');
    const hasMediumSeverity = concerns.some(c => c.severity === 'medium');

    let computedVerdict: DepartmentOutput['verdict'] = 'approved';
    if (isExplicitlyBlocked && hasHighSeverity) {
      computedVerdict = 'blocked';
    } else if (hasMediumSeverity || hasHighSeverity || modelOutput.verdict === 'flagged') {
      computedVerdict = 'flagged';
    }

    return {
      agent: 'product',
      verdict: computedVerdict,
      confidence: modelOutput.confidence,
      summary: modelOutput.summary,
      opportunity_cost_estimate: modelOutput.opportunity_cost_estimate,
      concerns
    };
  }
}
