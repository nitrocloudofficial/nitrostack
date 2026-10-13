import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from "@nitrostack/core";
import { TelemetryAnalyticsService, telemetryAnalyticsService } from "./telemetry-analytics.service.js";

@Injectable()
export class AnalyticsTools {
    private readonly analyticsService: TelemetryAnalyticsService = telemetryAnalyticsService;

    @Tool({
        name: "query_device_history",
        description: "Retrieve historical telemetry from Neon database for a device. Never queries ThingsBoard.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
            metrics: z.array(z.string()).describe("List of telemetry metrics to retrieve"),
            startTs: z.number().describe("Start timestamp in milliseconds"),
            endTs: z.number().describe("End timestamp in milliseconds"),
        }),
    })
    async queryDeviceHistory(
        input: { deviceId: string; metrics: string[]; startTs: number; endTs: number },
        ctx: ExecutionContext
    ) {
        ctx.logger.info(`Querying history for device: ${input.deviceId} [${input.startTs} -> ${input.endTs}]`);
        try {
            // Validation
            if (input.endTs < input.startTs) {
                return { success: false, error: "Validation error: endTs must be greater than or equal to startTs" };
            }
            if (input.metrics.length === 0) {
                return { success: false, error: "Validation error: metrics list cannot be empty" };
            }

            const data = await this.analyticsService.queryHistoricalTelemetry(
                input.deviceId,
                input.metrics,
                input.startTs,
                input.endTs
            );

            return {
                success: true,
                count: data.length,
                data,
            };
        } catch (error: any) {
            ctx.logger.error(`History query failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    @Tool({
        name: "get_device_statistics",
        description: "Calculate statistics (min, max, avg, median, standard deviation, count) for a telemetry metric.",
        inputSchema: z.object({
            deviceId: z.string().describe("The ThingsBoard device ID"),
            metric: z.string().describe("The telemetry metric name"),
            startTs: z.number().describe("Start timestamp in milliseconds"),
            endTs: z.number().describe("End timestamp in milliseconds"),
        }),
    })
    async getDeviceStatistics(
        input: { deviceId: string; metric: string; startTs: number; endTs: number },
        ctx: ExecutionContext
    ) {
        ctx.logger.info(`Getting stats for device: ${input.deviceId}, metric: ${input.metric}`);
        try {
            // Validation
            if (input.endTs < input.startTs) {
                return { success: false, error: "Validation error: endTs must be greater than or equal to startTs" };
            }

            const stats = await this.analyticsService.getTelemetryStatistics(
                input.deviceId,
                input.metric,
                input.startTs,
                input.endTs
            );

            return {
                success: true,
                stats,
            };
        } catch (error: any) {
            ctx.logger.error(`Stats calculation failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    @Tool({
        name: "create_training_dataset",
        description: "Generate an ML-ready dataset (CSV or JSON) combining multiple devices and metrics, sorted chronologically.",
        inputSchema: z.object({
            deviceIds: z.array(z.string()).describe("List of device IDs to include"),
            metrics: z.array(z.string()).describe("List of metrics to include"),
            startTs: z.number().describe("Start timestamp in milliseconds"),
            endTs: z.number().describe("End timestamp in milliseconds"),
            format: z.enum(["CSV", "JSON"]).describe("The output dataset format"),
        }),
    })
    async createTrainingDataset(
        input: { deviceIds: string[]; metrics: string[]; startTs: number; endTs: number; format: "CSV" | "JSON" },
        ctx: ExecutionContext
    ) {
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

            const result = await this.analyticsService.createTrainingDataset(
                input.deviceIds,
                input.metrics,
                input.startTs,
                input.endTs,
                input.format
            );

            return {
                success: true,
                metadata: result.metadata,
                dataset: result.data,
            };
        } catch (error: any) {
            ctx.logger.error(`Dataset generation failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    @Tool({
        name: "export_device_csv",
        description: "Generate a downloadable CSV dataset from Neon telemetry store.",
        inputSchema: z.object({
            deviceIds: z.array(z.string()).describe("List of device IDs to export"),
            metrics: z.array(z.string()).describe("List of metrics to export"),
            startTs: z.number().describe("Start timestamp in milliseconds"),
            endTs: z.number().describe("End timestamp in milliseconds"),
        }),
    })
    async exportDeviceCSV(
        input: { deviceIds: string[]; metrics: string[]; startTs: number; endTs: number },
        ctx: ExecutionContext
    ) {
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

            const result = await this.analyticsService.exportTelemetryCSV(
                input.deviceIds,
                input.metrics,
                input.startTs,
                input.endTs
            );

            return {
                success: true,
                filename: result.filename,
                rowCount: result.rowCount,
                downloadInfo: `File successfully exported to server scratch directory. Filename: ${result.filename}`,
                csvContent: result.csvContent, // Return content as part of download information
            };
        } catch (error: any) {
            ctx.logger.error(`CSV export failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}
