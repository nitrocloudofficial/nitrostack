/**
 * DrugsService — business logic for the Drug Safety module.
 *
 * Interaction checking strategy (replacement for the retired NLM API):
 * resolve each drug via RxNorm → fetch each FDA label → cross-scan every
 * other drug's aliases inside each label's `drug_interactions` text →
 * excerpt evidence sentences → band severity by keyword heuristic.
 * Partial success is a first-class outcome: drugs whose labels are missing
 * are reported in `drugs_without_labels`, never silently dropped.
 */
import { Injectable } from '@nitrostack/core';
import { RxNormService } from '../../integrations/rxnorm.service.js';
import { OpenFdaService, FdaDrugLabel } from '../../integrations/openfda.service.js';

export type InteractionSeverity =
  | 'contraindicated'
  | 'major'
  | 'moderate'
  | 'minor'
  | 'unknown';

const SEVERITY_RANK: Record<InteractionSeverity, number> = {
  unknown: 0,
  minor: 1,
  moderate: 2,
  major: 3,
  contraindicated: 4,
};

/** Keyword heuristic mapping label excerpt text → severity band (§2.2 tool 2.3). */
export function classifyInteractionSeverity(text: string): InteractionSeverity {
  if (/contraindicat/i.test(text)) return 'contraindicated';
  if (
    /\b(avoid|do not (co[- ]?administer|use|take)|serious|severe|life[- ]threatening|major|prohibited)\b/i.test(
      text,
    ) ||
    /increase[sd]? (the )?risk of (bleeding|hemorrhag)/i.test(text)
  ) {
    return 'major';
  }
  if (
    /\b(monitor|caution|may (increase|decrease|enhance|reduce|potentiate)|adjust(ing)? (the )?dose|dose adjustment)\b/i.test(
      text,
    )
  ) {
    return 'moderate';
  }
  return 'minor';
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts evidence sentences from label interaction text mentioning any of
 * the given drug aliases. Returns up to `maxExcerpts` excerpts (≤ 300 chars).
 */
export function findInteractionEvidence(
  interactionTexts: string[],
  aliases: string[],
  maxExcerpts = 3,
): string[] {
  const patterns = aliases
    .filter((a) => a.length >= 3)
    .map((a) => new RegExp(`\\b${escapeRegExp(a)}\\b`, 'i'));
  if (patterns.length === 0) return [];

  const excerpts: string[] = [];
  for (const text of interactionTexts) {
    const sentences = text.split(/(?<=[.!?;])\s+/);
    for (let i = 0; i < sentences.length; i++) {
      if (patterns.some((p) => p.test(sentences[i]))) {
        // Include the following sentence as context: FDA labels often state
        // severity in the adjacent clause ("X may increase effect; avoid use").
        const windowed = `${sentences[i]} ${sentences[i + 1] ?? ''}`.trim();
        const excerpt =
          windowed.length > 300 ? `${windowed.slice(0, 297).trimEnd()}...` : windowed;
        if (!excerpts.includes(excerpt)) excerpts.push(excerpt);
      }
    }
  }
  // Strongest evidence first: keyword-bearing excerpts outrank neutral mentions.
  excerpts.sort(
    (a, b) =>
      SEVERITY_RANK[classifyInteractionSeverity(b)] -
      SEVERITY_RANK[classifyInteractionSeverity(a)],
  );
  return excerpts.slice(0, maxExcerpts);
}

export interface DrugSearchMatch {
  rxcui: string;
  name: string;
  tty: string;
  synonyms: string[];
  classes: string[];
}

export interface InteractionPairResult {
  pair: [string, string];
  severity_band: InteractionSeverity;
  evidence_excerpt: string;
  source: 'fda_label';
}

@Injectable({ deps: [RxNormService, OpenFdaService] })
export class DrugsService {
  constructor(
    private readonly rxnorm: RxNormService,
    private readonly openfda: OpenFdaService,
  ) {}

  /** Tool 2.1 — name → RxCUI + synonyms + classes (exact, then fuzzy when asked). */
  async searchDrugs(name: string, fuzzy: boolean): Promise<DrugSearchMatch[]> {
    const matches: DrugSearchMatch[] = [];
    const seen = new Set<string>();

    const addMatch = async (rxcui: string) => {
      if (seen.has(rxcui) || matches.length >= 5) return;
      seen.add(rxcui);
      const [properties, drugs, classes] = await Promise.all([
        this.rxnorm.getProperties(rxcui).catch(() => null),
        this.rxnorm.getDrugs(name).catch(() => []),
        this.rxnorm.getClasses(rxcui).catch(() => []),
      ]);
      const synonyms = [
        ...new Set(
          drugs
            .filter((d) => d.synonym)
            .map((d) => d.synonym as string),
        ),
      ].slice(0, 5);
      matches.push({
        rxcui,
        name: properties?.name ?? drugs[0]?.name ?? name,
        tty: properties?.tty ?? drugs[0]?.tty ?? 'unknown',
        synonyms,
        classes: classes.slice(0, 5),
      });
    };

    const exact = await this.rxnorm.resolveName(name);
    if (exact) await addMatch(exact);

    if (matches.length === 0 && fuzzy) {
      for (const candidate of await this.rxnorm.approximateMatch(name, 5)) {
        await addMatch(candidate.rxcui);
      }
    }

    return matches;
  }

  /** Tool 2.2 — FDA label sections for one drug. */
  async getLabelInfo(drugName: string, sections?: string[]) {
    const label = await this.openfda.getLabel(drugName);
    if (!label) {
      return {
        found: false as const,
        drug: drugName,
        sections: {},
        note: 'No FDA label found for this drug name (searched generic and brand).',
      };
    }

    const ALL_SECTIONS = [
      'boxed_warning',
      'indications_and_usage',
      'contraindications',
      'warnings_and_cautions',
      'adverse_reactions',
      'drug_interactions',
      'pregnancy',
      'overdosage',
    ] as const;

    const wanted = sections?.length ? sections : ALL_SECTIONS;
    const out: Record<string, string> = {};
    for (const section of wanted) {
      const value = label[section];
      if (Array.isArray(value) && value.length > 0) {
        out[section] = (value as string[]).join('\n');
      }
    }

    return {
      found: true as const,
      drug: label.openfda?.generic_name?.[0] ?? drugName,
      brand_names: label.openfda?.brand_name ?? [],
      rxcui: label.openfda?.rxcui?.[0] ?? null,
      sections: out,
      source: 'openfda' as const,
      label_revision_date: label.effective_time ?? null,
    };
  }

  /** Tool 2.3 — cross-scan interaction check across 2–5 drugs. */
  async checkInteractions(drugNames: string[]) {
    // 1. Resolve aliases per drug (input name + RxNorm canonical + label names)
    const aliasSets = new Map<string, Set<string>>();
    const labels = new Map<string, FdaDrugLabel>();
    const drugsWithoutLabels: string[] = [];

    for (const name of drugNames) {
      const aliases = new Set<string>([name.toLowerCase()]);
      const rxcui = await this.rxnorm.resolveName(name).catch(() => null);
      if (rxcui) {
        const props = await this.rxnorm.getProperties(rxcui).catch(() => null);
        if (props?.name) aliases.add(props.name.toLowerCase());
        if (props?.synonym) aliases.add(props.synonym.toLowerCase());
      }

      const label = await this.openfda.getLabel(name).catch(() => null);
      if (label) {
        labels.set(name, label);
        for (const n of label.openfda?.generic_name ?? []) aliases.add(n.toLowerCase());
        for (const n of label.openfda?.brand_name ?? []) aliases.add(n.toLowerCase());
      } else {
        drugsWithoutLabels.push(name);
      }
      aliasSets.set(name, aliases);
    }

    // 2. Pairwise cross-scan of label interaction text
    const interactions: InteractionPairResult[] = [];
    for (let i = 0; i < drugNames.length; i++) {
      for (let j = i + 1; j < drugNames.length; j++) {
        const a = drugNames[i];
        const b = drugNames[j];
        // Interaction content lives in multiple label sections depending on
        // label type: Rx labels use drug_interactions; OTC monographs use
        // warnings / ask_doctor_or_pharmacist.
        const corpusOf = (label?: FdaDrugLabel): string[] => {
          if (!label) return [];
          const sections = [
            label.drug_interactions,
            label.warnings,
            label.warnings_and_cautions,
            label.boxed_warning,
            label.contraindications,
            (label as Record<string, unknown>).ask_doctor_or_pharmacist,
          ];
          return sections.filter((s): s is string[] => Array.isArray(s)).flat();
        };

        const bAliases = [...(aliasSets.get(b) ?? [])];
        const excerptsA = findInteractionEvidence(corpusOf(labels.get(a)), bAliases);

        const aAliases = [...(aliasSets.get(a) ?? [])];
        const excerptsB = findInteractionEvidence(corpusOf(labels.get(b)), aAliases);

        const excerpts = [...excerptsA, ...excerptsB].slice(0, 3);
        if (excerpts.length === 0) continue;

        let severity: InteractionSeverity = 'minor';
        for (const excerpt of excerpts) {
          const s = classifyInteractionSeverity(excerpt);
          if (SEVERITY_RANK[s] > SEVERITY_RANK[severity]) severity = s;
        }

        interactions.push({
          pair: [a, b],
          severity_band: severity,
          evidence_excerpt: excerpts[0],
          source: 'fda_label',
        });
      }
    }

    // 3. Highest-severity first for display
    interactions.sort(
      (x, y) => SEVERITY_RANK[y.severity_band] - SEVERITY_RANK[x.severity_band],
    );

    return {
      interactions,
      drugs_without_labels: drugsWithoutLabels,
      methodology_note:
        'Interactions detected by cross-scanning FDA Structured Product Label drug_interactions ' +
        'sections for mentions of the co-administered drug (NLM retired its DDI API in 2024). ' +
        'Absence of a finding is NOT proof of safety — always confirm with a pharmacist or clinician.',
    };
  }

  /** Tool 2.4 — FAERS top reported reactions. */
  async getAdverseEvents(drugName: string, limit: number) {
    const { totalReports, reactions } = await this.openfda.getTopReactions(drugName, limit);
    return {
      drug: drugName,
      total_reports: totalReports,
      top_reactions: reactions,
      reporting_caveat:
        'FAERS reports are voluntary and unverified; counts reflect reporting frequency, ' +
        'not incidence or proven causation.',
    };
  }

  /** Tool 2.5 — FDA recall/enforcement actions. */
  async getRecalls(drugName: string) {
    const recalls = await this.openfda.getRecalls(drugName);
    return {
      drug: drugName,
      recalls: recalls.map((r) => ({
        recall_number: r.recallNumber,
        reason: r.reason,
        classification: r.classification,
        recall_initiation_date: r.date,
        status: r.status,
      })),
    };
  }
}
