var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from "@nitrostack/core";
import { DeviceDataService, deviceDataService } from "./device-data.service.js";
import { SyncRegistryService, syncRegistryService } from "./sync-registry.service.js";
import { ThingsBoardClientService, thingsboardClientService } from "./thingsboard-client.service.js";
let BackgroundSyncService = class BackgroundSyncService {
    schedulerInterval = null;
    isRunning = false;
    isSyncing = false; // Lock to prevent overlapping scheduler executions
    registryService;
    tbClient;
    dataService;
    constructor(registryService, tbClient, dataService) {
        this.registryService = registryService ?? syncRegistryService;
        this.tbClient = tbClient ?? thingsboardClientService;
        this.dataService = dataService ?? deviceDataService;
    }
    async onApplicationBootstrap() {
        if (!this.dataService.hasPool()) {
            console.warn("⚠️ Background Telemetry Sync is disabled: DATABASE_URL is not configured.");
            return;
        }
        console.log("🚀 Starting Background Telemetry Synchronization Service...");
        this.start();
    }
    async onModuleDestroy() {
        console.log("🛑 Stopping Background Telemetry Synchronization Service...");
        this.stop();
    }
    /**
     * Start the background scheduler
     */
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        // Check for due devices every 10 seconds
        this.schedulerInterval = setInterval(() => {
            this.syncRegisteredDevices().catch(err => {
                console.error("Error during scheduled telemetry sync:", err);
            });
        }, 10000);
    }
    /**
     * Stop the background scheduler
     */
    stop() {
        this.isRunning = false;
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
    }
    /**
     * Continuous background sync loop for all enabled devices
     */
    async syncRegisteredDevices() {
        if (!this.dataService.hasPool())
            return;
        if (this.isSyncing) {
            console.log("⚠️ Background sync is already running. Skipping overlap execution.");
            return;
        }
        this.isSyncing = true;
        try {
            const enabledDevices = await this.registryService.getEnabledDevices();
            const now = Date.now();
            for (const device of enabledDevices) {
                const lastSynced = device.lastSyncedTimestamp || 0;
                const intervalMs = device.syncIntervalSeconds * 1000;
                // Sync if device is due
                if (lastSynced + intervalMs <= now) {
                    try {
                        console.log(`Syncing device ${device.deviceId} incrementally...`);
                        await this.syncDeviceIncremental(device.deviceId, lastSynced, now);
                    }
                    catch (deviceError) {
                        console.error(`❌ Failed to sync telemetry for device ${device.deviceId}:`, deviceError.message);
                        // Update sync registry with error status
                        await this.registryService.updateLastSync(device.deviceId, lastSynced, // don't update timestamp on failure
                        "error", deviceError.message);
                    }
                }
            }
        }
        finally {
            this.isSyncing = false;
        }
    }
    /**
     * Immediate synchronization of one registered device (MCP Tool target)
     */
    async syncDeviceNow(deviceId) {
        const entry = await this.registryService.getSyncStatus(deviceId);
        if (!entry) {
            throw new Error(`Device '${deviceId}' is not registered for synchronization.`);
        }
        const now = Date.now();
        const lastSynced = entry.lastSyncedTimestamp || 0;
        try {
            const rowCount = await this.syncDeviceIncremental(deviceId, lastSynced, now);
            return rowCount;
        }
        catch (error) {
            console.error(`❌ Manual sync failed for device ${deviceId}:`, error.message);
            await this.registryService.updateLastSync(deviceId, lastSynced, "error", error.message);
            throw error;
        }
    }
    /**
     * Backfill historical telemetry into Neon without updating scheduler state
     */
    async syncDeviceHistory(deviceId, keys, startTs, endTs) {
        const keyList = typeof keys === "string"
            ? keys.split(",").map(k => k.trim()).filter(Boolean)
            : keys;
        // Validate inputs
        if (endTs < startTs) {
            throw new Error("endTs must be greater than or equal to startTs");
        }
        if (!keyList || keyList.length === 0) {
            throw new Error("metrics/keys list cannot be empty");
        }
        console.log(`Backfilling history for device ${deviceId} [${startTs} -> ${endTs}] for keys: ${keyList.join(",")}`);
        // Fetch telemetry from ThingsBoard
        const telemetryData = await this.tbClient.getTelemetryRange(deviceId, keyList, startTs, endTs);
        // Convert to database rows
        const readings = [];
        for (const [key, values] of Object.entries(telemetryData)) {
            for (const val of values) {
                const numVal = parseFloat(val.value);
                if (!isNaN(numVal)) {
                    readings.push({
                        deviceId,
                        metric: key,
                        value: numVal,
                        timestamp: val.ts,
                    });
                }
            }
        }
        if (readings.length === 0) {
            console.log(`No historical data found on ThingsBoard for device ${deviceId} in the range.`);
            return 0;
        }
        // Insert into Neon
        const rowCount = await this.dataService.insertReadingsBatch(readings);
        console.log(`Successfully backfilled ${rowCount} telemetry rows into Neon for device ${deviceId}`);
        return rowCount;
    }
    /**
     * Incremental sync helper (fetches telemetry keys, retrieves data, inserts and updates timestamp)
     */
    async syncDeviceIncremental(deviceId, startTs, endTs) {
        // Fetch all telemetry keys first
        const keys = await this.tbClient.getTelemetryKeys(deviceId);
        if (keys.length === 0) {
            console.log(`No telemetry keys found for device ${deviceId}.`);
            await this.registryService.updateLastSync(deviceId, endTs, "success", "No telemetry keys found");
            return 0;
        }
        // Fetch telemetry range (+1 ms to avoid duplicating the last synced point if any)
        const queryStart = startTs > 0 ? startTs + 1 : startTs;
        const telemetryData = await this.tbClient.getTelemetryRange(deviceId, keys, queryStart, endTs);
        // Convert to database rows
        const readings = [];
        for (const [key, values] of Object.entries(telemetryData)) {
            for (const val of values) {
                const numVal = parseFloat(val.value);
                if (!isNaN(numVal)) {
                    readings.push({
                        deviceId,
                        metric: key,
                        value: numVal,
                        timestamp: val.ts,
                    });
                }
            }
        }
        let inserted = 0;
        if (readings.length > 0) {
            inserted = await this.dataService.insertReadingsBatch(readings);
        }
        // Update registry with success status
        await this.registryService.updateLastSync(deviceId, endTs, "success", null);
        console.log(`Incremental sync completed for device ${deviceId}. Inserted ${inserted} rows.`);
        return inserted;
    }
};
BackgroundSyncService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [SyncRegistryService,
        ThingsBoardClientService,
        DeviceDataService])
], BackgroundSyncService);
export { BackgroundSyncService };
export const backgroundSyncService = new BackgroundSyncService();
//# sourceMappingURL=background-sync.service.js.map