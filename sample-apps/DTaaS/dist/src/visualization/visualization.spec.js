// src/visualization/visualization.spec.ts
import { describe, it, expect, vi } from "vitest";
import { validateVisualMapping } from "./validate.js";
import { mapTelemetryToVisualProperties } from "./telemetry-mapper.js";
import { buildDeviceScene } from "./scene-builder.js";
import { VisualizationTools } from "./visualization.tools.js";
const mockTelemetrySchema = {
    deviceType: "centrifugal_pump",
    metrics: [
        { name: "RPM", unit: "rpm", expectedRange: { min: 0, max: 3000 } },
        { name: "temperature", unit: "°C", expectedRange: { min: 0, max: 100 } }
    ]
};
const mockVisualMapping = {
    deviceType: "centrifugal_pump",
    shape: {
        deviceType: "centrifugal_pump",
        parts: [
            {
                role: "body",
                geometry: "cylinder",
                dimensions: [0.5, 0.5, 1.2, 16],
                position: [0, 0, 0],
                color: "#4a90d9"
            },
            {
                role: "impeller",
                geometry: "torus",
                dimensions: [0.3, 0.1, 8, 24],
                position: [0, 0.5, 0],
                color: "#ff0000"
            }
        ]
    },
    mappings: [
        {
            metric: "RPM",
            targetRole: "impeller",
            property: "rotationSpeed",
            range: { min: 0, max: 3000 },
            outputRange: { min: 0, max: 10 }
        },
        {
            metric: "temperature",
            targetRole: "body",
            property: "color",
            range: { min: 0, max: 100 },
            outputRange: { colorLow: "#0000ff", colorHigh: "#ff0000" }
        }
    ]
};
describe("3D Visualization Component Tests", () => {
    describe("validateVisualMapping", () => {
        it("should accept a valid visual mapping", () => {
            expect(() => validateVisualMapping(mockVisualMapping, mockTelemetrySchema)).not.toThrow();
        });
        it("should reject a mapping whose targetRole doesn't match any defined part role", () => {
            const invalidMapping = {
                ...mockVisualMapping,
                mappings: [
                    {
                        metric: "RPM",
                        targetRole: "non_existent_role",
                        property: "rotationSpeed",
                        range: { min: 0, max: 3000 },
                        outputRange: { min: 0, max: 10 }
                    }
                ]
            };
            expect(() => validateVisualMapping(invalidMapping, mockTelemetrySchema)).toThrow(/targets role 'non_existent_role' which does not exist/);
        });
        it("should reject a dimensions array of wrong length for its geometry type", () => {
            const invalidMapping = {
                ...mockVisualMapping,
                shape: {
                    ...mockVisualMapping.shape,
                    parts: [
                        {
                            role: "body",
                            geometry: "cylinder",
                            dimensions: [0.5, 0.5], // Cylinder expects 4, got 2
                            position: [0, 0, 0],
                            color: "#4a90d9"
                        }
                    ]
                }
            };
            expect(() => validateVisualMapping(invalidMapping, mockTelemetrySchema)).toThrow(/expects 4 dimensions/);
        });
    });
    describe("mapTelemetryToVisualProperties", () => {
        it("should correctly normalize a mid-range value to ~0.5 and produce the expected interpolated output for both numeric and color property types", () => {
            const latestReadings = {
                RPM: 1500, // Midpoint of 0 and 3000
                temperature: 50 // Midpoint of 0 and 100
            };
            const mapped = mapTelemetryToVisualProperties(mockVisualMapping, latestReadings);
            expect(mapped.impeller).toBeDefined();
            expect(mapped.impeller.rotationSpeed).toBeCloseTo(5); // 0 + 0.5 * (10 - 0) = 5
            expect(mapped.body).toBeDefined();
            // #0000ff to #ff0000 at 0.5 should be exactly purple (#800080)
            expect(mapped.body.color).toBe("#800080");
        });
        it("should skip (does not throw on) a missing metric in latestReadings", () => {
            const latestReadings = {
                RPM: 1500
                // temperature is missing
            };
            let mapped;
            expect(() => {
                mapped = mapTelemetryToVisualProperties(mockVisualMapping, latestReadings);
            }).not.toThrow();
            expect(mapped.impeller.rotationSpeed).toBeCloseTo(5);
            expect(mapped.body).toBeUndefined(); // skipped because temp was missing
        });
    });
    describe("buildDeviceScene", () => {
        it("should return non-empty HTML containing a <script> tag and the correct THREE.*Geometry constructor call for each part's geometry type when readings are present", () => {
            const latestReadings = { RPM: 1500, temperature: 50 };
            const propertyValues = mapTelemetryToVisualProperties(mockVisualMapping, latestReadings);
            const html = buildDeviceScene(mockVisualMapping.shape, mockVisualMapping.mappings, propertyValues, latestReadings);
            expect(html).toContain("<html");
            expect(html).toContain("<script");
            expect(html).toContain("THREE.CylinderGeometry");
            expect(html).toContain("THREE.TorusGeometry");
        });
        it("should return placeholder HTML displaying NONE and printing no <script> tag when no readings are present", () => {
            const html = buildDeviceScene(mockVisualMapping.shape, mockVisualMapping.mappings, {}, {});
            expect(html).toContain("<html");
            expect(html).not.toContain("<script");
            expect(html).toContain("NONE");
            expect(html).toContain("OFFLINE");
        });
    });
    describe("preview_visual_mapping Tool", () => {
        it("should produce valid output using midpoint values with no real device present", async () => {
            const mockMappingService = {
                getMapping: vi.fn(async () => mockVisualMapping),
                listMappings: vi.fn(async () => [mockVisualMapping]),
                saveMapping: vi.fn()
            };
            const mockSchemaService = {
                getSchema: vi.fn(),
                saveSchema: vi.fn(),
                listSchemas: vi.fn()
            };
            const mockAgentService = {
                generateVisualMapping: vi.fn()
            };
            const mockDataService = {
                getPool: vi.fn(),
                onModuleInit: vi.fn(),
                onModuleDestroy: vi.fn(),
                ensureSchema: vi.fn(),
                insertReadingsBatch: vi.fn(),
                queryReadings: vi.fn(),
                getRegistryEntry: vi.fn(),
                upsertRegistryEntry: vi.fn(),
                deleteRegistryEntry: vi.fn(),
                getAllRegistryEntries: vi.fn()
            };
            const tools = new VisualizationTools(mockMappingService, mockSchemaService, mockAgentService, mockDataService);
            const ctx = {
                logger: {
                    info: vi.fn(),
                    error: vi.fn(),
                    warn: vi.fn(),
                    debug: vi.fn()
                }
            };
            const result = await tools.previewVisualMapping({ deviceType: "centrifugal_pump" }, ctx);
            expect(result.success).toBe(true);
            expect(result.html).toContain("<html");
            expect(result.html).toContain("THREE.CylinderGeometry");
            expect(result.html).toContain("THREE.TorusGeometry");
            // Check that midpoint calculations are embedded in propertyValues inside the generated script
            expect(result.html).toContain('"impeller":{"rotationSpeed":5}');
            expect(result.html).toContain('"body":{"color":"#800080"}');
        });
    });
});
//# sourceMappingURL=visualization.spec.js.map