import "dotenv/config";

import { PlannerService } from "./src/agents/planner/planner.service.js";
import { EngineerService } from "./src/agents/engineer/engineer.service.js";

async function main() {

    const planner = new PlannerService();
    const engineer = new EngineerService();

    const prompt = `
Create smart light device
`;

    console.log("========== USER ==========");
    console.log(prompt);

    console.log("\n========== PLANNER ==========");

    const spec = await planner.analyze(prompt);

    console.log(JSON.stringify(spec, null, 2));

    console.log("\n========== ENGINEER ==========");

    const graph = await engineer.build(spec);

    console.log(JSON.stringify(graph, null, 2));
}

main().catch(console.error);