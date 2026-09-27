import { ObservabilityTools } from '../dist/tools/observability.tool.js';
import { SourceControlTools } from '../dist/tools/source-control.tool.js';
import { RemediationTools } from '../dist/tools/remediation.tool.js';
import { AuthService } from '../dist/services/auth.service.js';

// Mock ExecutionContext for testing
const mockContext = {
    logger: {
        info: (msg) => console.log(`[INFO] ${msg}`),
        warn: (msg) => console.warn(`[WARN] ${msg}`),
        error: (msg) => console.error(`[ERROR] ${msg}`)
    }
};

async function runTests() {
    console.log("=== RUNNING ZERO-TRUST-COMMANDER TOOL TESTS ===\n");

    // 1. Initialize Services and Controllers
    const authService = new AuthService();
    // Simulate initDb without starting the HTTP/WebSocket servers
    authService.initDb();

    const observability = new ObservabilityTools();
    const sourceControl = new SourceControlTools();
    const remediation = new RemediationTools(authService);

    // 2. Test fetch_recent_errors
    console.log("1. Testing fetch_recent_errors tool...");
    const logsResult = await observability.fetchErrors({ service_name: "payment_gateway" }, mockContext);
    console.log("Result:", JSON.stringify(logsResult, null, 2));
    if (!logsResult.success) throw new Error("fetchErrors failed!");

    // 3. Test diff_recent_commits
    console.log("\n2. Testing diff_recent_commits tool...");
    const diffResult = await sourceControl.diffCommits({ file_path: "broken-app.js" }, mockContext);
    console.log("Result:", JSON.stringify(diffResult, null, 2));
    if (!diffResult.success) throw new Error("diffCommits failed!");

    // 4. Test execute_rollback (Pending Stage)
    console.log("\n3. Testing execute_rollback (action: pending)...");
    const rollbackPending = await remediation.executeRollback({
        service_name: "payment_gateway",
        incident_id: "INC-TEST-1234",
        commit_hash: diffResult.commit_hash,
        reason: "Rollback the null-pointer error introduced in broken-app.js",
        action: "pending"
    }, mockContext);
    console.log("Result:", JSON.stringify(rollbackPending, null, 2));
    if (rollbackPending.status !== 'PENDING_APPROVAL') throw new Error("Rollback pending stage failed!");

    // 5. Test execute_rollback (Approve Stage)
    console.log("\n4. Testing execute_rollback (action: approve)...");
    const rollbackApprove = await remediation.executeRollback({
        service_name: "payment_gateway",
        incident_id: "INC-TEST-1234",
        commit_hash: diffResult.commit_hash,
        reason: "Rollback the null-pointer error introduced in broken-app.js",
        action: "approve"
    }, mockContext);
    console.log("Result:", JSON.stringify(rollbackApprove, null, 2));
    if (rollbackApprove.status !== 'SUCCESS') throw new Error("Rollback approve stage failed!");

    console.log("\n=== ALL ZERO-TRUST-COMMANDER TOOLS TESTED SUCCESSFULLY ===");
    
    // Cleanup Database file to prevent lingering db objects from hanging the node process
    if (authService.db) {
        authService.db.close();
    }
}

runTests().catch(err => {
    console.error("\n❌ TESTS FAILED:", err);
    process.exit(1);
});
