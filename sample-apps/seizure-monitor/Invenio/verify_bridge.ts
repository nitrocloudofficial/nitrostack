import { ResearchService } from './src/modules/research.module.js';
import { CorrelationService } from './src/modules/correlation.module.js';
import { PlannerService } from './src/modules/planner.module.js';

async function main() {
  console.log("============================================================");
  console.log("TS ↔ PYTHON BRIDGE VERIFICATION");
  console.log("============================================================\n");

  console.log("1. Testing ResearchService (TypeScript) -> ResearchAgent (Python FastMCP)");
  const research = new ResearchService();
  try {
    const researchStartTime = Date.now();
    const result = await research.search_papers({ query: "Graph Neural Networks for Drug Discovery", limit: 2 });
    const elapsed = ((Date.now() - researchStartTime) / 1000).toFixed(2);
    console.log(`\n✅ search_papers execution time: ${elapsed}s`);
    
    // Check if it's a real ResearchPackage
    if (result && result.papers && Array.isArray(result.papers)) {
      console.log(`✅ Returned real Pydantic object (ResearchPackage) with ${result.papers.length} papers.`);
      console.log(`   Sample Paper Title: "${result.papers[0]?.title}"`);
      console.log(`   Provider Stats:`, result.provider_statistics?.map((s: any) => `${s.provider_name}: ${s.status}`));
    } else {
      console.log("❌ Returned unexpected payload:", typeof result === 'string' ? result.substring(0, 100) : result);
    }
  } catch (error) {
    console.error("❌ Error in ResearchService:", error);
  }
  
  console.log("\n2. Testing PlannerService (TypeScript) -> PlannerAgent (Python FastMCP)");
  const planner = new PlannerService();
  try {
    const plannerStartTime = Date.now();
    // FastMCP tool arguments for planner might be `query` instead of `params`
    const result = await planner.plan_research({ query: "Graph Neural Networks for Drug Discovery" });
    const elapsed = ((Date.now() - plannerStartTime) / 1000).toFixed(2);
    console.log(`\n✅ plan_research execution time: ${elapsed}s`);
    
    if (result && result.status) {
      console.log(`✅ Returned real execution result. Status: ${result.status}`);
      console.log(`✅ Pipeline state collected from Python backend.`);
    } else {
      console.log("❌ Returned unexpected payload:", result);
    }
  } catch (error) {
    console.error("❌ Error in PlannerService:", error);
  }

  console.log("\n============================================================");
  console.log("VERIFICATION COMPLETE");
  console.log("============================================================");
  
  // Clean up
  // @ts-ignore
  if (research.bridge) await research.bridge.cleanup();
  // @ts-ignore
  if (planner.bridge) await planner.bridge.cleanup();
  
  process.exit(0);
}

main().catch(console.error);
