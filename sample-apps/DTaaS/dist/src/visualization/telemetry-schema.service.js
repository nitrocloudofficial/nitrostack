// src/visualization/telemetry-schema.service.ts
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
import { DeviceDataService, deviceDataService } from "../modules/sync/device-data.service.js";
let TelemetrySchemaService = class TelemetrySchemaService {
    dataService;
    constructor(dataService) {
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
        }
        catch (error) {
            console.error("❌ Failed to initialize telemetry_schemas schema:", error.message);
            throw error;
        }
    }
    async seedDefaultSchemas() {
        const defaultSchemas = [
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
    async saveSchema(schema) {
        const pool = this.dataService.getPool();
        const query = `
            INSERT INTO telemetry_schemas (device_type, schema)
            VALUES ($1, $2)
            ON CONFLICT (device_type) 
            DO UPDATE SET schema = EXCLUDED.schema
        `;
        await pool.query(query, [schema.deviceType, JSON.stringify(schema)]);
    }
    async getSchema(deviceType) {
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
        return result.rows[0].schema;
    }
    async listSchemas() {
        const pool = this.dataService.getPool();
        const query = `
            SELECT schema 
            FROM telemetry_schemas
            ORDER BY device_type ASC
        `;
        const result = await pool.query(query);
        return result.rows.map(row => row.schema);
    }
};
TelemetrySchemaService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [DeviceDataService])
], TelemetrySchemaService);
export { TelemetrySchemaService };
export const telemetrySchemaService = new TelemetrySchemaService();
//# sourceMappingURL=telemetry-schema.service.js.map