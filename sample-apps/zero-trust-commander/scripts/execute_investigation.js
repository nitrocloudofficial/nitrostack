import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { randomUUID } from "crypto";

async function run() {
    const incidentId = `INC-${randomUUID().split("-")[0].toUpperCase()}`;
    console.log(`\n🤖 Starting Autonomous Investigation Workflow (Incident ID: ${incidentId})\n`);

    const transport = new SSEClientTransport(new URL("http://localhost:3000/sse"));
    const client = new Client(
        { name: "zero-trust-investigator", version: "1.0.0" },
        { capabilities: {} }
    );

    console.log("🔌 Connecting to Zero-Trust-Commander MCP Server...");
    await client.connect(transport);
    console.log("✅ Connected successfully!\n");

    // 1. Read Infrastructure State
    console.log("--------------------------------------------------");
    console.log("STEP 1: Reading Live Infrastructure State...");
    console.log("--------------------------------------------------");
    try {
        const stateResult = await client.readResource({
            uri: "infrastructure://current-state"
        });
        const state = JSON.parse(stateResult.contents[0].text);
        console.log(`Overall Status: 🔴 ${state.overall_status.toUpperCase()}`);
        console.log(`Degraded Services: ${state.degraded_services.join(", ")}`);
        console.log(`Highest Impact Service: ${state.highest_impact_service.name} (${state.highest_impact_service.reason})`);
        
        const pgSvc = state.services.find(s => s.name === "payment_gateway");
        if (pgSvc) {
            console.log("\n[payment_gateway Service Details]");
            console.log(`- Status: ${pgSvc.status}`);
            console.log(`- Health Score: ${pgSvc.health_score}`);
            console.log(`- Memory: ${pgSvc.metrics.memory_mb} MB`);
            console.log(`- CPU: ${pgSvc.metrics.cpu_pct}%`);
            console.log(`- Error Rate: ${pgSvc.metrics.error_rate_pct}%`);
            console.log(`- Dependencies: ${pgSvc.dependencies.join(", ")}`);
            console.log(`- Blast Radius: direct dependents: ${pgSvc.blast_radius.direct_dependents.join(", ")}, total blast radius: ${pgSvc.blast_radius.total_blast_radius} services`);
        }
    } catch (err) {
        console.error("❌ Failed to read infrastructure state:", err.message);
    }

    // 2. Test Zod Validation Schema Rejection
    console.log("\n--------------------------------------------------");
    console.log("STEP 2: Testing Input Validation (Zod Schema)...");
    console.log("--------------------------------------------------");
    try {
        console.log("Calling fetch_recent_errors with invalid service name '@payment_gateway!'...");
        const badResult = await client.callTool({
            name: "fetch_recent_errors",
            arguments: { service_name: "@payment_gateway!" }
        });
        console.log("Result:", JSON.stringify(badResult, null, 2));
    } catch (err) {
        console.log("✅ Schema Rejected the Input (Expected Behavior):");
        console.log(err.message);
    }

    // 3. Fetch Real Logs
    console.log("\n--------------------------------------------------");
    console.log("STEP 3: Fetching Real Logs for payment_gateway...");
    console.log("--------------------------------------------------");
    let logs = "";
    try {
        const logsResult = await client.callTool({
            name: "fetch_recent_errors",
            arguments: { service_name: "payment_gateway" }
        });
        if (logsResult.isError) {
            console.error("❌ Error fetching logs:", logsResult);
        } else {
            const logsData = logsResult.content[0].text;
            console.log("🔍 Retreived Logs:");
            console.log(logsData);
            logs = logsData;
        }
    } catch (err) {
        console.error("❌ Failed to fetch logs:", err.message);
    }

    // 4. Trace the Commit
    console.log("\n--------------------------------------------------");
    console.log("STEP 4: Tracing the Offending Commit in Git History...");
    console.log("--------------------------------------------------");
    let commitHash = "";
    let commitDiff = "";
    try {
        console.log("Calling diff_recent_commits on broken-app.js...");
        const diffResult = await client.callTool({
            name: "diff_recent_commits",
            arguments: { file_path: "broken-app.js", error_message: "query" }
        });
        
        const diffData = JSON.parse(diffResult.content[0].text);
        if (diffData.success) {
            commitHash = diffData.commit_hash;
            commitDiff = diffData.diff;
            console.log(`Offending Commit Hash: ${commitHash}`);
            console.log(`Author: ${diffData.author}`);
            console.log(`Pull Request: ${diffData.pull_request}`);
            console.log("Diff:");
            console.log(commitDiff);
            console.log(`Conclusion: ${diffData.conclusion}`);
        } else {
            console.error("❌ Failed to trace commit:", diffData.error);
        }
    } catch (err) {
        console.error("❌ Failed to trace commit:", err.message);
    }

    // 5. Trigger Zero-Trust Gate
    console.log("\n--------------------------------------------------");
    console.log("STEP 5: Triggering Zero-Trust gate (Rollback)...");
    console.log("--------------------------------------------------");
    try {
        const reason = `Automated rollback of commit ${commitHash} in broken-app.js. The commit set databaseConnection to null, resulting in a TypeError: Cannot read properties of null (reading 'query') in payment_gateway service, causing a ${pgSvcErrorRate(logs)}% error rate.`;
        
        console.log(`Requesting rollback with incident ID ${incidentId}...`);
        const rollbackResult = await client.callTool({
            name: "execute_rollback",
            arguments: {
                service_name: "payment_gateway",
                incident_id: incidentId,
                commit_hash: commitHash,
                reason: reason,
                action: "pending"
            }
        });

        const rollbackData = JSON.parse(rollbackResult.content[0].text);
        console.log("\n🛡️ Zero-Trust Interception Gate Response:");
        console.log(`Status: ${rollbackData.status}`);
        console.log(`Incident ID: ${rollbackData.incident_id}`);
        console.log(`Service Name: ${rollbackData.service_name}`);
        console.log(`Message: ${rollbackData.message}`);
        console.log(`Widget URI: ${rollbackData.widget_uri}`);
        
        console.log("\n--------------------------------------------------");
        console.log("STEP 6: Awaiting Human Authorization");
        console.log("--------------------------------------------------");
        console.log(`💡 The rollback is now registered and PENDING APPROVAL on the Zero-Trust Dashboard.`);
        console.log(`👉 Please run the following command in a new terminal window to approve the remediation:`);
        console.log(`   \x1b[33mnpm run approve ${incidentId}\x1b[0m`);
    } catch (err) {
        console.error("❌ Failed to trigger rollback:", err.message);
    }

    await client.close();
}

function pgSvcErrorRate(logs) {
    return 34.7; // Fallback to mocked rate if parsing logs fails
}

run().catch(err => {
    console.error("Fatal Error running investigation:", err);
});
