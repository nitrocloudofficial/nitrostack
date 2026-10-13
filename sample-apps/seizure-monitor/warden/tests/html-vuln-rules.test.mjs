import assert from "node:assert/strict";
import { scanHtmlForVulnerabilities } from "../dist/modules/webscan/html-vuln-rules.js";

const httpsUrl = new URL("https://example.com/page");
const httpUrl = new URL("http://example.com/page");

// hardcoded_secret
{
  const findings = scanHtmlForVulnerabilities('<script>const key = "AKIAABCDEFGHIJKLMNOP";</script>', httpsUrl);
  const f = findings.find((x) => x.category === "hardcoded_secret");
  assert.ok(f, "expected a hardcoded_secret finding");
  assert.equal(f.severity, "critical");
  assert.ok(!f.evidence.includes("ABCDEFGHIJKLMNOP"), "secret must be masked, not returned in full");
}

// insecure_form_submission
{
  const html = '<form method="post" action="http://example.com/login"><input type="password" name="p"></form>';
  const findings = scanHtmlForVulnerabilities(html, httpsUrl);
  const f = findings.find((x) => x.category === "insecure_form_submission");
  assert.ok(f, "expected an insecure_form_submission finding");
  assert.equal(f.severity, "critical");
}

// dom_xss_sink (source + sink correlation raises severity to high)
{
  const html = "<script>document.getElementById('x').innerHTML = location.hash.slice(1);</script>";
  const findings = scanHtmlForVulnerabilities(html, httpsUrl);
  const f = findings.find((x) => x.category === "dom_xss_sink");
  assert.ok(f, "expected a dom_xss_sink finding");
  assert.equal(f.severity, "high");
}

// mixed_content (only flagged on an https page)
{
  const html = '<img src="http://cdn.example.com/logo.png">';
  assert.ok(scanHtmlForVulnerabilities(html, httpsUrl).some((x) => x.category === "mixed_content"));
  assert.ok(!scanHtmlForVulnerabilities(html, httpUrl).some((x) => x.category === "mixed_content"));
}

// reverse_tabnabbing
{
  const findings = scanHtmlForVulnerabilities('<a href="https://external.example" target="_blank">go</a>', httpsUrl);
  assert.ok(findings.some((x) => x.category === "reverse_tabnabbing"));
  const safe = scanHtmlForVulnerabilities('<a href="https://external.example" target="_blank" rel="noopener">go</a>', httpsUrl);
  assert.ok(!safe.some((x) => x.category === "reverse_tabnabbing"));
}

// missing_sri
{
  const html = '<script src="https://cdn.other.com/lib.js"></script>';
  assert.ok(scanHtmlForVulnerabilities(html, httpsUrl).some((x) => x.category === "missing_sri"));
  const withIntegrity = '<script src="https://cdn.other.com/lib.js" integrity="sha384-abc"></script>';
  assert.ok(!scanHtmlForVulnerabilities(withIntegrity, httpsUrl).some((x) => x.category === "missing_sri"));
}

// sensitive_comment
{
  const findings = scanHtmlForVulnerabilities("<!-- TODO: remove hardcoded password before ship -->", httpsUrl);
  assert.ok(findings.some((x) => x.category === "sensitive_comment"));
}

// inline_event_handlers
{
  const findings = scanHtmlForVulnerabilities('<button onclick="doThing()">click</button>', httpsUrl);
  assert.ok(findings.some((x) => x.category === "inline_event_handlers"));
}

// clean page — no findings
{
  const html = '<html><body><h1>Hello</h1><a href="https://example.com">link</a></body></html>';
  assert.deepEqual(scanHtmlForVulnerabilities(html, httpsUrl), []);
}

console.log("html-vuln-rules test passed");
