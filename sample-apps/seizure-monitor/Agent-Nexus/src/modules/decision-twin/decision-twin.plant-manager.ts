import { DecisionTwinState, FinalDecision, WorkOrder, SupervisorNotification } from './decision-twin.state.js';

const REFLECTION_AGENTS = ['devils_advocate_agent', 'safety_agent', 'risk_agent'];
const SIMULATION_AGENTS = ['scenario_simulation_agent', 'quality_agent'];

export function dispatchNode(state: DecisionTwinState): Partial<DecisionTwinState> {
  const active = [...(state.active_agents || [])];
  const phase = state.phase || '';

  if (active.length > 0) {
    const nextAgent = active[0];
    const remaining = active.slice(1);
    return {
      current_agent: nextAgent,
      active_agents: remaining,
      trace: [...(state.trace || []), `  >> [PlantManager] Dispatching -> ${nextAgent}`],
    };
  }

  if (phase === '' || phase === 'planning') {
    const agents = (state.sub_goals || []).map(g => g.requiredAgent);
    if (agents.length === 0) {
      return {
        phase: 'convergence',
        current_agent: 'converge',
        active_agents: [],
        trace: [...(state.trace || []), '  !! [PlantManager] No sub-goals. Skipping to CONVERGENCE.'],
      };
    }
    return {
      phase: 'evidence',
      current_agent: agents[0],
      active_agents: agents.slice(1),
      trace: [
        ...(state.trace || []),
        '\n' + '-'.repeat(60),
        '  PHASE: EVIDENCE GATHERING',
        `  Activating ${agents.length} agents: [${agents.join(', ')}]`,
        '-'.repeat(60),
      ],
    };
  }

  if (phase === 'evidence') {
    return {
      phase: 'reflection',
      current_agent: REFLECTION_AGENTS[0],
      active_agents: REFLECTION_AGENTS.slice(1),
      trace: [
        ...(state.trace || []),
        '\n' + '-'.repeat(60),
        '  PHASE: REFLECTION & SAFETY',
        `  Activating: [${REFLECTION_AGENTS.join(', ')}]`,
        '-'.repeat(60),
      ],
    };
  }

  if (phase === 'reflection') {
    const vetoes = state.vetoes || [];
    const challenges = state.challenges || [];
    const round = state.negotiation_round || 1;

    // REFLECTION PILLAR: round 1 objection -> loop back for a revised proposal + re-evaluation.
    if (round === 1 && (vetoes.length > 0 || challenges.length > 0)) {
      return {
        phase: 'reflection',
        negotiation_round: 2,
        current_agent: 'renegotiate_agent',
        active_agents: ['devils_advocate_agent', 'safety_agent'],
        trace: [
          ...(state.trace || []),
          '\n' + '-'.repeat(60),
          '  PHASE: REFLECTION ROUND 2 (RENEGOTIATION)',
          `  Round 1 raised ${vetoes.length} veto(es), ${challenges.length} challenge(s) — revising proposal and re-evaluating`,
          '-'.repeat(60),
        ],
      };
    }

    if (vetoes.length > 0 || challenges.length > 0) {
      return {
        phase: 'simulation',
        current_agent: SIMULATION_AGENTS[0],
        active_agents: SIMULATION_AGENTS.slice(1),
        trace: [
          ...(state.trace || []),
          '\n' + '-'.repeat(60),
          '  PHASE: SCENARIO SIMULATION',
          `  Triggered by ${vetoes.length} veto(es), ${challenges.length} challenge(s) still outstanding after ${round} round(s)`,
          `  Activating: [${SIMULATION_AGENTS.join(', ')}]`,
          '-'.repeat(60),
        ],
      };
    }
    return {
      phase: 'convergence',
      current_agent: 'converge',
      active_agents: [],
      trace: [
        ...(state.trace || []),
        '\n' + '-'.repeat(60),
        `  No outstanding vetoes/challenges after ${round} negotiation round(s). Moving to CONVERGENCE.`,
        '-'.repeat(60),
      ],
    };
  }

  if (phase === 'simulation') {
    return {
      phase: 'convergence',
      current_agent: 'converge',
      active_agents: [],
      trace: [
        ...(state.trace || []),
        '\n' + '-'.repeat(60),
        '  Simulation complete. Moving to CONVERGENCE.',
        '-'.repeat(60),
      ],
    };
  }

  return {
    phase: 'convergence',
    current_agent: 'converge',
    active_agents: [],
    trace: [...(state.trace || []), '  !! [PlantManager] Unexpected state — fallback to CONVERGENCE.'],
  };
}

export function convergeNode(state: DecisionTwinState): Partial<DecisionTwinState> {
  const blackboard = state.blackboard || {};
  const proposals = state.proposals || [];
  const vetoes = state.vetoes || [];
  const challenges = state.challenges || [];
  const completed = state.agents_completed || [];
  const event = state.event || {};

  const sensorAgentBB = blackboard.sensor_agent || {};
  const conflicts = state.conflicts || sensorAgentBB.conflicts || [];
  const dataSources = state.data_sources || sensorAgentBB.data_sources || {};
  const policyApplied = sensorAgentBB.data_source_policy || state.data_source_priority || 'user_input (Demo Mode)';

  const vetoedActions = new Set(vetoes.map(v => v.vetoed_action));
  const viable = proposals.filter(p => !vetoedActions.has(p.action));

  let chosen: { action: string; reason: string; confidence: number };
  if (viable.length > 0) {
    viable.sort((a, b) => b.confidence - a.confidence);
    chosen = viable[0];
  } else {
    chosen = {
      action: 'escalate_to_human',
      reason: 'All proposals vetoed or none generated',
      confidence: 0.0,
    };
  }

  const supportingEvidence: Record<string, string> = {};
  for (const [agent, findings] of Object.entries(blackboard)) {
    supportingEvidence[agent] = typeof findings === 'object' && findings !== null && 'summary' in findings
      ? (findings as any).summary
      : JSON.stringify(findings);
  }

  const dataSourceLines = Object.values(dataSources).map((ds: any) =>
    `${ds.field}: ${ds.value} (Source: ${ds.source}${ds.has_conflict ? ` [CONFLICT: ${ds.conflict_detail}]` : ''})`
  );
  supportingEvidence["data_sources"] = `Policy: ${policyApplied}. Reconciled Telemetry: ${dataSourceLines.join(' | ')}`;

  const finalDecision: FinalDecision = {
    chosen_action: chosen.action,
    confidence: chosen.confidence,
    reason: chosen.reason,
    supporting_evidence: supportingEvidence,
    data_sources_summary: dataSources,
    conflicts_resolved: conflicts,
    data_source_policy_applied: policyApplied,
    vetoes,
    challenges_addressed: challenges,
    agents_consulted: completed,
    machine_id: event.machine_id || 'unknown',
    negotiation_rounds: state.negotiation_round || 1,
  };

  const workOrder: WorkOrder = {
    type: 'work_order',
    machine_id: event.machine_id || 'unknown',
    action: chosen.action,
    priority: chosen.confidence > 0.7 ? 'HIGH' : 'MEDIUM',
    assigned_to: 'available_technician',
    notes: chosen.reason,
  };

  const notification: SupervisorNotification = {
    type: 'supervisor_notification',
    machine_id: event.machine_id || 'unknown',
    summary: `Decision: ${chosen.action} (confidence: ${(chosen.confidence * 100).toFixed(0)}%)`,
    requires_approval: chosen.confidence < 0.8,
  };

  const conflictDisplayLines = conflicts.length > 0
    ? [
        `  Conflicts Detected: ${conflicts.length} field(s)`,
        ...conflicts.map((c: any) => `  - ${c.field}: User=${c.user_value} vs Live=${c.live_sensor_value} -> TRUSTED: ${c.selected_source} (${c.selected_value})`),
        ...conflicts.map((c: any) => `    Rationale: ${c.reason}`),
      ]
    : ['  Conflicts Detected: None (User inputs match sensor telemetry or defaults used)'];

  const traceLines = [
    '\n' + '='.repeat(60),
    '  DATA SOURCES & RECONCILIATION',
    '='.repeat(60),
    `  Configured Policy : ${policyApplied}`,
    ...conflictDisplayLines,
    '  Reconciled Telemetry Used for Reasoning:',
    ...Object.values(dataSources).map((ds: any) => `    • ${ds.field.padEnd(14)}: ${ds.value} (Source: ${ds.source})`),
    '='.repeat(60),
    '\n' + '='.repeat(60),
    '  PLANT MANAGER — FINAL DECISION',
    '='.repeat(60),
    `  Action     : ${finalDecision.chosen_action}`,
    `  Confidence : ${(finalDecision.confidence * 100).toFixed(0)}%`,
    `  Reason     : ${finalDecision.reason}`,
    `  Consulted  : ${completed.length} agents`,
    `  Rounds     : ${finalDecision.negotiation_rounds} negotiation round(s)`,
    `  Vetoes     : ${vetoes.length} (active) / ${(blackboard.negotiation_history || []).length} negotiation-log entries total`,
    `  Challenges : ${challenges.length} (active)`,
    '='.repeat(60),
  ];

  return {
    final_decision: finalDecision,
    work_orders: [...(state.work_orders || []), workOrder],
    notifications: [...(state.notifications || []), notification],
    trace: [...(state.trace || []), ...traceLines],
  };
}
