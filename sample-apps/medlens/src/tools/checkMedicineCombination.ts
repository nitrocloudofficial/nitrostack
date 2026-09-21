import { z } from "zod";
import { getDrugSafetyProfile } from "./getDrugSafetyProfile";
import { CombinationResult } from "../types";

export const checkMedicineCombinationSchema = z.object({
  drugA: z.string().min(1).describe("First drug name."),
  drugB: z.string().min(1).describe("Second drug name."),
});

export type CheckMedicineCombinationInput = z.infer<typeof checkMedicineCombinationSchema>;

function mentionsOther(warningsText: string | undefined, otherName: string): boolean {
  if (!warningsText) return false;
  return warningsText.toLowerCase().includes(otherName.toLowerCase());
}

export async function checkMedicineCombination(input: CheckMedicineCombinationInput): Promise<CombinationResult> {
  const { drugA, drugB } = input;

  try {
    const [profileA, profileB] = await Promise.all([
      getDrugSafetyProfile({ drugName: drugA }),
      getDrugSafetyProfile({ drugName: drugB }),
    ]);

    const aWarningsMentionB =
      mentionsOther(profileA.warningsSnippet, drugB) || mentionsOther(profileA.contraindicationsSnippet, drugB);
    const bWarningsMentionA =
      mentionsOther(profileB.warningsSnippet, drugA) || mentionsOther(profileB.contraindicationsSnippet, drugA);

    const risky = aWarningsMentionB || bWarningsMentionA;

    if (risky) {
      return {
        risky: true,
        recommendation: `${drugA}'s and/or ${drugB}'s label warnings reference the other drug. Space doses by at least 2 hours and consult a pharmacist before combining them.`,
        comparedDrug: risky ? (aWarningsMentionB ? drugB : drugA) : undefined,
      };
    }

    return {
      risky: false,
      recommendation:
        "No documented interaction found in label warnings, but this is a curated substring check, not an exhaustive interaction database — verify with a pharmacist before combining.",
    };
  } catch {
    return {
      risky: false,
      recommendation:
        "Could not complete the interaction check due to an upstream data issue. Verify with a pharmacist before combining these medicines.",
    };
  }
}
