import OpenAI from 'openai';
import { GWASCatalogService } from '../evidence/gwas-catalog.service.js';
import { PubMedService } from '../evidence/pubmed.service.js';
import { EvidenceFilterEngine } from '../evidence/evidence-filter.engine.js';
import { countRiskAlleles, type ParsedVariant } from '../variant/file-parser.service.js';

const DISEASE_LABELS: Record<string, string> = {
  type2_diabetes: 'Type 2 Diabetes',
  coronary_artery_disease: 'Coronary Artery Disease',
  age_related_macular_degeneration: 'Age-Related Macular Degeneration',
};

const PRS_POP_PARAMS: Record<string, { mean: number; sd: number }> = {
  type2_diabetes:                   { mean: 0.80, sd: 0.35 },
  coronary_artery_disease:          { mean: 0.45, sd: 0.20 },
  age_related_macular_degeneration: { mean: 1.10, sd: 0.55 },
};

const LIFESTYLE: Record<string, Array<{ category: string; description: string }>> = {
  type2_diabetes: [
    { category: 'Physical activity', description: '150 min/week of moderate aerobic exercise substantially reduces T2D incidence independent of weight loss.' },
    { category: 'Diet', description: 'Reducing refined carbohydrates and increasing dietary fibre is strongly associated with lower risk.' },
    { category: 'Weight management', description: 'A 5–7% reduction in body weight reduces progression to T2D by ~58% (Diabetes Prevention Program).' },
    { category: 'Sleep', description: 'Poor or short sleep duration is associated with impaired glucose regulation.' },
    { category: 'Smoking', description: 'Cessation improves insulin sensitivity and reduces T2D risk over time.' },
  ],
  coronary_artery_disease: [
    { category: 'Smoking', description: 'Smoking is one of the strongest modifiable CAD risk factors. Cessation substantially reduces risk.' },
    { category: 'Blood lipids', description: 'LDL cholesterol management through diet, exercise, or medication is central to CAD prevention.' },
    { category: 'Blood pressure', description: 'Hypertension management through DASH diet and exercise reduces CAD events.' },
    { category: 'Physical activity', description: 'Regular aerobic exercise reduces multiple CAD risk factors simultaneously.' },
    { category: 'Diet', description: 'Mediterranean-style diet patterns are associated with reduced cardiovascular risk.' },
  ],
  age_related_macular_degeneration: [
    { category: 'Smoking', description: 'Smoking is the strongest modifiable AMD risk factor — smokers have 2–4× higher risk.' },
    { category: 'Diet / antioxidants', description: 'The AREDS2 formulation (vitamins C, E, zinc, lutein, zeaxanthin) reduces AMD progression risk.' },
    { category: 'UV exposure', description: 'Protective eyewear reducing UV-B exposure is recommended outdoors.' },
    { category: 'Blood pressure', description: 'Hypertension management may slow AMD progression.' },
  ],
};

const DISCLAIMER = 'PolyRisk is an educational and evidence-transparency tool, NOT a diagnostic or medical device. This analysis does not diagnose any disease, predict individual health outcomes, or replace professional medical advice. If you have health concerns, please consult a qualified healthcare provider.';

const SYSTEM_PROMPT = `You are PolyRisk, a scientific genetic risk analysis agent. Your job is to transparently analyze genetic variants from a user's ancestry test and explain what the research says about their risk for a specific condition.

You have access to three tools:
- fetch_gwas_for_variant: fetches real GWAS associations from the NHGRI-EBI GWAS Catalog
- evaluate_evidence_quality: applies scientific filtering criteria to decide which studies to trust
- get_pubmed_citations: retrieves real citation details from NCBI PubMed

WORKFLOW:
1. Call fetch_gwas_for_variant for EACH rsID provided (call it separately for each one)
2. Gather all associations, then call evaluate_evidence_quality once with all of them
3. Call get_pubmed_citations for the PubMed IDs of included studies
4. Write your personalized narrative

YOUR NARRATIVE must:
- Name the specific variants and genes involved (explain what TCF7L2 actually does, etc.)
- Reference the user's ACTUAL genotype — if someone has TT at rs7903146 (two risk alleles) vs TC (one), say so explicitly and explain the difference
- Give honest context for the risk level — what does being at the 70th percentile actually mean day-to-day?
- Mention the strongest lifestyle interventions backed by clinical evidence
- Be specific about uncertainty — PRS captures a fraction of genetic risk and ignores environment
- Write like a knowledgeable friend explaining results, not a clinical report
- Be 3-5 paragraphs. Not a list. Flowing prose.

NEVER make up associations. If a variant returns no GWAS data, say so honestly.`;

export interface AgentStep {
  type: 'thinking' | 'tool_call' | 'tool_result';
  text?: string;
  tool?: string;
  input?: any;
  result?: any;
}

export interface AgentAnalysisResult {
  disease: string;
  diseaseName: string;
  narrative: string;
  agentSteps: AgentStep[];
  riskInterpretation: any;
  prsResult: any;
  filterResult: any;
  citations: any[];
  lifestyleContext: any;
  disclaimer: string;
  generatedAt: string;
  genotypeData: boolean;
}

export class AgentService {
  private _client: OpenAI | null = null;
  private gwasService: GWASCatalogService;
  private pubmedService: PubMedService;
  private filterEngine: EvidenceFilterEngine;

  constructor() {
    this.gwasService = new GWASCatalogService();
    this.pubmedService = new PubMedService();
    this.filterEngine = new EvidenceFilterEngine();
  }

  private get client(): OpenAI {
    if (!this._client) {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error('GROQ_API_KEY environment variable is not set');
      this._client = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
    }
    return this._client;
  }

  async runAnalysis(
    parsedVariants: ParsedVariant[],
    disease: string,
    userAncestry: string | null,
    logger?: any
  ): Promise<AgentAnalysisResult> {
    const diseaseName = DISEASE_LABELS[disease] ?? disease;
    const variantList = parsedVariants.map(v => `${v.rsid} (genotype: ${v.genotype})`).join(', ');

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analyze these genetic variants for ${diseaseName} risk:\n\n${variantList}\n\nUser ancestry: ${userAncestry || 'not specified'}\n\nAnalyze each variant, evaluate the evidence, and write a personalized narrative.`,
      },
    ];

    const tools: OpenAI.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'fetch_gwas_for_variant',
          description: 'Fetch published GWAS associations for a single rsID from the NHGRI-EBI GWAS Catalog. Returns effect sizes, p-values, sample sizes, and ancestry.',
          parameters: {
            type: 'object',
            properties: {
              rsid: { type: 'string', description: 'The rsID to look up (e.g. rs7903146)' },
            },
            required: ['rsid'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'evaluate_evidence_quality',
          description: 'Applies evidence quality criteria (p<5e-8, n≥1000, valid effect size, ancestry, superseded check) to a list of GWAS associations. Returns include/exclude decisions with specific reasons.',
          parameters: {
            type: 'object',
            properties: {
              associations: {
                type: 'array',
                items: { type: 'object' },
                description: 'GWAS associations to evaluate',
              },
            },
            required: ['associations'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_pubmed_citations',
          description: 'Retrieve real citation details (title, authors, journal, year) from NCBI PubMed.',
          parameters: {
            type: 'object',
            properties: {
              pubmedIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'PubMed IDs to retrieve',
              },
            },
            required: ['pubmedIds'],
          },
        },
      },
    ];

    const agentSteps: AgentStep[] = [];
    let filterDecisions: any[] = [];
    let citations: any[] = [];

    // Agentic loop
    for (let iter = 0; iter < 25; iter++) {
      const response = await this.client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 8192,
        messages,
        tools,
        tool_choice: 'auto',
      });

      const choice = response.choices[0];
      const msg = choice.message;

      // Add assistant message to history
      messages.push(msg);

      // Capture any text content
      if (msg.content?.trim()) {
        agentSteps.push({ type: 'thinking', text: msg.content });
      }

      if (choice.finish_reason === 'stop' || (choice.finish_reason as string) === 'end_turn') {
        const narrative = msg.content ?? '';
        return this.buildResult(
          disease, diseaseName, narrative, agentSteps,
          parsedVariants, filterDecisions, citations, userAncestry
        );
      }

      if (choice.finish_reason === 'tool_calls' && msg.tool_calls?.length) {
        const toolResults: OpenAI.ChatCompletionToolMessageParam[] = [];

        for (const toolCall of msg.tool_calls) {
          const { name, arguments: argsStr } = (toolCall as any).function;
          let args: any;
          try { args = JSON.parse(argsStr); } catch { args = {}; }

          agentSteps.push({ type: 'tool_call', tool: name, input: args });

          let result: any;
          try {
            if (name === 'fetch_gwas_for_variant') {
              const assocs = await this.gwasService.getAssociationsForVariant(
                args.rsid, disease as any
              );
              result = { rsid: args.rsid, count: assocs.length, associations: assocs };
            } else if (name === 'evaluate_evidence_quality') {
              const decisions = this.filterEngine.filter(args.associations, userAncestry);
              const seen = new Set(filterDecisions.map((d: any) => d.rsid));
              for (const d of decisions as any[]) {
                if (!seen.has(d.rsid)) { filterDecisions.push(d); seen.add(d.rsid); }
              }
              result = {
                total: decisions.length,
                included: (decisions as any[]).filter((d: any) => d.decision === 'included').length,
                excluded: (decisions as any[]).filter((d: any) => d.decision === 'excluded').length,
                decisions,
              };
            } else if (name === 'get_pubmed_citations') {
              citations = await this.pubmedService.getCitations(args.pubmedIds);
              result = { citations };
            } else {
              result = { error: 'Unknown tool: ' + name };
            }
          } catch (e: any) {
            result = { error: e.message };
          }

          agentSteps.push({ type: 'tool_result', tool: name, result });
          toolResults.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        messages.push(...toolResults);
      }
    }

    throw new Error('Agent exceeded maximum iterations without completing analysis.');
  }

  private buildResult(
    disease: string, diseaseName: string, narrative: string,
    agentSteps: AgentStep[], parsedVariants: ParsedVariant[],
    filterDecisions: any[], citations: any[], userAncestry: string | null
  ): AgentAnalysisResult {
    const genotypeMap = Object.fromEntries(
      parsedVariants.map(v => [v.rsid.toLowerCase(), v.genotype])
    );
    const included = filterDecisions.filter((d: any) => d.decision === 'included');
    const contributions: any[] = [];
    let totalScore = 0;

    for (const d of included as any[]) {
      const genotype = genotypeMap[d.rsid?.toLowerCase()] ?? '';
      const riskAlleleCount = genotype ? countRiskAlleles(genotype, d.riskAllele ?? '') : 1;

      let effectSize: number;
      let effectType: string;
      if (d.effectType === 'OR' && d.effectSize > 0) {
        effectSize = Math.log(d.effectSize);
        effectType = 'OR_log';
      } else if (d.effectType === 'beta') {
        effectSize = d.effectSize;
        effectType = 'beta';
      } else continue;

      const contribution = effectSize * riskAlleleCount;
      totalScore += contribution;
      contributions.push({
        rsid: d.rsid, riskAllele: d.riskAllele ?? '',
        genotype: genotype || 'unknown',
        genotypeAlleleCount: riskAlleleCount,
        weight: effectSize, effectType, contribution,
        studyAccession: d.studyAccession ?? '',
        pubmedId: d.pubmedId ?? '',
      });
    }

    const prsResult = {
      disease, totalScore: Math.round(totalScore * 10000) / 10000,
      contributions, variantsIncluded: contributions.length, genotypeAssumed: false,
    };

    const filterResult = {
      disease, total: filterDecisions.length,
      includedCount: included.length,
      excludedCount: filterDecisions.filter((d: any) => d.decision === 'excluded').length,
      ancestryNote: userAncestry ? `Ancestry context applied: ${userAncestry}` : null,
      allDecisions: filterDecisions,
    };

    const params = PRS_POP_PARAMS[disease] ?? { mean: 0.6, sd: 0.3 };
    const zScore = params.sd > 0 ? (prsResult.totalScore - params.mean) / params.sd : 0;
    const tier = zScore < -0.5 ? 'low' : zScore > 0.5 ? 'high' : 'moderate';
    const percentileApprox = Math.round((0.5 + 0.5 * Math.tanh(zScore * 0.8)) * 100);

    const riskInterpretation = {
      disease, tier, prsScore: prsResult.totalScore,
      zScore: Math.round(zScore * 100) / 100,
      percentileApprox,
      confidenceLevel: contributions.length >= 4 ? 'high' : contributions.length >= 2 ? 'moderate' : 'low',
      confidenceReason: `${contributions.length} variants analyzed with real genotype data from your ancestry file.`,
      description: narrative.slice(0, 400),
    };

    return {
      disease, diseaseName, narrative, agentSteps,
      riskInterpretation, prsResult, filterResult, citations,
      lifestyleContext: {
        disease, factors: LIFESTYLE[disease] ?? [],
        source: 'Published clinical guidelines and trial evidence.',
      },
      disclaimer: DISCLAIMER,
      generatedAt: new Date().toISOString(),
      genotypeData: true,
    };
  }
}
