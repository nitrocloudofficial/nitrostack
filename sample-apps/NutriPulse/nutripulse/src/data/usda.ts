import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.resolve(process.cwd(), 'data', 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'usda_cache.json');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

let cache: Record<string, any> = {};
if (fs.existsSync(CACHE_FILE)) {
  cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
}

function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Normalises USDA foodNutrients into our micro/macro schema per 100g.
 * USDA Nutrient IDs:
 * Protein: 1003
 * Fat: 1004
 * Carbohydrate: 1005
 * Fiber: 1079
 * Sugars: 2000
 * Sodium: 1093
 * Iron: 1089
 * Calcium: 1087
 * Vitamin D: 1114
 * Vitamin B12: 1178
 * Potassium: 1092
 * Vitamin K: 1185
 */
export function extractNutritionPer100g(nutrients: any[]) {
  const getNutrient = (id: number) => {
    const n = nutrients.find((n: any) => n.nutrientId === id || n.nutrient?.id === id);
    return n ? n.value || n.amount || 0 : 0;
  };

  return {
    macros: {
      protein_g: getNutrient(1003),
      carbs_g: getNutrient(1005),
      fat_g: getNutrient(1004),
      fibre_g: getNutrient(1079),
      sugar_g: getNutrient(2000),
    },
    micros: {
      sodium_mg: getNutrient(1093),
      iron_mg: getNutrient(1089),
      calcium_mg: getNutrient(1087),
      vitamin_d_iu: getNutrient(1114), // IU may need conversion if USDA is in mcg
      vitamin_b12_ug: getNutrient(1178),
      potassium_mg: getNutrient(1092),
      vitamin_k_ug: getNutrient(1185),
    }
  };
}

export async function fetchUSDANutrition(query: string, apiKey: string) {
  if (query in cache) {
    return cache[query];
  }

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&pageSize=1`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`USDA API failed with status ${res.status}`);
    }
    const data = await res.json() as any;
    if (data.foods && data.foods.length > 0) {
      const food = data.foods[0];
      const result = {
        fdcId: food.fdcId,
        description: food.description,
        nutrients: food.foodNutrients
      };
      cache[query] = result;
      saveCache();
      return result;
    }
    return null; // Not found
  } catch (err) {
    console.error(`[USDA Client] Error fetching ${query}:`, (err as any).message);
    return null; // Graceful fallback on API failure
  }
}
