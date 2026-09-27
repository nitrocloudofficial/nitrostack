import { z } from "zod";
import { MedLensReportPayload } from "../types";

const adverseReactionSchema = z.object({
  term: z.string(),
  count: z.number(),
});

const regulatorySectionSchema = z.object({
  brandName: z.string().optional(),
  genericName: z.string().optional(),
  manufacturer: z.string().optional(),
  route: z.string().optional(),
  pharmClass: z.string().optional(),
  boxedWarning: z.boolean(),
  indicationSnippet: z.string().optional(),
});

const safetySectionSchema = z.object({
  warningsSnippet: z.string().optional(),
  contraindicationsSnippet: z.string().optional(),
  topAdverseReactions: z.array(adverseReactionSchema).optional(),
  boxedWarningSnippet: z.string().optional(),
});

const combinationSectionSchema = z.object({
  risky: z.boolean(),
  recommendation: z.string(),
  comparedDrug: z.string().optional(),
});

const genericSectionSchema = z.object({
  rxcui: z.string().optional(),
  resolvedTTY: z.string().optional(),
  ingredientName: z.string().optional(),
  genericOptions: z.array(z.string()).optional(),
});

const costSectionSchema = z.object({
  costSignal: z.string(),
  note: z.string(),
});

/**
 * Mirrors MedLensReportPayload in ../types.ts. Kept as a hand-written Zod
 * schema (rather than deriving the interface from it) because types.ts is
 * shared with the widget's plain-TS prop types and shouldn't take on a
 * runtime dependency on Zod.
 */
export const medLensReportPayloadSchema = z.object({
  drugName: z.string().min(1),
  sections: z.object({
    regulatory: regulatorySectionSchema.optional(),
    safety: safetySectionSchema.optional(),
    combination: combinationSectionSchema.optional(),
    generic: genericSectionSchema.optional(),
    cost: costSectionSchema.optional(),
  }),
  sourcesUsed: z.array(z.string()),
});

export const renderMedLensReportSchema = z.object({
  payload: medLensReportPayloadSchema.describe(
    "The assembled MedLensReportPayload. Build this with buildReportPayload() " +
      "from whichever tool results are relevant, per AGENT_INSTRUCTIONS.md, " +
      "then pass it here as the final step to render the comparison card."
  ),
});

export type RenderMedLensReportInput = z.infer<typeof renderMedLensReportSchema>;

/**
 * Not a data-fetching tool: this is a pure pass-through. Its only job is to
 * hand the already-assembled report payload back as structuredContent so
 * the MCP host renders it via the ui://widget/medlens.html resource
 * registered in app.module.ts. See widget/entry.tsx for the consumer side.
 */
export function renderMedLensReport(input: RenderMedLensReportInput): MedLensReportPayload {
  return input.payload as MedLensReportPayload;
}
