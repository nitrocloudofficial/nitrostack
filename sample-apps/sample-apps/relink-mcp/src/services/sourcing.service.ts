// ============================================================================
// CircuLink — Buyer Sourcing Intelligence Service
// Core engine: BOM decomposition, progressive radius search, weighted scoring,
// zone intelligence, multi-supplier combination, AI reasoning
// ============================================================================

import { getSupabaseClient } from './supabase.service.js';
import { chatCompletion } from './vision.service.js';
import { getMarketBenchmark } from './pricing.service.js';
import { solveOptimalMatching, type SupplierOption } from './matching.solver.js';
import {
  haversineDistance,
  discoverZonesFromFactories,
  PROGRESSIVE_RADIUS_STEPS_KM,
  type GeoPoint,
} from './geo.utils.js';
import type {
  BOMItem,
  ProcurementRequirement,
  SupplierScore,
  SourcingZone,
  SupplierCombination,
  ProcurementPlan,
  MaterialGrade,
} from '../types/index.js';

// ============================================================================
// BOM DECOMPOSITION (Mode 1: "I manufacture X" → structured BOM)
// ============================================================================

const BOM_SYSTEM_PROMPT = `You are an AI procurement engineer for an industrial manufacturing waste-to-revenue platform.
A buyer describes what they MANUFACTURE. Your job is to infer the raw materials and industrial waste/recyclable materials they would need to procure.

CONTEXT: This is B2B industrial procurement. Buyers are manufacturing enterprises sourcing raw materials and recyclable industrial waste — NOT retail consumers.

For the given product, generate a Bill of Materials (BOM) containing:
1. Primary raw materials (metals, plastics, chemicals)
2. Secondary/recyclable materials that can substitute virgin materials (e.g., aluminum scrap instead of virgin aluminum, HDPE regrind instead of virgin HDPE)
3. Estimated quantities per 1000 units of production (in kg)
4. Preferred grades (A = clean/uncontaminated, B = minor defects, C = significant degradation)
5. Substitute materials that could replace each item
6. Brief notes on usage

Focus on materials commonly available as industrial byproducts/scrap that can be sourced from other factories.

Respond ONLY with a valid JSON array matching this schema (no markdown, no backticks):
[
  {
    "material_type": "string (use snake_case: aluminum_scrap, hdpe_regrind, steel_offcut, pp_granulate, copper_wire, etc.)",
    "estimated_quantity_kg": number,
    "grade_preference": "A" | "B" | "C" | null,
    "max_price_per_kg": number | null,
    "alternatives": ["string"],
    "notes": "string"
  }
]`;

/**
 * Decompose a product description into a structured Bill of Materials.
 * Uses Gemini LLM to infer required materials for manufacturing.
 */
export async function decomposeProductToBOM(productDescription: string): Promise<{
  product: string;
  bom: BOMItem[];
}> {
  const responseText = await chatCompletion(BOM_SYSTEM_PROMPT, productDescription);

  // Clean potential markdown wrapping
  const jsonStr = responseText
    .replace(/^```json\s*/, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim();

  let bom: BOMItem[];
  try {
    bom = JSON.parse(jsonStr) as BOMItem[];
  } catch {
    // Fallback: if LLM returns invalid JSON, provide a generic BOM
    bom = [
      {
        material_type: 'unknown_material',
        estimated_quantity_kg: 500,
        grade_preference: 'B',
        alternatives: [],
        notes: `Could not auto-decompose "${productDescription}". Please specify materials manually.`,
      },
    ];
  }

  // Ensure all items have the alternatives array
  bom = bom.map((item) => ({
    ...item,
    alternatives: item.alternatives || [],
    grade_preference: item.grade_preference || undefined,
    max_price_per_kg: item.max_price_per_kg || undefined,
  }));

  return { product: productDescription, bom };
}

// ============================================================================
// PROGRESSIVE RADIUS SEARCH
// ============================================================================

interface RawListing {
  id: string;
  factory_id: string;
  material_type: string;
  grade: string;
  quantity_kg: number;
  seller_quoted_price_per_kg: number;
  ai_benchmark_price_per_kg: number | null;
  negotiable: boolean;
  usage_classification: string[] | null;
  health_flags: string[] | null;
  status: string;
  created_at: string;
  factories: {
    name: string;
    mobile: string;
    trust_score: number;
    location: unknown;
    gstin: string | null;
  } | null;
}

/**
 * Parse PostGIS geography point to lat/lng.
 * Handles both JSON object format and WKT/hex format from Supabase.
 */
function parseLocation(location: unknown): GeoPoint | null {
  if (!location) return null;

  // JSON object format: { lat, lng } or { latitude, longitude }
  if (typeof location === 'object') {
    const loc = location as Record<string, unknown>;
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      return { lat: loc.lat, lng: loc.lng };
    }
    if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      return { lat: loc.latitude, lng: loc.longitude };
    }
    // GeoJSON format from PostGIS
    if (loc.type === 'Point' && Array.isArray(loc.coordinates)) {
      const coords = loc.coordinates as number[];
      return { lat: coords[1], lng: coords[0] };
    }
  }

  return null;
}

/**
 * Search for suppliers with progressive radius expansion.
 * Starts at 10km, expands to 25/50/75/100km until demand is satisfied.
 */
export async function progressiveRadiusSearch(
  materialType: string,
  requiredQuantityKg: number,
  buyerLocation: GeoPoint,
  options: {
    maxPricePerKg?: number;
    requiredGrade?: string;
    maxRadiusKm?: number;
  } = {},
): Promise<{
  listings: Array<RawListing & { distance_km: number; factory_location: GeoPoint }>;
  radiusUsedKm: number;
  searchSteps: Array<{ radius_km: number; suppliers_found: number; quantity_found_kg: number }>;
}> {
  const supabase = getSupabaseClient();
  const maxRadius = options.maxRadiusKm || 100;
  const searchSteps: Array<{ radius_km: number; suppliers_found: number; quantity_found_kg: number }> = [];

  // Fetch all verified listings for this material type
  let query = supabase
    .from('listings')
    .select('*, factories!inner(name, mobile, trust_score, location, gstin)')
    .eq('status', 'verified')
    .ilike('material_type', `%${materialType}%`)
    .gte('quantity_kg', 1);

  if (options.maxPricePerKg) {
    query = query.lte('seller_quoted_price_per_kg', options.maxPricePerKg);
  }
  if (options.requiredGrade) {
    const grades: Record<string, string[]> = { A: ['A'], B: ['A', 'B'], C: ['A', 'B', 'C'] };
    query = query.in('grade', grades[options.requiredGrade] || ['A', 'B', 'C']);
  }

  const { data: allListings, error } = await query;
  if (error || !allListings) return { listings: [], radiusUsedKm: maxRadius, searchSteps };

  // Attach distance to each listing
  const listingsWithDistance = (allListings as unknown as RawListing[])
    .map((listing) => {
      const factory = listing.factories;
      const loc = parseLocation(factory?.location);
      if (!loc) return null;

      const dist = haversineDistance(buyerLocation.lat, buyerLocation.lng, loc.lat, loc.lng);
      return {
        ...listing,
        distance_km: Math.round(dist * 10) / 10,
        factory_location: loc,
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  // Progressive expansion: find the smallest radius that satisfies demand
  let radiusUsedKm = maxRadius;
  for (const stepRadius of PROGRESSIVE_RADIUS_STEPS_KM) {
    if (stepRadius > maxRadius) break;

    const inRadius = listingsWithDistance.filter((l) => l.distance_km <= stepRadius);
    const totalQty = inRadius.reduce((sum, l) => sum + l.quantity_kg, 0);

    searchSteps.push({
      radius_km: stepRadius,
      suppliers_found: inRadius.length,
      quantity_found_kg: totalQty,
    });

    if (totalQty >= requiredQuantityKg) {
      radiusUsedKm = stepRadius;
      const result = inRadius.sort((a, b) => a.distance_km - b.distance_km);
      return { listings: result, radiusUsedKm, searchSteps };
    }
  }

  // If no step satisfied demand, return everything within maxRadius
  const finalResult = listingsWithDistance
    .filter((l) => l.distance_km <= maxRadius)
    .sort((a, b) => a.distance_km - b.distance_km);

  return { listings: finalResult, radiusUsedKm, searchSteps };
}

// ============================================================================
// WEIGHTED PROCUREMENT SCORING
// ============================================================================

/** Scoring weights for procurement ranking */
const SCORING_WEIGHTS = {
  distance: 0.20,
  price: 0.25,
  grade: 0.15,
  trust: 0.20,
  quantity: 0.10,
  verification: 0.10,
} as const;

/** Grade-to-score mapping */
const GRADE_SCORES: Record<string, number> = {
  A: 100,
  B: 70,
  C: 40,
  U: 10,
};

/**
 * Calculate weighted procurement score for a single supplier.
 * Returns normalized score 0–100 with full breakdown.
 */
export function scoreSupplier(
  listing: RawListing & { distance_km: number },
  requirement: ProcurementRequirement,
): SupplierScore {
  const factory = listing.factories;
  const trustScore = (factory?.trust_score as number) || 50;
  const maxDistance = requirement.preferred_radius_km || 100;
  const maxPrice = requirement.max_price_per_kg || listing.seller_quoted_price_per_kg * 1.5;

  // Normalize each dimension to 0–100 (higher = better)
  const distanceScore = Math.max(0, 100 - (listing.distance_km / maxDistance) * 100);
  const priceScore = Math.max(0, 100 - ((listing.seller_quoted_price_per_kg / maxPrice) * 100));
  const gradeScore = GRADE_SCORES[listing.grade] || 10;
  const trustNormalized = Math.min(100, trustScore);
  const quantityScore = Math.min(100, (listing.quantity_kg / requirement.quantity_kg) * 100);
  const verificationScore = listing.status === 'verified' ? 100 : 30;

  // Weighted composite
  const procurementScore = Math.round(
    distanceScore * SCORING_WEIGHTS.distance +
    priceScore * SCORING_WEIGHTS.price +
    gradeScore * SCORING_WEIGHTS.grade +
    trustNormalized * SCORING_WEIGHTS.trust +
    quantityScore * SCORING_WEIGHTS.quantity +
    verificationScore * SCORING_WEIGHTS.verification,
  );

  return {
    listing_id: listing.id,
    factory_id: listing.factory_id,
    factory_name: factory?.name || 'Unknown',
    material_type: listing.material_type,
    available_quantity_kg: listing.quantity_kg,
    price_per_kg: listing.seller_quoted_price_per_kg,
    grade: listing.grade as MaterialGrade,
    distance_km: listing.distance_km,
    trust_score: trustScore,
    is_verified: listing.status === 'verified',
    is_negotiable: listing.negotiable,
    // Breakdown
    distance_score: Math.round(distanceScore),
    price_score: Math.round(priceScore),
    grade_score: gradeScore,
    trust_score_normalized: Math.round(trustNormalized),
    quantity_score: Math.round(quantityScore),
    verification_score: verificationScore,
    procurement_score: procurementScore,
  };
}

// ============================================================================
// ZONE INTELLIGENCE
// ============================================================================

/**
 * Analyze industrial zones from the discovered suppliers.
 * Computes actual metrics: seller density, total inventory, avg price/grade/trust.
 */
export function analyzeZones(
  listings: Array<RawListing & { distance_km: number; factory_location: GeoPoint }>,
  buyerLocation: GeoPoint,
  maxRadiusKm: number,
): SourcingZone[] {
  // Extract unique factory locations for zone discovery
  const factoryLocations = new Map<string, { lat: number; lng: number; factory_id: string }>();
  for (const listing of listings) {
    if (!factoryLocations.has(listing.factory_id)) {
      factoryLocations.set(listing.factory_id, {
        lat: listing.factory_location.lat,
        lng: listing.factory_location.lng,
        factory_id: listing.factory_id,
      });
    }
  }

  const discoveredZones = discoverZonesFromFactories(
    Array.from(factoryLocations.values()),
    15, // 15km cluster radius
  );

  const zones: SourcingZone[] = [];

  for (const zone of discoveredZones) {
    const distToBuyer = haversineDistance(buyerLocation.lat, buyerLocation.lng, zone.center.lat, zone.center.lng);
    if (distToBuyer > maxRadiusKm) continue;

    // Get listings belonging to factories in this zone
    const zoneListings = listings.filter((l) => zone.factory_ids.includes(l.factory_id));
    if (zoneListings.length === 0) continue;

    // Compute actual metrics
    const totalAvailableKg = zoneListings.reduce((s, l) => s + l.quantity_kg, 0);
    const avgPrice = Math.round(
      zoneListings.reduce((s, l) => s + l.seller_quoted_price_per_kg, 0) / zoneListings.length,
    );
    const avgTrust = Math.round(
      zoneListings.reduce((s, l) => s + ((l.factories?.trust_score as number) || 50), 0) / zoneListings.length,
    );

    // Compute actual average grade (weighted by quantity)
    const gradeWeights: Record<string, number> = { A: 3, B: 2, C: 1, U: 0 };
    const totalGradeWeight = zoneListings.reduce((s, l) => s + (gradeWeights[l.grade] || 0) * l.quantity_kg, 0);
    const totalQtyForGrade = zoneListings.reduce((s, l) => s + l.quantity_kg, 0);
    const avgGradeNum = totalQtyForGrade > 0 ? totalGradeWeight / totalQtyForGrade : 0;
    const avgGrade = avgGradeNum >= 2.5 ? 'A' : avgGradeNum >= 1.5 ? 'B+' : avgGradeNum >= 0.5 ? 'B' : 'C';

    // Unique seller count (unique factories)
    const uniqueSellers = new Set(zoneListings.map((l) => l.factory_id)).size;

    // Zone composite score
    const zoneScore = Math.round(
      (uniqueSellers * 15) +                           // Seller density
      (avgTrust * 0.3) +                               // Trust
      (Math.max(0, 100 - avgPrice * 0.5) * 0.2) +     // Price (lower = better)
      (Math.max(0, 100 - distToBuyer) * 0.15) +       // Distance (closer = better)
      (Math.min(100, totalAvailableKg / 100) * 0.15),  // Inventory depth
    );

    zones.push({
      name: zone.name,
      center: zone.center,
      distance_km: Math.round(distToBuyer),
      seller_count: uniqueSellers,
      total_available_kg: totalAvailableKg,
      avg_price_per_kg: avgPrice,
      avg_grade: avgGrade,
      avg_trust_score: avgTrust,
      top_listing_ids: zoneListings
        .sort((a, b) => (b.factories?.trust_score as number || 0) - (a.factories?.trust_score as number || 0))
        .slice(0, 5)
        .map((l) => l.id),
      zone_score: zoneScore,
    });
  }

  // Sort zones by composite score (highest first)
  zones.sort((a, b) => b.zone_score - a.zone_score);
  return zones;
}

// ============================================================================
// MULTI-SUPPLIER COMBINATION
// ============================================================================

/**
 * Find optimal multi-supplier combination to satisfy demand.
 * Reuses the existing matching solver from matching.solver.ts.
 */
export function findOptimalCombination(
  requirement: ProcurementRequirement,
  scoredSuppliers: SupplierScore[],
): SupplierCombination {
  // Convert SupplierScore to SupplierOption for the solver
  const suppliers: SupplierOption[] = scoredSuppliers.map((s) => ({
    listing_id: s.listing_id,
    factory_id: s.factory_id,
    factory_name: s.factory_name,
    material_type: s.material_type,
    quantity_kg: s.available_quantity_kg,
    price_per_kg: s.price_per_kg,
    grade: s.grade,
    distance_km: s.distance_km,
    trust_score: s.trust_score,
    location: { lat: 0, lng: 0, address: '' },
  }));

  const result = solveOptimalMatching([requirement], suppliers);

  const allocations = result.assignments.map((a) => ({
    listing_id: a.supplier.listing_id,
    factory_name: a.supplier.factory_name,
    allocated_kg: a.allocated_kg,
    price_per_kg: a.supplier.price_per_kg,
    cost: a.cost,
    transport_cost_estimate: a.transport_cost,
    distance_km: a.supplier.distance_km,
    grade: a.supplier.grade,
    trust_score: a.supplier.trust_score,
  }));

  return {
    requirement,
    allocations,
    total_cost: result.total_cost,
    total_transport_cost: result.total_transport_cost,
    coverage_percent: result.coverage_percent,
    unfulfilled_kg: result.unmet_requirements.reduce((s, r) => s + r.quantity_kg, 0),
  };
}

// ============================================================================
// AI REASONING GENERATOR
// ============================================================================

const REASONING_SYSTEM_PROMPT = `You are an AI procurement advisor for an industrial manufacturing waste-to-revenue platform.
Given the procurement analysis data below, write a concise, actionable procurement recommendation.

Your response should:
1. Explain WHY the top zone is recommended (density, price, trust, availability)
2. Explain WHY the top supplier(s) are ranked first (grade, price, trust, distance, quantity)
3. If multiple suppliers are needed, explain the split rationale
4. Mention any cost savings vs. alternative zones
5. Flag any risks (single-supplier dependency, low trust, long distance)

Keep it under 200 words. Use specific numbers. Write in second person ("You should...").
Do NOT use markdown formatting. Write plain text paragraphs.`;

/**
 * Generate AI reasoning for the procurement plan.
 */
export async function generateProcurementReasoning(
  plan: {
    requirements: ProcurementRequirement[];
    zones: SourcingZone[];
    topSuppliers: SupplierScore[];
    combinations: SupplierCombination[];
    radiusUsed: number;
  },
): Promise<string> {
  const dataContext = JSON.stringify({
    requirements: plan.requirements,
    top_zones: plan.zones.slice(0, 3),
    top_suppliers: plan.topSuppliers.slice(0, 5).map((s) => ({
      name: s.factory_name,
      price: s.price_per_kg,
      grade: s.grade,
      trust: s.trust_score,
      distance_km: s.distance_km,
      available_kg: s.available_quantity_kg,
      score: s.procurement_score,
    })),
    combinations: plan.combinations.map((c) => ({
      material: c.requirement.material_type,
      coverage: c.coverage_percent,
      total_cost: c.total_cost,
      supplier_count: c.allocations.length,
    })),
    radius_used_km: plan.radiusUsed,
  }, null, 2);

  try {
    const reasoning = await chatCompletion(REASONING_SYSTEM_PROMPT, dataContext);
    return reasoning.trim();
  } catch {
    // Fallback: generate basic reasoning without LLM
    return generateFallbackReasoning(plan);
  }
}

function generateFallbackReasoning(plan: {
  zones: SourcingZone[];
  topSuppliers: SupplierScore[];
  combinations: SupplierCombination[];
  radiusUsed: number;
}): string {
  const parts: string[] = [];

  if (plan.zones.length > 0) {
    const top = plan.zones[0];
    parts.push(
      `${top.name} is recommended as the best sourcing zone with ${top.seller_count} verified suppliers, ` +
      `average price ₹${top.avg_price_per_kg}/kg, average grade ${top.avg_grade}, ` +
      `and ${top.total_available_kg}kg total available inventory at ${top.distance_km}km distance.`,
    );

    if (plan.zones.length > 1) {
      const second = plan.zones[1];
      const priceDiff = second.avg_price_per_kg - top.avg_price_per_kg;
      if (priceDiff > 0) {
        parts.push(
          `${second.name} is an alternative at ${second.distance_km}km but costs ₹${priceDiff}/kg more on average.`,
        );
      }
    }
  }

  if (plan.topSuppliers.length > 0) {
    const best = plan.topSuppliers[0];
    parts.push(
      `Top supplier: ${best.factory_name} — Grade ${best.grade}, ₹${best.price_per_kg}/kg, ` +
      `trust score ${best.trust_score}, ${best.available_quantity_kg}kg available at ${best.distance_km}km.`,
    );
  }

  for (const combo of plan.combinations) {
    if (combo.allocations.length > 1) {
      parts.push(
        `${combo.requirement.material_type}: Optimal procurement requires ${combo.allocations.length} suppliers ` +
        `to achieve ${combo.coverage_percent}% coverage at ₹${combo.total_cost} total cost.`,
      );
    }
  }

  parts.push(`Search radius used: ${plan.radiusUsed}km.`);

  return parts.join(' ');
}

// ============================================================================
// FULL INTELLIGENT SOURCING PIPELINE
// ============================================================================

/**
 * The complete intelligent sourcing pipeline.
 * For each material requirement:
 *   1. Progressive radius search
 *   2. Weighted procurement scoring
 *   3. Zone intelligence
 *   4. Multi-supplier combination
 *   5. AI reasoning
 */
export async function intelligentSource(
  requirements: ProcurementRequirement[],
  buyerLocation: GeoPoint,
  maxRadiusKm: number = 100,
): Promise<ProcurementPlan> {
  let allListings: Array<RawListing & { distance_km: number; factory_location: GeoPoint }> = [];
  const allSearchSteps: Array<{ radius_km: number; suppliers_found: number; quantity_found_kg: number }> = [];
  let maxRadiusUsed = 0;

  // Step 1: Progressive radius search for each material
  for (const req of requirements) {
    const searchResult = await progressiveRadiusSearch(
      req.material_type,
      req.quantity_kg,
      buyerLocation,
      {
        maxPricePerKg: req.max_price_per_kg,
        requiredGrade: req.required_grade,
        maxRadiusKm: req.preferred_radius_km || maxRadiusKm,
      },
    );

    // Merge listings (deduplicate by listing ID)
    const existingIds = new Set(allListings.map((l) => l.id));
    for (const listing of searchResult.listings) {
      if (!existingIds.has(listing.id)) {
        allListings.push(listing);
        existingIds.add(listing.id);
      }
    }

    maxRadiusUsed = Math.max(maxRadiusUsed, searchResult.radiusUsedKm);

    // Merge search steps (prefix with material type)
    for (const step of searchResult.searchSteps) {
      allSearchSteps.push(step);
    }
  }

  // Step 2: Score all suppliers against each requirement
  const allScored: SupplierScore[] = [];
  for (const listing of allListings) {
    // Find the most relevant requirement for this listing
    const relevantReq = requirements.find((r) =>
      listing.material_type.toLowerCase().includes(r.material_type.toLowerCase()) ||
      r.material_type.toLowerCase().includes(listing.material_type.toLowerCase()),
    ) || requirements[0];

    const score = scoreSupplier(listing, relevantReq);
    allScored.push(score);
  }

  // Sort by procurement score (highest first)
  allScored.sort((a, b) => b.procurement_score - a.procurement_score);

  // Step 3: Zone intelligence
  const zones = analyzeZones(allListings, buyerLocation, maxRadiusKm);

  // Step 4: Multi-supplier combination for each requirement
  const combinations: SupplierCombination[] = [];
  for (const req of requirements) {
    const relevantSuppliers = allScored.filter((s) =>
      s.material_type.toLowerCase().includes(req.material_type.toLowerCase()) ||
      req.material_type.toLowerCase().includes(s.material_type.toLowerCase()),
    );
    const combo = findOptimalCombination(req, relevantSuppliers);
    combinations.push(combo);
  }

  // Step 5: AI reasoning
  const aiReasoning = await generateProcurementReasoning({
    requirements,
    zones,
    topSuppliers: allScored.slice(0, 10),
    combinations,
    radiusUsed: maxRadiusUsed,
  });

  // Deduplicate search steps (take the max per radius)
  const stepMap = new Map<number, { radius_km: number; suppliers_found: number; quantity_found_kg: number }>();
  for (const step of allSearchSteps) {
    const existing = stepMap.get(step.radius_km);
    if (!existing || step.suppliers_found > existing.suppliers_found) {
      stepMap.set(step.radius_km, step);
    }
  }

  return {
    requirements,
    recommended_zones: zones,
    ranked_suppliers: allScored,
    supplier_combinations: combinations,
    search_metadata: {
      radius_used_km: maxRadiusUsed,
      total_suppliers_found: allScored.length,
      total_available_quantity_kg: allListings.reduce((s, l) => s + l.quantity_kg, 0),
      search_steps: Array.from(stepMap.values()).sort((a, b) => a.radius_km - b.radius_km),
    },
    ai_reasoning: aiReasoning,
  };
}
