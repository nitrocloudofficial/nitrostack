import "dotenv/config";
import { PlannerService } from "./src/agents/planner/planner.service.js";

async function main() {
    const planner = new PlannerService();

    const result = await planner.analyze(`
Create a smart home with:
- 3 smart lights
- 1 smart plug
- 1 dashboard
- High temperature alarm
`);

    console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);