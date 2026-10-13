import { DecisionTwinOrchestrator } from './src/modules/decision-twin/decision-twin.orchestrator.js';

async function runReconciliationTest() {
  console.log('===========================================================');
  console.log('TEST 1: DEMO MODE (user_input Priority)');
  console.log('===========================================================');
  const demoResult = await DecisionTwinOrchestrator.run({
    event_type: 'sensor_anomaly',
    data_source_priority: 'user_input',
    event: {
      machine_id: 'M-004',
      temperature: 96,
      vibration_level: 9.0,
      bearing_wear: 94,
      inventory: 8,
    }
  });

  const decision1 = demoResult.final_decision;
  console.log('Policy Applied:', decision1?.data_source_policy_applied);
  console.log('Chosen Action :', decision1?.chosen_action);
  console.log('Conflicts Count:', decision1?.conflicts_resolved?.length);
  console.log('\n--- Conflicts Resolved ---');
  console.dir(decision1?.conflicts_resolved, { depth: null });
  console.log('\n--- Data Sources Summary ---');
  console.dir(decision1?.data_sources_summary, { depth: null });
  console.log('\n--- Supporting Evidence Data Sources ---');
  console.log(decision1?.supporting_evidence?.data_sources);

  console.log('\n===========================================================');
  console.log('TEST 2: PRODUCTION MODE (live_sensor Priority)');
  console.log('===========================================================');
  const prodResult = await DecisionTwinOrchestrator.run({
    event_type: 'sensor_anomaly',
    data_source_priority: 'live_sensor',
    event: {
      machine_id: 'M-004',
      temperature: 96,
      vibration_level: 9.0,
      bearing_wear: 94,
      inventory: 8,
    }
  });

  const decision2 = prodResult.final_decision;
  console.log('Policy Applied:', decision2?.data_source_policy_applied);
  console.log('Chosen Action :', decision2?.chosen_action);
  console.log('Conflicts Count:', decision2?.conflicts_resolved?.length);
  console.log('\n--- Conflicts Resolved ---');
  console.dir(decision2?.conflicts_resolved, { depth: null });

  console.log('\n===========================================================');
  console.log('FULL TRACE (DEMO MODE RECONCILIATION SECTION):');
  console.log('===========================================================');
  const reconciliationTrace = demoResult.trace.filter(t => t.includes('DATA') || t.includes('Conflict') || t.includes('Reconciled') || t.includes('SensorAgent'));
  console.log(reconciliationTrace.join('\n'));
}

runReconciliationTest().catch(console.error);
