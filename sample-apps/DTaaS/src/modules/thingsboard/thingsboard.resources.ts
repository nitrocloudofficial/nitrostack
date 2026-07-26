import { ResourceDecorator as Resource, ExecutionContext } from "@nitrostack/core";

export class ThingsBoardResources {

    @Resource({
        uri: "emulator://catalog",
        name: "Predefined IoT Device Emulators Catalog",
        description: "Returns the catalog of predefined ThingsBoard emulators, available scenarios, and default telemetry rates.",
        mimeType: "application/json"
    })
    async getEmulatorCatalog(ctx: ExecutionContext) {
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