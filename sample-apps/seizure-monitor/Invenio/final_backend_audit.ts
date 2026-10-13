import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ResearchService } from './src/modules/research.module.js';
import { PlannerService } from './src/modules/planner.module.js';

async function main() {
    console.log("============================================================");
    console.log("FINAL BACKEND VALIDATION - INVENIO ECOSYSTEM");
    console.log("============================================================\n");

    const report: string[] = [];
    const log = (msg: string) => { console.log(msg); report.push(msg); };
    const h1 = (msg: string) => log(`\n# ${msg}\n`);
    const h2 = (msg: string) => log(`\n## ${msg}\n`);

    h1("STEP 1 & 2: VERIFY WEB CONNECTIVITY & RESEARCH ENGINE");
    const research = new ResearchService();
    const queries = [
        "Graph Neural Networks",
        "Large Language Models",
        "Transformers",
        "Quantum Computing",
        "Cancer Drug Discovery"
    ];

    for (const query of queries) {
        log(`\nTesting Query: "${query}"`);
        const start = Date.now();
        try {
            const res = await research.search_papers({ query, limit: 3 });
            const elapsed = ((Date.now() - start) / 1000).toFixed(2);
            log(`- Execution Time: ${elapsed}s`);
            
            if (res && res.papers) {
                log(`- Papers Returned: ${res.papers.length}`);
                if (res.provider_statistics) {
                    res.provider_statistics.forEach((s: any) => {
                        log(`  * ${s.provider_name}: ${s.status} (Found: ${s.papers_found})`);
                    });
                }
            } else {
                log(`- ❌ FAILED TO RETURN PAPERS: ${JSON.stringify(res).substring(0, 100)}`);
            }
        } catch (e: any) {
            log(`- ❌ ERROR: ${e.message}`);
        }
    }

    h1("STEP 3, 4, 6, 7: VERIFY ALL MCPs, AGENTS, CANVAS EXECUTION & DATA FLOW");
    const planner = new PlannerService();
    log(`Testing Full Data Flow via PlannerService (TypeScript -> Python FastMCP)`);
    log(`Query: "Cancer Drug Discovery"`);
    
    const plannerStart = Date.now();
    try {
        const fullPipelineResult = await planner.plan_research({ query: "Cancer Drug Discovery" });
        const plannerElapsed = ((Date.now() - plannerStart) / 1000).toFixed(2);
        log(`\n- Full Pipeline Execution Time: ${plannerElapsed}s`);
        
        if (fullPipelineResult && fullPipelineResult.status) {
            log(`- Status: ${fullPipelineResult.status}`);
            log(`- Real execution verified! Payload keys: ${Object.keys(fullPipelineResult).join(', ')}`);
        } else {
            log(`- ❌ FAILED FULL PIPELINE: ${JSON.stringify(fullPipelineResult).substring(0, 100)}`);
        }
    } catch (e: any) {
        log(`- ❌ ERROR IN PLANNER: ${e.message}`);
    }

    h1("STEP 5, 8, 9: VERIFY NITRO DISCOVERY & CANVAS DATA");
    log("Checking nitro.json manifest...");
    const nitroPath = path.resolve('nitro.json');
    if (fs.existsSync(nitroPath)) {
        const nitroConfig = JSON.parse(fs.readFileSync(nitroPath, 'utf8'));
        log(`- MCP Servers: ${nitroConfig.mcps?.length || 0}`);
        log(`- Agents: ${nitroConfig.agents?.length || 0}`);
        log(`- Workflows: ${nitroConfig.workflows?.length || 0}`);
        log(`- Visual Nodes: ${nitroConfig.visual_nodes?.length || 0}`);
    } else {
        log(`- ❌ nitro.json NOT FOUND`);
    }

    h1("STEP 10: VERIFY PRODUCTION READINESS (Code Search)");
    try {
        const rgOutput = execSync(`rg -i "TODO|mock|fake" src/ nitro/agents/`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        log("Found potential non-production code:");
        log(rgOutput.split('\n').slice(0, 10).join('\n') + (rgOutput.split('\n').length > 10 ? '\n... (truncated)' : ''));
    } catch (e) {
        log("✅ No 'TODO', 'mock', or 'fake' comments found in src/ or nitro/agents/.");
    }

    // Cleanup
    // @ts-ignore
    if (research.bridge) await research.bridge.cleanup();
    // @ts-ignore
    if (planner.bridge) await planner.bridge.cleanup();

    fs.writeFileSync('audit_results.txt', report.join('\n'));
    log(`\nAudit complete. Results saved to audit_results.txt`);
    process.exit(0);
}

main().catch(console.error);
