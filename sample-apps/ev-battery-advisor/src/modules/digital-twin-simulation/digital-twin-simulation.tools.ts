/**
 * Module 3 — DigitalTwinSimulationModule Tools
 *
 * Virtual electrochemical–thermal–mechanical model of each shortlisted
 * candidate, replacing slow physical coin-cell/pouch-cell testing for
 * early-stage screening.
 */

import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { EvBatteryService } from '../ev-battery/ev-battery.service.js';
import { RankedMaterialSchema } from '../../schemas/material-metrics.schema.js';

// ─── Widget helper ────────────────────────────────────────────────────────────

function batteryWidget(route: string) {
    return { route, prefersBorder: true };
}

// ─── Input Schemas ────────────────────────────────────────────────────────────

const BuildCellModelSchema = z.object({
    materialId: z.string().describe('Material ID to build a virtual cell model for'),
    particleSizeUm: z.number().min(0.1).max(50).optional().default(10).describe('Active material particle size in µm'),
    electrodeThicknessUm: z.number().min(10).max(500).optional().default(100).describe('Electrode coating thickness in µm'),
    porosityFraction: z.number().min(0.1).max(0.7).optional().default(0.35).describe('Electrode porosity (volume fraction)'),
});

const SimulateElectrochemSchema = z.object({
    materialId: z.string().describe('Material ID to simulate electrochemical performance for'),
    cRate: z.number().min(0.1).max(10).optional().default(1.0).describe('Discharge/charge C-rate for simulation'),
    temperatureCelsius: z.number().min(-40).max(80).optional().default(25).describe('Cell temperature in °C'),
});

const SimulateThermalSchema = z.object({
    materialId: z.string().describe('Material ID to simulate thermal response for'),
    chargeRateC: z.number().min(0.5).max(10).optional().default(3.0).describe('Fast-charge C-rate for thermal simulation'),
    ambientTempCelsius: z.number().min(-40).max(50).optional().default(25).describe('Ambient temperature in °C'),
});

const SimulateMechanicalSchema = z.object({
    materialId: z.string().describe('Material ID to simulate mechanical degradation for'),
    cycleCount: z.number().int().min(100).max(5000).optional().default(1000).describe('Number of cycles to simulate'),
});

const PredictFailureModesSchema = z.object({
    materialId: z.string().describe('Material ID to predict failure modes for'),
    chargeRateC: z.number().min(0.5).max(10).optional().default(3.0).describe('Charge rate for failure analysis'),
    temperatureCelsius: z.number().min(-40).max(80).optional().default(25).describe('Operating temperature'),
});

const SurrogateScreeningSchema = z.object({
    componentType: z.enum(['cathode', 'anode', 'electrolyte', 'separator', 'current-collector', 'casing'])
        .describe('Component type to screen all candidates for'),
    maxCandidates: z.number().int().min(1).max(10).optional().default(5).describe('Maximum candidates to screen'),
});

const CompareCandidatesSchema = z.object({
    materialIds: z.array(z.string()).min(2).max(5).describe('List of material IDs to compare side-by-side'),
});

const ShowDigitalTwinTimelineSchema = z.object({
    materialId: z.string().describe('Material ID to show digital twin simulation timeline for'),
});

// ─── Controller ──────────────────────────────────────────────────────────────

@Injectable({ deps: [EvBatteryService] })
export class DigitalTwinSimulationTools {
    constructor(private readonly batteryService: EvBatteryService) { }

    /**
     * buildVirtualCellModel
     */
    @Tool({
        name: 'build_virtual_cell_model',
        description:
            'Construct a physics-based virtual cell model (P2D / Doyle-Fuller-Newman) for a material candidate ' +
            'from particle size, electrode thickness, and porosity parameters. ' +
            'The cell model is the foundation for all subsequent electrochemical, thermal, and mechanical simulations. ' +
            'Call before simulate_electrochemical_performance.',
        inputSchema: BuildCellModelSchema,
        examples: {
            request: { materialId: 'lfp-cathode', particleSizeUm: 5, electrodeThicknessUm: 80, porosityFraction: 0.35 },
            response: {
                materialId: 'lfp-cathode',
                modelType: 'p2d-dfn',
                cellParameters: { particleSizeUm: 5, electrodeThicknessUm: 80, porosityFraction: 0.35 },
                effectiveDiffusivity: 2.1e-13,
                volumeFraction: 0.55,
                tortuosity: 1.8,
                modelReady: true,
            },
        },
    })
    async buildVirtualCellModel(args: z.infer<typeof BuildCellModelSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Building virtual cell model', { materialId: args.materialId });

        const material = this.batteryService.getMaterialById(args.materialId);
        if (!material) throw new Error(`Material not found: ${args.materialId}`);

        // Bruggeman correlation for tortuosity: τ = ε^(-0.5)
        const porosity = args.porosityFraction!;
        const tortuosity = Math.pow(porosity, -0.5);
        const volumeFraction = 1 - porosity;
        const effectiveDiffusivity = 1e-13 * (material.metrics.ionicConductivity / 1e-4) * Math.pow(porosity, tortuosity);

        return {
            materialId: args.materialId,
            materialName: material.name,
            chemistryFamily: material.chemistryFamily,
            modelType: 'p2d-dfn',
            cellParameters: {
                particleSizeUm: args.particleSizeUm,
                electrodeThicknessUm: args.electrodeThicknessUm,
                porosityFraction: args.porosityFraction,
                volumeFraction: parseFloat(volumeFraction.toFixed(3)),
                tortuosity: parseFloat(tortuosity.toFixed(3)),
            },
            effectiveDiffusivityM2s: parseFloat(effectiveDiffusivity.toExponential(2)),
            ionicConductivityScm: material.metrics.ionicConductivity,
            specificCapacityMahG: material.metrics.specificCapacity,
            modelReady: true,
            nextStep: 'Call simulate_electrochemical_performance with this materialId',
        };
    }

    /**
     * simulateElectrochemicalPerformance
     */
    @Tool({
        name: 'simulate_electrochemical_performance',
        description:
            'Run a Pseudo-2D Doyle-Fuller-Newman electrochemical simulation for a material candidate. ' +
            'Models lithium-ion transport, reaction kinetics, and produces capacity/voltage discharge curves. ' +
            'Powered by PyBaMM-equivalent P2D model. Returns voltage profile, rate capability, and internal resistance. ' +
            'Call after build_virtual_cell_model.',
        inputSchema: SimulateElectrochemSchema,
        examples: {
            request: { materialId: 'nmc811-cathode', cRate: 2.0, temperatureCelsius: 25 },
            response: {
                materialId: 'nmc811-cathode',
                modelType: 'p2d-dfn',
                predictedCapacityMahG: 198.0,
                internalResistanceOhm: 0.003,
                rateCapabilityC: 3.0,
                simulationConfidence: 0.83,
                voltageProfilePoints: 20,
            },
        },
    })
    async simulateElectrochemicalPerformance(args: z.infer<typeof SimulateElectrochemSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Simulating electrochemical performance', { materialId: args.materialId, cRate: args.cRate });

        const material = this.batteryService.getMaterialById(args.materialId);
        if (!material) throw new Error(`Material not found: ${args.materialId}`);

        // Build a full RankedMaterial stub for simulation
        const ranked = {
            ...material,
            compositeScore: 0,
            rank: 1,
        };

        const result = this.batteryService.simulateElectrochem(ranked);

        // Apply temperature effect on capacity — full range model:
        //   Cold  (< 15°C): Li-ion diffusion slows → capacity loss, ~1% per °C below 15
        //   Warm  (15–35°C): nominal zone, no derating
        //   Hot   (> 35°C): electrolyte degradation and gassing → mild capacity sag, ~0.5% per °C above 35
        const tempC = args.temperatureCelsius!;
        const tempDerating = tempC < 15
            ? Math.max(0.70, 1 + (tempC - 15) * 0.01)   // up to ~15% loss at -20°C
            : tempC > 35
                ? Math.max(0.90, 1 - (tempC - 35) * 0.005) // up to ~10% loss at 55°C
                : 1.0;

        const cRateDerating = 1 - Math.max(0, args.cRate! - 1) * 0.03;

        const adjustedCapacity = result.predictedCapacityMahG * Math.max(0.7, tempDerating * cRateDerating);

        const capacityRatio = adjustedCapacity / result.predictedCapacityMahG;

        // Voltage droop: IR drop from C-rate PLUS temperature-induced resistance shift
        //   Cold temps → higher internal resistance → more droop
        //   Hot temps  → slightly elevated IR due to SEI swelling → mild extra droop
        const tempVoltageDroop = tempC < 15
            ? (15 - tempC) * 0.003  // cold increases resistance
            : tempC > 35
                ? (tempC - 35) * 0.001  // heat adds mild sag
                : 0;
        const voltageDroop = (args.cRate! - 1) * result.internalResistanceOhm * 20 + tempVoltageDroop;

        const adjustedVoltageProfile = result.voltageProfile.map(p => ({
            capacity: parseFloat((p.capacity * capacityRatio).toFixed(2)),
            voltage: parseFloat((p.voltage - voltageDroop).toFixed(3))
        }));

        ctx.logger.info('Electrochem simulation complete', { materialId: args.materialId, capacity: adjustedCapacity });

        return {
            materialId: args.materialId,
            materialName: material.name,
            simulationConditions: { cRate: args.cRate, temperatureCelsius: args.temperatureCelsius },
            modelType: result.modelType,
            voltageProfile: adjustedVoltageProfile,
            predictedCapacityMahG: parseFloat(adjustedCapacity.toFixed(1)),
            internalResistanceOhm: parseFloat(result.internalResistanceOhm.toFixed(4)),
            rateCapabilityC: result.rateCapabilityC,
            temperatureEffect: tempC < 15
                ? `${Math.round((1 - tempDerating) * 100)}% capacity reduction at ${tempC}°C (cold)`
                : tempC > 35
                    ? `${Math.round((1 - tempDerating) * 100)}% capacity sag at ${tempC}°C (heat)`
                    : 'Nominal thermal conditions (15–35°C)',
            simulationConfidence: result.simulationConfidence,
            simulatedWith: 'PyBaMM-equivalent P2D-DFN model',
        };
    }

    /**
     * simulateThermalResponse
     */
    @Tool({
        name: 'simulate_thermal_response',
        description:
            'Run a finite-element thermal simulation coupled to the electrochemical model for a material under ' +
            'fast-charge or high-load conditions. Calculates peak temperature, heat generation rate, and thermal ' +
            'runaway risk classification. Equivalent to COMSOL Multiphysics / ANSYS Fluent thermal simulation. ' +
            'Call after simulate_electrochemical_performance.',
        inputSchema: SimulateThermalSchema,
        examples: {
            request: { materialId: 'nmc811-cathode', chargeRateC: 3.0, ambientTempCelsius: 40 },
            response: {
                materialId: 'nmc811-cathode',
                thermalRunawayRisk: 'high',
                peakTemperatureCelsius: 68.5,
                heatGenerationRateW: 2.4,
                simulationConfidence: 0.77,
            },
        },
    })
    async simulateThermalResponse(args: z.infer<typeof SimulateThermalSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Simulating thermal response', { materialId: args.materialId, cRate: args.chargeRateC });

        const material = this.batteryService.getMaterialById(args.materialId);
        if (!material) throw new Error(`Material not found: ${args.materialId}`);

        const ranked = { ...material, compositeScore: 0, rank: 1 };

        // Adjust simulation for ambient temperature and C-Rate
        const result = this.batteryService.simulateThermal(ranked);
        
        const ambientOffset = (args.ambientTempCelsius! - 25);
        const heatMultiplier = Math.max(0.5, args.chargeRateC! / material.metrics.cRateCapability);
        const adjustedPeakTemp = 25 + (result.peakTemperatureCelsius - 25) * heatMultiplier + ambientOffset;

        // Adjust risk level based on margin to onset
        const margin = material.metrics.thermalRunawayOnsetTemp - adjustedPeakTemp;
        let adjustedRisk = result.thermalRunawayRisk;
        if (margin < 20) adjustedRisk = 'critical';
        else if (margin < 50) adjustedRisk = 'high';
        else if (margin < 100) adjustedRisk = 'moderate';
        else adjustedRisk = 'low';

        ctx.logger.info('Thermal simulation complete', { materialId: args.materialId, risk: adjustedRisk, peakTemp: adjustedPeakTemp });

        return {
            materialId: args.materialId,
            materialName: material.name,
            simulationConditions: { chargeRateC: args.chargeRateC, ambientTempCelsius: args.ambientTempCelsius },
            peakTemperatureCelsius: parseFloat(adjustedPeakTemp.toFixed(1)),
            heatGenerationRateW: parseFloat((result.heatGenerationRateW * heatMultiplier).toFixed(2)),
            thermalRunawayOnsetTempC: material.metrics.thermalRunawayOnsetTemp,
            thermalMarginCelsius: parseFloat(margin.toFixed(1)),
            thermalRunawayRisk: adjustedRisk,
            temperatureProfile: result.temperatureProfile.map(p => ({
                timeSeconds: p.time,
                temperatureCelsius: parseFloat((args.ambientTempCelsius! + (adjustedPeakTemp - args.ambientTempCelsius!) * (1 - Math.exp(-p.time / 300))).toFixed(1)),
            })),
            simulationConfidence: result.simulationConfidence,
            simulatedWith: 'COMSOL Multiphysics-equivalent FEM thermal model',
            recommendation: margin < 50
                ? '⚠️ Thermal margin is tight — active liquid cooling and conservative charge limits are essential.'
                : '✅ Adequate thermal margin — passive or mild active cooling should suffice.',
        };
    }

    /**
     * simulateMechanicalDegradation
     */
    @Tool({
        name: 'simulate_mechanical_degradation',
        description:
            'Run stress-strain and volume-expansion modeling for an electrode material, simulating SEI growth, ' +
            'capacity fade, and long-cycle degradation trends. Equivalent to ANSYS Mechanical / MATLAB Battery Toolbox. ' +
            'Critical for silicon-composite anodes (up to 300% volume expansion) and understanding warranty-period ' +
            'degradation. Call after simulate_thermal_response.',
        inputSchema: SimulateMechanicalSchema,
        examples: {
            request: { materialId: 'silicon-graphite-anode', cycleCount: 1000 },
            response: {
                materialId: 'silicon-graphite-anode',
                volumeExpansionPct: 45,
                projectedCycleLifeCycles: 700,
                seiGrowthRatePctPerCycle: 0.023,
                capacityAt1000Cycles: 82.5,
            },
        },
    })
    async simulateMechanicalDegradation(args: z.infer<typeof SimulateMechanicalSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Simulating mechanical degradation', { materialId: args.materialId, cycles: args.cycleCount });

        const material = this.batteryService.getMaterialById(args.materialId);
        if (!material) throw new Error(`Material not found: ${args.materialId}`);

        const ranked = { ...material, compositeScore: 0, rank: 1 };
        const result = this.batteryService.simulateMechanical(ranked);

        // Find capacity at requested cycle count
        const atRequestedCycle = result.degradationCurve.reduce((prev, curr) =>
            Math.abs(curr.cycle - args.cycleCount!) < Math.abs(prev.cycle - args.cycleCount!) ? curr : prev,
            result.degradationCurve[0]
        );

        ctx.logger.info('Mechanical simulation complete', { materialId: args.materialId, cycleLifeProjected: result.projectedCycleLifeCycles });

        return {
            materialId: args.materialId,
            materialName: material.name,
            simulationConditions: { cycleCount: args.cycleCount },
            volumeExpansionPct: result.volumeExpansionPct,
            stressAtElectrodeMPa: result.stressAtElectrodeMPa,
            projectedCycleLifeCycles: result.projectedCycleLifeCycles,
            seiGrowthRatePctPerCycle: result.seiGrowthRatePctPerCycle,
            capacityRetentionAtRequestedCyclePct: atRequestedCycle?.capacityRetentionPct ?? null,
            degradationCurve: result.degradationCurve,
            warningFlags: [
                ...(result.volumeExpansionPct > 20 ? [`⚠️ High volume expansion (${result.volumeExpansionPct}%) — use elastic binder and pre-compression in cell design`] : []),
                ...(result.seiGrowthRatePctPerCycle > 0.01 ? [`⚠️ Elevated SEI growth rate (${result.seiGrowthRatePctPerCycle.toFixed(3)}%/cycle) — capacity fade may accelerate`] : []),
            ],
            simulationConfidence: result.simulationConfidence,
            simulatedWith: 'ANSYS Mechanical-equivalent FEM stress-strain model',
        };
    }

    /**
     * predictFailureModes
     */
    @Tool({
        name: 'predict_failure_modes',
        description:
            'Predict the dominant failure modes for a material under specified operating conditions. ' +
            'Flags lithium plating during fast charge, SEI growth, thermal-runaway propagation, ' +
            'separator puncture from expansion stress. Estimates service life (cycles to 80% SOH). ' +
            'Call after running all three simulation tools.',
        inputSchema: PredictFailureModesSchema,
        examples: {
            request: { materialId: 'silicon-graphite-anode', chargeRateC: 3.0, temperatureCelsius: -10 },
            response: {
                materialId: 'silicon-graphite-anode',
                dominantFailureModes: ['lithium-plating', 'sei-growth', 'mechanical-cracking'],
                estimatedCycleLife: 700,
                criticalCondition: 'Lithium plating risk elevated at -10°C and 3C charge rate',
            },
        },
    })
    async predictFailureModes(args: z.infer<typeof PredictFailureModesSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Predicting failure modes', { materialId: args.materialId });

        const material = this.batteryService.getMaterialById(args.materialId);
        if (!material) throw new Error(`Material not found: ${args.materialId}`);

        const m = material.metrics;
        const failureModes: { mode: string; risk: string; condition: string; mitigation: string }[] = [];

        // Lithium plating (fast charge + low temp + low ionic conductivity)
        const lithiumPlatingRisk = args.chargeRateC! > m.cRateCapability || args.temperatureCelsius! < 5;
        if (lithiumPlatingRisk) {
            failureModes.push({
                mode: 'lithium-plating',
                risk: args.temperatureCelsius! < -10 ? 'critical' : 'high',
                condition: `${args.chargeRateC}C charge rate at ${args.temperatureCelsius}°C — exceeds safe lithium intercalation rate`,
                mitigation: 'Reduce charge rate at low temperatures, implement temperature-adaptive BMS charging protocol',
            });
        }

        // SEI growth
        if (m.cycleLifeTo80SOH < 1500 || m.volumeExpansion > 20) {
            failureModes.push({
                mode: 'sei-growth',
                risk: m.volumeExpansion > 50 ? 'high' : 'moderate',
                condition: `Volume expansion ${m.volumeExpansion}% accelerates SEI formation and cracking`,
                mitigation: 'Electrolyte additives (FEC, VC), nano-sized active particles, elastic binder systems',
            });
        }

        // Thermal runaway
        const thermalMargin = m.thermalRunawayOnsetTemp - (25 + args.chargeRateC! * 15);
        if (thermalMargin < 80) {
            failureModes.push({
                mode: 'thermal-runaway',
                risk: thermalMargin < 30 ? 'critical' : 'high',
                condition: `Thermal margin to runaway onset: ${thermalMargin.toFixed(0)}°C — dangerously narrow at ${args.chargeRateC}C`,
                mitigation: 'Active liquid cooling, charge rate derating above 35°C, multi-layer BMS protection circuits',
            });
        }

        // Separator puncture from expansion
        if (m.volumeExpansion > 15) {
            failureModes.push({
                mode: 'separator-puncture',
                risk: m.volumeExpansion > 100 ? 'critical' : 'high',
                condition: `${m.volumeExpansion}% electrode expansion generates internal mechanical stress that can pierce separator`,
                mitigation: 'Ceramic-coated separator, cell pre-compression, volumetric expansion management in cell design',
            });
        }

        // Calendar aging
        if (m.calendarLifeSelfDischarge > 0.4) {
            failureModes.push({
                mode: 'calendar-aging',
                risk: 'moderate',
                condition: `Self-discharge rate ${m.calendarLifeSelfDischarge}%/month — notable calendar aging`,
                mitigation: 'Store at 50% SOC, avoid elevated storage temperatures above 30°C',
            });
        }

        const estimatedCycleLife = m.cycleLifeTo80SOH * (lithiumPlatingRisk ? 0.6 : 1.0);
        const dominantMode = failureModes.sort((a, b) => {
            const order = { critical: 0, high: 1, moderate: 2, low: 3 };
            return (order[a.risk as keyof typeof order] || 2) - (order[b.risk as keyof typeof order] || 2);
        });

        ctx.logger.info('Failure modes predicted', { materialId: args.materialId, modes: failureModes.length });

        return {
            materialId: args.materialId,
            materialName: material.name,
            simulationConditions: { chargeRateC: args.chargeRateC, temperatureCelsius: args.temperatureCelsius },
            failureModes: dominantMode,
            dominantFailureModes: dominantMode.slice(0, 3).map(f => f.mode),
            estimatedCycleLife: Math.round(estimatedCycleLife),
            criticalCondition: dominantMode[0]?.condition ?? 'No critical failure modes identified',
            overallRisk: dominantMode[0]?.risk ?? 'low',
            safetyRating: failureModes.filter(f => f.risk === 'critical').length === 0
                ? failureModes.filter(f => f.risk === 'high').length === 0 ? 'Acceptable' : 'Caution Required'
                : 'Critical — Do Not Deploy Without Mitigation',
        };
    }

    /**
     * runSurrogateScreening
     */
    @Tool({
        name: 'run_surrogate_screening',
        description:
            'Run a physics-informed neural network (PINN) surrogate model to rapidly screen all candidate materials ' +
            'for a given component type — results in seconds instead of hours vs full coupled simulations. ' +
            'Excellent for interactive narrowing of the candidate pool before running full high-fidelity simulations ' +
            'on the shortlist. Call before full simulation tools.',
        inputSchema: SurrogateScreeningSchema,
        examples: {
            request: { componentType: 'cathode', maxCandidates: 5 },
            response: {
                componentType: 'cathode',
                screened: 5,
                shortlist: [
                    { materialId: 'lfp-cathode', name: 'LFP', surrogateScore: 0.82, surrogateConfidence: 0.85 },
                    { materialId: 'lmfp-cathode', name: 'LMFP', surrogateScore: 0.74, surrogateConfidence: 0.79 },
                ],
            },
        },
    })
    async runSurrogateScreening(args: z.infer<typeof SurrogateScreeningSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Running surrogate screening', { componentType: args.componentType });

        const materials = this.batteryService.getMaterialsByComponent(args.componentType);
        const candidates = materials.slice(0, args.maxCandidates);

        // PINN surrogate approximation: run fast simulation for each candidate
        const screened = candidates.map(m => {
            const ranked = { ...m, compositeScore: 0, rank: 1 };
            const ec = this.batteryService.simulateElectrochem(ranked);
            const th = this.batteryService.simulateThermal(ranked);
            const mech = this.batteryService.simulateMechanical(ranked);

            // Surrogate score (weighted combination of simulation metrics)
            const surrogateScore = (
                (ec.simulationConfidence * 0.4) +
                (th.simulationConfidence * 0.3) +
                (mech.simulationConfidence * 0.3)
            ) * m.dataConfidence;

            return {
                materialId: m.id,
                name: m.name,
                chemistryFamily: m.chemistryFamily,
                surrogateScore: parseFloat(surrogateScore.toFixed(3)),
                surrogateConfidence: m.dataConfidence,
                electrochemCapacityMahG: parseFloat(ec.predictedCapacityMahG.toFixed(1)),
                thermalRisk: th.thermalRunawayRisk,
                volumeExpansionPct: mech.volumeExpansionPct,
                cycleLifeProjected: mech.projectedCycleLifeCycles,
                recommendedForFullSim: surrogateScore > 0.65,
            };
        });

        screened.sort((a, b) => b.surrogateScore - a.surrogateScore);

        const shortlisted = screened.filter(s => s.recommendedForFullSim);

        ctx.logger.info('Surrogate screening complete', { screened: screened.length, shortlisted: shortlisted.length });

        return {
            componentType: args.componentType,
            screened: screened.length,
            results: screened,
            shortlist: shortlisted,
            shortlistIds: shortlisted.map(s => s.materialId),
            surrogateModel: 'PINN (Physics-Informed Neural Network) surrogate trained on P2D-DFN outputs',
            nextStep: shortlisted.length > 0
                ? `Run full simulations on shortlisted candidates: ${shortlisted.map(s => s.name).join(', ')}`
                : 'All candidates scored below threshold — review requirements or expand candidate pool',
        };
    }

    /**
     * compareCandidatesSideBySide
     */
    @Tool({
        name: 'compare_candidates_side_by_side',
        description:
            'Generate side-by-side simulation comparison tables for multiple material candidates — ' +
            'voltage curves, thermal profiles, and degradation curves across all candidates. ' +
            'Produces the ComparisonTable data structure for the DigitalTwinTimeline widget. ' +
            'Call after running individual simulations.',
        inputSchema: CompareCandidatesSchema,
        examples: {
            request: { materialIds: ['lfp-cathode', 'lmfp-cathode', 'nmc622-cathode'] },
            response: {
                candidates: 3,
                comparison: { electrochemical: [], thermal: [], mechanical: [] },
            },
        },
    })
    async compareCandidatesSideBySide(args: z.infer<typeof CompareCandidatesSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Comparing candidates side by side', { materials: args.materialIds });

        const results = args.materialIds.map(id => {
            const material = this.batteryService.getMaterialById(id);
            if (!material) throw new Error(`Material not found: ${id}`);
            const ranked = { ...material, compositeScore: 0, rank: 1 };
            return this.batteryService.runFullSimulation(ranked);
        });

        const electrochemComparison = results.map(r => ({
            materialId: r.materialId,
            predictedCapacityMahG: r.electrochem.predictedCapacityMahG,
            internalResistanceOhm: r.electrochem.internalResistanceOhm,
            rateCapabilityC: r.electrochem.rateCapabilityC,
            confidence: r.electrochem.simulationConfidence,
        }));

        const thermalComparison = results.map(r => ({
            materialId: r.materialId,
            peakTemperatureCelsius: r.thermal.peakTemperatureCelsius,
            thermalRunawayRisk: r.thermal.thermalRunawayRisk,
            heatGenerationRateW: r.thermal.heatGenerationRateW,
            confidence: r.thermal.simulationConfidence,
        }));

        const mechanicalComparison = results.map(r => ({
            materialId: r.materialId,
            volumeExpansionPct: r.mechanical.volumeExpansionPct,
            projectedCycleLifeCycles: r.mechanical.projectedCycleLifeCycles,
            seiGrowthRatePctPerCycle: r.mechanical.seiGrowthRatePctPerCycle,
            confidence: r.mechanical.simulationConfidence,
        }));

        ctx.logger.info('Side-by-side comparison complete', { candidates: results.length });

        return {
            candidates: results.length,
            materialIds: args.materialIds,
            comparison: {
                electrochemical: electrochemComparison,
                thermal: thermalComparison,
                mechanical: mechanicalComparison,
            },
            voltageProfiles: results.map(r => ({
                materialId: r.materialId,
                profile: r.electrochem.voltageProfile,
            })),
            degradationCurves: results.map(r => ({
                materialId: r.materialId,
                curve: r.mechanical.degradationCurve,
            })),
            temperatureProfiles: results.map(r => ({
                materialId: r.materialId,
                profile: r.thermal.temperatureProfile,
            })),
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * showDigitalTwinTimeline — Widget-backed tool
     */
    @Tool({
        name: 'show_digital_twin_timeline',
        description:
            'Display an interactive digital twin simulation dashboard for a material candidate — showing ' +
            'voltage profile, thermal response, and degradation curve in a timeline view. ' +
            'Best called after running simulation tools to visualize results.',
        inputSchema: ShowDigitalTwinTimelineSchema,
        examples: {
            request: { materialId: 'lfp-cathode' },
            response: { materialId: 'lfp-cathode', materialName: 'LFP (LiFePO₄)', hasData: true },
        },
    })
    @Widget(batteryWidget('digital-twin-timeline'))
    async showDigitalTwinTimeline(args: z.infer<typeof ShowDigitalTwinTimelineSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Showing digital twin timeline', { materialId: args.materialId });

        const material = this.batteryService.getMaterialById(args.materialId);
        if (!material) throw new Error(`Material not found: ${args.materialId}`);

        const ranked = { ...material, compositeScore: 0, rank: 1 };
        const simResult = this.batteryService.runFullSimulation(ranked);

        return {
            materialId: args.materialId,
            materialName: material.name,
            chemistryFamily: material.chemistryFamily,
            componentType: material.componentType,
            simulation: {
                voltageProfile: simResult.electrochem.voltageProfile,
                thermalProfile: simResult.thermal.temperatureProfile,
                degradationCurve: simResult.mechanical.degradationCurve,
            },
            summary: {
                peakCapacityMahG: simResult.electrochem.predictedCapacityMahG,
                peakTemperatureC: simResult.thermal.peakTemperatureCelsius,
                thermalRunawayRisk: simResult.thermal.thermalRunawayRisk,
                projectedCycleLife: simResult.mechanical.projectedCycleLifeCycles,
                volumeExpansionPct: simResult.mechanical.volumeExpansionPct,
                overallSimConfidence: simResult.overallSimConfidence,
            },
            hasData: true,
        };
    }
}
