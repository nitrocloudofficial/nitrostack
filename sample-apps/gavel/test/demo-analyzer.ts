import { ProjectAnalyzerService } from "../src/services/project-analyzer.service.js";
import { IntentService } from "../src/services/intent.service.js";
import { DesignSpecService } from "../src/services/design-spec.service.js";

async function runDemo() {
  const analyzer = new ProjectAnalyzerService();
  const intentService = new IntentService();
  const designSpecService = new DesignSpecService();

  console.log("=================================================");
  console.log("🚀 FRONTEND INTELLIGENCE MCP — DEMO ANALYZER RUN");
  console.log("=================================================\n");

  console.log("1. Saving Intent Elicitation Answers to .gavel-context...");
  const savedIntent = await intentService.saveCache("./test/fixtures/sample-next-app", {
    audience: "technical",
    priority: "polish",
    visualGoal: "smooth-scroll",
  });
  console.log("Saved Intent:", JSON.stringify(savedIntent, null, 2));

  console.log("\n2. Analyzing sample-next-app fixture (with cached intent)...");
  const sampleProfile = await analyzer.analyze("./test/fixtures/sample-next-app");
  console.log(JSON.stringify(sampleProfile, null, 2));

  console.log("\n3. Generating Design Spec for sample-next-app...");
  const designSpec = await designSpecService.generate("./test/fixtures/sample-next-app", "Framer Motion");
  console.log(JSON.stringify(designSpec, null, 2));

  console.log("\n4. Analyzing Gavel repository itself...");
  const gavelProfile = await analyzer.analyze("./");
  console.log(JSON.stringify(gavelProfile, null, 2));

  console.log("\n=================================================");
  console.log("✅ Task 5 Role B Live Demo Completed Successfully!");
  console.log("=================================================");
}

runDemo().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
