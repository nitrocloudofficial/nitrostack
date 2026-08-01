import { describe, it, expect } from 'vitest';
import { calculateStrategyMetrics, ScenarioSimulationAgent } from './scenario_simulation_agent.js';

describe('ScenarioSimulationAgent Business Logic', () => {
  it('calculates default strategy metrics matching reference model', () => {
    const res = calculateStrategyMetrics({
      vibrationLevel: 6.5,
      temperature: 85.0,
      hourlyDowntimeCost: 12500.0,
      activeOrders: 3,
      delayDays: 7,
      capacityPct: 60.0
    });

    expect(res.parametersEvaluated.vibrationLevel).toBe(6.5);
    expect(res.parametersEvaluated.temperature).toBe(85.0);
    expect(res.bestStrategyId).toBe('repair_now');
    expect(res.strategies.repair_now.totalExpectedCost).toBe(95000);
    expect(res.strategies.repair_now.resilienceScore).toBe(92);
    expect(res.strategies.delay_repair.resilienceScore).toBeLessThan(res.strategies.repair_now.resilienceScore);
    expect(res.costSavingsVsDelay).toBeGreaterThan(0);
  });

  it('evaluates reduced capacity score under mild severity', () => {
    const res = calculateStrategyMetrics({
      vibrationLevel: 4.0,
      temperature: 70.0,
      hourlyDowntimeCost: 10000.0,
      delayDays: 3,
      capacityPct: 80.0
    });

    expect(res.parametersEvaluated.severityFactor).toBeLessThanOrEqual(1.5);
    expect(res.strategies.reduced_capacity.resilienceScore).toBe(85);
  });

  it('executes ScenarioSimulationAgent tool method successfully', async () => {
    const agent = new ScenarioSimulationAgent();
    const output = await agent.simulateScenarios({
      vibrationLevel: 8.2,
      temperature: 92.0,
      hourlyDowntimeCost: 15000.0
    });

    expect(output.strategies.repair_now).toBeDefined();
    expect(output.strategies.delay_repair).toBeDefined();
    expect(output.strategies.reduced_capacity).toBeDefined();
  });

  it('evaluates ScenarioSimulationAgent state proposal for decision twin workflow', async () => {
    const agent = new ScenarioSimulationAgent();
    const result = await agent.evaluateScenarioAgent({
      vibrationLevel: 7.5,
      temperature: 88.0
    });

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].source).toBe('scenario_simulation_agent');
    expect(result.agentsCompleted).toContain('scenario_simulation_agent');
    expect(result.trace.length).toBeGreaterThan(0);
  });
});
