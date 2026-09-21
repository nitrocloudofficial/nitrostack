import "dotenv/config";

import { PlannerService } from "./src/agents/planner/planner.service.js";

import { EngineerService } from "./src/agents/engineer/engineer.service.js";

async function main() {

    const planner = new PlannerService();

    const engineer = new EngineerService();

    const specification =
        await planner.analyze(

            "Create a smart home with 3 smart fans and one dashboard"

        );

    const result =
        await engineer.build(specification);

    console.log(

        JSON.stringify(result, null, 2)

    );

}

main();