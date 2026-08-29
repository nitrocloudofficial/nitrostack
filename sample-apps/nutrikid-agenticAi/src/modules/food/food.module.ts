import { Module } from '@nitrostack/core';
import { FoodTools } from './food.tools.js';
import { FoodResources } from './food.resources.js';
import { FoodPrompts } from './food.prompts.js';

@Module({
  name: 'food',
  description: 'NutriKids Pediatric Nutrition & Food Intelligence Module',
  controllers: [
    FoodTools,
    FoodResources,
    FoodPrompts,
  ],
  providers: [
    FoodTools,
    FoodResources,
    FoodPrompts,
  ],
  exports: [
    FoodTools,
    FoodResources,
    FoodPrompts,
  ],
})
export class FoodModule {}