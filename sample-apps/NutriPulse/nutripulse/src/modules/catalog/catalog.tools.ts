import { ToolDecorator as Tool, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { DishRepository } from '../../data/repositories/dish-repository.js';
import { Dish } from '../../domain/types.js';

// ---------- Zod schemas for input ----------

const FiltersSchema = z.object({
  cuisine: z.array(z.string()).optional().describe('Filter to these cuisines (case-insensitive substring match).'),
  veg: z.boolean().optional().describe('If true, exclude dishes with meat/fish allergens.'),
  max_price_inr: z.number().optional().describe('Maximum price in INR.'),
  min_rating: z.number().optional().describe('Minimum rating (1-5).'),
  restaurant_ids: z.array(z.string()).optional().describe('Restrict to these restaurant IDs.'),
  prep_style: z.array(z.string()).optional().describe('Filter by prep styles (fried, grilled, steamed, etc).'),
  exclude_allergens: z.array(z.string()).optional().describe('Exclude dishes containing any of these allergens.'),
  max_kcal: z.number().optional().describe('Maximum calories per serving.'),
  min_protein_g: z.number().optional().describe('Minimum protein in grams.'),
  max_sodium_mg: z.number().optional().describe('Maximum sodium in mg.'),
  max_sugar_g: z.number().optional().describe('Maximum sugar in grams.'),
  texture_tags: z.array(z.string()).optional().describe('Prefer dishes with any of these texture tags.'),
}).optional();

const SearchInputSchema = z.object({
  query: z.string().optional().describe('Free-text search query. Matched against dish name, description, and cuisine.'),
  filters: FiltersSchema.describe('Structured filters to narrow results.'),
  sort: z.enum(['relevance', 'rating', 'price_asc', 'price_desc', 'protein_desc']).optional().default('relevance').describe('Sort order for results.'),
  limit: z.number().min(1).max(50).optional().default(20).describe('Number of results to return (max 50).'),
});

type SearchInput = z.infer<typeof SearchInputSchema>;
type Filters = z.infer<typeof FiltersSchema>;

// ---------- Non-meat allergen categories for veg filter ----------

const MEAT_ALLERGENS = ['fish', 'shellfish'];
const MEAT_KEYWORDS = ['chicken', 'mutton', 'lamb', 'beef', 'pork', 'prawn', 'shrimp', 'crab', 'lobster', 'fish', 'bacon', 'ham', 'salami', 'keema'];

// ---------- Pure helper functions (exported for testability) ----------

/**
 * Simple token-based text relevance score.
 * Tokenizes the query and scores each dish field by token matches.
 * Returns 0 for no match, higher for better matches.
 */
export function textScore(dish: Dish, query: string): number {
  if (!query || query.trim().length === 0) return 1; // No query = everything matches equally

  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 1;

  let score = 0;
  const name = dish.name.toLowerCase();
  const desc = dish.description.toLowerCase();
  const cuisine = dish.cuisine.toLowerCase();

  for (const token of tokens) {
    // Name match is strongest signal
    if (name.includes(token)) score += 3;
    // Cuisine match
    if (cuisine.includes(token)) score += 2;
    // Description match
    if (desc.includes(token)) score += 1;
  }

  return score;
}

/**
 * Apply all structured filters to a dish. Returns true if the dish passes ALL filters.
 */
export function applyFilters(dish: Dish, filters: Filters): boolean {
  if (!filters) return true;

  if (filters.cuisine && filters.cuisine.length > 0) {
    const dishCuisine = dish.cuisine.toLowerCase();
    if (!filters.cuisine.some(c => dishCuisine.includes(c.toLowerCase()))) return false;
  }

  if (filters.veg === true) {
    // Exclude if any allergen is a meat type or dish name/description contains meat keywords
    const hasMeatAllergen = dish.allergens.some(a => MEAT_ALLERGENS.includes(a.toLowerCase()));
    const hasMeatKeyword = MEAT_KEYWORDS.some(kw => dish.name.toLowerCase().includes(kw) || dish.description.toLowerCase().includes(kw));
    if (hasMeatAllergen || hasMeatKeyword) return false;
  }

  if (filters.max_price_inr !== undefined && dish.price_inr > filters.max_price_inr) return false;
  if (filters.min_rating !== undefined && dish.rating < filters.min_rating) return false;

  if (filters.restaurant_ids && filters.restaurant_ids.length > 0) {
    if (!filters.restaurant_ids.includes(dish.restaurant_id)) return false;
  }

  if (filters.prep_style && filters.prep_style.length > 0) {
    if (!filters.prep_style.includes(dish.prep_style)) return false;
  }

  if (filters.exclude_allergens && filters.exclude_allergens.length > 0) {
    const dishAllergens = dish.allergens.map(a => a.toLowerCase());
    if (filters.exclude_allergens.some(ea => dishAllergens.includes(ea.toLowerCase()))) return false;
  }

  if (filters.max_kcal !== undefined && dish.kcal > filters.max_kcal) return false;
  if (filters.min_protein_g !== undefined && dish.macros.protein_g < filters.min_protein_g) return false;
  if (filters.max_sodium_mg !== undefined && dish.micros.sodium_mg > filters.max_sodium_mg) return false;
  if (filters.max_sugar_g !== undefined && dish.macros.sugar_g > filters.max_sugar_g) return false;

  // texture_tags is a preference boost, not a hard filter — handled in scoring
  return true;
}

/**
 * Compute a texture bonus if the dish has matching texture tags.
 */
export function textureBonus(dish: Dish, textureTags?: string[]): number {
  if (!textureTags || textureTags.length === 0) return 0;
  const matches = dish.texture_tags.filter(t => textureTags.some(ft => t.toLowerCase().includes(ft.toLowerCase())));
  return matches.length * 0.5;
}

/**
 * Sort dishes according to the requested sort order.
 */
export function sortDishes(dishes: Array<{ dish: Dish; score: number }>, sort: string): Array<{ dish: Dish; score: number }> {
  switch (sort) {
    case 'rating':
      return dishes.sort((a, b) => b.dish.rating - a.dish.rating);
    case 'price_asc':
      return dishes.sort((a, b) => a.dish.price_inr - b.dish.price_inr);
    case 'price_desc':
      return dishes.sort((a, b) => b.dish.price_inr - a.dish.price_inr);
    case 'protein_desc':
      return dishes.sort((a, b) => b.dish.macros.protein_g - a.dish.macros.protein_g);
    case 'relevance':
    default:
      return dishes.sort((a, b) => b.score - a.score);
  }
}

interface RelaxedFilter {
  filter: string;
  original_value: number | string;
  relaxed_to: number | string;
  relaxation: string;
}

/**
 * Attempt to find near-miss results by progressively relaxing numeric filters.
 * Returns relaxed results and which filters were loosened.
 */
export function findNearMisses(
  allDishes: Dish[],
  query: string | undefined,
  filters: Filters,
  limit: number
): { dishes: Dish[]; relaxed_filters: RelaxedFilter[] } {
  if (!filters) return { dishes: [], relaxed_filters: [] };

  const relaxed: RelaxedFilter[] = [];
  let relaxedFilters = { ...filters };

  // Define relaxation steps: each is [filter key, relaxation factor, human description]
  const numericRelaxations: Array<{
    key: keyof NonNullable<Filters>;
    factor: number;
    direction: 'increase' | 'decrease';
    label: string;
  }> = [
    { key: 'max_sodium_mg', factor: 1.5, direction: 'increase', label: 'sodium cap' },
    { key: 'max_kcal', factor: 1.3, direction: 'increase', label: 'calorie cap' },
    { key: 'max_sugar_g', factor: 1.5, direction: 'increase', label: 'sugar cap' },
    { key: 'max_price_inr', factor: 1.5, direction: 'increase', label: 'price cap' },
    { key: 'min_protein_g', factor: 0.7, direction: 'decrease', label: 'protein floor' },
    { key: 'min_rating', factor: 0.8, direction: 'decrease', label: 'rating floor' },
  ];

  for (const { key, factor, direction, label } of numericRelaxations) {
    const original = relaxedFilters[key] as number | undefined;
    if (original === undefined) continue;

    const newValue = direction === 'increase'
      ? Math.round(original * factor)
      : Math.round(original * factor * 10) / 10;

    (relaxedFilters as any)[key] = newValue;
    relaxed.push({
      filter: key,
      original_value: original,
      relaxed_to: newValue,
      relaxation: `${label} ${direction === 'increase' ? 'raised' : 'lowered'} from ${original} to ${newValue}`,
    });

    // Try with relaxed filters
    const scored = allDishes
      .filter(d => applyFilters(d, relaxedFilters))
      .filter(d => !query || textScore(d, query) > 0)
      .map(d => ({ dish: d, score: textScore(d, query || '') }))
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      return {
        dishes: scored.slice(0, limit).map(s => s.dish),
        relaxed_filters: relaxed,
      };
    }
  }

  // If still nothing, drop all numeric filters and return top matches by text
  if (query) {
    const textOnly = allDishes
      .map(d => ({ dish: d, score: textScore(d, query) }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (textOnly.length > 0) {
      relaxed.push({
        filter: 'all_numeric_filters',
        original_value: 'applied',
        relaxed_to: 'dropped',
        relaxation: 'All numeric filters dropped, showing text-matched results only',
      });
      return { dishes: textOnly.map(s => s.dish), relaxed_filters: relaxed };
    }
  }

  // Last resort: return top-rated dishes
  const topRated = [...allDishes].sort((a, b) => b.rating - a.rating).slice(0, Math.min(5, limit));
  relaxed.push({
    filter: 'all_filters',
    original_value: 'applied',
    relaxed_to: 'dropped',
    relaxation: 'No matches found even with relaxation. Showing top-rated dishes as fallback.',
  });
  return { dishes: topRated, relaxed_filters: relaxed };
}

// ---------- NitroStack Tool ----------

@Injectable()
export class catalogTools {
  private dishRepo = new DishRepository();

  @Tool({
    name: 'search_catalog',
    description: 'LOW-LEVEL LOOKUP ONLY. Returns UNVALIDATED dishes with NO safety checking and NO clinical filtering. Never use this to make a recommendation — use resolve_recommendation. Use only when the user explicitly asks to browse a restaurant\'s menu or look up a specific dish.',
    inputSchema: SearchInputSchema,
  })
  async searchCatalog(
    input: SearchInput,
    context: ExecutionContext
  ) {
    const { query, filters, sort = 'relevance', limit = 20 } = input;
    const allDishes = this.dishRepo.getAll();

    // Step 1: Apply text scoring
    let candidates = allDishes.map(d => ({
      dish: d,
      score: textScore(d, query || '') + textureBonus(d, filters?.texture_tags),
    }));

    // Step 2: Filter by text relevance (if query provided, require score > 0)
    if (query && query.trim().length > 0) {
      candidates = candidates.filter(c => c.score > 0);
    }

    // Step 3: Apply structured filters
    let filtered = candidates.filter(c => applyFilters(c.dish, filters));

    // Step 4: Handle zero results → near-miss relaxation
    if (filtered.length === 0) {
      const nearMisses = findNearMisses(allDishes, query, filters, limit);
      return {
        results: nearMisses.dishes,
        total_matched: nearMisses.dishes.length,
        relaxed_filters: nearMisses.relaxed_filters,
        calculation_trace: {
          query,
          filters_applied: filters ?? {},
          strict_match_count: 0,
          relaxation_applied: true,
          note: 'No dishes matched all filters. Results shown are near-misses with relaxed constraints.',
        },
      };
    }

    // Step 5: Sort
    const sorted = sortDishes(filtered, sort);
    const totalMatched = sorted.length;

    // Step 6: Limit
    const results = sorted.slice(0, limit).map(s => s.dish);

    return {
      results,
      total_matched: totalMatched,
      calculation_trace: {
        query,
        filters_applied: filters ?? {},
        strict_match_count: totalMatched,
        results_returned: results.length,
        sort_order: sort,
        relaxation_applied: false,
      },
    };
  }
}
