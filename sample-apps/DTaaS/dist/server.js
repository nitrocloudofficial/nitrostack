import "dotenv/config";
import express from "express";
import cors from "cors";
import { PlannerService } from "./src/agents/planner/planner.service.js";
import { EngineerService } from "./src/agents/engineer/engineer.service.js";
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("web"));
app.post("/create-twin", async (req, res) => {
    try {
        const { prompt } = req.body;
        const planner = new PlannerService();
        const engineer = new EngineerService();
        const spec = await planner.analyze(prompt);
        const graph = await engineer.build(spec);
        res.json({
            success: true,
            specification: spec,
            graph
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
//# sourceMappingURL=server.js.map