import { Module } from "@nitrostack/core";

import { InvestigationService } from "./investigation.service.js";
import { InvestigationTools } from "./investigation.tools.js";
import { InvestigationTaskTools } from "./investigation.tasks.js";

@Module({
    name: "investigation",
    description: "Investigation Context Platform",
    controllers: [
        InvestigationTools,
        InvestigationTaskTools,
    ],
    providers: [
        InvestigationService,
    ],
})
export class InvestigationModule {}