import { z } from "zod";
import { findGenericEquivalent } from "./findGenericEquivalent";
import { CostEstimateResult } from "../types";

export const getDrugCostEstimateSchema = z.object({
  drugName: z.string().min(1).describe("Drug name to get a qualitative cost-tier signal for (no real-time pricing)."),
});

export type GetDrugCostEstimateInput = z.infer<typeof getDrugCostEstimateSchema>;

/**
 * There is no free, reliable real-time pricing API in scope for this MVP.
 * This tool deliberately never returns a dollar figure — only a qualitative
 * signal derived from whether the queried name resolves as branded (SBD) or
 * generic (SCD) in RxNorm, plus a pointer to find_generic_equivalent for
 * concrete alternatives.
 */
export async function getDrugCostEstimate(input: GetDrugCostEstimateInput): Promise<CostEstimateResult> {
  const { drugName } = input;

  try {
    const equivalent = await findGenericEquivalent({ drugName });

    if (equivalent.found && equivalent.resolvedTTY === "SBD") {
      return {
        drug: drugName,
        costSignal: "brand-tier",
        note: "Generic equivalents are typically lower-cost than brand-name versions; use find_generic_equivalent for specific alternatives — real-time pricing not available in MVP scope.",
      };
    }

    return {
      drug: drugName,
      costSignal: "generic-tier or unresolved",
      note: "Real-time pricing not available in MVP scope.",
    };
  } catch {
    return {
      drug: drugName,
      costSignal: "generic-tier or unresolved",
      note: "Real-time pricing not available in MVP scope.",
    };
  }
}
