/**
 * 🌿 AYUSH Agent (India-Localized) — Dynamic Web Search + LLM Analysis
 * 
 * Checks dangerous interactions between Allopathic (Western) drugs and
 * Ayurvedic/herbal remedies using a 3-tier approach:
 * 
 * 1️⃣ Local DB     — Hardcoded AYUSH_INTERACTION_TABLE (instant, guaranteed for demo)
 * 2️⃣ PubMed Search — Searches NIH PubMed for real research papers (free API, no auth)
 * 3️⃣ Gemini LLM    — Analyzes PubMed abstracts to extract structured interaction data
 * 
 * This covers interactions that standard APIs like OpenFDA do NOT track —
 * critical for Indian patients who frequently combine treatments.
 */
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import {
  findAllAyushInteractionsForDrug,
  findAllAyushInteractionsForHerb,
} from '../data/clinical-tables.js';
import { callGemini } from '../shared-utils.js';

// ── PubMed E-utilities (free, no API key required) ──────────────────────

/**
 * Search PubMed for research papers about a herb-drug interaction.
 * Uses NCBI E-utilities (free, public, no auth needed).
 * Returns article IDs (PMIDs).
 */
async function searchPubMed(herb: string, drug: string, maxResults = 3): Promise<string[]> {
  try {
    // Try specific interaction query first
    const specificQuery = encodeURIComponent(`("${herb}") AND ("${drug}") AND (interaction OR adverse OR contraindication OR pharmacokinetic)`);
    const specificUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${specificQuery}&retmax=${maxResults}&retmode=json&sort=relevance`;

    const response = await fetch(specificUrl);
    if (!response.ok) return [];

    const data: any = await response.json();
    const ids = data?.esearchresult?.idlist || [];

    // If no results, try a broader query (herb + drug without interaction keywords)
    if (ids.length === 0) {
      const broadQuery = encodeURIComponent(`("${herb}") AND ("${drug}") AND (drug interaction OR herb drug OR safety OR adverse effect)`);
      const broadUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${broadQuery}&retmax=${maxResults}&retmode=json&sort=relevance`;

      const broadResponse = await fetch(broadUrl);
      if (broadResponse.ok) {
        const broadData: any = await broadResponse.json();
        return broadData?.esearchresult?.idlist || [];
      }
    }

    return ids;
  } catch (error) {
    console.error('PubMed search failed:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Fetch article summaries (title, authors, journal, date) from PubMed.
 */
async function fetchPubMedSummaries(pmids: string[]): Promise<Array<{ pmid: string; title: string; source: string; pubDate: string; authors: string }>> {
  if (pmids.length === 0) return [];

  try {
    const ids = pmids.join(',');
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids}&retmode=json`;

    const response = await fetch(url);
    if (!response.ok) return [];

    const data: any = await response.json();
    const results: Array<{ pmid: string; title: string; source: string; pubDate: string; authors: string }> = [];

    for (const pmid of pmids) {
      const article = data?.result?.[pmid];
      if (article) {
        results.push({
          pmid,
          title: article.title || 'Unknown title',
          source: article.fulljournalname || article.source || 'Unknown journal',
          pubDate: article.pubdate || 'Unknown date',
          authors: Array.isArray(article.authors)
            ? article.authors.slice(0, 3).map((a: any) => a.name).join(', ')
            : 'Unknown authors',
        });
      }
    }
    return results;
  } catch (error) {
    console.error('PubMed summary fetch failed:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Fetch abstract text for a single PubMed article.
 */
async function fetchPubMedAbstract(pmid: string): Promise<string> {
  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`;
    const response = await fetch(url);
    if (!response.ok) return '';
    const text = await response.text();
    // Trim to first 1500 chars to avoid token bloat
    return text.substring(0, 1500).trim();
  } catch (error) {
    return '';
  }
}

// ── AYUSH Agent ─────────────────────────────────────────────────────────

export class AyushAgent {

  @Tool({
    name: 'check_ayush_interaction',
    description: 'Checks for dangerous interactions between the proposed Allopathic (Western) drug and any Ayurvedic/herbal remedies the patient is currently taking. Uses a 3-tier approach: (1) Local clinical database, (2) Live PubMed research search, (3) Gemini LLM analysis of medical literature. This covers interactions that standard APIs like OpenFDA do NOT track — critical for Indian patients who frequently combine Allopathic and Ayurvedic treatments.',
    inputSchema: z.object({
      newDrug: z.string().describe('The newly prescribed Allopathic drug name'),
      herbalRemedies: z.array(z.string()).describe('Patient\'s current Ayurvedic/herbal remedies (e.g., ["Ashwagandha", "Triphala", "Guggul"])'),
      currentMedications: z.array(z.string()).optional().describe('Patient\'s current Allopathic medications (optional, for comprehensive herb-drug check)'),
    }),
    examples: {
      request: { newDrug: 'Diazepam', herbalRemedies: ['Ashwagandha', 'Triphala'] },
      response: {
        hasInteraction: true,
        interactions: [{
          herb: 'Ashwagandha',
          drug: 'Diazepam',
          severity: 'major',
          effect: 'Excessive sedation, respiratory depression',
          source: 'local_database',
          citation: 'Indian Journal of Pharmacology, 2019',
        }],
      },
    },
  })
  async checkAyushInteraction(
    input: { newDrug: string; herbalRemedies: string[]; currentMedications?: string[] },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('🌿 AYUSH Agent: Checking herb-drug interactions (3-tier)', {
      newDrug: input.newDrug,
      herbs: input.herbalRemedies,
    });

    if (!input.herbalRemedies || input.herbalRemedies.length === 0) {
      return {
        hasInteraction: false,
        interactions: [],
        note: 'No herbal remedies reported by patient.',
        citation: 'N/A — No AYUSH remedies to cross-reference',
      };
    }

    const allInteractions: any[] = [];
    const herbsCheckedViaPubMed: string[] = [];
    const pubmedArticlesFound: any[] = [];

    // ── Tier 1: Local Database (instant, guaranteed for demo herbs) ──────

    const localInteractions = findAllAyushInteractionsForDrug(input.newDrug, input.herbalRemedies);

    // Also check existing allopathic meds against herbs
    if (input.currentMedications && input.currentMedications.length > 0) {
      for (const herb of input.herbalRemedies) {
        const herbInteractions = findAllAyushInteractionsForHerb(herb, input.currentMedications);
        localInteractions.push(...herbInteractions);
      }
    }

    // Track which herb+drug pairs were found locally
    const localPairs = new Set(localInteractions.map(i => `${i.herb.toLowerCase()}|${i.drug.toLowerCase()}`));

    for (const interaction of localInteractions) {
      allInteractions.push({
        ...interaction,
        source: 'local_database',
      });
    }

    // ── Tier 2+3: PubMed Search + Gemini Analysis (for UNKNOWN pairs) ───

    // Collect all drug targets (new drug + existing meds)
    const allDrugs = [input.newDrug, ...(input.currentMedications || [])];

    for (const herb of input.herbalRemedies) {
      for (const drug of allDrugs) {
        const pairKey = `${herb.toLowerCase()}|${drug.toLowerCase()}`;

        // Skip if already found in local database
        if (localPairs.has(pairKey)) continue;

        ctx.logger.info(`🔍 PubMed search: "${herb}" × "${drug}"`, { herb, drug });
        herbsCheckedViaPubMed.push(`${herb} × ${drug}`);

        // Tier 2: Search PubMed for real research papers
        const pmids = await searchPubMed(herb, drug);

        if (pmids.length === 0) {
          ctx.logger.info(`No PubMed articles found for ${herb} × ${drug}`);
          continue;
        }

        // Fetch article summaries
        const summaries = await fetchPubMedSummaries(pmids);
        pubmedArticlesFound.push(...summaries);

        // Fetch abstracts for LLM analysis
        const abstracts: string[] = [];
        for (const pmid of pmids.slice(0, 3)) {
          const abstract = await fetchPubMedAbstract(pmid);
          if (abstract) abstracts.push(abstract);
        }

        if (abstracts.length === 0) {
          ctx.logger.info(`No abstracts available for ${herb} × ${drug}`);
          continue;
        }

        // Tier 3: Ask Gemini to analyze the PubMed abstracts
        const analysisPrompt = `You are a clinical pharmacologist specializing in herb-drug interactions.

Analyze the following PubMed research abstracts about the interaction between the Ayurvedic herb "${herb}" and the Allopathic drug "${drug}".

RESEARCH ABSTRACTS:
${abstracts.map((a, i) => `--- ABSTRACT ${i + 1} (PMID: ${pmids[i]}) ---\n${a}`).join('\n\n')}

Based on these abstracts, determine if there is a clinically significant herb-drug interaction.

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "hasInteraction": true/false,
  "severity": "major" | "moderate" | "minor" | "none",
  "effect": "Brief clinical effect description",
  "mechanism": "Pharmacological mechanism",
  "recommendation": "Clinical recommendation for the doctor",
  "confidence": "high" | "medium" | "low",
  "keyFindings": "1-2 sentence summary of what the research shows"
}

If the abstracts do NOT provide enough evidence for a clear interaction, set hasInteraction to false.
Be conservative — only flag as "major" if the research strongly supports it.

JSON ONLY:`;

        const llmResponse = await callGemini(analysisPrompt);

        if (llmResponse) {
          try {
            const cleaned = llmResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const analysis = JSON.parse(cleaned);

            if (analysis.hasInteraction && analysis.severity !== 'none') {
              // Build citation from real PubMed articles
              const citationParts = summaries.slice(0, 2).map(s =>
                `${s.authors} "${s.title}" ${s.source}, ${s.pubDate} (PMID: ${s.pmid})`
              );

              allInteractions.push({
                herb,
                drug,
                severity: analysis.severity || 'moderate',
                effect: analysis.effect || 'Potential herb-drug interaction detected',
                mechanism: analysis.mechanism || 'See PubMed research',
                recommendation: analysis.recommendation || 'Consult with pharmacist',
                source: 'pubmed_research',
                pubmedIds: pmids,
                confidence: analysis.confidence || 'medium',
                keyFindings: analysis.keyFindings || null,
                citation: citationParts.join('; '),
              });
            }
          } catch (parseError) {
            ctx.logger.error('Failed to parse Gemini analysis for AYUSH', { herb, drug, response: llmResponse });
          }
        }
      }
    }

    // ── Deduplicate by herb+drug pair ────────────────────────────────────

    const seen = new Set<string>();
    const uniqueInteractions = allInteractions.filter(i => {
      const key = `${i.herb}|${i.drug}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // ── Build response ──────────────────────────────────────────────────

    const localCount = uniqueInteractions.filter(i => i.source === 'local_database').length;
    const pubmedCount = uniqueInteractions.filter(i => i.source === 'pubmed_research').length;

    return {
      hasInteraction: uniqueInteractions.length > 0,
      interactions: uniqueInteractions.map(i => ({
        herb: i.herb,
        drug: i.drug,
        severity: i.severity,
        effect: i.effect,
        mechanism: i.mechanism,
        recommendation: i.recommendation,
        source: i.source,
        confidence: i.confidence || 'high',
        pubmedIds: i.pubmedIds || null,
        keyFindings: i.keyFindings || null,
        citation: i.citation,
      })),
      herbsChecked: input.herbalRemedies,
      drugsChecked: [input.newDrug, ...(input.currentMedications || [])],
      searchSummary: {
        localDatabaseHits: localCount,
        pubmedResearchHits: pubmedCount,
        pubmedSearchesPerformed: herbsCheckedViaPubMed.length,
        pubmedArticlesFound: pubmedArticlesFound.length,
        pairsSearched: herbsCheckedViaPubMed,
      },
      pubmedArticles: pubmedArticlesFound.map(a => ({
        pmid: a.pmid,
        title: a.title,
        journal: a.source,
        date: a.pubDate,
        url: `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`,
      })),
      note: uniqueInteractions.length > 0
        ? `⚠️ ${uniqueInteractions.length} AYUSH herb-drug interaction(s) found (${localCount} from local DB, ${pubmedCount} from PubMed research). These are NOT covered by standard Western drug databases like OpenFDA.`
        : herbsCheckedViaPubMed.length > 0
        ? `✅ No known AYUSH herb-drug interactions found. Searched local database AND PubMed research (${pubmedArticlesFound.length} articles reviewed).`
        : '✅ No known AYUSH herb-drug interactions found.',
      citation: uniqueInteractions.length > 0
        ? uniqueInteractions.map(i => `${i.herb} × ${i.drug}: ${i.citation}`).join('; ')
        : 'Cross-referenced against PharmaGuard AYUSH DB + NIH PubMed (National Library of Medicine)',
    };
  }
}
