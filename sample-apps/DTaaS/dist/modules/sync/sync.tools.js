var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ToolDecorator as Tool, Injectable, z } from "@nitrostack/core";
import { syncRegistryService } from "./sync-registry.service.js";
import { backgroundSyncService } from "./background-sync.service.js";
let SyncTools = class SyncTools {
    registryService = syncRegistryService;
    syncService = backgroundSyncService;
    async registerDevice(input, ctx) {
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
        }
        catch (error) {
            ctx.logger.error(`Failed to register device: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    async unregisterDevice(input, ctx) {
        ctx.logger.info(`Unregistering device: ${input.deviceId}`);
        try {
            const deleted = await this.registryService.unregisterDevice(input.deviceId);
            if (deleted) {
                return { success: true, message: `Device '${input.deviceId}' unregistered successfully.` };
            }
            else {
                return { success: false, error: `Device '${input.deviceId}' was not registered.` };
            }
        }
        catch (error) {
            ctx.logger.error(`Failed to unregister device: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    async pauseDevice(input, ctx) {
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
        }
        catch (error) {
            ctx.logger.error(`Failed to pause device sync: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    async resumeDevice(input, ctx) {
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
        }
        catch (error) {
            ctx.logger.error(`Failed to resume device sync: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    async getDeviceSyncStatus(input, ctx) {
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
        }
        catch (error) {
            ctx.logger.error(`Failed to get device sync status: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    async syncDeviceNow(input, ctx) {
        ctx.logger.info(`Manual sync requested for device: ${input.deviceId}`);
        try {
            const rowCount = await this.syncService.syncDeviceNow(input.deviceId);
            return {
                success: true,
                message: `Successfully synchronized device '${input.deviceId}'.`,
                rowCount,
            };
        }
        catch (error) {
            ctx.logger.error(`Manual sync failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    async backfillDeviceHistory(input, ctx) {
        ctx.logger.info(`History backfill requested for device: ${input.deviceId} [${input.startTs} -> ${input.endTs}]`);
        try {
            // Validation
            if (input.endTs < input.startTs) {
                return { success: false, error: "endTs must be greater than or equal to startTs" };
            }
            if (input.keys.length === 0) {
                return { success: false, error: "keys/metrics list cannot be empty" };
            }
            const rowCount = await this.syncService.syncDeviceHistory(input.deviceId, input.keys, input.startTs, input.endTs);
            return {
                success: true,
                message: `Successfully backfilled ${rowCount} telemetry rows.`,
                rowCount,
            };
        }
        catch (error) {
            ctx.logger.error(`History backfill failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
};
__decorate([
    Tool({
        name: "register_device_for_sync",
        description: "Register a device for automatic background telemetry synchronization from ThingsBoard to Neon.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
            syncIntervalSeconds: z.number().optional().describe("Sync interval in seconds (default: 30)"),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SyncTools.prototype, "registerDevice", null);
__decorate([
    Tool({
        name: "unregister_device_for_sync",
        description: "Unregister a device and stop its automatic background synchronization, removing its registry entry.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SyncTools.prototype, "unregisterDevice", null);
__decorate([
    Tool({
        name: "pause_device_sync",
        description: "Pause telemetry synchronization for a registered device.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SyncTools.prototype, "pauseDevice", null);
__decorate([
    Tool({
        name: "resume_device_sync",
        description: "Resume telemetry synchronization for a paused device.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SyncTools.prototype, "resumeDevice", null);
__decorate([
    Tool({
        name: "get_device_sync_status",
        description: "Get the current synchronization status, last synced timestamp, and error details of a device.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SyncTools.prototype, "getDeviceSyncStatus", null);
__decorate([
    Tool({
        name: "sync_device_now",
        description: "Immediately trigger a telemetry synchronization for a registered device from ThingsBoard to Neon.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SyncTools.prototype, "syncDeviceNow", null);
__decorate([
    Tool({
        name: "backfill_device_history",
        description: "Backfill historical telemetry data from ThingsBoard into Neon without updating scheduler state.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
            keys: z.array(z.string()).describe("List of telemetry keys to sync"),
            startTs: z.number().describe("Start timestamp in milliseconds"),
            endTs: z.number().describe("End timestamp in milliseconds"),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SyncTools.prototype, "backfillDeviceHistory", null);
SyncTools = __decorate([
    Injectable()
], SyncTools);
export { SyncTools };
//# sourceMappingURL=sync.tools.js.map