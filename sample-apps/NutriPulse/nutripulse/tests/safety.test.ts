import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { evaluateDishSafety } from '../src/domain/safety-evaluator.js';
import { Dish, UserProfile, LabReport } from '../src/domain/types.js';
import { clinicalRules } from '../src/domain/clinical-rules.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');

let catalogDishes: Dish[] = [];
let u1: UserProfile;
let u2: UserProfile;
let u3: UserProfile;
let u1Labs: LabReport;
let u2Labs: LabReport;
let u3Labs: LabReport;

beforeAll(() => {
  const catalog = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'catalog.json'), 'utf-8'));
  catalogDishes = catalog.dishes;

  u1 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', 'u1', 'profile.json'), 'utf-8'));
  u2 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', 'u2', 'profile.json'), 'utf-8'));
  u3 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', 'u3', 'profile.json'), 'utf-8'));

  u1Labs = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', 'u1', 'labs.json'), 'utf-8'))[0];
  u2Labs = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', 'u2', 'labs.json'), 'utf-8'))[0];
  u3Labs = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', 'u3', 'labs.json'), 'utf-8'))[0];
});

describe('check_meal_safety exhaustive tests', () => {

  it('U2 + any peanut-containing dish -> BLOCK, every time', () => {
    // Find all peanut dishes
    const peanutDishes = catalogDishes.filter(d => 
      d.allergens.includes('peanut') || 
      (d.ingredients || []).some(i => i.name.toLowerCase().includes('peanut'))
    );
    expect(peanutDishes.length).toBeGreaterThan(0);

    for (const dish of peanutDishes) {
      const verdicts = evaluateDishSafety(dish, u2, u2Labs);
      const isBlocked = verdicts.some(v => v.status === 'BLOCK');
      expect(isBlocked).toBe(true);
      const allergyVerdict = verdicts.find(v => v.rule_id.includes('ALLERGY_PEANUT') || v.rule_text.includes('peanut'));
      expect(allergyVerdict).toBeDefined();
    }
  });

  it('U2 + high vitamin-K dish -> BLOCK on warfarin interaction', () => {
    // Find a dish with >120ug vitamin K
    const highKDishes = catalogDishes.filter(d => d.micros.vitamin_k_ug > 120);
    expect(highKDishes.length).toBeGreaterThan(0);

    for (const dish of highKDishes) {
      const verdicts = evaluateDishSafety(dish, u2, u2Labs);
      const isBlocked = verdicts.some(v => v.status === 'BLOCK');
      expect(isBlocked).toBe(true);
      const warfarinVerdict = verdicts.find(v => v.rule_id === 'drug_warfarin_vitk');
      expect(warfarinVerdict).toBeDefined();
    }
  });

  it('U1 + high-sodium budget_trap -> BLOCK', () => {
    // budget_trap is a conflict_role that is cheap but bad for clinical
    const budgetTraps = catalogDishes.filter(d => d.conflict_role === 'budget_trap' && d.micros.sodium_mg > 2000);
    expect(budgetTraps.length).toBeGreaterThan(0);

    for (const dish of budgetTraps) {
      const verdicts = evaluateDishSafety(dish, u1, u1Labs);
      const isBlocked = verdicts.some(v => v.status === 'BLOCK');
      expect(isBlocked).toBe(true);
      const sodiumVerdict = verdicts.find(v => v.rule_id === 'htn_sodium_cap');
      expect(sodiumVerdict).toBeDefined();
    }
  });

  it('U3 + high-potassium dish -> BLOCK', () => {
    const dish = JSON.parse(JSON.stringify(catalogDishes[0]));
    dish.micros.potassium_mg = 2500;

    const verdicts = evaluateDishSafety(dish, u3, u3Labs);
    const isBlocked = verdicts.some(v => v.status === 'BLOCK');
    expect(isBlocked).toBe(true);
    const ckdVerdict = verdicts.find(v => v.rule_id === 'ckd_potassium_cap');
    expect(ckdVerdict).toBeDefined();
  });

  it('WARN verdicts aggregate but do not cancel out or upgrade to BLOCK automatically', () => {
    // U1 has prediabetes (fasting_glucose high) -> WARN for sugar > 15g
    // Find a dish that triggers only WARNs for U1
    const warnDish = catalogDishes.find(d => 
      d.macros.sugar_g > 15 && 
      d.macros.sugar_g <= 30 && // Not severe diabetes yet
      d.micros.sodium_mg <= 2000 // avoid hypertension block
    );
    
    if (warnDish) {
      const verdicts = evaluateDishSafety(warnDish, u1, u1Labs);
      const hasWarn = verdicts.some(v => v.status === 'WARN');
      const hasBlock = verdicts.some(v => v.status === 'BLOCK');
      expect(hasWarn).toBe(true);
      expect(hasBlock).toBe(false);
    }
  });

  it('Property test: no combination of soft rules ever downgrades a BLOCK', () => {
    const highKDishes = catalogDishes.filter(d => d.micros.vitamin_k_ug > 120);
    const dish = highKDishes[0];
    
    // Add artificial soft benefits
    dish.macros.protein_g = 100;
    dish.micros.calcium_mg = 1000;
    
    const verdicts = evaluateDishSafety(dish, u2, u2Labs);
    const isBlocked = verdicts.some(v => v.status === 'BLOCK');
    expect(isBlocked).toBe(true);
  });

});
