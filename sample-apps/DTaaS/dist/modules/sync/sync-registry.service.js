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
import { ThingsBoardClientService, thingsboardClientService } from "./thingsboard-client.service.js";
let SyncRegistryService = class SyncRegistryService {
    dataService;
    tbClient;
    constructor(dataService, tbClient) {
        this.dataService = dataService ?? deviceDataService;
        this.tbClient = tbClient ?? thingsboardClientService;
    }
    /**
     * Register a device for sync
     */
    async registerDevice(deviceId, syncIntervalSeconds = 30) {
        // Verify device exists in ThingsBoard
        try {
            await this.tbClient.getDeviceById(deviceId);
        }
        catch (error) {
            throw new Error(`Device '${deviceId}' not found in ThingsBoard: ${error.message}`);
        }
        const now = Date.now();
        // Initialize lastSyncedTimestamp to now (or 0 if backfilling is desired, but standard is starting sync from now)
        await this.dataService.upsertRegistryEntry(deviceId, true, // enabled
        syncIntervalSeconds, now, // lastSyncedTimestamp
        "initialized");
        const entry = await this.dataService.getRegistryEntry(deviceId);
        if (!entry) {
            throw new Error(`Failed to retrieve newly registered device: ${deviceId}`);
        }
        return entry;
    }
    /**
     * Remove registry entry
     */
    async unregisterDevice(deviceId) {
        return this.dataService.deleteRegistryEntry(deviceId);
    }
    /**
     * Disable synchronization for device
     */
    async pauseDevice(deviceId) {
        const entry = await this.dataService.getRegistryEntry(deviceId);
        if (!entry) {
            throw new Error(`Device '${deviceId}' is not registered.`);
        }
        await this.dataService.upsertRegistryEntry(deviceId, false, // enabled = false
        entry.syncIntervalSeconds, entry.lastSyncedTimestamp, "paused", entry.lastSyncError);
        const updated = await this.dataService.getRegistryEntry(deviceId);
        return updated;
    }
    /**
     * Resume synchronization for device
     */
    async resumeDevice(deviceId) {
        const entry = await this.dataService.getRegistryEntry(deviceId);
        if (!entry) {
            throw new Error(`Device '${deviceId}' is not registered.`);
        }
        await this.dataService.upsertRegistryEntry(deviceId, true, // enabled = true
        entry.syncIntervalSeconds, entry.lastSyncedTimestamp, "resumed", entry.lastSyncError);
        const updated = await this.dataService.getRegistryEntry(deviceId);
        return updated;
    }
    /**
     * Update the last sync status of the device
     */
    async updateLastSync(deviceId, timestamp, status = "success", error = null) {
        const entry = await this.dataService.getRegistryEntry(deviceId);
        if (!entry) {
            throw new Error(`Device '${deviceId}' is not registered.`);
        }
        await this.dataService.upsertRegistryEntry(deviceId, entry.enabled, entry.syncIntervalSeconds, timestamp, status, error);
    }
    /**
     * Get all registered devices
     */
    async getRegisteredDevices() {
        return this.dataService.getAllRegistryEntries();
    }
    /**
     * Get enabled devices
     */
    async getEnabledDevices() {
        const entries = await this.dataService.getAllRegistryEntries();
        return entries.filter(e => e.enabled);
    }
    /**
     * Get sync status for device
     */
    async getSyncStatus(deviceId) {
        return this.dataService.getRegistryEntry(deviceId);
    }
};
SyncRegistryService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [DeviceDataService,
        ThingsBoardClientService])
], SyncRegistryService);
export { SyncRegistryService };
export const syncRegistryService = new SyncRegistryService();
//# sourceMappingURL=sync-registry.service.js.map