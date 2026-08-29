import { Module } from "@nitrostack/core";
import { SimulationTools } from "./simulation.tools.js";
import { ModelStoreService } from "./model-store.service.js";
import { ModelBuilderAgentService } from "./model-builder-agent.service.js";

@Module({
    name: "simulation",
    description: "Simulation Twin capability",
    controllers: [
        SimulationTools
    ],
    providers: [
        ModelStoreService,
        ModelBuilderAgentService
    ]
})
export class SimulationModule {}
