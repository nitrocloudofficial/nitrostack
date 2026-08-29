var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { getMachineByUdi, getDatasetStats } from '../../data/dataset.js';
/**
 * Maintenance Tools
 *
 * Contains MCP tools for the predictive maintenance system.
 *
 * Tools:
 * - ping: Health check (Phase 1)
 * - get_machine: Look up a machine record by UDI (Phase 2)
 * - get_dataset_stats: Get summary statistics about the dataset (Phase 2)
 */
export class MaintenanceTools {
    /**
     * Simple health-check tool that confirms the MCP server is responding.
     * Useful for testing connectivity from an AI agent or MCP client.
     */
    async ping(input, ctx) {
        ctx.logger.info('Ping received', { message: input.message });
        return {
            status: 'ok',
            server: 'predictive-maintenance-server',
            timestamp: new Date().toISOString(),
            echo: input.message ?? 'pong'
        };
    }
    /**
     * Look up a single machine record from the AI4I 2020 dataset by its UDI.
     * Returns the full sensor readings and failure status for that machine.
     */
    async getMachine(input, ctx) {
        ctx.logger.info('Looking up machine', { udi: input.udi });
        const machine = getMachineByUdi(input.udi);
        if (!machine) {
            return {
                found: false,
                udi: input.udi,
                message: `No machine found with UDI ${input.udi}`
            };
        }
        return {
            found: true,
            machine
        };
    }
    /**
     * Get summary statistics about the loaded AI4I dataset.
     * Useful for agents to understand the data before running analysis.
     */
    async getStats(_input, ctx) {
        ctx.logger.info('Fetching dataset statistics');
        const stats = getDatasetStats();
        return stats;
    }
}
__decorate([
    Tool({
        name: 'ping',
        description: 'Check if the Predictive Maintenance MCP server is alive and responding',
        inputSchema: z.object({
            message: z.string().optional().describe('Optional message to echo back')
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MaintenanceTools.prototype, "ping", null);
__decorate([
    Tool({
        name: 'get_machine',
        description: 'Retrieve a machine record from the AI4I predictive maintenance dataset by UDI (1–10000)',
        inputSchema: z.object({
            udi: z.number().int().min(1).describe('Unique Device Identifier (1–10000)')
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MaintenanceTools.prototype, "getMachine", null);
__decorate([
    Tool({
        name: 'get_dataset_stats',
        description: 'Get summary statistics about the AI4I predictive maintenance dataset (row count, failure rate, type breakdown)',
        inputSchema: z.object({})
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MaintenanceTools.prototype, "getStats", null);
//# sourceMappingURL=maintenance.tools.js.map