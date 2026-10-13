import assert from "node:assert/strict";
import { RemediationTools } from "../dist/modules/remediation/remediation.tools.js";

try {
  const manifest = JSON.stringify({
    name: "warden-test-app",
    version: "1.0.0",
    dependencies: {
      lodash: "4.17.15",
    },
  });

  const result = await new RemediationTools().scanManifest({ manifest, manifest_type: "package.json" }, {});

  assert.equal(result.dependencies_scanned, 1);
  assert.ok(result.vulnerable_packages > 0);
  assert.ok(result.total_vulnerabilities > 0);
  assert.equal(result.findings[0].package, "lodash");
  assert.ok(result.findings[0].vulnerabilities.length > 0);
  assert.ok(result.findings[0].vulnerabilities.every(({ id }) => typeof id === "string" && id.length > 0));

  console.table(
    result.findings.flatMap(({ package: packageName, version, vulnerabilities }) =>
      vulnerabilities.map(({ id, summary }) => ({ package: packageName, version, id, summary }))
    )
  );
  console.log("scan_manifest vulnerability test passed");
  process.exit(0);
} catch (error) {
  console.error("scan_manifest vulnerability test failed", error);
  process.exit(1);
}