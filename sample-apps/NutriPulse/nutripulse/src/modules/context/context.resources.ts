import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { IntakeRepository } from '../../data/repositories/intake-repository.js';
import { UserRepository } from '../../data/repositories/user-repository.js';
import { HistoryRepository } from '../../data/repositories/history-repository.js';
import { BudgetRepository } from '../../data/repositories/budget-repository.js';
import path from 'path';
import fs from 'fs';

export class contextResources {
  
  private intakeRepo = new IntakeRepository();
  private userRepo = new UserRepository();
  private historyRepo = new HistoryRepository();
  private budgetRepo = new BudgetRepository();

  @Resource({
    uri: 'intake://{userId}/today',
    name: 'Today\'s Intake',
    description: 'Read this to obtain the meals consumed today, including running totals for kcal, macros, sodium, sugar, and remaining envelope headroom.',
    mimeType: 'application/json',
  })
  async getIntakeToday(context: ExecutionContext) {
    const uri = String(context.metadata?.uri || '');
    const match = uri.match(/intake:\/\/([^/]+)\/today/);
    const userId = match ? match[1] : null;

    if (!userId) throw new Error("Missing userId in URI");

    const intake = this.intakeRepo.getTodayByUserId(userId);
    const user = this.userRepo.getById(userId);
    if (!user) throw new Error(`User not found: ${userId}`);

    const catalogPath = path.join(process.cwd(), 'data', 'catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    
    let totalKcal = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalSodium = 0;
    let totalSugar = 0;

    for (const log of intake) {
      const dish = catalog.dishes.find((d: any) => d.id === log.dish_id);
      if (dish) {
        totalKcal += dish.kcal * log.portion_multiplier;
        totalProtein += dish.macros.protein_g * log.portion_multiplier;
        totalCarbs += dish.macros.carbs_g * log.portion_multiplier;
        totalFat += dish.macros.fat_g * log.portion_multiplier;
        totalSodium += dish.micros.sodium_mg * log.portion_multiplier;
        totalSugar += dish.macros.sugar_g * log.portion_multiplier;
      }
    }

    const kcalTarget = user.diet_plan.daily_kcal_target;
    // Calculate macro targets based on pct
    const pTarget = (kcalTarget * (user.diet_plan.macro_split.protein_pct / 100)) / 4;
    const cTarget = (kcalTarget * (user.diet_plan.macro_split.carbs_pct / 100)) / 4;
    const fTarget = (kcalTarget * (user.diet_plan.macro_split.fat_pct / 100)) / 9;
    
    const sodiumCap = user.chronic_conditions.includes('Hypertension') ? 2000 : 2300;

    const data = {
      logs: intake,
      totals: {
        kcal: Math.round(totalKcal),
        protein_g: Math.round(totalProtein),
        carbs_g: Math.round(totalCarbs),
        fat_g: Math.round(totalFat),
        sodium_mg: Math.round(totalSodium),
        sugar_g: Math.round(totalSugar)
      },
      headroom: {
        kcal_remaining: Math.round(kcalTarget - totalKcal),
        protein_g_remaining: Math.round(pTarget - totalProtein),
        carbs_g_remaining: Math.round(cTarget - totalCarbs),
        fat_g_remaining: Math.round(fTarget - totalFat),
        sodium_mg_remaining: Math.round(sodiumCap - totalSodium)
      }
    };
    
    const stat = this.intakeRepo.getStatSync(userId);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2)
      }],
      annotations: { audience: ['any'], priority: 1 },
      lastModified: stat ? stat.mtimeMs : undefined
    };
  }

  @Resource({
    uri: 'budget://{userId}',
    name: 'Weekly Budget',
    description: 'Read this to obtain the user\'s weekly budget constraint, spend to date, and remaining budget.',
    mimeType: 'application/json',
  })
  async getBudget(context: ExecutionContext) {
    const uri = String(context.metadata?.uri || '');
    const match = uri.match(/budget:\/\/([^/]+)/);
    const userId = match ? match[1] : null;

    if (!userId) throw new Error("Missing userId in URI");
    
    const data = this.budgetRepo.getBudgetState(userId);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2)
      }],
      annotations: { audience: ['any'], priority: 0.8 },
      lastModified: Date.now() // Computed resource
    };
  }
}

