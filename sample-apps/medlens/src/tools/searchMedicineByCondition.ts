import { z } from "zod";
import { fetchJsonWithTimeout, quotedSearchTerm } from "../utils/fetchWithTimeout";
import { ConditionSearchResult } from "../types";

export const searchMedicineByConditionSchema = z.object({
  condition: z.string().min(1).describe("A medical condition in plain language, e.g. 'high blood pressure'."),
});

export type SearchMedicineByConditionInput = z.infer<typeof searchMedicineByConditionSchema>;

const LABEL_ENDPOINT = "https://api.fda.gov/drug/label.json";

interface OpenFdaLabelResult {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    pharm_class_epc?: string[];
  };
}
interface OpenFdaLabelResponse {
  results?: OpenFdaLabelResult[];
}

export async function searchMedicineByCondition(
  input: SearchMedicineByConditionInput
): Promise<ConditionSearchResult> {
  const { condition } = input;

  try {
    const url = `${LABEL_ENDPOINT}?search=indications_and_usage:${quotedSearchTerm(condition)}&limit=5`;
    const result = await fetchJsonWithTimeout<OpenFdaLabelResponse>(url);

    if (!result.ok || !result.data.results || result.data.results.length === 0) {
      return { found: false, message: "No matching medicines found for this condition" };
    }

    const candidates = result.data.results.map((r) => ({
      brandName: r.openfda?.brand_name?.[0],
      genericName: r.openfda?.generic_name?.[0],
      pharmClass: r.openfda?.pharm_class_epc?.[0],
    }));

    return { found: true, candidates };
  } catch {
    return { found: false, message: "No matching medicines found for this condition" };
  }
}
