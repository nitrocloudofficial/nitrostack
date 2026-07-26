import { OnApplicationBootstrap, OnModuleDestroy } from "@nitrostack/core";
import { DeviceDataService } from "./device-data.service.js";
import { SyncRegistryService } from "./sync-registry.service.js";
import { ThingsBoardClientService } from "./thingsboard-client.service.js";
export declare class BackgroundSyncService implements OnApplicationBootstrap, OnModuleDestroy {
    private schedulerInterval;
    private isRunning;
    private isSyncing;
    private readonly consecutiveFailures;
    private readonly registryService;
    private readonly tbClient;
    private readonly dataService;
    constructor(registryService?: SyncRegistryService, tbClient?: ThingsBoardClientService, dataService?: DeviceDataService);
    onApplicationBootstrap(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    /**
     * Start the background scheduler
     */
    start(): void;
    /**
     * Stop the background scheduler
     */
    stop(): void;
    /**
     * Continuous background sync loop for all enabled devices
     */
    syncRegisteredDevices(): Promise<void>;
    /**
     * Immediate synchronization of one registered device (MCP Tool target)
     */
    syncDeviceNow(deviceId: string): Promise<number>;
    /**
     * Backfill historical telemetry into Neon without updating scheduler state
     */
    syncDeviceHistory(deviceId: string, keys: string[] | string, startTs: number, endTs: number): Promise<number>;
    /**
     * Incremental sync helper (fetches telemetry keys, retrieves data, inserts and updates timestamp)
     */
    private syncDeviceIncremental;
}
export declare const backgroundSyncService: BackgroundSyncService;
//# sourceMappingURL=background-sync.service.d.ts.map