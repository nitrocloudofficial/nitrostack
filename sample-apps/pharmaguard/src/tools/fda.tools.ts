import { ToolDecorator as Tool, Widget, type ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { buildFdaUrl, safeFetchFda } from '../utils/api.helpers.js';

// ── Response type interfaces ────────────────────────────────────────────────

interface NdcResult {
  generic_name: string;
  brand_name: string;
  product_ndc: string;
  dosage_form: string;
  labeler_name: string;
}

interface NdcResponse {
  results?: NdcResult[];
}

interface AdverseEventCount {
  term: string;
  count: number;
}

interface AdverseEventResponse {
  results?: AdverseEventCount[];
}

interface TimeSeriesCount {
  time: string;
  count: number;
}

interface TimeSeriesResponse {
  results?: TimeSeriesCount[];
}

interface EnforcementResult {
  classification: string;
  reason_for_recall: string;
  status: string;
  recall_initiation_date: string;
}

interface EnforcementResponse {
  results?: EnforcementResult[];
}

// ── Tool class ──────────────────────────────────────────────────────────────
const labelCache = new Map<string, any>();

async function fetchLabelData(drugName: string) {
  const normalizedName = drugName.trim().toLowerCase();
  if (labelCache.has(normalizedName)) {
    return labelCache.get(normalizedName);
  }

  let labelData = null;
  // Try generic name
  const genericUrl = buildFdaUrl('/drug/label.json', {
    search: `openfda.generic_name:"${normalizedName}"`,
    limit: '1'
  });
  labelData = await safeFetchFda<any>(genericUrl).catch(() => null);

  if (!labelData?.results?.length) {
    // Try brand name
    const brandUrl = buildFdaUrl('/drug/label.json', {
      search: `openfda.brand_name:"${normalizedName}"`,
      limit: '1'
    });
    labelData = await safeFetchFda<any>(brandUrl).catch(() => null);
  }

  if (!labelData?.results?.length) {
    labelCache.set(normalizedName, null);
    return null;
  }

  const result = labelData.results[0];
  const sections = [
    'boxed_warning',
    'warnings',
    'warnings_and_cautions',
    'adverse_reactions',
    'precautions',
    'contraindications',
    'drug_interactions'
  ];

  const extractedSections: Record<string, string> = {};
  
  for (const section of sections) {
    if (result[section]) {
      const text = Array.isArray(result[section]) ? result[section].join(' ') : String(result[section]);
      extractedSections[section] = text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
    }
  }

  labelCache.set(normalizedName, extractedSections);
  return extractedSections;
}

export class FdaTools {
  /**
   * Looks up the National Drug Code (NDC) for a given drug name.
   */
  @Tool({
    name: 'lookup_ndc',
    description:
      'Look up National Drug Code (NDC) details for a drug by brand or generic name.',
    inputSchema: z.object({
      drugName: z.string().describe('Brand or generic drug name'),
    }),
  })
  @Widget('pharmaguard-widget')
  async lookupNdc(
    input: { drugName: string },
    context: ExecutionContext,
  ) {
    const { drugName } = input;
    const url = buildFdaUrl('/drug/ndc.json', {
      search: `generic_name:"${drugName}" brand_name:"${drugName}"`,
      limit: '1',
    });

    try {
      const data = await safeFetchFda<NdcResponse>(url);

      if (!data || !data.results || data.results.length === 0) {
        return {
          found: false,
          message: 'No NDC found',
          _meta: {
            widget: 'pharmaguard-widget',
          },
        };
      }

      const result = data.results[0];

      return {
        found: true,
        productNdc: result.product_ndc ?? '',
        genericName: result.generic_name ?? '',
        brandName: result.brand_name ?? '',
        dosageForm: result.dosage_form ?? '',
        manufacturer: result.labeler_name ?? '',
        _meta: {
          widget: 'pharmaguard-widget',
        },
      };
    } catch (error: any) {
      return {
        found: false,
        message: 'Error fetching NDC data or no records found.',
        _meta: { widget: 'pharmaguard-widget' }
      };
    }
  }

  /**
   * Searches FDA adverse event reports for a given drug and returns the top 5
   * most frequently reported reactions.
   */
  @Tool({
    name: 'search_adverse_events',
    description:
      'Search FDA adverse event reports for a drug and return the top 5 most common reactions.',
    inputSchema: z.object({
      drugName: z.string().describe('Generic or brand name'),
    }),
  })
  @Widget('pharmaguard-widget')
  async searchAdverseEvents(
    input: { drugName: string },
    context: ExecutionContext,
  ) {
    console.error("TOOL INPUT", JSON.stringify(input, null, 2));
    console.error("RAW DRUG NAME", input?.drugName);

    if (!input || !input.drugName) {
      console.error("WHY BRANCH TAKEN: Drug name empty");
      return { found: false, message: "Drug name empty", _meta: { widget: 'pharmaguard-widget' } };
    }

    const normalizedDrugName = input.drugName.trim();
    console.error("normalizedDrugName:", normalizedDrugName);

    const searchString = `patient.drug.medicinalproduct:"${normalizedDrugName}"`;
    console.error("constructed search string:", searchString);

    const url = buildFdaUrl('/drug/event.json', {
      search: searchString,
      count: 'patient.reaction.reactionmeddrapt.exact',
    });
    console.error("constructed openFDA URL:", url);

    const timeSeriesUrl = buildFdaUrl('/drug/event.json', {
      search: searchString,
      count: 'receiptdate',
    });
    const rawEventsUrl = buildFdaUrl('/drug/event.json', {
      search: searchString,
      limit: '100',
    });

    const apiKey = process.env.OPENFDA_API_KEY;
    const warnings: string[] = [];
    
    let dataResult: any, timeSeriesResult: any, rawEventsResult: any, labelResult: any;

    if (apiKey) {
      [dataResult, timeSeriesResult, rawEventsResult, labelResult] = await Promise.allSettled([
        safeFetchFda<AdverseEventResponse>(url),
        safeFetchFda<TimeSeriesResponse>(timeSeriesUrl),
        safeFetchFda<any>(rawEventsUrl),
        fetchLabelData(normalizedDrugName)
      ]);
    } else {
      dataResult = { status: 'fulfilled', value: await safeFetchFda<AdverseEventResponse>(url).catch(e => { warnings.push(`Main query failed: ${e.message}`); return null; }) };
      timeSeriesResult = { status: 'fulfilled', value: await safeFetchFda<TimeSeriesResponse>(timeSeriesUrl).catch(e => { warnings.push(`Time series failed: ${e.message}`); return null; }) };
      rawEventsResult = { status: 'fulfilled', value: await safeFetchFda<any>(rawEventsUrl).catch(e => { warnings.push(`Raw events failed: ${e.message}`); return null; }) };
      labelResult = { status: 'fulfilled', value: await fetchLabelData(normalizedDrugName).catch(e => { warnings.push(`Label query failed: ${e.message}`); return null; }) };
    }

    const data = dataResult && dataResult.status === 'fulfilled' ? dataResult.value : null;
    if (dataResult && dataResult.status === 'rejected') warnings.push(`Top reactions failed: ${dataResult.reason?.message}`);

    const timeSeriesData = timeSeriesResult && timeSeriesResult.status === 'fulfilled' ? timeSeriesResult.value : null;
    if (timeSeriesResult && timeSeriesResult.status === 'rejected') warnings.push(`Historical trends failed: ${timeSeriesResult.reason?.message}`);

    const rawEventsData = rawEventsResult && rawEventsResult.status === 'fulfilled' ? rawEventsResult.value : null;
    if (rawEventsResult && rawEventsResult.status === 'rejected') warnings.push(`Seriousness breakdown failed: ${rawEventsResult.reason?.message}`);

    const labelData = labelResult && labelResult.status === 'fulfilled' ? labelResult.value : null;
    if (labelResult && labelResult.status === 'rejected') warnings.push(`Label fetch failed: ${labelResult.reason?.message}`);

    let totalKnownWarnings = 0;
    let totalPotentiallyUnlisted = 0;

    const topReactions = (data?.results || []).slice(0, 5).map((entry: any) => {
      const reaction = entry.term;
      const count = entry.count;
      
      let isKnownWarning: boolean | null = null;
      let matchedSection: string | null = null;
      let matchedText: string | null = null;

      if (labelData) {
        const normalizedReaction = reaction.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
        isKnownWarning = false;
        
        for (const [section, text] of Object.entries(labelData)) {
          if ((text as string).includes(normalizedReaction)) {
            isKnownWarning = true;
            matchedSection = section;
            matchedText = normalizedReaction;
            break;
          }
        }
        
        if (isKnownWarning) {
          totalKnownWarnings++;
        } else {
          totalPotentiallyUnlisted++;
        }
      }

      return {
        reaction,
        count,
        isKnownWarning,
        matchedSection,
        matchedText
      };
    });

    const labelAnalysis = labelData ? {
      totalKnownWarnings,
      totalPotentiallyUnlisted,
      labelAvailable: true
    } : {
      totalKnownWarnings: 0,
      totalPotentiallyUnlisted: 0,
      labelAvailable: false
    };

    // Aggregate historical trends by YEAR to keep points < 100 and prevent UI freezing
    const yearlyMap = new Map<string, number>();
    const currentYear = new Date().getFullYear();

    (timeSeriesData?.results || []).forEach((entry: any) => {
      if (!entry.time) return;
      const timeStr = String(entry.time);
      const year = timeStr.substring(0, 4);
      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 1) return;

      const count = Number(entry.count || 0);
      yearlyMap.set(year, (yearlyMap.get(year) || 0) + count);
    });

    let historicalTrends = Array.from(yearlyMap.entries())
      .map(([year, count]) => ({
        label: year,
        year: year,
        time: year,
        count,
      }))
      .sort((a, b) => parseInt(a.year, 10) - parseInt(b.year, 10));

    if (historicalTrends.length > 100) {
      historicalTrends = historicalTrends.slice(-100);
    }

    let death = 0, hospitalization = 0, lifeThreatening = 0, disability = 0, other = 0, totalSerious = 0;
    let hasSeriousness = false;
    
    const rawResults = rawEventsData?.results || [];
    if (rawResults.length > 0) {
      hasSeriousness = true;
      rawResults.forEach((event: any) => {
        if (event.seriousnessdeath === "1") death++;
        if (event.seriousnesshospitalization === "1") hospitalization++;
        if (event.seriousnesslifethreatening === "1") lifeThreatening++;
        if (event.seriousnessdisabling === "1") disability++;
        if (event.seriousnessother === "1") other++;
        
        if (
          event.seriousnessdeath === "1" ||
          event.seriousnesshospitalization === "1" ||
          event.seriousnesslifethreatening === "1" ||
          event.seriousnessdisabling === "1" ||
          event.seriousnessother === "1"
        ) {
          totalSerious++;
        }
      });
    }
    
    const seriousnessBreakdown = hasSeriousness ? {
      death,
      hospitalization,
      lifeThreatening,
      disability,
      other,
      totalSerious
    } : undefined;

    if (topReactions.length === 0 && historicalTrends.length === 0 && !hasSeriousness) {
      console.error("WHY BRANCH TAKEN: All datasets empty or failed");
      return {
        found: false,
        message: "No results returned for this drug",
        warnings,
        _meta: {
          widget: 'pharmaguard-widget',
        },
      };
    }

    return {
      found: true,
      topReactions,
      labelAnalysis,
      ...(historicalTrends.length > 0 ? { historicalTrends } : {}),
      ...(hasSeriousness ? { seriousnessBreakdown } : {}),
      ...(warnings.length > 0 ? { warnings } : {}),
      _meta: {
        widget: 'pharmaguard-widget',
      },
    };
  }

  /**
   * Checks the FDA enforcement database for active recall notices mentioning
   * the given drug name. Only returns ACTIVE recalls (filters out Terminated/Ongoing).
   */
  @Tool({
    name: 'check_recall_status',
    description:
      'Check FDA enforcement actions for active recalls related to a drug.',
    inputSchema: z.object({
      drugName: z.string().describe('Generic or brand name'),
    }),
  })
  @Widget('pharmaguard-widget')
  async checkRecallStatus(
    input: { drugName: string },
    context: ExecutionContext,
  ) {
    const { drugName } = input;
    const url = buildFdaUrl('/drug/enforcement.json', {
      search: `product_description:"${drugName}" status:"Ongoing"`,
      limit: '10',
    });

    try {
      const data = await safeFetchFda<EnforcementResponse>(url);

      if (!data || !data.results || data.results.length === 0) {
        return {
          hasActiveRecalls: false,
          recallCount: 0,
          recalls: [],
          _meta: {
            widget: 'pharmaguard-widget',
          },
        };
      }

      // Filter for only ACTIVE recalls (status = "Ongoing")
      const activeRecalls = data.results
        .filter((entry) => entry.status?.toLowerCase() === 'ongoing')
        .map((entry) => ({
          classification: entry.classification ?? '',
          reason: entry.reason_for_recall ?? '',
          status: entry.status ?? '',
          initiationDate: entry.recall_initiation_date ?? '',
        }));

      return {
        hasActiveRecalls: activeRecalls.length > 0,
        recallCount: activeRecalls.length,
        recalls: activeRecalls,
        _meta: {
          widget: 'pharmaguard-widget',
        },
      };
    } catch (error: any) {
      return {
        found: false,
        message: 'Error fetching recall data or no records found.',
        hasActiveRecalls: false,
        recallCount: 0,
        recalls: [],
        _meta: { widget: 'pharmaguard-widget' }
      };
    }
  }

  /**
   * Compares two drugs by checking adverse events and recall status concurrently.
   */
  @Tool({
    name: 'compare_drugs',
    description: 'Compare adverse events and recall statuses of two different drugs side-by-side.',
    inputSchema: z.object({
      drugA: z.string().describe('First drug to compare'),
      drugB: z.string().describe('Second drug to compare'),
    }),
  })
  @Widget('pharmaguard-widget')
  async compareDrugs(
    input: { drugA: string; drugB: string },
    context: ExecutionContext,
  ) {
    const { drugA, drugB } = input;

    const fetchDrugData = async (drugName: string) => {
      const eventUrl = buildFdaUrl('/drug/event.json', {
        search: `patient.drug.medicinalproduct:"${drugName}"`,
        count: 'patient.reaction.reactionmeddrapt.exact',
      });
      const recallUrl = buildFdaUrl('/drug/enforcement.json', {
        search: `product_description:"${drugName}"`,
        limit: '5',
      });

      const [eventData, recallData] = await Promise.all([
        safeFetchFda<AdverseEventResponse>(eventUrl),
        safeFetchFda<EnforcementResponse>(recallUrl),
      ]);

      const topReactions = (eventData?.results || []).slice(0, 5).map(e => ({
        reaction: e.term,
        count: e.count,
      }));

      const recalls = (recallData?.results || []).map(r => ({
        classification: r.classification ?? '',
        reason: r.reason_for_recall ?? '',
        status: r.status ?? '',
        initiationDate: r.recall_initiation_date ?? '',
      }));

      return {
        name: drugName,
        adverseEvents: topReactions,
        recalls,
      };
    };

    try {
      const [drugAData, drugBData] = await Promise.all([
        fetchDrugData(drugA),
        fetchDrugData(drugB),
      ]);

      return {
        isComparison: true,
        drugA: drugAData,
        drugB: drugBData,
        _meta: {
          widget: 'pharmaguard-widget',
        },
      };
    } catch (error: any) {
      return {
        found: false,
        message: 'Error fetching comparison data or no records found.',
        _meta: { widget: 'pharmaguard-widget' }
      };
    }
  }
}