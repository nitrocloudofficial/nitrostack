import { CompositeShape, VisualMapping } from "./types.js";
export declare function buildDevicePartGroup(shape: CompositeShape, mappings: VisualMapping["mappings"], propertyValues: Record<string, Record<string, number | string>>): string;
export declare function buildDeviceScene(shape: CompositeShape, mappings: VisualMapping["mappings"], propertyValues: Record<string, Record<string, number | string>>, latestReadings?: Record<string, number>): string;
//# sourceMappingURL=scene-builder.d.ts.map