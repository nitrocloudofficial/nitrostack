import { DecisionTwinOrchestrator } from './src/modules/decision-twin/decision-twin.orchestrator.js';

console.log('=' .repeat(60));
console.log('  DECISION TWIN — Multi-Agent Orchestrator (TypeScript/NitroStack)');
console.log('  Manufacturing & Industry 4.0  |  MCP Hackathon');
console.log('=' .repeat(60));

console.log('\nRunning Demo Scenario: Machine #4 — Abnormal Vibration & Temperature');

const state = await DecisionTwinOrchestrator.run({
  event_type: 'sensor_anomaly',
  event: {
    machine_id: 'M-004',
    timestamp: new Date().toISOString(),
    vibration_level: 8.2,
    temperature: 92,
    pressure: 145,
    source: 'IoT Sensor Gateway',
  },
});

console.log('\n-- EXECUTION TRACE --\n');
for (const line of state.trace) {
  console.log(line);
}

const decision = state.final_decision;
if (decision) {
  console.log('\n' + '_'.repeat(60));
  console.log('  DECISION SUMMARY');
  console.log('_'.repeat(60));
  console.log(`  Machine    : ${decision.machine_id}`);
  console.log(`  Action     : ${decision.chosen_action}`);
  console.log(`  Confidence : ${(decision.confidence * 100).toFixed(0)}%`);
  console.log(`  Reason     : ${decision.reason}`);
  console.log(`  Consulted  : ${decision.agents_consulted.join(', ')}`);
  console.log(`  Rounds     : ${decision.negotiation_rounds}`);

  if (decision.vetoes.length > 0) {
    console.log(`  Vetoes     : ${decision.vetoes.length}`);
    for (const v of decision.vetoes) {
      console.log(`    VETO ${v.vetoed_action}: ${v.reason.slice(0, 60)}...`);
    }
  }

  if (decision.challenges_addressed.length > 0) {
    console.log(`  Challenges : ${decision.challenges_addressed.length}`);
    for (const c of decision.challenges_addressed) {
      console.log(`    CHALLENGE on '${c.challenged_proposal}': ${c.challenge.slice(0, 60)}...`);
    }
  }
  console.log('_'.repeat(60));
}

console.log('\n  EXECUTABLE OUTPUTS:');
for (const wo of state.work_orders) {
  console.log(`    [WORK ORDER] ${wo.action} on ${wo.machine_id} | Priority: ${wo.priority}`);
}
for (const n of state.notifications) {
  console.log(`    [NOTIFICATION] ${n.summary}`);
}

const negotiationHistory = (state.blackboard || {}).negotiation_history || [];
if (negotiationHistory.length > 0) {
  console.log('\n  FULL NEGOTIATION LOG (append-only, dissent never overwritten):');
  for (const entry of negotiationHistory) {
    console.log(`    ${JSON.stringify(entry)}`);
  }
}
console.log();
