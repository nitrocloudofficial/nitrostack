import fs from "fs";
import path from "path";
import { computeInfrastructureHealth } from "../src/lib/scorecard.js";

/**
 * Regression script: Verifies the Protocol-0 "Golden Path" against the mocks.
 * 
 * Pipeline:
 * 1. Read Datadog Mock
 * 2. Calculate deterministic infrastructure health
 * 3. Verify it flags CRITICAL if CPU > 90%
 */

async function main() {
  console.log("Starting Protocol-0 Regression Test Suite...");
  const datadogMockPath = path.resolve(process.cwd(), "mocks/datadog_seed.json");
  const ddData = JSON.parse(fs.readFileSync(datadogMockPath, "utf-8"));

  const criticalIncident = ddData.find((d: any) => d.status === "CRITICAL");
  if (!criticalIncident) {
    throw new Error("Regression failed: No critical incident found in seed.");
  }

  const infraMetrics = {
    cpu_utilization: criticalIncident.metric === "cpu.utilization" ? criticalIncident.value : 50,
    memory_utilization: 50,
    latency_ms: 150,
    error_rate: 1
  };

  const deployMetrics = {
    success_rate: 95,
    mttr_minutes: 15
  };

  const health = computeInfrastructureHealth(infraMetrics, deployMetrics);

  if (health.status !== "CRITICAL") {
    console.error(`Regression failed: Expected CRITICAL, got ${health.status}`);
    process.exit(1);
  }

  if (!health.reason_codes.includes("HIGH_CPU_LOAD")) {
    console.error(`Regression failed: Missing HIGH_CPU_LOAD reason code`);
    process.exit(1);
  }

  console.log(`✅ Golden Path Verified.`);
  console.log(`Score: ${health.score}, Status: ${health.status}, Reasons: ${health.reason_codes.join(", ")}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
