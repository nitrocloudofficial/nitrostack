var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ResourceDecorator as Resource } from "@nitrostack/core";
export class ThingsBoardResources {
    async getEmulatorCatalog(ctx) {
        ctx.logger.info("Serving MCP Resource: emulator://catalog");
        const catalog = [
            {
                type: "smart-home-energy-hub",
                name: "Smart Home Energy Hub",
                description: "Whole-home energy in real time: solar generation, battery charge, EV charging, HVAC demand, and grid flow.",
                supportedScenarios: [
                    "Typical Day",
                    "Grid Blackout",
                    "High Peak Demand",
                    "Storm Preparation",
                    "Energy Saver"
                ]
            },
            {
                type: "smart-agriculture-station",
                name: "Smart Agriculture Station",
                description: "Soil moisture, weather telemetry, and automated irrigation control.",
                supportedScenarios: ["Normal Weather", "Drought / Heatwave", "Heavy Rain"]
            },
            {
                type: "cold-storage-facility",
                name: "Cold Storage Facility",
                description: "Refrigeration monitoring, door open sensors, and temperature compliance.",
                supportedScenarios: ["Normal Cooling", "Door Left Open", "Compressor Failure"]
            }
        ];
        return {
            contents: [{
                    uri: "emulator://catalog",
                    text: JSON.stringify(catalog, null, 2)
                }]
        };
    }
}
__decorate([
    Resource({
        uri: "emulator://catalog",
        name: "Predefined IoT Device Emulators Catalog",
        description: "Returns the catalog of predefined ThingsBoard emulators, available scenarios, and default telemetry rates.",
        mimeType: "application/json"
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardResources.prototype, "getEmulatorCatalog", null);
//# sourceMappingURL=thingsboard.resources.js.map