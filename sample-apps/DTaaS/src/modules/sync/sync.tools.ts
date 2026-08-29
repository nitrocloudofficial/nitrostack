import { ToolDecorator as Tool, ExecutionContext, Injectable, z, Widget } from "@nitrostack/core";
import { SyncRegistryService, syncRegistryService } from "./sync-registry.service.js";
import { BackgroundSyncService, backgroundSyncService } from "./background-sync.service.js";

@Injectable()
export class SyncTools {
    private readonly registryService: SyncRegistryService = syncRegistryService;
    private readonly syncService: BackgroundSyncService = backgroundSyncService;

    @Tool({
        name: "register_device_for_sync",
        description: "Register a device for automatic background telemetry synchronization from ThingsBoard to Neon.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
            syncIntervalSeconds: z.number().optional().describe("Sync interval in seconds (default: 30)"),
        }),
    })
    async registerDevice(
        input: { deviceId: string; syncIntervalSeconds?: number },
        ctx: ExecutionContext
    ) {
        ctx.logger.info(`Registering device: ${input.deviceId} with interval ${input.syncIntervalSeconds ?? 30}s`);
        try {
            const entry = await this.registryService.registerDevice(input.deviceId, input.syncIntervalSeconds ?? 30);
            return {
                success: true,
                message: `Device '${input.deviceId}' registered successfully.`,
                device: {
                    deviceId: entry.deviceId,
                    enabled: entry.enabled,
                    syncIntervalSeconds: entry.syncIntervalSeconds,
                    lastSyncedTimestamp: entry.lastSyncedTimestamp,
                },
            };
        } catch (error: any) {
            ctx.logger.error(`Failed to register device: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    @Tool({
        name: "unregister_device_for_sync",
        description: "Unregister a device and stop its automatic background synchronization, removing its registry entry.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
        }),
    })
    async unregisterDevice(input: { deviceId: string }, ctx: ExecutionContext) {
        ctx.logger.info(`Unregistering device: ${input.deviceId}`);
        try {
            const deleted = await this.registryService.unregisterDevice(input.deviceId);
            if (deleted) {
                return { success: true, message: `Device '${input.deviceId}' unregistered successfully.` };
            } else {
                return { success: false, error: `Device '${input.deviceId}' was not registered.` };
            }
        } catch (error: any) {
            ctx.logger.error(`Failed to unregister device: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    @Tool({
        name: "pause_device_sync",
        description: "Pause telemetry synchronization for a registered device.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
        }),
    })
    async pauseDevice(input: { deviceId: string }, ctx: ExecutionContext) {
        ctx.logger.info(`Pausing sync for device: ${input.deviceId}`);
        try {
            const entry = await this.registryService.pauseDevice(input.deviceId);
            return {
                success: true,
                message: `Device '${input.deviceId}' synchronization paused.`,
                device: {
                    deviceId: entry.deviceId,
                    enabled: entry.enabled,
                },
            };
        } catch (error: any) {
            ctx.logger.error(`Failed to pause device sync: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    @Tool({
        name: "resume_device_sync",
        description: "Resume telemetry synchronization for a paused device.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
        }),
    })
    async resumeDevice(input: { deviceId: string }, ctx: ExecutionContext) {
        ctx.logger.info(`Resuming sync for device: ${input.deviceId}`);
        try {
            const entry = await this.registryService.resumeDevice(input.deviceId);
            return {
                success: true,
                message: `Device '${input.deviceId}' synchronization resumed.`,
                device: {
                    deviceId: entry.deviceId,
                    enabled: entry.enabled,
                },
            };
        } catch (error: any) {
            ctx.logger.error(`Failed to resume device sync: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    @Tool({
        name: "get_device_sync_status",
        description: "Get the current synchronization status, last synced timestamp, and error details of a device.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
        }),
    })
    @Widget({ route: "sync-status" })
    async getDeviceSyncStatus(input: { deviceId: string }, ctx: ExecutionContext) {
        ctx.logger.info(`Fetching sync status for device: ${input.deviceId}`);
        try {
            const status = await this.registryService.getSyncStatus(input.deviceId);
            if (!status) {
                return { success: false, error: `Device '${input.deviceId}' is not registered.` };
            }
            return {
                success: true,
                status: {
                    enabled: status.enabled,
                    lastSyncedTimestamp: status.lastSyncedTimestamp,
                    lastSyncStatus: status.lastSyncStatus,
                    lastSyncError: status.lastSyncError,
                    syncIntervalSeconds: status.syncIntervalSeconds,
                },
            };
        } catch (error: any) {
            ctx.logger.error(`Failed to get device sync status: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    @Tool({
        name: "sync_device_now",
        description: "Immediately trigger a telemetry synchronization for a registered device from ThingsBoard to Neon.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
        }),
    })
    async syncDeviceNow(input: { deviceId: string }, ctx: ExecutionContext) {
        ctx.logger.info(`Manual sync requested for device: ${input.deviceId}`);
        try {
            const rowCount = await this.syncService.syncDeviceNow(input.deviceId);
            return {
                success: true,
                message: `Successfully synchronized device '${input.deviceId}'.`,
                rowCount,
            };
        } catch (error: any) {
            ctx.logger.error(`Manual sync failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    @Tool({
        name: "backfill_device_history",
        description: "Backfill historical telemetry data from ThingsBoard into Neon without updating scheduler state.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
            keys: z.array(z.string()).describe("List of telemetry keys to sync"),
            startTs: z.number().describe("Start timestamp in milliseconds"),
            endTs: z.number().describe("End timestamp in milliseconds"),
        }),
    })
    async backfillDeviceHistory(
        input: { deviceId: string; keys: string[]; startTs: number; endTs: number },
        ctx: ExecutionContext
    ) {
        ctx.logger.info(`History backfill requested for device: ${input.deviceId} [${input.startTs} -> ${input.endTs}]`);
        try {
            // Validation
            if (input.endTs < input.startTs) {
                return { success: false, error: "endTs must be greater than or equal to startTs" };
            }
            if (input.keys.length === 0) {
                return { success: false, error: "keys/metrics list cannot be empty" };
            }

            const rowCount = await this.syncService.syncDeviceHistory(
                input.deviceId,
                input.keys,
                input.startTs,
                input.endTs
            );
            return {
                success: true,
                message: `Successfully backfilled ${rowCount} telemetry rows.`,
                rowCount,
            };
        } catch (error: any) {
            ctx.logger.error(`History backfill failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}
