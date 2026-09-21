import { z } from "zod";
import { fetchJsonWithTimeout, quotedSearchTerm, rawSearchTerm } from "../utils/fetchWithTimeout";
import { RegulatoryResult } from "../types";

export const getDrugRegulatoryStatusSchema = z.object({
  drugName: z.string().min(1).describe("Brand or generic drug name to look up, e.g. 'Tylenol' or 'acetaminophen'."),
});

export type GetDrugRegulatoryStatusInput = z.infer<typeof getDrugRegulatoryStatusSchema>;

const LABEL_ENDPOINT = "https://api.fda.gov/drug/label.json";

interface OpenFdaLabelResult {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    route?: string[];
    pharm_class_epc?: string[];
  };
  boxed_warning?: string[];
  indications_and_usage?: string[];
}

interface OpenFdaLabelResponse {
  results?: OpenFdaLabelResult[];
}

/**
 * Tries, in order: quoted generic_name match, quoted brand_name match,
 * unquoted generic_name match. Stops at the first search that returns a
 * result. This mirrors how people actually type drug names (brand vs
 * generic, with or without exact casing) without guessing which one a
 * given user meant.
 */
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
    // A 404 from openFDA means "no matches for this query" — expected, so we
    // just fall through to the next fallback rather than treating it as an error.
  }
  return null;
}

export async function getDrugRegulatoryStatus(input: GetDrugRegulatoryStatusInput): Promise<RegulatoryResult> {
  const { drugName } = input;

  try {
    const label = await fetchFirstLabelMatch(drugName);

    if (!label) {
      return { found: false, message: "No FDA label data found for this drug name." };
    }

    const openfda = label.openfda ?? {};
    const indication = label.indications_and_usage?.[0];

    return {
      found: true,
      brandName: openfda.brand_name?.[0],
      genericName: openfda.generic_name?.[0],
      manufacturerName: openfda.manufacturer_name?.[0],
      route: openfda.route?.[0],
      pharmClassEpc: openfda.pharm_class_epc?.[0],
      boxedWarning: Boolean(label.boxed_warning && label.boxed_warning.length > 0),
      indicationSnippet: indication ? indication.slice(0, 200) : undefined,
    };
  } catch (err) {
    // Defensive catch-all: guarantees this tool never throws, even if
    // openFDA changes shape unexpectedly.
    return { found: false, message: "No FDA label data found for this drug name." };
  }
}
