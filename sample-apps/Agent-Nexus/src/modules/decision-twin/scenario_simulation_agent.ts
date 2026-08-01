import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

export interface ScenarioSimulationParams {
  vibrationLevel?: number;
  temperature?: number;
  hourlyDowntimeCost?: number;
  activeOrders?: number;
  delayDays?: number;
  capacityPct?: number;
}

export interface StrategyDetail {
  id: string;
  name: string;
  badge?: string;
  badgeColor?: string;
  totalExpectedCost: number;
  repairCost: number;
  downtimeLoss: number;
  downtimeHours: number;
  failureRiskPct: number;
  deliveryRiskPct: number;
  resilienceScore: number;
  recommendationRank: number;
  pros: string[];
  cons: string[];
}

export interface ScenarioSimulationResult {
  parametersEvaluated: {
    vibrationLevel: number;
    temperature: number;
    hourlyDowntimeCost: number;
    activeOrders: number;
    delayDays: number;
    capacityPct: number;
    severityFactor: number;
  };
  bestStrategyId: string;
  strategies: Record<string, StrategyDetail>;
  costSavingsVsDelay: number;
}

/**
 * Calculate quantitative metrics for all 3 maintenance strategies.
 */
export function calculateStrategyMetrics(params: ScenarioSimulationParams = {}): ScenarioSimulationResult {
  const vibrationLevel = params.vibrationLevel ?? 6.5;
  const temperature = params.temperature ?? 85.0;
  const hourlyDowntimeCost = params.hourlyDowntimeCost ?? 12500.0;
  const activeOrders = params.activeOrders ?? 3;
  const delayDays = params.delayDays ?? 7;
  const capacityPct = params.capacityPct ?? 60.0;

  // Empirical SCADA severity factor
  const severityFactor = Number((Math.max(1.0, (vibrationLevel / 5.0) * (temperature / 80.0))).toFixed(2));

  // Determine physical operational state
  const isHealthy = vibrationLevel <= 3.5 && temperature <= 60.0;
  const isCritical = vibrationLevel > 7.5 || temperature > 85.0;
  const isModerate = !isHealthy && !isCritical;

  // --- 1. CONTINUOUS / REPAIR NOW STRATEGY ---
  const rnDowntimeHrs = isHealthy ? 0.0 : 4.0;
  const rnRepairCost = isHealthy ? 0.0 : 45000.0;
  const rnDowntimeLoss = rnDowntimeHrs * hourlyDowntimeCost;
  const rnTotalCost = rnRepairCost + rnDowntimeLoss;
  const rnFailureRisk = isHealthy ? 0.5 : isModerate ? 8.5 : Number((Math.min(95.0, severityFactor * 32.0)).toFixed(1));
  const rnDeliveryRisk = isHealthy ? 1.0 : isModerate ? 5.0 : 18.0;
  const rnScore = isHealthy ? 98 : isCritical ? 92 : 80;

  // --- 2. DELAY REPAIR ---
  const baseDailyRisk = Math.min(0.25, 0.05 * severityFactor);
  const drFailureProb = isHealthy ? 0.01 : Math.min(0.95, 1.0 - Math.exp(-baseDailyRisk * delayDays));
  const drCatastrophicDowntimeHrs = 48.0;
  const drCatastrophicRepairCost = 140000.0;
  const drDowntimeLoss = drCatastrophicDowntimeHrs * hourlyDowntimeCost;
  const drOrderPenalty = activeOrders * 25000.0;

  const drExpectedCost = isHealthy ? 0.0 : drFailureProb * (drCatastrophicRepairCost + drDowntimeLoss + drOrderPenalty);
  const drFailureRisk = Number((drFailureProb * 100).toFixed(1));
  const drDeliveryRisk = Math.min(95.0, Number((drFailureProb * 90).toFixed(1)));
  const drScore = isHealthy ? 88 : Math.max(10, 100 - Math.round(drFailureRisk * 1.1));

  // --- 3. REDUCED CAPACITY ---
  const deratedStress = severityFactor * Math.pow(capacityPct / 100.0, 2);
  const rcFailureProb = Math.min(0.55, 0.04 * deratedStress * delayDays);
  const rcCapacityLossPerDay = ((100.0 - capacityPct) / 100.0) * (hourlyDowntimeCost * 12);
  const rcRevenueLoss = rcCapacityLossPerDay * delayDays;
  const rcScheduledRepairCost = 38000.0;
  const rcPlannedDowntimeLoss = 4.0 * hourlyDowntimeCost * 0.7;

  const rcExpectedCost = rcRevenueLoss + rcScheduledRepairCost + rcPlannedDowntimeLoss + (rcFailureProb * drCatastrophicRepairCost);
  const rcFailureRisk = Number((rcFailureProb * 100).toFixed(1));
  const rcDeliveryRisk = Number(Math.min(60.0, (100.0 - capacityPct) * 0.75).toFixed(1));
  const rcScore = isModerate ? 96 : isHealthy ? 70 : 52;

  const primaryStrategyId = isHealthy ? 'continue_normal_operation' : isModerate ? 'reduced_capacity' : 'repair_now';
  const primaryStrategyName = isHealthy ? 'Continue Normal Operation' : isModerate ? 'Operate at Reduced Capacity' : 'Immediate Repair Required';
  const primaryBadge = isHealthy ? 'NOMINAL STATUS' : isModerate ? 'RECOMMENDED' : 'CRITICAL ACTION';
  const primaryBadgeColor = isHealthy ? '#22C55E' : isModerate ? '#F59E0B' : '#EF4444';

  const secondaryStrategyId = isHealthy ? 'reduced_capacity' : isModerate ? 'repair_now' : 'reduced_capacity';
  const secondaryStrategyName = isHealthy ? 'Operate at Reduced Capacity' : isModerate ? 'Immediate Repair Required' : 'Operate at Reduced Capacity (Emergency De-rate)';
  const secondaryBadge = isHealthy ? 'CONSERVATIVE OPTION' : isModerate ? 'HIGH COST OPTION' : 'TEMPORARY MITIGATION';
  const secondaryBadgeColor = isHealthy ? '#3B82F6' : isModerate ? '#EF4444' : '#F59E0B';

  const tertiaryStrategyName = isHealthy ? 'Continue Monitoring & Inspection' : isModerate ? 'Schedule Maintenance Later' : 'Delay Repair (High Risk)';
  const tertiaryBadge = isHealthy ? 'MONITORING ONLY' : isModerate ? 'DEFERRED OPTION' : 'NOT RECOMMENDED';
  const tertiaryBadgeColor = isHealthy ? '#6B7280' : isModerate ? '#6B7280' : '#DC2626';

  const strategies: Record<string, StrategyDetail> = {
    [primaryStrategyId]: {
      id: primaryStrategyId,
      name: primaryStrategyName,
      badge: primaryBadge,
      badgeColor: primaryBadgeColor,
      totalExpectedCost: Math.round(rnTotalCost),
      repairCost: Math.round(rnRepairCost),
      downtimeLoss: Math.round(rnDowntimeLoss),
      downtimeHours: rnDowntimeHrs,
      failureRiskPct: rnFailureRisk,
      deliveryRiskPct: rnDeliveryRisk,
      resilienceScore: rnScore,
      recommendationRank: 1,
      pros: isHealthy
        ? ['Machine operates within nominal baseline', 'Zero planned or unplanned downtime', 'Full production throughput']
        : ['Eliminates catastrophic breakdown risk', 'Uses in-stock parts immediately', 'Fastest restoration to 100% capacity'],
      cons: isHealthy
        ? ['Continuous monitoring required']
        : ['Immediate 4-hour production stoppage'],
    },
    [secondaryStrategyId]: {
      id: secondaryStrategyId,
      name: secondaryStrategyName,
      badge: secondaryBadge,
      badgeColor: secondaryBadgeColor,
      totalExpectedCost: isModerate ? Math.round(rnTotalCost) : Math.round(rcExpectedCost),
      repairCost: isModerate ? Math.round(rnRepairCost) : Math.round(rcScheduledRepairCost),
      downtimeLoss: isModerate ? Math.round(rnDowntimeLoss) : Math.round(rcRevenueLoss + rcPlannedDowntimeLoss),
      downtimeHours: 4.0,
      failureRiskPct: isModerate ? rnFailureRisk : rcFailureRisk,
      deliveryRiskPct: isModerate ? rnDeliveryRisk : rcDeliveryRisk,
      resilienceScore: rcScore,
      recommendationRank: 2,
      pros: isModerate
        ? ['Eliminates catastrophic breakdown risk', 'Uses in-stock parts immediately']
        : ['Maintains partial order throughput', 'Schedules maintenance during off-peak hours', 'Significant stress reduction'],
      cons: isModerate
        ? ['Immediate 4-hour production stoppage']
        : ['Accumulates daily capacity revenue loss', 'Requires active order rerouting'],
    },
    delay_repair: {
      id: 'delay_repair',
      name: tertiaryStrategyName,
      badge: tertiaryBadge,
      badgeColor: tertiaryBadgeColor,
      totalExpectedCost: Math.round(drExpectedCost),
      repairCost: Math.round(drCatastrophicRepairCost * drFailureProb),
      downtimeLoss: Math.round(drDowntimeLoss * drFailureProb),
      downtimeHours: Number((drCatastrophicDowntimeHrs * drFailureProb).toFixed(1)),
      failureRiskPct: drFailureRisk,
      deliveryRiskPct: drDeliveryRisk,
      resilienceScore: drScore,
      recommendationRank: 3,
      pros: ['Zero immediate downtime today'],
      cons: ['Exponentially escalating failure risk', 'Potential 48h catastrophic outage', 'Severe financial penalty'],
    },
  };

  const bestId = primaryStrategyId;

  return {
    parametersEvaluated: {
      vibrationLevel,
      temperature,
      hourlyDowntimeCost,
      activeOrders,
      delayDays,
      capacityPct,
      severityFactor,
    },
    bestStrategyId: bestId,
    strategies,
    costSavingsVsDelay: Math.max(0, Math.round(drExpectedCost - strategies[bestId].totalExpectedCost)),
  };
}

/**
 * ScenarioSimulationAgent MCP Controller & Tool Provider
 */
export class ScenarioSimulationAgent {
  /**
   * Tool 1: simulate_scenarios
   * Evaluates Repair Now, Delay Repair, and Reduced Capacity operational strategies.
   */
  @Tool({
    name: 'simulate_scenarios',
    description: 'Performs quantitative rule-based simulation comparing three operational strategies: Repair Now, Delay Repair, and Reduced Capacity.',
    inputSchema: z.object({
      vibrationLevel: z.number().optional().default(6.5).describe('Vibration level reading (mm/s)'),
      temperature: z.number().optional().default(85.0).describe('Operating temperature in Celsius'),
      hourlyDowntimeCost: z.number().optional().default(12500.0).describe('Hourly downtime cost in USD'),
      activeOrders: z.number().optional().default(3).describe('Active production orders affected'),
      delayDays: z.number().optional().default(7).describe('Deferred repair delay in days'),
      capacityPct: z.number().optional().default(60.0).describe('De-rated capacity percentage')
    })
  })
  async simulateScenarios(
    input: ScenarioSimulationParams,
    ctx?: ExecutionContext
  ): Promise<ScenarioSimulationResult> {
    if (ctx?.logger) {
      ctx.logger.info('Executing Scenario Simulation Agent strategy matrix', { ...input });
    }
    return calculateStrategyMetrics(input);
  }

  /**
   * Tool 2: evaluate_scenario_agent
   * Evaluates state event parameters and produces a blackboard proposal.
   */
  @Tool({
    name: 'evaluate_scenario_agent',
    description: 'Evaluates state event parameters for Decision Twin multi-agent workflow and returns agent blackboard state and proposal.',
    inputSchema: z.object({
      vibrationLevel: z.number().optional().default(6.5),
      temperature: z.number().optional().default(85.0),
      hourlyDowntimeCost: z.number().optional().default(12500.0),
      activeOrders: z.number().optional().default(3),
      delayDays: z.number().optional().default(7),
      capacityPct: z.number().optional().default(60.0)
    })
  })
  async evaluateScenarioAgent(input: ScenarioSimulationParams, ctx?: ExecutionContext) {
    if (ctx?.logger) {
      ctx.logger.info('Evaluating scenario simulation agent state proposal', { ...input });
    }

    const simulationResults = calculateStrategyMetrics(input);
    const bestStrat = simulationResults.strategies[simulationResults.bestStrategyId];

    const proposal = {
      source: 'scenario_simulation_agent',
      action: simulationResults.bestStrategyId,
      reason: `Numeric simulation ranks ${bestStrat.name} #1 (Score: ${bestStrat.resilienceScore}/100). Saves $${simulationResults.costSavingsVsDelay.toLocaleString()} compared to delaying repair.`,
      confidence: 0.88,
      matrix: simulationResults,
    };

    const trace = [
      `     [ScenarioSimulationAgent] Evaluated 3 strategies:`,
      `       1. Repair Now        : Expected Cost = $${simulationResults.strategies.repair_now.totalExpectedCost.toLocaleString()} (Risk: ${simulationResults.strategies.repair_now.failureRiskPct}%)`,
      `       2. Reduced Capacity  : Expected Cost = $${simulationResults.strategies.reduced_capacity.totalExpectedCost.toLocaleString()} (Risk: ${simulationResults.strategies.reduced_capacity.failureRiskPct}%)`,
      `       3. Delay Repair (${simulationResults.parametersEvaluated.delayDays}d): Expected Cost = $${simulationResults.strategies.delay_repair.totalExpectedCost.toLocaleString()} (Risk: ${simulationResults.strategies.delay_repair.failureRiskPct}%)`,
      `       Recommendation: ${simulationResults.bestStrategyId} (Savings vs Delay: $${simulationResults.costSavingsVsDelay.toLocaleString()})`,
    ];

    return {
      blackboard: { scenario_simulation_agent: simulationResults },
      agentsCompleted: ['scenario_simulation_agent'],
      proposals: [proposal],
      trace,
    };
  }
}
