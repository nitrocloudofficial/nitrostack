import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { 
  UserProfileSchema, LabReportSchema, BiometricSnapshotSchema, 
  OrderSchema, MealFeedbackSchema, IntakeLogSchema
} from '../domain/types.js';
import { evaluateSafetyVerdicts } from '../domain/clinical-rules.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const RUNTIME_DIR = path.join(DATA_DIR, 'runtime');
const CATALOG_PATH = path.join(DATA_DIR, 'catalog.json');

// Ensure catalog exists
if (!fs.existsSync(CATALOG_PATH)) {
  console.error("catalog.json not found! Run build-catalog.ts first.");
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
const allDishes = catalog.dishes;

// Utility functions
const today = new Date();
today.setUTCHours(12, 0, 0, 0); // Normalize to noon UTC

function getDateOffset(days: number) {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function randomChoice(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildLabs(userId: string) {
  const reports = [];
  const reportDates = [getDateOffset(-180), getDateOffset(-5)]; // 6 months ago, and 5 days ago

  for (const date of reportDates) {
    let panels: any[] = [];
    
    if (userId === 'u1') {
      // U1 (T2 diabetes, hypertension, iron deficient)
      panels = [
        { name: 'HbA1c', value: 7.4, unit: '%', reference_range: { low: 4.0, high: 5.6 }, status: 'high' },
        { name: 'Fasting Glucose', value: 140, unit: 'mg/dL', reference_range: { low: 70, high: 99 }, status: 'high' },
        { name: 'Haemoglobin', value: 13.5, unit: 'g/dL', reference_range: { low: 13.0, high: 17.0 }, status: 'normal' },
        { name: 'Serum Ferritin', value: 15, unit: 'ng/mL', reference_range: { low: 30, high: 400 }, status: 'low' },
        { name: 'Transferrin Saturation', value: 18, unit: '%', reference_range: { low: 20, high: 50 }, status: 'low' },
        { name: 'LDL Cholesterol', value: 120, unit: 'mg/dL', reference_range: { low: 0, high: 99 }, status: 'high' },
        { name: 'eGFR', value: 95, unit: 'mL/min', reference_range: { low: 90, high: 140 }, status: 'normal' },
      ];
    } else if (userId === 'u2') {
      // U2 (severe peanut allergy, warfarin, vitamin D deficient, athlete)
      panels = [
        { name: '25-OH Vitamin D', value: 18, unit: 'ng/mL', reference_range: { low: 30, high: 100 }, status: 'low' },
        { name: 'INR', value: 2.5, unit: '', reference_range: { low: 2.0, high: 3.0 }, status: 'normal' },
        { name: 'Haemoglobin', value: 16.5, unit: 'g/dL', reference_range: { low: 12.0, high: 16.0 }, status: 'high' },
      ];
    } else if (userId === 'u3') {
      // U3 (CKD stage 2, dyslipidemia)
      panels = [
        { name: 'eGFR', value: 75, unit: 'mL/min', reference_range: { low: 90, high: 140 }, status: 'low' },
        { name: 'Creatinine', value: 1.3, unit: 'mg/dL', reference_range: { low: 0.7, high: 1.2 }, status: 'high' },
        { name: 'Potassium', value: 5.0, unit: 'mmol/L', reference_range: { low: 3.5, high: 5.1 }, status: 'normal' },
        { name: 'Phosphorus', value: 4.4, unit: 'mg/dL', reference_range: { low: 2.5, high: 4.5 }, status: 'normal' },
        { name: 'LDL Cholesterol', value: 145, unit: 'mg/dL', reference_range: { low: 0, high: 99 }, status: 'high' },
        { name: 'Triglycerides', value: 210, unit: 'mg/dL', reference_range: { low: 0, high: 149 }, status: 'high' },
        { name: 'HDL Cholesterol', value: 35, unit: 'mg/dL', reference_range: { low: 40, high: 60 }, status: 'low' },
      ];
    }

    const report = {
      user_id: userId,
      report_date: date,
      panels,
      deficiency_vector: [] as any[]
    };
    
    // Derive deficiency vector (simplified for demo matching clinical rules)
    if (panels.some(p => p.name === 'Serum Ferritin' && p.status === 'low')) {
      report.deficiency_vector.push({ nutrient: 'Iron', severity: 'moderate', target_uplift: 1.5 });
    }
    if (panels.some(p => p.name === '25-OH Vitamin D' && p.status === 'low')) {
      report.deficiency_vector.push({ nutrient: 'Vitamin D', severity: 'severe', target_uplift: 2.0 });
    }

    reports.push(report);
  }

  return reports.map(r => LabReportSchema.parse(r));
}

function buildTelemetry(userId: string) {
  const snapshots = [];
  
  let hydrationDeficit = 0;
  
  for (let i = -7; i <= 0; i++) {
    const timestamp = getDateOffset(i);
    let steps, active_kcal, resting_kcal, sleep_duration, sleep_deep, sleep_rem, sleep_eff, hr_resting, hr_recovery, spo2, hydration, stress;

    if (userId === 'u1') {
      // Sedentary to moderate, poor sleep, chronically low hydration
      steps = 4000 + Math.random() * 2000;
      active_kcal = steps * 0.04;
      resting_kcal = 1800;
      
      sleep_duration = i === 0 ? 240 : (360 + Math.random() * 60); // Today is very poor sleep
      sleep_eff = i === 0 ? 60 : 75;
      
      hydration = 1500 + Math.random() * 300;
      hydrationDeficit += (2500 - hydration);
      
      stress = sleep_duration < 300 ? 80 : 50 + Math.random() * 10;
      hr_resting = 72 + (stress > 70 ? 4 : 0);
      hr_recovery = sleep_duration < 300 ? 12 : 18;
      
      spo2 = 96;
    } else if (userId === 'u2') {
      // Athlete, high steps, one rest day, good sleep except mid week
      const isRestDay = i === -3;
      steps = isRestDay ? 4000 : 12000 + Math.random() * 6000;
      active_kcal = steps * 0.05;
      resting_kcal = 1600;
      
      const isPoorSleep = i === -4; // Mid-week poor sleep
      sleep_duration = isPoorSleep ? 300 : 480 + Math.random() * 60;
      sleep_eff = isPoorSleep ? 65 : 85;
      
      hydration = isRestDay ? 2000 : 3500;
      
      stress = isPoorSleep ? 65 : (isRestDay ? 30 : 45);
      hr_resting = 48 + (isPoorSleep ? 3 : 0);
      // HR recovery up next day if sleep adequate
      const yesterdaySleep = (i === -3) ? 300 : 480; // Hardcoded past lookup
      hr_recovery = yesterdaySleep < 400 ? 25 : 45 + (steps > 15000 ? 5 : 0);
      
      spo2 = 99;
    } else {
      // u3: sedentary, fragmented sleep, elevated HR
      steps = 2000 + Math.random() * 1000;
      active_kcal = steps * 0.03;
      resting_kcal = 1900;
      
      sleep_duration = 320 + Math.random() * 60;
      sleep_eff = 65 + Math.random() * 10;
      
      hydration = 1800 + Math.random() * 200;
      stress = 60 + Math.random() * 15;
      
      hr_resting = 82;
      hr_recovery = 10;
      spo2 = 95;
    }

    snapshots.push({
      timestamp,
      steps: Math.floor(steps),
      active_kcal: Math.floor(active_kcal),
      resting_kcal,
      sleep: {
        duration_min: Math.floor(sleep_duration),
        deep_min: Math.floor(sleep_duration * 0.15),
        rem_min: Math.floor(sleep_duration * 0.20),
        efficiency_pct: Math.floor(sleep_eff)
      },
      hr_resting,
      hr_recovery,
      spo2_pct: spo2,
      hydration_ml: Math.floor(hydration),
      stress_index: Math.floor(stress)
    });
  }

  return snapshots.map(s => BiometricSnapshotSchema.parse(s));
}

function buildHistory(userId: string) {
  const orders = [];
  const feedbacks = [];
  
  let orderCount = 20 + Math.floor(Math.random() * 10);
  
  for (let i = 0; i < orderCount; i++) {
    // Pick random dish
    const dish = randomChoice(allDishes);
    const orderId = `ord_${userId}_${i}`;
    
    orders.push({
      id: orderId,
      user_id: userId,
      timestamp: getDateOffset(-Math.floor(Math.random() * 60) - 1),
      dish_id: dish.id,
      price_inr: dish.price_inr,
      meal_slot: randomChoice(['breakfast', 'lunch', 'dinner', 'snack'])
    });
    
    if (Math.random() < 0.4) {
      feedbacks.push({
        id: `fb_${orderId}`,
        order_id: orderId,
        rating: Math.floor(Math.random() * 5) + 1,
        liked: Math.random() > 0.5,
        comments: "Auto-generated feedback"
      });
    }
  }
  
  // Specifically inject biryani/fried food history for U1
  if (userId === 'u1') {
    const biryanis = allDishes.filter((d: any) => d.name.toLowerCase().includes('biryani') || d.prep_style === 'fried');
    if (biryanis.length > 0) {
      for(let j=0; j<5; j++) {
        const dish = randomChoice(biryanis);
        const orderId = `ord_${userId}_b${j}`;
        orders.push({
          id: orderId,
          user_id: userId,
          timestamp: getDateOffset(-Math.floor(Math.random() * 10) - 1),
          dish_id: dish.id,
          price_inr: dish.price_inr,
          meal_slot: 'dinner'
        });
      }
    }
  }

  return {
    orders: orders.map(o => OrderSchema.parse(o)),
    feedbacks: feedbacks.map(f => MealFeedbackSchema.parse(f))
  };
}

function buildIntake(userId: string) {
  const logs = [];
  
  if (userId === 'u1') {
    // Breakfast and snack, high sodium
    const highSodiumDishes = allDishes.filter((d: any) => d.micros.sodium_mg > 800);
    if (highSodiumDishes.length >= 2) {
      logs.push({
        user_id: userId,
        timestamp: new Date().toISOString(),
        dish_id: highSodiumDishes[0].id,
        portion_multiplier: 1.0
      });
      logs.push({
        user_id: userId,
        timestamp: new Date().toISOString(),
        dish_id: highSodiumDishes[1].id,
        portion_multiplier: 1.0
      });
    }
  } else if (userId === 'u2') {
    // Post workout protein
    const highProteinDishes = allDishes.filter((d: any) => d.macros.protein_g > 30);
    if (highProteinDishes.length >= 1) {
      logs.push({
        user_id: userId,
        timestamp: new Date().toISOString(),
        dish_id: highProteinDishes[0].id,
        portion_multiplier: 1.0
      });
    }
  } else if (userId === 'u3') {
    // Light breakfast
    const lightDishes = allDishes.filter((d: any) => d.kcal < 300);
    if (lightDishes.length >= 1) {
      logs.push({
        user_id: userId,
        timestamp: new Date().toISOString(),
        dish_id: lightDishes[0].id,
        portion_multiplier: 1.0
      });
    }
  }
  
  return logs.map(l => IntakeLogSchema.parse(l));
}

function main() {
  const users = ['u1', 'u2', 'u3'].map(id => 
    JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', id, 'profile.json'), 'utf-8'))
  );
  const audit: any = {};
  
  // Ensure runtime exists
  if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });

  for (const profile of users) {
    const uid = profile.id;
    const userDir = path.join(USERS_DIR, uid);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    
    // Save Profile
    fs.writeFileSync(path.join(userDir, 'profile.json'), JSON.stringify(UserProfileSchema.parse(profile), null, 2));
    
    // Labs
    const labs = buildLabs(uid);
    fs.writeFileSync(path.join(userDir, 'labs.json'), JSON.stringify(labs, null, 2));
    
    // Telemetry
    const telemetry = buildTelemetry(uid);
    fs.writeFileSync(path.join(userDir, 'telemetry.json'), JSON.stringify(telemetry, null, 2));
    
    // History
    const history = buildHistory(uid);
    fs.writeFileSync(path.join(userDir, 'history.json'), JSON.stringify(history, null, 2));
    
    // Intake
    const intake = buildIntake(uid);
    const runtimeUserDir = path.join(RUNTIME_DIR, uid);
    if (!fs.existsSync(runtimeUserDir)) fs.mkdirSync(runtimeUserDir, { recursive: true });
    fs.writeFileSync(path.join(runtimeUserDir, 'intake-today.json'), JSON.stringify(intake, null, 2));
    
    // Audit metrics
    const outOfRange = labs.flatMap(r => r.panels).filter(p => p.status !== 'normal').length;
    let todayKcal = 0;
    let todaySodium = 0;
    for (const log of intake) {
      const d = allDishes.find((x: any) => x.id === log.dish_id);
      if (d) {
        todayKcal += d.kcal * log.portion_multiplier;
        todaySodium += d.micros.sodium_mg * log.portion_multiplier;
      }
    }
    
    // Daily cap calculation fallback
    const sodiumCap = profile.chronic_conditions.includes('Hypertension') ? 2000 : 2300;
    const kcalCap = profile.diet_plan.daily_kcal_target;

    audit[uid] = {
      labs_out_of_range: outOfRange,
      telemetry_days: telemetry.length,
      order_count: history.orders.length,
      feedback_count: history.feedbacks.length,
      today_intake_pct_kcal: ((todayKcal / kcalCap) * 100).toFixed(1) + '%',
      today_intake_pct_sodium: ((todaySodium / sodiumCap) * 100).toFixed(1) + '%'
    };
  }

  // Cleanup old unnested u1.json files to prevent confusion
  for (const u of users) {
    const fPath = path.join(USERS_DIR, `${u}.json`);
    if (fs.existsSync(fPath)) fs.unlinkSync(fPath);
  }

  console.log("=== BUILD USERS COMPLETE ===");
  console.log(JSON.stringify(audit, null, 2));
}

main();
