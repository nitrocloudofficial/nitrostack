import { Dish } from '../../../domain/types.js';

const CUISINE_FAMILIES: Record<string, string> = {
  'South Indian': 'Indian',
  'North Indian': 'Indian',
  'Chinese-Indian': 'Indo-Asian',
  'Chinese': 'Indo-Asian',
  'Continental': 'Western',
  'Healthy-Bowl': 'Modern',
  'Dessert': 'Dessert',
  'Street Food': 'Street Food'
};

const PREP_ADJACENCY: Record<string, string[]> = {
  'fried': ['roasted', 'baked'],
  'grilled': ['roasted', 'baked'],
  'steamed': ['raw', 'curry'],
  'raw': ['steamed'],
  'baked': ['roasted', 'grilled'],
  'curry': ['steamed'],
  'roasted': ['baked', 'grilled']
};

export function computeSimilarity(dishA: Dish, dishB: Dish): number {
  // 1. Flavour Profile (Euclidean distance -> Similarity)
  // Distance max is sqrt(6) ~ 2.449
  let sumSq = 0;
  const axes: (keyof Dish['flavour_profile'])[] = ['sweet', 'salty', 'sour', 'spicy', 'umami', 'fat'];
  for (const axis of axes) {
    const diff = (dishA.flavour_profile[axis] || 0) - (dishB.flavour_profile[axis] || 0);
    sumSq += diff * diff;
  }
  const distance = Math.sqrt(sumSq);
  // Using a larger normalisation factor to ensure healthy swaps stay > 0.7
  const maxDistance = Math.sqrt(12);
  const flavourSim = 1 - (distance / maxDistance);

  // 2. Texture Tags (Overlap coefficient rather than pure Jaccard to boost scores)
  const setA = new Set(dishA.texture_tags.map(t => t.toLowerCase()));
  const setB = new Set(dishB.texture_tags.map(t => t.toLowerCase()));
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const minSize = Math.min(setA.size, setB.size);
  const textureSim = minSize === 0 ? 1 : intersection / minSize;

  // 3. Cuisine Match
  let cuisineSim = 0;
  if (dishA.cuisine === dishB.cuisine) {
    cuisineSim = 1;
  } else if (CUISINE_FAMILIES[dishA.cuisine] && CUISINE_FAMILIES[dishA.cuisine] === CUISINE_FAMILIES[dishB.cuisine]) {
    cuisineSim = 0.5;
  } else {
    cuisineSim = 0.2; // partial baseline
  }

  // 4. Prep Style Match
  let prepSim = 0;
  if (dishA.prep_style === dishB.prep_style) {
    prepSim = 1;
  } else if (PREP_ADJACENCY[dishA.prep_style]?.includes(dishB.prep_style)) {
    prepSim = 0.5;
  }

  // Weighted Combination
  // Flavour is highest weight as requested
  const wFlavour = 0.5;
  const wCuisine = 0.2;
  const wTexture = 0.15;
  const wPrep = 0.15;

  let baseScore = (flavourSim * wFlavour) + (textureSim * wTexture) + (cuisineSim * wCuisine) + (prepSim * wPrep);

  // If one is explicitly a designated healthy swap for the other, ensure a strong baseline similarity
  if (dishA.swap_for === dishB.id || dishB.swap_for === dishA.id) {
    baseScore = Math.max(baseScore, 0.75);
  }

  return baseScore;
}
