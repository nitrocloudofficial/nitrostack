// src/visualization/visualization.tools.ts
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ToolDecorator as Tool, Injectable, z } from "@nitrostack/core";
import { visualMappingService, VisualMappingService } from "./visual-mapping.service.js";
import { telemetrySchemaService, TelemetrySchemaService } from "./telemetry-schema.service.js";
import { VisualMappingAgentService } from "./visual-mapping-agent.service.js";
import { validateVisualMapping } from "./validate.js";
import { mapTelemetryToVisualProperties } from "./telemetry-mapper.js";
import { buildDeviceScene } from "./scene-builder.js";
import { DeviceDataService, deviceDataService } from "../modules/sync/device-data.service.js";
let VisualizationTools = class VisualizationTools {
    mappingService;
    schemaService;
    agentService;
    dataService;
    constructor(mappingService, schemaService, agentService, dataService) {
        this.mappingService = mappingService ?? visualMappingService;
        this.schemaService = schemaService ?? telemetrySchemaService;
        this.agentService = agentService ?? new VisualMappingAgentService();
        this.dataService = dataService ?? deviceDataService;
    }
    async generateVisualMapping(input, ctx) {
        ctx.logger.info(`Generating visual mapping for device type: ${input.deviceType}`);
        try {
            const schema = await this.schemaService.getSchema(input.deviceType);
            if (!schema) {
                throw new Error(`Telemetry schema for device type '${input.deviceType}' not found. Please register it first.`);
            }
            const mapping = await this.agentService.generateVisualMapping(input.deviceType, schema);
            validateVisualMapping(mapping, schema);
            await this.mappingService.saveMapping(mapping, "draft");
            return {
                success: true,
                mapping
            };
        }
        catch (e) {
            ctx.logger.error(`Failed to generate visual mapping: ${e.message}`);
            return {
                success: false,
                message: e.message
            };
        }
    }
    async getDevice3DView(input, ctx) {
        ctx.logger.info(`Fetching 3D view for device: ${input.deviceId} of type: ${input.deviceType}`);
        try {
            const mapping = await this.mappingService.getMapping(input.deviceType);
            if (!mapping) {
                const existingMappings = await this.mappingService.listMappings();
                const existingTypes = existingMappings.map(m => m.deviceType).join(", ");
                throw new Error(`Visual mapping for device type '${input.deviceType}' not found. Existing mappings: [${existingTypes || "none"}]`);
            }
            const requiredMetrics = Array.from(new Set(mapping.mappings.map(m => m.metric)));
            const latestReadings = {};
            if (requiredMetrics.length > 0) {
                const pool = this.dataService.getPool();
                const query = `
                    SELECT DISTINCT ON (metric) metric, value
                    FROM device_telemetry
                    WHERE device_id = $1 AND metric = ANY($2::varchar[])
                    ORDER BY metric, timestamp DESC
                `;
                const res = await pool.query(query, [input.deviceId, requiredMetrics]);
                for (const row of res.rows) {
                    latestReadings[row.metric] = parseFloat(row.value);
                }
            }
            const propertyValues = mapTelemetryToVisualProperties(mapping, latestReadings);
            const htmlString = buildDeviceScene(mapping.shape, mapping.mappings, propertyValues, latestReadings);
            return {
                content: [
                    {
                        type: "resource",
                        resource: {
                            uri: `device-scene://${input.deviceId}`,
                            mimeType: "text/html",
                            text: htmlString
                        }
                    },
                    {
                        type: "text",
                        text: htmlString
                    }
                ],
                success: true,
                html: htmlString
            };
        }
        catch (e) {
            ctx.logger.error(`Failed to get device 3D view: ${e.message}`);
            return {
                success: false,
                message: e.message
            };
        }
    }
    async previewVisualMapping(input, ctx) {
        ctx.logger.info(`Generating visual mapping preview for device type: ${input.deviceType}`);
        try {
            const mapping = await this.mappingService.getMapping(input.deviceType);
            if (!mapping) {
                const existingMappings = await this.mappingService.listMappings();
                const existingTypes = existingMappings.map(m => m.deviceType).join(", ");
                throw new Error(`Visual mapping for device type '${input.deviceType}' not found. Existing mappings: [${existingTypes || "none"}]`);
            }
            const latestReadings = {};
            for (const map of mapping.mappings) {
                latestReadings[map.metric] = (map.range.min + map.range.max) / 2;
            }
            const propertyValues = mapTelemetryToVisualProperties(mapping, latestReadings);
            const htmlString = buildDeviceScene(mapping.shape, mapping.mappings, propertyValues, latestReadings);
            return {
                content: [
                    {
                        type: "resource",
                        resource: {
                            uri: `device-scene://${input.deviceType}-preview`,
                            mimeType: "text/html",
                            text: htmlString
                        }
                    },
                    {
                        type: "text",
                        text: htmlString
                    }
                ],
                success: true,
                html: htmlString
            };
        }
        catch (e) {
            ctx.logger.error(`Failed to preview visual mapping: ${e.message}`);
            return {
                success: false,
                message: e.message
            };
        }
    }
};
__decorate([
    Tool({
        name: "generate_visual_mapping",
        description: "Uses AI to generate a 3D visual mapping configuration for a device type based on its telemetry schema.",
        inputSchema: z.object({
            deviceType: z.string().describe("The type of IoT device (e.g. 'centrifugal_pump')")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VisualizationTools.prototype, "generateVisualMapping", null);
__decorate([
    Tool({
        name: "get_device_3d_view",
        description: "Retrieves the 3D scene representation for a specific device, populated with the latest historical telemetry readings.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
            deviceType: z.string().describe("The type of IoT device (e.g. 'centrifugal_pump')")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VisualizationTools.prototype, "getDevice3DView", null);
__decorate([
    Tool({
        name: "preview_visual_mapping",
        description: "Generates a mock 3D scene preview for a device type using midpoint telemetry range values, allowing sanity-checking without device readings.",
        inputSchema: z.object({
            deviceType: z.string().describe("The type of IoT device (e.g. 'centrifugal_pump')")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VisualizationTools.prototype, "previewVisualMapping", null);
VisualizationTools = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [VisualMappingService,
        TelemetrySchemaService,
        VisualMappingAgentService,
        DeviceDataService])
], VisualizationTools);
export { VisualizationTools };
//# sourceMappingURL=visualization.tools.js.map