import { ControllerDecorator as Controller, ToolDecorator as Tool } from "@nitrostack/core";
import { z } from "zod";
import { DesignSpecInputSchema, DesignSpecSchema, DesignSpec } from "../../schemas/recommendation.schemas.js";
import { DesignSpecService } from "../../services/design-spec.service.js";

@Controller()
export class GenerateDesignSpecTool {
  private designSpecService = new DesignSpecService();

  @Tool({
    name: "generateDesignSpec",
    description: "Synthesizes extracted design tokens + top library recommendation into an actionable coding spec.",
    inputSchema: DesignSpecInputSchema,
    outputSchema: DesignSpecSchema,
  })
  async execute(input: z.infer<typeof DesignSpecInputSchema>): Promise<DesignSpec> {
    return await this.designSpecService.generate(input.projectPath, input.selectedLibrary);
  }
}
