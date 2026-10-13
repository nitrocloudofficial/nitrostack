import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const validationDatabase = path.join(
  os.tmpdir(),
  `surgeguard-validation-${randomUUID()}.sqlite`,
);
process.env.SURGEGUARD_DATABASE_PATH = validationDatabase;

function totalOccupied(locations) {
  return locations.reduce((sum, location) => sum + location.occupied, 0);
}

function assertCapacityMath(snapshot, label) {
  for (const location of snapshot.locations) {
    assert.equal(
      location.occupied + location.available + location.cleaning + location.held,
      location.capacity,
      `${label}: ${location.code} staffed states must total staffed capacity`,
    );
    assert.equal(
      location.capacity + location.blocked,
      location.licensed_capacity,
      `${label}: ${location.code} staffed plus unstaffed must total licensed capacity`,
    );
  }
  assert.equal(
    snapshot.summary.occupied +
      snapshot.summary.available +
      snapshot.summary.cleaning +
      snapshot.summary.held,
    snapshot.summary.staffed_capacity,
    `${label}: staffed states must total staffed capacity`,
  );
  assert.equal(
    snapshot.summary.staffed_capacity + snapshot.summary.blocked,
    snapshot.summary.licensed_capacity,
    `${label}: staffed plus blocked must total licensed capacity`,
  );
}

function totalGap(snapshot) {
  return snapshot.gaps.reduce((sum, gap) => sum + gap.count, 0);
}

try {
  const { surgeSimulation } = await import(
    '../dist/modules/surgeguard/surgeguard.simulation.js'
  );
  const locations = () => surgeSimulation.capacityData().locations;

  const baselineCapacity = surgeSimulation.capacityData();
  assertCapacityMath(baselineCapacity, 'baseline');
  const baselineQueue = surgeSimulation.queueData();
  const baselineStaffing = surgeSimulation.staffingData();

  surgeSimulation.applyScenario({
    arrivals: 10,
    rnChange: -2,
    bedsCleaned: 0,
    discharges: 0,
  });
  const connectedCommand = surgeSimulation.commandCenterData();
  const connectedCapacity = surgeSimulation.capacityData();
  const connectedQueue = surgeSimulation.queueData();
  const connectedStaffing = surgeSimulation.staffingData();
  const connectedComparison = surgeSimulation.comparisonData();
  const connectedPolicy = surgeSimulation.policyData(
    '98c9b7f2-a9ce-49a9-97d2-b39e181c51d3',
  );
  const connectedExecution = surgeSimulation.executionData();

  assert.ok(
    connectedQueue.system_pressure.active_patients >
      baselineQueue.system_pressure.active_patients,
    'A Command Center arrival update must change the Queue Pressure view',
  );
  assert.ok(
    totalGap(connectedStaffing) > totalGap(baselineStaffing),
    'A Command Center RN callout must change the Staffing Readiness view',
  );
  assert.equal(
    connectedCommand.capacity.summary.occupied,
    connectedCapacity.summary.occupied,
    'Command Center and Capacity Board must read the same occupied-bed state',
  );
  assert.equal(
    connectedCommand.queue.system_pressure.active_patients,
    connectedQueue.system_pressure.active_patients,
    'Command Center and Queue Pressure must read the same active-patient state',
  );
  assert.equal(
    totalGap(connectedCommand.staffing),
    totalGap(connectedStaffing),
    'Command Center and Staffing Readiness must read the same coverage state',
  );
  assert.deepEqual(
    connectedCommand.planning.comparison,
    connectedComparison.comparison,
    'Command Center and Plan Comparison must use the same recalculated ranking',
  );
  assert.equal(
    connectedCommand.policy_gates.balanced_decompression.status,
    connectedPolicy.status,
    'Command Center and Policy Gate must use the same plan eligibility result',
  );
  assert.equal(
    connectedCommand.execution.execution.status,
    connectedExecution.execution.status,
    'Command Center and Execution Monitor must use the same execution state',
  );

  const lockedPlanningSnapshot = structuredClone(connectedComparison);
  surgeSimulation.advanceLiveClock(Date.now() + 20_000);
  const planningAfterLiveDrift = surgeSimulation.comparisonData();
  assert.deepEqual(
    planningAfterLiveDrift,
    lockedPlanningSnapshot,
    'Live operational drift must not silently re-rank a plan snapshot under review',
  );
  const regeneratedPlanningSnapshot = surgeSimulation.regenerateComparison();
  assert.notEqual(
    regeneratedPlanningSnapshot.simulation_tick,
    lockedPlanningSnapshot.simulation_tick,
    'An explicit regeneration must create a fresh planning snapshot',
  );

  const pressureBeforeRelief = connectedQueue.system_pressure;
  surgeSimulation.applyScenario({
    arrivals: 0,
    queueCompletions: 100,
    rnChange: 0,
    bedsCleaned: 0,
    discharges: 0,
  });
  const pressureAfterRelief = surgeSimulation.queueData().system_pressure;
  assert.ok(
    pressureAfterRelief.active_patients < pressureBeforeRelief.active_patients,
    'Queue completions must reduce active patients',
  );
  assert.ok(
    pressureAfterRelief.score < pressureBeforeRelief.score,
    'Queue completions must reduce patient-flow pressure',
  );

  const before = connectedCapacity.locations;
  surgeSimulation.applyEvent('arrival_spike');
  const arrivalCapacity = surgeSimulation.capacityData();
  assertCapacityMath(arrivalCapacity, 'after arrival');
  const afterArrival = arrivalCapacity.locations;
  const admissionDelta = totalOccupied(afterArrival) - totalOccupied(before);
  assert.ok(admissionDelta > 0, 'Arrival spike must occupy treatment spaces');

  surgeSimulation.applyEvent('discharge_wave');
  const dischargeCapacity = surgeSimulation.capacityData();
  assertCapacityMath(dischargeCapacity, 'after discharge');
  const afterDischarge = dischargeCapacity.locations;
  const dischargeDeltas = afterArrival
    .map((location) => ({
      code: location.code,
      released:
        location.occupied -
        afterDischarge.find((next) => next.code === location.code).occupied,
    }))
    .filter((location) => location.released > 0);
  assert.ok(
    dischargeDeltas.length >= 3,
    `Discharges must be balanced across units: ${JSON.stringify(dischargeDeltas)}`,
  );

  surgeSimulation.approve('balanced_decompression');
  surgeSimulation.execute('balanced_decompression', 'rapid');
  surgeSimulation.execute('balanced_decompression', 'rapid');
  const completed = surgeSimulation.commandCenterData();
  const occupiedAtCompletion = totalOccupied(completed.capacity.locations);
  assert.equal(completed.execution.execution.progress_percent, 100);

  surgeSimulation.execute('balanced_decompression', 'rapid');
  const repeated = surgeSimulation.commandCenterData();
  assert.equal(
    totalOccupied(repeated.capacity.locations),
    occupiedAtCompletion,
    'Repeated execution after completion must not mutate capacity',
  );

  console.log(JSON.stringify({
    patient_flow_relief: {
      before_score: pressureBeforeRelief.score,
      after_score: pressureAfterRelief.score,
      active_before: pressureBeforeRelief.active_patients,
      active_after: pressureAfterRelief.active_patients,
    },
    staffed_reconciliation:
      baselineCapacity.summary.occupied +
      baselineCapacity.summary.available +
      baselineCapacity.summary.cleaning +
      baselineCapacity.summary.held,
    licensed_reconciliation:
      baselineCapacity.summary.staffed_capacity +
      baselineCapacity.summary.blocked,
    admission_delta: admissionDelta,
    discharge_distribution: dischargeDeltas,
    execution_progress: repeated.execution.execution.progress_percent,
    repeated_execution_stable: true,
    planning_snapshot_stable_until_regenerated: true,
    connected_views_verified: [
      'command_center',
      'capacity',
      'queue',
      'staffing',
      'plan_comparison',
      'policy_gate',
      'execution',
    ],
  }, null, 2));
} finally {
  if (
    path.dirname(validationDatabase) === os.tmpdir() &&
    fs.existsSync(validationDatabase)
  ) {
    fs.rmSync(validationDatabase);
  }
}
