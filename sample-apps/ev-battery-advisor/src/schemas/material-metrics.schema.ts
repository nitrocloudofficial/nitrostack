/**
 * EV Battery Material Advisor — Shared Schema
 *
 * Single source of truth for the MaterialMetrics shape.
 * Every module imports from here; no per-module redefinition.
 */

import { z } from 'zod';

// ─── MaterialMetrics ─────────────────────────────────────────────────────────

export const MaterialMetricsSchema = z.object({
    // Electrochemical
    gravimetricEnergyDensity: z.number().describe('Wh/kg — determines vehicle range for a given battery weight'),
    volumetricEnergyDensity: z.number().describe('Wh/L — determines pack size/packaging feasibility'),
    specificCapacity: z.number().describe('mAh/g — core indicator of active material performance'),
    ionicConductivity: z.number().describe('S/cm — governs fast-charge and low-temperature performance'),
    coulombicEfficiency: z.number().min(0).max(100).describe('% — indicates reversibility and long-term capacity retention'),

    // Durability
    cycleLifeTo80SOH: z.number().int().describe('cycles — usable battery lifespan/warranty period'),
    calendarLifeSelfDischarge: z.number().describe('%/month — long-term degradation independent of use'),

    // Power
    cRateCapability: z.number().describe('C — fast-charging and power delivery capability'),

    // Thermal/Safety
    thermalRunawayOnsetTemp: z.number().describe('°C — key safety margin indicator'),
    operatingTempRange: z.object({
        min: z.number().describe('°C minimum operating temperature'),
        max: z.number().describe('°C maximum operating temperature'),
    }).describe('Climate suitability without extra thermal management'),

    // Mechanical
    volumeExpansion: z.number().describe('% — high-swelling materials risk degradation/failure'),
    structuralStrengthToWeight: z.number().describe('MPa·cm³/g — crashworthiness and pack weight (casing)'),

    // Cost
    materialCostPerKWh: z.number().describe('$/kWh — direct driver of EV affordability'),

    // Sustainability
    carbonFootprint: z.number().describe('kg CO₂e/kWh — lifecycle environmental impact'),
    recyclability: z.number().min(0).max(100).describe('% recoverable — circular-economy and regulatory alignment'),

    // Supply Chain
    criticalMineralDependency: z.number().min(0).max(10).describe('risk index (0-10) — geopolitical/supply-chain risk (Co, Ni, Li)'),

    // Compliance
    regulatoryCompliance: z.object({
        un383: z.boolean().describe('UN38.3 transport certification'),
        reach: z.boolean().describe('REACH chemical compliance'),
        rohs: z.boolean().describe('RoHS hazardous substances compliance'),
        euBatteryRegulation: z.boolean().describe('EU Battery Regulation/Battery Passport compliance'),
    }).describe('Regulatory compliance status'),
});

export type MaterialMetrics = z.infer<typeof MaterialMetricsSchema>;

// ─── MaterialMetricsTarget ───────────────────────────────────────────────────
// A "target" is a partial spec with optional min/max constraints per metric.

export const MetricConstraintSchema = z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    target: z.number().optional(),
    weight: z.number().min(0).max(1).optional().describe('0-1 importance weight in AHP scoring'),
});

export type MetricConstraint = z.infer<typeof MetricConstraintSchema>;

export const MaterialMetricsTargetSchema = z.object({
    gravimetricEnergyDensity: MetricConstraintSchema.optional(),
    volumetricEnergyDensity: MetricConstraintSchema.optional(),
    specificCapacity: MetricConstraintSchema.optional(),
    ionicConductivity: MetricConstraintSchema.optional(),
    coulombicEfficiency: MetricConstraintSchema.optional(),
    cycleLifeTo80SOH: MetricConstraintSchema.optional(),
    calendarLifeSelfDischarge: MetricConstraintSchema.optional(),
    cRateCapability: MetricConstraintSchema.optional(),
    thermalRunawayOnsetTemp: MetricConstraintSchema.optional(),
    operatingTempRangeMin: MetricConstraintSchema.optional(),
    operatingTempRangeMax: MetricConstraintSchema.optional(),
    volumeExpansion: MetricConstraintSchema.optional(),
    structuralStrengthToWeight: MetricConstraintSchema.optional(),
    materialCostPerKWh: MetricConstraintSchema.optional(),
    carbonFootprint: MetricConstraintSchema.optional(),
    recyclability: MetricConstraintSchema.optional(),
    criticalMineralDependency: MetricConstraintSchema.optional(),
    requireRegulatoryCompliance: z.boolean().optional().describe('Whether full regulatory compliance is mandatory'),
    preferredChemistryFamily: z.string().optional().describe('Preferred chemistry family'),
});

export type MaterialMetricsTarget = z.infer<typeof MaterialMetricsTargetSchema>;

// ─── RankedMaterial ──────────────────────────────────────────────────────────

export const RankedMaterialSchema = z.object({
    id: z.string().describe('Unique material identifier (e.g., "nmc811-cathode")'),
    name: z.string().describe('Human-readable material name'),
    chemistryFamily: z.string().describe('Chemistry family e.g. NMC, LFP, LMFP, Graphite, Silicon-Composite, Solid-State'),
    componentType: z.enum(['cathode', 'anode', 'electrolyte', 'separator', 'current-collector', 'casing']),
    metrics: MaterialMetricsSchema,
    compositeScore: z.number().min(0).max(100).describe('Weighted composite score (0-100)'),
    rank: z.number().int().min(1).describe('Rank position in candidate list'),
    strengths: z.array(z.string()).describe('Top metric advantages'),
    weaknesses: z.array(z.string()).describe('Key metric disadvantages'),
    dataConfidence: z.number().min(0).max(1).describe('0-1 confidence in underlying data quality/recency'),
});

export type RankedMaterial = z.infer<typeof RankedMaterialSchema>;

// ─── WeightedObjectives ──────────────────────────────────────────────────────

export const WeightedObjectivesSchema = z.object({
    energyDensity: z.number().min(0).max(1),
    cost: z.number().min(0).max(1),
    cycleLife: z.number().min(0).max(1),
    safety: z.number().min(0).max(1),
    sustainability: z.number().min(0).max(1),
    supplyChainRisk: z.number().min(0).max(1),
    fastChargeCapability: z.number().min(0).max(1),
    lowTemperaturePerformance: z.number().min(0).max(1),
}).describe('AHP-derived objective weights; must sum to approximately 1.0');

export type WeightedObjectives = z.infer<typeof WeightedObjectivesSchema>;

// ─── RequirementSet ──────────────────────────────────────────────────────────

export const RequirementSetSchema = z.object({
    vehicleClass: z.enum(['2-wheeler', 'passenger-car', 'commercial', 'performance']).describe('Target vehicle class'),
    targetRangeKm: z.number().optional().describe('Target driving range in km'),
    fastChargeTargetMinutes: z.number().optional().describe('Target fast-charge time in minutes (10%-80%)'),
    climateZone: z.enum(['tropical', 'temperate', 'cold', 'extreme-cold']).optional().describe('Primary operating climate'),
    budgetPerKWh: z.number().optional().describe('Maximum allowable $/kWh'),
    packFormFactor: z.enum(['cylindrical', 'prismatic', 'pouch', 'any']).optional().describe('Cell form factor preference'),
    preferredChemistryFamily: z.string().optional().describe('Preferred chemistry (e.g., LFP, NMC, solid-state)'),
    prioritizeSustainability: z.boolean().optional().describe('Whether to heavily weight sustainability metrics'),
    prioritizeSafetyMargin: z.boolean().optional().describe('Whether safety margin is a primary driver'),
    requiredCertifications: z.array(z.enum(['un383', 'reach', 'rohs', 'eu-battery-regulation'])).optional(),
    rawInput: z.string().optional().describe('Original free-text input for reference'),
});

export type RequirementSet = z.infer<typeof RequirementSetSchema>;

// ─── ParetoSet ───────────────────────────────────────────────────────────────

export const ParetoSetSchema = z.object({
    paretoFront: z.array(RankedMaterialSchema).describe('Non-dominated Pareto-optimal candidates'),
    dominatedCandidates: z.array(RankedMaterialSchema).describe('Dominated candidates excluded from Pareto front'),
    objectiveDimensions: z.array(z.string()).describe('Objectives used in Pareto analysis'),
    generatedAt: z.string().describe('ISO timestamp of optimization run'),
});

export type ParetoSet = z.infer<typeof ParetoSetSchema>;

// ─── SimulationResult ────────────────────────────────────────────────────────

export const ElectrochemResultSchema = z.object({
    materialId: z.string(),
    modelType: z.literal('p2d-dfn').describe('Pseudo-2D Doyle-Fuller-Newman model'),
    voltageProfile: z.array(z.object({ capacity: z.number(), voltage: z.number() })),
    predictedCapacityMahG: z.number(),
    internalResistanceOhm: z.number(),
    rateCapabilityC: z.number(),
    simulationConfidence: z.number().min(0).max(1),
});

export const ThermalResultSchema = z.object({
    materialId: z.string(),
    peakTemperatureCelsius: z.number(),
    heatGenerationRateW: z.number(),
    thermalRunawayRisk: z.enum(['low', 'moderate', 'high', 'critical']),
    temperatureProfile: z.array(z.object({ time: z.number(), temperature: z.number() })),
    simulationConfidence: z.number().min(0).max(1),
});

export const MechanicalResultSchema = z.object({
    materialId: z.string(),
    volumeExpansionPct: z.number(),
    stressAtElectrodeMPa: z.number(),
    projectedCycleLifeCycles: z.number().int(),
    seiGrowthRatePctPerCycle: z.number(),
    degradationCurve: z.array(z.object({ cycle: z.number(), capacityRetentionPct: z.number() })),
    simulationConfidence: z.number().min(0).max(1),
});

export const SimulationResultSchema = z.object({
    materialId: z.string(),
    electrochem: ElectrochemResultSchema,
    thermal: ThermalResultSchema,
    mechanical: MechanicalResultSchema,
    overallSimConfidence: z.number().min(0).max(1),
});

export type ElectrochemResult = z.infer<typeof ElectrochemResultSchema>;
export type ThermalResult = z.infer<typeof ThermalResultSchema>;
export type MechanicalResult = z.infer<typeof MechanicalResultSchema>;
export type SimulationResult = z.infer<typeof SimulationResultSchema>;

// ─── TradeOff / Risk / ConfidenceScore ───────────────────────────────────────

export const TradeOffSchema = z.object({
    materialAId: z.string(),
    materialAName: z.string(),
    materialBId: z.string(),
    materialBName: z.string(),
    dimension: z.string().describe('The metric dimension where trade-off occurs'),
    narrative: z.string().describe('Plain-English description of the trade-off'),
    aAdvantagePercent: z.number().describe('% advantage of A over B on this dimension'),
});

export const RiskSchema = z.object({
    riskType: z.enum(['thermal', 'supply-chain', 'regulatory', 'mechanical', 'data-quality']),
    severity: z.enum(['low', 'moderate', 'high', 'critical']),
    materialId: z.string(),
    description: z.string(),
    mitigation: z.string().optional(),
});

export const ConfidenceScoreSchema = z.object({
    overall: z.number().min(0).max(1).describe('Composite confidence score'),
    kbDataRecency: z.number().min(0).max(1).describe('Knowledge base data freshness'),
    simulationFidelity: z.number().min(0).max(1).describe('Digital twin simulation confidence'),
    historicalAccuracy: z.number().min(0).max(1).describe('Historical recommendation track record'),
    breakdown: z.string().describe('Human-readable explanation of score components'),
});

export type TradeOff = z.infer<typeof TradeOffSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;

// ─── FinalRanking ────────────────────────────────────────────────────────────

export const FinalRankingSchema = z.object({
    topsisRanking: z.array(z.object({
        rank: z.number().int(),
        material: RankedMaterialSchema,
        topsisScore: z.number().min(0).max(1).describe('TOPSIS closeness coefficient'),
        idealDistance: z.number(),
        negativeIdealDistance: z.number(),
    })),
    topRecommendation: RankedMaterialSchema,
    weights: WeightedObjectivesSchema,
    generatedAt: z.string(),
});

export type FinalRanking = z.infer<typeof FinalRankingSchema>;
