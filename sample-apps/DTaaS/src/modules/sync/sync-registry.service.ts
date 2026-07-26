import { Injectable } from "@nitrostack/core";
import { DeviceDataService, SyncRegistryEntry, deviceDataService } from "./device-data.service.js";
import { ThingsBoardClientService, thingsboardClientService } from "./thingsboard-client.service.js";

@Injectable()
export class SyncRegistryService {
    private readonly dataService: DeviceDataService;
    private readonly tbClient: ThingsBoardClientService;

    constructor(
        dataService?: DeviceDataService,
        tbClient?: ThingsBoardClientService
    ) {
        this.dataService = dataService ?? deviceDataService;
        this.tbClient = tbClient ?? thingsboardClientService;
    }

    /**
     * Register a device for sync
     */
    async registerDevice(deviceId: string, syncIntervalSeconds = 30): Promise<SyncRegistryEntry> {
        // Verify device exists in ThingsBoard
        try {
            await this.tbClient.getDeviceById(deviceId);
        } catch (error: any) {
            throw new Error(`Device '${deviceId}' not found in ThingsBoard: ${error.message}`);
        }

        const now = Date.now();
        // Initialize lastSyncedTimestamp to now (or 0 if backfilling is desired, but standard is starting sync from now)
        await this.dataService.upsertRegistryEntry(
            deviceId,
            true, // enabled
            syncIntervalSeconds,
            now, // lastSyncedTimestamp
            "initialized"
        );

        const entry = await this.dataService.getRegistryEntry(deviceId);
        if (!entry) {
            throw new Error(`Failed to retrieve newly registered device: ${deviceId}`);
        }
        return entry;
    }

    /**
     * Remove registry entry
     */
    async unregisterDevice(deviceId: string): Promise<boolean> {
        return this.dataService.deleteRegistryEntry(deviceId);
    }

    /**
     * Disable synchronization for device
     */
    async pauseDevice(deviceId: string): Promise<SyncRegistryEntry> {
        const entry = await this.dataService.getRegistryEntry(deviceId);
        if (!entry) {
            throw new Error(`Device '${deviceId}' is not registered.`);
        }

        await this.dataService.upsertRegistryEntry(
            deviceId,
            false, // enabled = false
            entry.syncIntervalSeconds,
            entry.lastSyncedTimestamp,
            "paused",
            entry.lastSyncError
        );

        const updated = await this.dataService.getRegistryEntry(deviceId);
        return updated!;
    }

    /**
     * Resume synchronization for device
     */
    async resumeDevice(deviceId: string): Promise<SyncRegistryEntry> {
        const entry = await this.dataService.getRegistryEntry(deviceId);
        if (!entry) {
            throw new Error(`Device '${deviceId}' is not registered.`);
        }

        await this.dataService.upsertRegistryEntry(
            deviceId,
            true, // enabled = true
            entry.syncIntervalSeconds,
            entry.lastSyncedTimestamp,
            "resumed",
            entry.lastSyncError
        );

        const updated = await this.dataService.getRegistryEntry(deviceId);
        return updated!;
    }

    /**
     * Update the last sync status of the device
     */
    async updateLastSync(
        deviceId: string,
        timestamp: number,
        status: string = "success",
        error: string | null = null
    ): Promise<void> {
        const entry = await this.dataService.getRegistryEntry(deviceId);
        if (!entry) {
            throw new Error(`Device '${deviceId}' is not registered.`);
        }

        await this.dataService.upsertRegistryEntry(
            deviceId,
            entry.enabled,
            entry.syncIntervalSeconds,
            timestamp,
            status,
            error
        );
    }

    /**
     * Get all registered devices
     */
    async getRegisteredDevices(): Promise<SyncRegistryEntry[]> {
        return this.dataService.getAllRegistryEntries();
    }

    /**
     * Get enabled devices
     */
    async getEnabledDevices(): Promise<SyncRegistryEntry[]> {
        const entries = await this.dataService.getAllRegistryEntries();
        return entries.filter(e => e.enabled);
    }

    /**
     * Get sync status for device
     */
    async getSyncStatus(deviceId: string): Promise<SyncRegistryEntry | null> {
        return this.dataService.getRegistryEntry(deviceId);
    }
}

export const syncRegistryService = new SyncRegistryService();
