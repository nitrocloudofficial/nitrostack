// src/visualization/validate.ts

import { VisualMapping, TelemetrySchema } from "./types.js";

export function validateVisualMapping(mapping: VisualMapping, telemetrySchema: TelemetrySchema): void {
    if (!mapping) {
        throw new Error("VisualMapping object is undefined or null");
    }
    if (!mapping.shape || !Array.isArray(mapping.shape.parts)) {
        throw new Error("VisualMapping is missing shape or parts array");
    }
    if (!Array.isArray(mapping.mappings)) {
        throw new Error("VisualMapping is missing mappings array");
    }

    const roles = new Set(mapping.shape.parts.map(p => p.role));
    const schemaMetrics = new Set(telemetrySchema.metrics.map(m => m.name));

    const hexRegex = /^#[0-9a-fA-F]{6}$/;

    // Validate parts
    for (const part of mapping.shape.parts) {
        if (!part.role) {
            throw new Error(`Part is missing role property`);
        }
        
        // 5 allowed geometry types: "cylinder" | "box" | "sphere" | "cone" | "torus"
        const allowedGeometries = ["cylinder", "box", "sphere", "cone", "torus"];
        if (!allowedGeometries.includes(part.geometry)) {
            throw new Error(`Part '${part.role}' has invalid geometry '${part.geometry}'. Allowed: ${allowedGeometries.join(", ")}`);
        }

        // Check dimensions array length
        // cylinder/torus: 4
        // box/sphere/cone: 3
        const expectedDimensionsLength = (part.geometry === "cylinder" || part.geometry === "torus") ? 4 : 3;
        if (!Array.isArray(part.dimensions) || part.dimensions.length !== expectedDimensionsLength) {
            throw new Error(`Part '${part.role}' geometry '${part.geometry}' expects ${expectedDimensionsLength} dimensions, but got ${part.dimensions ? part.dimensions.length : 0}`);
        }

        // Color validation
        if (typeof part.color !== "string" || !hexRegex.test(part.color)) {
            throw new Error(`Part '${part.role}' has invalid hex color '${part.color}'. Must be a valid 6-digit hex code with '#' prefix (e.g. #ff0000)`);
        }
    }

    // Validate mappings
    for (const map of mapping.mappings) {
        if (!map.metric) {
            throw new Error(`Mapping is missing metric property`);
        }
        if (!schemaMetrics.has(map.metric)) {
            throw new Error(`Mapping metric '${map.metric}' does not exist in the telemetry schema for device type '${telemetrySchema.deviceType}'`);
        }
        if (!map.targetRole) {
            throw new Error(`Mapping for metric '${map.metric}' is missing targetRole`);
        }
        if (!roles.has(map.targetRole)) {
            throw new Error(`Mapping metric '${map.metric}' targets role '${map.targetRole}' which does not exist in shape parts`);
        }

        // Valid properties: "color" | "rotationSpeed" | "scaleY" | "opacity"
        const allowedProperties = ["color", "rotationSpeed", "scaleY", "opacity"];
        if (!allowedProperties.includes(map.property)) {
            throw new Error(`Mapping metric '${map.metric}' has invalid property '${map.property}'. Allowed: ${allowedProperties.join(", ")}`);
        }

        if (!map.range || typeof map.range.min !== "number" || typeof map.range.max !== "number") {
            throw new Error(`Mapping for metric '${map.metric}' is missing a valid range with min and max numbers`);
        }

        if (!map.outputRange) {
            throw new Error(`Mapping for metric '${map.metric}' is missing outputRange`);
        }

        if (map.property === "color") {
            const outColor = map.outputRange as any;
            if (!outColor.colorLow || !outColor.colorHigh) {
                throw new Error(`Mapping for metric '${map.metric}' is mapped to color but missing colorLow or colorHigh in outputRange`);
            }
            if (!hexRegex.test(outColor.colorLow) || !hexRegex.test(outColor.colorHigh)) {
                throw new Error(`Mapping for metric '${map.metric}' has invalid colors in outputRange: low: '${outColor.colorLow}', high: '${outColor.colorHigh}'`);
            }
        } else {
            const outNumeric = map.outputRange as any;
            if (typeof outNumeric.min !== "number" || typeof outNumeric.max !== "number") {
                throw new Error(`Mapping for metric '${map.metric}' is mapped to numeric property '${map.property}' but missing min or max in outputRange`);
            }
        }
    }
}
