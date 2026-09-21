import { z } from "zod";
import { fetchJsonWithTimeout, quotedSearchTerm, rawSearchTerm } from "../utils/fetchWithTimeout";
import { AdverseReactionCount, SafetyResult } from "../types";

export const getDrugSafetyProfileSchema = z.object({
  drugName: z.string().min(1).describe("Brand or generic drug name to check safety data for."),
});

export type GetDrugSafetyProfileInput = z.infer<typeof getDrugSafetyProfileSchema>;

const LABEL_ENDPOINT = "https://api.fda.gov/drug/label.json";
const EVENT_ENDPOINT = "https://api.fda.gov/drug/event.json";

interface OpenFdaLabelResult {
  warnings?: string[];
  boxed_warning?: string[];
  contraindications?: string[];
}
interface OpenFdaLabelResponse {
  results?: OpenFdaLabelResult[];
}

interface OpenFdaEventReaction {
  reactionmeddrapt?: string;
}
interface OpenFdaEventResult {
  serious?: string;
  seriousnessdeath?: string;
  seriousnesshospitalization?: string;
  patient?: {
    reaction?: OpenFdaEventReaction[];
  };
}
interface OpenFdaEventResponse {
  results?: OpenFdaEventResult[];
}

async function fetchFirstLabelMatch(drugName: string): Promise<OpenFdaLabelResult | null> {
  const attempts = [
    `${LABEL_ENDPOINT}?search=openfda.generic_name:${quotedSearchTerm(drugName)}&limit=1`,
    `${LABEL_ENDPOINT}?search=openfda.brand_name:${quotedSearchTerm(drugName)}&limit=1`,
    `${LABEL_ENDPOINT}?search=openfda.generic_name:${rawSearchTerm(drugName)}&limit=1`,
  ];
  for (const url of attempts) {
    const result = await fetchJsonWithTimeout<OpenFdaLabelResponse>(url);
    if (result.ok && result.data.results && result.data.results.length > 0) {
      return result.data.results[0];
    }
  }
  return null;
}

async function fetchAdverseEvents(drugName: string): Promise<OpenFdaEventResult[]> {
  const url = `${EVENT_ENDPOINT}?search=patient.drug.medicinalproduct:${quotedSearchTerm(drugName)}&limit=5`;
  const result = await fetchJsonWithTimeout<OpenFdaEventResponse>(url);
  if (result.ok && result.data.results) {
    return result.data.results;
  }
  return [];
}

function summarizeTopReactions(events: OpenFdaEventResult[]): AdverseReactionCount[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    for (const reaction of event.patient?.reaction ?? []) {
      const term = reaction.reactionmeddrapt;
      if (term) counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term, count]) => ({ term, count }));
}

function summarizeSeriousness(events: OpenFdaEventResult[]): string | undefined {
  if (events.length === 0) return undefined;
  const seriousCount = events.filter((e) => e.serious === "1").length;
  const deathCount = events.filter((e) => e.seriousnessdeath === "1").length;
  const hospitalizationCount = events.filter((e) => e.seriousnesshospitalization === "1").length;
  return `${seriousCount}/${events.length} sampled reports flagged serious (${hospitalizationCount} hospitalization, ${deathCount} death flags).`;
}

export async function getDrugSafetyProfile(input: GetDrugSafetyProfileInput): Promise<SafetyResult> {
  const { drugName } = input;

  try {
    const [label, events] = await Promise.all([fetchFirstLabelMatch(drugName), fetchAdverseEvents(drugName)]);

    if (!label && events.length === 0) {
      return { found: false };
    }

    return {
      found: true,
      warningsSnippet: label?.warnings?.[0]?.slice(0, 300),
      boxedWarningSnippet: label?.boxed_warning?.[0]?.slice(0, 300),
      contraindicationsSnippet: label?.contraindications?.[0]?.slice(0, 300),
      topAdverseReactions: events.length > 0 ? summarizeTopReactions(events) : undefined,
      eventSeriousnessNote: summarizeSeriousness(events),
    };
  } catch {
    return { found: false };
  }
}
