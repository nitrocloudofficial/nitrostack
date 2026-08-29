import { describe, it, expect, beforeEach, vi } from "vitest";
import { TelemetryAnalyticsService } from "./telemetry-analytics.service.js";
import { DeviceDataService } from "../sync/device-data.service.js";

describe("Analytics Service Tests", () => {
    let mockDataService: any;
    let mockPool: any;
    let analyticsService: TelemetryAnalyticsService;

    beforeEach(() => {
        mockPool = {
            query: vi.fn(async (sql: string, params: any[]) => {
                // Determine mock response based on query
                if (sql.includes("COUNT(value)::integer")) {
                    // Statistics Query
                    const deviceId = params[0];
                    if (deviceId === "empty-device") {
                        return { rows: [] };
                    }
                    return {
                        rows: [{
                            sampleCount: 5,
                            minimum: "10.0",
                            maximum: "50.0",
                            average: "30.0",
                            median: "30.0",
                            standardDeviation: "15.8113",
                            firstTimestamp: "1600000000000",
                            lastTimestamp: "1600000000400",
                        }],
                    };
                }

                if (sql.includes("COUNT(*)")) {
                    // Total rows count query
                    const deviceIds = params[0];
                    if (deviceIds.includes("empty-device")) {
                        return { rows: [{ count: "0" }] };
                    }
                    return { rows: [{ count: "4" }] };
                }

                if (sql.includes("SELECT timestamp, device_id")) {
                    // Telemetry dataset query
                    return {
                        rows: [
                            { timestamp: "1600000000000", deviceId: "device-1", metric: "temp", value: "22.5" },
                            { timestamp: "1600000000100", deviceId: "device-2", metric: "humidity", value: "60.0" },
                            { timestamp: "1600000000200", deviceId: "device-1", metric: "temp", value: "23.0" },
                            { timestamp: "1600000000300", deviceId: "device-2", metric: "humidity", value: "61.5" },
                        ],
                    };
                }

                if (sql.includes("SELECT device_id as \"deviceId\"")) {
                    // queryReadings Query
                    return {
                        rows: [
                            { deviceId: "device-1", metric: "temp", value: "22.5", timestamp: "1600000000000" },
                            { deviceId: "device-1", metric: "temp", value: "23.0", timestamp: "1600000000200" },
                        ],
                    };
                }

                return { rows: [] };
            }),
        };

        mockDataService = {
            getPool: vi.fn(() => mockPool),
            queryReadings: vi.fn(async (deviceId: string, metrics: string[], startTs: number, endTs: number) => {
                return [
                    { deviceId, metric: metrics[0], value: 22.5, timestamp: startTs },
                    { deviceId, metric: metrics[0], value: 23.0, timestamp: endTs },
                ];
            }),
        };

        analyticsService = new TelemetryAnalyticsService(mockDataService as unknown as DeviceDataService);
    });

    it("should fetch historical telemetry and sort chronologically", async () => {
        const data = await analyticsService.queryHistoricalTelemetry("device-1", ["temp"], 1000, 2000);
        expect(mockDataService.queryReadings).toHaveBeenCalledWith("device-1", ["temp"], 1000, 2000);
        expect(data.length).toBe(2);
        expect(data[0].timestamp).toBeLessThanOrEqual(data[1].timestamp);
    });

    it("should calculate statistics correctly (including median and standard deviation)", async () => {
        const stats = await analyticsService.getTelemetryStatistics("device-1", "temp", 1000, 2000);
        expect(stats).toBeDefined();
        if ("sampleCount" in stats) {
            expect(stats.sampleCount).toBe(5);
            expect(stats.minimum).toBe(10.0);
            expect(stats.maximum).toBe(50.0);
            expect(stats.average).toBe(30.0);
            expect(stats.median).toBe(30.0);
            expect(stats.standardDeviation).toBe(15.8113);
            expect(stats.firstTimestamp).toBe(1600000000000);
            expect(stats.lastTimestamp).toBe(1600000000400);
        } else {
            throw new Error("Stats empty");
        }
    });

    it("should return an empty response for statistics if no data exists", async () => {
        const stats = await analyticsService.getTelemetryStatistics("empty-device", "temp", 1000, 2000);
        expect(stats).toEqual({});
    });

    it("should generate CSV training dataset for multiple devices and metrics", async () => {
        const result = await analyticsService.createTrainingDataset(
            ["device-1", "device-2"],
            ["temp", "humidity"],
            1000,
            2000,
            "CSV"
        );

        expect(result.metadata.rowCount).toBe(4);
        expect(result.metadata.deviceCount).toBe(2);
        expect(result.metadata.format).toBe("CSV");
        expect(result.data).toContain("timestamp,deviceId,metric,value\n");
        expect(result.data).toContain("1600000000000,device-1,temp,22.5\n");
        expect(result.data).toContain("1600000000100,device-2,humidity,60.0\n");
    });

    it("should generate JSON training dataset for multiple devices and metrics", async () => {
        const result = await analyticsService.createTrainingDataset(
            ["device-1", "device-2"],
            ["temp", "humidity"],
            1000,
            2000,
            "JSON"
        );

        expect(result.metadata.rowCount).toBe(4);
        expect(result.metadata.format).toBe("JSON");
        const json = JSON.parse(result.data);
        expect(json.length).toBe(4);
        expect(json[0].deviceId).toBe("device-1");
        expect(json[0].value).toBe(22.5);
    });

    it("should export CSV telemetry file and return filename and row count", async () => {
        const result = await analyticsService.exportTelemetryCSV(
            ["device-1", "device-2"],
            ["temp", "humidity"],
            1000,
            2000
        );

        expect(result.filename).toContain("telemetry_export_");
        expect(result.rowCount).toBe(4);
        expect(result.csvContent).toContain("timestamp,deviceId,metric,value\n");
    });

    it("should return empty datasets when no telemetry exists", async () => {
        const result = await analyticsService.createTrainingDataset(
            ["empty-device"],
            ["temp"],
            1000,
            2000,
            "JSON"
        );

        expect(result.metadata.rowCount).toBe(0);
        expect(result.data).toBe("[]");
    });
});
