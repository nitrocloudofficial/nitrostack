// src/visualization/telemetry-schema.service.ts

import { Injectable, OnModuleInit } from "@nitrostack/core";
import { DeviceDataService, deviceDataService } from "../modules/sync/device-data.service.js";
import { TelemetrySchema } from "./types.js";

@Injectable()
export class TelemetrySchemaService implements OnModuleInit {
    private readonly dataService: DeviceDataService;

    constructor(dataService?: DeviceDataService) {
        this.dataService = dataService ?? deviceDataService;
    }

    async onModuleInit() {
        if (!this.dataService.hasPool()) {
            console.warn("⚠️ Warning: TelemetrySchemaService is skipping table initialization because database pool is not configured.");
            return;
        }
        try {
            const pool = this.dataService.getPool();
            await pool.query(`
                CREATE TABLE IF NOT EXISTS telemetry_schemas (
                    device_type VARCHAR(255) PRIMARY KEY,
                    schema JSONB NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Seed default schemas if they do not exist
            await this.seedDefaultSchemas();
        } catch (error: any) {
            console.error("❌ Failed to initialize telemetry_schemas schema:", error.message);
            throw error;
        }
    }

    private async seedDefaultSchemas() {
        const defaultSchemas: TelemetrySchema[] = [
            {
                deviceType: "centrifugal_pump",
                metrics: [
                    { name: "RPM", unit: "rpm", expectedRange: { min: 0, max: 3600 } },
                    { name: "temperature", unit: "°C", expectedRange: { min: 20, max: 120 } },
                    { name: "flow_rate", unit: "gpm", expectedRange: { min: 0, max: 100 } }
                ]
            },
            {
                deviceType: "smart-home-energy-hub",
                metrics: [
                    { name: "solar_generation", unit: "kW", expectedRange: { min: 0, max: 15 } },
                    { name: "battery_charge", unit: "%", expectedRange: { min: 0, max: 100 } },
                    { name: "grid_flow", unit: "kW", expectedRange: { min: -10, max: 10 } }
                ]
            },
            {
                deviceType: "smart-agriculture-station",
                metrics: [
                    { name: "soil_moisture", unit: "%", expectedRange: { min: 10, max: 90 } },
                    { name: "temperature", unit: "°C", expectedRange: { min: -10, max: 50 } },
                    { name: "humidity", unit: "%", expectedRange: { min: 0, max: 100 } }
                ]
            },
            {
                deviceType: "cold-storage-facility",
                metrics: [
                    { name: "temperature", unit: "°C", expectedRange: { min: -30, max: 10 } },
                    { name: "door_open", unit: "boolean", expectedRange: { min: 0, max: 1 } }
                ]
            }
        ];

        for (const schema of defaultSchemas) {
            const existing = await this.getSchema(schema.deviceType);
            if (!existing) {
                await this.saveSchema(schema);
            }
        }
    }

    async saveSchema(schema: TelemetrySchema): Promise<void> {
        const pool = this.dataService.getPool();
        const query = `
            INSERT INTO telemetry_schemas (device_type, schema)
            VALUES ($1, $2)
            ON CONFLICT (device_type) 
            DO UPDATE SET schema = EXCLUDED.schema
        `;
        await pool.query(query, [schema.deviceType, JSON.stringify(schema)]);
    }

    async getSchema(deviceType: string): Promise<TelemetrySchema | null> {
        const pool = this.dataService.getPool();
        const query = `
            SELECT schema 
            FROM telemetry_schemas 
            WHERE device_type = $1
        `;
        const result = await pool.query(query, [deviceType]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0].schema as TelemetrySchema;
    }

    async listSchemas(): Promise<TelemetrySchema[]> {
        const pool = this.dataService.getPool();
        const query = `
            SELECT schema 
            FROM telemetry_schemas
            ORDER BY device_type ASC
        `;
        const result = await pool.query(query);
        return result.rows.map(row => row.schema as TelemetrySchema);
    }
}

export const telemetrySchemaService = new TelemetrySchemaService();
