/**
 * ForgeOps MCP Server — Tool Verification Script
 *
 * Verifies that all 14 tools defined across the 6 domain modules
 * return valid, structured data according to the NitroStack implementation.
 */
import { MesTools } from './modules/mes/mes.tools.js';
import { MaintenanceTools } from './modules/maintenance/maintenance.tools.js';
import { QualityTools } from './modules/quality/quality.tools.js';
import { MaterialsTools } from './modules/materials/materials.tools.js';
import { SimulationTools } from './modules/simulation/simulation.tools.js';
import { OrchestratorTools } from './modules/orchestrator/orchestrator.tools.js';

// Dummy ExecutionContext logger
const mockCtx: any = {
  logger: {
    info: (msg: string, meta?: any) => console.log(`  [INFO] ${msg}`, meta || ''),
    error: (msg: string, meta?: any) => console.error(`  [ERROR] ${msg}`, meta || ''),
    warn: (msg: string, meta?: any) => console.warn(`  [WARN] ${msg}`, meta || ''),
  },
};

async function runTests() {
  console.log('🚀 Starting ForgeOps MCP Tool Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  async function testTool(name: string, fn: () => Promise<any>) {
    try {
      console.log(`Testing [${name}]...`);
      const res = await fn();
      if (!res || res.error) {
        console.error(`❌ FAIL: [${name}] returned error or empty response`, res);
        failed++;
      } else {
        console.log(`✅ PASS: [${name}] - Record ID: ${res.record_id || 'N/A'}`);
        passed++;
      }
    } catch (e: any) {
      console.error(`❌ FAIL: [${name}] threw exception:`, e.message);
      failed++;
    }
  }

  // 1. MES Tools
  const mes = new MesTools();
  await testTool('mes.get_batch_history', () => mes.getBatchHistory({ batch_id: 'B-2407-184' }, mockCtx));
  await testTool('mes.get_production_path', () => mes.getProductionPath({ batch_id: 'B-2407-184' }, mockCtx));
  await testTool('mes.get_queue_events', () => mes.getQueueEvents({ batch_id: 'B-2407-184' }, mockCtx));

  // 2. Maintenance Tools
  const maint = new MaintenanceTools();
  await testTool('maint.get_machine_alerts', () => maint.getMachineAlerts({ machine_id: 'MCH-B-007' }, mockCtx));
  await testTool('maint.get_maintenance_state', () => maint.getMaintenanceState({ machine_id: 'MCH-B-007' }, mockCtx));

  // 3. Quality Tools
  const qual = new QualityTools();
  await testTool('quality.get_defect_records', () => qual.getDefectRecords({ batch_id: 'B-2407-184' }, mockCtx));
  await testTool('quality.get_inspection_results', () => qual.getInspectionResults({ batch_id: 'B-2407-184' }, mockCtx));

  // 4. Materials Tools
  const mat = new MaterialsTools();
  await testTool('materials.get_supplier_lot_info', () => mat.getSupplierLotInfo({ lot_id: 'LOT-SUP-2407-88' }, mockCtx));
  await testTool('materials.get_material_constraints', () => mat.getMaterialConstraints({ material_type: 'Bearing Steel' }, mockCtx));

  // 5. Simulation Tools
  const sim = new SimulationTools();
  await testTool('simulation.run_scenario (baseline)', () => sim.runScenario({ scenario_name: 'baseline' }, mockCtx));
  await testTool('simulation.run_scenario (reduce_queue)', () => sim.runScenario({ scenario_name: 'reduce_queue_delay' }, mockCtx));
  await testTool('simulation.compare_scenarios', () => sim.compareScenarios({ scenario_names: ['reduce_queue_delay', 'replace_machine_7'] }, mockCtx));

  // 6. Orchestrator Tools
  const orch = new OrchestratorTools();
  await testTool('orchestrator.get_incident_summary', () => orch.getIncidentSummary({}, mockCtx));
  await testTool('orchestrator.get_timeline', () => orch.getTimeline({}, mockCtx));
  await testTool('orchestrator.get_causal_graph', () => orch.getCausalGraph({}, mockCtx));
  await testTool('orchestrator.get_recommendations', () => orch.getRecommendations({}, mockCtx));
  await testTool('orchestrator.get_business_impact', () => orch.getBusinessImpact({}, mockCtx));

  console.log(`\n════════════════════════════════════════════`);
  console.log(`Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`════════════════════════════════════════════`);

  if (failed > 0) process.exit(1);
}

runTests()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('ForgeOps MCP verification suite crashed:', error);
    process.exit(1);
  });
