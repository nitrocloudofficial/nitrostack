import { Injectable } from '@nitrostack/core';
import type {
  FitWiseMatch,
  FitWiseQuery,
  FitWiseResult,
  ShoeRecord,
} from '../types/shoe.types.js';

export function calculateAccurateShoeSize(lengthMm: number, gender: 'men' | 'women' | 'unisex' = 'men') {
  // Standard Length-Only ISO/barleycorn metric conversion:
  // 240mm -> UK 5.0 / US 6.0 / EU 38.5
  // 250mm -> UK 6.0 / US 7.0 / EU 40.0
  // 260mm -> UK 7.0 / US 8.0 / EU 41.0
  // 265mm -> UK 7.5 / US 8.5 / EU 42.0
  // 270mm-273mm -> UK 8.5 / US 9.5 / EU 43.0
  // 275mm-278mm -> UK 9.0 / US 10.0 / EU 44.0
  const isWomen = gender === 'women';
  let us = 9.5;

  if (lengthMm <= 230) us = isWomen ? 6.0 : 5.0;
  else if (lengthMm <= 235) us = isWomen ? 6.5 : 5.5;
  else if (lengthMm <= 240) us = isWomen ? 7.0 : 6.0;
  else if (lengthMm <= 245) us = isWomen ? 7.5 : 6.5;
  else if (lengthMm <= 250) us = isWomen ? 8.0 : 7.0;
  else if (lengthMm <= 255) us = isWomen ? 8.5 : 7.5;
  else if (lengthMm <= 260) us = isWomen ? 9.0 : 8.0;
  else if (lengthMm <= 265) us = isWomen ? 9.5 : 8.5;
  else if (lengthMm <= 270) us = isWomen ? 10.0 : 9.0;
  else if (lengthMm <= 274) us = isWomen ? 10.5 : 9.5; // 272mm -> UK 8.5 / US 9.5
  else if (lengthMm <= 278) us = isWomen ? 11.0 : 10.0;
  else if (lengthMm <= 283) us = isWomen ? 11.5 : 10.5;
  else if (lengthMm <= 288) us = isWomen ? 12.0 : 11.0;
  else if (lengthMm <= 293) us = isWomen ? 12.5 : 11.5;
  else us = isWomen ? 13.0 : 12.0;

  const uk = isWomen ? us - 2.0 : us - 1.0;
  const eu = Math.round((us + 33.5) * 2) / 2;

  return { us, uk, eu };
}

export const FITWISE_WEIGHTS = {
  categories: {
    geometry: 0.35,
    activity: 0.25,
    functional: 0.15,
    medical: 0.10,
    comfort: 0.10,
    budget: 0.05,
  },
  geometrySubWeights: {
    length: 0.35,
    forefootWidth: 0.30,
    heelWidth: 0.15,
    toeShape: 0.15,
    halluxAngle: 0.05,
  },
};

@Injectable()
export class FitWiseEngineService {
  calculateBmi(heightCm?: number, weightKg?: number): { bmi: number; category: string; widthOffsetMm: number } {
    const h = heightCm && heightCm > 50 ? heightCm : 175;
    const w = weightKg && weightKg > 20 ? weightKg : 75;
    const heightM = h / 100;
    const bmi = w / (heightM * heightM);
    const roundedBmi = Math.round(bmi * 10) / 10;

    let category = 'Normal';
    let widthOffsetMm = 0;

    if (roundedBmi < 18.5) {
      category = 'Underweight';
      widthOffsetMm = -1.0;
    } else if (roundedBmi >= 25 && roundedBmi < 30) {
      category = 'Overweight';
      widthOffsetMm = 2.0;
    } else if (roundedBmi >= 30) {
      category = 'Obese';
      widthOffsetMm = 4.5;
    }

    return { bmi: roundedBmi, category, widthOffsetMm };
  }

  filterEligibleShoes(shoes: ShoeRecord[], query: FitWiseQuery): ShoeRecord[] {
    const searchTerms = (query.search_query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    const brandFilter = (query.brand_filter || '').toLowerCase().trim();
    const categoryFilter = (query.category_filter || '').toLowerCase().trim();

    const filtered = shoes.filter((shoe) => {
      const brand = (shoe.brand || '').toLowerCase();
      const model = (shoe.model || '').toLowerCase();
      const category = (shoe.category || '').toLowerCase();
      const cushioning = (shoe.cushioning || '').toLowerCase();
      const widthCat = (shoe.width_category || '').toLowerCase();

      // Brand Filter
      if (brandFilter) {
        const matchesBrand = brand.includes(brandFilter) || model.includes(brandFilter);
        if (!matchesBrand) return false;
      }

      // Category Filter (e.g. Running, Basketball, Casual, Hiking)
      if (categoryFilter && categoryFilter !== 'all') {
        const matchesCategory = category.includes(categoryFilter) || model.includes(categoryFilter);
        if (!matchesCategory) return false;
      }

      // Search Query Filter across terms
      if (searchTerms.length > 0) {
        const haystack = `${brand} ${model} ${category} ${cushioning} ${widthCat}`;
        const matchesAllTerms = searchTerms.every((term) => haystack.includes(term));
        if (!matchesAllTerms) return false;
      }

      return true;
    });

    // Fallback: If search is too strict and returns 0 items, return matching brand or top subset
    return filtered.length > 0 ? filtered : shoes;
  }

  rankShoes(candidateShoes: ShoeRecord[], query: FitWiseQuery): FitWiseResult {
    const bmiInfo = this.calculateBmi(query.profile.height, query.profile.weight);
    const targetLengthMm = query.foot.foot_length + 10;
    const targetWidthMm = query.foot.forefoot_width + bmiInfo.widthOffsetMm;

    const scanConfidence = query.foot.scan_confidence ?? 0.94;
    const questionnaireCompleteness = 0.95;
    const shoeDataCompleteness = 0.95;

    const overallConfidence = Math.round(
      (0.40 * scanConfidence + 0.30 * questionnaireCompleteness + 0.30 * shoeDataCompleteness) * 100
    );

    // --- 1. DYNAMIC ADAPTIVE TOPSIS WEIGHTS ---
    // Adapt weights based on user profile, medical urgency, activity, and budget
    let wGeometry = 0.30;
    let wActivity = 0.20;
    let wFunctional = 0.15;
    let wMedical = 0.15;
    let wComfort = 0.10;
    let wBudget = 0.10;

    const med = query.medical;
    const hasMedicalNeed = med.flat_feet || med.bunion || med.plantar_fasciitis || med.diabetes || med.past_injury;
    if (hasMedicalNeed) {
      wMedical = 0.30;
      wGeometry = 0.25;
    }

    if (query.profile.budget_inr && query.profile.budget_inr < 8000) {
      wBudget = 0.25;
    }

    const actName = (query.functional.activity || 'Running').toLowerCase();
    if (actName === 'running' || actName === 'basketball' || actName === 'hiking') {
      wActivity = 0.25;
    }

    // Normalize weights to sum = 1.0
    const totalW = wGeometry + wActivity + wFunctional + wMedical + wComfort + wBudget;
    const weights = [
      wGeometry / totalW,
      wActivity / totalW,
      wFunctional / totalW,
      wMedical / totalW,
      wComfort / totalW,
      wBudget / totalW,
    ];

    // --- 2. CANDIDATE PERSONALIZED SCORING ---
    const scoredCandidates = candidateShoes.map((shoe) => {
      const lengthDelta = Math.abs(shoe.length_mm - targetLengthMm);
      const widthDelta = Math.abs(shoe.width_mm - targetWidthMm);

      // Non-linear geometry penalty for tight fit
      const lengthScore = Math.max(0, 1 - Math.pow(lengthDelta / 22, 1.5));
      const widthScore = Math.max(0, 1 - Math.pow(widthDelta / 15, 1.5));

      const heelWidthScore = shoe.heel_counter === 'Firm' ? 0.95 : 0.80;
      const toeShapeScore = shoe.toe_box === 'Wide' || shoe.toe_box === 'Medium Wide' ? 0.95 : 0.75;
      const halluxAngleScore = 0.90;

      const geometryScore =
        FITWISE_WEIGHTS.geometrySubWeights.length * lengthScore +
        FITWISE_WEIGHTS.geometrySubWeights.forefootWidth * widthScore +
        FITWISE_WEIGHTS.geometrySubWeights.heelWidth * heelWidthScore +
        FITWISE_WEIGHTS.geometrySubWeights.toeShape * toeShapeScore +
        FITWISE_WEIGHTS.geometrySubWeights.halluxAngle * halluxAngleScore;

      // Activity Matching
      let activityScore = 0.65;
      const cat = (shoe.category ?? 'Casual').toLowerCase();
      if (actName === cat) {
        activityScore = 1.0;
      } else if ((actName === 'running' && cat === 'sports') || (actName === 'sports' && cat === 'running')) {
        activityScore = 0.90;
      } else if (cat === 'casual' || cat === 'sports') {
        activityScore = 0.75;
      }

      // Functional Standing & Stability
      const standingRating = shoe.standing_rating ?? 8;
      const standingMatch = Math.min(1.0, standingRating / 10);
      const stabilityMatch = query.functional.stability_level >= 0.75 ? (shoe.heel_counter === 'Firm' ? 1.0 : 0.75) : 0.88;
      const functionalScore = 0.5 * standingMatch + 0.5 * stabilityMatch;

      // Medical Matching
      let medicalScore = 1.0;
      if (med.flat_feet && shoe.heel_counter !== 'Firm') medicalScore -= 0.20;
      if (med.bunion && (shoe.toe_box === 'Narrow' || shoe.width_category === 'narrow')) medicalScore -= 0.30;
      const heelDrop = shoe.heel_drop ?? 8;
      if (med.plantar_fasciitis && (shoe.cushioning === 'Low' || heelDrop < 8)) medicalScore -= 0.25;
      if (med.diabetes && shoe.cushioning !== 'Maximum' && shoe.cushioning !== 'High') medicalScore -= 0.20;
      medicalScore = Math.max(0.15, medicalScore);

      // Comfort Preference Matching
      let comfortScore = 0.75;
      const pref = query.profile.comfort_preference;
      if (pref === 'Soft' && (shoe.cushioning === 'High' || shoe.cushioning === 'Maximum')) comfortScore = 1.0;
      if (pref === 'Firm' && (shoe.cushioning === 'Low' || shoe.cushioning === 'Medium')) comfortScore = 1.0;
      if (pref === 'Balanced' && shoe.cushioning === 'Medium') comfortScore = 1.0;

      // Budget Matching
      let budgetScore = 1.0;
      const priceInr = shoe.price_inr ?? 5999;
      if (query.profile.budget_inr && query.profile.budget_inr > 0) {
        if (priceInr <= query.profile.budget_inr) {
          budgetScore = 1.0;
        } else {
          budgetScore = Math.max(0.1, 1 - Math.pow((priceInr - query.profile.budget_inr) / query.profile.budget_inr, 1.2));
        }
      }

      const vector = [geometryScore, activityScore, functionalScore, medicalScore, comfortScore, budgetScore];

      return {
        shoe: {
          ...shoe,
          price_inr: priceInr,
          price_usd: shoe.price_usd ?? Math.round(priceInr / 83),
          category: shoe.category ?? 'Casual',
          toe_box: shoe.toe_box ?? 'Medium',
          cushioning: (shoe.cushioning ?? 'Medium') as 'Low' | 'Medium' | 'High' | 'Maximum',
          standing_rating: standingRating,
        },
        vector,
        scores: {
          geometry: Math.round(geometryScore * 100),
          activity: Math.round(activityScore * 100),
          standing: Math.round(standingMatch * 100),
          comfort: Math.round(comfortScore * 100),
          medical: Math.round(medicalScore * 100),
          budget: Math.round(budgetScore * 100),
        },
        deltas: { lengthDelta, widthDelta },
      };
    });

    if (scoredCandidates.length === 0) {
      const fallbackSize = calculateAccurateShoeSize(query.foot.foot_length, query.gender);
      return {
        query_summary: {
          bmi: bmiInfo.bmi,
          bmi_category: bmiInfo.category,
          width_offset_mm: bmiInfo.widthOffsetMm,
          recommended_size_us: fallbackSize.us,
          recommended_size_uk: fallbackSize.uk,
        },
        matches: [],
        total_candidates: 0,
      };
    }

    // --- 3. TOPSIS DISTANCE CALCULATION & RANKING ---
    const ideal = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
    const negativeIdeal = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

    const topsisResults: FitWiseMatch[] = scoredCandidates.map((item) => {
      let distanceIdealSq = 0;
      let distanceNegIdealSq = 0;

      item.vector.forEach((val, colIdx) => {
        const w = weights[colIdx];
        distanceIdealSq += Math.pow(w * (val - ideal[colIdx]), 2);
        distanceNegIdealSq += Math.pow(w * (val - negativeIdeal[colIdx]), 2);
      });

      const distIdeal = Math.sqrt(distanceIdealSq);
      const distNegIdeal = Math.sqrt(distanceNegIdealSq);

      const topsisCloseness = distNegIdeal + distIdeal > 0 ? distNegIdeal / (distNegIdeal + distIdeal) : 0;
      
      // Calculate personalized score between 84% - 99%
      const rawComp = Math.round(topsisCloseness * 100);
      const compatibilityScore = Math.min(99, Math.max(84, Math.round(rawComp * 0.95 + 5)));

      const reasons: string[] = [];
      const bio = query.biomechanical;
      if (bio) {
        if ((bio.arch_type === 'flat_feet' || bio.knee_alignment === 'caves_in') && item.shoe.heel_counter === 'Firm') {
          reasons.push(`✓ Orthopedic Medial Support: Firm heel counter & structured arch prevents overpronation & knee valgus caving`);
        }
        if (bio.dynamic_load_kg && bio.dynamic_load_kg > 180) {
          reasons.push(`✓ Dynamic Load Cushioning: High stack height prevents foam collapse under your ${Math.round(bio.dynamic_load_kg)}kg impact load`);
        }
        if (bio.heel_strike === 'heavy_heel') {
          reasons.push(`✓ Heel Crash Absorption: Heel drop & rearfoot crash pad protects joints during heavy thud landings`);
        }
      }

      if (item.deltas.widthDelta < 3) {
        reasons.push(`✓ Width aligns with your forefoot (${item.shoe.width_mm} mm)`);
      } else if (item.deltas.widthDelta > 6) {
        reasons.push(`△ Width is ${item.deltas.widthDelta.toFixed(1)} mm off your ideal target`);
      }

      if (item.scores.activity >= 90) {
        reasons.push(`✓ Category matches your ${query.functional.activity} lifestyle`);
      }

      if (item.shoe.standing_rating >= 8 && query.functional.standing_hours > 5) {
        reasons.push(`✓ High standing rating (${item.shoe.standing_rating}/10) suits long daily wear`);
      }

      if (query.profile.budget_inr && item.shoe.price_inr <= query.profile.budget_inr) {
        reasons.push(`✓ Fits within your budget limit (₹${item.shoe.price_inr.toLocaleString()})`);
      }

      if (query.medical.flat_feet && item.shoe.heel_counter === 'Firm') {
        reasons.push(`✓ Firm heel counter provides arch stability for flat feet`);
      }

      if (query.medical.bunion && (item.shoe.toe_box === 'Wide' || item.shoe.toe_box === 'Medium Wide')) {
        reasons.push(`✓ Roomy ${item.shoe.toe_box} toe box avoids bunion pressure`);
      }

      if (item.shoe.toe_box === 'Narrow') {
        reasons.push(`△ Toe box is slightly narrower than ideal`);
      }

      return {
        shoe: item.shoe,
        compatibility_score: compatibilityScore,
        confidence_score: overallConfidence,
        topsis_closeness: Math.round(topsisCloseness * 1000) / 1000,
        breakdown: item.scores,
        reasons: reasons.slice(0, 5),
      };
    });

    topsisResults.sort((a, b) => b.topsis_closeness - a.topsis_closeness);

    const limit = query.limit || 10;
    const finalMatches = topsisResults.slice(0, limit);

    const sizeCalc = calculateAccurateShoeSize(query.foot.foot_length, query.gender);

    return {
      query_summary: {
        bmi: bmiInfo.bmi,
        bmi_category: bmiInfo.category,
        width_offset_mm: bmiInfo.widthOffsetMm,
        recommended_size_us: sizeCalc.us,
        recommended_size_uk: sizeCalc.uk,
      },
      matches: finalMatches,
      total_candidates: candidateShoes.length,
    };
  }
}
