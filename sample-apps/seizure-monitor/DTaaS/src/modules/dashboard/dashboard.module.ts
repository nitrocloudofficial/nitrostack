import { Module } from "@nitrostack/core";

import { DashboardTools } from "./dashboard.tools.js";
import { DashboardService } from "./dashboard.service.js";

@Module({

    name: "dashboard",

    description: "ThingsBoard Dashboard Tools",

    controllers: [

        DashboardTools

    ],

    providers: [

        DashboardService

    ]

})

export class DashboardModule { }

