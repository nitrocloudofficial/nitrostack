// src/visualization/telemetry-mapper.ts

import { VisualMapping } from "./types.js";

function parseHex(hex: string): { r: number; g: number; b: number } {
    const cleaned = hex.replace("#", "");
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    return { r, g, b };
}

function toHex(c: number): string {
    const hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
}

export function mapTelemetryToVisualProperties(
    mapping: VisualMapping,
    latestReadings: Record<string, number>
): Record<string, Record<string, number | string>> {
    const result: Record<string, Record<string, number | string>> = {};

    for (const map of mapping.mappings) {
        const metric = map.metric;
        if (!(metric in latestReadings) || latestReadings[metric] === undefined || latestReadings[metric] === null) {
            console.warn(`[TelemetryMapper] Warning: metric '${metric}' is missing in latestReadings`);
            continue;
        }

        const val = latestReadings[metric];
        const range = map.range;
        
        let fraction = 0;
        if (range.max !== range.min) {
            fraction = (val - range.min) / (range.max - range.min);
        }
        fraction = Math.max(0, Math.min(1, fraction));

        const targetRole = map.targetRole;
        const property = map.property;

        if (!result[targetRole]) {
            result[targetRole] = {};
        }

        if (property === "color") {
            const outRange = map.outputRange as { colorLow: string; colorHigh: string };
            const rgbLow = parseHex(outRange.colorLow);
            const rgbHigh = parseHex(outRange.colorHigh);
            const r = Math.round(rgbLow.r + fraction * (rgbHigh.r - rgbLow.r));
            const g = Math.round(rgbLow.g + fraction * (rgbHigh.g - rgbLow.g));
            const b = Math.round(rgbLow.b + fraction * (rgbHigh.b - rgbLow.b));
            result[targetRole][property] = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        } else {
            const outRange = map.outputRange as { min: number; max: number };
            const interpolated = outRange.min + fraction * (outRange.max - outRange.min);
            result[targetRole][property] = interpolated;
        }
    }

    return result;
}
