// src/visualization/visualization.module.ts
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from "@nitrostack/core";
import { VisualMappingService, visualMappingService } from "./visual-mapping.service.js";
import { TelemetrySchemaService, telemetrySchemaService } from "./telemetry-schema.service.js";
import { VisualMappingAgentService } from "./visual-mapping-agent.service.js";
import { VisualizationTools } from "./visualization.tools.js";
let VisualizationModule = class VisualizationModule {
};
VisualizationModule = __decorate([
    Module({
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
], VisualizationModule);
export { VisualizationModule };
//# sourceMappingURL=visualization.module.js.map