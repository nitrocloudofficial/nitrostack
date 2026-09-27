import { DeviceDataService, SyncRegistryEntry } from "./device-data.service.js";
import { ThingsBoardClientService } from "./thingsboard-client.service.js";
export declare class SyncRegistryService {
    private readonly dataService;
    private readonly tbClient;
    constructor(dataService?: DeviceDataService, tbClient?: ThingsBoardClientService);
    /**
     * Register a device for sync
     */
    registerDevice(deviceId: string, syncIntervalSeconds?: number): Promise<SyncRegistryEntry>;
    /**
     * Remove registry entry
     */
    unregisterDevice(deviceId: string): Promise<boolean>;
    /**
     * Disable synchronization for device
     */
    pauseDevice(deviceId: string): Promise<SyncRegistryEntry>;
    /**
     * Resume synchronization for device
     */
    resumeDevice(deviceId: string): Promise<SyncRegistryEntry>;
    /**
     * Update the last sync status of the device
     */
    updateLastSync(deviceId: string, timestamp: number, status?: string, error?: string | null): Promise<void>;
    /**
     * Get all registered devices
     */
    getRegisteredDevices(): Promise<SyncRegistryEntry[]>;
    /**
     * Get enabled devices
     */
    getEnabledDevices(): Promise<SyncRegistryEntry[]>;
    /**
     * Get sync status for device
     */
    getSyncStatus(deviceId: string): Promise<SyncRegistryEntry | null>;
}
export declare const syncRegistryService: SyncRegistryService;
//# sourceMappingURL=sync-registry.service.d.ts.map