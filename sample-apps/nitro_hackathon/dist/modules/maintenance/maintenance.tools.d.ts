import { ExecutionContext } from '@nitrostack/core';
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
export declare class MaintenanceTools {
    /**
     * Simple health-check tool that confirms the MCP server is responding.
     * Useful for testing connectivity from an AI agent or MCP client.
     */
    ping(input: {
        message?: string;
    }, ctx: ExecutionContext): Promise<{
        status: string;
        server: string;
        timestamp: string;
        echo: string;
    }>;
    /**
     * Look up a single machine record from the AI4I 2020 dataset by its UDI.
     * Returns the full sensor readings and failure status for that machine.
     */
    getMachine(input: {
        udi: number;
    }, ctx: ExecutionContext): Promise<{
        found: boolean;
        udi: number;
        message: string;
        machine?: undefined;
    } | {
        found: boolean;
        machine: import("../../data/dataset.js").MachineRecord;
        udi?: undefined;
        message?: undefined;
    }>;
    /**
     * Get summary statistics about the loaded AI4I dataset.
     * Useful for agents to understand the data before running analysis.
     */
    getStats(_input: Record<string, never>, ctx: ExecutionContext): Promise<import("../../data/dataset.js").DatasetStats>;
}
//# sourceMappingURL=maintenance.tools.d.ts.map