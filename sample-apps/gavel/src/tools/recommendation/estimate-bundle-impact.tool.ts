import { ControllerDecorator as Controller, ToolDecorator as Tool } from "@nitrostack/core";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { BundleImpactSchema, EstimateInputSchema, BundleImpact } from "../../schemas/recommendation.schemas.js";
import { KnowledgeBaseEntry } from "./scoring-engine.js";

@Controller()
export class EstimateBundleImpactTool {
  private async loadKnowledgeBase(): Promise<KnowledgeBaseEntry[]> {
    try {
      const kbPath = path.join(process.cwd(), "src", "data", "library-knowledge-base.json");
      const content = await fs.readFile(kbPath, "utf-8");
      const parsed = JSON.parse(content);
      return parsed.libraries || [];
    } catch {
      return [];
    }
  }

  @Tool({
    name: "estimateBundleImpact",
    description: "Estimates kilobyte and performance impact of adding a specific library.",
    inputSchema: EstimateInputSchema,
    outputSchema: BundleImpactSchema,
  })
  async execute(input: z.infer<typeof EstimateInputSchema>): Promise<BundleImpact> {
    const kbEntries = await this.loadKnowledgeBase();
    const entry = kbEntries.find(
      (lib) => lib.name.toLowerCase() === input.library.toLowerCase()
    );

    if (!entry) {
      return {
        library: input.library,
        minImpactKb: 10,
        maxImpactKb: 50,
        gzippedKb: 25,
        recommendation: `No benchmark record found for ${input.library}. Standard bundle budget impact applies.`,
      };
    }

    const minImpactKb = input.treeShaken ? entry.minGzippedKb : entry.gzippedKb;
    const maxImpactKb = entry.gzippedKb;
    const gzippedKb = entry.gzippedKb;

    let recommendation = "";
    if (gzippedKb === 0) {
      recommendation = `${entry.name} relies on local source code injection (0 KB npm overhead).`;
    } else if (gzippedKb < 10) {
      recommendation = `${entry.name} is extremely lightweight (~${gzippedKb} KB gzipped) with zero noticeable latency impact.`;
    } else if (gzippedKb < 60) {
      recommendation = `${entry.name} has a moderate footprint (~${gzippedKb} KB gzipped). Utilize tree-shaking and dynamic imports.`;
    } else {
      recommendation = `${entry.name} is a heavy dependency (~${gzippedKb} KB gzipped). Lazy load with Suspense to protect initial page load LCP.`;
    }

    return {
      library: entry.name,
      minImpactKb,
      maxImpactKb,
      gzippedKb,
      recommendation,
    };
  }
}
