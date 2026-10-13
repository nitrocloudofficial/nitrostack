import { ControllerDecorator as Controller, ToolDecorator as Tool } from "@nitrostack/core";
import { z } from "zod";
import { AnalyzeProjectInputSchema, ProjectProfileSchema } from "../../schemas/analyzer.schemas.js";
import { ProjectAnalyzerService } from "../../services/project-analyzer.service.js";

@Controller()
export class AnalyzeProjectTool {
  private analyzerService = new ProjectAnalyzerService();

  @Tool({
    name: "analyzeProject",
    description: "Reads package.json, lockfile, and folder structure to build a ProjectProfile.",
    inputSchema: AnalyzeProjectInputSchema,
    outputSchema: ProjectProfileSchema,
  })
  async execute(input: z.infer<typeof AnalyzeProjectInputSchema>) {
    return await this.analyzerService.analyze(input.path);
  }
}
