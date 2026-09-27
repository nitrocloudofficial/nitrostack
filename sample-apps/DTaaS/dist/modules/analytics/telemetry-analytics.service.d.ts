import { DeviceDataService, TelemetryReading } from "../sync/device-data.service.js";
export interface TelemetryStats {
    deviceId: string;
    metric: string;
    sampleCount: number;
    minimum: number | null;
    maximum: number | null;
    average: number | null;
    median: number | null;
    standardDeviation: number | null;
    firstTimestamp: number | null;
    lastTimestamp: number | null;
}
export interface DatasetMetadata {
    rowCount: number;
    deviceCount: number;
    metricsIncluded: string[];
    timeRange: {
        startTs: number;
        endTs: number;
    };
    format: "CSV" | "JSON";
}
export declare class TelemetryAnalyticsService {
    private readonly dataService;
    constructor(dataService?: DeviceDataService);
    /**
     * Query historical telemetry only from Neon
     */
    queryHistoricalTelemetry(deviceId: string, metrics: string[] | string, startTs: number, endTs: number): Promise<TelemetryReading[]>;
    /**
     * Calculate telemetry statistics efficiently using SQL
     */
    getTelemetryStatistics(deviceId: string, metric: string, startTs: number, endTs: number): Promise<TelemetryStats | Record<string, never>>;
    /**
     * Create training dataset (CSV or JSON)
     */
    createTrainingDataset(deviceIds: string[] | string, metrics: string[] | string, startTs: number, endTs: number, format: "CSV" | "JSON"): Promise<{
        metadata: DatasetMetadata;
        data: string;
    }>;
    /**
     * Export telemetry to CSV file
     */
    exportTelemetryCSV(deviceIds: string[] | string, metrics: string[] | string, startTs: number, endTs: number): Promise<{
        filename: string;
        rowCount: number;
        csvContent: string;
    }>;
}
export declare const telemetryAnalyticsService: TelemetryAnalyticsService;
//# sourceMappingURL=telemetry-analytics.service.d.ts.map