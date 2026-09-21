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
import { telemetryAnalyticsService } from "./telemetry-analytics.service.js";
let AnalyticsTools = class AnalyticsTools {
    analyticsService = telemetryAnalyticsService;
    async queryDeviceHistory(input, ctx) {
        ctx.logger.info(`Querying history for device: ${input.deviceId} [${input.startTs} -> ${input.endTs}]`);
        try {
            // Validation
            if (input.endTs < input.startTs) {
                return { success: false, error: "Validation error: endTs must be greater than or equal to startTs" };
            }
            if (input.metrics.length === 0) {
                return { success: false, error: "Validation error: metrics list cannot be empty" };
            }
            const data = await this.analyticsService.queryHistoricalTelemetry(input.deviceId, input.metrics, input.startTs, input.endTs);
            return {
                success: true,
                count: data.length,
                data,
            };
        }
        catch (error) {
            ctx.logger.error(`History query failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    async getDeviceStatistics(input, ctx) {
        ctx.logger.info(`Getting stats for device: ${input.deviceId}, metric: ${input.metric}`);
        try {
            // Validation
            if (input.endTs < input.startTs) {
                return { success: false, error: "Validation error: endTs must be greater than or equal to startTs" };
            }
            const stats = await this.analyticsService.getTelemetryStatistics(input.deviceId, input.metric, input.startTs, input.endTs);
            return {
                success: true,
                stats,
            };
        }
        catch (error) {
            ctx.logger.error(`Stats calculation failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    async createTrainingDataset(input, ctx) {
        ctx.logger.info(`Generating ML training dataset in ${input.format} format`);
        try {
            // Validation
            if (input.endTs < input.startTs) {
                return { success: false, error: "Validation error: endTs must be greater than or equal to startTs" };
            }
            if (input.deviceIds.length === 0) {
                return { success: false, error: "Validation error: deviceIds list cannot be empty" };
            }
            if (input.metrics.length === 0) {
                return { success: false, error: "Validation error: metrics list cannot be empty" };
            }
            const result = await this.analyticsService.createTrainingDataset(input.deviceIds, input.metrics, input.startTs, input.endTs, input.format);
            return {
                success: true,
                metadata: result.metadata,
                dataset: result.data,
            };
        }
        catch (error) {
            ctx.logger.error(`Dataset generation failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    async exportDeviceCSV(input, ctx) {
        ctx.logger.info("Exporting telemetry CSV");
        try {
            // Validation
            if (input.endTs < input.startTs) {
                return { success: false, error: "Validation error: endTs must be greater than or equal to startTs" };
            }
            if (input.deviceIds.length === 0) {
                return { success: false, error: "Validation error: deviceIds list cannot be empty" };
            }
            if (input.metrics.length === 0) {
                return { success: false, error: "Validation error: metrics list cannot be empty" };
            }
            const result = await this.analyticsService.exportTelemetryCSV(input.deviceIds, input.metrics, input.startTs, input.endTs);
            return {
                success: true,
                filename: result.filename,
                rowCount: result.rowCount,
                downloadInfo: `File successfully exported to server scratch directory. Filename: ${result.filename}`,
                csvContent: result.csvContent, // Return content as part of download information
            };
        }
        catch (error) {
            ctx.logger.error(`CSV export failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
};
__decorate([
    Tool({
        name: "query_device_history",
        description: "Retrieve historical telemetry from Neon database for a device. Never queries ThingsBoard.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
            metrics: z.array(z.string()).describe("List of telemetry metrics to retrieve"),
            startTs: z.number().describe("Start timestamp in milliseconds"),
            endTs: z.number().describe("End timestamp in milliseconds"),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsTools.prototype, "queryDeviceHistory", null);
__decorate([
    Tool({
        name: "get_device_statistics",
        description: "Calculate statistics (min, max, avg, median, standard deviation, count) for a telemetry metric.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
            metric: z.string().describe("The telemetry metric name"),
            startTs: z.number().describe("Start timestamp in milliseconds"),
            endTs: z.number().describe("End timestamp in milliseconds"),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsTools.prototype, "getDeviceStatistics", null);
__decorate([
    Tool({
        name: "create_training_dataset",
        description: "Generate an ML-ready dataset (CSV or JSON) combining multiple devices and metrics, sorted chronologically.",
        inputSchema: z.object({
            deviceIds: z.array(z.string()).describe("List of device IDs to include"),
            metrics: z.array(z.string()).describe("List of metrics to include"),
            startTs: z.number().describe("Start timestamp in milliseconds"),
            endTs: z.number().describe("End timestamp in milliseconds"),
            format: z.enum(["CSV", "JSON"]).describe("The output dataset format"),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsTools.prototype, "createTrainingDataset", null);
__decorate([
    Tool({
        name: "export_device_csv",
        description: "Generate a downloadable CSV dataset from Neon telemetry store.",
        inputSchema: z.object({
            deviceIds: z.array(z.string()).describe("List of device IDs to export"),
            metrics: z.array(z.string()).describe("List of metrics to export"),
            startTs: z.number().describe("Start timestamp in milliseconds"),
            endTs: z.number().describe("End timestamp in milliseconds"),
        }),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsTools.prototype, "exportDeviceCSV", null);
AnalyticsTools = __decorate([
    Injectable()
], AnalyticsTools);
export { AnalyticsTools };
//# sourceMappingURL=analytics.tools.js.map