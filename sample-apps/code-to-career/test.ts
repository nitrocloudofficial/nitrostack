/**
 * Test script — run ONCE after starting the server with `npm start`.
 * Replace TEST_USER_ID with a real userId from your MongoDB that has at least one roadmap.
 *
 * How to find a userId:
 *   1. Open MongoDB Atlas → Browse Collections → users
 *   2. Copy the _id of a user that has roadmaps[] populated
 *
 * Usage:
 *   1. In terminal A: npm start
 *   2. In terminal B: npm test
 */

// ── Replace this with a real userId from your DB ──────────────────────────────
const TEST_USER_ID = "REPLACE_WITH_REAL_USER_ID";
// ─────────────────────────────────────────────────────────────────────────────

const RESOURCE_URI = `resource://mentor/user_context/${TEST_USER_ID}`;
const SERVER_URL = `http://localhost:3001/resource?uri=${encodeURIComponent(RESOURCE_URI)}`;

async function runTest() {
  console.log("[test] Calling resource:", RESOURCE_URI);
  console.log("[test] URL:", SERVER_URL);

  try {
    const res = await fetch(SERVER_URL);
    if (!res.ok) {
      console.error("[test] HTTP error:", res.status, await res.text());
      return;
    }

    const data = await res.json();
    console.log("\n[test] ✅ Resource returned:\n", JSON.stringify(data, null, 2));

    // Basic validation
    console.log("\n[test] Checks:");
    console.log("  hasRoadmap:", data.hasRoadmap);
    console.log("  targetRoles:", data.targetRoles);
    console.log("  currentWeakAreas:", data.currentWeakAreas);
    console.log("  studentName:", data.studentName);
    console.log(
      "  latestInterview:",
      data.latestInterview ?? "(null — interviewSession model not built yet)"
    );
  } catch (err) {
    console.error("[test] ❌ Fetch failed — is the server running? (npm start)", err);
  }
}

runTest();
