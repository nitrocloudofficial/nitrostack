import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class FoodResources {
  /**
   * Resource 1: nutrition://guidelines
   * Indian Pediatric Recommended Dietary Allowances (RDA) & WHO Growth Guidelines
   */
  @Resource({
    uri: 'nutrition://guidelines',
    name: 'Pediatric Nutrition Guidelines',
    description: 'ICMR (Indian Council of Medical Research) & WHO Recommended Dietary Allowances (RDA) for children aged 1-18 years.',
    mimeType: 'application/json',
    examples: {
      response: {
        guidelines: [
          { ageGroup: '1-3 years', dailyCalories: 1060, proteinGrams: 12.5, calciumMg: 500 },
          { ageGroup: '4-6 years', dailyCalories: 1350, proteinGrams: 16.0, calciumMg: 550 }
        ]
      }
    }
  })
  async getGuidelines(uri: string, ctx: ExecutionContext) {
    ctx.logger.info(`[Resource] Accessing pediatric nutrition guidelines: ${uri}`);

    const guidelinesData = {
      title: 'ICMR & WHO Indian Pediatric Nutritional Reference Standards',
      version: '2024.1',
      lastUpdated: '2026-01-15',
      organization: 'NutriKids Pediatric Intelligence / ICMR-NIN Alignment',
      ageGroupsRda: [
        {
          ageGroup: '1-3 years (Toddlers)',
          energyKcal: 1060,
          proteinGrams: 12.5,
          fatGrams: 27.0,
          calciumMg: 500,
          ironMg: 9.0,
          vitaminAUg: 390,
          waterLiters: 1.2,
          fibreGrams: 15.0,
          keyFocus: 'Brain myelination, motor skill growth, high fat requirements for cognitive development.'
        },
        {
          ageGroup: '4-6 years (Early Childhood)',
          energyKcal: 1350,
          proteinGrams: 16.0,
          fatGrams: 25.0,
          calciumMg: 550,
          ironMg: 11.0,
          vitaminAUg: 400,
          waterLiters: 1.4,
          fibreGrams: 18.0,
          keyFocus: 'Bone elongation, active muscular development, gut microbiome diversity.'
        },
        {
          ageGroup: '7-9 years (Middle Childhood)',
          energyKcal: 1700,
          proteinGrams: 23.0,
          fatGrams: 30.0,
          calciumMg: 600,
          ironMg: 16.0,
          vitaminAUg: 600,
          waterLiters: 1.7,
          fibreGrams: 22.0,
          keyFocus: 'Immune resilience, cognitive focus for school, sustained complex carbohydrate energy.'
        },
        {
          ageGroup: '10-12 years (Pre-adolescence)',
          energyKcal: 2100,
          proteinGrams: 32.0,
          fatGrams: 35.0,
          calciumMg: 800,
          ironMg: 28.0,
          vitaminAUg: 600,
          waterLiters: 2.1,
          fibreGrams: 26.0,
          keyFocus: 'Pubertal growth spurt preparation, peak bone mass deposition, iron supplementation for girls.'
        }
      ],
      corePrinciples: [
        'Prefer whole, nutrient-dense bioavailable Indian foods (finger millet, pulses, curd, green leafy vegetables).',
        'Strictly eliminate artificial sweeteners, trans-fats, and carbonated beverages in pediatric diets.',
        'Always ensure age-appropriate texture to avoid choking hazards in children under 3 years.',
        'Maintain zero tolerance for identified food allergen exposure.'
      ]
    };

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(guidelinesData, null, 2)
        }
      ]
    };
  }

  /**
   * Resource 2: nutrition://recipes
   * Curated Indian Nutrient-Dense Pediatric Recipes
   */
  @Resource({
    uri: 'nutrition://recipes',
    name: 'Nutritious Indian Child Recipes',
    description: 'Step-by-step nutrient-rich Indian recipes designed for toddlers and children with allergen safety tags.',
    mimeType: 'application/json',
    examples: {
      response: {
        recipes: [
          { title: 'Superfood Ragi Halwa', prepTime: '15 mins', keyNutrients: ['Calcium', 'Iron'] }
        ]
      }
    }
  })
  async getRecipes(uri: string, ctx: ExecutionContext) {
    ctx.logger.info(`[Resource] Accessing pediatric recipes database: ${uri}`);

    const recipesData = {
      title: 'NutriKids Curated Indian Pediatric Recipe Book',
      count: 3,
      recipes: [
        {
          id: 'recipe-001',
          name: 'Fortified Ragi & Jaggery Porridge',
          prepTimeMinutes: 15,
          servingAgeGroup: '1-6 years',
          ingredients: [
            '2 tbsp Ragi (Finger Millet) flour',
            '1 cup Milk (or Almond Milk for dairy-free)',
            '1 tsp Organic Jaggery powder',
            '1/2 tsp Cow Ghee',
            'Pinch of Cardamom powder'
          ],
          instructions: [
            'Dissolve ragi flour in 1/4 cup cold water to avoid lumps.',
            'Warm remaining milk in a small saucepan over medium heat.',
            'Pour ragi mixture into milk, stirring continuously for 6-8 minutes until thickened.',
            'Stir in ghee, jaggery, and cardamom. Cool to warm room temperature before serving.'
          ],
          nutritionalProfile: { calories: 195, protein: 5.2, calciumMg: 210, ironMg: 2.8 },
          allergens: ['dairy (optional replacement available)'],
          healthTags: ['Bone Building', 'High Calcium', 'Toddler Favorite']
        },
        {
          id: 'recipe-002',
          name: 'Palak Moong Dal Power Khichdi',
          prepTimeMinutes: 20,
          servingAgeGroup: '1-12 years',
          ingredients: [
            '1/2 cup Yellow Moong Dal',
            '1/2 cup Rice (or Foxtail Millet)',
            '1/2 cup finely chopped Spinach (Palak)',
            '1/4 tsp Cumin seeds (Jeera)',
            'Pinch of Turmeric (Haldi)',
            '1 tsp Cow Ghee'
          ],
          instructions: [
            'Wash dal and rice together, soak for 15 minutes.',
            'Heat ghee in pressure cooker, add cumin seeds until they splutter.',
            'Add spinach, turmeric, soaked dal, rice, and 3.5 cups water.',
            'Pressure cook for 4 whistles until soft and mashable. Mash lightly with spoon.'
          ],
          nutritionalProfile: { calories: 240, protein: 9.5, ironMg: 3.5, fibreGrams: 5.2 },
          allergens: [],
          healthTags: ['Immunity Booster', 'Iron Rich', 'Easy Digestion', 'Gluten Free']
        },
        {
          id: 'recipe-003',
          name: 'High-Protein Besan Vegetable Chilla',
          prepTimeMinutes: 12,
          servingAgeGroup: '2-18 years',
          ingredients: [
            '1/2 cup Besan (Gram Flour)',
            '2 tbsp finely grated Carrot',
            '2 tbsp finely chopped Tomato',
            '1/4 tsp Ajwain (Carom seeds)',
            'Water as needed for batter',
            '1 tsp Oil/Ghee for pan cooking'
          ],
          instructions: [
            'Mix besan, ajwain, grated vegetables, salt, and water into a smooth pouring batter.',
            'Heat a non-stick tawa, pour 1 ladle batter and spread evenly into a circle.',
            'Drizzle ghee on edges, cook both sides until golden brown. Serve warm.'
          ],
          nutritionalProfile: { calories: 175, protein: 8.4, fibreGrams: 4.2, carbsGrams: 22.0 },
          allergens: [],
          healthTags: ['High Protein', 'Gluten Free', 'Quick Breakfast']
        }
      ]
    };

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(recipesData, null, 2)
        }
      ]
    };
  }

  /**
   * Resource 3: nutrition://food-database
   * Comprehensive Indian Pediatric Food Dataset
   */
  @Resource({
    uri: 'nutrition://food-database',
    name: 'Pediatric Food Database',
    description: 'Comprehensive database of Indian pediatric foods with macronutrients, micronutrients, and allergen flags.',
    mimeType: 'application/json',
    examples: {
      response: {
        foods: [
          { name: 'Moong Dal Khichdi', calories: 210, protein: 8.5 }
        ]
      }
    }
  })
  async getFoodDatabase(uri: string, ctx: ExecutionContext) {
    ctx.logger.info(`[Resource] Accessing pediatric food database: ${uri}`);

    const databaseData = {
      title: 'NutriKids Indian Pediatric Food Master Catalog',
      totalRecords: 10,
      disclaimer: 'Nutritional data validated against ICMR Indian Food Composition Tables (IFCT).',
      foods: [
        {
          id: 'food-1',
          name: 'Moong Dal Khichdi',
          servingSize: '1 katori (150g)',
          calories: 210,
          proteinGrams: 8.5,
          carbsGrams: 36.0,
          fatGrams: 4.2,
          fibreGrams: 5.1,
          allergens: [],
          isVegetarian: true,
          isGlutenFree: true
        },
        {
          id: 'food-2',
          name: 'Ragi Porridge (Nachni Kheer)',
          servingSize: '1 bowl (150g)',
          calories: 185,
          proteinGrams: 4.8,
          carbsGrams: 32.5,
          fatGrams: 3.8,
          fibreGrams: 4.2,
          allergens: ['dairy'],
          isVegetarian: true,
          isGlutenFree: true
        },
        {
          id: 'food-3',
          name: 'Paneer Paratha',
          servingSize: '1 paratha (100g)',
          calories: 275,
          proteinGrams: 11.2,
          carbsGrams: 30.0,
          fatGrams: 12.5,
          fibreGrams: 3.5,
          allergens: ['dairy', 'gluten'],
          isVegetarian: true,
          isGlutenFree: false
        },
        {
          id: 'food-4',
          name: 'Idli with Sambhar',
          servingSize: '2 idlis + 1/2 cup sambhar',
          calories: 190,
          proteinGrams: 6.8,
          carbsGrams: 37.0,
          fatGrams: 1.5,
          fibreGrams: 4.0,
          allergens: [],
          isVegetarian: true,
          isGlutenFree: true
        },
        {
          id: 'food-5',
          name: 'Curd Rice (Dahi Chawal)',
          servingSize: '1 katori (150g)',
          calories: 195,
          proteinGrams: 6.0,
          carbsGrams: 31.0,
          fatGrams: 5.0,
          fibreGrams: 1.2,
          allergens: ['dairy'],
          isVegetarian: true,
          isGlutenFree: true
        },
        {
          id: 'food-6',
          name: 'Palak Moong Dal Soup',
          servingSize: '1 bowl (180ml)',
          calories: 135,
          proteinGrams: 7.2,
          carbsGrams: 18.0,
          fatGrams: 3.0,
          fibreGrams: 4.8,
          allergens: [],
          isVegetarian: true,
          isGlutenFree: true
        },
        {
          id: 'food-7',
          name: 'Besan Chilla',
          servingSize: '1 chilla (80g)',
          calories: 165,
          proteinGrams: 8.0,
          carbsGrams: 22.0,
          fatGrams: 4.5,
          fibreGrams: 4.0,
          allergens: [],
          isVegetarian: true,
          isGlutenFree: true
        },
        {
          id: 'food-8',
          name: 'Banana Oats Smoothie',
          servingSize: '1 glass (200ml)',
          calories: 220,
          proteinGrams: 7.0,
          carbsGrams: 40.0,
          fatGrams: 3.5,
          fibreGrams: 5.0,
          allergens: ['dairy'],
          isVegetarian: true,
          isGlutenFree: true
        },
        {
          id: 'food-9',
          name: 'Boiled Egg / Egg Bhurji',
          servingSize: '2 eggs (100g)',
          calories: 155,
          proteinGrams: 12.6,
          carbsGrams: 1.1,
          fatGrams: 10.5,
          fibreGrams: 0.0,
          allergens: ['eggs'],
          isVegetarian: false,
          isGlutenFree: true
        },
        {
          id: 'food-10',
          name: 'Almond Millets Laddu',
          servingSize: '1 laddu (35g)',
          calories: 180,
          proteinGrams: 4.5,
          carbsGrams: 24.0,
          fatGrams: 7.5,
          fibreGrams: 3.2,
          allergens: ['nuts', 'dairy'],
          isVegetarian: true,
          isGlutenFree: true
        }
      ]
    };

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(databaseData, null, 2)
        }
      ]
    };
  }
}
