// One-off script: exercises every @Tool in the compiled server against
// realistic sample input, capturing REAL output for the judge-facing tool
// reference doc. Not part of the app — safe to delete after use.
import 'dotenv/config';
import { RemediationTools } from "../dist/modules/remediation/remediation.tools.js";
import { TriageTools } from "../dist/modules/triage/triage.tools.js";
import { TriageService } from "../dist/modules/triage/triage.service.js";
import { MitigationTools } from "../dist/modules/mitigation/mitigation.tools.js";
import { DnscheckTools } from "../dist/modules/dnscheck/dnscheck.tools.js";
import { FindingsTools } from "../dist/modules/findings/findings.tools.js";
import { InvestigationTools } from "../dist/modules/investigation/investigation.tools.js";
import { ReportTools } from "../dist/modules/report/report.tools.js";
import { WebscanTools } from "../dist/modules/webscan/webscan.tools.js";
import { TopVulnerabilitiesTools } from "../dist/modules/top-vulnerabilities/top-vulnerabilities.tools.js";
import { investigationStore } from "../dist/modules/investigation/store.js";

const ctx = { logger: { info() {}, warn() {}, error() {}, debug() {} } };
const out = {};
const run = async (name, fn) => {
  try {
    out[name] = { ok: true, result: await fn() };
  } catch (e) {
    out[name] = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};

const remediation = new RemediationTools();
const triage = new TriageTools(new TriageService());
const mitigation = new MitigationTools();
const dnscheck = new DnscheckTools();
const findings = new FindingsTools();
const investigation = new InvestigationTools();
const report = new ReportTools();
const webscan = new WebscanTools();
const topVulns = new TopVulnerabilitiesTools();

// 1. note_decision — needs an active investigation id; create one directly in the store.
const inv = investigationStore.create("Demo: investigate a vulnerable lodash dependency");
await run("note_decision", () =>
  investigation.noteDecision(
    { investigation_id: inv.id, decision: "Prioritise the lodash ReDoS/prototype-pollution findings first", reasoning: "KEV/EPSS ranking put them above the other two findings", confidence: "high", discarded: ["Ignore until next sprint"] },
    ctx
  )
);

// 2. scan_manifest
const manifest = JSON.stringify({ name: "demo-app", version: "1.0.0", dependencies: { lodash: "4.17.15" } });
await run("scan_manifest", () => remediation.scanManifest({ manifest, manifest_type: "package.json" }, ctx));
const scanResult = out.scan_manifest.ok ? out.scan_manifest.result : null;

// 3. prioritise_findings (chained from scan_manifest)
await run("prioritise_findings", () => remediation.prioritiseFindings({ findings: scanResult?.findings ?? [] }, ctx));

// 4. plan_remediation (chained from scan_manifest)
await run("plan_remediation", () => remediation.planRemediation({ findings: scanResult?.findings ?? [] }, ctx));
const planResult = out.plan_remediation.ok ? out.plan_remediation.result : null;

// 5. generate_patch (chained from plan_remediation)
await run("generate_patch", () => remediation.generatePatch({ manifest, manifest_type: "package.json", plan: planResult?.plan ?? [] }, ctx));

// 6. verify_fix (chained from plan_remediation)
await run("verify_fix", () => remediation.verifyFix({ plan: planResult?.plan ?? [] }, ctx));

// 7. triage_finding
await run("triage_finding", () =>
  triage.triageFinding(
    { finding_class: "vulnerable_dependency", patch_available: true, package_name: "lodash", cve: "CVE-2021-23337", context: "lodash 4.17.15 command injection", investigation_id: inv.id, available_tools: ["generate_patch"] },
    ctx
  )
);

// 8. suggest_mitigation
await run("suggest_mitigation", () => mitigation.suggestMitigation({ finding_class: "vulnerability_without_patch" }, ctx));

// 9. check_domain_security
await run("check_domain_security", () => dnscheck.checkDomainSecurity({ domain: "google.com" }, ctx));

// 10. ingest_finding
await run("ingest_finding", () =>
  findings.ingestFinding(
    { source: "scan_manifest", raw: { package: "lodash", version: "4.17.15", vulnerabilities: [{ id: "GHSA-29mw-wpgm-hmr9" }] }, hint: { finding_class: "vulnerable_dependency", package_name: "lodash" }, investigation_id: inv.id },
    ctx
  )
);
const ingestResult = out.ingest_finding.ok ? out.ingest_finding.result : null;

// 11. query_findings
await run("query_findings", () => findings.queryFindingsTool({ limit: 5 }, ctx));

// 12. analyze_finding_history (chained from ingest_finding's dedupe_key)
await run("analyze_finding_history", () => findings.analyzeFindingHistory({ dedupe_key: ingestResult?.dedupe_key ?? "missing" }, ctx));

// 13. read_threat_report — local fixture, no network
await run("read_threat_report", () => report.readThreatReport({ url: "file://" + process.cwd() + "/../warden-mcp-server/fixtures/poisoned-report.html" }, ctx));

// 14. scan_website
await run("scan_website", () => webscan.scanWebsite({ url: "https://example.com" }, ctx));

// 15. fingerprint_technology
await run("fingerprint_technology", () => webscan.fingerprintTechnology({ url: "https://example.com" }, ctx));

// 16. scan_html_vulnerabilities — inline html, no fetch
const vulnHtml = `<!DOCTYPE html><html><head><script src='https://cdn.example.com/lib.js'></script></head><body>
<!-- TODO: remove hardcoded password before launch -->
<form method='post' action='http://example.com/login'><input type='password' name='pw'></form>
<a href='https://partner.example.com' target='_blank'>Partner</a>
<img src='http://insecure.example.com/logo.png'>
<script>const key = 'AKIAABCDEFGHIJKLMNOP'; document.getElementById('out').innerHTML = location.hash.slice(1);</script>
<button onclick='track()'>Click</button></body></html>`;
await run("scan_html_vulnerabilities", () => webscan.scanHtmlVulnerabilities({ url: "https://example.com/", html: vulnHtml }, ctx));

// 17. update_top_vulnerability (rank 1)
await run("update_top_vulnerability", () =>
  topVulns.updateTopVulnerability(
    { rank: 1, cve_id: "CVE-2024-21762", title: "VPN appliance unauthenticated RCE", description: "Actively exploited zero-day in a widely deployed VPN appliance.", severity: "CRITICAL", cvss_score: 9.8, affected_systems: ["vpn-gateway-01"], remediation_steps: ["Apply vendor patch", "Disable remote management interface"], references: ["https://nvd.nist.gov/vuln/detail/CVE-2024-21762"] },
    ctx
  )
);

// 18. list_top_vulnerabilities
await run("list_top_vulnerabilities", () => topVulns.listTopVulnerabilities({}, ctx));

// 19. get_top_vulnerability
await run("get_top_vulnerability", () => topVulns.getTopVulnerability({ rank: 1 }, ctx));

// 20. delete_top_vulnerability
await run("delete_top_vulnerability", () => topVulns.deleteTopVulnerability({ rank: 1 }, ctx));

console.log(JSON.stringify(out, null, 2));
process.exit(0);
