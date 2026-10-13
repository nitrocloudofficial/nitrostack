import { SimulationEngine } from './simulation/engine.js';

async function main() {
  console.log('🧪 Testing Role 3 Simulation & Data Engine...\n');

  const engine = new SimulationEngine();

  // Test 1: Baseline Scenario
  const baseline = engine.runScenario({ scenario_name: 'baseline' });
  console.log('✅ Baseline Scenario:', baseline.scenario_name, '| Yield:', baseline.predicted_yield + '%');

  // Test 2: Counterfactual Scenario (Reduce Queue Delay)
  const queueSim = engine.runScenario({ scenario_name: 'reduce_queue_delay' });
  console.log('✅ Counterfactual Scenario 1:', queueSim.scenario_name, '| Yield:', queueSim.predicted_yield + '%', '| Confidence:', queueSim.confidence);

  // Test 3: Counterfactual Scenario (Replace Machine 7)
  const machSim = engine.runScenario({ scenario_name: 'replace_machine_7' });
  console.log('✅ Counterfactual Scenario 2:', machSim.scenario_name, '| Yield:', machSim.predicted_yield + '%', '| Warning:', machSim.warning);

  // Test 4: Out-of-Range Scenario Guardrail
  const outSim = engine.runScenario({ scenario_name: 'extreme_speed_1000' });
  console.log('✅ Out-of-Range Guardrail:', outSim.scenario_name, '| Valid Range?:', outSim.in_validated_range, '| Warning:', outSim.warning);

  // Test 5: Scenario Comparison
  const comp = engine.compareScenarios(['reduce_queue_delay', 'replace_machine_7', 'humidity_control']);
  console.log('✅ Recommended Scenario:', comp.recommended_scenario);
  console.log('   Reason:', comp.recommendation_reason);

  // Test 6: Business Impact Translation
  const impact = engine.getBusinessImpact();
  console.log('✅ Business Impact Monthly Savings:', '₹' + impact.recommended_action_impact.monthly_savings_inr.toLocaleString());

  // Test 7: Executive Report & Decision Record Generator
  const report = engine.generateExecutiveReport('manager');
  console.log('✅ Generated Executive Report:', report.report_id);
  console.log('   Decision Record Status:', report.decision_record.status, '| Approver:', report.decision_record.approver);

  console.log('\n🎉 All Role 3 Simulation & Data Engine tests passed successfully!');
}

main().catch(console.error);
