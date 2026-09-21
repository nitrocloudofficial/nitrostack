import { fetchJsonWithTimeout } from '../utils/fetchWithTimeout.js';

const RXCUI_URL = 'https://rxnav.nlm.nih.gov/REST/rxcui.json';
const RELATED_URL = (rxcui: string) =>
  `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/related.json?tty=SBD+GPCK+SCD`;

interface RxcuiResponse {
  idGroup?: { rxnormId?: string[] };
}

interface RelatedResponse {
  relatedGroup?: {
    conceptGroup?: Array<{
      tty?: string;
      conceptProperties?: Array<{ name?: string; rxcui?: string }>;
    }>;
  };
}

// === TOOL 4: find_generic_equivalent ===
export async function find_generic_equivalent(drugName: string) {
  const rxcuiRes = await fetchJsonWithTimeout<RxcuiResponse>(
    `${RXCUI_URL}?name=${encodeURIComponent(drugName)}`
  );
  const rxcui = rxcuiRes.ok ? rxcuiRes.data?.idGroup?.rxnormId?.[0] : undefined;

  if (!rxcui) {
    return { found: false };
  }

  const relatedRes = await fetchJsonWithTimeout<RelatedResponse>(RELATED_URL(rxcui));
  const groups = relatedRes.ok ? relatedRes.data?.relatedGroup?.conceptGroup ?? [] : [];

  const sbdNames = groups
    .find((g) => g.tty === 'SBD')
    ?.conceptProperties?.map((c) => c.name)
    .filter(Boolean) as string[] | undefined;
  const scdNames = groups
    .find((g) => g.tty === 'SCD')
    ?.conceptProperties?.map((c) => c.name)
    .filter(Boolean) as string[] | undefined;
  const gpckNames = groups
    .find((g) => g.tty === 'GPCK')
    ?.conceptProperties?.map((c) => c.name)
    .filter(Boolean) as string[] | undefined;

  // Did the queried name resolve as branded or already-generic?
  // Heuristic: if the queried name shows up among SBD names, treat as branded;
  // otherwise if it shows up among SCD names, treat as generic.
  const lowerQuery = drugName.toLowerCase();
  const resolvedAsBranded = sbdNames?.some((n) => n.toLowerCase().includes(lowerQuery));
  const resolvedTTY: 'SBD' | 'SCD' | 'UNKNOWN' = resolvedAsBranded
    ? 'SBD'
    : scdNames?.length
    ? 'SCD'
    : 'UNKNOWN';

  // Ingredient-level name: take the first SCD name and strip dose/form info
  // is imprecise without an ingredient-specific RxNorm call, so we surface
  // the first SCD (clinical drug) name as the closest available reference.
  const ingredientName = scdNames?.[0] ?? null;

  const genericOptions = [...(scdNames ?? []), ...(gpckNames ?? [])].slice(0, 5);

  return {
    found: true,
    rxcui,
    resolvedTTY,
    ingredientName,
    genericOptions,
    source: 'RxNorm',
  };
}

// === TOOL 5: get_drug_cost_estimate ===
// No free real-time pricing API exists for this scope — never fabricate dollar amounts.
export async function get_drug_cost_estimate(drugName: string) {
  const generic = await find_generic_equivalent(drugName);

  if (generic.found && generic.resolvedTTY === 'SBD') {
    return {
      drug: drugName,
      costSignal: 'brand-tier',
      note:
        'Generic equivalents are typically lower-cost than brand-name versions; use find_generic_equivalent for specific alternatives — real-time pricing not available in MVP scope.',
      source: 'RxNorm (naming-tier inference only, no pricing data)',
    };
  }

  return {
    drug: drugName,
    costSignal: 'generic-tier or unresolved',
    note: 'Real-time pricing not available in MVP scope.',
    source: 'RxNorm (naming-tier inference only, no pricing data)',
  };
}
