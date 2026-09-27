import { Injectable } from '@nitrostack/core';
import { Dish, IntakeLog } from '../../../domain/types.js';
import { ScoreBreakdown } from './types.js';
import { computeSimilarity } from './similarity.service.js';
import * as fs from 'fs';
import * as path from 'path';

export const CRAVING_SCORER_CONFIG = {
  version: 'craving-v1',
  confidence_threshold: 0.3, // Min confidence for resolving free text
};

@Injectable()
export class CravingScorerService {
  private catalogDishes: Dish[];

  constructor() {
    const catalogPath = path.join(process.cwd(), 'data', 'catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    this.catalogDishes = catalog.dishes;
  }

  public scoreCravingSatisfaction(
    dish: Dish,
    craving?: string, // dish_id, cuisine, or free-text
    history?: IntakeLog[]
  ): ScoreBreakdown {
    const metadata: Record<string, unknown> = { version: CRAVING_SCORER_CONFIG.version };
    let score = 0;

    if (craving) {
      metadata.expressed_craving = craving;
      // 1. Is it a known dish_id?
      let anchorDish = this.catalogDishes.find(d => d.id === craving);
      let matchConfidence = 1.0;

      // 2. Is it a known cuisine?
      if (!anchorDish) {
        const cuisineMatch = this.catalogDishes.filter(d => d.cuisine.toLowerCase() === craving.toLowerCase());
        if (cuisineMatch.length > 0) {
          // If craving is a cuisine, we just boost dishes in that cuisine
          score = dish.cuisine.toLowerCase() === craving.toLowerCase() ? 1.0 : 0.0;
          return {
            score,
            components: { cuisine_match: score },
            metadata: { ...metadata, resolved_type: 'cuisine', anchor_cuisine: craving }
          };
        }
      }

      // 3. Free text resolution
      if (!anchorDish) {
        let bestMatch: Dish | undefined;
        let bestScore = 0;
        
        for (const catDish of this.catalogDishes) {
          let tokenScore = 0;
          const query = craving.toLowerCase();
          if (catDish.name.toLowerCase().includes(query)) tokenScore += 0.5;
          if (catDish.description.toLowerCase().includes(query)) tokenScore += 0.3;
          if (catDish.ingredients?.some(i => i.name.toLowerCase().includes(query))) tokenScore += 0.2;

          if (tokenScore > bestScore) {
            bestScore = tokenScore;
            bestMatch = catDish;
          }
        }

        if (bestMatch && bestScore >= CRAVING_SCORER_CONFIG.confidence_threshold) {
          anchorDish = bestMatch;
          matchConfidence = bestScore;
        } else {
          // Threshold not met. DO NOT silently fall back to history.
          return {
            score: 0,
            components: { craving_unresolved: 1 }, // flag for resolver
            metadata: { ...metadata, resolved_type: 'unresolved', reason: 'below_confidence_threshold' }
          };
        }
      }

      // Score against anchor dish
      metadata.resolved_type = 'dish';
      metadata.anchor_dish_id = anchorDish.id;
      metadata.match_confidence = matchConfidence;

      score = computeSimilarity(dish, anchorDish);
      return {
        score,
        components: { similarity_to_anchor: score },
        metadata
      };

    } else {
      // No craving expressed -> derive soft preference from history
      metadata.source = 'derived';
      
      // Stub: if history has recent dishes, average their similarity
      if (history && history.length > 0) {
        // Just checking against the most recent dish as a proxy for derived preference
        const lastDishId = history[0].dish_id;
        const lastDish = this.catalogDishes.find(d => d.id === lastDishId);
        if (lastDish) {
           score = computeSimilarity(dish, lastDish) * 0.5; // halved confidence
        }
      } else {
        score = 0.5; // neutral
      }

      return {
        score,
        components: { derived_similarity: score },
        metadata
      };
    }
  }
}
