import { z } from '@nitrostack/core';

export const ShoeSchema = z.object({
  _id: z.string().optional(),
  itemNo: z.string(),
  brand: z.string(),
  model: z.string(),
  category: z.enum(['Casual', 'Sports', 'Professional']),
  gender: z.enum(['Men', 'Women', 'Unisex']),
  imageUrl: z.string().url(),
  size: z.string(),
  length_cm: z.number(),
  width_cm: z.number(),
  aspect_ratio: z.number(),
  tags: z.array(z.string()),
  price_tier: z.enum(['budget', 'mid', 'premium']),
});

export type Shoe = z.infer<typeof ShoeSchema>;

export const QuizAnswersSchema = z.object({
  gender: z.enum(['Men', 'Women', 'Unisex']),
  use: z.enum(['Casual', 'Sports', 'Professional']),
  fit: z.enum(['narrow', 'normal', 'wide']),
  style: z.enum(['classic', 'trendy', 'minimalist']),
  budget: z.enum(['budget', 'mid', 'premium']),
});

export type QuizAnswers = z.infer<typeof QuizAnswersSchema>;

export const RecommendationSchema = z.object({
  shoe: ShoeSchema,
  matchingPercentage: z.number().min(0).max(100),
  reasons: z.array(z.string()),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;
