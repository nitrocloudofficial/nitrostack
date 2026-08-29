/**
 * ForgeOps MCP Server — Detailed Input/Output Verification Script
 *
 * Calls every tool and logs exact inputs and outputs.
 */
import { MesTools } from './modules/mes/mes.tools.js';
import { MaintenanceTools } from './modules/maintenance/maintenance.tools.js';
import { QualityTools } from './modules/quality/quality.tools.js';
import { MaterialsTools } from './modules/materials/materials.tools.js';
import { SimulationTools } from './modules/simulation/simulation.tools.js';
import { OrchestratorTools } from './modules/orchestrator/orchestrator.tools.js';

const mockCtx: any = {
  logger: {
    info: () => {},
    error: () => {},
    warn: () => {},
  },
};

async function testAll() {
  const mes = new MesTools();
  const maint = new MaintenanceTools();
  const qual = new QualityTools();
  const mat = new MaterialsTools();
  const sim = new SimulationTools();
  const orch = new OrchestratorTools();

  const results: any[] = [];

  async function check(toolName: string, input: any, fn: () => Promise<any>) {
    try {
      const output = await fn();
      results.push({ toolName, status: 'PASS', input, outputSummary: output });
    } catch (e: any) {
      results.push({ toolName, status: 'FAIL', input, error: e.message });
    }
  }

  // MES
  await check('mes.get_batch_history', { batch_id: 'B-2407-184' }, () => mes.getBatchHistory({ batch_id: 'B-2407-184' }, mockCtx));
  await check('mes.get_production_path', { batch_id: 'B-2407-184' }, () => mes.getProductionPath({ batch_id: 'B-2407-184' }, mockCtx));
  await check('mes.get_queue_events', { batch_id: 'B-2407-184' }, () => mes.getQueueEvents({ batch_id: 'B-2407-184' }, mockCtx));

  // Maintenance
  await check('maint.get_machine_alerts', { machine_id: 'MCH-B-007' }, () => maint.getMachineAlerts({ machine_id: 'MCH-B-007' }, mockCtx));
  await check('maint.get_maintenance_state', { machine_id: 'MCH-B-007' }, () => maint.getMaintenanceState({ machine_id: 'MCH-B-007' }, mockCtx));

  // Quality
  await check('quality.get_defect_records', { batch_id: 'B-2407-184' }, () => qual.getDefectRecords({ batch_id: 'B-2407-184' }, mockCtx));
  await check('quality.get_inspection_results', { batch_id: 'B-2407-184' }, () => qual.getInspectionResults({ batch_id: 'B-2407-184' }, mockCtx));

  // Materials
  await check('materials.get_supplier_lot_info', { lot_id: 'LOT-SUP-2407-88' }, () => mat.getSupplierLotInfo({ lot_id: 'LOT-SUP-2407-88' }, mockCtx));
  await check('materials.get_material_constraints', { material_type: 'Bearing Steel' }, () => mat.getMaterialConstraints({ material_type: 'Bearing Steel' }, mockCtx));

  // Simulation
  await check('simulation.run_scenario (baseline)', { scenario_name: 'baseline' }, () => sim.runScenario({ scenario_name: 'baseline' }, mockCtx));
  await check('simulation.run_scenario (reduce_queue)', { scenario_name: 'reduce_queue_delay' }, () => sim.runScenario({ scenario_name: 'reduce_queue_delay' }, mockCtx));
  await check('simulation.run_scenario (out_of_range)', { scenario_name: 'extreme_speed_1000' }, () => sim.runScenario({ scenario_name: 'extreme_speed_1000' }, mockCtx));
  await check('simulation.compare_scenarios', { scenario_names: ['reduce_queue_delay', 'replace_machine_7'] }, () => sim.compareScenarios({ scenario_names: ['reduce_queue_delay', 'replace_machine_7'] }, mockCtx));

  // Orchestrator
  await check('orchestrator.get_incident_summary', {}, () => orch.getIncidentSummary({}, mockCtx));
  await check('orchestrator.get_timeline', { batch_id: 'B-2407-184' }, () => orch.getTimeline({ batch_id: 'B-2407-184' }, mockCtx));
  await check('orchestrator.get_causal_graph', { batch_id: 'B-2407-184' }, () => orch.getCausalGraph({ batch_id: 'B-2407-184' }, mockCtx));
  await check('orchestrator.get_recommendations', { batch_id: 'B-2407-184' }, () => orch.getRecommendations({ batch_id: 'B-2407-184' }, mockCtx));
  await check('orchestrator.get_business_impact', { batch_id: 'B-2407-184' }, () => orch.getBusinessImpact({ batch_id: 'B-2407-184' }, mockCtx));

  console.log(JSON.stringify(results, null, 2));
}

testAll();
