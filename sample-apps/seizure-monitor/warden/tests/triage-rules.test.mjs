import assert from "node:assert/strict";
import { triageFinding } from "../dist/modules/triage/triage-rules.js";
assert.equal(triageFinding({ finding_class: "vulnerable_dependency", patch_available: true }).route, "auto_fix");
assert.equal(triageFinding({ finding_class: "transitive_dependency_vulnerability", patch_available: true }).route, "reviewed_auto_fix");
assert.equal(triageFinding({ finding_class: "vulnerability_without_patch" }).route, "no_fix_yet");
assert.equal(triageFinding({ finding_class: "secret_exposure" }).route, "human_operations");
assert.equal(triageFinding({ finding_class: "llm_or_mcp_content_risk" }).queue, "investigation");
console.log("triage rules test passed");
