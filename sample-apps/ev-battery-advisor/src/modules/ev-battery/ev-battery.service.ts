/**
 * EV Battery Material Advisor — Core Service
 *
 * Shared service providing material database access, scoring algorithms,
 * and simulation logic. All 5 modules inject this service.
 */

import { Injectable } from '@nitrostack/core';
import {
    CANDIDATE_MATERIALS,
    getMaterialsByComponent,
    getMaterialById,
} from './ev-battery.data.js';
import type {
    MaterialMetrics,
    MaterialMetricsTarget,
    WeightedObjectives,
    RankedMaterial,
    RequirementSet,
    ParetoSet,
    SimulationResult,
    ElectrochemResult,
    ThermalResult,
    MechanicalResult,
    TradeOff,
    Risk,
    ConfidenceScore,
    FinalRanking,
} from '../../schemas/material-metrics.schema.js';

// ── Recommendation outcome log (in-memory for this demo) ────────────────────
interface OutcomeLog {
    materialId: string;
    timestamp: string;
    adopted: boolean;
    simulated: number; // simulated composite score
    actual?: number;   // actual real-world score if measured
}
const OUTCOME_LOG: OutcomeLog[] = [];

// ── Knowledge-base "new material" ingestion log ──────────────────────────────
const INGESTED_MATERIALS: Omit<RankedMaterial, 'compositeScore' | 'rank'>[] = [];

@Injectable()
export class EvBatteryService {

    // ─── Material Database ────────────────────────────────────────────────────

    /** Returns true when the user has uploaded a custom dataset. */
    hasCustomDataset(): boolean {
        return INGESTED_MATERIALS.length > 0;
    }

    /**
     * Returns the active material pool:
     * - If a custom dataset has been uploaded → use ONLY those materials.
     * - Otherwise → use the built-in CANDIDATE_MATERIALS.
     */
    getAllMaterials(): Omit<RankedMaterial, 'compositeScore' | 'rank'>[] {
        return INGESTED_MATERIALS.length > 0
            ? [...INGESTED_MATERIALS]
            : [...CANDIDATE_MATERIALS];
    }

    getMaterialsByComponent(componentType: RankedMaterial['componentType']) {
        return this.getAllMaterials().filter(m => m.componentType === componentType);
    }

    getMaterialById(id: string) {
        return this.getAllMaterials().find(m => m.id === id);
    }

    // ─── Requirement Parsing ──────────────────────────────────────────────────

    /**
     * Parse free-text EV requirement into a structured RequirementSet.
     * Uses rule-based NLP mapping (production: replace with LLM call).
     */
    parseRequirementText(rawInput: string): RequirementSet {
        const input = rawInput.toLowerCase();

        const req: RequirementSet = {
            rawInput,
            vehicleClass: 'passenger-car',
        };

        // Vehicle class detection
        if (input.includes('truck') || input.includes('commercial') || input.includes('van')) {
            req.vehicleClass = 'commercial';
        } else if (input.includes('motorcycle') || input.includes('scooter') || input.includes('2-wheel') || input.includes('two-wheel')) {
            req.vehicleClass = '2-wheeler';
        } else if (input.includes('sport') || input.includes('performance') || input.includes('supercar')) {
            req.vehicleClass = 'performance';
        }

        // Range extraction (e.g. "400 km", "300 miles")
        const rangeKmMatch = rawInput.match(/(\d+)\s*km/i);
        const rangeMiMatch = rawInput.match(/(\d+)\s*mi(?:les?)?/i);
        if (rangeKmMatch) req.targetRangeKm = parseInt(rangeKmMatch[1]);
        else if (rangeMiMatch) req.targetRangeKm = Math.round(parseInt(rangeMiMatch[1]) * 1.609);

        // Fast charge (e.g. "20 min", "30 minutes")
        const fcMatch = rawInput.match(/(\d+)\s*min(?:utes?)?/i);
        if (fcMatch && parseInt(fcMatch[1]) < 120) {
            req.fastChargeTargetMinutes = parseInt(fcMatch[1]);
        }

        // Budget (e.g. "$80/kWh", "100 per kWh", "budget under $90")
        const budgetMatch = rawInput.match(/\$?(\d+)\s*(?:\/?\s*kwh|per\s+kwh)/i);
        if (budgetMatch) {
            req.budgetPerKWh = parseInt(budgetMatch[1]);
        } else if (input.includes('ignore budget') || input.includes('money is no object')) {
            req.budgetPerKWh = 9999; // Effectively unlimited
        }

        // Climate
        if (input.includes('arctic') || input.includes('extreme cold') || input.includes('siberia')) {
            req.climateZone = 'extreme-cold';
        } else if (input.includes('cold') || input.includes('nordic') || input.includes('northern') || input.includes('winter')) {
            req.climateZone = 'cold';
        } else if (input.includes('tropical') || input.includes('hot') || input.includes('desert') || input.includes('india') || input.includes('southeast')) {
            req.climateZone = 'tropical';
        } else {
            req.climateZone = 'temperate';
        }

        // Chemistry preference
        if (input.includes('lfp')) req.preferredChemistryFamily = 'LFP';
        else if (input.includes('lmfp')) req.preferredChemistryFamily = 'LMFP';
        else if (input.includes('nmc')) req.preferredChemistryFamily = 'NMC';
        else if (input.includes('nca')) req.preferredChemistryFamily = 'NCA';
        else if (input.includes('solid') && input.includes('state')) req.preferredChemistryFamily = 'Solid-State';

        // Pack form factor
        if (input.includes('cylindrical') || input.includes('18650') || input.includes('21700')) req.packFormFactor = 'cylindrical';
        else if (input.includes('prismatic') || input.includes('blade')) req.packFormFactor = 'prismatic';
        else if (input.includes('pouch')) req.packFormFactor = 'pouch';
        else req.packFormFactor = 'any';

        // Priorities
        if (input.includes('sustainab') || input.includes('green') || input.includes('carbon') || input.includes('eco')) {
            req.prioritizeSustainability = true;
        }
        if (input.includes('safe') || input.includes('safety')) {
            req.prioritizeSafetyMargin = true;
        }

        // Certifications
        const certs: RequirementSet['requiredCertifications'] = [];
        if (input.includes('un38.3') || input.includes('un 38')) certs.push('un383');
        if (input.includes('reach')) certs.push('reach');
        if (input.includes('eu battery') || input.includes('battery passport')) certs.push('eu-battery-regulation');
        if (certs.length) req.requiredCertifications = certs;

        return req;
    }

    /**
     * Build MaterialMetricsTarget from a RequirementSet using domain ontology mapping.
     */
    buildMetricsTarget(req: RequirementSet): MaterialMetricsTarget {
        const target: MaterialMetricsTarget = {};

        // Range → energy density requirement
        if (req.targetRangeKm) {
            // ~200 Wh/km is typical for passenger EVs; weight and form factor dependent
            const requiredWh = req.targetRangeKm * 200;
            const packWeightKg = req.vehicleClass === 'commercial' ? 700 : req.vehicleClass === '2-wheeler' ? 40 : 400;
            target.gravimetricEnergyDensity = { min: requiredWh / packWeightKg, weight: 0.25 };
        }

        // Fast charge → C-rate
        if (req.fastChargeTargetMinutes) {
            // 10-80% in N minutes → ~0.7 / (N/60) C rate
            const cRate = (0.7 / (req.fastChargeTargetMinutes / 60));
            target.cRateCapability = { min: cRate, weight: 0.2 };
            // Fast charge also requires good ionic conductivity
            target.ionicConductivity = { min: 1e-4, weight: 0.1 };
        }

        // Budget → cost constraint
        if (req.budgetPerKWh) {
            target.materialCostPerKWh = { max: req.budgetPerKWh * 0.5, weight: 0.15 }; // material ~50% of pack cost
        }

        // Climate → low-temperature requirement
        if (req.climateZone === 'cold' || req.climateZone === 'extreme-cold') {
            target.operatingTempRangeMin = { max: req.climateZone === 'extreme-cold' ? -40 : -30, weight: 0.1 };
            target.ionicConductivity = { ...(target.ionicConductivity || {}), min: 5e-4, weight: 0.15 };
        }

        // Sustainability priority
        if (req.prioritizeSustainability) {
            target.carbonFootprint = { max: 50, weight: 0.15 };
            target.recyclability = { min: 70, weight: 0.1 };
            target.criticalMineralDependency = { max: 4, weight: 0.1 };
        }
        
        // Maximum performance / unlimited budget
        if (req.budgetPerKWh === 9999) {
             target.materialCostPerKWh = undefined; // Remove cost constraint entirely
        }

        // Safety priority
        if (req.prioritizeSafetyMargin) {
            target.thermalRunawayOnsetTemp = { min: 200, weight: 0.2 };
        }
        
        if (req.preferredChemistryFamily) {
            target.preferredChemistryFamily = req.preferredChemistryFamily;
        }

        return target;
    }

    /**
     * Derive AHP-style objective weights from a RequirementSet.
     */
    deriveWeights(req: RequirementSet): WeightedObjectives {
        let weights: WeightedObjectives = {
            energyDensity: 0.25,
            cost: 0.20,
            cycleLife: 0.15,
            safety: 0.15,
            sustainability: 0.10,
            supplyChainRisk: 0.07,
            fastChargeCapability: 0.05,
            lowTemperaturePerformance: 0.03,
        };

        // Adjust for vehicle class
        if (req.vehicleClass === 'performance') {
            weights.energyDensity = 0.50; // Massively boost energy density
            weights.fastChargeCapability = 0.20;
            weights.cycleLife = 0.05; // Supercars don't need 3000 cycles
            weights.safety = 0.10;
            weights.cost = 0.00; // Ignore cost
        } else if (req.vehicleClass === 'commercial') {
            weights.cycleLife = 0.25;
            weights.cost = 0.25;
            weights.energyDensity = 0.15;
        } else if (req.vehicleClass === '2-wheeler') {
            weights.cost = 0.30;
            weights.energyDensity = 0.20;
            weights.safety = 0.20;
        }

        // Override for explicit priorities
        if (req.prioritizeSustainability) {
            weights.sustainability = 0.20;
            weights.supplyChainRisk = 0.12;
            weights.cost -= 0.07;
            weights.energyDensity -= 0.05;
        }
        if (req.prioritizeSafetyMargin) {
            weights.safety = 0.25;
            weights.energyDensity -= 0.05;
            weights.cost -= 0.05;
        }
        if (req.fastChargeTargetMinutes && req.fastChargeTargetMinutes <= 20) {
            weights.fastChargeCapability = 0.15;
            weights.energyDensity -= 0.05;
            weights.cost -= 0.05;
        }
        if (req.climateZone === 'cold' || req.climateZone === 'extreme-cold') {
            weights.lowTemperaturePerformance = 0.12;
            weights.safety -= 0.05;
        }

        // Normalize to sum = 1
        const sum = Object.values(weights).reduce((a, b) => a + b, 0);
        for (const k of Object.keys(weights) as (keyof WeightedObjectives)[]) {
            weights[k] = parseFloat((weights[k] / sum).toFixed(4));
        }

        return weights;
    }

    // ─── Scoring & Ranking ────────────────────────────────────────────────────

    /**
     * Score a single material against target + weights (0-100).
     */
    scoreMaterial(
        material: typeof CANDIDATE_MATERIALS[0],
        target: MaterialMetricsTarget,
        weights: WeightedObjectives,
    ): number {
        const m = material.metrics;
        let score = 0;

        // Energy density (0-1 → weighted)
        const edScore = Math.min(m.gravimetricEnergyDensity / 400, 1.0);
        score += edScore * weights.energyDensity * 100;

        // Cost (inverted — lower is better)
        const costScore = target.materialCostPerKWh?.max
            ? Math.max(0, 1 - (m.materialCostPerKWh - 0) / (target.materialCostPerKWh.max * 2 - 0))
            : Math.max(0, 1 - m.materialCostPerKWh / 200);
        score += costScore * weights.cost * 100;

        // Cycle life
        const clScore = Math.min(m.cycleLifeTo80SOH / 4000, 1.0);
        score += clScore * weights.cycleLife * 100;

        // Safety (thermal runaway onset temp, higher = safer)
        const safetyScore = Math.min(m.thermalRunawayOnsetTemp / 900, 1.0);
        score += safetyScore * weights.safety * 100;

        // Sustainability (composite of carbon footprint + recyclability)
        const sustainScore = (
            (1 - Math.min(m.carbonFootprint / 100, 1)) * 0.5 +
            (m.recyclability / 100) * 0.5
        );
        score += sustainScore * weights.sustainability * 100;

        // Supply chain (inverted — lower risk is better)
        const scScore = 1 - m.criticalMineralDependency / 10;
        score += scScore * weights.supplyChainRisk * 100;

        // Fast charge (C-rate)
        const fcScore = Math.min(m.cRateCapability / 5.0, 1.0);
        score += fcScore * weights.fastChargeCapability * 100;

        // Low temperature performance (based on min operating temp and ionic conductivity)
        const ltScore = Math.min(Math.max(0, (Math.abs(m.operatingTempRange.min) - 10) / 30), 1.0);
        score += ltScore * weights.lowTemperaturePerformance * 100;
        
        // Explicit Chemistry Preference Bonus
        if (target.preferredChemistryFamily && material.chemistryFamily === target.preferredChemistryFamily) {
            score += 20; // Huge flat bonus if it perfectly matches the user's preferred chemistry
        }

        // Data confidence multiplier
        score *= material.dataConfidence;

        return Math.round(Math.min(score, 100));
    }

    /**
     * Rank all candidates for a given component type.
     */
    rankCandidates(
        componentType: RankedMaterial['componentType'],
        target: MaterialMetricsTarget,
        weights: WeightedObjectives,
    ): RankedMaterial[] {
        const candidates = this.getMaterialsByComponent(componentType);

        const scored = candidates.map(m => {
            const compositeScore = this.scoreMaterial(m, target, weights);
            return {
                ...m,
                compositeScore,
                rank: 0,
                strengths: m.strengths,
                weaknesses: m.weaknesses,
            };
        });

        scored.sort((a, b) => b.compositeScore - a.compositeScore);
        return scored.map((m, i) => ({ ...m, rank: i + 1 }));
    }

    /**
     * NSGA-II-style Pareto dominance check (simplified 3-objective: energy, cost, cycle life).
     */
    buildParetoSet(candidates: RankedMaterial[]): ParetoSet {
        const dims = ['energyDensity', 'cost', 'cycleLife'];

        const getValue = (m: RankedMaterial, dim: string): number => {
            switch (dim) {
                case 'energyDensity': return m.metrics.gravimetricEnergyDensity;
                case 'cost': return -m.metrics.materialCostPerKWh; // inverted (lower = better)
                case 'cycleLife': return m.metrics.cycleLifeTo80SOH;
                default: return 0;
            }
        };

        const dominates = (a: RankedMaterial, b: RankedMaterial): boolean => {
            // a dominates b iff a is ≥ b on all dims and > b on at least one
            let betterOnOne = false;
            for (const d of dims) {
                const av = getValue(a, d);
                const bv = getValue(b, d);
                if (av < bv) return false;
                if (av > bv) betterOnOne = true;
            }
            return betterOnOne;
        };

        const paretoFront: RankedMaterial[] = [];
        const dominated: RankedMaterial[] = [];

        for (const candidate of candidates) {
            const isDominated = candidates.some(other => other.id !== candidate.id && dominates(other, candidate));
            if (isDominated) dominated.push(candidate);
            else paretoFront.push(candidate);
        }

        return {
            paretoFront,
            dominatedCandidates: dominated,
            objectiveDimensions: dims,
            generatedAt: new Date().toISOString(),
        };
    }

    // ─── Digital Twin Simulation ──────────────────────────────────────────────

    /**
     * Simulate electrochemical performance (P2D / DFN approximation).
     */
    simulateElectrochem(material: RankedMaterial): ElectrochemResult {
        const m = material.metrics;

        // Derive nominal voltage from chemistry proxies:
        //   High thermalRunawayOnsetTemp (>260°C) → likely LFP-type → lower, flat ~3.2-3.4V
        //   Medium (~150-260°C) → NMC/LMFP-type → ~3.5-3.8V
        //   Low (<150°C) → high-energy NCA/high-Ni → ~3.8-4.1V
        const nominalV = m.thermalRunawayOnsetTemp > 260
            ? 3.25  // LFP-like
            : m.thermalRunawayOnsetTemp > 180
                ? 3.65  // NMC/LMFP-like
                : 3.95; // High-Ni NCA-like

        // Plateau flatness: LFP is very flat (high flatness), NMC is more sloped
        const flatness = m.thermalRunawayOnsetTemp > 260 ? 0.08 : 0.35;

        // End-of-discharge droop: controlled by internal resistance (ionic conductivity proxy)
        const endDroop = 1 / (m.ionicConductivity * 5000 + 1) * 0.6;

        // Voltage range: span between max voltage and cut-off, scaled by C-rate capability
        const voltageSpan = 0.4 + m.cRateCapability * 0.04;

        // Generate material-specific discharge curve
        const points = 25;
        const voltageProfile = Array.from({ length: points }, (_, i) => {
            const cap = (i / (points - 1)) * m.specificCapacity;
            const soc = 1 - (i / (points - 1));
            // Flat plateau in the middle, drooping ends
            const plateau = nominalV - flatness * Math.pow(soc - 0.5, 2);
            const droop = endDroop * Math.pow(1 - soc, 2.5);
            const voltage = Math.max(nominalV - voltageSpan, plateau - droop);
            return { capacity: parseFloat(cap.toFixed(2)), voltage: parseFloat(voltage.toFixed(3)) };
        });

        const confidence = material.dataConfidence * 0.9;

        return {
            materialId: material.id,
            modelType: 'p2d-dfn',
            voltageProfile,
            predictedCapacityMahG: m.specificCapacity * m.coulombicEfficiency / 100,
            internalResistanceOhm: 1 / (m.ionicConductivity * 1000 + 1) * 0.05,
            rateCapabilityC: m.cRateCapability,
            simulationConfidence: parseFloat(confidence.toFixed(3)),
        };
    }

    /**
     * Simulate thermal response under fast-charge conditions.
     */
    simulateThermal(material: RankedMaterial): ThermalResult {
        const m = material.metrics;
        const heatRate = (m.cRateCapability * 2) / (m.thermalRunawayOnsetTemp / 100);

        let trRisk: ThermalResult['thermalRunawayRisk'];
        if (m.thermalRunawayOnsetTemp > 250) trRisk = 'low';
        else if (m.thermalRunawayOnsetTemp > 180) trRisk = 'moderate';
        else if (m.thermalRunawayOnsetTemp > 140) trRisk = 'high';
        else trRisk = 'critical';

        const peakTemp = 25 + heatRate * 15; // simplified thermal model

        const points = 15;
        const temperatureProfile = Array.from({ length: points }, (_, i) => ({
            time: i * 60,
            temperature: parseFloat((25 + (peakTemp - 25) * (1 - Math.exp(-i / 5))).toFixed(1)),
        }));

        return {
            materialId: material.id,
            peakTemperatureCelsius: parseFloat(peakTemp.toFixed(1)),
            heatGenerationRateW: parseFloat(heatRate.toFixed(2)),
            thermalRunawayRisk: trRisk,
            temperatureProfile,
            simulationConfidence: parseFloat((material.dataConfidence * 0.85).toFixed(3)),
        };
    }

    /**
     * Simulate mechanical degradation (volume expansion + SEI growth).
     */
    simulateMechanical(material: RankedMaterial): MechanicalResult {
        const m = material.metrics;

        // SEI growth rate approximation: higher expansion → faster SEI
        const seiGrowthRate = (m.volumeExpansion / 100) * 0.05 + 0.001;

        // Degradation curve
        const cycles = Math.min(m.cycleLifeTo80SOH, 2000);
        const points = 20;
        const degradationCurve = Array.from({ length: points }, (_, i) => {
            const cycle = Math.round((i / (points - 1)) * cycles);
            const decay = Math.exp(-seiGrowthRate * cycle / 100);
            const capacityRetention = 100 * (0.8 + 0.2 * decay);
            return {
                cycle,
                capacityRetentionPct: parseFloat(Math.min(100, capacityRetention).toFixed(1)),
            };
        });

        return {
            materialId: material.id,
            volumeExpansionPct: m.volumeExpansion,
            stressAtElectrodeMPa: m.volumeExpansion * 2.5, // simplified linear model
            projectedCycleLifeCycles: m.cycleLifeTo80SOH,
            seiGrowthRatePctPerCycle: parseFloat(seiGrowthRate.toFixed(4)),
            degradationCurve,
            simulationConfidence: parseFloat((material.dataConfidence * 0.8).toFixed(3)),
        };
    }

    /**
     * Full simulation combining electrochem + thermal + mechanical.
     */
    runFullSimulation(material: RankedMaterial): SimulationResult {
        const electrochem = this.simulateElectrochem(material);
        const thermal = this.simulateThermal(material);
        const mechanical = this.simulateMechanical(material);

        const overallConf = (electrochem.simulationConfidence + thermal.simulationConfidence + mechanical.simulationConfidence) / 3;

        return {
            materialId: material.id,
            electrochem,
            thermal,
            mechanical,
            overallSimConfidence: parseFloat(overallConf.toFixed(3)),
        };
    }

    // ─── TOPSIS Decision Making ───────────────────────────────────────────────

    computeTOPSIS(candidates: RankedMaterial[], weights: WeightedObjectives): FinalRanking {
        if (candidates.length === 0) {
            throw new Error('No candidates provided for TOPSIS ranking');
        }

        // Decision matrix: [material][criterion]
        const criteria = [
            { key: 'energyDensity', benefit: true, weight: weights.energyDensity },
            { key: 'cost', benefit: false, weight: weights.cost },
            { key: 'cycleLife', benefit: true, weight: weights.cycleLife },
            { key: 'safety', benefit: true, weight: weights.safety },
            { key: 'sustainability', benefit: true, weight: weights.sustainability },
            { key: 'supplyChain', benefit: false, weight: weights.supplyChainRisk },
        ];

        const getValue = (m: RankedMaterial, key: string): number => {
            switch (key) {
                case 'energyDensity': return m.metrics.gravimetricEnergyDensity;
                case 'cost': return m.metrics.materialCostPerKWh;
                case 'cycleLife': return m.metrics.cycleLifeTo80SOH;
                case 'safety': return m.metrics.thermalRunawayOnsetTemp;
                case 'sustainability': return m.metrics.recyclability - m.metrics.criticalMineralDependency * 5;
                case 'supplyChain': return m.metrics.criticalMineralDependency;
                default: return 0;
            }
        };

        // Normalize
        const norms = criteria.map(c => {
            const vals = candidates.map(m => getValue(m, c.key));
            return Math.sqrt(vals.reduce((s, v) => s + v * v, 0)) || 1;
        });

        const normalized = candidates.map(m =>
            criteria.map((c, ci) => getValue(m, c.key) / norms[ci])
        );

        // Weighted normalized
        const weighted = normalized.map(row =>
            row.map((val, ci) => val * criteria[ci].weight)
        );

        // Ideal and negative-ideal solutions
        const ideal = criteria.map((c, ci) => {
            const vals = weighted.map(row => row[ci]);
            return c.benefit ? Math.max(...vals) : Math.min(...vals);
        });
        const negIdeal = criteria.map((c, ci) => {
            const vals = weighted.map(row => row[ci]);
            return c.benefit ? Math.min(...vals) : Math.max(...vals);
        });

        // Distances
        const results = candidates.map((m, mi) => {
            const dPos = Math.sqrt(weighted[mi].reduce((s, v, ci) => s + (v - ideal[ci]) ** 2, 0));
            const dNeg = Math.sqrt(weighted[mi].reduce((s, v, ci) => s + (v - negIdeal[ci]) ** 2, 0));
            const topsisScore = dNeg / (dPos + dNeg || 1);
            return { material: m, topsisScore, idealDistance: dPos, negativeIdealDistance: dNeg };
        });

        results.sort((a, b) => b.topsisScore - a.topsisScore);

        return {
            topsisRanking: results.map((r, i) => ({
                rank: i + 1,
                material: r.material,
                topsisScore: parseFloat(r.topsisScore.toFixed(4)),
                idealDistance: parseFloat(r.idealDistance.toFixed(4)),
                negativeIdealDistance: parseFloat(r.negativeIdealDistance.toFixed(4)),
            })),
            topRecommendation: results[0].material,
            weights,
            generatedAt: new Date().toISOString(),
        };
    }

    // ─── Trade-offs & Risks ───────────────────────────────────────────────────

    identifyTradeOffs(ranked: RankedMaterial[]): TradeOff[] {
        const tradeOffs: TradeOff[] = [];
        const top = ranked.slice(0, Math.min(3, ranked.length));

        for (let i = 0; i < top.length - 1; i++) {
            const a = top[i];
            const b = top[i + 1];

            // Energy vs Cost trade-off
            const energyDiff = ((a.metrics.gravimetricEnergyDensity - b.metrics.gravimetricEnergyDensity) /
                (b.metrics.gravimetricEnergyDensity || 1)) * 100;
            const costDiff = ((a.metrics.materialCostPerKWh - b.metrics.materialCostPerKWh) /
                (b.metrics.materialCostPerKWh || 1)) * 100;

            if (Math.abs(energyDiff) > 5 && Math.abs(costDiff) > 5) {
                tradeOffs.push({
                    materialAId: a.id,
                    materialAName: a.name,
                    materialBId: b.id,
                    materialBName: b.name,
                    dimension: 'Energy Density vs Cost',
                    narrative: energyDiff > 0
                        ? `${a.name} delivers ${Math.abs(energyDiff).toFixed(0)}% more energy density than ${b.name} but costs ${Math.abs(costDiff).toFixed(0)}% ${costDiff > 0 ? 'more' : 'less'} per kWh.`
                        : `${b.name} delivers ${Math.abs(energyDiff).toFixed(0)}% more energy density at ${Math.abs(costDiff).toFixed(0)}% ${costDiff < 0 ? 'lower' : 'higher'} cost.`,
                    aAdvantagePercent: parseFloat(energyDiff.toFixed(1)),
                });
            }

            // Cycle life vs thermal safety trade-off
            const cycleDiff = ((a.metrics.cycleLifeTo80SOH - b.metrics.cycleLifeTo80SOH) /
                (b.metrics.cycleLifeTo80SOH || 1)) * 100;
            const thermalDiff = ((a.metrics.thermalRunawayOnsetTemp - b.metrics.thermalRunawayOnsetTemp) /
                (b.metrics.thermalRunawayOnsetTemp || 1)) * 100;

            if (Math.abs(cycleDiff) > 10 || Math.abs(thermalDiff) > 10) {
                tradeOffs.push({
                    materialAId: a.id,
                    materialAName: a.name,
                    materialBId: b.id,
                    materialBName: b.name,
                    dimension: 'Cycle Life vs Thermal Safety',
                    narrative: `${a.name} achieves ${a.metrics.cycleLifeTo80SOH} cycles vs ${b.name}'s ${b.metrics.cycleLifeTo80SOH} cycles. Thermal runaway onset: ${a.name} at ${a.metrics.thermalRunawayOnsetTemp}°C vs ${b.name} at ${b.metrics.thermalRunawayOnsetTemp}°C.`,
                    aAdvantagePercent: parseFloat(cycleDiff.toFixed(1)),
                });
            }
        }

        return tradeOffs;
    }

    identifyRisks(candidates: RankedMaterial[], simResults?: SimulationResult[]): Risk[] {
        const risks: Risk[] = [];

        for (const m of candidates) {
            // Thermal risk
            if (m.metrics.thermalRunawayOnsetTemp < 180) {
                risks.push({
                    riskType: 'thermal',
                    severity: m.metrics.thermalRunawayOnsetTemp < 140 ? 'critical' : 'high',
                    materialId: m.id,
                    description: `${m.name} has a thermal runaway onset at ${m.metrics.thermalRunawayOnsetTemp}°C — requires robust BMS and cooling system.`,
                    mitigation: 'Active liquid cooling, conservative charge voltage limits, multi-layer BMS protection.',
                });
            }

            // Supply chain risk
            if (m.metrics.criticalMineralDependency > 7) {
                risks.push({
                    riskType: 'supply-chain',
                    severity: 'high',
                    materialId: m.id,
                    description: `${m.name} has critical mineral dependency index ${m.metrics.criticalMineralDependency}/10 — high cobalt/nickel exposure.`,
                    mitigation: 'Dual-source supply agreements, consider lower-nickel alternatives for volume programs.',
                });
            }

            // Regulatory risk
            if (!m.metrics.regulatoryCompliance.euBatteryRegulation) {
                risks.push({
                    riskType: 'regulatory',
                    severity: 'moderate',
                    materialId: m.id,
                    description: `${m.name} is not yet EU Battery Regulation compliant — blocks EU market access.`,
                    mitigation: 'Engage battery passport audit, upstream supply chain disclosure documentation.',
                });
            }

            // Mechanical risk
            if (m.metrics.volumeExpansion > 20) {
                risks.push({
                    riskType: 'mechanical',
                    severity: m.metrics.volumeExpansion > 100 ? 'critical' : 'high',
                    materialId: m.id,
                    description: `${m.name} exhibits ${m.metrics.volumeExpansion}% volume expansion — risks electrode cracking and separator puncture over long cycles.`,
                    mitigation: 'Use elastic binder systems, pre-compression in cell design, limit silicon content blends.',
                });
            }

            // Data quality risk
            if (m.dataConfidence < 0.75) {
                risks.push({
                    riskType: 'data-quality',
                    severity: 'moderate',
                    materialId: m.id,
                    description: `${m.name} has lower data confidence (${(m.dataConfidence * 100).toFixed(0)}%) — fewer validated datasets available.`,
                    mitigation: 'Physical coin-cell validation recommended before scale-up.',
                });
            }
        }

        return risks;
    }

    computeConfidenceScore(ranking: FinalRanking, simResults: SimulationResult[]): ConfidenceScore {
        const topMaterial = ranking.topRecommendation;
        const kbDataRecency = topMaterial.dataConfidence;

        const simConf = simResults.length > 0
            ? simResults.reduce((s, r) => s + r.overallSimConfidence, 0) / simResults.length
            : 0.5;

        // Historical accuracy: no real history in demo → 0.75 baseline
        const historicalAccuracy = 0.75;

        const overall = (kbDataRecency * 0.4 + simConf * 0.4 + historicalAccuracy * 0.2);

        return {
            overall: parseFloat(overall.toFixed(3)),
            kbDataRecency: parseFloat(kbDataRecency.toFixed(3)),
            simulationFidelity: parseFloat(simConf.toFixed(3)),
            historicalAccuracy: parseFloat(historicalAccuracy.toFixed(3)),
            breakdown: `KB data recency: ${(kbDataRecency * 100).toFixed(0)}% (weight 40%) | Sim fidelity: ${(simConf * 100).toFixed(0)}% (weight 40%) | Historical track record: ${(historicalAccuracy * 100).toFixed(0)}% (weight 20%) → Overall: ${(overall * 100).toFixed(0)}%.`,
        };
    }

    // ─── Knowledge Base / Custom Materials ────────────────────────────────────

    ingestCustomMaterial(material: Omit<RankedMaterial, 'compositeScore' | 'rank'>): void {
        INGESTED_MATERIALS.push(material);
    }

    /** Clear all uploaded materials — reverts to built-in CANDIDATE_MATERIALS. */
    clearIngestedMaterials(): void {
        INGESTED_MATERIALS.length = 0;
    }

    ingestMaterial(source: string, name: string, summary: string) {
        return {
            id: `ingested-${Date.now()}`,
            name,
            source,
            summary,
            status: 'queued-for-validation',
            validated: false,
            ingestedAt: new Date().toISOString()
        };
    }

    getIngestedMaterials() {
        return [...INGESTED_MATERIALS];
    }

    logOutcome(materialId: string, adopted: boolean, simulatedScore: number, actualScore?: number): void {
        OUTCOME_LOG.push({
            materialId,
            timestamp: new Date().toISOString(),
            adopted,
            simulated: simulatedScore,
            actual: actualScore,
        });
    }

    getOutcomeLogs(): OutcomeLog[] {
        return [...OUTCOME_LOG];
    }

    queryCompatibility(query: string): { materialId: string; name: string; reason: string }[] {
        const q = query.toLowerCase();
        return this.getAllMaterials()
            .filter(m => {
                if (q.includes('lfp') && m.chemistryFamily === 'LFP') return true;
                if (q.includes('solid state') || q.includes('solid-state')) return m.chemistryFamily === 'Solid-State';
                if (q.includes('low cost') || q.includes('affordable')) return m.metrics.materialCostPerKWh < 20;
                if (q.includes('safe') || q.includes('thermal')) return m.metrics.thermalRunawayOnsetTemp > 200;
                if (q.includes('fast char') || q.includes('high c-rate')) return m.metrics.cRateCapability >= 3;
                if (q.includes('high energy') || q.includes('long range')) return m.metrics.gravimetricEnergyDensity > 200;
                if (q.includes('cycle life') || q.includes('longevity')) return m.metrics.cycleLifeTo80SOH >= 2000;
                if (q.includes('sustainable') || q.includes('green')) return m.metrics.criticalMineralDependency < 4;
                return false;
            })
            .map(m => ({
                materialId: m.id,
                name: m.name,
                reason: `Matched query "${query}" — ${m.strengths[0] || 'relevant material'}`,
            }));
    }
}
