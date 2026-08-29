import { EvBatteryService } from './src/modules/ev-battery/ev-battery.service.js';
import { RequirementAnalysisTools } from './src/modules/requirement-analysis/requirement-analysis.tools.js';
import { MaterialRecommendationTools } from './src/modules/material-recommendation/material-recommendation.tools.js';
import { DigitalTwinSimulationTools } from './src/modules/digital-twin-simulation/digital-twin-simulation.tools.js';
import { KnowledgeBaseTools } from './src/modules/knowledge-base/knowledge-base.tools.js';
import { DecisionReportingTools } from './src/modules/decision-reporting/decision-reporting.tools.js';

// Mock ExecutionContext
const mockCtx: any = {
    logger: {
        info: (msg: string) => console.log(`[INFO] ${msg}`),
        warn: (msg: string) => console.log(`[WARN] ${msg}`),
        error: (msg: string) => console.error(`[ERROR] ${msg}`),
        debug: (msg: string) => {},
    }
};

async function runTests() {
    console.log('--- STARTING PIPELINE TEST ---');
    try {
        const service = new EvBatteryService();
        const reqTools = new RequirementAnalysisTools(service);
        const recTools = new MaterialRecommendationTools(service);
        const simTools = new DigitalTwinSimulationTools(service);
        const kbTools = new KnowledgeBaseTools(service);
        const repTools = new DecisionReportingTools(service);

        // 1. Requirements
        console.log('\n--- 1. Requirement Analysis ---');
        const parseRes = await reqTools.parseRequirementSpec({ rawInput: 'Compact EV, 400km range, cheap' }, mockCtx);
        console.log('parseRequirementSpec: OK');

        const classifyRes = await reqTools.classifyConstraints({ requirementSet: parseRes.requirementSet }, mockCtx);
        console.log('classifyConstraints: OK');

        const schemaRes = await reqTools.toStructuredSchema({ requirementSet: parseRes.requirementSet }, mockCtx);
        console.log('toStructuredSchema: OK');

        const priorRes = await reqTools.prioritizeObjectives({ requirementSet: parseRes.requirementSet }, mockCtx);
        console.log('prioritizeObjectives: OK');

        // 2. Recommendations
        console.log('\n--- 2. Material Recommendation ---');
        const rankRes = await recTools.rankCandidateMaterials({
            componentType: 'cathode',
            target: schemaRes.metricsTarget,
            weights: priorRes.weights
        }, mockCtx);
        console.log('rankCandidateMaterials: OK');

        const paretoRes = await recTools.runParetoOptimization({ candidates: rankRes.ranked }, mockCtx);
        console.log('runParetoOptimization: OK');

        const topMaterialId = paretoRes.paretoFront[0]?.id || rankRes.ranked[0]?.id;

        const altRes = await recTools.suggestAlternativeFormulations({ materialId: topMaterialId, optimizeFor: 'cost' }, mockCtx);
        console.log('suggestAlternativeFormulations: OK');

        const explRes = await recTools.explainRecommendation({ materialId: topMaterialId, componentType: 'cathode', weights: priorRes.weights }, mockCtx);
        console.log('explainRecommendation: OK');

        const recWidget = await recTools.showMaterialComparison({ componentType: 'cathode', candidates: rankRes.ranked }, mockCtx);
        console.log('showMaterialComparison: OK');

        // 3. Digital Twin Simulation
        console.log('\n--- 3. Digital Twin Simulation ---');
        const buildRes = await simTools.buildVirtualCellModel({ materialId: topMaterialId }, mockCtx);
        console.log('buildVirtualCellModel: OK');

        const perfRes = await simTools.simulateElectrochemicalPerformance({ materialId: topMaterialId, cRate: 1 }, mockCtx);
        console.log('simulateElectrochemicalPerformance: OK');

        const thermRes = await simTools.simulateThermalResponse({ materialId: topMaterialId, chargeRateC: 1, ambientTempCelsius: 25 }, mockCtx);
        console.log('simulateThermalResponse: OK');

        const mechRes = await simTools.simulateMechanicalDegradation({ materialId: topMaterialId, cycleCount: 1000 }, mockCtx);
        console.log('simulateMechanicalDegradation: OK');

        const failRes = await simTools.predictFailureModes({ materialId: topMaterialId, chargeRateC: 1, temperatureCelsius: 25 }, mockCtx);
        console.log('predictFailureModes: OK');

        const surRes = await simTools.runSurrogateScreening({ componentType: 'cathode' }, mockCtx);
        console.log('runSurrogateScreening: OK');

        const compRes = await simTools.compareCandidatesSideBySide({ materialIds: paretoRes.paretoFront.map(c => c.id).slice(0, 2) }, mockCtx);
        console.log('compareCandidatesSideBySide: OK');

        const simWidget = await simTools.showDigitalTwinTimeline({
            materialId: topMaterialId,
            materialName: 'Test',
            chemistryFamily: 'Test',
            componentType: 'cathode',
            simulation: { voltageProfile: [], thermalProfile: [], degradationCurve: [] },
            summary: { peakCapacityMahG: 100, peakTemperatureC: 30, thermalRunawayRisk: 'low', projectedCycleLife: 1000, volumeExpansionPct: 2, overallSimConfidence: 0.9 }
        }, mockCtx);
        console.log('showDigitalTwinTimeline: OK');

        // 4. Knowledge Base
        console.log('\n--- 4. Knowledge Base ---');
        const ingestRes = await kbTools.ingestNewMaterialData({
            materialId: 'test-mat',
            name: 'Test',
            chemistryFamily: 'LFP',
            componentType: 'cathode',
            metrics: { gravimetricEnergyDensity: 100, materialCostPerKWh: 50, cycleLifeTo80SOH: 1000, thermalRunawayOnsetTemp: 200, cRateCapability: 1, criticalMineralDependency: 1, recyclability: 90, carbonFootprint: 10 }
        }, mockCtx);
        console.log('ingestNewMaterialData: OK');

        const valRes = await kbTools.validateDatasetQuality({ datasetId: 'test' }, mockCtx);
        console.log('validateDatasetQuality: OK');

        const dsRes = await kbTools.ingestManufacturerDatasheet({ manufacturerName: 'Test', materialName: 'test', datasheetSource: 'test', metricsJson: '{"gravimetricEnergyDensity": 100}' }, mockCtx);
        console.log('ingestManufacturerDatasheet: OK');

        const queryRes = await kbTools.queryMaterialCompatibility({ query: 'test' }, mockCtx);
        console.log('queryMaterialCompatibility: OK');

        const logRes = await kbTools.logRecommendationOutcome({ materialId: topMaterialId, successScore: 8, feedback: 'good' }, mockCtx);
        console.log('logRecommendationOutcome: OK');

        const refRes = await kbTools.refineRankingModel({}, mockCtx);
        console.log('refineRankingModel: OK');

        // 5. Decision Reporting
        console.log('\n--- 5. Decision Reporting ---');
        const topsisRes = await repTools.computeTopsisRanking({ candidates: paretoRes.paretoFront, weights: priorRes.weights }, mockCtx);
        console.log('computeTopsisRanking: OK');

        const tradeRes = await repTools.identifyTradeOffs({ candidates: paretoRes.paretoFront.slice(0, 2) }, mockCtx);
        console.log('identifyTradeOffs: OK');

        const riskRes = await repTools.surfaceDesignRisks({ candidates: paretoRes.paretoFront.slice(0, 2) }, mockCtx);
        console.log('surfaceDesignRisks: OK');

        const confRes = await repTools.computeConfidenceScore({ topMaterialId, componentType: 'cathode', weights: priorRes.weights }, mockCtx);
        console.log('computeConfidenceScore: OK');

        const reportRes = await repTools.generateComparisonReport({ componentType: 'cathode', weights: priorRes.weights }, mockCtx);
        console.log('generateComparisonReport: OK');

        const paretoWidget = await repTools.showParetoFrontChart({ componentType: 'cathode', chartData: [], paretoFrontIds: [], xAxis: 'cost', yAxis: 'energyDensity' }, mockCtx);
        console.log('showParetoFrontChart: OK');

        const tradeWidget = await repTools.showTradeOffTable({ componentType: 'cathode', tradeOffs: tradeRes.tradeOffs, topCandidates: paretoRes.paretoFront.map(c=>c.id) }, mockCtx);
        console.log('showTradeOffTable: OK');

        const confWidget = await repTools.showConfidenceGauge({
            materialId: topMaterialId,
            componentType: 'cathode'
        }, mockCtx);
        console.log('showConfidenceGauge: OK');

        console.log('\n✅ ALL TOOLS COMPLETED SUCCESSFULLY!');
    } catch (e: any) {
        console.error('\n❌ PIPELINE FAILED AT A TOOL:');
        console.error(e.message);
        console.error(e.stack);
    }
}

runTests();
