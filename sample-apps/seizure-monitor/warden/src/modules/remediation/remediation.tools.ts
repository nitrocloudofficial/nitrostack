/**
 * scan_manifest — the entry point of the remediation pipeline. Parses a
 * dependency manifest, batch-queries OSV.dev for known vulnerabilities,
 * and returns raw per-package findings. Deliberately does NOT rank or
 * explain them — that's prioritise_findings' job (joins to CISA KEV /
 * FIRST EPSS) — this tool's only responsibility is "what's affected."
 */

import { ToolDecorator as Tool, Widget, UseInterceptors, ExecutionContext, z } from "@nitrostack/core";
import { createTwoFilesPatch } from "diff";
import { InvestigationTraceInterceptor } from "../investigation/investigation.interceptor.js";
import { parseManifest, type Ecosystem, type ManifestType } from "./manifest-parser.js";
import { queryBatch, getVulns, type OsvSeverity } from "./osv.client.js";
import { kevIndex } from "../../data/kev-loader.js";
import { getEpssScores } from "./epss.client.js";
import { rankPriority, type Priority } from "./priority.js";
import { parseVersion, compareVersions, isMajorBump } from "./semver.js";
import { minimalFixVersion } from "./fix-resolver.js";
import { escalateToCleanTarget } from "./escalate-target.js";
import { applyPlanToManifestJson, buildPrBody, type PlanEntry } from "./patch.js";

interface ManifestFinding {
  package: string;
  version: string;
  ecosystem: Ecosystem;
  declared_range: string;
  vulnerabilities: Array<{ id: string; summary?: string; aliases: string[] }>;
}

/** Input shape shared by prioritise_findings and plan_remediation — matches scan_manifest's `findings` output. */
interface FindingInput {
  package: string;
  version: string;
  ecosystem?: Ecosystem;
  declared_range?: string;
  vulnerabilities: Array<{ id: string; summary?: string; aliases?: string[] }>;
}

const FINDING_SCHEMA = z.object({
  package: z.string(),
  version: z.string(),
  ecosystem: z.enum(["npm", "PyPI", "Go"]).optional(),
  declared_range: z.string().optional(),
  vulnerabilities: z.array(
    z.object({
      id: z.string(),
      summary: z.string().optional(),
      aliases: z.array(z.string()).optional(),
    })
  ),
});

function extractCve(aliases: string[] = []): string | null {
  return aliases.find((a) => /^CVE-\d{4}-\d{4,}$/i.test(a))?.toUpperCase() ?? null;
}

/** OSV's severity[].score is usually a raw CVSS vector string, not a plain number — see priority.ts's comment. */
function extractCvss(severity: OsvSeverity[] = []): number | null {
  for (const s of severity) {
    if (/^\d+(\.\d+)?$/.test(s.score.trim())) return Number(s.score);
  }
  return null;
}

const PRIORITY_ORDER: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const PLAN_ENTRY_SCHEMA = z.object({
  package: z.string(),
  current_version: z.string(),
  target_version: z.string(),
  ecosystem: z.enum(["npm", "PyPI", "Go"]).optional(),
  breaking: z.boolean().optional(),
  fixes: z.array(z.string()).optional(),
  unresolved: z.array(z.string()).optional(),
  escalations: z.number().optional(),
  escalation_notes: z.array(z.string()).optional(),
});

export class RemediationTools {
  @Tool({
    name: "scan_manifest",
    description:
      "Scans a dependency manifest — package.json (npm), requirements.txt (PyPI), or go.mod (Go) — for known " +
      "vulnerabilities via OSV.dev (aggregates GitHub Advisory DB, npm advisories, PyPA advisories, the Go " +
      "vulnerability database, and others). Checks the version as declared in the manifest — range operators " +
      "stripped to a best-effort concrete version, NOT resolved against a lockfile, so results are approximate " +
      "for ranged dependencies (requirements.txt lines without a pinned `==` version are skipped entirely, since " +
      "there's no single version to check). Returns raw findings per package; call prioritise_findings next to " +
      "rank them by real-world exploitation evidence (CISA KEV + FIRST EPSS) instead of raw severity.",
    inputSchema: z.object({
      manifest: z.string().describe("Full contents of the manifest file."),
      manifest_type: z
        .enum(["package.json", "requirements.txt", "go.mod"])
        .default("package.json")
        .describe("Manifest format: package.json (npm), requirements.txt (PyPI), or go.mod (Go)."),
    }),
  })
  @UseInterceptors(InvestigationTraceInterceptor)
  async scanManifest(input: { manifest: string; manifest_type?: string }, _ctx: ExecutionContext) {
    const manifestType = (input.manifest_type ?? "package.json") as ManifestType;
    const deps = parseManifest(manifestType, input.manifest);
    if (deps.length === 0) {
      return {
        dependencies_scanned: 0,
        vulnerable_packages: 0,
        total_vulnerabilities: 0,
        findings: [] as ManifestFinding[],
        note:
          manifestType === "requirements.txt"
            ? "No dependencies with a pinned (==) version were found — ranged requirements have no single version to check."
            : "No dependencies with a resolvable concrete version were found in this manifest.",
      };
    }

    const batchResults = await queryBatch(
      deps.map((d) => ({ package: { name: d.name, ecosystem: d.ecosystem }, version: d.version }))
    );

    const allVulnIds = new Set<string>();
    const perPackageIds = deps.map((_, i) => (batchResults[i]?.vulns ?? []).map((v) => v.id));
    perPackageIds.forEach((ids) => ids.forEach((id) => allVulnIds.add(id)));

    const records = await getVulns([...allVulnIds]);
    const recordById = new Map(records.map((r) => [r.id, r]));

    const findings: ManifestFinding[] = [];
    deps.forEach((dep, i) => {
      const ids = perPackageIds[i];
      if (ids.length === 0) return;
      findings.push({
        package: dep.name,
        version: dep.version,
        ecosystem: dep.ecosystem,
        declared_range: dep.declared_range,
        vulnerabilities: ids.map((id) => {
          const record = recordById.get(id);
          return { id, summary: record?.summary, aliases: record?.aliases ?? [] };
        }),
      });
    });

    return {
      dependencies_scanned: deps.length,
      vulnerable_packages: findings.length,
      total_vulnerabilities: allVulnIds.size,
      findings,
      note:
        "Versions were derived from the manifest's declared range, not a resolved lockfile — treat exact-version " +
        "findings as approximate for ranged dependencies.",
    };
  }

  @Tool({
    name: "prioritise_findings",
    description:
      "Ranks scan_manifest's findings by real-world exploitation evidence instead of raw severity: CISA KEV " +
      "(confirmed active exploitation) first, then FIRST EPSS (predicted exploitation probability), with CVSS " +
      "as corroborating color only — never the deciding factor. A KEV-listed CVE with a mediocre CVSS score " +
      "outranks an unexploited 9.8. Pass the `findings` array from scan_manifest's output straight through.",
    inputSchema: z.object({
      findings: z.array(FINDING_SCHEMA).describe("The `findings` array from scan_manifest's output."),
    }),
  })
  @Widget('priority-table')
  @UseInterceptors(InvestigationTraceInterceptor)
  async prioritiseFindings(input: { findings: FindingInput[] }, _ctx: ExecutionContext) {
    const allIds = input.findings.flatMap((f) => f.vulnerabilities.map((v) => v.id));
    const records = await getVulns(allIds);
    const recordById = new Map(records.map((r) => [r.id, r]));

    const allCves = new Set<string>();
    for (const f of input.findings) {
      for (const v of f.vulnerabilities) {
        const cve = extractCve(v.aliases ?? recordById.get(v.id)?.aliases);
        if (cve) allCves.add(cve);
      }
    }
    const epssScores = await getEpssScores([...allCves]);

    const ranked = input.findings.map((f) => {
      const vulns = f.vulnerabilities
        .map((v) => {
          const record = recordById.get(v.id);
          const aliases = v.aliases ?? record?.aliases ?? [];
          const cve = extractCve(aliases);
          const kevEntry = cve ? kevIndex.get(cve) : undefined;
          const cvss = extractCvss(record?.severity);
          const epss = cve ? epssScores.get(cve)?.epss ?? null : null;
          const { priority, why } = rankPriority({
            cveId: cve ?? v.id,
            cvss,
            inKev: kevEntry !== undefined,
            ransomwareLinked: kevEntry?.ransomwareUse ?? false,
            epss,
          });
          return {
            id: v.id,
            cve,
            summary: v.summary ?? record?.summary,
            priority,
            why,
            in_kev: kevEntry !== undefined,
            ransomware_linked: kevEntry?.ransomwareUse ?? false,
            epss,
          };
        })
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

      return {
        package: f.package,
        version: f.version,
        highest_priority: vulns[0]?.priority ?? ("LOW" as Priority),
        vulnerabilities: vulns,
      };
    });

    ranked.sort((a, b) => PRIORITY_ORDER[a.highest_priority] - PRIORITY_ORDER[b.highest_priority]);

    return {
      packages_ranked: ranked.length,
      kev_source: kevIndex.source,
      ranked,
    };
  }

  @Tool({
    name: "plan_remediation",
    description:
      "Computes the minimum version upgrade that clears every known vulnerability for each package, from OSV's " +
      "`fixed` version events — then re-verifies that proposed target against OSV itself and escalates further " +
      "if the target version turns out to carry its own, independently-discovered vulnerabilities (capped at 5 " +
      "escalation rounds). This closes the gap where 'minimum fix for what we scanned' can still land on a " +
      "version with unrelated open CVEs (e.g. an old pre-rewrite release line). Flags major-version bumps as " +
      "breaking so the agent can report honestly (\"three safe patches, one needs a migration\") instead of " +
      "presenting every fix as equally safe. Vulnerabilities with no known fix in OSV yet are listed under " +
      "`unresolved`, not silently dropped.",
    inputSchema: z.object({
      findings: z.array(FINDING_SCHEMA).describe("The `findings` array from scan_manifest's output."),
    }),
  })
  @UseInterceptors(InvestigationTraceInterceptor)
  async planRemediation(input: { findings: FindingInput[] }, _ctx: ExecutionContext) {
    const allIds = input.findings.flatMap((f) => f.vulnerabilities.map((v) => v.id));
    const records = await getVulns(allIds);
    const recordById = new Map(records.map((r) => [r.id, r]));

    const plan = await Promise.all(
      input.findings.map(async (f) => {
        const current = parseVersion(f.version);
        if (!current) {
          return {
            package: f.package,
            current_version: f.version,
            target_version: f.version,
            ecosystem: f.ecosystem ?? "npm",
            breaking: false,
            fixes: [] as string[],
            unresolved: f.vulnerabilities.map((v) => v.id),
            escalations: 0,
            escalation_notes: [] as string[],
          };
        }

        let target = current;
        const fixes: string[] = [];
        const unresolved: string[] = [];
        const knownVulnIds = new Set<string>();
        for (const v of f.vulnerabilities) {
          knownVulnIds.add(v.id);
          const record = recordById.get(v.id);
          const fix = record ? minimalFixVersion(current, record, f.ecosystem ?? "npm", f.package) : null;
          if (!fix) {
            unresolved.push(v.id);
            continue;
          }
          fixes.push(v.id);
          if (compareVersions(fix, target) > 0) target = fix;
        }

        const escalation = await escalateToCleanTarget(f.package, f.ecosystem ?? "npm", target, knownVulnIds);
        target = escalation.target;

        return {
          package: f.package,
          current_version: f.version,
          target_version: `${target.major}.${target.minor}.${target.patch}`,
          ecosystem: f.ecosystem ?? "npm",
          breaking: isMajorBump(current, target),
          fixes,
          unresolved,
          escalations: escalation.escalations,
          escalation_notes: escalation.notes,
        };
      })
    );

    return {
      packages_planned: plan.length,
      breaking_changes: plan.filter((p) => p.breaking).length,
      fully_unresolved: plan.filter((p) => p.unresolved.length > 0 && p.fixes.length === 0).length,
      escalated_packages: plan.filter((p) => p.escalations > 0).length,
      plan,
      note:
        "target_version is the lowest version that clears every listed vulnerability AND was itself re-verified " +
        "clean against OSV (escalated further if not) — not necessarily the latest release. Entries with a " +
        "non-empty `unresolved` have no known fix in OSV yet. Entries with `escalations > 0` needed at least one " +
        "extra bump beyond the original 'minimum fix' — see that entry's `escalation_notes` for why.",
    };
  }

  @Tool({
    name: "generate_patch",
    description:
      "Turns plan_remediation's plan into an actual edit: a rewritten package.json (preserving each dependency's " +
      "original range-operator prefix, e.g. '^4.17.15' -> '^4.18.0'), a unified diff, and a PR description that " +
      "states upgrades, flags breaking (major-version) changes, and lists anything the patch does NOT fix. This " +
      "is the artifact the whole tool exists to produce — never run npm/package-manager commands to do this.",
    inputSchema: z.object({
      manifest: z.string().describe("Full contents of the original package.json file."),
      manifest_type: z.enum(["package.json"]).default("package.json"),
      plan: z.array(PLAN_ENTRY_SCHEMA).describe("The `plan` array from plan_remediation's output."),
    }),
  })
  @UseInterceptors(InvestigationTraceInterceptor)
  async generatePatch(input: { manifest: string; manifest_type?: string; plan: PlanEntry[] }, _ctx: ExecutionContext) {
    let json: unknown;
    try {
      json = JSON.parse(input.manifest);
    } catch (e) {
      throw new Error(`Invalid package.json: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (typeof json !== "object" || json === null) {
      throw new Error("Invalid package.json: expected a JSON object.");
    }

    const { applied, skipped } = applyPlanToManifestJson(json as Record<string, unknown>, input.plan);
    const patchedManifest = JSON.stringify(json, null, 2) + "\n";
    const diff = createTwoFilesPatch("package.json", "package.json", input.manifest, patchedManifest, "before", "after");

    const breakingApplied = input.plan
      .filter((p) => p.breaking && applied.some((a) => a.package === p.package))
      .map((p) => ({ package: p.package, from: p.current_version, to: p.target_version }));
    const stillUnresolved = input.plan.flatMap((p) => (p.unresolved ?? []).map((id) => `${p.package}: ${id}`));

    return {
      packages_patched: applied.length,
      packages_skipped: skipped.length,
      breaking_changes_applied: breakingApplied.length,
      applied,
      skipped,
      patched_manifest: patchedManifest,
      diff,
      pr_body: buildPrBody(applied, breakingApplied, stillUnresolved),
      note:
        "patched_manifest is regenerated via JSON.parse + re-serialize (2-space indent) — formatting outside the " +
        "changed dependency lines may shift if the original file used different spacing.",
    };
  }

  @Tool({
    name: "verify_fix",
    description:
      "Re-queries OSV.dev against the *proposed* target versions from a remediation plan to confirm the patch " +
      "actually clears the vulnerabilities — no npm/pip install, no filesystem writes, just a fast re-check " +
      "against live data. Flags anything still open (expected for entries plan_remediation already marked " +
      "unresolved — that's not a failure of this patch, OSV simply has no fix yet).",
    inputSchema: z.object({
      plan: z.array(PLAN_ENTRY_SCHEMA).describe("The `plan` array from plan_remediation's output, or generate_patch's `applied` list."),
    }),
  })
  @UseInterceptors(InvestigationTraceInterceptor)
  async verifyFix(input: { plan: PlanEntry[] }, _ctx: ExecutionContext) {
    const batchResults = await queryBatch(
      input.plan.map((p) => ({ package: { name: p.package, ecosystem: p.ecosystem ?? "npm" }, version: p.target_version }))
    );

    const results = input.plan.map((p, i) => {
      const remaining = (batchResults[i]?.vulns ?? []).map((v) => v.id);
      return {
        package: p.package,
        version: p.target_version,
        remaining_vulnerabilities: remaining,
        verified_clean: remaining.length === 0,
      };
    });

    const stillVulnerable = results.filter((r) => !r.verified_clean);

    return {
      packages_checked: results.length,
      fully_clean: results.length - stillVulnerable.length,
      still_vulnerable: stillVulnerable.length,
      results,
      note:
        stillVulnerable.length > 0
          ? "Some packages still have known vulnerabilities at their target version — expected for ones plan_remediation marked unresolved (no fix exists in OSV yet), not a bug in this patch."
          : "All target versions confirmed clean against OSV.dev's live database.",
    };
  }
}
