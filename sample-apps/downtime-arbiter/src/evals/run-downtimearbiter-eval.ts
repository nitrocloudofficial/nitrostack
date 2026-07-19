import { DowntimeArbiterTools } from '../modules/downtimearbiter/downtimearbiter.tools.js';
import { NEGOTIATION_LOGS } from '../modules/downtimearbiter/fixtures.js';
import { getRiskAtHorizon } from '../modules/downtimearbiter/pf-curves.js';

type Check = {
  name: string;
  passed: boolean;
  detail: string;
};

type ToolError = {
  error: string;
};

function isError(value: unknown): value is ToolError {
  return typeof value === 'object' && value !== null && 'error' in value;
}

function resetNegotiation(machineId: string): void {
  const log = NEGOTIATION_LOGS[machineId];
  if (!log) {
    throw new Error(`Missing fixture negotiation log: ${machineId}`);
  }

  log.entries.length = 0;
  delete log.final_resolution;
}

function resetAllNegotiations(): void {
  Object.keys(NEGOTIATION_LOGS).forEach(resetNegotiation);
}

function check(name: string, passed: boolean, detail: string): Check {
  return { name, passed, detail };
}

async function propose(
  tools: DowntimeArbiterTools,
  role: 'Maintenance' | 'Production',
  machineId: string,
  day: number,
  estimatedCost: number,
  rationale: string,
) {
  return tools.proposeWindow(
    {
      role,
      machine_id: machineId,
      window_start: `2025-01-${String(day).padStart(2, '0')}T08:00:00Z`,
      window_end: `2025-01-${String(day).padStart(2, '0')}T12:00:00Z`,
      duration_hours: 4,
      rationale,
      estimated_cost: estimatedCost,
    },
    {} as never,
  );
}

async function runEval() {
  resetAllNegotiations();

  const tools = new DowntimeArbiterTools();
  const checks: Check[] = [];

  const productionSignal = await tools.getMachineSignal(
    { machine_id: 'MACH_001', caller_role: 'Production' },
    {} as never,
  );
  checks.push(
    check(
      'context_isolation.production_cannot_read_machine_signal',
      isError(productionSignal),
      isError(productionSignal) ? productionSignal.error : 'Production saw Maintenance-only data',
    ),
  );

  const maintenanceUrgency = await tools.getUrgencyTier(
    { machine_id: 'MACH_001', caller_role: 'Maintenance' },
    {} as never,
  );
  checks.push(
    check(
      'context_isolation.maintenance_cannot_read_production_tier_tool',
      isError(maintenanceUrgency),
      isError(maintenanceUrgency) ? maintenanceUrgency.error : 'Maintenance reached Production-only tool',
    ),
  );

  const productionTier = await tools.getUrgencyTier(
    { machine_id: 'MACH_003', caller_role: 'Production' },
    {} as never,
  );
  checks.push(
    check(
      'context_isolation.production_tier_has_no_raw_risk',
      !isError(productionTier) && !('current_risk_pct' in productionTier) && !('risk_pct' in productionTier),
      JSON.stringify(productionTier),
    ),
  );

  const bearing24 = getRiskAtHorizon('bearing_spall', 20, 24);
  const bearing96 = getRiskAtHorizon('bearing_spall', 20, 96);
  const thermal24 = getRiskAtHorizon('thermal_degradation', 20, 24);
  const thermal96 = getRiskAtHorizon('thermal_degradation', 20, 96);
  checks.push(
    check(
      'pf_curve.bearing_spall_is_nonflat_over_horizons',
      bearing96 > bearing24,
      `bearing +24h=${bearing24.toFixed(1)}, +96h=${bearing96.toFixed(1)}`,
    ),
  );
  checks.push(
    check(
      'pf_curve.thermal_degradation_is_front_loaded',
      thermal24 > bearing24 && thermal96 > thermal24,
      `bearing +24h=${bearing24.toFixed(1)}, thermal +24h=${thermal24.toFixed(1)}, thermal +96h=${thermal96.toFixed(1)}`,
    ),
  );

  resetNegotiation('MACH_001');
  await propose(tools, 'Maintenance', 'MACH_001', 20, 100, 'Maintenance preferred window');
  await propose(tools, 'Production', 'MACH_001', 21, 105, 'Production counter window');
  const closeGapResolution = await tools.resolveNegotiation(
    { machine_id: 'MACH_001', caller_role: 'Arbiter' },
    {} as never,
  );
  checks.push(
    check(
      'arbiter.close_gap_auto_accepts_without_override',
      !isError(closeGapResolution) &&
        closeGapResolution.decision === 'accept_maintenance' &&
        closeGapResolution.override_applied === false,
      JSON.stringify(closeGapResolution),
    ),
  );

  resetNegotiation('MACH_002');
  await propose(tools, 'Maintenance', 'MACH_002', 20, 100, 'Lower-cost maintenance window');
  await propose(tools, 'Production', 'MACH_002', 21, 130, 'Higher-cost production preference');
  const largeGapResolution = await tools.resolveNegotiation(
    { machine_id: 'MACH_002', caller_role: 'Arbiter' },
    {} as never,
  );
  checks.push(
    check(
      'arbiter.large_gap_forces_lower_cost_with_override',
      !isError(largeGapResolution) &&
        largeGapResolution.decision === 'accept_maintenance' &&
        largeGapResolution.override_applied === true,
      JSON.stringify(largeGapResolution),
    ),
  );

  const closedProposal = await propose(
    tools,
    'Maintenance',
    'MACH_002',
    22,
    80,
    'Attempt after final resolution',
  );
  checks.push(
    check(
      'negotiation.closed_machine_rejects_new_proposals',
      isError(closedProposal) && closedProposal.error.includes('closed'),
      JSON.stringify(closedProposal),
    ),
  );

  resetNegotiation('MACH_003');
  const roundResults = [
    await propose(tools, 'Maintenance', 'MACH_003', 20, 100, 'Round 1 maintenance'),
    await propose(tools, 'Production', 'MACH_003', 21, 110, 'Round 1 production'),
    await propose(tools, 'Maintenance', 'MACH_003', 22, 95, 'Round 2 maintenance'),
    await propose(tools, 'Production', 'MACH_003', 23, 97, 'Round 2 production'),
  ];
  const thirdRoundProposal = await propose(
    tools,
    'Maintenance',
    'MACH_003',
    24,
    90,
    'Round 3 should be blocked',
  );
  checks.push(
    check(
      'negotiation.two_round_cap_allows_four_proposals',
      roundResults.every((result) => !isError(result)),
      JSON.stringify(roundResults),
    ),
  );
  checks.push(
    check(
      'negotiation.third_round_is_rejected',
      isError(thirdRoundProposal) && thirdRoundProposal.error.includes('2 rounds'),
      JSON.stringify(thirdRoundProposal),
    ),
  );

  const constraintConflict = await tools.checkPlanConstraints(
    {
      machine_id: 'MACH_001',
      window_start: '2025-01-16T09:00:00Z',
      window_end: '2025-01-16T10:00:00Z',
    },
    {} as never,
  );
  checks.push(
    check(
      'schedule_constraints.detects_shared_technician_conflict',
      !isError(constraintConflict) && constraintConflict.feasible === false && constraintConflict.conflicts.length > 0,
      JSON.stringify(constraintConflict),
    ),
  );

  const passed = checks.filter((result) => result.passed).length;
  const failed = checks.length - passed;
  const report = {
    project: 'Downtime Arbiter',
    generated_at: new Date().toISOString(),
    summary: {
      total_checks: checks.length,
      passed_checks: passed,
      failed_checks: failed,
      pass_rate_pct: Math.round((passed / checks.length) * 1000) / 10,
    },
    metrics: {
      context_isolation_passed: checks
        .filter((result) => result.name.startsWith('context_isolation.'))
        .every((result) => result.passed),
      pf_curve_model_passed: checks
        .filter((result) => result.name.startsWith('pf_curve.'))
        .every((result) => result.passed),
      deterministic_arbiter_passed: checks
        .filter((result) => result.name.startsWith('arbiter.'))
        .every((result) => result.passed),
      negotiation_protocol_passed: checks
        .filter((result) => result.name.startsWith('negotiation.'))
        .every((result) => result.passed),
      schedule_constraints_passed: checks
        .filter((result) => result.name.startsWith('schedule_constraints.'))
        .every((result) => result.passed),
    },
    checks,
  };

  console.log(JSON.stringify(report, null, 2));

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runEval()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });
