export interface ShapePart {
    role: string;
    geometry: "cylinder" | "box" | "sphere" | "cone" | "torus";
    dimensions: number[];
    position: [number, number, number];
    rotation?: [number, number, number];
    color: string;
}
export interface CompositeShape {
    deviceType: string;
    parts: ShapePart[];
}
export interface VisualMapping {
    deviceType: string;
    shape: CompositeShape;
    mappings: {
        metric: string;
        targetRole: string;
        property: "color" | "rotationSpeed" | "scaleY" | "opacity";
        range: {
            min: number;
            max: number;
        };
        outputRange: {
            min: number;
            max: number;
        } | {
            colorLow: string;
            colorHigh: string;
        };
    }[];
}
export interface TelemetryMetric {
    name: string;
    unit: string;
    expectedRange: {
        min: number;
        max: number;
    };
}
export interface TelemetrySchema {
    deviceType: string;
    metrics: TelemetryMetric[];
}
//# sourceMappingURL=types.d.ts.map