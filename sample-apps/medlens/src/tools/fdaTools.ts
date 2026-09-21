import { fetchJsonWithTimeout, truncate } from '../utils/fetchWithTimeout.js';

const OPENFDA_LABEL = 'https://api.fda.gov/drug/label.json';
const OPENFDA_EVENT = 'https://api.fda.gov/drug/event.json';

interface OpenFdaResultShape {
  results?: Array<{
    openfda?: {
      brand_name?: string[];
      generic_name?: string[];
      manufacturer_name?: string[];
      route?: string[];
      pharm_class_epc?: string[];
    };
    boxed_warning?: string[];
    indications_and_usage?: string[];
    warnings?: string[];
    contraindications?: string[];
  }>;
}

/** Tries quoted generic_name -> quoted brand_name -> unquoted generic_name. */
async function fetchLabelWithFallbacks(drugName: string) {
  const attempts = [
    `${OPENFDA_LABEL}?search=openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=1`,
    `${OPENFDA_LABEL}?search=openfda.brand_name:"${encodeURIComponent(drugName)}"&limit=1`,
    `${OPENFDA_LABEL}?search=openfda.generic_name:${encodeURIComponent(drugName)}&limit=1`,
  ];

  for (const url of attempts) {
    const res = await fetchJsonWithTimeout<OpenFdaResultShape>(url);
    if (res.ok && res.data?.results?.length) {
      return res.data.results[0];
    }
  }
  return null;
}

// === TOOL 1: get_drug_regulatory_status ===
export async function get_drug_regulatory_status(drugName: string) {
  const result = await fetchLabelWithFallbacks(drugName);

  if (!result) {
    return { found: false, message: 'No FDA label data found for this drug name.' };
  }

  const openfda = result.openfda || {};
  return {
    found: true,
    brandName: openfda.brand_name?.[0] ?? null,
    genericName: openfda.generic_name?.[0] ?? null,
    manufacturer: openfda.manufacturer_name?.[0] ?? null,
    route: openfda.route?.[0] ?? null,
    pharmClass: openfda.pharm_class_epc?.[0] ?? null,
    boxedWarning: Boolean(result.boxed_warning?.length),
    indicationSnippet: truncate(result.indications_and_usage?.[0], 200),
    source: 'openFDA label data',
  };
}

// === TOOL 2: get_drug_safety_profile ===
export async function get_drug_safety_profile(drugName: string) {
  const label = await fetchLabelWithFallbacks(drugName);

  const eventUrl = `${OPENFDA_EVENT}?search=patient.drug.medicinalproduct:"${encodeURIComponent(
    drugName
  )}"&limit=5`;
  const eventRes = await fetchJsonWithTimeout<{
    results?: Array<{
      serious?: string;
      seriousnessdeath?: string;
      seriousnesshospitalization?: string;
      patient?: { reaction?: Array<{ reactionmeddrapt?: string }> };
    }>;
  }>(eventUrl);

  if (!label && !(eventRes.ok && eventRes.data?.results?.length)) {
    return { found: false };
  }

  // Aggregate top reaction terms across returned events.
  const freq: Record<string, number> = {};
  if (eventRes.ok && eventRes.data?.results) {
    for (const ev of eventRes.data.results) {
      for (const reaction of ev.patient?.reaction ?? []) {
        const term = reaction.reactionmeddrapt;
        if (term) freq[term] = (freq[term] || 0) + 1;
      }
    }
  }
  const topAdverseReactions = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term, count]) => ({ term, count }));

  const seriousEventFlags =
    eventRes.ok && eventRes.data?.results
      ? eventRes.data.results.map((ev) => ({
          serious: ev.serious === '1',
          death: ev.seriousnessdeath === '1',
          hospitalization: ev.seriousnesshospitalization === '1',
        }))
      : [];

  return {
    found: true,
    warningsSnippet: truncate(label?.warnings?.[0], 300),
    boxedWarningSnippet: truncate(label?.boxed_warning?.[0], 300),
    contraindicationsSnippet: truncate(label?.contraindications?.[0], 300),
    topAdverseReactions,
    seriousEventFlags,
    sources: [
      label ? 'openFDA label data' : null,
      eventRes.ok ? 'openFDA adverse event data' : null,
    ].filter(Boolean),
  };
}

// === TOOL 6: search_medicine_by_condition ===
export async function search_medicine_by_condition(condition: string) {
  const url = `${OPENFDA_LABEL}?search=indications_and_usage:"${encodeURIComponent(
    condition
  )}"&limit=5`;
  const res = await fetchJsonWithTimeout<OpenFdaResultShape>(url);

  if (!res.ok || !res.data?.results?.length) {
    return { found: false, message: 'No matching medicines found for this condition' };
  }

  const candidates = res.data.results.map((r) => ({
    brandName: r.openfda?.brand_name?.[0] ?? null,
    genericName: r.openfda?.generic_name?.[0] ?? null,
    pharmClass: r.openfda?.pharm_class_epc?.[0] ?? null,
  }));

  return { found: true, candidates, source: 'openFDA label data' };
}

// Exported for reuse by check_medicine_combination without re-importing.
export { fetchLabelWithFallbacks };
