// src/visualization/visual-mapping.service.ts
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
let VisualMappingService = class VisualMappingService {
    dataService;
    constructor(dataService) {
        this.dataService = dataService ?? deviceDataService;
    }
    async onModuleInit() {
        if (!this.dataService.hasPool()) {
            console.warn("⚠️ Warning: VisualMappingService is skipping table initialization because database pool is not configured.");
            return;
        }
        try {
            const pool = this.dataService.getPool();
            await pool.query(`
                CREATE TABLE IF NOT EXISTS visual_mappings (
                    device_type VARCHAR(255) PRIMARY KEY,
                    mapping JSONB NOT NULL,
                    status VARCHAR(50) DEFAULT 'draft',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);
        }
        catch (error) {
            console.error("❌ Failed to initialize visual_mappings schema:", error.message);
            throw error;
        }
    }
    async saveMapping(mapping, status) {
        const pool = this.dataService.getPool();
        const statusVal = status ?? 'draft';
        const query = `
            INSERT INTO visual_mappings (device_type, mapping, status)
            VALUES ($1, $2, $3)
            ON CONFLICT (device_type) 
            DO UPDATE SET 
                mapping = EXCLUDED.mapping,
                status = EXCLUDED.status
        `;
        await pool.query(query, [mapping.deviceType, JSON.stringify(mapping), statusVal]);
    }
    async getMapping(deviceType) {
        const pool = this.dataService.getPool();
        const query = `
            SELECT mapping 
            FROM visual_mappings 
            WHERE device_type = $1
        `;
        const result = await pool.query(query, [deviceType]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0].mapping;
    }
    async listMappings() {
        const pool = this.dataService.getPool();
        const query = `
            SELECT mapping 
            FROM visual_mappings
            ORDER BY device_type ASC
        `;
        const result = await pool.query(query);
        return result.rows.map(row => row.mapping);
    }
};
VisualMappingService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [DeviceDataService])
], VisualMappingService);
export { VisualMappingService };
export const visualMappingService = new VisualMappingService();
//# sourceMappingURL=visual-mapping.service.js.map