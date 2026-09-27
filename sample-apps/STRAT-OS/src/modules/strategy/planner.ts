import { StrategyRequest } from "./types";

export class Planner {

    plan(request: StrategyRequest) {

        return {

            objective: request.objective,

            company: request.company,

            industry: request.industry,

            analyses: [

                "market",

                "finance",

                "hr",

                "legal",

                "compliance"

            ]

        };

    }

}