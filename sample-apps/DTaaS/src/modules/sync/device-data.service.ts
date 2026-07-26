import { Injectable, OnModuleInit, OnModuleDestroy } from "@nitrostack/core";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { createRequire } from "module";
import * as dotenv from "dotenv";

dotenv.config();

// Required for @neondatabase/serverless in Node.js environments
// createRequire avoids needing @types/ws type declarations
const _require = createRequire(import.meta.url);
neonConfig.webSocketConstructor = _require("ws");

export interface TelemetryReading {
    deviceId: string;
    metric: string;
    value: number;
    timestamp: number; // epoch ms
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

@Injectable()
export class DeviceDataService implements OnModuleInit, OnModuleDestroy {
    private pool: Pool | null = null;
    private readonly connectionString = process.env.DATABASE_URL;

    async onModuleInit() {
        if (!this.connectionString) {
            console.warn("⚠️ Warning: DATABASE_URL is not set in environment variables. Database sync features will be disabled until configured.");
            return;
        }

        this.pool = new Pool({
            connectionString: this.connectionString,
        });

        // Initialize schema
        await this.ensureSchema();
    }

    async onModuleDestroy() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }

    /**
     * Check if the database pool is initialized
     */
    hasPool(): boolean {
        return this.pool !== null;
    }

    /**
     * Get pg Pool instance
     */
    getPool(): Pool {
        if (!this.pool) {
            throw new Error("Database pool is not initialized.");
        }
        return this.pool;
    }

    /**
     * Set up database schema if tables do not exist
     * Uses pool.query() directly (required by @neondatabase/serverless)
     */
    async ensureSchema(): Promise<void> {
        const pool = this.getPool();
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS device_sync_registry (
                    device_id VARCHAR(255) PRIMARY KEY,
                    enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    sync_interval_seconds INTEGER NOT NULL DEFAULT 30,
                    last_synced_timestamp BIGINT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    last_sync_status VARCHAR(50),
                    last_sync_error TEXT
                );
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS device_telemetry (
                    id SERIAL PRIMARY KEY,
                    device_id VARCHAR(255) NOT NULL,
                    metric VARCHAR(255) NOT NULL,
                    value DOUBLE PRECISION NOT NULL,
                    timestamp BIGINT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_device_telemetry_query 
                ON device_telemetry (device_id, metric, timestamp);
            `);
        } catch (error: any) {
            console.error("❌ Failed to initialize database schema:", error.message);
            throw error;
        }
    }

    /**
     * Insert a batch of readings efficiently
     */
    async insertReadingsBatch(readings: TelemetryReading[]): Promise<number> {
        if (readings.length === 0) return 0;

        const pool = this.getPool();
        const chunkSize = 1000;
        let insertedCount = 0;

        for (let i = 0; i < readings.length; i += chunkSize) {
            const chunk = readings.slice(i, i + chunkSize);
            const valueStrings: string[] = [];
            const values: any[] = [];

            chunk.forEach((reading, index) => {
                const offset = index * 4;
                valueStrings.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
                values.push(reading.deviceId, reading.metric, reading.value, reading.timestamp);
            });

            const query = `
                INSERT INTO device_telemetry (device_id, metric, value, timestamp)
                VALUES ${valueStrings.join(", ")}
            `;

            await pool.query(query, values);
            insertedCount += chunk.length;
        }

        return insertedCount;
    }

    /**
     * Query readings from the database
     */
    async queryReadings(
        deviceId: string,
        metrics: string[],
        startTs: number,
        endTs: number
    ): Promise<TelemetryReading[]> {
        const pool = this.getPool();
        const query = `
            SELECT device_id as "deviceId", metric, value, timestamp
            FROM device_telemetry
            WHERE device_id = $1
              AND metric = ANY($2::varchar[])
              AND timestamp >= $3
              AND timestamp <= $4
            ORDER BY timestamp ASC
        `;
        const result = await pool.query(query, [deviceId, metrics, startTs, endTs]);
        return result.rows.map(row => ({
            deviceId: row.deviceId,
            metric: row.metric,
            value: parseFloat(row.value),
            timestamp: parseInt(row.timestamp, 10),
        }));
    }

    /**
     * Query registry entry
     */
    async getRegistryEntry(deviceId: string): Promise<SyncRegistryEntry | null> {
        const pool = this.getPool();
        const result = await pool.query(
            `SELECT device_id as "deviceId", enabled, sync_interval_seconds as "syncIntervalSeconds", 
                    last_synced_timestamp as "lastSyncedTimestamp", created_at as "createdAt", 
                    updated_at as "updatedAt", last_sync_status as "lastSyncStatus", last_sync_error as "lastSyncError"
             FROM device_sync_registry WHERE device_id = $1`,
            [deviceId]
        );
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return {
            deviceId: row.deviceId,
            enabled: row.enabled,
            syncIntervalSeconds: row.syncIntervalSeconds,
            lastSyncedTimestamp: row.lastSyncedTimestamp ? parseInt(row.lastSyncedTimestamp, 10) : null,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            lastSyncStatus: row.lastSyncStatus,
            lastSyncError: row.lastSyncError,
        };
    }

    /**
     * Upsert a sync registry entry
     */
    async upsertRegistryEntry(
        deviceId: string,
        enabled: boolean,
        syncIntervalSeconds: number,
        lastSyncedTimestamp: number | null,
        lastSyncStatus: string | null = null,
        lastSyncError: string | null = null
    ): Promise<void> {
        const pool = this.getPool();
        const query = `
            INSERT INTO device_sync_registry 
            (device_id, enabled, sync_interval_seconds, last_synced_timestamp, last_sync_status, last_sync_error, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (device_id) DO UPDATE SET
                enabled = EXCLUDED.enabled,
                sync_interval_seconds = EXCLUDED.sync_interval_seconds,
                last_synced_timestamp = COALESCE(EXCLUDED.last_synced_timestamp, device_sync_registry.last_synced_timestamp),
                last_sync_status = EXCLUDED.last_sync_status,
                last_sync_error = EXCLUDED.last_sync_error,
                updated_at = NOW()
        `;
        await pool.query(query, [deviceId, enabled, syncIntervalSeconds, lastSyncedTimestamp, lastSyncStatus, lastSyncError]);
    }

    /**
     * Delete a sync registry entry
     */
    async deleteRegistryEntry(deviceId: string): Promise<boolean> {
        const pool = this.getPool();
        const result = await pool.query("DELETE FROM device_sync_registry WHERE device_id = $1", [deviceId]);
        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Get all registered devices
     */
    async getAllRegistryEntries(): Promise<SyncRegistryEntry[]> {
        const pool = this.getPool();
        const result = await pool.query(
            `SELECT device_id as "deviceId", enabled, sync_interval_seconds as "syncIntervalSeconds", 
                    last_synced_timestamp as "lastSyncedTimestamp", created_at as "createdAt", 
                    updated_at as "updatedAt", last_sync_status as "lastSyncStatus", last_sync_error as "lastSyncError"
             FROM device_sync_registry ORDER BY created_at ASC`
        );
        return result.rows.map(row => ({
            deviceId: row.deviceId,
            enabled: row.enabled,
            syncIntervalSeconds: row.syncIntervalSeconds,
            lastSyncedTimestamp: row.lastSyncedTimestamp ? parseInt(row.lastSyncedTimestamp, 10) : null,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            lastSyncStatus: row.lastSyncStatus,
            lastSyncError: row.lastSyncError,
        }));
    }
}

export const deviceDataService = new DeviceDataService();
