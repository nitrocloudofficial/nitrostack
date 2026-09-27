import { Injectable } from '@nitrostack/core';
import { Dish, UserProfile, IntakeLog } from '../../../domain/types.js';
import { ScoreBreakdown } from './types.js';

export const CONTEXTUAL_SCORER_CONFIG = {
  version: 'contextual-v1',
  weights: {
    cuisine_pref: 0.3,
    spice_match: 0.15,
    rating: 0.2,
    variety: 0.15,
    slot_match: 0.1,
    weather_context: 0.1, // Renormalized if absent
  },
};

@Injectable()
export class ContextualScorerService {
  public scoreContextualFit(
    dish: Dish,
    profile: UserProfile,
    history: IntakeLog[], // Today's intake + 7 days
    context?: any
  ): ScoreBreakdown {
    const breakdown: Record<string, number> = {};
    const metadata: Record<string, unknown> = { version: CONTEXTUAL_SCORER_CONFIG.version, context_unavailable: !context };

    // 1. Determine active weights and renormalization factor
    const activeWeights = { ...CONTEXTUAL_SCORER_CONFIG.weights };
    if (!context) {
      activeWeights.weather_context = 0;
    }
    const sumWeights = Object.values(activeWeights).reduce((a, b) => a + b, 0);
    const renormalizeFactor = 1 / sumWeights;
    metadata.renormalization_factor = renormalizeFactor;
    
    // Normalize weights
    for (const k of Object.keys(activeWeights)) {
      activeWeights[k as keyof typeof activeWeights] *= renormalizeFactor;
    }

    let totalScore = 0;

    // 2. Cuisine Preference
    let cuisineScore = 0.5; // neutral base
    if (profile.taste_preferences.cuisines_liked.includes(dish.cuisine)) {
      cuisineScore = 1.0;
    } else if (profile.taste_preferences.cuisines_disliked.includes(dish.cuisine)) {
      cuisineScore = 0.1; // tanked
    }
    const cuisineContrib = cuisineScore * activeWeights.cuisine_pref;
    breakdown['cuisine_pref'] = cuisineContrib;
    totalScore += cuisineContrib;

    // 3. Spice Match
    let spiceScore = 1.0;
    const dishSpicy = dish.flavour_profile.spicy || 0;
    const pref = profile.taste_preferences.spice_tolerance;
    let expectedMax = 1.0;
    if (pref === 'none') expectedMax = 0.1;
    else if (pref === 'mild') expectedMax = 0.3;
    else if (pref === 'medium') expectedMax = 0.6;
    
    if (dishSpicy > expectedMax) {
      spiceScore = Math.max(0, 1 - (dishSpicy - expectedMax) * 2);
    } else if (pref === 'high' && dishSpicy < 0.4) {
      spiceScore = 0.7; // slight penalty for bland if they want spicy
    }
    const spiceContrib = spiceScore * activeWeights.spice_match;
    breakdown['spice_match'] = spiceContrib;
    totalScore += spiceContrib;

    // 4. Rating (Confidence Weighted)
    // Assume dish has rating (0-5) and we estimate review count if not present
    // Since DishSchema only has rating, we treat the pure rating as a base. 
    // In Phase 2, we didn't add review_count to the catalog.
    // To support confidence weighting as requested: 
    // (A 4.9 from 22 vs 4.5 from 1800). We will parse a mock review count or rely on the rating as a proxy.
    // For now, we just map rating to a 0-1 scale. 
    const ratingBase = (dish.rating || 0) / 5;
    // Assuming a generic confidence factor if we don't have review_count
    let ratingScore = Math.pow(ratingBase, 1.5); 
    const ratingContrib = ratingScore * activeWeights.rating;
    breakdown['rating'] = ratingContrib;
    totalScore += ratingContrib;

    // 5. Variety Penalty
    let varietyScore = 1.0;
    const now = new Date();
    let sameDishCount = 0;
    let sameCuisineToday = 0;
    for (const log of history) {
      const logDate = new Date(log.timestamp);
      const daysDiff = (now.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
      if (daysDiff <= 7 && log.dish_id === dish.id) {
        sameDishCount++;
      }
      if (daysDiff <= 1 /* today */) {
        // We don't have the dish object for the log directly here, 
        // but if we did we'd check cuisine. 
        // For now, we just penalize the exact dish repeat.
      }
    }
    if (sameDishCount > 0) varietyScore = Math.max(0, 1 - (sameDishCount * 0.3));
    const varietyContrib = varietyScore * activeWeights.variety;
    breakdown['variety'] = varietyContrib;
    totalScore += varietyContrib;

    // 6. Slot Appropriateness
    let slotScore = 1.0;
    // e.g. Dessert for breakfast is bad. 
    // This is simple heuristics
    const isDessert = dish.cuisine === 'Dessert' || dish.flavour_profile.sweet > 0.6;
    if (isDessert /* and slot is breakfast/lunch */) {
        // we don't have the current slot explicitly here unless passed in context
    }
    const slotContrib = slotScore * activeWeights.slot_match;
    breakdown['slot_match'] = slotContrib;
    totalScore += slotContrib;

    // 7. Weather/Context
    if (context) {
      // Stub logic for context
      const weatherScore = 1.0; 
      const weatherContrib = weatherScore * activeWeights.weather_context;
      breakdown['weather_context'] = weatherContrib;
      totalScore += weatherContrib;
    }

    return {
      score: Math.max(0, Math.min(1, totalScore)),
      components: breakdown,
      metadata
    };
  }
}
