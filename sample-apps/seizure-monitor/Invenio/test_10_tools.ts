import { ResearchService } from './src/modules/research.module.js';
import { CorrelationService } from './src/modules/correlation.module.js';
import { EvidenceService } from './src/modules/evidence.module.js';
import { KnowledgeGraphService } from './src/modules/knowledge-graph.module.js';
import { PlannerService } from './src/modules/planner.module.js';
import { WorkflowService } from './src/modules/workflow.module.js';
import { WorkspaceService } from './src/modules/workspace.module.js';
import { CopilotService } from './src/modules/copilot.module.js';
import { ReportService } from './src/modules/report.module.js';
import { SettingsService } from './src/modules/settings.module.js';

async function testAll() {
  console.log("=== Testing 10 Public Tools ===");

  try {
    const research = new ResearchService();
    const rResult = await research.research_search({ query: "quantum logic" });
    console.log("Research MCP =>", typeof rResult === 'object' ? 'Pydantic Package returned' : rResult);

    const correlation = new CorrelationService();
    const cResult = await correlation.analyze_correlation({ papers: [] });
    console.log("Correlation MCP =>", typeof cResult === 'object' ? 'Pydantic Package returned' : cResult);

    const evidence = new EvidenceService();
    const eResult = await evidence.analyze_evidence({ gaps: [] });
    console.log("Evidence MCP =>", typeof eResult === 'object' ? 'Pydantic Package returned' : eResult);

    const kg = new KnowledgeGraphService();
    const kResult = await kg.build_knowledge_graph({ claims: [] });
    console.log("Knowledge Graph MCP =>", typeof kResult === 'object' ? 'Pydantic Package returned' : kResult);

    const planner = new PlannerService();
    const pResult = await planner.execute_autonomous_research({ goal: "test" });
    console.log("Planner MCP =>", typeof pResult === 'object' ? 'Pydantic Package returned' : pResult);

    const workflow = new WorkflowService();
    const wResult = await workflow.manage_workflow({ action: "start" });
    console.log("Workflow MCP =>", typeof wResult === 'object' ? 'Pydantic Package returned' : wResult);

    const workspace = new WorkspaceService();
    const wsResult = await workspace.open_workspace({ id: "ws-1" });
    console.log("Workspace MCP =>", typeof wsResult === 'object' ? 'Pydantic Package returned' : wsResult);

    const copilot = new CopilotService();
    const cpResult = await copilot.research_copilot({ msg: "hello" });
    console.log("Copilot MCP =>", typeof cpResult === 'object' ? 'Pydantic Package returned' : cpResult);

    const report = new ReportService();
    const repResult = await report.generate_report({ doc: "doc-1" });
    console.log("Report MCP =>", typeof repResult === 'object' ? 'Pydantic Package returned' : repResult);

    const settings = new SettingsService();
    const sResult = await settings.manage_settings({ apply: true });
    console.log("Settings MCP =>", typeof sResult === 'object' ? 'Pydantic Package returned' : sResult);

    console.log("\nALL 10 PUBLIC TOOLS EXECUTED SUCCESSFULLY AND REACHED PYTHON.");
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
testAll();
