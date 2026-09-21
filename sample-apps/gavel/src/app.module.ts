import { Module } from "@nitrostack/core";
import { AnalyzeProjectTool } from "./tools/analyzer/analyze-project.tool.js";
import { InspectDependenciesTool } from "./tools/analyzer/inspect-dependencies.tool.js";
import { InspectDesignLanguageTool } from "./tools/analyzer/inspect-design-language.tool.js";
import { ElicitIntentTool } from "./tools/analyzer/elicit-intent.tool.js";
import { RecommendLibrariesTool } from "./tools/recommendation/recommend-libraries.tool.js";
import { CompareLibrariesTool } from "./tools/recommendation/compare-libraries.tool.js";
import { EstimateBundleImpactTool } from "./tools/recommendation/estimate-bundle-impact.tool.js";
import { GenerateDesignSpecTool } from "./tools/recommendation/generate-design-spec.tool.js";
import { RunLighthouseTool } from "./tools/benchmark/run-lighthouse.tool.js";
import { CompareMetricsTool } from "./tools/benchmark/compare-metrics.tool.js";
import { KnowledgeBaseResource } from "./resources/knowledge-base.resource.js";

@Module({
  name: "app",
  description: "Root module for Frontend Intelligence MCP Server",
  controllers: [
    AnalyzeProjectTool,
    InspectDependenciesTool,
    InspectDesignLanguageTool,
    ElicitIntentTool,
    RecommendLibrariesTool,
    CompareLibrariesTool,
    EstimateBundleImpactTool,
    GenerateDesignSpecTool,
    RunLighthouseTool,
    CompareMetricsTool,
    KnowledgeBaseResource,
  ],
})
export class AppModule {}
