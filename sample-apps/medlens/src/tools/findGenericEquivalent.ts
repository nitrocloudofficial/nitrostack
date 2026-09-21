import { z } from "zod";
import { fetchJsonWithTimeout, rawSearchTerm } from "../utils/fetchWithTimeout";
import { GenericEquivalentResult } from "../types";

export const findGenericEquivalentSchema = z.object({
  drugName: z.string().min(1).describe("Brand or generic drug name to resolve to an RxNorm concept."),
});

export type FindGenericEquivalentInput = z.infer<typeof findGenericEquivalentSchema>;

const RXCUI_ENDPOINT = "https://rxnav.nlm.nih.gov/REST/rxcui.json";
const RELATED_ENDPOINT = "https://rxnav.nlm.nih.gov/REST/rxcui";

interface RxcuiResponse {
  idGroup?: { rxnormId?: string[] };
}

interface RxNormConcept {
  rxcui: string;
  name: string;
  tty: string;
}

interface RelatedGroupResponse {
  relatedGroup?: {
    conceptGroup?: {
      tty?: string;
      conceptProperties?: RxNormConcept[];
    }[];
  };
}

async function resolveRxcui(drugName: string): Promise<string | null> {
  const url = `${RXCUI_ENDPOINT}?name=${rawSearchTerm(drugName)}`;
  const result = await fetchJsonWithTimeout<RxcuiResponse>(url);
  if (result.ok) {
    const id = result.data.idGroup?.rxnormId?.[0];
    if (id) return id;
  }
  return null;
}

async function fetchRelated(rxcui: string): Promise<RelatedGroupResponse | null> {
  const url = `${RELATED_ENDPOINT}/${encodeURIComponent(rxcui)}/related.json?tty=SBD+GPCK+SCD`;
  const result = await fetchJsonWithTimeout<RelatedGroupResponse>(url);
  return result.ok ? result.data : null;
}

/**
 * Determines whether the originally-queried name resolved to a branded
 * (SBD) or generic-ingredient (SCD) concept by checking which group the
 * query name's own rxcui shows up in — falls back to "UNKNOWN" if the
 * related-concepts groups don't include it directly (which can happen for
 * ingredient-only or package-level queries).
 */
function classifyResolvedTTY(
  related: RelatedGroupResponse,
  queriedRxcui: string
): "SBD" | "SCD" | "GPCK" | "UNKNOWN" {
  for (const group of related.relatedGroup?.conceptGroup ?? []) {
    const tty = group.tty as "SBD" | "SCD" | "GPCK" | undefined;
    if (!tty) continue;
    const match = group.conceptProperties?.some((c) => c.rxcui === queriedRxcui);
    if (match) return tty;
  }
  return "UNKNOWN";
}

function extractIngredientName(related: RelatedGroupResponse): string | undefined {
  const scdGroup = related.relatedGroup?.conceptGroup?.find((g) => g.tty === "SCD");
  const firstScd = scdGroup?.conceptProperties?.[0]?.name;
  // SCD names look like "acetaminophen 500 MG Oral Tablet" — the ingredient
  // is the leading token(s) before the strength; a light heuristic split is
  // enough here since we only need a human-readable ingredient reference,
  // not a fully parsed dose form.
  if (!firstScd) return undefined;
  const match = firstScd.match(/^([A-Za-z0-9\-'\s]+?)\s+\d/);
  return match ? match[1].trim() : firstScd;
}

function collectGenericOptions(related: RelatedGroupResponse): string[] {
  const names: string[] = [];
  for (const group of related.relatedGroup?.conceptGroup ?? []) {
    if (group.tty !== "SCD" && group.tty !== "GPCK") continue;
    for (const concept of group.conceptProperties ?? []) {
      if (concept.name && !names.includes(concept.name)) names.push(concept.name);
      if (names.length >= 5) return names;
    }
  }
  return names;
}

export async function findGenericEquivalent(input: FindGenericEquivalentInput): Promise<GenericEquivalentResult> {
  const { drugName } = input;

  try {
    const rxcui = await resolveRxcui(drugName);
    if (!rxcui) {
      return { found: false };
    }

    const related = await fetchRelated(rxcui);
    if (!related) {
      // We resolved a concept but couldn't fetch related concepts — still
      // report the rxcui itself rather than collapsing to a hard failure.
      return { found: true, rxcui, resolvedTTY: "UNKNOWN" };
    }

    return {
      found: true,
      rxcui,
      resolvedTTY: classifyResolvedTTY(related, rxcui),
      ingredientName: extractIngredientName(related),
      genericOptions: collectGenericOptions(related),
    };
  } catch {
    return { found: false };
  }
}
