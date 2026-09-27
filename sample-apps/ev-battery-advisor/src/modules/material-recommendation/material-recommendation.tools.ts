/**
 * Module 2 — MaterialRecommendationModule Tools
 *
 * Ranks candidate materials against Module 1's weighted requirements
 * and produces an explainable, Pareto-optimal shortlist.
 */

import { ToolDecorator as Tool, ResourceDecorator as Resource, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { EvBatteryService } from '../ev-battery/ev-battery.service.js';
import {
    MaterialMetricsTargetSchema,
    WeightedObjectivesSchema,
    RankedMaterialSchema,
    ParetoSetSchema,
} from '../../schemas/material-metrics.schema.js';

// ─── Widget helper (same pattern as pizzaz) ───────────────────────────────────

function batteryWidget(route: string) {
    return { route, prefersBorder: true };
}

// ─── Input Schemas ────────────────────────────────────────────────────────────

const RankCandidatesSchema = z.object({
    componentType: z.enum(['cathode', 'anode', 'electrolyte', 'separator', 'current-collector', 'casing'])
        .describe('Battery component type to rank candidates for'),
    target: MaterialMetricsTargetSchema.describe('MaterialMetricsTarget from to_structured_schema'),
    weights: WeightedObjectivesSchema.describe('WeightedObjectives from prioritize_objectives'),
});

const ParetoOptimizationSchema = z.object({
    candidates: z.array(RankedMaterialSchema).min(2)
        .describe('Ranked candidate materials to run Pareto optimization on'),
});

const SuggestAlternativeSchema = z.object({
    materialId: z.string().describe('Material ID to suggest composition adjustments for'),
    optimizeFor: z.enum(['energy', 'cost', 'cycle-life', 'safety', 'sustainability'])
        .describe('Which objective to optimize the formulation towards'),
});

const ExplainRecommendationSchema = z.object({
    materialId: z.string().describe('Material ID of the recommended material'),
    componentType: z.enum(['cathode', 'anode', 'electrolyte', 'separator', 'current-collector', 'casing'])
        .describe('Component type for context'),
    targetJson: z.string().optional().describe('JSON string of MaterialMetricsTarget for comparison'),
});

const ShowMaterialComparisonSchema = z.object({
    componentType: z.enum(['cathode', 'anode', 'electrolyte', 'separator', 'current-collector', 'casing'])
        .describe('Battery component type to compare'),
    top: z.number().int().min(2).max(8).default(4).describe('Number of top candidates to compare'),
});

// ─── Controller ──────────────────────────────────────────────────────────────

@Injectable({ deps: [EvBatteryService] })
export class MaterialRecommendationTools {
    constructor(private readonly batteryService: EvBatteryService) { }

    /**
     * rankCandidateMaterials
     */
    @Tool({
        name: 'rank_candidate_materials',
        description:
            'Rank all candidate materials for a specific battery component type (cathode, anode, electrolyte, ' +
            'separator, current-collector, casing) against weighted EV requirements. ' +
            'Returns a sorted list with composite scores, strengths, and weaknesses. ' +
            'Use after prioritize_objectives. Pair with run_pareto_optimization for Pareto-optimal shortlisting.',
        inputSchema: RankCandidatesSchema,
        examples: {
            request: {
                componentType: 'cathode',
                target: { gravimetricEnergyDensity: { min: 175, weight: 0.25 }, materialCostPerKWh: { max: 45, weight: 0.15 } },
                weights: { energyDensity: 0.25, cost: 0.2, cycleLife: 0.15, safety: 0.15, sustainability: 0.1, supplyChainRisk: 0.07, fastChargeCapability: 0.05, lowTemperaturePerformance: 0.03 },
            },
            response: {
                componentType: 'cathode',
                ranked: [
                    { id: 'lfp-cathode', name: 'LFP (LiFePO₄)', rank: 1, compositeScore: 78, chemistryFamily: 'LFP' },
                    { id: 'lmfp-cathode', name: 'LMFP (LiMnFePO₄)', rank: 2, compositeScore: 72, chemistryFamily: 'LMFP' },
                    { id: 'nmc622-cathode', name: 'NMC 622', rank: 3, compositeScore: 65, chemistryFamily: 'NMC' },
                ],
                totalCandidates: 5,
            },
        },
    })
    async rankCandidateMaterials(args: z.infer<typeof RankCandidatesSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Ranking candidates', { componentType: args.componentType });

        const ranked = this.batteryService.rankCandidates(args.componentType, args.target, args.weights);

        ctx.logger.info('Ranking complete', { componentType: args.componentType, topMaterial: ranked[0]?.name, totalCandidates: ranked.length });

        return {
            componentType: args.componentType,
            ranked: ranked,
            totalCandidates: ranked.length,
            recommendation: `Top candidate: ${ranked[0]?.name} (score: ${ranked[0]?.compositeScore}/100)`,
        };
    }

    /**
     * runParetoOptimization
     */
    @Tool({
        name: 'run_pareto_optimization',
        description:
            'Run multi-objective Pareto optimization (NSGA-II style) across energy density, cost, and cycle life ' +
            'on the ranked candidate list. Returns the Pareto-optimal front (non-dominated set) alongside ' +
            'dominated candidates. Pareto front represents ALL trade-off-acceptable options — not a single "best". ' +
            'Call after rank_candidate_materials.',
        inputSchema: ParetoOptimizationSchema,
        examples: {
            request: {
                candidates: [
                    { id: 'lfp-cathode', name: 'LFP (LiFePO₄)', chemistryFamily: 'LFP', componentType: 'cathode', rank: 1, compositeScore: 78, strengths: [], weaknesses: [], dataConfidence: 0.97, metrics: { gravimetricEnergyDensity: 160, volumetricEnergyDensity: 380, specificCapacity: 160, ionicConductivity: 0.0001, coulombicEfficiency: 99.8, cycleLifeTo80SOH: 3500, calendarLifeSelfDischarge: 0.25, cRateCapability: 2.0, thermalRunawayOnsetTemp: 270, operatingTempRange: { min: -30, max: 60 }, volumeExpansion: 2, structuralStrengthToWeight: 500, materialCostPerKWh: 50, carbonFootprint: 35, recyclability: 85, criticalMineralDependency: 2, regulatoryCompliance: { un383: true, reach: true, rohs: true, euBatteryRegulation: true } } },
                ],
            },
            response: {
                paretoFront: [{ id: 'lfp-cathode', name: 'LFP (LiFePO₄)' }],
                dominatedCandidates: [],
                objectiveDimensions: ['energyDensity', 'cost', 'cycleLife'],
                interpretive: 'LFP is on the Pareto front — it is not dominated by any other cathode on the 3-objective space of energy, cost, and cycle life.',
            },
        },
    })
    async runParetoOptimization(args: z.infer<typeof ParetoOptimizationSchema>, ctx: ExecutionContext) {
        let candidates = args.candidates as any;
        if (typeof candidates === 'string') {
            try { candidates = JSON.parse(candidates); } catch (e) {}
        }
        if (!candidates || !Array.isArray(candidates)) {
            throw new Error('args.candidates must be an array of objects, e.g. [{"id": "lfp-cathode"}]');
        }
        ctx.logger.info('Running Pareto optimization', { candidateCount: candidates.length });

        const paretoSet = this.batteryService.buildParetoSet(candidates);

        const interpretive = paretoSet.paretoFront.length === 1
            ? `${paretoSet.paretoFront[0].name} dominates all other candidates in the 3-objective space.`
            : `${paretoSet.paretoFront.length} candidates on the Pareto front: ${paretoSet.paretoFront.map(m => m.name).join(', ')}. ` +
              `Each represents a distinct trade-off optimum — the engineer must choose based on mission priority.`;

        ctx.logger.info('Pareto complete', { paretoFrontSize: paretoSet.paretoFront.length });

        return {
            paretoFront: paretoSet.paretoFront.map(m => ({
                id: m.id,
                name: m.name,
                chemistryFamily: m.chemistryFamily,
                compositeScore: m.compositeScore,
                keyObjectives: {
                    energyDensity: m.metrics.gravimetricEnergyDensity,
                    cost: m.metrics.materialCostPerKWh,
                    cycleLife: m.metrics.cycleLifeTo80SOH,
                },
            })),
            dominatedCandidates: paretoSet.dominatedCandidates.map(m => ({ id: m.id, name: m.name })),
            objectiveDimensions: paretoSet.objectiveDimensions,
            generatedAt: paretoSet.generatedAt,
            interpretive,
        };
    }

    /**
     * suggestAlternativeFormulations
     */
    @Tool({
        name: 'suggest_alternative_formulations',
        description:
            'Propose composition adjustments for a given material to rebalance trade-offs in a desired direction. ' +
            'Examples: increasing Ni% in NMC for energy density, reducing Si% in Si-graphite for better cycle life, ' +
            'Mn/Fe ratio adjustment in LMFP for thermal stability. Use to explore formulation space beyond standard grades.',
        inputSchema: SuggestAlternativeSchema,
        examples: {
            request: { materialId: 'silicon-graphite-anode', optimizeFor: 'cycle-life' },
            response: {
                originalMaterial: 'Silicon-Graphite Composite (10% Si)',
                optimizeFor: 'cycle-life',
                variants: [
                    { name: 'Si-Graphite 5% Si', change: 'Reduce Si from 10% → 5%', expectedImpact: '+30% cycle life, -10% capacity', tradeOff: 'Lower capacity density for much better longevity' },
                    { name: 'Si-Graphite 10% Si + elastic binder', change: 'Add polyacrylic acid (PAA) binder', expectedImpact: '+20% cycle life, same capacity', tradeOff: 'Higher manufacturing complexity' },
                ],
            },
        },
    })
    async suggestAlternativeFormulations(args: z.infer<typeof SuggestAlternativeSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Suggesting alternatives', { materialId: args.materialId, optimizeFor: args.optimizeFor });

        const material = this.batteryService.getMaterialById(args.materialId);
        if (!material) {
            throw new Error(`Material not found: ${args.materialId}`);
        }

        const variants: { name: string; change: string; expectedImpact: string; tradeOff: string }[] = [];

        // Generate formulation variants based on chemistry family and optimization direction
        const family = material.chemistryFamily;
        const opt = args.optimizeFor;

        if (family === 'NMC' && opt === 'energy') {
            variants.push(
                { name: 'NMC 9.5.5', change: 'Increase Ni from 8→9, reduce Co', expectedImpact: '+8% gravimetric energy density', tradeOff: 'Higher thermal instability at high SOC, increased REACH risk' },
                { name: 'NMC 811 + LiNbO₃ coating', change: 'Add niobate surface coating', expectedImpact: '+15% cycle life at same capacity', tradeOff: 'Additional coating step, +5% manufacturing cost' },
            );
        } else if (family === 'NMC' && opt === 'cost') {
            variants.push(
                { name: 'NMC 532', change: 'Reduce Ni:Mn:Co to 5:3:2', expectedImpact: '-20% material cost, -15% energy density', tradeOff: 'Lower energy density reduces achievable range' },
                { name: 'LMFP (Mn substitute)', change: 'Replace Co with Mn, eliminating cobalt', expectedImpact: '-40% cost, -12% energy density, +90% cycle life', tradeOff: 'Different chemistry family — requires new cell design' },
            );
        } else if (family === 'Silicon-Composite' && opt === 'cycle-life') {
            variants.push(
                { name: 'Si-Graphite 5% Si', change: 'Reduce Si content from 10% → 5%', expectedImpact: '+40% cycle life, -15% capacity vs 10% blend', tradeOff: 'Lower capacity density — energy density penalty' },
                { name: 'Si-Graphite 10% Si + PAA binder', change: 'Polyacrylic acid binder for improved SEI stability', expectedImpact: '+25% cycle life, same capacity', tradeOff: 'Higher manufacturing complexity and cost' },
                { name: 'Nano-Si particles (10%)', change: 'Switch to nano-Si particles to reduce expansion stress', expectedImpact: '+50% cycle life, same capacity', tradeOff: 'Higher material cost, complex synthesis route' },
            );
        } else if (family === 'LFP' && opt === 'energy') {
            variants.push(
                { name: 'LMFP', change: 'Add Mn substitution: LiMn₀.₇Fe₀.₃PO₄', expectedImpact: '+15% energy density, +0.1V operating voltage', tradeOff: 'Mn dissolution at elevated temperature — more demanding thermal management' },
                { name: 'LFP nano-particles', change: 'Nano-size particle morphology optimization', expectedImpact: '+8% rate capability, +5% effective capacity utilization', tradeOff: 'Higher manufacturing cost and energy use' },
            );
        } else if (family === 'LFP' && opt === 'cost') {
            variants.push(
                { name: 'LFP (hydrothermal synthesis)', change: 'Switch to lower-cost hydrothermal synthesis route', expectedImpact: '-15% production cost, same performance', tradeOff: 'Slightly lower consistency in particle size distribution' },
            );
        } else if (family === 'Solid-State' && opt === 'energy') {
            variants.push(
                { name: 'LLZO + Li metal anode', change: 'Pair LLZO electrolyte with lithium metal anode (eliminates graphite)', expectedImpact: '+40% energy density vs graphite anode pairing', tradeOff: 'Lithium dendrite risk, manufacturing challenges at scale — TRL 4-5' },
            );
        } else {
            // Generic fallback
            variants.push(
                { name: `${material.name} — Optimized Grade`, change: `Performance-optimized variant targeting ${opt}`, expectedImpact: `Estimated 10-20% improvement in ${opt}`, tradeOff: 'Requires detailed DoE experimentation — contact material supplier' },
                { name: `${material.name} — Cost-Reduced Grade`, change: 'Simplified synthesis route, larger particle size', expectedImpact: '-15% cost, minor performance delta', tradeOff: 'May reduce rate capability and cycle life slightly' },
            );
        }

        return {
            originalMaterial: material.name,
            materialId: args.materialId,
            chemistryFamily: family,
            optimizeFor: opt,
            variants,
            disclaimer: 'Formulation variants are indicative — physical DoE validation required before adoption.',
        };
    }

    /**
     * explainRecommendation
     */
    @Tool({
        name: 'explain_recommendation',
        description:
            'Generate a SHAP-style human-readable justification for why a specific material was recommended ' +
            'for a given use case. Explains which metric properties drove the score, identifies key advantages ' +
            'and concerns relative to the requirement target. Essential for engineering review board sign-off.',
        inputSchema: ExplainRecommendationSchema,
        examples: {
            request: { materialId: 'lfp-cathode', componentType: 'cathode' },
            response: {
                material: 'LFP (LiFePO₄)',
                recommendation: 'Recommended for cost/safety-priority applications despite lower energy density.',
                shapContributions: [
                    { factor: 'thermalRunawayOnsetTemp (270°C)', contribution: '+18 pts', direction: 'positive', explanation: 'Exceptional thermal safety margin — highest of all cathode candidates' },
                    { factor: 'cycleLifeTo80SOH (3500 cycles)', contribution: '+15 pts', direction: 'positive', explanation: 'Best-in-class longevity for fleet/commercial applications' },
                    { factor: 'materialCostPerKWh ($50/kWh)', contribution: '+14 pts', direction: 'positive', explanation: 'Most cost-competitive cathode on the market' },
                    { factor: 'gravimetricEnergyDensity (160 Wh/kg)', contribution: '-8 pts', direction: 'negative', explanation: 'Lowest energy density — reduces achievable range for a given pack weight' },
                ],
            },
        },
    })
    async explainRecommendation(args: z.infer<typeof ExplainRecommendationSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Generating recommendation explanation', { materialId: args.materialId });

        const material = this.batteryService.getMaterialById(args.materialId);
        if (!material) {
            throw new Error(`Material not found: ${args.materialId}`);
        }

        const m = material.metrics;

        // SHAP-style factor contributions (simplified linear decomposition)
        const shapContributions = [
            {
                factor: `thermalRunawayOnsetTemp (${m.thermalRunawayOnsetTemp}°C)`,
                contribution: `${m.thermalRunawayOnsetTemp > 200 ? '+' : '-'}${Math.abs(Math.round((m.thermalRunawayOnsetTemp - 200) / 10))} pts`,
                direction: m.thermalRunawayOnsetTemp > 200 ? 'positive' : 'negative',
                explanation: m.thermalRunawayOnsetTemp > 250
                    ? 'Exceptional thermal safety — top-tier onset temperature reduces thermal runaway risk significantly.'
                    : m.thermalRunawayOnsetTemp > 160
                    ? 'Adequate thermal safety — within acceptable range with proper BMS.'
                    : 'Below-average thermal safety — requires careful thermal management and monitoring.',
            },
            {
                factor: `cycleLifeTo80SOH (${m.cycleLifeTo80SOH.toLocaleString()} cycles)`,
                contribution: `${m.cycleLifeTo80SOH > 1500 ? '+' : '-'}${Math.abs(Math.round((m.cycleLifeTo80SOH - 1000) / 200))} pts`,
                direction: m.cycleLifeTo80SOH > 1000 ? 'positive' : 'negative',
                explanation: m.cycleLifeTo80SOH >= 3000
                    ? 'Best-in-class cycle life — excellent for fleet, commercial, or warranty-sensitive applications.'
                    : m.cycleLifeTo80SOH >= 1500
                    ? 'Good cycle life — suitable for most passenger EV applications.'
                    : 'Cycle life may limit vehicle service life without pack replacement.',
            },
            {
                factor: `materialCostPerKWh ($${m.materialCostPerKWh}/kWh)`,
                contribution: `${m.materialCostPerKWh < 60 ? '+' : '-'}${Math.abs(Math.round((80 - m.materialCostPerKWh) / 5))} pts`,
                direction: m.materialCostPerKWh < 80 ? 'positive' : 'negative',
                explanation: m.materialCostPerKWh <= 50
                    ? 'Most cost-competitive option — strong EV affordability driver.'
                    : m.materialCostPerKWh <= 80
                    ? 'Moderate cost — within typical OEM budget envelopes for premium segments.'
                    : 'High cost — may require premium vehicle positioning or value-chain optimization.',
            },
            {
                factor: `gravimetricEnergyDensity (${m.gravimetricEnergyDensity} Wh/kg)`,
                contribution: `${m.gravimetricEnergyDensity > 200 ? '+' : '-'}${Math.abs(Math.round((m.gravimetricEnergyDensity - 200) / 15))} pts`,
                direction: m.gravimetricEnergyDensity > 200 ? 'positive' : 'negative',
                explanation: m.gravimetricEnergyDensity >= 250
                    ? 'High energy density — strong contribution to vehicle range target.'
                    : m.gravimetricEnergyDensity >= 180
                    ? 'Moderate energy density — adequate for medium-range targets with larger pack.'
                    : 'Lower energy density — achievable range requires larger, heavier pack.',
            },
            {
                factor: `criticalMineralDependency (${m.criticalMineralDependency}/10)`,
                contribution: `${m.criticalMineralDependency < 4 ? '+' : '-'}${Math.abs(Math.round((5 - m.criticalMineralDependency) * 2))} pts`,
                direction: m.criticalMineralDependency < 5 ? 'positive' : 'negative',
                explanation: m.criticalMineralDependency <= 3
                    ? 'Low critical mineral dependency — strong supply chain resilience and ESG alignment.'
                    : m.criticalMineralDependency <= 6
                    ? 'Moderate critical mineral risk — manageable with strategic sourcing.'
                    : 'High Co/Ni dependency — significant supply chain vulnerability and ESG pressure.',
            },
        ];

        const positiveFactors = shapContributions.filter(s => s.direction === 'positive');
        const negativeFactors = shapContributions.filter(s => s.direction === 'negative');

        const summary = `${material.name} is recommended for the ${args.componentType} position. ` +
            `Primary advantages: ${positiveFactors.slice(0, 2).map(s => s.factor).join(', ')}. ` +
            `Key concerns: ${negativeFactors.slice(0, 2).map(s => s.factor).join(', ')}.`;

        ctx.logger.info('Explanation generated', { materialId: args.materialId, positiveCount: positiveFactors.length });

        return {
            material: material.name,
            materialId: material.id,
            componentType: args.componentType,
            recommendation: summary,
            shapContributions,
            overallJustification: material.strengths.join(' '),
            keyRisks: material.weaknesses.join(' '),
            dataConfidence: material.dataConfidence,
        };
    }

    /**
     * showMaterialComparison — Widget-backed tool for visual radar chart
     */
    @Tool({
        name: 'show_material_comparison',
        description:
            'Display an interactive radar/scorecard comparison of the top candidate materials for a specific ' +
            'battery component type. Shows all MaterialMetrics dimensions across candidates side-by-side. ' +
            'Best called after rank_candidate_materials to visualize the ranking results.',
        inputSchema: ShowMaterialComparisonSchema,
        examples: {
            request: { componentType: 'cathode', top: 4 },
            response: {
                componentType: 'cathode',
                materials: [{ id: 'lfp-cathode', name: 'LFP', compositeScore: 78 }],
                totalShown: 4,
            },
        },
    })
    @Widget(batteryWidget('material-comparison-radar'))
    async showMaterialComparison(args: z.infer<typeof ShowMaterialComparisonSchema>, ctx: ExecutionContext) {
        const dummyTarget = {};
        const dummyWeights = {
            energyDensity: 0.25, cost: 0.20, cycleLife: 0.15, safety: 0.15,
            sustainability: 0.10, supplyChainRisk: 0.07, fastChargeCapability: 0.05, lowTemperaturePerformance: 0.03,
        };

        const allRanked = this.batteryService.rankCandidates(args.componentType, dummyTarget, dummyWeights);
        const top = allRanked.slice(0, args.top);

        ctx.logger.info('Showing material comparison', { componentType: args.componentType, count: top.length });

        return {
            componentType: args.componentType,
            materials: top.map(m => ({
                id: m.id,
                name: m.name,
                chemistryFamily: m.chemistryFamily,
                rank: m.rank,
                compositeScore: m.compositeScore,
                dataConfidence: m.dataConfidence,
                metrics: {
                    gravimetricEnergyDensity: m.metrics.gravimetricEnergyDensity,
                    materialCostPerKWh: m.metrics.materialCostPerKWh,
                    cycleLifeTo80SOH: m.metrics.cycleLifeTo80SOH,
                    thermalRunawayOnsetTemp: m.metrics.thermalRunawayOnsetTemp,
                    cRateCapability: m.metrics.cRateCapability,
                    criticalMineralDependency: m.metrics.criticalMineralDependency,
                    recyclability: m.metrics.recyclability,
                    carbonFootprint: m.metrics.carbonFootprint,
                },
                strengths: m.strengths,
                weaknesses: m.weaknesses,
                regulatoryCompliance: m.metrics.regulatoryCompliance,
            })),
            totalShown: top.length,
            generatedAt: new Date().toISOString(),
        };
    }

    // ─── Resources ────────────────────────────────────────────────────────────

    @Resource({
        uri: 'ev://materials-database',
        name: 'Materials Database',
        description:
            'Full EV battery materials database covering cathode, anode, electrolyte, separator, ' +
            'current-collector, and casing candidates with complete MaterialMetrics for each. ' +
            'Backed by Materials Project, Battery Archive, NREL, and MatWeb data sources.',
        mimeType: 'application/json',
    })
    async getMaterialsDatabase(_ctx: ExecutionContext) {
        const all = this.batteryService.getAllMaterials();
        return {
            totalMaterials: all.length,
            componentTypes: ['cathode', 'anode', 'electrolyte', 'separator', 'current-collector', 'casing'],
            materials: all.map(m => ({
                id: m.id,
                name: m.name,
                chemistryFamily: m.chemistryFamily,
                componentType: m.componentType,
                dataConfidence: m.dataConfidence,
                compositeScore: null,
                rank: null,
            })),
            dataVersion: '2025.07',
            sources: ['Materials Project', 'Battery Archive (NREL)', 'MatWeb', 'Published literature 2023-2025'],
        };
    }
}
