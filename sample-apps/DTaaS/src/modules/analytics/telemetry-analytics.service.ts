import { Injectable } from "@nitrostack/core";
import { DeviceDataService, TelemetryReading, deviceDataService } from "../sync/device-data.service.js";
import * as fs from "fs";
import * as path from "path";

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

@Injectable()
export class TelemetryAnalyticsService {
    private readonly dataService: DeviceDataService;

    constructor(dataService?: DeviceDataService) {
        this.dataService = dataService ?? deviceDataService;
    }

    /**
     * Query historical telemetry only from Neon
     */
    async queryHistoricalTelemetry(
        deviceId: string,
        metrics: string[] | string,
        startTs: number,
        endTs: number
    ): Promise<TelemetryReading[]> {
        const metricList = typeof metrics === "string"
            ? metrics.split(",").map(m => m.trim()).filter(Boolean)
            : metrics;

        // Validation
        if (endTs < startTs) {
            throw new Error("endTs must be greater than or equal to startTs");
        }
        if (!metricList || metricList.length === 0) {
            throw new Error("Metrics list cannot be empty");
        }

        return this.dataService.queryReadings(deviceId, metricList, startTs, endTs);
    }

    /**
     * Calculate telemetry statistics efficiently using SQL
     */
    async getTelemetryStatistics(
        deviceId: string,
        metric: string,
        startTs: number,
        endTs: number
    ): Promise<TelemetryStats | Record<string, never>> {
        // Validation
        if (endTs < startTs) {
            throw new Error("endTs must be greater than or equal to startTs");
        }

        const pool = this.dataService.getPool();
        const query = `
            SELECT 
                COUNT(value)::integer as "sampleCount",
                MIN(value) as "minimum",
                MAX(value) as "maximum",
                AVG(value) as "average",
                percentile_cont(0.5) WITHIN GROUP (ORDER BY value) as "median",
                STDDEV(value) as "standardDeviation",
                MIN(timestamp) as "firstTimestamp",
                MAX(timestamp) as "lastTimestamp"
            FROM device_telemetry
            WHERE device_id = $1
              AND metric = $2
              AND timestamp >= $3
              AND timestamp <= $4
        `;

        const result = await pool.query(query, [deviceId, metric, startTs, endTs]);
        if (result.rows.length === 0 || !result.rows[0].sampleCount || result.rows[0].sampleCount === 0) {
            return {};
        }

        const row = result.rows[0];
        return {
            deviceId,
            metric,
            sampleCount: row.sampleCount,
            minimum: row.minimum !== null ? parseFloat(row.minimum) : null,
            maximum: row.maximum !== null ? parseFloat(row.maximum) : null,
            average: row.average !== null ? parseFloat(row.average) : null,
            median: row.median !== null ? parseFloat(row.median) : null,
            standardDeviation: row.standardDeviation !== null ? parseFloat(row.standardDeviation) : null,
            firstTimestamp: row.firstTimestamp ? parseInt(row.firstTimestamp, 10) : null,
            lastTimestamp: row.lastTimestamp ? parseInt(row.lastTimestamp, 10) : null,
        };
    }

    /**
     * Create training dataset (CSV or JSON)
     */
    async createTrainingDataset(
        deviceIds: string[] | string,
        metrics: string[] | string,
        startTs: number,
        endTs: number,
        format: "CSV" | "JSON"
    ): Promise<{ metadata: DatasetMetadata; data: string }> {
        const deviceIdList = typeof deviceIds === "string"
            ? deviceIds.split(",").map(id => id.trim()).filter(Boolean)
            : deviceIds;

        const metricList = typeof metrics === "string"
            ? metrics.split(",").map(m => m.trim()).filter(Boolean)
            : metrics;

        // Validation
        if (endTs < startTs) {
            throw new Error("endTs must be greater than or equal to startTs");
        }
        if (!deviceIdList || deviceIdList.length === 0) {
            throw new Error("deviceIds list cannot be empty");
        }
        if (!metricList || metricList.length === 0) {
            throw new Error("metrics list cannot be empty");
        }

        const pool = this.dataService.getPool();

        // Count total rows matching criteria first
        const countQuery = `
            SELECT COUNT(*) FROM device_telemetry
            WHERE device_id = ANY($1::varchar[])
              AND metric = ANY($2::varchar[])
              AND timestamp >= $3
              AND timestamp <= $4
        `;
        const countRes = await pool.query(countQuery, [deviceIdList, metricList, startTs, endTs]);
        const totalRows = parseInt(countRes.rows[0].count, 10);

        const metadata: DatasetMetadata = {
            rowCount: totalRows,
            deviceCount: deviceIdList.length,
            metricsIncluded: metricList,
            timeRange: { startTs, endTs },
            format,
        };

        if (totalRows === 0) {
            return {
                metadata,
                data: format === "CSV" ? "timestamp,deviceId,metric,value\n" : "[]",
            };
        }

        // If the dataset is large, we stream/chunk it.
        // We'll read from database in batches of 5000 rows.
        let output = "";
        let offset = 0;
        const batchSize = 5000;

        if (format === "CSV") {
            output += "timestamp,deviceId,metric,value\n";
            while (offset < totalRows) {
                const query = `
                    SELECT timestamp, device_id as "deviceId", metric, value
                    FROM device_telemetry
                    WHERE device_id = ANY($1::varchar[])
                      AND metric = ANY($2::varchar[])
                      AND timestamp >= $3
                      AND timestamp <= $4
                    ORDER BY timestamp ASC
                    LIMIT $5 OFFSET $6
                `;
                const res = await pool.query(query, [deviceIdList, metricList, startTs, endTs, batchSize, offset]);
                for (const row of res.rows) {
                    output += `${row.timestamp},${row.deviceId},${row.metric},${row.value}\n`;
                }
                offset += batchSize;
            }
        } else {
            const allRows: any[] = [];
            while (offset < totalRows) {
                const query = `
                    SELECT timestamp, device_id as "deviceId", metric, value
                    FROM device_telemetry
                    WHERE device_id = ANY($1::varchar[])
                      AND metric = ANY($2::varchar[])
                      AND timestamp >= $3
                      AND timestamp <= $4
                    ORDER BY timestamp ASC
                    LIMIT $5 OFFSET $6
                `;
                const res = await pool.query(query, [deviceIdList, metricList, startTs, endTs, batchSize, offset]);
                for (const row of res.rows) {
                    allRows.push({
                        timestamp: parseInt(row.timestamp, 10),
                        deviceId: row.deviceId,
                        metric: row.metric,
                        value: parseFloat(row.value),
                    });
                }
                offset += batchSize;
            }
            output = JSON.stringify(allRows, null, 2);
        }

        return { metadata, data: output };
    }

    /**
     * Export telemetry to CSV file
     */
    async exportTelemetryCSV(
        deviceIds: string[] | string,
        metrics: string[] | string,
        startTs: number,
        endTs: number
    ): Promise<{ filename: string; rowCount: number; csvContent: string }> {
        const { metadata, data } = await this.createTrainingDataset(deviceIds, metrics, startTs, endTs, "CSV");

        const filename = `telemetry_export_${Date.now()}.csv`;
        const tempDir = path.join(process.cwd(), "scratch");
        
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const filePath = path.join(tempDir, filename);
        fs.writeFileSync(filePath, data);

        return {
            filename,
            rowCount: metadata.rowCount,
            csvContent: data,
        };
    }
}

export const telemetryAnalyticsService = new TelemetryAnalyticsService();
