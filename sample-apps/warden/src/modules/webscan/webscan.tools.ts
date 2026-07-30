/**
 * scan_website — points at a live URL and runs three read-only checks in
 * one call: HTTP security headers, common exposed-file paths (.env, .git,
 * credential backups), and the TLS certificate. No auth, no external API,
 * no mutation of the target — just HTTP/TLS requests WARDEN already has
 * everything it needs to make.
 */

import { ToolDecorator as Tool, UseInterceptors, ExecutionContext, z } from "@nitrostack/core";
import { InvestigationTraceInterceptor } from "../investigation/investigation.interceptor.js";
import { evaluateHeaders, type HeaderFinding } from "./header-rules.js";
import { SENSITIVE_PATHS } from "./exposed-files.js";
import { checkTls, type TlsResult } from "./tls-check.js";
import { fingerprintTechnologies, type DetectedTechnology } from "./fingerprint.js";
import { scanHtmlForVulnerabilities, type HtmlVulnFinding } from "./html-vuln-rules.js";
import { queryBatch, getVulns } from "../remediation/osv.client.js";

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  redirect: "manual" | "follow" | "error" = "manual"
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect });
  } finally {
    clearTimeout(timer);
  }
}

interface ExposedFileResult {
  path: string;
  url: string;
  severity: "critical" | "high" | "medium";
  description: string;
  status: number | null;
  exposed: boolean;
  error?: string;
}

export class WebscanTools {
  @Tool({
    name: "scan_website",
    description:
      "Points at a live URL and checks HTTP security headers, common exposed-file paths (.env, .git, credential " +
      "backups), and the TLS certificate — all read-only, unauthenticated HTTP/TLS requests. Does not brute-force " +
      "directories, does not attempt exploitation, and never modifies the target. Returns a findings list with an " +
      "overall risk_level.",
    inputSchema: z.object({
      url: z.string().url().describe("The target site's URL, e.g. https://example.com."),
    }),
  })
  @UseInterceptors(InvestigationTraceInterceptor)
  async scanWebsite(input: { url: string }, _ctx: ExecutionContext) {
    let target: URL;
    try {
      target = new URL(input.url);
    } catch {
      throw new Error(`Invalid URL: ${input.url}`);
    }
    if (!/^https?:$/.test(target.protocol)) {
      throw new Error("Only http:// and https:// URLs are supported.");
    }

    let mainResponse: Response | null = null;
    let fetchError: string | null = null;
    try {
      mainResponse = await fetchWithTimeout(target.toString(), { method: "GET" }, 8000);
    } catch (e) {
      fetchError = e instanceof Error ? e.message : String(e);
    }

    if (!mainResponse) {
      return {
        url: target.toString(),
        reachable: false,
        risk_level: "UNKNOWN" as const,
        error: fetchError,
        note: "Could not reach the target — no header, file, or TLS checks were run.",
      };
    }

    const headerFindings: HeaderFinding[] = evaluateHeaders(mainResponse.headers);

    const exposedResults: ExposedFileResult[] = await Promise.all(
      SENSITIVE_PATHS.map(async (check) => {
        const probeUrl = `${target.origin}${check.path}`;
        try {
          const res = await fetchWithTimeout(probeUrl, { method: "GET" }, 5000);
          const exposed = res.status === 200 && res.headers.get("content-length") !== "0";
          return { ...check, url: probeUrl, status: res.status, exposed };
        } catch (e) {
          return { ...check, url: probeUrl, status: null, exposed: false, error: e instanceof Error ? e.message : String(e) };
        }
      })
    );

    const tlsResult: TlsResult | null =
      target.protocol === "https:" ? await checkTls(target.hostname, target.port ? Number(target.port) : 443) : null;

    const missingHighSeverityHeaders = headerFindings.filter((h) => h.status === "fail").length;
    const exposedFiles = exposedResults.filter((r) => r.exposed);
    const tlsWarningCount = tlsResult?.warnings.length ?? 0;

    const riskLevel =
      exposedFiles.some((f) => f.severity === "critical")
        ? "CRITICAL"
        : missingHighSeverityHeaders > 0 || exposedFiles.length > 0
          ? "HIGH"
          : tlsWarningCount > 0
            ? "MEDIUM"
            : "LOW";

    return {
      url: target.toString(),
      reachable: true,
      status: mainResponse.status,
      risk_level: riskLevel,
      headers: headerFindings,
      exposed_files: exposedResults,
      tls: tlsResult,
      note:
        "Exposed-file checks are single read-only GET probes against a fixed list of common sensitive paths — a " +
        "200 response with a body is reported as exposed, but confirm manually before treating a hit as certain " +
        "(some servers return 200 with a catch-all page for every path).",
    };
  }

  @Tool({
    name: "fingerprint_technology",
    description:
      "Detects the CMS, framework, server, and JS/CSS library identity (and version, where visible) of a live " +
      "URL from its HTTP response headers and page markup — no external service, just pattern matching. Where " +
      "the detected technology maps to a real OSV.dev ecosystem (e.g. npm for JS libraries, Packagist for " +
      "Drupal core), it also batch-queries OSV for known CVEs at that version. Most CMS/server software (e.g. " +
      "WordPress core, PHP, Apache, nginx) has no OSV ecosystem at all — for those, only detection is reported, " +
      "and the response says so explicitly rather than implying a clean CVE check that never ran.",
    inputSchema: z.object({
      url: z.string().url().describe("The target site's URL, e.g. https://example.com."),
    }),
  })
  @UseInterceptors(InvestigationTraceInterceptor)
  async fingerprintTechnology(input: { url: string }, _ctx: ExecutionContext) {
    let target: URL;
    try {
      target = new URL(input.url);
    } catch {
      throw new Error(`Invalid URL: ${input.url}`);
    }
    if (!/^https?:$/.test(target.protocol)) {
      throw new Error("Only http:// and https:// URLs are supported.");
    }

    let response: Response | null = null;
    let fetchError: string | null = null;
    try {
      // Follow redirects here (unlike scan_website's header check) — fingerprinting needs the
      // actual rendered page, not an empty-bodied 30x redirect stub.
      response = await fetchWithTimeout(target.toString(), { method: "GET" }, 8000, "follow");
    } catch (e) {
      fetchError = e instanceof Error ? e.message : String(e);
    }

    if (!response) {
      return {
        url: target.toString(),
        reachable: false,
        error: fetchError,
        technologies: [] as DetectedTechnology[],
        note: "Could not reach the target — no fingerprinting was attempted.",
      };
    }

    const html = await response.text();
    const detected = fingerprintTechnologies({ headers: response.headers, html });

    const versionedWithOsv = detected.filter((t): t is DetectedTechnology & { version: string; osv_ecosystem: NonNullable<DetectedTechnology["osv_ecosystem"]>; osv_package: string } =>
      Boolean(t.version && t.osv_ecosystem && t.osv_package)
    );

    let cveMatched: Array<{ technology: string; version: string; vulnerabilities: Array<{ id: string; summary?: string }> }> = [];
    if (versionedWithOsv.length > 0) {
      const batchResults = await queryBatch(
        versionedWithOsv.map((t) => ({ package: { name: t.osv_package, ecosystem: t.osv_ecosystem }, version: t.version }))
      );
      const allIds = new Set<string>();
      const perTechIds = versionedWithOsv.map((_, i) => (batchResults[i]?.vulns ?? []).map((v) => v.id));
      perTechIds.forEach((ids) => ids.forEach((id) => allIds.add(id)));
      const records = await getVulns([...allIds]);
      const recordById = new Map(records.map((r) => [r.id, r]));
      cveMatched = versionedWithOsv.map((t, i) => ({
        technology: t.name,
        version: t.version,
        vulnerabilities: perTechIds[i].map((id) => ({ id, summary: recordById.get(id)?.summary })),
      })).filter((entry) => entry.vulnerabilities.length > 0);
    }

    const unmatchable = detected.filter((t) => !t.osv_ecosystem);

    return {
      url: target.toString(),
      reachable: true,
      technologies: detected,
      cve_matches: cveMatched,
      note:
        detected.length === 0
          ? "No known technology signatures matched this page."
          : unmatchable.length > 0
            ? `${unmatchable.map((t) => t.name).join(", ")} detected but has no OSV.dev ecosystem mapping — no CVE check was possible for ${unmatchable.length === 1 ? "it" : "them"}; cross-check the version manually against the vendor's own advisories.`
            : "Every detected technology with a version was checked against OSV.dev.",
    };
  }

  @Tool({
    name: "scan_html_vulnerabilities",
    description:
      "Scans a page's raw HTML markup for client-side vulnerability patterns that header/TLS checks can't see: " +
      "hardcoded secrets (AWS/Google/Stripe/Slack keys, private-key blocks), forms with a password field " +
      "submitting over plain HTTP, DOM-based XSS sinks (innerHTML/document.write/eval fed by location/referrer), " +
      "mixed content, reverse-tabnabbing links (target=_blank without rel=noopener), third-party scripts/styles " +
      "missing Subresource Integrity, sensitive HTML comments, and inline event-handler attributes. Pass either " +
      "`url` to fetch a live page, or `html` to scan markup directly (e.g. a saved file or test fixture) without " +
      "making a network request. Plain regex over markup only — no headless browser, no exploitation attempts, " +
      "never mutates the target.",
    inputSchema: z
      .object({
        url: z.string().url().optional().describe("Live URL to fetch and scan. Required if `html` is not provided."),
        html: z
          .string()
          .optional()
          .describe(
            "Raw HTML to scan directly instead of fetching. If `url` is also given, it's used only to resolve " +
              "relative URLs and to determine http/https for mixed-content and insecure-form checks — the page is " +
              "not fetched."
          ),
      })
      .refine((v) => Boolean(v.url || v.html), { message: "Provide `url`, `html`, or both." }),
  })
  @UseInterceptors(InvestigationTraceInterceptor)
  async scanHtmlVulnerabilities(input: { url?: string; html?: string }, _ctx: ExecutionContext) {
    let pageUrl: URL | null = null;
    if (input.url) {
      try {
        pageUrl = new URL(input.url);
      } catch {
        throw new Error(`Invalid URL: ${input.url}`);
      }
      if (!/^https?:$/.test(pageUrl.protocol)) {
        throw new Error("Only http:// and https:// URLs are supported.");
      }
    }

    let html: string;
    if (input.html !== undefined) {
      html = input.html;
    } else {
      let response: Response | null = null;
      let fetchError: string | null = null;
      try {
        response = await fetchWithTimeout(pageUrl!.toString(), { method: "GET" }, 8000, "follow");
      } catch (e) {
        fetchError = e instanceof Error ? e.message : String(e);
      }
      if (!response) {
        return {
          source: pageUrl!.toString(),
          reachable: false,
          error: fetchError,
          findings: [] as HtmlVulnFinding[],
          risk_level: "UNKNOWN" as const,
          note: "Could not reach the target — no HTML content checks were run.",
        };
      }
      html = await response.text();
      pageUrl = new URL(response.url);
    }

    const findings = scanHtmlForVulnerabilities(html, pageUrl);
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of findings) counts[f.severity]++;

    const riskLevel =
      counts.critical > 0 ? "CRITICAL" : counts.high > 0 ? "HIGH" : counts.medium > 0 ? "MEDIUM" : counts.low > 0 ? "LOW" : "CLEAN";

    return {
      source: pageUrl ? pageUrl.toString() : "inline html",
      reachable: true,
      risk_level: riskLevel,
      counts,
      findings,
      note:
        findings.length === 0
          ? "No markup-level vulnerability patterns matched."
          : "Regex-based static analysis of markup only — verify each finding manually before treating it as confirmed (e.g. a DOM-sink match doesn't prove the value is actually attacker-reachable).",
    };
  }
}
