import { ControllerDecorator as Controller, ToolDecorator as Tool } from "@nitrostack/core";
import { z } from "zod";
import { ElicitIntentInputSchema, IntentAnswersSchema } from "../../schemas/analyzer.schemas.js";
import { IntentService } from "../../services/intent.service.js";

@Controller()
export class ElicitIntentTool {
  private intentService = new IntentService();

  @Tool({
    name: "elicitIntent",
    description: "Saves or updates user project intent (audience, priority, visual goal) to .gavel-context cache.",
    inputSchema: ElicitIntentInputSchema,
    outputSchema: IntentAnswersSchema,
  })
  async execute(input: z.infer<typeof ElicitIntentInputSchema>) {
    return await this.intentService.saveCache(input.path, {
      audience: input.audience,
      priority: input.priority,
      visualGoal: input.visualGoal,
    });
  }
}
