import { ControllerDecorator as Controller, ToolDecorator as Tool } from "@nitrostack/core";
import { z } from "zod";
import { AnalyzeProjectInputSchema, ProjectProfileSchema } from "../../schemas/analyzer.schemas.js";
import { ProjectAnalyzerService } from "../../services/project-analyzer.service.js";

@Controller()
export class InspectDesignLanguageTool {
  private analyzerService = new ProjectAnalyzerService();

  @Tool({
    name: "inspectDesignLanguage",
    description: "Extracts color palettes, typography, and spacing tokens from tailwind.config and CSS custom properties.",
    inputSchema: AnalyzeProjectInputSchema,
    outputSchema: ProjectProfileSchema,
  })
  async execute(input: z.infer<typeof AnalyzeProjectInputSchema>) {
    return await this.analyzerService.analyze(input.path);
  }
}
