import fs from 'fs';
import path from 'path';
import { fetchUSDANutrition, extractNutritionPer100g } from './usda.js';
import { GITable } from '../domain/gi-table.js';
import { DishSchema, RestaurantSchema } from '../domain/types.js';
import { clinicalRules, evaluateSafetyVerdicts } from '../domain/clinical-rules.js';

// Configuration
const BASE_DIR = path.resolve(process.cwd(), '..');
const DATA_DIR = path.resolve(process.cwd(), 'data');
const BATCHES = [
  path.join(BASE_DIR, 'batch1.json'),
  path.join(BASE_DIR, 'batch2.json'),
  path.join(BASE_DIR, 'batch3.json'),
];
const CATALOG_OUT = path.join(DATA_DIR, 'catalog.json');
const REPORTS_DIR = path.join(DATA_DIR, 'reports');
const USDA_REPORT_OUT = path.join(REPORTS_DIR, 'usda-resolution.json');

const API_KEY = process.env.FDC_API_KEY || 'DEMO_KEY';

import { INGREDIENT_ALLERGEN_MAP } from '../domain/allergen-map.js';

function checkAllergens(dishName: string, declaredAllergens: string[], ingredients: any[]) {
  const derivedAllergens = new Set<string>();
  
  const EXCEPTIONS = ['almond milk', 'coconut milk', 'soy milk', 'oat milk', 'peanut butter', 'cocoa butter', 'shea butter'];
  
  for (const ing of ingredients) {
    const textToSearch = (ing.name + " " + ing.usda_query).toLowerCase();
    let skipDairy = EXCEPTIONS.some(ex => textToSearch.includes(ex));

    for (const [key, allergens] of Object.entries(INGREDIENT_ALLERGEN_MAP)) {
      if (skipDairy && allergens.includes('dairy')) continue; // skip dairy checks for exceptions
      
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(ing.name) || regex.test(ing.usda_query)) {
        allergens.forEach(a => derivedAllergens.add(a));
      }
    }
  }

  const declaredSet = new Set(declaredAllergens);
  for (const a of derivedAllergens) {
    if (!declaredSet.has(a)) {
      throw new Error(`[Allergen Mismatch] Dish '${dishName}' contains ingredient mapping to '${a}', but it is not declared in allergens!`);
    }
  }
}

async function buildCatalog() {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

  let restaurants: any[] = [];
  let dishes: any[] = [];

  // 1. Merge batches
  for (const batchPath of BATCHES) {
    if (fs.existsSync(batchPath)) {
      const data = JSON.parse(fs.readFileSync(batchPath, 'utf-8'));
      restaurants = restaurants.concat(data.restaurants || []);
      dishes = dishes.concat(data.dishes || []);
    } else {
      console.warn(`[Warning] Batch file not found: ${batchPath}`);
    }
  }

  // Assert unique IDs
  const rIds = new Set();
  for (const r of restaurants) {
    if (rIds.has(r.id)) throw new Error(`Duplicate restaurant ID: ${r.id}`);
    rIds.add(r.id);
  }

  const dIds = new Set();
  for (const d of dishes) {
    if (dIds.has(d.id)) throw new Error(`Duplicate dish ID: ${d.id}`);
    if (!rIds.has(d.restaurant_id)) throw new Error(`Dish ${d.id} references missing restaurant_id ${d.restaurant_id}`);
    dIds.add(d.id);
  }

  const usdaReport: any = {};

  console.log(`Processing ${dishes.length} dishes...`);

  // 2. Resolve USDA queries
  for (const dish of dishes) {
    console.log(`Resolving: ${dish.name}`);
    dish.usda_source_ids = [];
    usdaReport[dish.id] = { name: dish.name, queries: [] };

    let totalMacros = { protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0 };
    let totalMicros = { sodium_mg: 0, iron_mg: 0, calcium_mg: 0, vitamin_d_iu: 0, vitamin_b12_ug: 0, potassium_mg: 0, vitamin_k_ug: 0 };

    const processIngredient = async (query: string, grams: number) => {
      if (!query) return;
      const data = await fetchUSDANutrition(query, API_KEY);
      if (data) {
        dish.usda_source_ids.push(data.fdcId.toString());
        usdaReport[dish.id].queries.push({ query, fdcId: data.fdcId, match: data.description });
        
        const nutritionPer100 = extractNutritionPer100g(data.nutrients);
        const multiplier = grams / 100;
        
        for (const [k, v] of Object.entries(nutritionPer100.macros)) {
          (totalMacros as any)[k] += (v * multiplier);
        }
        for (const [k, v] of Object.entries(nutritionPer100.micros)) {
          (totalMicros as any)[k] += (v * multiplier);
        }
      } else {
        usdaReport[dish.id].queries.push({ query, error: 'Not found' });
      }
    };

    // Process all ingredients
    for (const ing of dish.ingredients) {
      await processIngredient(ing.usda_query, ing.grams);
    }
    
    // Process cooking fat
    if (dish.cooking_fat) {
      await processIngredient(dish.cooking_fat.usda_query, dish.cooking_fat.grams);
    }

    // Process added salt (393mg sodium per gram of salt)
    if (dish.added_salt_g) {
      totalMicros.sodium_mg += dish.added_salt_g * 393;
    }

    dish.macros = {
      protein_g: Number(totalMacros.protein_g.toFixed(1)),
      carbs_g: Number(totalMacros.carbs_g.toFixed(1)),
      fat_g: Number(totalMacros.fat_g.toFixed(1)),
      fibre_g: Number(totalMacros.fibre_g.toFixed(1)),
      sugar_g: Number(totalMacros.sugar_g.toFixed(1))
    };

    dish.micros = {
      sodium_mg: Number(totalMicros.sodium_mg.toFixed(1)),
      iron_mg: Number(totalMicros.iron_mg.toFixed(1)),
      calcium_mg: Number(totalMicros.calcium_mg.toFixed(1)),
      vitamin_d_iu: Number(totalMicros.vitamin_d_iu.toFixed(1)),
      vitamin_b12_ug: Number(totalMicros.vitamin_b12_ug.toFixed(1)),
      potassium_mg: Number(totalMicros.potassium_mg.toFixed(1)),
      vitamin_k_ug: Number(totalMicros.vitamin_k_ug.toFixed(1))
    };

    // Total kcal (rough estimate)
    dish.kcal = Number(((dish.macros.protein_g * 4) + (dish.macros.carbs_g * 4) + (dish.macros.fat_g * 9)).toFixed(0));

    // Cross Validate Allergens
    checkAllergens(dish.name, dish.allergens || [], dish.ingredients);

    // GI Estimate
    const giBase = GITable[dish.gi_basis] ? GITable[dish.gi_basis].base_gi : 50;
    // Adjust downward slightly for fiber and fat
    const giAdjustment = (dish.macros.fibre_g * 0.5) + (dish.macros.fat_g * 0.2);
    dish.glycemic_index_estimate = Math.max(10, Math.floor(giBase - giAdjustment));
    dish.glycemic_index_confidence = dish.gi_basis === 'estimated' || !GITable[dish.gi_basis] ? 'low' : 'medium';
  }

  // Write reports
  fs.writeFileSync(USDA_REPORT_OUT, JSON.stringify(usdaReport, null, 2));

  // Validate output against Zod
  const validRestaurants = restaurants.map(r => RestaurantSchema.parse(r));
  const validDishes = dishes.map(d => DishSchema.parse(d));

  const catalog = {
    restaurants: validRestaurants,
    dishes: validDishes
  };
  fs.writeFileSync(CATALOG_OUT, JSON.stringify(catalog, null, 2));

  // Load Users
  const u1 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', 'u1', 'profile.json'), 'utf-8'));
  const u2 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', 'u2', 'profile.json'), 'utf-8'));
  const u3 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', 'u3', 'profile.json'), 'utf-8'));
  const users = [u1, u2, u3];

  function evaluateDishForUser(user: any, dish: any) {
    let verdicts: any[] = [];
    const conditions = user.chronic_conditions || [];
    const meds = (user.medications || []).map((m: any) => m.name.toLowerCase());
    const allergies = (user.allergies || []).map((a: any) => a.allergen.toLowerCase());

    // Hypertension Block
    if (conditions.includes('Hypertension') && dish.micros.sodium_mg > 2000) {
      verdicts.push({ status: 'BLOCK', reason: 'Sodium > 2000mg' });
    }
    // CKD Blocks
    if (conditions.includes('CKD') && dish.micros.potassium_mg > 2000) {
      verdicts.push({ status: 'BLOCK', reason: 'Potassium > 2000mg' });
    }
    // Allergies
    for (const alg of allergies) {
      if (dish.allergens.includes(alg)) {
        verdicts.push({ status: 'BLOCK', reason: `Allergen: ${alg}` });
      }
    }
    // Warfarin
    if (meds.includes('warfarin') && dish.micros.vitamin_k_ug > 120) {
      verdicts.push({ status: 'BLOCK', reason: 'Vitamin K > 120ug with Warfarin' });
    }
    
    // Evaluate constraints (budget)
    const budget = user.daily_budget_inr || 9999;
    if (dish.price_inr > budget) {
      verdicts.push({ status: 'BLOCK', reason: 'Over budget' });
    }

    return verdicts.length > 0 ? 'BLOCK' : 'PASS';
  }

  const conflictDist: Record<string, number> = {};
  validDishes.forEach(d => {
    const role = (d as any).conflict_role || 'neutral';
    conflictDist[role] = (conflictDist[role] || 0) + 1;
  });

  console.log(`\n=== CATALOG BUILD COMPLETE ===`);
  console.log(`Restaurants: ${validRestaurants.length}`);
  console.log(`Dishes: ${validDishes.length}`);
  console.log(`Conflict Roles:`, conflictDist);
  
  for (const user of users) {
    let blocks = 0;
    let passingDishes = [];

    for (const dish of validDishes) {
      if (evaluateDishForUser(user, dish) === 'BLOCK') {
        blocks++;
      } else {
        passingDishes.push(dish);
      }
    }
    
    passingDishes.sort((a, b) => a.price_inr - b.price_inr);
    const cheapest = passingDishes.length > 0 ? passingDishes[0] : null;
    const mostExpensive = passingDishes.length > 0 ? passingDishes[passingDishes.length - 1] : null;

    console.log(`\nUser ${user.id}:`);
    console.log(`  - BLOCKED dishes: ${blocks}`);
    console.log(`  - PASSING dishes: ${passingDishes.length}`);
    if (cheapest) console.log(`  - Cheapest passing: ${cheapest.name} (₹${cheapest.price_inr})`);
    if (mostExpensive) console.log(`  - Most expensive passing: ${mostExpensive.name} (₹${mostExpensive.price_inr})`);

    if (passingDishes.length < 15 || blocks === 0) {
      console.warn(`\n[WARNING] Persona ${user.id} has ${passingDishes.length} passing and ${blocks} blocked dishes. Catalog is NOT adversarial enough! Regenerate!`);
    }
  }
}

buildCatalog().catch(e => {
  console.error(e);
  process.exit(1);
});

