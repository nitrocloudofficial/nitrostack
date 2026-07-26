import { OnModuleInit, OnModuleDestroy } from "@nitrostack/core";
import { Pool } from "@neondatabase/serverless";
export interface TelemetryReading {
    deviceId: string;
    metric: string;
    value: number;
    timestamp: number;
}
export interface SyncRegistryEntry {
    deviceId: string;
    enabled: boolean;
    syncIntervalSeconds: number;
    lastSyncedTimestamp: number | null;
    createdAt: Date;
    updatedAt: Date;
    lastSyncStatus: string | null;
    lastSyncError: string | null;
}
export declare class DeviceDataService implements OnModuleInit, OnModuleDestroy {
    private pool;
    private readonly connectionString;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    /**
     * Check if the database pool is initialized
     */
    hasPool(): boolean;
    /**
     * Get pg Pool instance
     */
    getPool(): Pool;
    /**
     * Set up database schema if tables do not exist
     * Uses pool.query() directly (required by @neondatabase/serverless)
     */
    ensureSchema(): Promise<void>;
    /**
     * Insert a batch of readings efficiently
     */
    insertReadingsBatch(readings: TelemetryReading[]): Promise<number>;
    /**
     * Query readings from the database
     */
    queryReadings(deviceId: string, metrics: string[], startTs: number, endTs: number): Promise<TelemetryReading[]>;
    /**
     * Query registry entry
     */
    getRegistryEntry(deviceId: string): Promise<SyncRegistryEntry | null>;
    /**
     * Upsert a sync registry entry
     */
    upsertRegistryEntry(deviceId: string, enabled: boolean, syncIntervalSeconds: number, lastSyncedTimestamp: number | null, lastSyncStatus?: string | null, lastSyncError?: string | null): Promise<void>;
    /**
     * Delete a sync registry entry
     */
    deleteRegistryEntry(deviceId: string): Promise<boolean>;
    /**
     * Get all registered devices
     */
    getAllRegistryEntries(): Promise<SyncRegistryEntry[]>;
}
export declare const deviceDataService: DeviceDataService;
//# sourceMappingURL=device-data.service.d.ts.map