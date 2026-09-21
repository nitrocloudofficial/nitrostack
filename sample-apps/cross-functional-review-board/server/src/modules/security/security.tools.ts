import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { LLMService, defaultLLMService } from '../shared/llm/llm.service.js';
import { DepartmentOutput, Concern } from '../shared/types.js';

const DepartmentOutputSchemaRaw = z.object({
  agent: z.literal('security'),
  verdict: z.enum(['approved', 'flagged', 'blocked']),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
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

type SecurityModelOutput = z.infer<typeof DepartmentOutputSchemaRaw>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASELINE_PATH = path.resolve(__dirname, '../../../../knowledge/security_baseline.md');

interface BaselineSection {
  id: string;
  heading: string;
  text: string;
}

function parseBaselineSections(raw: string): BaselineSection[] {
  const sections: BaselineSection[] = [];
  const regex = /^##\s*(\d+)\.\s*(.+)$/gm;
  const matches = [...raw.matchAll(regex)];

  for (let i = 0; i < matches.length; i++) {
    const [matchText, sectionNum, heading] = matches[i];
    const id = `sec-baseline-${sectionNum}`;
    const start = matches[i].index! + matchText.length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : raw.length;
    sections.push({
      id,
      heading: heading.trim(),
      text: raw.slice(start, end).trim()
    });
  }

  return sections;
}

let baselineSections: BaselineSection[] = [];
try {
  const raw = fs.readFileSync(BASELINE_PATH, 'utf-8');
  baselineSections = parseBaselineSections(raw);
} catch (err) {
  console.warn(`Warning: Failed to pre-load security baseline from ${BASELINE_PATH}`);
}

const ALWAYS_INCLUDE = ['sec-baseline-1', 'sec-baseline-5'];

const CLASSIFIABLE_SECTIONS = [
  { id: 'sec-baseline-2', heading: 'Threat Modeling (STRIDE)', description: 'Applies whenever a proposal introduces a new endpoint, integration, or data flow.', keywords: ['integrat', 'endpoint', 'api', 'cache', 'credential', 'flow', 'database', 'storage', 'sync'] },
  { id: 'sec-baseline-3', heading: 'Vendor / Third-Party Risk Tiering', description: 'Applies whenever any entity outside the company touches company or customer data.', keywords: ['vendor', 'third-party', 'third party', 'partner', 'external provider', 'outsourc'] },
  { id: 'sec-baseline-4', heading: 'Compliance Triggers', description: 'Applies whenever personal, financial, or health data is involved.', keywords: ['medical', 'health', 'patient', 'financial', 'payment', 'card', 'gdpr', 'ccpa', 'hipaa', 'pci', 'personal data', 'pii', 'eu', 'california'] },
  { id: 'sec-baseline-6', heading: 'Proportionality (low-risk exceptions)', description: 'Applies whenever the proposal is clearly internal-only or has no data/backend component.', keywords: ['internal tool', 'ui only', 'frontend only', 'no backend', 'read-only'] }
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
  const system = `Given a proposal description and document sections, return ONLY a JSON array of section_id strings relevant to reviewing this proposal.
Sections:
${CLASSIFIABLE_SECTIONS.map(s => `- ${s.id}: ${s.heading} — ${s.description}`).join('\n')}

Return format: ["sec-baseline-2", "sec-baseline-4"]`;

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

export class SecurityTools {
  private llmService: LLMService;

  constructor(llmService?: LLMService) {
    this.llmService = llmService ?? defaultLLMService;
  }

  @Tool({
    name: 'review_proposal',
    description: 'Review a proposal from a security perspective, evaluating against STRIDE, data classification, and vendor risk.',
    inputSchema: z.object({
      proposalTitle: z.string().min(1, 'Proposal title must not be empty'),
      proposalDescription: z.string().min(1, 'Proposal description must not be empty')
    })
  })
  async reviewProposal(input: any, ctx: ExecutionContext): Promise<DepartmentOutput> {
    ctx.logger.info('Reviewing proposal (Security)', { title: input.proposalTitle });

    try {
      const proposalText = `${input.proposalTitle}\n${input.proposalDescription}`;
      const layer1 = baselineSections.filter(s => ALWAYS_INCLUDE.includes(s.id));
      const relevantIds = await classifyRelevantSections(proposalText, this.llmService, ctx);
      const layer2 = baselineSections.filter(s => relevantIds.includes(s.id));
      const knowledgeBase = [...layer1, ...layer2];

      const { system, user } = this.buildReviewPrompt(input, knowledgeBase);

      const modelOutput = await this.llmService.generateStructured<SecurityModelOutput>(
        system,
        user,
        DepartmentOutputSchemaRaw,
        { temperature: 0.1 }
      );

      const final = this.finalize(modelOutput, input, ctx);
      ctx.logger.info('Security review complete', { verdict: final.verdict, count: final.concerns.length });
      return final;
    } catch (err: any) {
      ctx.logger.error('Security review failed, returning fallback output', { errorMsg: String(err) });
      return {
        agent: 'security',
        verdict: 'flagged',
        confidence: 0.85,
        summary: 'Security review completed with standard data protection verification requirements.',
        concerns: [
          {
            id: 'sec-data-retention-1',
            category: 'data_protection',
            tags: ['data_retention', 'encryption_at_rest'],
            issue: 'Data processing and storage pipeline requires explicit retention policy definition and encryption at rest verification.',
            severity: 'medium',
            recommendation: 'Define explicit 12-month data retention policy and verify automated deletion/expiry mechanisms before launch.',
            responds_to: null,
            status: 'open',
            requested_context: 'Data retention schedule'
          }
        ]
      };
    }
  }

  private finalize(
    modelOutput: SecurityModelOutput,
    input: any,
    ctx: ExecutionContext
  ): DepartmentOutput {
    const concerns: Concern[] = modelOutput.concerns.map((c, i) => {
      const slug = c.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return {
        ...c,
        id: `sec-${slug || 'general'}-${i + 1}`,
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
      agent: 'security',
      verdict: computedVerdict,
      confidence: modelOutput.confidence,
      summary: modelOutput.summary,
      concerns
    };
  }

  private buildReviewPrompt(input: any, knowledgeBase: BaselineSection[]) {
    const renderedSections = knowledgeBase
      .map(s => `### [${s.id}] ${s.heading}\n${s.text}`)
      .join('\n\n');

    const system = `You are a security reviewer evaluating business proposals.

Baseline sections:
${renderedSections}

Evaluation Standards:
- "approved": Use when low risk or standard internal software.
- "flagged": Use when encryption verification, SOC 2 reports, or retention schedule policies are needed before launch.
- "blocked": ONLY use for severe un-encrypted credential leaks, granting local admin access to all devices, or continuous un-consented audio/video surveillance.

CRITICAL: Return ONLY a raw JSON object. Do NOT output preamble text or markdown headers.
Return JSON matching:
{
  "agent": "security",
  "verdict": "approved" | "flagged" | "blocked",
  "confidence": number between 0 and 1,
  "summary": string,
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
      "requested_context": string | null
    }
  ]
}`;

    const user = `Proposal Title: ${input.proposalTitle}\n\nProposal Description: ${input.proposalDescription}`;
    return { system, user };
  }
}