import { registerRule } from './rule-registry.js';

// ── Rule: Contract Penalty on Halt ────────────────────────────────────────────
registerRule({
  id: 'contract-penalty',
  toolName: 'halt_deployment_pipeline',
  priority: 100,
  check(params, state) {
    const contract = state.finops.contracts.find(c => c.cluster_id === params.cluster_id);
    if (!contract) return null;
    return {
      has_conflict: true,
      conflict_type: 'contract_penalty',
      message: `Halting ${params.cluster_id} affects an active order for ${contract.customer}. Contractual penalty for missed deadline: ₹${contract.penalty_clause_inr.toLocaleString()}. Deadline: ${contract.deadline}.`
    };
  }
});

// ── Rule: Cross-Tool Double-Halt (same cluster already queued) ────────────────
registerRule({
  id: 'cross-tool-double-halt',
  toolName: 'halt_deployment_pipeline',
  priority: 90,
  check(params, state) {
    const alreadyQueued = state.pending_actions.some(
      a => a.tool_name === 'halt_deployment_pipeline' && (a.params as any).cluster_id === params.cluster_id
    );
    if (!alreadyQueued) return null;
    return {
      has_conflict: true,
      conflict_type: 'duplicate_halt',
      message: `A halt for ${params.cluster_id} is already pending human approval. Approving this second request before the first resolves may cause a double-halt event.`
    };
  }
});

// ── Rule: Canary In Progress (halt blocked while canary active) ───────────────
registerRule({
  id: 'canary-in-progress',
  toolName: 'halt_deployment_pipeline',
  priority: 95,
  check(params, state) {
    const activeCanary = state.devops.deployments.find(
      d => d.cluster_id === params.cluster_id && d.status === 'active'
    );
    if (!activeCanary) return null;
    return {
      has_conflict: true,
      conflict_type: 'canary_in_progress',
      message: `A canary deployment of ${activeCanary.service_id} v${activeCanary.image_tag} is currently progressing on ${params.cluster_id} (${activeCanary.traffic_pct}% traffic). Halting now will abort the rollout and may leave traffic in an inconsistent split.`
    };
  }
});

// ── Rule: Budget Floor Violation on Reallocation ──────────────────────────────
registerRule({
  id: 'budget-floor',
  toolName: 'reallocate_capital',
  priority: 100,
  check(params, state) {
    const ledger = state.finops.ledgers.find(l => l.department === params.source_dept);
    if (!ledger) return null;
    const remaining = ledger.budget - params.amount;
    if (remaining < ledger.floor) {
      return {
        has_conflict: true,
        conflict_type: 'budget_floor',
        message: `Reallocating ₹${params.amount.toLocaleString()} from ${params.source_dept} would drop their budget to ₹${remaining.toLocaleString()}, below their minimum reserve floor of ₹${ledger.floor.toLocaleString()}.`
      };
    }
    return null;
  }
});

// ── Rule: Unknown Isolation Target ────────────────────────────────────────────
registerRule({
  id: 'unknown-isolation-target',
  toolName: 'isolate_compromised_node',
  priority: 100,
  check(params, state) {
    const inRegistry = state.secops.threats.some(t => t.affected_node === params.node_id);
    if (inRegistry) return null;
    return {
      has_conflict: true,
      conflict_type: 'unknown_isolation_target',
      message: `Node "${params.node_id}" does not appear in the current threat registry. Isolating an unknown node may disrupt live traffic unexpectedly — confirm the target is correct.`
    };
  }
});

// ── Rule: Compute Budget Low on Critical Branch Prioritization ────────────────
registerRule({
  id: 'compute-budget-low',
  toolName: 'prioritize_engineering_branch',
  priority: 100,
  check(params, state) {
    if (params.urgency_level !== 'critical') return null;
    const eng = state.finops.ledgers.find(l => l.department === 'Engineering');
    if (!eng) return null;
    const headroom = ((eng.budget - eng.floor) / eng.floor) * 100;
    if (headroom < 20) {
      return {
        has_conflict: true,
        conflict_type: 'compute_budget_low',
        message: `Critical compute priority escalation for branch "${params.branch_id}" may incur burst infrastructure costs. Engineering budget is only ₹${(eng.budget - eng.floor).toLocaleString()} above floor (${headroom.toFixed(0)}% headroom). Approval will authorize unplanned spend.`
      };
    }
    return null;
  }
});

// ── Rule: Weather Context Augmentation (wildcard — all tools) ────────────────
registerRule({
  id: 'weather-context',
  toolName: '*',
  priority: 50,
  check(params, state) {
    if (state.weather?.risk_signal !== 'elevated') return null;
    const condition = state.weather.condition || 'severe conditions';
    return {
      has_conflict: true,
      conflict_type: 'weather_risk',
      message: `⚠️  Weather risk is ELEVATED in the Chennai DC region (${condition}) — physical operational risk is heightened. Consider whether this action should be deferred until conditions normalise.`
    };
  }
});
