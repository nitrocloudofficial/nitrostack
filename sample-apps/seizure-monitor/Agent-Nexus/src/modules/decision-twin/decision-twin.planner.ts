import { DecisionTwinState, SubGoal } from './decision-twin.state.js';

const DECOMPOSITION_RULES: Record<string, SubGoal[]> = {
  sensor_anomaly: [
    { id: 'assess_sensors', description: 'Read and analyse live sensor data for anomalies', requiredAgent: 'sensor_agent', priority: 1 },
    { id: 'check_health', description: 'Assess machine health from maintenance history', requiredAgent: 'maintenance_agent', priority: 1 },
    { id: 'search_precedent', description: 'Find similar past incidents via historical memory', requiredAgent: 'memory_agent', priority: 2 },
    { id: 'evaluate_schedule', description: 'Assess production schedule and delivery impact', requiredAgent: 'production_agent', priority: 2 },
    { id: 'assess_quality', description: 'Detailed surface roughness and defect risk analysis', requiredAgent: 'quality_agent', priority: 2 },
  ],
  maintenance_alert: [
    { id: 'check_health', description: 'Deep-dive machine health assessment', requiredAgent: 'maintenance_agent', priority: 1 },
    { id: 'search_precedent', description: 'Historical precedent lookup', requiredAgent: 'memory_agent', priority: 1 },
    { id: 'check_parts', description: 'Verify spare-parts availability', requiredAgent: 'inventory_agent', priority: 2 },
    { id: 'estimate_cost', description: 'Project financial impact', requiredAgent: 'finance_agent', priority: 2 },
  ],
  quality_deviation: [
    { id: 'assess_sensors', description: 'Review sensor data around deviation window', requiredAgent: 'sensor_agent', priority: 1 },
    { id: 'assess_quality', description: 'Detailed quality impact analysis', requiredAgent: 'quality_agent', priority: 1 },
    { id: 'evaluate_schedule', description: 'Schedule impact of potential rework', requiredAgent: 'production_agent', priority: 2 },
  ],
};

export function plannerNode(state: DecisionTwinState): Partial<DecisionTwinState> {
  const event = state.event || {};
  const eventType = state.event_type || 'sensor_anomaly';

  const baseGoals = DECOMPOSITION_RULES[eventType] || DECOMPOSITION_RULES.sensor_anomaly;
  const subGoals: SubGoal[] = baseGoals.map(g => ({ ...g }));

  const vibration = Number(event.vibration_level || 0);
  const temperature = Number(event.temperature || 0);

  if (vibration > 7 || temperature > 85) {
    const existingIds = new Set(subGoals.map(g => g.id));
    if (!existingIds.has('check_parts')) {
      subGoals.push({
        id: 'check_parts',
        description: 'Verify spare-parts availability (high-severity trigger)',
        requiredAgent: 'inventory_agent',
        priority: 2,
      });
    }
    if (!existingIds.has('estimate_cost')) {
      subGoals.push({
        id: 'estimate_cost',
        description: 'Project financial impact (high-severity trigger)',
        requiredAgent: 'finance_agent',
        priority: 3,
      });
    }
  }

  subGoals.sort((a, b) => a.priority - b.priority);

  const traceLines = [
    '\n' + '='.repeat(60),
    '  PLANNER AGENT',
    '='.repeat(60),
    `  Event   : ${eventType}`,
    `  Machine : ${event.machine_id || 'unknown'}`,
    `  Severity: vibration=${vibration}, temp=${temperature} C`,
    `  Goals   : ${subGoals.length} sub-goals decomposed`,
    ...subGoals.map(g => `    [${g.priority}] ${g.id.padEnd(20)} -> ${g.requiredAgent}`),
    '='.repeat(60),
  ];

  return {
    sub_goals: subGoals,
    trace: [...(state.trace || []), ...traceLines],
  };
}
