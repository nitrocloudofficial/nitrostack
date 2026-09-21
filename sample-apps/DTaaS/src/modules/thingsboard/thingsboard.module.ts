import { Module } from "@nitrostack/core";

import { ThingsBoardTools } from "./thingsboard.tools.js";
import { ThingsBoardService } from "./thingsboard.service.js";
import { ThingsBoardResources } from "./thingsboard.resources.js";

@Module({
    name: "thingsboard",
    description: "ThingsBoard Tools and Resources",
    controllers: [
        ThingsBoardTools,
        ThingsBoardResources
    ],
    providers: [
        ThingsBoardService
    ]
})
export class ThingsBoardModule {}