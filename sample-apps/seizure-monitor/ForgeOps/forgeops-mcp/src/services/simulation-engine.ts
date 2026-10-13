/**
 * ForgeOps MCP Server — parameter-sensitive Role 3 simulation engine.
 */

export interface ScenarioInput {
  scenario_id?: string;
  scenario_name: string;
  parameters?: Record<string, any>;
}

export interface SimulationResult {
  scenario_id: string;
  scenario_name: string;
  inputs: Record<string, any>;
  baseline_yield: number;
  predicted_yield: number;
  confidence: number;
  confidence_interval: [number, number];
  cost_estimate: string;
  cost_inr: number;
  implementation_effort: string;
  assumptions: string[];
  in_validated_range: boolean;
  warning: string | null;
  reasoning: string;
  evidence_type: 'observed_correlation' | 'counterfactual_simulated' | 'model_estimated';
  sensitivity: Record<string, number>;
}

const BASELINE_YIELD = 82;
const OBSERVED_QUEUE_DELAY = 198;
const OBSERVED_HUMIDITY = 68.5;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

const numericParameter = (
  parameters: Record<string, any>,
  key: string,
  fallback: number,
) => {
  const value = Number(parameters[key]);
  return Number.isFinite(value) ? value : fallback;
};

const confidenceInterval = (predicted: number, confidence: number): [number, number] => {
  const width = 1.5 + (1 - confidence) * 8;
  return [
    Number(Math.max(0, predicted - width).toFixed(1)),
    Number(Math.min(100, predicted + width).toFixed(1)),
  ];
};

export class SimulationEngine {
  public runScenario(input: ScenarioInput): SimulationResult {
    const name = input.scenario_name.toLowerCase();
    const parameters = input.parameters ?? {};
    const isQueueScenario = name.includes('queue') || name.includes('delay') || name.includes('014');
    const isHumidityScenario = name.includes('humidity') || name.includes('hvac') || name.includes('016');
    const queueDelay = numericParameter(
      parameters,
      'queue_delay_minutes',
      isQueueScenario ? 45 : OBSERVED_QUEUE_DELAY,
    );
    const humidity = numericParameter(
      parameters,
      'humidity_pct',
      isHumidityScenario ? 50 : OBSERVED_HUMIDITY,
    );
    const temperature = numericParameter(parameters, 'temperature_c', isQueueScenario ? 24 : 31.4);
    const rangeWarnings = [
      ...(queueDelay < 0 || queueDelay > 240
        ? ['Queue delay is outside the validated 0–240 minute range.']
        : []),
      ...(humidity < 30 || humidity > 75
        ? ['Humidity is outside the validated 30–75% RH range.']
        : []),
      ...(temperature < 18 || temperature > 32
        ? ['Temperature is outside the validated 18–32°C range.']
        : []),
    ];
    const inValidatedRange = rangeWarnings.length === 0;
    const rangeWarning = inValidatedRange
      ? null
      : `One or more inputs are outside the validated operating range: ${rangeWarnings.join(' ')}`;

    if (name.includes('extreme') || name.includes('super_speed') || name.includes('1000')) {
      return {
        scenario_id: 'sim_out_of_range',
        scenario_name: input.scenario_name,
        inputs: parameters,
        baseline_yield: BASELINE_YIELD,
        predicted_yield: 50,
        confidence: 0.2,
        confidence_interval: [40, 60],
        cost_estimate: 'Very high',
        cost_inr: 5000000,
        implementation_effort: 'Extreme',
        assumptions: ['Extrapolated beyond model physics calibration.'],
        in_validated_range: false,
        warning: `Scenario '${input.scenario_name}' exceeds validated operating boundaries.`,
        reasoning: 'The requested operating point is outside the calibrated manufacturing envelope, so no decision-grade estimate is available.',
        evidence_type: 'counterfactual_simulated',
        sensitivity: {},
      };
    }

    if (isQueueScenario) {
      const recovery = 14 * clamp(
        (OBSERVED_QUEUE_DELAY - queueDelay) / (OBSERVED_QUEUE_DELAY - 45),
        0,
        1,
      );
      const creditedRecovery = inValidatedRange ? recovery : recovery * 0.5;
      const predicted = Number((BASELINE_YIELD + creditedRecovery).toFixed(1));
      const confidence = inValidatedRange
        ? Number((0.96 - Math.min(0.18, Math.abs(queueDelay - 45) / 850)).toFixed(2))
        : 0.55;
      const targetWarning = queueDelay >= 60
        ? `Queue delay remains above the <60 minute target; expected recovery is ${creditedRecovery.toFixed(1)} points.`
        : null;
      return {
        scenario_id: 'sim_014',
        scenario_name: `Reduce Queue Delay to ${queueDelay.toFixed(0)} min`,
        inputs: {
          queue_delay_minutes: queueDelay,
          humidity_pct: humidity,
          temperature_c: temperature,
        },
        baseline_yield: BASELINE_YIELD,
        predicted_yield: predicted,
        confidence,
        confidence_interval: confidenceInterval(predicted, confidence),
        cost_estimate: 'Low · ₹15k',
        cost_inr: 15000,
        implementation_effort: 'Easy · scheduling adjustment',
        assumptions: [
          `Queue delay is reduced from 198 to ${queueDelay.toFixed(0)} minutes.`,
          `Humidity is held at ${humidity}% RH.`,
          'Machine 7 condition is held constant.',
        ],
        in_validated_range: inValidatedRange,
        warning: rangeWarning ?? targetWarning,
        reasoning: `Queue delay is the strongest controllable cause (89% influence). Moving it from 198 to ${queueDelay.toFixed(0)} minutes recovers ${creditedRecovery.toFixed(1)} yield points without crediting a Machine 7 replacement.`,
        evidence_type: 'counterfactual_simulated',
        sensitivity: { queue_delay_minutes: 0.89, ambient_humidity: 0.34, machine_condition: 0.12 },
      };
    }

    if (isHumidityScenario) {
      const recovery = 14 * clamp(
        (OBSERVED_HUMIDITY - humidity) / (OBSERVED_HUMIDITY - 50),
        0,
        1,
      );
      const creditedRecovery = inValidatedRange ? recovery : recovery * 0.5;
      const predicted = Number((BASELINE_YIELD + creditedRecovery).toFixed(1));
      const confidence = inValidatedRange
        ? Number((0.94 - Math.min(0.18, Math.abs(humidity - 50) / 140)).toFixed(2))
        : 0.55;
      const targetWarning = humidity >= 55
        ? `Humidity remains above the <55% RH target; expected recovery is ${creditedRecovery.toFixed(1)} points.`
        : null;
      return {
        scenario_id: 'sim_016',
        scenario_name: `Control Queue Humidity at ${humidity}% RH`,
        inputs: {
          queue_delay_minutes: queueDelay,
          humidity_pct: humidity,
          temperature_c: temperature,
        },
        baseline_yield: BASELINE_YIELD,
        predicted_yield: predicted,
        confidence,
        confidence_interval: confidenceInterval(predicted, confidence),
        cost_estimate: 'High · ₹8.5L',
        cost_inr: 850000,
        implementation_effort: 'Medium · HVAC installation, 1–2 weeks',
        assumptions: [
          `Humidity is maintained at ${humidity}% RH.`,
          `Queue delay remains at ${queueDelay.toFixed(0)} minutes.`,
          'Machine 7 condition is held constant.',
        ],
        in_validated_range: inValidatedRange,
        warning: rangeWarning ?? targetWarning,
        reasoning: `Humidity exceeded the 60% storage ceiling during the incident. Controlling it from 68.5% to ${humidity}% RH recovers ${creditedRecovery.toFixed(1)} yield points while queue and machine conditions remain unchanged.`,
        evidence_type: 'counterfactual_simulated',
        sensitivity: { ambient_humidity: 0.82, queue_delay_minutes: 0.45, machine_condition: 0.12 },
      };
    }

    if (name.includes('machine') || name.includes('grinder') || name.includes('015')) {
      const confidence = inValidatedRange ? 0.61 : 0.55;
      return {
        scenario_id: 'sim_015',
        scenario_name: 'Replace / Overhaul Machine 7',
        inputs: {
          machine_id: 'MCH-B-009',
          queue_delay_minutes: queueDelay,
          humidity_pct: humidity,
          temperature_c: temperature,
        },
        baseline_yield: BASELINE_YIELD,
        predicted_yield: 84,
        confidence,
        confidence_interval: confidenceInterval(84, confidence),
        cost_estimate: 'High · ₹12L',
        cost_inr: 1200000,
        implementation_effort: 'Disruptive · 2–3 days downtime',
        assumptions: [
          `Queue delay remains at ${queueDelay.toFixed(0)} minutes.`,
          `Ambient humidity remains at ${humidity}%.`,
          'The replacement machine is fully operational.',
        ],
        in_validated_range: inValidatedRange,
        warning: rangeWarning ?? 'Machine replacement alone leaves the dominant queue-delay factor unchanged.',
        reasoning: 'Machine 7 has a vibration alert, but its causal influence is only 18%. Replacement recovers 2.0 yield points because the dominant queue-delay and humidity conditions remain.',
        evidence_type: 'counterfactual_simulated',
        sensitivity: { machine_condition: 0.18, queue_delay_minutes: 0.89, ambient_humidity: 0.34 },
      };
    }

    return {
      scenario_id: 'sim_001',
      scenario_name: 'Incident Baseline (No Intervention)',
      inputs: parameters,
      baseline_yield: BASELINE_YIELD,
      predicted_yield: BASELINE_YIELD,
      confidence: 0.95,
      confidence_interval: [79.5, 84.5],
      cost_estimate: 'None',
      cost_inr: 0,
      implementation_effort: 'None',
      assumptions: ['All current conditions held as observed.'],
      in_validated_range: true,
      warning: null,
      reasoning: 'No intervention is applied, so the incident yield remains at 82%.',
      evidence_type: 'observed_correlation',
      sensitivity: {},
    };
  }

  public compareScenarios(scenarioNames: string[]) {
    const results = scenarioNames.map((name) => this.runScenario({ scenario_name: name }));
    const baseline = this.runScenario({ scenario_name: 'baseline' });
    const deltas = results.map((result) => ({
      scenario_id: result.scenario_id,
      scenario_name: result.scenario_name,
      yield_delta: Number((result.predicted_yield - baseline.predicted_yield).toFixed(1)),
      confidence_delta: Number((result.confidence - baseline.confidence).toFixed(2)),
      cost_inr: result.cost_inr,
      in_validated_range: result.in_validated_range,
    }));
    const validResults = results.filter(
      (result) => result.in_validated_range && result.scenario_id !== 'sim_001',
    );
    const recommended = validResults.length > 0
      ? validResults.reduce((left, right) =>
        left.predicted_yield * left.confidence > right.predicted_yield * right.confidence
          ? left
          : right)
      : baseline;
    return {
      baseline,
      scenarios: results,
      deltas,
      recommended_scenario: recommended.scenario_name,
      recommendation_reason: `${recommended.scenario_name} provides the strongest confidence-weighted yield recovery with explicit cost and operating-range guardrails.`,
    };
  }
}
