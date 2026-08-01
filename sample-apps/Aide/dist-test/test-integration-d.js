import dotenv from "dotenv";
dotenv.config();
import { processRouterOutput, formatForWidget } from "./src/integration.js";
import { postToSlack, postToDiscord } from "./src/notify.js";
const mockOutput = {
    originalRequest: {
        text: "Book meeting with alice and bob for incident review, assign postmortem, post to #incidents",
        userId: "user-d-test",
        timestamp: new Date().toISOString(),
    },
    schedulingResult: {
        time: "2025-01-15T14:00:00Z",
        attendees: ["alice", "bob", "charlie"],
        duration: 60,
        confidence: "high",
    },
    delegationResult: {
        taskId: "task-postmortem-001",
        owner: "alice",
        deadline: "2025-01-17T17:00:00Z",
        priority: "high",
        reasoning: "Alice has lowest workload on incident response",
    },
    adminResult: {
        approved: true,
        reason: "Request within policy limits",
        escalationRequired: false,
    },
    finalMessage: {
        text: "🚨 Incident war-room scheduled\n📅 Tuesday Jan 15 at 2:00 PM UTC\n👥 Attendees: alice, bob, charlie\n📝 Alice to own postmortem doc, due Friday",
        channel: "#incidents",
        format: "slack",
    },
};
async function test() {
    console.log("=== Integration Test ===\n");
    // Test 1: Format for widget
    console.log("1. Formatting for widget...");
    const widgetData = formatForWidget(mockOutput);
    console.log("✓ Widget data formatted:", widgetData);
    // Test 2: Post to Slack
    console.log("\n2. Posting to Slack...");
    try {
        await postToSlack(mockOutput.finalMessage);
        console.log("✓ Slack post successful");
    }
    catch (e) {
        console.error("✗ Slack failed:", e);
    }
    // Test 3: Post to Discord
    console.log("\n3. Posting to Discord...");
    try {
        await postToDiscord(mockOutput.finalMessage);
        console.log("✓ Discord post successful");
    }
    catch (e) {
        console.error("✗ Discord failed:", e);
    }
    // Test 4: Process full output
    console.log("\n4. Processing full router output...");
    try {
        await processRouterOutput(mockOutput);
        console.log("✓ Router output processed (posted to Slack)");
    }
    catch (e) {
        console.error("✗ Processing failed:", e);
    }
    console.log("\n=== All tests complete ===");
}
test();
