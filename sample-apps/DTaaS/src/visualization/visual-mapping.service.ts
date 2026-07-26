// src/visualization/visual-mapping.service.ts

import { Injectable, OnModuleInit } from "@nitrostack/core";
import { DeviceDataService, deviceDataService } from "../modules/sync/device-data.service.js";
import { VisualMapping } from "./types.js";

@Injectable()
export class VisualMappingService implements OnModuleInit {
    private readonly dataService: DeviceDataService;

    constructor(dataService?: DeviceDataService) {
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
        } catch (error: any) {
            console.error("❌ Failed to initialize visual_mappings schema:", error.message);
            throw error;
        }
    }

    async saveMapping(mapping: VisualMapping, status?: string): Promise<void> {
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

    async getMapping(deviceType: string): Promise<VisualMapping | null> {
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
        return result.rows[0].mapping as VisualMapping;
    }

    async listMappings(): Promise<VisualMapping[]> {
        const pool = this.dataService.getPool();
        const query = `
            SELECT mapping 
            FROM visual_mappings
            ORDER BY device_type ASC
        `;
        const result = await pool.query(query);
        return result.rows.map(row => row.mapping as VisualMapping);
    }
}

export const visualMappingService = new VisualMappingService();
