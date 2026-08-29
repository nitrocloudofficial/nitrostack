import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NUTRIBITE_BACKEND_URL || 'http://localhost:5000';

function parseInput<T>(input: any): T {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return input as any;
    }
  }
  return input || {};
}

export class FoodTools {
  /**
   * 1. search_food
   */
  @Tool({
    name: 'search_food',
    description: 'Search for pediatric food items to obtain calories, macronutrients (protein, carbs, fat, fibre), serving size, and confidence score.',
    inputSchema: z.object({
      foodName: z.string().describe('Name of the food item to search (e.g. Khichdi, Ragi Porridge, Paneer, Idli)')
    }),
    examples: {
      request: { foodName: 'Khichdi' },
      response: {
        name: 'Moong Dal Khichdi',
        calories: 210,
        protein: 8.5,
        carbohydrates: 36.0,
        fat: 4.2,
        fibre: 5.1,
        servingSize: '1 katori (150g)',
        confidence: 0.98
      }
    }
  })
  async searchFood(rawInput: { foodName: string }, ctx: ExecutionContext) {
    const input = parseInput<{ foodName: string }>(rawInput);
    ctx.logger.info(`[search_food] Querying NutriBite backend for foodName="${input.foodName}"`);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/search-food`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName: input.foodName || String(rawInput) })
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        ctx.logger.info(`[search_food] Found food: ${data.name}`);
        return data;
      }

      ctx.logger.warn(`[search_food] Backend returned status ${response.status}: ${data.message || data.error}`);
      return {
        name: 'Food not found',
        error: data.error || 'Food not found',
        message: data.message || `Food item '${input.foodName}' not found in database.`,
        confidence: 0
      };
    } catch (error) {
      ctx.logger.error('[search_food] Backend connection error', { error: error instanceof Error ? error.message : String(error) });
      return {
        name: 'Food not found',
        error: 'Backend unreachable',
        message: `NutriBite backend at ${BACKEND_URL} is unreachable. Ensure backend is running.`,
        confidence: 0
      };
    }
  }

  /**
   * 2. calculate_nutrition_targets
   */
  @Tool({
    name: 'calculate_nutrition_targets',
    description: 'Calculate daily energy, macronutrient, water, and fibre targets tailored for pediatric growth.',
    inputSchema: z.object({
      age: z.number().min(1).max(18).describe('Child age in years (1 to 18)'),
      gender: z.enum(['male', 'female', 'other']).describe('Child gender'),
      height: z.number().positive().describe('Height in centimeters'),
      weight: z.number().positive().describe('Weight in kilograms'),
      activityLevel: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active']).describe('Physical activity level')
    }),
    examples: {
      request: {
        age: 5,
        gender: 'female',
        height: 108,
        weight: 18,
        activityLevel: 'moderately_active'
      },
      response: {
        'daily calories': 1350,
        protein: 23.4,
        carbohydrates: 185.6,
        fat: 45.0,
        water: 1.4,
        fibre: 15.0
      }
    }
  })
  async calculateNutritionTargets(
    rawInput: {
      age: number;
      gender: 'male' | 'female' | 'other';
      height: number;
      weight: number;
      activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
    },
    ctx: ExecutionContext
  ) {
    const input = parseInput<typeof rawInput>(rawInput);
    ctx.logger.info(`[calculate_nutrition_targets] Querying NutriBite backend targets API for age=${input.age}`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/calculate-targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        return data;
      }
      ctx.logger.warn(`[calculate_nutrition_targets] Backend status ${response.status}`);
    } catch (error) {
      ctx.logger.error('[calculate_nutrition_targets] Backend connection error', { error: error instanceof Error ? error.message : String(error) });
    }

    // Fallback error payload
    return {
      error: 'Backend unreachable',
      message: `NutriBite backend at ${BACKEND_URL} is unreachable.`
    };
  }

  /**
   * 3. filter_allergens
   */
  @Tool({
    name: 'filter_allergens',
    description: 'Filter food list against child allergies (e.g. dairy, nuts, gluten, peanuts, eggs, soy) and return safety classification.',
    inputSchema: z.object({
      foods: z.array(z.string()).describe('List of food names or dish titles to check'),
      allergies: z.array(z.string()).describe('List of child allergies (e.g. dairy, nuts, gluten, peanuts, eggs)')
    }),
    examples: {
      request: {
        foods: ['Paneer Paratha', 'Moong Dal Khichdi', 'Boiled Egg', 'Besan Chilla'],
        allergies: ['dairy', 'eggs']
      },
      response: {
        safeFoods: ['Moong Dal Khichdi', 'Besan Chilla'],
        unsafeFoods: [
          { food: 'Paneer Paratha', allergen: 'dairy', reason: 'Contains dairy product (Paneer).' },
          { food: 'Boiled Egg', allergen: 'eggs', reason: 'Contains egg protein.' }
        ],
        reason: 'Filtered 2 unsafe items containing dairy and eggs. 2 safe foods remain.'
      }
    }
  })
  async filterAllergens(
    rawInput: { foods: string[]; allergies: string[] },
    ctx: ExecutionContext
  ) {
    const input = parseInput<typeof rawInput>(rawInput);
    ctx.logger.info(`[filter_allergens] Screening ${input.foods?.length || 0} foods via NutriBite backend`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/filter-allergens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        return data;
      }
      ctx.logger.warn(`[filter_allergens] Backend status ${response.status}`);
    } catch (error) {
      ctx.logger.error('[filter_allergens] Backend connection error', { error: error instanceof Error ? error.message : String(error) });
    }

    return {
      safeFoods: input.foods || [],
      unsafeFoods: [],
      reason: 'Backend connection error.'
    };
  }

  /**
   * 4. recommend_foods
   */
  @Tool({
    name: 'recommend_foods',
    description: 'Provide personalized pediatric food recommendations and foods to avoid based on child age, goal, diet, and allergies.',
    inputSchema: z.object({
      childProfile: z.object({
        age: z.number().min(1).max(18).describe('Age in years'),
        gender: z.enum(['male', 'female', 'other']).optional().describe('Gender'),
        weight: z.number().positive().optional().describe('Weight in kg'),
        dietaryPreference: z.enum(['vegetarian', 'non_vegetarian', 'eggetarian', 'vegan']).default('vegetarian').describe('Dietary style'),
        allergies: z.array(z.string()).optional().default([]).describe('Known allergies'),
        healthGoal: z.enum(['weight_gain', 'height_growth', 'immunity_boost', 'balanced_growth', 'digestive_health']).default('balanced_growth').describe('Target health goal')
      })
    }),
    examples: {
      request: {
        childProfile: {
          age: 4,
          gender: 'male',
          weight: 15,
          dietaryPreference: 'vegetarian',
          allergies: ['nuts'],
          healthGoal: 'immunity_boost'
        }
      },
      response: {
        recommendedFoods: [
          {
            name: 'Palak Moong Dal Soup',
            category: 'Soup',
            keyNutrients: ['Iron', 'Folate', 'Vitamin A', 'Protein'],
            benefits: 'Boosts white blood cell count and immune defense naturally.'
          }
        ],
        foodsToAvoid: [
          { name: 'Almond Millets Laddu', reason: 'Contains tree nuts (almonds).' },
          { name: 'Ultra-processed sugary snacks', reason: 'Suppresses pediatric immune response and causes energy spikes.' }
        ],
        reason: 'Recommendations focused on immunity-enhancing Indian vegetarian dishes free of nut allergens.'
      }
    }
  })
  async recommendFoods(
    rawInput: {
      childProfile: {
        age: number;
        gender?: string;
        weight?: number;
        dietaryPreference: 'vegetarian' | 'non_vegetarian' | 'eggetarian' | 'vegan';
        allergies?: string[];
        healthGoal: 'weight_gain' | 'height_growth' | 'immunity_boost' | 'balanced_growth' | 'digestive_health';
      }
    },
    ctx: ExecutionContext
  ) {
    const input = parseInput<typeof rawInput>(rawInput);
    ctx.logger.info(`[recommend_foods] Fetching recommendations via NutriBite backend`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/recommend-foods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        return data;
      }
      ctx.logger.warn(`[recommend_foods] Backend status ${response.status}`);
    } catch (error) {
      ctx.logger.error('[recommend_foods] Backend connection error', { error: error instanceof Error ? error.message : String(error) });
    }

    return {
      recommendedFoods: [],
      'recommended foods': [],
      foodsToAvoid: [],
      'foods to avoid': [],
      reason: 'NutriBite backend connection error.'
    };
  }

  /**
   * 5. create_simple_meal_plan
   */
  @Tool({
    name: 'create_simple_meal_plan',
    description: 'Generate a complete, age-appropriate 1-day Indian pediatric meal plan with macronutrient breakdowns and clinical reasoning.',
    inputSchema: z.object({
      age: z.number().min(1).max(18).describe('Child age in years'),
      goal: z.enum(['weight_gain', 'height_growth', 'immunity_boost', 'balanced_growth', 'digestive_health']).describe('Nutritional goal'),
      diet: z.enum(['vegetarian', 'non_vegetarian', 'eggetarian', 'vegan']).describe('Dietary style'),
      allergies: z.array(z.string()).optional().default([]).describe('List of allergies to exclude')
    }),
    examples: {
      request: {
        age: 6,
        goal: 'height_growth',
        diet: 'vegetarian',
        allergies: ['nuts']
      },
      response: {
        breakfast: {
          item: 'Ragi Porridge with Jaggery + 1 Boiled Apple',
          calories: 220,
          protein: 5.5,
          description: 'Calcium-rich finger millet porridge for bone density.'
        },
        lunch: {
          item: 'Moong Dal Khichdi + Palak Soup + Curd',
          calories: 380,
          protein: 14.2,
          description: 'Complete protein blend with digestive probiotics.'
        },
        dinner: {
          item: 'Paneer Bhurji with 1 Soft Roti',
          calories: 320,
          protein: 12.0,
          description: 'High protein dinner promoting muscle recovery overnight.'
        },
        snacks: {
          item: 'Mashed Sweet Potato (Evening) & Roasted Makhana (Morning)',
          calories: 180,
          protein: 3.8,
          description: 'Complex carbs and low-fat crunchy makhana snack.'
        },
        totalCalories: 1100,
        protein: 35.5,
        reasoning: 'Tailored 1100 kcal Indian meal plan for a 6-year-old vegetarian with nut allergy focusing on height growth.'
      }
    }
  })
  async createSimpleMealPlan(
    rawInput: {
      age: number;
      goal: 'weight_gain' | 'height_growth' | 'immunity_boost' | 'balanced_growth' | 'digestive_health';
      diet: 'vegetarian' | 'non_vegetarian' | 'eggetarian' | 'vegan';
      allergies?: string[];
    },
    ctx: ExecutionContext
  ) {
    const input = parseInput<typeof rawInput>(rawInput);
    ctx.logger.info(`[create_simple_meal_plan] Generating meal plan via NutriBite backend`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/create-meal-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        return data;
      }
      ctx.logger.warn(`[create_simple_meal_plan] Backend status ${response.status}`);
    } catch (error) {
      ctx.logger.error('[create_simple_meal_plan] Backend connection error', { error: error instanceof Error ? error.message : String(error) });
    }

    return {
      error: 'Backend connection error',
      reasoning: 'NutriBite backend connection error.'
    };
  }
}
