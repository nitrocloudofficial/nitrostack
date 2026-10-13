/**
 * ForgeOps — Simulation MCP Server Module
 *
 * Exposes Role 3's Simulation Engine physics via NitroStack @Tool decorators:
 *   - run_scenario: Counterfactual simulation scenario runner
 *   - compare_scenarios: Side-by-side scenario comparison & deltas
 */
import { ToolDecorator as Tool, ExecutionContext, z } from '../../nitrostack.js';
import { SimulationEngine } from '../../services/simulation-engine.js';

export class SimulationTools {
  private engine = new SimulationEngine();

  @Tool({
    name: 'run_scenario',
    description: 'Run a counterfactual simulation scenario with modified parameters. Returns predicted yield, confidence, assumptions, and warnings if the scenario is outside the validated operating range.',
    inputSchema: z.object({
      scenario_name: z.string().describe('Name or key for the scenario (e.g. "reduce_queue_delay", "replace_machine_7", "humidity_control", "baseline")'),
      parameters: z.record(z.any()).optional().describe('Optional parameter overrides'),
    }),
  })
  async runScenario(input: { scenario_name: string; parameters?: Record<string, any> }, ctx: ExecutionContext) {
    ctx.logger.info('Simulation: Running scenario via Role 3 engine', { scenario_name: input.scenario_name });
    return this.engine.runScenario(input);
  }

  @Tool({
    name: 'compare_scenarios',
    description: 'Compare multiple simulation scenarios side-by-side with deltas against the baseline. Returns recommended scenario based on yield × confidence.',
    inputSchema: z.object({
      scenario_names: z.array(z.string()).describe('List of scenario names/keys to compare'),
    }),
  })
  async compareScenarios(input: { scenario_names: string[] }, ctx: ExecutionContext) {
    ctx.logger.info('Simulation: Comparing scenarios via Role 3 engine', { scenarios: input.scenario_names });
    return this.engine.compareScenarios(input.scenario_names);
  }
}
