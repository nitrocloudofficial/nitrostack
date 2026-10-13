/**
 * Module 5 — DecisionReportingModule Tools
 *
 * Synthesizes Modules 1–4 into one decision-ready recommendation with
 * trade-offs, risks, and a confidence score, rendered as interactive dashboards.
 */

import { ToolDecorator as Tool, PromptDecorator as Prompt, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { EvBatteryService } from '../ev-battery/ev-battery.service.js';
import {
    RankedMaterialSchema,
    WeightedObjectivesSchema,
    TradeOffSchema,
    RiskSchema,
    SimulationResultSchema,
} from '../../schemas/material-metrics.schema.js';

// ─── Widget helper ────────────────────────────────────────────────────────────

function batteryWidget(route: string) {
    return { route, prefersBorder: true };
}

// ─── Input Schemas ────────────────────────────────────────────────────────────

const ComputeTopsisSchema = z.object({
    candidates: z.array(RankedMaterialSchema).min(1).describe('Ranked candidate materials for TOPSIS ranking'),
    weights: WeightedObjectivesSchema.describe('WeightedObjectives from prioritize_objectives'),
});

const IdentifyTradeOffsSchema = z.object({
    candidates: z.array(RankedMaterialSchema).min(2).describe('Top ranked candidates to analyze trade-offs between'),
});

const SurfaceDesignRisksSchema = z.object({
    candidates: z.array(RankedMaterialSchema).min(1).describe('Ranked candidates to assess risks for'),
    includeSimulationFlags: z.boolean().optional().default(false).describe('Include simulation-based risk flags'),
});

const ComputeConfidenceSchema = z.object({
    topMaterialId: z.string().describe('Material ID of the top TOPSIS recommendation'),
    componentType: z.enum(['cathode', 'anode', 'electrolyte', 'separator', 'current-collector', 'casing']).describe('Component type'),
    weights: WeightedObjectivesSchema.describe('Weights used in ranking'),
});

const GenerateReportSchema = z.object({
    componentType: z.enum(['cathode', 'anode', 'electrolyte', 'separator', 'current-collector', 'casing'])
        .describe('Battery component type for the report'),
    weights: WeightedObjectivesSchema.describe('Objective weights used in the analysis'),
    includeRegulatorySection: z.boolean().optional().default(true).describe('Include regulatory compliance analysis'),
    includeSustainabilitySection: z.boolean().optional().default(true).describe('Include sustainability assessment'),
});

const ShowParetoChartSchema = z.object({
    componentType: z.enum(['cathode', 'anode', 'electrolyte', 'separator', 'current-collector', 'casing'])
        .describe('Component type to show Pareto chart for'),
    xAxis: z.enum(['gravimetricEnergyDensity', 'materialCostPerKWh', 'cycleLifeTo80SOH', 'criticalMineralDependency']).optional().default('gravimetricEnergyDensity')
        .describe('X-axis metric'),
    yAxis: z.enum(['materialCostPerKWh', 'cycleLifeTo80SOH', 'thermalRunawayOnsetTemp', 'recyclability']).optional().default('materialCostPerKWh')
        .describe('Y-axis metric'),
});

const ShowTradeOffTableSchema = z.object({
    componentType: z.enum(['cathode', 'anode', 'electrolyte', 'separator', 'current-collector', 'casing'])
        .describe('Component type to show trade-off table for'),
    weights: WeightedObjectivesSchema.optional().describe('Weights for trade-off analysis'),
});

const ShowConfidenceGaugeSchema = z.object({
    materialId: z.string().describe('Material ID to show confidence gauge for'),
    componentType: z.enum(['cathode', 'anode', 'electrolyte', 'separator', 'current-collector', 'casing']).describe('Component type'),
});

// ─── Controller ──────────────────────────────────────────────────────────────

@Injectable({ deps: [EvBatteryService] })
export class DecisionReportingTools {
    constructor(private readonly batteryService: EvBatteryService) { }

    private hydrate(candidates: any[]): any[] {
        const all = this.batteryService.getAllMaterials();
        return candidates.map(c => {
            const full = all.find(m => m.id === c.id);
            return full ? { ...full, ...c, metrics: full.metrics || c.metrics || (c as any).keyMetrics } : c;
        });
    }

    /**
     * computeTopsisRanking
     */
    @Tool({
        name: 'compute_topsis_ranking',
        description:
            'Apply TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) to produce ' +
            'one clear, defensible "closest-to-ideal" recommendation from the Pareto-optimal candidate set. ' +
            'Unlike the Pareto front which shows all non-dominated options, TOPSIS produces a single ranked list ' +
            'with a closeness coefficient (0=worst, 1=best). Call after run_pareto_optimization.',
        inputSchema: ComputeTopsisSchema,
        examples: {
            request: {
                candidates: [{ id: 'lfp-cathode', name: 'LFP' }],
                weights: { energyDensity: 0.25, cost: 0.20, cycleLife: 0.15, safety: 0.15, sustainability: 0.10, supplyChainRisk: 0.07, fastChargeCapability: 0.05, lowTemperaturePerformance: 0.03 },
            },
            response: {
                topRecommendation: { id: 'lfp-cathode', name: 'LFP', topsisScore: 0.73 },
                ranking: [{ rank: 1, materialId: 'lfp-cathode', topsisScore: 0.73 }],
            },
        },
    })
    async computeTopsisRanking(args: z.infer<typeof ComputeTopsisSchema>, ctx: ExecutionContext) {
        let candidates = args.candidates as any;
        if (typeof candidates === 'string') {
            try { candidates = JSON.parse(candidates); } catch (e) {}
        }
        if (!candidates || !Array.isArray(candidates)) {
            throw new Error('args.candidates must be an array of objects, e.g. [{"id": "lfp-cathode"}]');
        }
        ctx.logger.info('Computing TOPSIS ranking', { candidates: candidates.length });

        const fullCandidates = this.hydrate(candidates);
        const finalRanking = this.batteryService.computeTOPSIS(fullCandidates, args.weights);

        ctx.logger.info('TOPSIS complete', { topMaterial: finalRanking.topRecommendation.name });

        return {
            topRecommendation: {
                id: finalRanking.topRecommendation.id,
                name: finalRanking.topRecommendation.name,
                chemistryFamily: finalRanking.topRecommendation.chemistryFamily,
                topsisScore: finalRanking.topsisRanking[0].topsisScore,
                compositeScore: finalRanking.topRecommendation.compositeScore,
                strengths: finalRanking.topRecommendation.strengths,
                weaknesses: finalRanking.topRecommendation.weaknesses,
            },
            topsisRanking: finalRanking.topsisRanking.map(r => ({
                rank: r.rank,
                materialId: r.material.id,
                materialName: r.material.name,
                topsisScore: r.topsisScore,
                idealDistance: r.idealDistance,
                negativeIdealDistance: r.negativeIdealDistance,
                interpretive: r.topsisScore >= 0.7
                    ? 'Strongly closest-to-ideal'
                    : r.topsisScore >= 0.5
                    ? 'Above-average closeness to ideal'
                    : 'Below-average — significant gaps on key criteria',
            })),
            methodology: 'TOPSIS — Technique for Order of Preference by Similarity to Ideal Solution',
            criteriaUsed: ['energyDensity', 'cost', 'cycleLife', 'safety', 'sustainability', 'supplyChainRisk'],
            weightsApplied: args.weights,
            generatedAt: finalRanking.generatedAt,
        };
    }

    /**
     * identifyTradeOffs
     */
    @Tool({
        name: 'identify_trade_offs',
        description:
            'Surface explicit trade-offs between top-ranked candidate materials across key metric dimensions. ' +
            'Produces plain-English trade-off narratives comparing energy density vs cost, ' +
            'cycle life vs thermal safety, and sustainability vs performance. ' +
            'Call after compute_topsis_ranking.',
        inputSchema: IdentifyTradeOffsSchema,
        examples: {
            request: { candidates: [{ id: 'lfp-cathode', name: 'LFP' }, { id: 'nmc811-cathode', name: 'NMC 811' }] },
            response: {
                tradeOffs: [
                    { dimension: 'Energy Density vs Cost', narrative: 'NMC 811 delivers 75% more energy density than LFP but costs 70% more per kWh.', materialAId: 'nmc811-cathode', materialBId: 'lfp-cathode' },
                ],
            },
        },
    })
    async identifyTradeOffs(args: z.infer<typeof IdentifyTradeOffsSchema>, ctx: ExecutionContext) {
        let candidates = args.candidates as any;
        if (typeof candidates === 'string') {
            try { candidates = JSON.parse(candidates); } catch (e) {}
        }
        if (!candidates || !Array.isArray(candidates)) {
            throw new Error('args.candidates must be an array of objects, e.g. [{"id": "lfp-cathode"}]');
        }
        ctx.logger.info('Identifying trade-offs', { candidates: candidates.length });

        const fullCandidates = this.hydrate(candidates);
        const tradeOffs = this.batteryService.identifyTradeOffs(fullCandidates);

        ctx.logger.info('Trade-offs identified', { count: tradeOffs.length });

        return {
            tradeOffs,
            totalTradeOffs: tradeOffs.length,
            summary: tradeOffs.length === 0
                ? 'No significant trade-offs identified between top candidates.'
                : `${tradeOffs.length} trade-off(s) identified. Use the trade-off narrative prompt for plain-English summaries.`,
            dimensions: [...new Set(tradeOffs.map(t => t.dimension))],
        };
    }

    /**
     * surfaceDesignRisks
     */
    @Tool({
        name: 'surface_design_risks',
        description:
            'Surface thermal margin, supply-chain risk, regulatory gaps, mechanical failure risks, and data quality ' +
            'concerns from the ranked candidates and optional simulation results. ' +
            'Each risk includes a severity classification (low/moderate/high/critical) and a mitigation strategy. ' +
            'Call after identify_trade_offs.',
        inputSchema: SurfaceDesignRisksSchema,
        examples: {
            request: { candidates: [{ id: 'nmc811-cathode', name: 'NMC 811' }] },
            response: {
                risks: [
                    { riskType: 'thermal', severity: 'high', materialId: 'nmc811-cathode', description: 'NMC 811 thermal runaway onset at 170°C', mitigation: 'Active liquid cooling required' },
                    { riskType: 'supply-chain', severity: 'high', materialId: 'nmc811-cathode', description: 'High cobalt dependency (8.5/10)', mitigation: 'Dual-source agreements recommended' },
                ],
                criticalCount: 0,
                highCount: 2,
            },
        },
    })
    async surfaceDesignRisks(args: z.infer<typeof SurfaceDesignRisksSchema>, ctx: ExecutionContext) {
        let candidates = args.candidates as any;
        if (typeof candidates === 'string') {
            try { candidates = JSON.parse(candidates); } catch (e) {}
        }
        if (!candidates || !Array.isArray(candidates)) {
            throw new Error('args.candidates must be an array of objects, e.g. [{"id": "lfp-cathode"}]');
        }
        ctx.logger.info('Surfacing design risks', { candidates: candidates.length });

        const fullCandidates = this.hydrate(candidates);
        const risks = this.batteryService.identifyRisks(fullCandidates);

        const criticalCount = risks.filter(r => r.severity === 'critical').length;
        const highCount = risks.filter(r => r.severity === 'high').length;
        const moderateCount = risks.filter(r => r.severity === 'moderate').length;

        ctx.logger.info('Risks surfaced', { critical: criticalCount, high: highCount, moderate: moderateCount });

        return {
            risks,
            totalRisks: risks.length,
            criticalCount,
            highCount,
            moderateCount,
            risksByType: {
                thermal: risks.filter(r => r.riskType === 'thermal').length,
                supplyChain: risks.filter(r => r.riskType === 'supply-chain').length,
                regulatory: risks.filter(r => r.riskType === 'regulatory').length,
                mechanical: risks.filter(r => r.riskType === 'mechanical').length,
                dataQuality: risks.filter(r => r.riskType === 'data-quality').length,
            },
            overallRiskLevel: criticalCount > 0 ? 'critical' : highCount > 2 ? 'high' : highCount > 0 ? 'moderate' : 'low',
            deploymentReadiness: criticalCount === 0 && highCount <= 1
                ? '✅ Acceptable — proceed to physical cell validation'
                : criticalCount > 0
                ? '🚫 Not recommended — address critical risks before validation'
                : '⚠️ Proceed with caution — mitigate high-severity risks in cell design',
        };
    }

    /**
     * computeConfidenceScore
     */
    @Tool({
        name: 'compute_confidence_score',
        description:
            'Compute a quantified confidence score for the top recommendation, factoring in: ' +
            '(1) knowledge-base data recency/completeness, (2) digital twin simulation confidence intervals, ' +
            '(3) historical recommendation accuracy. Never presents output as certain — always shows uncertainty. ' +
            'Call after surface_design_risks.',
        inputSchema: ComputeConfidenceSchema,
        examples: {
            request: { topMaterialId: 'lfp-cathode', componentType: 'cathode', weights: { energyDensity: 0.25, cost: 0.2, cycleLife: 0.15, safety: 0.15, sustainability: 0.1, supplyChainRisk: 0.07, fastChargeCapability: 0.05, lowTemperaturePerformance: 0.03 } },
            response: {
                overall: 0.82,
                kbDataRecency: 0.97,
                simulationFidelity: 0.85,
                historicalAccuracy: 0.75,
                breakdown: 'KB data recency: 97% (weight 40%) | Sim fidelity: 85% (weight 40%) | Historical track record: 75% (weight 20%) → Overall: 90%.',
            },
        },
    })
    async computeConfidenceScore(args: z.infer<typeof ComputeConfidenceSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Computing confidence score', { materialId: args.topMaterialId });

        const material = this.batteryService.getMaterialById(args.topMaterialId);
        if (!material) throw new Error(`Material not found: ${args.topMaterialId}`);

        const ranked = { ...material, compositeScore: 0, rank: 1 };
        const simResult = this.batteryService.runFullSimulation(ranked);

        // Build a minimal final ranking for the confidence function
        const mockRanking = {
            topsisRanking: [{ rank: 1, material: ranked, topsisScore: 0.75, idealDistance: 0.1, negativeIdealDistance: 0.3 }],
            topRecommendation: ranked,
            weights: args.weights,
            generatedAt: new Date().toISOString(),
        };

        const score = this.batteryService.computeConfidenceScore(mockRanking, [simResult]);

        const interpretive = score.overall >= 0.85
            ? '🟢 High confidence — recommend proceeding to coin-cell physical validation.'
            : score.overall >= 0.70
            ? '🟡 Moderate confidence — physical validation recommended before scale-up.'
            : '🔴 Low confidence — significant uncertainty; additional data collection required before commitment.';

        ctx.logger.info('Confidence score computed', { overall: score.overall });

        return {
            ...score,
            materialId: args.topMaterialId,
            materialName: material.name,
            interpretive,
            uncertaintySources: [
                ...(score.kbDataRecency < 0.8 ? [`Knowledge base data for ${material.name} has limited historical coverage`] : []),
                ...(score.simulationFidelity < 0.7 ? ['Digital twin simulation confidence is limited — newer/less-characterized material'] : []),
                ...(score.historicalAccuracy < 0.8 ? ['Limited historical recommendation-vs-outcome tracking for this chemistry family'] : []),
            ],
        };
    }

    /**
     * generateComparisonReport
     */
    @Tool({
        name: 'generate_comparison_report',
        description:
            'Generate a comprehensive, exportable material comparison report for a battery component type. ' +
            'Includes: scorecards for all candidates, TOPSIS ranking, trade-off analysis, regulatory compliance ' +
            'matrix, sustainability assessment, cost-benefit analysis, and executive summary. ' +
            'The final synthesis step — call after all other analysis tools.',
        inputSchema: GenerateReportSchema,
        examples: {
            request: {
                componentType: 'cathode',
                weights: { energyDensity: 0.25, cost: 0.2, cycleLife: 0.15, safety: 0.15, sustainability: 0.1, supplyChainRisk: 0.07, fastChargeCapability: 0.05, lowTemperaturePerformance: 0.03 },
                includeRegulatorySection: true,
                includeSustainabilitySection: true,
            },
            response: {
                reportTitle: 'EV Battery Cathode Material Selection Report',
                topRecommendation: 'LFP (LiFePO₄)',
                reportSections: ['Executive Summary', 'Scorecard', 'TOPSIS Ranking', 'Trade-off Analysis', 'Regulatory Compliance', 'Sustainability Assessment'],
            },
        },
    })
    async generateComparisonReport(args: z.infer<typeof GenerateReportSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Generating comparison report', { componentType: args.componentType });

        // Run full analysis pipeline internally
        const ranked = this.batteryService.rankCandidates(args.componentType, {}, args.weights);
        const paretoSet = this.batteryService.buildParetoSet(ranked);
        const finalRanking = this.batteryService.computeTOPSIS(ranked, args.weights);
        const tradeOffs = this.batteryService.identifyTradeOffs(ranked);
        const risks = this.batteryService.identifyRisks(ranked);

        const topMaterial = finalRanking.topRecommendation;
        const ranked2 = { ...topMaterial, compositeScore: topMaterial.compositeScore || 0, rank: 1 };
        const simResult = this.batteryService.runFullSimulation(ranked2);
        const confidence = this.batteryService.computeConfidenceScore(finalRanking, [simResult]);

        // Regulatory compliance matrix
        const regulatoryMatrix = ranked.map(m => ({
            materialId: m.id,
            materialName: m.name,
            un383: m.metrics.regulatoryCompliance.un383,
            reach: m.metrics.regulatoryCompliance.reach,
            rohs: m.metrics.regulatoryCompliance.rohs,
            euBatteryRegulation: m.metrics.regulatoryCompliance.euBatteryRegulation,
            fullyCompliant: Object.values(m.metrics.regulatoryCompliance).every(Boolean),
        }));

        // Sustainability scorecard
        const sustainabilityScores = ranked.map(m => ({
            materialId: m.id,
            materialName: m.name,
            carbonFootprintKgCO2eKwh: m.metrics.carbonFootprint,
            recyclabilityPct: m.metrics.recyclability,
            criticalMineralDependency: m.metrics.criticalMineralDependency,
            sustainabilityScore: Math.round(
                (1 - m.metrics.criticalMineralDependency / 10) * 35 +
                (m.metrics.recyclability / 100) * 35 +
                (1 - m.metrics.carbonFootprint / 100) * 30
            ),
        })).sort((a, b) => b.sustainabilityScore - a.sustainabilityScore);

        // Cost-benefit analysis (cost vs energy density)
        const costBenefit = ranked.map(m => ({
            materialId: m.id,
            materialName: m.name,
            costPerKWh: m.metrics.materialCostPerKWh,
            energyDensityWhKg: m.metrics.gravimetricEnergyDensity,
            energyPerDollar: parseFloat((m.metrics.gravimetricEnergyDensity / m.metrics.materialCostPerKWh).toFixed(3)),
            cycleLifePerDollar: parseFloat((m.metrics.cycleLifeTo80SOH / m.metrics.materialCostPerKWh).toFixed(1)),
        })).sort((a, b) => b.energyPerDollar - a.energyPerDollar);

        ctx.logger.info('Report generated', {
            componentType: args.componentType,
            topRecommendation: topMaterial.name,
            candidatesAnalyzed: ranked.length,
        });

        return {
            reportTitle: `EV Battery ${args.componentType.charAt(0).toUpperCase() + args.componentType.slice(1)} Material Selection Report`,
            generatedAt: new Date().toISOString(),
            componentType: args.componentType,
            candidatesAnalyzed: ranked.length,
            topRecommendation: {
                id: topMaterial.id,
                name: topMaterial.name,
                chemistryFamily: topMaterial.chemistryFamily,
                topsisScore: finalRanking.topsisRanking[0].topsisScore,
                compositeScore: topMaterial.compositeScore,
                strengths: topMaterial.strengths,
                keyMetrics: {
                    gravimetricEnergyDensityWhKg: topMaterial.metrics.gravimetricEnergyDensity,
                    materialCostPerKWh: topMaterial.metrics.materialCostPerKWh,
                    cycleLifeTo80SOH: topMaterial.metrics.cycleLifeTo80SOH,
                    thermalRunawayOnsetTempC: topMaterial.metrics.thermalRunawayOnsetTemp,
                    criticalMineralDependency: topMaterial.metrics.criticalMineralDependency,
                },
            },
            scorecard: ranked.map(m => ({
                rank: m.rank,
                materialId: m.id,
                materialName: m.name,
                compositeScore: m.compositeScore,
                keyMetrics: {
                    energyDensity: m.metrics.gravimetricEnergyDensity,
                    cost: m.metrics.materialCostPerKWh,
                    cycleLife: m.metrics.cycleLifeTo80SOH,
                    safety: m.metrics.thermalRunawayOnsetTemp,
                    sustainability: m.metrics.recyclability,
                },
            })),
            topsisRanking: finalRanking.topsisRanking.map(r => ({
                rank: r.rank,
                material: r.material.name,
                topsisScore: r.topsisScore,
            })),
            paretoFrontSize: paretoSet.paretoFront.length,
            paretoFrontMaterials: paretoSet.paretoFront.map(m => m.name),
            tradeOffSummary: {
                count: tradeOffs.length,
                tradeOffs: tradeOffs.slice(0, 3),
            },
            riskSummary: {
                total: risks.length,
                critical: risks.filter(r => r.severity === 'critical').length,
                high: risks.filter(r => r.severity === 'high').length,
                topRisks: risks.filter(r => ['critical', 'high'].includes(r.severity)).slice(0, 3),
            },
            regulatoryMatrix: args.includeRegulatorySection ? regulatoryMatrix : null,
            sustainabilityAssessment: args.includeSustainabilitySection ? sustainabilityScores : null,
            costBenefitAnalysis: costBenefit,
            confidenceScore: {
                overall: confidence.overall,
                breakdown: confidence.breakdown,
            },
            reportSections: [
                'Executive Summary',
                'Top Recommendation',
                'Full Candidate Scorecard',
                'TOPSIS Ranking',
                'Pareto Front Analysis',
                'Trade-off Analysis',
                ...(args.includeRegulatorySection ? ['Regulatory Compliance Matrix'] : []),
                ...(args.includeSustainabilitySection ? ['Sustainability Assessment'] : []),
                'Cost-Benefit Analysis',
                'Risk Summary',
                'Confidence Score',
            ],
            exportNote: 'This report can be exported to PDF, Power BI, or Tableau for engineering review board presentation.',
        };
    }

    // ─── Widget-backed tools ──────────────────────────────────────────────────

    /**
     * showParetoFrontChart — Widget
     */
    @Tool({
        name: 'show_pareto_front_chart',
        description:
            'Display an interactive 2D Pareto front scatter chart for the specified battery component type. ' +
            'Plots candidates on user-chosen axes (e.g., cost vs energy density) with Pareto-optimal points highlighted. ' +
            'Use to visualize multi-objective trade-off space for engineering teams.',
        inputSchema: ShowParetoChartSchema,
        examples: {
            request: { componentType: 'cathode', xAxis: 'gravimetricEnergyDensity', yAxis: 'materialCostPerKWh' },
            response: { componentType: 'cathode', xAxis: 'gravimetricEnergyDensity', yAxis: 'materialCostPerKWh', totalPoints: 5 },
        },
    })
    @Widget(batteryWidget('pareto-front-chart'))
    async showParetoFrontChart(args: z.infer<typeof ShowParetoChartSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Showing Pareto front chart', { componentType: args.componentType });

        const dummyWeights = {
            energyDensity: 0.25, cost: 0.20, cycleLife: 0.15, safety: 0.15,
            sustainability: 0.10, supplyChainRisk: 0.07, fastChargeCapability: 0.05, lowTemperaturePerformance: 0.03,
        };
        const ranked = this.batteryService.rankCandidates(args.componentType, {}, dummyWeights);
        const paretoSet = this.batteryService.buildParetoSet(ranked);

        const getMetricValue = (m: typeof ranked[0], axis: string): number => {
            switch (axis) {
                case 'gravimetricEnergyDensity': return m.metrics.gravimetricEnergyDensity;
                case 'materialCostPerKWh': return m.metrics.materialCostPerKWh;
                case 'cycleLifeTo80SOH': return m.metrics.cycleLifeTo80SOH;
                case 'criticalMineralDependency': return m.metrics.criticalMineralDependency;
                case 'thermalRunawayOnsetTemp': return m.metrics.thermalRunawayOnsetTemp;
                case 'recyclability': return m.metrics.recyclability;
                default: return 0;
            }
        };

        const paretoIds = new Set(paretoSet.paretoFront.map(m => m.id));

        const chartData = ranked.map(m => ({
            id: m.id,
            name: m.name,
            chemistryFamily: m.chemistryFamily,
            x: getMetricValue(m, args.xAxis!),
            y: getMetricValue(m, args.yAxis!),
            compositeScore: m.compositeScore,
            isPareto: paretoIds.has(m.id),
            rank: m.rank,
        }));

        return {
            componentType: args.componentType,
            xAxis: args.xAxis,
            yAxis: args.yAxis,
            xAxisLabel: args.xAxis!.replace(/([A-Z])/g, ' $1').trim(),
            yAxisLabel: args.yAxis!.replace(/([A-Z])/g, ' $1').trim(),
            chartData,
            paretoFrontIds: paretoSet.paretoFront.map(m => m.id),
            totalPoints: chartData.length,
            paretoFrontSize: paretoSet.paretoFront.length,
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * showTradeOffTable — Widget
     */
    @Tool({
        name: 'show_trade_off_table',
        description:
            'Display an interactive trade-off comparison table for the top candidate materials. ' +
            'Shows plain-English trade-off narratives across energy density vs cost, ' +
            'cycle life vs thermal safety dimensions. Best used after identify_trade_offs.',
        inputSchema: ShowTradeOffTableSchema,
        examples: {
            request: { componentType: 'cathode' },
            response: { componentType: 'cathode', tradeOffs: [], totalTradeOffs: 0 },
        },
    })
    @Widget(batteryWidget('trade-off-table'))
    async showTradeOffTable(args: z.infer<typeof ShowTradeOffTableSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Showing trade-off table', { componentType: args.componentType });

        const weights = args.weights || {
            energyDensity: 0.25, cost: 0.20, cycleLife: 0.15, safety: 0.15,
            sustainability: 0.10, supplyChainRisk: 0.07, fastChargeCapability: 0.05, lowTemperaturePerformance: 0.03,
        };
        const ranked = this.batteryService.rankCandidates(args.componentType, {}, weights);
        const tradeOffs = this.batteryService.identifyTradeOffs(ranked);

        return {
            componentType: args.componentType,
            tradeOffs,
            totalTradeOffs: tradeOffs.length,
            topCandidates: ranked.slice(0, 3).map(m => ({
                id: m.id,
                name: m.name,
                compositeScore: m.compositeScore,
                rank: m.rank,
            })),
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * showConfidenceGauge — Widget
     */
    @Tool({
        name: 'show_confidence_gauge',
        description:
            'Display a confidence gauge widget showing the overall recommendation confidence score ' +
            '(0-100%) for a specific material, with a tooltip breakdown of its three inputs: ' +
            'KB data recency, simulation fidelity, and historical accuracy.',
        inputSchema: ShowConfidenceGaugeSchema,
        examples: {
            request: { materialId: 'lfp-cathode', componentType: 'cathode' },
            response: { materialId: 'lfp-cathode', materialName: 'LFP (LiFePO₄)', overall: 0.88, interpretive: 'High confidence' },
        },
    })
    @Widget(batteryWidget('confidence-gauge'))
    async showConfidenceGauge(args: z.infer<typeof ShowConfidenceGaugeSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Showing confidence gauge', { materialId: args.materialId });

        const material = this.batteryService.getMaterialById(args.materialId);
        if (!material) throw new Error(`Material not found: ${args.materialId}`);

        const ranked = { ...material, compositeScore: 0, rank: 1 };
        const simResult = this.batteryService.runFullSimulation(ranked);

        const dummyWeights = {
            energyDensity: 0.25, cost: 0.20, cycleLife: 0.15, safety: 0.15,
            sustainability: 0.10, supplyChainRisk: 0.07, fastChargeCapability: 0.05, lowTemperaturePerformance: 0.03,
        };
        const mockRanking = {
            topsisRanking: [{ rank: 1, material: ranked, topsisScore: 0.75, idealDistance: 0.1, negativeIdealDistance: 0.3 }],
            topRecommendation: ranked,
            weights: dummyWeights,
            generatedAt: new Date().toISOString(),
        };

        const score = this.batteryService.computeConfidenceScore(mockRanking, [simResult]);

        const interpretive = score.overall >= 0.85 ? 'High Confidence'
            : score.overall >= 0.70 ? 'Moderate Confidence'
            : 'Low Confidence — Additional Validation Required';

        const color = score.overall >= 0.85 ? '#22c55e'
            : score.overall >= 0.70 ? '#f59e0b'
            : '#ef4444';

        return {
            materialId: args.materialId,
            materialName: material.name,
            componentType: args.componentType,
            chemistryFamily: material.chemistryFamily,
            overall: score.overall,
            overallPercent: Math.round(score.overall * 100),
            color,
            interpretive,
            breakdown: {
                kbDataRecency: { score: score.kbDataRecency, percent: Math.round(score.kbDataRecency * 100), label: 'KB Data Recency', weight: '40%' },
                simulationFidelity: { score: score.simulationFidelity, percent: Math.round(score.simulationFidelity * 100), label: 'Simulation Fidelity', weight: '40%' },
                historicalAccuracy: { score: score.historicalAccuracy, percent: Math.round(score.historicalAccuracy * 100), label: 'Historical Accuracy', weight: '20%' },
            },
            breakdownNarrative: score.breakdown,
        };
    }

    // ─── Prompts ──────────────────────────────────────────────────────────────

    @Prompt({
        name: 'trade_off_narrative_prompt',
        description:
            'Turns a TradeOff[] array into a plain-English engineering narrative suitable for ' +
            'an engineering review board report. Pairs with the identify_trade_offs tool output.',
        arguments: [
            { name: 'tradeOffsJson', description: 'JSON string of TradeOff[] from identify_trade_offs', required: true },
            { name: 'topRecommendation', description: 'Name of the top recommended material', required: true },
            { name: 'useCase', description: 'Brief description of the EV use case (optional)', required: false },
        ],
    })
    async tradeOffNarrativePrompt(args: { tradeOffsJson: string; topRecommendation: string; useCase?: string }, _ctx: ExecutionContext) {
        return {
            messages: [
                {
                    role: 'user' as const,
                    content: `You are a senior battery engineer writing a material selection report section. 
Convert the following trade-off data into clear, professional engineering prose (2-4 paragraphs).
Focus on: (1) the key performance vs cost trade-offs, (2) why the recommended material was selected despite trade-offs, (3) what the engineer must monitor or mitigate.

Top Recommendation: ${args.topRecommendation}
Use Case: ${args.useCase || 'General EV passenger car application'}

Trade-off data (JSON):
${args.tradeOffsJson}

Write in the style of a Tier-1 automotive supplier engineering report. Avoid jargon where possible. Be specific with numbers.`,
                },
            ],
        };
    }

    @Prompt({
        name: 'executive_summary_prompt',
        description:
            'Generates a one-paragraph executive summary of the EV battery material recommendation for ' +
            'non-specialist stakeholders (C-suite, procurement, sustainability team). ' +
            'Pairs with the generate_comparison_report tool output.',
        arguments: [
            { name: 'reportJson', description: 'JSON string of the report from generate_comparison_report', required: true },
            { name: 'audienceType', description: 'Target audience: executive, procurement, sustainability, or investor', required: false },
        ],
    })
    async executiveSummaryPrompt(args: { reportJson: string; audienceType?: string }, _ctx: ExecutionContext) {
        const audience = args.audienceType || 'executive';

        const audienceGuidance: Record<string, string> = {
            executive: 'Focus on: top recommendation, total cost impact, time-to-market risk, and competitive advantage. Avoid technical jargon.',
            procurement: 'Focus on: material cost per kWh, supply chain risk, supplier availability, and regulatory compliance status.',
            sustainability: 'Focus on: carbon footprint, recyclability, cobalt/nickel dependency, and EU Battery Regulation compliance.',
            investor: 'Focus on: technology maturity, cost competitiveness, market adoption trends, and simulation-backed confidence level.',
        };

        return {
            messages: [
                {
                    role: 'user' as const,
                    content: `You are a technical writer specializing in EV battery technology. 
Write a single executive summary paragraph (150-200 words) for the following battery material selection report.

Target audience: ${audience} stakeholder
Guidance: ${audienceGuidance[audience] || audienceGuidance.executive}

Report data (JSON):
${args.reportJson}

The paragraph should: state the top recommendation, explain the primary reason in plain English, quantify the top 2 advantages, acknowledge the top 1 risk with its mitigation, and conclude with a confidence statement.`,
                },
            ],
        };
    }
}
