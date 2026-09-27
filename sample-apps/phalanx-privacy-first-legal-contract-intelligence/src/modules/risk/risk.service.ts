import { Injectable } from '@nitrostack/core';
import { GraphService, ClauseCategory } from '../graph/graph.service.js';
import { LlmService } from '../llm/llm.service.js';

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type AgentKey = 'corporate' | 'financial' | 'liability' | 'privacy';

export interface Finding {
  id: string;
  agent: AgentKey;
  severity: Severity;
  category: string;
  issue: string;
  businessImpact: string;
  legalReason: string;
  clause: string;
  clauseTitle: string;
  page: number | null;
  clauseId: string | null;
  recommendation: string;
  benchmarkNote?: string;
  confidence: number;
}

export interface AgentReport {
  agent: AgentKey;
  label: string;
  graphId: string;
  source: 'llm' | 'heuristic';
  clausesExamined: number;
  score: number;
  strengths: string[];
  findings: Finding[];
}

const SEVERITY_WEIGHT: Record<Severity, number> = { Critical: 40, High: 25, Medium: 12, Low: 4 };

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings', 'strengths'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'severity', 'category', 'issue', 'businessImpact', 'legalReason',
          'clauseId', 'recommendation', 'confidence'
        ],
        properties: {
          severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
          category: { type: 'string' },
          issue: { type: 'string' },
          businessImpact: { type: 'string' },
          legalReason: { type: 'string' },
          clauseId: { type: 'string' },
          recommendation: { type: 'string' },
          benchmarkNote: { type: 'string' },
          confidence: { type: 'number' }
        }
      }
    },
    strengths: {
      type: 'array',
      items: { type: 'string' }
    }
  }
} as const;

/**
 * Shared discipline every agent prompt inherits. The token rules are the whole
 * privacy guarantee — an agent that speculates about what [CLIENT_NAME_001]
 * stands for has effectively de-redacted the document inside the model.
 */
const COMMON_RULES = `You are analyzing a REDACTED contract. Sensitive values appear as bracketed placeholder tokens, e.g. [CLIENT_NAME_001], [ACV_VALUE_003], [JURISDICTION_002], [MONEY_014], [PERCENTAGE_007].

Token discipline (non-negotiable):
- Reproduce tokens verbatim. Never substitute a guess for a token's real value.
- Never speculate about what a token represents ("presumably a Delaware entity", "likely around $1M"). If a risk assessment genuinely requires the hidden value, say so and flag it as a value-dependent risk.
- A token's presence is itself information: [ACV_VALUE_003] in a payment clause tells you a contract value is stated there, even though you cannot see it.

Analysis discipline:
- You advise the SMALLER party — a founder or startup counsel signing paper drafted by a larger counterparty. Asymmetry favouring the counterparty is a finding; asymmetry favouring your side is not.
- Anchor every finding to a clause id from the sub-graph you were given. The 'issue' must reference the actual contract language.
- Report only what the text supports. Do not invent clause language. Do not report a risk the clause actually addresses.
- Traverse the dependency edges. A liability cap in one clause may be gutted by a carve-out in another; a termination right may trigger an obligation elsewhere. Use this graph context while generating recommendations.
- Write 'businessImpact' for a non-lawyer founder (what could go wrong, in concrete business terms), 'legalReason' for a lawyer, and 'recommendation' as actionable negotiation advice.
- You must also identify strengths (e.g. "Confidentiality clause exists", "IP indemnification exists") and list them in the 'strengths' array.

Severity calibration:
- Critical: uncapped or existential exposure — unlimited liability, uncapped IP indemnity, perpetual unilateral licence to your IP.
- High: material and hard to unwind — asymmetric indemnity, missing breach-notification window, auto-renewal with an unreasonably short opt-out.
- Medium: unfavourable versus market but survivable — Net-60 payment terms, one-sided audit rights.
- Low: cosmetic, administrative, or mildly off-market.

Set confidence between 0 and 1, reflecting how strongly the clause text supports the finding.`;

interface AgentSpec {
  key: AgentKey;
  label: string;
  categories: ClauseCategory[];
  system: string;
  /** Local deterministic checks, used when no model is configured. */
  heuristics: Array<{
    severity: Severity;
    category: string;
    title: string;
    description: string;
    recommendation: string;
    /** Fires when `present` matches somewhere and `absent` matches nowhere. */
    present?: RegExp;
    absent?: RegExp;
  }>;
}

const AGENTS: Record<AgentKey, AgentSpec> = {
  corporate: {
    key: 'corporate',
    label: 'Corporate Due-Diligence Agent',
    categories: [
      'parties', 'governing_law', 'jurisdiction', 'assignment',
      'term_and_termination', 'force_majeure'
    ],
    system: `${COMMON_RULES}

Your role: Corporate Due-Diligence Agent. You examine the entity and jurisdiction structure of the agreement — who is actually bound, under whose law, and what happens to the deal when corporate structure changes.

Focus areas:
1. Party identification. Is the contracting entity the operating company or a thinly-capitalized subsidiary? Does the counterparty bind its affiliates while your side is bound alone? Are affiliate obligations one-directional?
2. Governing law and venue. Is the forum remote or expensive relative to a startup's ability to litigate? Is arbitration mandatory, and if so where, under whose rules, and who bears costs? Is there a jury-trial or class-action waiver?
3. Assignment and change of control. Can the counterparty assign freely (including on acquisition) while your side needs consent? A one-way assignment right is a real diligence problem: an acquirer inherits the counterparty's rights without your approval. Conversely, an anti-assignment clause with no change-of-control carve-out can block your own exit or require counterparty consent mid-acquisition — flag that as an M&A blocker.
4. Term and termination symmetry. Can one side terminate for convenience while the other cannot? Are cure periods reciprocal? Does termination strand your side with continuing obligations (fees, exclusivity, non-compete) after the counterparty walks?
5. Survival and force majeure. Which obligations survive termination, and is that list asymmetric? Does force majeure excuse the counterparty's performance while your payment obligation continues?

Signals worth flagging even when drafting looks routine: a governing-law token paired with an entity token from a different apparent jurisdiction; unilateral amendment rights ("Provider may update these terms"); flow-down obligations to unnamed affiliates.`,
    heuristics: [
      {
        severity: 'High',
        category: 'Assignment',
        title: 'One-way assignment right',
        description:
          'The counterparty can assign or transfer the agreement without your consent, including on an acquisition. An acquirer — potentially a competitor — would inherit its rights over you.',
        recommendation:
          'Make assignment mutual, or require consent for assignment to a competitor. A change-of-control carve-out for both parties is standard.',
        present: /\b(may assign|shall be entitled to assign|freely assignable)\b/i,
        absent: /\b(mutually assign|neither party may assign|either party may assign)\b/i
      },
      {
        severity: 'High',
        category: 'Termination',
        title: 'Asymmetric termination for convenience',
        description:
          'One party can walk away for convenience while the other is locked in for the full term, removing revenue predictability on your side.',
        recommendation:
          'Make termination for convenience mutual, or remove it and rely on termination for cause.',
        present: /\bterminate\b[^.]{0,120}\bfor convenience\b/i,
        absent: /\beither party may terminate\b[^.]{0,80}\bfor convenience\b/i
      },
      {
        severity: 'Medium',
        category: 'Dispute Resolution',
        title: 'Mandatory arbitration with unspecified cost allocation',
        description:
          'Disputes must go to arbitration, but the clause does not say who bears arbitrator and administrative fees. Those costs can exceed the value of a small claim, effectively removing your remedy.',
        recommendation:
          'Specify that each party bears its own costs with arbitrator fees split, or add a small-claims carve-out.',
        present: /\barbitration\b/i,
        absent: /\b(each party shall bear|costs shall be (?:shared|split)|prevailing party)\b/i
      },
      {
        severity: 'Medium',
        category: 'Amendment',
        title: 'Unilateral amendment right',
        description:
          'The counterparty can change contract terms on notice without your agreement, so terms you diligenced can shift after signing.',
        recommendation:
          'Require mutual written agreement for amendments, or at minimum a right to terminate without penalty if terms change materially.',
        present: /\b(?:may|reserves the right to)\s+(?:modify|amend|update|change)\s+(?:these|this|the)\s+(?:terms|agreement)\b/i,
        absent: /\bwritten (?:agreement|consent) of both parties\b/i
      },
      {
        severity: 'Low',
        category: 'Corporate Structure',
        title: 'Governing law clause not identified',
        description:
          'No governing law provision was found in the entity and jurisdiction subgraph. Absent a choice of law, a dispute could be litigated under rules neither side planned for.',
        recommendation: 'Add an express governing law and venue clause.',
        absent: /\b(governing law|governed by the laws|construed in accordance with the laws)\b/i
      }
    ]
  },

  financial: {
    key: 'financial',
    label: 'Financial & Renewal Risk Agent',
    categories: ['payment', 'renewal', 'term_and_termination', 'sla', 'audit'],
    system: `${COMMON_RULES}

Your role: Financial & Renewal Risk Agent. You examine cash-flow mechanics and the lock-in economics of the deal.

Focus areas:
1. Payment terms. What is the net period? Net-30 is market; Net-45 is a concession; Net-60 or worse is a cash-flow risk and a finding. Are late-payment interest rights reciprocal? Is there a right to suspend service on non-payment, with reasonable notice?
2. Auto-renewal mechanics — the highest-value area in this subgraph. Look for renewal term length, the non-renewal notice window, whether notice must be written to a specific address, and whether the window is unreasonably early relative to the term. A 90-day opt-out on a 12-month term forces the decision at month 9 — flag it. Evergreen renewal with no stated end is worse.
3. Pricing escalation. Is there a cap on renewal increases? An uncapped increase paired with auto-renewal and a narrow opt-out window is a compounding trap — price can rise after the opt-out has passed. Treat that combination as at least High.
4. Fee commitments and true-ups. Are minimum commitments, overage rates, or true-up mechanics stated? Are unused prepaid amounts forfeited? Is there a shortfall penalty?
5. Disputed invoices. Can your side withhold a genuinely disputed amount without triggering breach or suspension? Absence of a dispute carve-out is a real finding.
6. SLA and service credits. Are credits the sole remedy for downtime? Are they capped so low they do not motivate performance? Must they be claimed within a short window or be forfeited?
7. Audit rights. One-sided audit rights with short notice, broad scope, and your side bearing cost are unfavourable — especially where a finding triggers retroactive fees.

Explicitly link renewal, payment, and termination clauses using the dependency edges. The exploitable combinations usually live across clauses, not inside one.`,
    heuristics: [
      {
        severity: 'High',
        category: 'Renewal',
        title: 'Auto-renewal with a long non-renewal notice window',
        description:
          'The agreement renews automatically unless notice is given well in advance. Miss the window and you are committed to another full term on the counterparty’s terms.',
        recommendation:
          'Shorten the notice window to 30 days, and require the counterparty to send a renewal reminder before the window opens.',
        present: /\b(automatically renew|auto-?renew|shall renew)\b[^.]{0,200}\b(?:ninety|90|one hundred twenty|120|sixty|60)\b[^.]{0,20}\bdays\b/i
      },
      {
        severity: 'High',
        category: 'Pricing',
        title: 'Uncapped renewal price increase',
        description:
          'Fees can be increased at renewal with no stated ceiling. Combined with automatic renewal, price can rise after the opt-out window has already closed.',
        recommendation:
          'Cap renewal increases at a fixed percentage or CPI, and require price notice before the non-renewal deadline.',
        present: /\b(increase|adjust|revise)\b[^.]{0,80}\b(fees|pricing|rates)\b/i,
        absent: /\b(shall not (?:increase|exceed)|capped at|no more than \d+\s?(?:%|percent)|CPI)\b/i
      },
      {
        severity: 'Medium',
        category: 'Payment Terms',
        title: 'Extended payment terms',
        description:
          'Payment is due later than the Net-30 market standard, pushing working-capital strain onto your side.',
        recommendation: 'Negotiate Net-30, or add late-payment interest and a right to suspend service.',
        present: /\bnet\s?(?:45|60|75|90|120)\b|\b(?:sixty|ninety|forty-five)\b[^.]{0,20}\bdays\b[^.]{0,60}\b(?:invoice|payment|payable)\b/i
      },
      {
        severity: 'Medium',
        category: 'Payment Terms',
        title: 'No carve-out for disputed invoices',
        description:
          'Payment obligations do not exempt amounts genuinely in dispute, so withholding a contested charge could itself be a breach and trigger suspension.',
        recommendation:
          'Add a good-faith dispute carve-out: disputed amounts are not overdue while the parties work through a defined escalation process.',
        present: /\b(invoice|payment|fees)\b/i,
        absent: /\b(disputed|good faith dispute|undisputed)\b/i
      },
      {
        severity: 'Medium',
        category: 'SLA',
        title: 'Service credits as sole remedy',
        description:
          'Service credits are the only remedy for missed service levels, so sustained poor performance produces a small credit rather than a right to exit.',
        recommendation:
          'Add a termination right for chronic SLA failure (for example three consecutive months below target) alongside credits.',
        present: /\bservice credits?\b[^.]{0,120}\b(sole|exclusive)\s+remedy\b/i
      },
      {
        severity: 'Low',
        category: 'Commitments',
        title: 'Prepaid amounts forfeited on termination',
        description: 'Prepaid or unused fees are non-refundable, so early termination forfeits committed spend.',
        recommendation: 'Request pro-rata refund of prepaid fees on termination for the counterparty’s breach.',
        present: /\b(non-?refundable|no refund|shall not be refunded)\b/i
      }
    ]
  },

  liability: {
    key: 'liability',
    label: 'Liability & Indemnification Agent',
    categories: ['liability', 'indemnity', 'ip_ownership', 'term_and_termination'],
    system: `${COMMON_RULES}

Your role: Liability & Indemnification Agent. You quantify worst-case exposure. This is the highest-stakes subgraph in the contract — an uncapped indemnity can exceed the company's entire enterprise value.

Focus areas:
1. Liability cap. Is there one at all? Is it expressed as a multiple of fees paid, a fixed amount, or trailing-12-month fees? For a startup, a cap at 12 months of fees is market; a cap far above contract value, or no cap, is Critical. Absence of any limitation-of-liability clause is Critical, not Medium.
2. Cap carve-outs — where caps are quietly destroyed. Enumerate every exclusion: IP infringement, confidentiality breach, data breach, gross negligence, willful misconduct, indemnification obligations, payment obligations. A cap with an unlimited carve-out for "any breach of confidentiality" or "any indemnification obligation" is functionally no cap — say so explicitly and rate it Critical or High.
3. Consequential-damages exclusion. Are indirect, incidental, special, punitive, and consequential losses excluded — and is the exclusion MUTUAL? A one-way exclusion protecting only the counterparty is a serious finding. Check specifically for lost profits and loss of data.
4. Indemnity scope and symmetry. Who indemnifies whom, for what? An indemnity from your side covering "any claim arising from the Services" is open-ended. Look for uncapped IP indemnity, indemnity for the counterparty's own negligence, third-party claim indemnity with no defence-control rights, and indemnity obligations surviving termination indefinitely.
5. Indemnity procedure. Does the indemnified party control the defence and settlement? Can it settle without your consent and bill you? Is prompt notice a condition, and does late notice void the indemnity entirely?
6. Insurance requirements. Are required coverage levels proportionate to a startup's ability to obtain them, or would compliance require coverage you cannot buy?

Compute exposure structurally: cap value, minus every carve-out, against indemnity scope. State the reasoning in the description so a founder can see how the pieces interact. Where the cap references a redacted amount token, say that its adequacy cannot be assessed without the underlying value.`,
    heuristics: [
      {
        severity: 'Critical',
        category: 'Liability',
        title: 'No limitation of liability clause found',
        description:
          'The liability subgraph contains no cap on damages. Exposure is unlimited and can exceed the value of both the contract and the company.',
        recommendation:
          'Add a mutual liability cap at the greater of fees paid in the trailing 12 months or a fixed negotiated amount.',
        absent: /\b(limitation of liability|aggregate liability|total liability|liability shall not exceed|in no event shall)\b/i
      },
      {
        severity: 'Critical',
        category: 'Indemnification',
        title: 'Uncapped indemnification obligation',
        description:
          'An indemnification obligation is carved out of the liability cap, so the cap does not constrain it. This is unlimited exposure behind a cap that looks protective on paper.',
        recommendation:
          'Bring indemnification inside the cap, or set a separate super-cap (for example 2x annual fees) for indemnity claims.',
        present: /\b(?:except|excluding|other than|shall not apply to)\b[^.]{0,140}\bindemnif/i
      },
      {
        severity: 'Critical',
        category: 'Indemnification',
        title: 'Uncapped IP infringement indemnity',
        description:
          'Intellectual-property indemnification sits outside the liability cap. A single third-party infringement claim could produce liability far beyond contract value.',
        recommendation:
          'Cap IP indemnity at a specific amount, and add the standard remedy ladder: procure a licence, modify the offering, or refund and terminate.',
        present: /\b(?:except|excluding|shall not apply to)\b[^.]{0,140}\b(?:intellectual property|infringement)\b/i
      },
      {
        severity: 'High',
        category: 'Liability',
        title: 'Consequential damages not excluded',
        description:
          'The agreement does not exclude indirect, incidental, or consequential damages. Lost profits and business-interruption claims remain on the table even where a cap exists.',
        recommendation:
          'Add a mutual exclusion of indirect, incidental, special, punitive, and consequential damages, expressly including lost profits and loss of data.',
        absent: /\b(indirect|consequential|incidental)\b[^.]{0,80}\bdamages\b/i
      },
      {
        severity: 'High',
        category: 'Indemnification',
        title: 'Broad or one-sided indemnification obligation',
        description:
          'Your side indemnifies the counterparty against claims described in open-ended terms ("any and all claims") with no reciprocal obligation flowing back.',
        recommendation:
          'Make indemnification mutual and narrow the trigger to third-party claims arising from your own breach, negligence, or IP infringement.',
        present: /\bindemnif\w+\b[^.]{0,120}\b(?:any and all|all)\s+(?:claims|losses|liabilities)\b/i
      },
      {
        severity: 'Medium',
        category: 'Indemnification',
        title: 'No defence-control or settlement-consent right',
        description:
          'The indemnity does not say who controls the defence or whether settlement requires your consent. The counterparty could settle on unfavourable terms and invoice you for the result.',
        recommendation:
          'Add the standard procedure: the indemnifying party controls the defence, and no settlement imposing obligations on the other party without its written consent.',
        present: /\bindemnif/i,
        absent: /\b(control (?:of )?the defen[cs]e|sole control|without .{0,30}(?:prior )?written consent)\b/i
      }
    ]
  },

  privacy: {
    key: 'privacy',
    label: 'Privacy & Compliance Agent',
    categories: ['data_protection', 'confidentiality', 'audit', 'ip_ownership', 'term_and_termination'],
    system: `${COMMON_RULES}

Your role: Privacy & Compliance Agent. You examine data-protection and confidentiality obligations, and whether they are operationally achievable.

Focus areas:
1. Breach notification — the most common serious gap. Is there a stated deadline for notifying the other party of a security incident? "Without undue delay" with no outer bound is unenforceable in practice — flag it. Market is without undue delay and in no event later than 48 or 72 hours. Also check who bears breach-response, forensics, and notification costs.
2. Regulatory framework. Are GDPR, CCPA/CPRA, or other applicable regimes referenced at all? Is the processor/controller relationship defined? For a DPA, is a transfer mechanism (Standard Contractual Clauses or equivalent) identified for cross-border flows? A DPA with no transfer mechanism is a High finding.
3. Sub-processors. Can the counterparty add sub-processors without notice or objection rights? Is there a list, a notification duty, and a right to object? Does the counterparty remain liable for its sub-processors' acts? Unlimited discretion with no flow-down liability is a real finding.
4. Data location and transfer. Where is data stored and processed? Does the agreement permit transfer to jurisdictions the customer has not approved?
5. Data return and deletion. On termination, is there a defined deletion timeline and a certification obligation? Traverse the termination dependency edge: a termination clause with no linked deletion obligation is itself a finding. Watch for indefinite retention framed as "backup and archival purposes".
6. Confidentiality scope and duration. Is the definition of Confidential Information mutual? Is the duration perpetual for one side only? Are the standard carve-outs present (independently developed, publicly available, rightfully received, required by law)? Is there a residual-knowledge clause, and does it favour the counterparty?
7. Security commitments. Are controls specified concretely (encryption at rest and in transit, access control, audits, SOC 2 or ISO 27001) or hand-waved as "commercially reasonable"? Are audit and penetration-test rights available, and at whose cost?
8. Achievability. Flag obligations a startup cannot realistically meet: a 24-hour breach-notification window with no triage allowance, unlimited on-site audit rights, or mandated certifications not yet obtained. An obligation you will breach on day one is a risk even when it looks customer-friendly.

Where a data-centre or jurisdiction token appears, note the transfer implications structurally without guessing the location.`,
    heuristics: [
      {
        severity: 'Critical',
        category: 'Data Security',
        title: 'No breach notification deadline',
        description:
          'The agreement requires notice of a security incident but sets no outer time limit, so "without undue delay" is unbounded. This fails regulatory expectations and leaves the customer unable to meet its own notification duties.',
        recommendation:
          'Specify notification without undue delay and in no event later than 48 hours after confirming a security incident, plus a defined content requirement for the notice.',
        present: /\b(security incident|data breach|breach of security|personal data breach)\b/i,
        absent: /\b(?:within|no later than|not later than)\b[^.]{0,30}\b(?:hours|business days|days)\b/i
      },
      {
        severity: 'High',
        category: 'Privacy Compliance',
        title: 'No reference to applicable privacy regulation',
        description:
          'The data-protection subgraph does not reference GDPR, CCPA, or any equivalent framework, so the controller/processor allocation and data-subject rights handling are undefined.',
        recommendation:
          'Add an express data-protection addendum identifying the applicable regimes, the parties’ roles, and the transfer mechanism for cross-border flows.',
        absent: /\b(GDPR|CCPA|CPRA|General Data Protection Regulation|Standard Contractual Clauses|data protection law)\b/i
      },
      {
        severity: 'High',
        category: 'Sub-processors',
        title: 'Unrestricted sub-processor appointment',
        description:
          'Sub-processors can be engaged without notice or a right to object, and the clause does not make the counterparty liable for their acts. Your data can reach parties you never approved.',
        recommendation:
          'Require advance notice of new sub-processors, a right to object, and express liability for sub-processor acts and omissions.',
        present: /\bsub-?processors?\b/i,
        absent: /\b(right to object|prior (?:written )?(?:notice|consent)|shall remain (?:fully )?liable)\b/i
      },
      {
        severity: 'High',
        category: 'Data Retention',
        title: 'No data deletion obligation on termination',
        description:
          'Termination does not trigger a defined obligation to return or delete customer data, so data may be retained indefinitely after the relationship ends.',
        recommendation:
          'Add return-or-delete within 30 days of termination, with written certification of deletion and a narrow, time-bounded backup exception.',
        present: /\bterminat/i,
        absent: /\b(delete|deletion|destroy|return of (?:customer )?data|purge)\b/i
      },
      {
        severity: 'Medium',
        category: 'Security',
        title: 'Vague security commitments',
        description:
          'Security obligations are framed as "commercially reasonable" or "industry standard" with no concrete controls named, making the commitment unenforceable in practice.',
        recommendation:
          'Specify concrete controls: encryption in transit and at rest, access control, annual penetration testing, and a named certification such as SOC 2 Type II or ISO 27001.',
        present: /\b(commercially reasonable|industry standard)\b[^.]{0,80}\b(security|safeguards|measures)\b/i,
        absent: /\b(SOC 2|ISO 27001|encryption at rest|AES-256|penetration test)\b/i
      },
      {
        severity: 'Medium',
        category: 'Confidentiality',
        title: 'Asymmetric or perpetual confidentiality obligation',
        description:
          'Confidentiality runs indefinitely, or binds one side more heavily than the other. Perpetual obligations are hard to administer and can outlast the information’s sensitivity.',
        recommendation:
          'Make confidentiality mutual with a defined term (typically 3–5 years post-termination), keeping perpetual protection only for trade secrets.',
        present: /\b(in perpetuity|perpetual|indefinitely)\b[^.]{0,100}\bconfidential/i
      }
    ]
  }
};

@Injectable({ deps: [GraphService, LlmService] })
export class RiskService {
  constructor(
    private graphService: GraphService,
    private llm: LlmService
  ) { }

  listAgents(): Array<{ agent: AgentKey; label: string; categories: string[] }> {
    return Object.values(AGENTS).map((a) => ({
      agent: a.key,
      label: a.label,
      categories: a.categories
    }));
  }

  /** Run one specialized agent against its slice of the graph. */
  async runAgent(agentKey: AgentKey, graphId: string): Promise<AgentReport> {
    const spec = AGENTS[agentKey];
    if (!spec) throw new Error(`Unknown agent: ${agentKey}`);

    const subgraph = this.graphService.query(graphId, spec.categories);

    let res = await this.runAgentWithLlm(spec, subgraph);
    let source: 'llm' | 'heuristic' = 'llm';

    if (!res) {
      res = this.runAgentHeuristically(spec, subgraph);
      source = 'heuristic';
    }

    return {
      agent: spec.key,
      label: spec.label,
      graphId,
      source,
      clausesExamined: subgraph.clauses.length,
      score: this.score(res),
      strengths: res.strengths || [],
      findings: res.findings
    };
  }

  /** Run all four agents concurrently. */
  async runAllAgents(graphId: string): Promise<{
    graphId: string;
    totalScore: number;
    scoreBreakdown: Record<string, number>;
    strengths: string[];
    reports: AgentReport[];
    findings: Finding[];
  }> {
    const reports = await Promise.all(
      (Object.keys(AGENTS) as AgentKey[]).map((key) => this.runAgent(key, graphId))
    );

    const findings = reports
      .flatMap((r) => r.findings)
      .sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]);
      
    const strengths = reports.flatMap(r => r.strengths || []);

    const scoreBreakdown: Record<string, number> = {};
    for (const r of reports) {
      // rough breakdown per agent. +15 for critical, etc., negative for strengths.
      let agentScore = r.findings.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0);
      agentScore -= (r.strengths?.length || 0) * 2; // subtract for strengths
      scoreBreakdown[r.label] = agentScore;
    }

    return {
      graphId,
      totalScore: Math.min(100, Math.max(0, reports.reduce((sum, r) => sum + r.score, 0) - strengths.length * 2)),
      scoreBreakdown,
      strengths,
      reports,
      findings
    };
  }

  private async runAgentWithLlm(
    spec: AgentSpec,
    subgraph: ReturnType<GraphService['query']>
  ): Promise<{ findings: Finding[]; strengths: string[] } | null> {
    if (!this.llm.available || subgraph.clauses.length === 0) return null;

    const clauseBlock = subgraph.clauses
      .map(
        (c) =>
          `<clause id="${c.id}" category="${c.category}" title="${c.heading}" obligor="${c.obligor ?? 'unspecified'}" obligee="${c.obligee ?? 'unspecified'}">\n${c.text}\n</clause>`
      )
      .join('\n\n');

    const entityBlock = subgraph.entities
      .map((e) => `- ${e.id}: ${e.label} (${e.entityType})`)
      .join('\n');

    const relationBlock = subgraph.relations
      .map((r) => `- ${r.from} --${r.relation}--> ${r.to}${r.note ? ` (${r.note})` : ''}`)
      .join('\n');

    const user = `Analyze the sub-graph below and report every risk within your remit.

## Clauses
${clauseBlock}

## Entity nodes
${entityBlock || '(none)'}

## Dependency edges
${relationBlock || '(none)'}

Return findings ordered most severe first. Return an empty array only if the clauses genuinely contain no risk in your area — do not invent findings to fill space, and do not omit a real one because it seems obvious.`;

    const result = await this.llm.json<{
      findings: Array<Omit<Finding, 'id' | 'agent' | 'clause' | 'clauseTitle' | 'page'>>;
      strengths: string[];
    }>({
      system: spec.system,
      user,
      schema: FINDINGS_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 16000,
      effort: 'high'
    });

    if (!result?.findings) return { findings: [], strengths: [] } as any;

    const clauseData = new Map(subgraph.clauses.map((c) => [c.id, { text: c.text, title: c.heading, page: null }]));

    const mappedFindings = result.findings.map((f, i) => {
      const c = clauseData.get(f.clauseId ?? '') ?? { text: '', title: '', page: null };
      return {
        ...f,
        id: `${spec.key}_${i + 1}`,
        agent: spec.key,
        clauseId: f.clauseId ?? null,
        clause: c.text,
        clauseTitle: c.title,
        page: c.page
      };
    });

    return { findings: mappedFindings, strengths: result.strengths || [] } as any;
  }

  /**
   * Deterministic local fallback. A heuristic fires when its `present` pattern
   * matches somewhere in the subgraph and its `absent` pattern matches nowhere.
   */
  private runAgentHeuristically(
    spec: AgentSpec,
    subgraph: ReturnType<GraphService['query']>
  ): { findings: Finding[]; strengths: string[] } {
    const corpus = subgraph.clauses.map((c) => `${c.heading}\n${c.text}`).join('\n\n');
    if (!corpus.trim()) return { findings: [], strengths: [] };

    const findings: Finding[] = [];

    for (const rule of spec.heuristics) {
      if (rule.present && !new RegExp(rule.present.source, rule.present.flags).test(corpus)) continue;
      if (rule.absent && new RegExp(rule.absent.source, rule.absent.flags).test(corpus)) continue;

      // Anchor to whichever clause actually produced the match.
      const anchor = rule.present
        ? subgraph.clauses.find((c) =>
          new RegExp(rule.present!.source, rule.present!.flags).test(`${c.heading}\n${c.text}`)
        ) ?? subgraph.clauses[0]
        : subgraph.clauses[0];

      findings.push({
        id: `${spec.key}_h${findings.length + 1}`,
        agent: spec.key,
        severity: rule.severity,
        category: rule.category,
        issue: rule.title,
        businessImpact: rule.description,
        legalReason: 'Local rules-engine finding',
        clause: anchor?.text ?? '',
        clauseTitle: anchor?.heading ?? '',
        page: null,
        clauseId: anchor?.id ?? null,
        recommendation: rule.recommendation,
        benchmarkNote: 'Local rules-engine finding — no model configured for this run.',
        confidence: rule.present ? 0.7 : 0.6
      });
    }

    return {
      findings: findings.sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]),
      strengths: []
    } as any;
  }

  private score(result: any): number {
    return Math.min(100, Math.max(0, result.findings.reduce((sum: number, f: any) => sum + SEVERITY_WEIGHT[f.severity as Severity], 0) - (result.strengths?.length || 0) * 2));
  }
}
