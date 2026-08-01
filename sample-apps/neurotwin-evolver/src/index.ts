/**
 * NeuroTwin Evolver - Self-Coding Industrial Meta-Agent
 *
 * An MCP server exposing a self-evolving Industry 5.0 agent:
 *  - view_fleet_twin              - live digital-twin map of the fleet
 *  - monitor_environmental_shifts - shifts the agent's training never saw
 *  - run_mutation_cycle           - generate + simulate + deploy new logic
 *  - evolve_logic (task)          - the same cycle, staged with progress
 *  - self_heal_unit (task)        - proactive recovery for a degraded unit
 *  - get_unit_detail              - per-unit telemetry + mutation history
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
    const server = await McpApplicationFactory.create(AppModule);
    await server.start();
}

bootstrap().catch((error) => {
    process.stderr.write(`Failed to start server: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
