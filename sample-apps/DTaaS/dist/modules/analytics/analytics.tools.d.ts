import { ExecutionContext } from "@nitrostack/core";
export declare class AnalyticsTools {
    private readonly analyticsService;
    queryDeviceHistory(input: {
        deviceId: string;
        metrics: string[];
        startTs: number;
        endTs: number;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        count: number;
        data: import("../sync/device-data.service.js").TelemetryReading[];
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        count?: undefined;
        data?: undefined;
    }>;
    getDeviceStatistics(input: {
        deviceId: string;
        metric: string;
        startTs: number;
        endTs: number;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        stats: import("./telemetry-analytics.service.js").TelemetryStats | Record<string, never>;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        stats?: undefined;
    }>;
    createTrainingDataset(input: {
        deviceIds: string[];
        metrics: string[];
        startTs: number;
        endTs: number;
        format: "CSV" | "JSON";
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        metadata: import("./telemetry-analytics.service.js").DatasetMetadata;
        dataset: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        metadata?: undefined;
        dataset?: undefined;
    }>;
    exportDeviceCSV(input: {
        deviceIds: string[];
        metrics: string[];
        startTs: number;
        endTs: number;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        filename: string;
        rowCount: number;
        downloadInfo: string;
        csvContent: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        filename?: undefined;
        rowCount?: undefined;
        downloadInfo?: undefined;
        csvContent?: undefined;
    }>;
}
//# sourceMappingURL=analytics.tools.d.ts.map