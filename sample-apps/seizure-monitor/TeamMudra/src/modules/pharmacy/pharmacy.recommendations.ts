import { z } from "@nitrostack/core";

export type RecommendationPriority = "HIGH" | "MEDIUM" | "LOW";

export interface PharmacyRecommendation {
  priority: RecommendationPriority;
  itemId: string;
  itemName: string;

  reason: string;
  recommendedAction: string;

  suggestedOrderQuantity: number;
}

export const RecommendPharmacyReorderInputSchema = z.object({
  category: z.string().optional(),
  includeLowPriority: z.boolean().optional().default(false),
  expiringWithinDays: z
    .number()
    .int()
    .positive()
    .optional()
    .default(30),
});

export type RecommendPharmacyReorderInput =
  z.infer<typeof RecommendPharmacyReorderInputSchema>;

export interface RecommendPharmacyReorderOutput {
  recommendations: PharmacyRecommendation[];
}