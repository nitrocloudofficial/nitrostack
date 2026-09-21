// src/visualization/visualization.module.ts

import { Module } from "@nitrostack/core";
import { VisualMappingService, visualMappingService } from "./visual-mapping.service.js";
import { TelemetrySchemaService, telemetrySchemaService } from "./telemetry-schema.service.js";
import { VisualMappingAgentService } from "./visual-mapping-agent.service.js";
import { VisualizationTools } from "./visualization.tools.js";

@Module({
    name: "visualization",
    description: "3D Digital Twin visualization capabilities using Three.js",
    controllers: [
        VisualizationTools
    ],
    providers: [
        { provide: VisualMappingService, useValue: visualMappingService },
        { provide: TelemetrySchemaService, useValue: telemetrySchemaService },
        VisualMappingAgentService
    ],
    exports: [
        VisualMappingService,
        TelemetrySchemaService,
        VisualMappingAgentService
    ]
})
export class VisualizationModule {}
