// src/agents/planner/planner.service.ts
import { GeminiService } from "./gemini.service.js";
import { SYSTEM_PROMPT } from "./planner.prompt.js";
import { TwinSpecificationSchema } from "./planner.schema.js";
export class PlannerService {
    gemini = new GeminiService();
    async analyze(userPrompt) {
        const prompt = `
${SYSTEM_PROMPT}

User Request:

${userPrompt}
`;
        console.log("========== GEMINI PLANNER ==========");
        console.log(prompt);
        const response = await this.gemini.generate(prompt);
        const cleaned = response
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
        return TwinSpecificationSchema.parse(JSON.parse(cleaned));
    }
}
//# sourceMappingURL=planner.service.js.map