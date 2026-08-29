import { ControllerDecorator as Controller, ToolDecorator as Tool } from "@nitrostack/core";
import { z } from "zod";
import { AnalyzeProjectInputSchema, ProjectProfileSchema } from "../../schemas/analyzer.schemas.js";
import { ProjectAnalyzerService } from "../../services/project-analyzer.service.js";

@Controller()
export class InspectDependenciesTool {
  private analyzerService = new ProjectAnalyzerService();

  @Tool({
    name: "inspectDependencies",
    description: "Inspects installed animation/UI packages and computes baseline bundle metrics.",
    inputSchema: AnalyzeProjectInputSchema,
    outputSchema: ProjectProfileSchema,
  })
  async execute(input: z.infer<typeof AnalyzeProjectInputSchema>) {
    return await this.analyzerService.analyze(input.path);
  }
}
