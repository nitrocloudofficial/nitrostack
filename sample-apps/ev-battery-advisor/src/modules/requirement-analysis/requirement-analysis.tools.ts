/**
 * Module 1 — RequirementAnalysisModule Tools
 *
 * Converts natural-language or structured EV specs into a structured,
 * weighted constraint object the rest of the pipeline acts on.
 */

import { ToolDecorator as Tool, PromptDecorator as Prompt, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { EvBatteryService } from '../ev-battery/ev-battery.service.js';
import {
    RequirementSetSchema,
    MaterialMetricsTargetSchema,
    WeightedObjectivesSchema,
} from '../../schemas/material-metrics.schema.js';

// ─── Input Schemas ────────────────────────────────────────────────────────────

const ParseRequirementSchema = z.object({
    rawInput: z.string().min(10).describe(
        'Free-text EV requirement spec, e.g. "compact passenger EV, 400 km range, fast-charge in 20 minutes, ' +
        'budget under $90/kWh, cold-climate Nordic deployment, prioritize safety"'
    ),
});

const ClassifyConstraintsSchema = z.object({
    requirementSet: RequirementSetSchema.describe('Structured requirement set from parseRequirementSpec'),
});

const ToStructuredSchemaInputSchema = z.object({
    requirementSet: RequirementSetSchema.describe('Structured requirement set to map onto MaterialMetrics schema'),
});

const PrioritizeObjectivesSchema = z.object({
    requirementSet: RequirementSetSchema.describe('Structured requirement set for AHP weight derivation'),
});

// ─── Controller ──────────────────────────────────────────────────────────────

@Injectable({ deps: [EvBatteryService] })
export class RequirementAnalysisTools {
    constructor(private readonly batteryService: EvBatteryService) { }

    /**
     * parseRequirementSpec
     * Extracts structured EV requirements from free-text or structured input.
     */
    @Tool({
        name: 'parse_requirement_spec',
        description:
            'Parse a free-text or structured EV requirement specification into a structured RequirementSet. ' +
            'Extracts: target range, fast-charge time, climate zone, vehicle class, pack form factor, ' +
            'chemistry preferences, sustainability and safety priorities, and certification requirements. ' +
            'Use this as the FIRST step in any EV battery material selection workflow.',
        inputSchema: ParseRequirementSchema,
        examples: {
            request: {
                rawInput: 'Compact passenger EV for Nordic markets, 350 km range, 20-minute fast charge, budget $85/kWh, cold climate, prioritize safety and sustainability',
            },
            response: {
                requirementSet: {
                    vehicleClass: 'passenger-car',
                    targetRangeKm: 350,
                    fastChargeTargetMinutes: 20,
                    climateZone: 'cold',
                    budgetPerKWh: 85,
                    packFormFactor: 'any',
                    prioritizeSustainability: true,
                    prioritizeSafetyMargin: true,
                },
                parsedFields: ['vehicleClass', 'targetRangeKm', 'fastChargeTargetMinutes', 'climateZone', 'budgetPerKWh', 'prioritizeSustainability', 'prioritizeSafetyMargin'],
                confidence: 0.88,
            },
        },
    })
    async parseRequirementSpec(args: z.infer<typeof ParseRequirementSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Parsing requirement spec', { inputLength: args.rawInput.length });

        const requirementSet = this.batteryService.parseRequirementText(args.rawInput);

        const parsedFields = Object.entries(requirementSet)
            .filter(([k, v]) => v !== undefined && k !== 'rawInput')
            .map(([k]) => k);

        const confidence = Math.min(0.5 + parsedFields.length * 0.07, 0.95);

        ctx.logger.info('Requirement spec parsed', { parsedFields, confidence });

        return {
            requirementSet,
            parsedFields,
            confidence: parseFloat(confidence.toFixed(2)),
            tip: parsedFields.length < 4
                ? 'Low field coverage — consider adding: vehicle class, range, fast-charge target, climate, and budget for better recommendations.'
                : 'Requirement parsed successfully. Proceed with classify_constraints.',
        };
    }

    /**
     * classifyConstraints
     * Splits requirements into mandatory vs optional/preference constraints.
     */
    @Tool({
        name: 'classify_constraints',
        description:
            'Classify constraints from a RequirementSet into mandatory (hard) and optional (preference-based) constraints. ' +
            'Mandatory constraints include safety certifications, minimum cycle life, and regulatory compliance. ' +
            'Optional constraints include preferred chemistry families and sustainability weightings. ' +
            'Call this after parse_requirement_spec.',
        inputSchema: ClassifyConstraintsSchema,
        examples: {
            request: {
                requirementSet: {
                    vehicleClass: 'passenger-car',
                    targetRangeKm: 350,
                    fastChargeTargetMinutes: 20,
                    climateZone: 'cold',
                    budgetPerKWh: 85,
                    prioritizeSafetyMargin: true,
                },
            },
            response: {
                mandatory: [
                    { field: 'cRateCapability', description: 'Minimum C-rate for 20-min fast charge', minValue: 2.1 },
                    { field: 'operatingTempRange', description: 'Minimum cold-climate operating temperature', maxMinTemp: -30 },
                    { field: 'thermalRunawayOnsetTemp', description: 'Safety-priority: minimum thermal runaway onset', minValue: 200 },
                ],
                optional: [
                    { field: 'materialCostPerKWh', description: 'Budget target — preferred but not absolute', maxValue: 42.5 },
                    { field: 'gravimetricEnergyDensity', description: 'Range target — preferred to achieve 350 km', minValue: 175 },
                ],
            },
        },
    })
    async classifyConstraints(args: z.infer<typeof ClassifyConstraintsSchema>, ctx: ExecutionContext) {
        const { requirementSet: req } = args;
        ctx.logger.info('Classifying constraints', { vehicleClass: req.vehicleClass });

        const mandatory: { field: string; description: string; [key: string]: unknown }[] = [];
        const optional: { field: string; description: string; [key: string]: unknown }[] = [];

        // Mandatory: safety certifications
        if (req.requiredCertifications?.length) {
            mandatory.push({
                field: 'regulatoryCompliance',
                description: `Required certifications: ${req.requiredCertifications.join(', ')}`,
                certifications: req.requiredCertifications,
            });
        } else {
            mandatory.push({
                field: 'regulatoryCompliance',
                description: 'UN38.3 transport compliance is mandatory for any commercial EV battery',
                certifications: ['un383'],
            });
        }

        // Mandatory: minimum cycle life by vehicle class
        const minCycles = req.vehicleClass === 'commercial' ? 2000 : req.vehicleClass === '2-wheeler' ? 800 : 1000;
        mandatory.push({
            field: 'cycleLifeTo80SOH',
            description: `Minimum cycle life for ${req.vehicleClass} vehicle class`,
            minValue: minCycles,
        });

        // Mandatory: fast charge C-rate
        if (req.fastChargeTargetMinutes) {
            const cRate = parseFloat((0.7 / (req.fastChargeTargetMinutes / 60)).toFixed(2));
            mandatory.push({
                field: 'cRateCapability',
                description: `Fast-charge requirement: ${req.fastChargeTargetMinutes} min (10-80%) requires ≥${cRate}C`,
                minValue: cRate,
            });
        }

        // Mandatory: safety onset temp
        if (req.prioritizeSafetyMargin) {
            mandatory.push({
                field: 'thermalRunawayOnsetTemp',
                description: 'Safety-priority specification: minimum thermal runaway onset temperature',
                minValue: 200,
            });
        }

        // Mandatory: climate operating range
        if (req.climateZone === 'cold' || req.climateZone === 'extreme-cold') {
            mandatory.push({
                field: 'operatingTempRangeMin',
                description: `${req.climateZone} climate requirement: must operate at low temperatures`,
                maxMinTemp: req.climateZone === 'extreme-cold' ? -40 : -30,
            });
        }

        // Optional: budget
        if (req.budgetPerKWh) {
            optional.push({
                field: 'materialCostPerKWh',
                description: `Budget target $/kWh — preferred but not absolute hard cutoff`,
                maxValue: req.budgetPerKWh * 0.5,
            });
        }

        // Optional: range → energy density
        if (req.targetRangeKm) {
            optional.push({
                field: 'gravimetricEnergyDensity',
                description: `Range target (${req.targetRangeKm} km) maps to approximate energy density requirement`,
                minValue: Math.round(req.targetRangeKm * 0.5),
            });
        }

        // Optional: sustainability
        if (req.prioritizeSustainability) {
            optional.push({ field: 'criticalMineralDependency', description: 'Sustainability priority: low critical mineral index preferred', maxValue: 4 });
            optional.push({ field: 'recyclability', description: 'Sustainability priority: high recyclability preferred', minValue: 70 });
        }

        // Optional: chemistry preference
        if (req.preferredChemistryFamily) {
            optional.push({ field: 'chemistryFamily', description: `Preferred chemistry: ${req.preferredChemistryFamily}`, value: req.preferredChemistryFamily });
        }

        return { mandatory, optional, mandatoryCount: mandatory.length, optionalCount: optional.length };
    }

    /**
     * toStructuredSchema
     * Maps RequirementSet onto MaterialMetrics schema with JSON Schema validation.
     */
    @Tool({
        name: 'to_structured_schema',
        description:
            'Map a RequirementSet onto the MaterialMetrics schema, producing a MaterialMetricsTarget ' +
            '(structured JSON constraint object with per-metric min/max/target/weight fields). ' +
            'This target drives all downstream ranking and simulation steps. ' +
            'Call this after classify_constraints.',
        inputSchema: ToStructuredSchemaInputSchema,
        examples: {
            request: {
                requirementSet: {
                    vehicleClass: 'passenger-car',
                    targetRangeKm: 350,
                    fastChargeTargetMinutes: 20,
                    climateZone: 'cold',
                    budgetPerKWh: 85,
                },
            },
            response: {
                metricsTarget: {
                    gravimetricEnergyDensity: { min: 175, weight: 0.25 },
                    cRateCapability: { min: 2.1, weight: 0.2 },
                    ionicConductivity: { min: 0.0005, weight: 0.15 },
                    materialCostPerKWh: { max: 42.5, weight: 0.15 },
                    operatingTempRangeMin: { max: -30, weight: 0.1 },
                },
                schemaValid: true,
                fieldsCovered: 5,
            },
        },
    })
    async toStructuredSchema(args: z.infer<typeof ToStructuredSchemaInputSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Building structured metrics target', { vehicleClass: args.requirementSet.vehicleClass });

        const metricsTarget = this.batteryService.buildMetricsTarget(args.requirementSet);

        // Validate via Zod schema
        const validation = MaterialMetricsTargetSchema.safeParse(metricsTarget);
        const fieldsCovered = Object.keys(metricsTarget).filter(k => metricsTarget[k as keyof typeof metricsTarget] !== undefined).length;

        ctx.logger.info('Schema target built', { fieldsCovered, valid: validation.success });

        return {
            metricsTarget,
            schemaValid: validation.success,
            validationErrors: validation.success ? null : validation.error?.errors,
            fieldsCovered,
            uncoveredMetrics: [
                'specificCapacity', 'coulombicEfficiency', 'calendarLifeSelfDischarge',
                'volumeExpansion', 'structuralStrengthToWeight', 'carbonFootprint',
            ].filter(f => !Object.keys(metricsTarget).includes(f)),
        };
    }

    /**
     * prioritizeObjectives
     * Derive AHP-style objective weights from a RequirementSet.
     */
    @Tool({
        name: 'prioritize_objectives',
        description:
            'Resolve conflicting objectives (maximize range vs minimize cost vs maximize safety) into ' +
            'explicit numeric weights using AHP (Analytic Hierarchy Process) logic. ' +
            'Returns a WeightedObjectives object used by rank_candidate_materials and compute_topsis_ranking. ' +
            'Call this after to_structured_schema.',
        inputSchema: PrioritizeObjectivesSchema,
        examples: {
            request: {
                requirementSet: {
                    vehicleClass: 'passenger-car',
                    targetRangeKm: 350,
                    fastChargeTargetMinutes: 20,
                    climateZone: 'cold',
                    prioritizeSafetyMargin: true,
                    prioritizeSustainability: true,
                },
            },
            response: {
                weights: {
                    energyDensity: 0.18,
                    cost: 0.14,
                    cycleLife: 0.14,
                    safety: 0.22,
                    sustainability: 0.18,
                    supplyChainRisk: 0.09,
                    fastChargeCapability: 0.03,
                    lowTemperaturePerformance: 0.02,
                },
                dominantObjective: 'safety',
                rationale: 'Safety and sustainability co-dominant due to explicit user priorities. Fast-charge reduced due to cold-climate constraint weighting.',
            },
        },
    })
    async prioritizeObjectives(args: z.infer<typeof PrioritizeObjectivesSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Deriving objective weights', { vehicleClass: args.requirementSet.vehicleClass });

        const weights = this.batteryService.deriveWeights(args.requirementSet);

        // Find dominant objective
        const dominantObjective = (Object.entries(weights) as [string, number][])
            .sort((a, b) => b[1] - a[1])[0][0];

        const sum = Object.values(weights).reduce((a, b) => a + b, 0);
        const normalizedOk = Math.abs(sum - 1) < 0.01;

        // Rationale string
        let rationale = `Primary driver: ${dominantObjective} (${(weights[dominantObjective as keyof typeof weights] * 100).toFixed(0)}%).`;
        if (args.requirementSet.prioritizeSafetyMargin) rationale += ' Safety priority applied.';
        if (args.requirementSet.prioritizeSustainability) rationale += ' Sustainability priority applied.';
        if (args.requirementSet.fastChargeTargetMinutes && args.requirementSet.fastChargeTargetMinutes <= 20) {
            rationale += ' Fast-charge boosted for sub-20-minute target.';
        }
        if (args.requirementSet.climateZone === 'cold' || args.requirementSet.climateZone === 'extreme-cold') {
            rationale += ' Low-temperature performance weighted for cold climate.';
        }

        ctx.logger.info('Weights derived', { dominantObjective, normalizedOk });

        return {
            weights,
            dominantObjective,
            rationale,
            weightsNormalizedCorrectly: normalizedOk,
            weightSum: parseFloat(sum.toFixed(4)),
        };
    }

    // ─── Prompts ──────────────────────────────────────────────────────────────

    @Prompt({
        name: 'requirement_extraction_prompt',
        description:
            'Few-shot prompt for LLM-based extraction of EV battery requirements from natural language. ' +
            'Teaches the mapping: range → energy density, charge time → C-rate, climate → temperature range, ' +
            'budget → $/kWh cost constraint. Use this to guide an LLM call before parse_requirement_spec.',
        arguments: [
            { name: 'userInput', description: 'The raw natural-language requirement from the engineer or OEM', required: true },
        ],
    })
    async requirementExtractionPrompt(args: { userInput: string }, _ctx: ExecutionContext) {
        return {
            messages: [
                {
                    role: 'user' as const,
                    content: `You are an expert in EV battery engineering. Extract structured requirements from the following specification.

Map domain terms as follows:
- Range (km/miles) → gravimetricEnergyDensity target
- Fast charge time (minutes, 10→80%) → cRateCapability minimum
- Cold/Nordic/Winter climate → operatingTempRange minimum ≤ -30°C, ionic conductivity ≥ 5×10⁻⁴ S/cm
- Tropical/Hot climate → thermalRunawayOnsetTemp priority
- Budget $/kWh → materialCostPerKWh maximum
- "Sustainable"/"green"/"no cobalt" → criticalMineralDependency < 4, recyclability > 70%
- "Safe"/"safety-first" → thermalRunawayOnsetTemp > 200°C mandatory

Return ONLY a JSON object matching the RequirementSet schema:
{
  "vehicleClass": "2-wheeler|passenger-car|commercial|performance",
  "targetRangeKm": number|null,
  "fastChargeTargetMinutes": number|null,
  "climateZone": "tropical|temperate|cold|extreme-cold"|null,
  "budgetPerKWh": number|null,
  "packFormFactor": "cylindrical|prismatic|pouch|any",
  "preferredChemistryFamily": string|null,
  "prioritizeSustainability": boolean,
  "prioritizeSafetyMargin": boolean
}

User specification:
"${args.userInput}"`,
                },
            ],
        };
    }
}
