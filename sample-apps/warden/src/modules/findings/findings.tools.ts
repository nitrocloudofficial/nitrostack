import { ToolDecorator as Tool, UseInterceptors, ExecutionContext, z } from "@nitrostack/core";
import { InvestigationTraceInterceptor } from "../investigation/investigation.interceptor.js";
import { FINDING_CLASSES, type FindingClass } from "../triage/triage-rules.js";
import { classifyFinding } from "./classify.js";
import { buildDedupeKey } from "./dedupe-key.js";
import { derivePriority, deriveComplexity } from "./priority-complexity.js";
import { upsertFinding, queryFindings, getFindingHistory, type FindingStatus } from "./findings.service.js";

const FINDING_CLASS_VALUES = FINDING_CLASSES as unknown as [FindingClass, ...FindingClass[]];
const PRIORITY_VALUES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
const STATUS_VALUES = ["open", "suggested", "applied_externally", "resolved", "dismissed"] as const;

export class FindingsTools {
  @Tool({
    name: "ingest_finding",
    description:
      "Accepts one finding from any scanner — WARDEN's own (scan_manifest, scan_website, fingerprint_technology, " +
      "check_domain_security, read_threat_report) or an external MCP scanner server's output pasted in by the " +
      "caller — auto-classifies it into WARDEN's 12-class taxonomy, scores priority (CISA KEV + FIRST EPSS, same " +
      "logic as prioritise_findings) and complexity, and persists it. Findings are deduplicated: seeing the same " +
      "package+CVE/indicator again bumps its occurrence count and logs a 'reoccurred' event instead of creating a " +
      "duplicate row — this is what analyze_finding_history reads. If the source is unrecognized and the finding " +
      "class can't be determined confidently, this tool throws asking for `hint.finding_class` rather than " +
      "guessing silently.",
    inputSchema: z.object({
      source: z.string().describe("Where this finding came from, e.g. 'scan_manifest', 'scan_website', or 'external:<scanner-name>'."),
      raw: z.record(z.string(), z.unknown()).describe("The raw finding payload from that source (one finding, not a whole scan response)."),
      hint: z
        .object({
          finding_class: z.enum(FINDING_CLASS_VALUES).optional(),
          package_name: z.string().optional(),
          cve: z.string().optional(),
          indicator: z.string().optional(),
          description: z.string().optional(),
        })
        .optional()
        .describe("Overrides/help for classification — required when `source` is unrecognized and auto-classification can't determine a class."),
      investigation_id: z.string().optional().describe("Cross-links this finding back to an investigation's audit trail."),
    }),
  })
  @UseInterceptors(InvestigationTraceInterceptor)
  async ingestFinding(
    input: {
      source: string;
      raw: Record<string, unknown>;
      hint?: {
        finding_class?: FindingClass;
        package_name?: string;
        cve?: string;
        indicator?: string;
        description?: string;
      };
      investigation_id?: string;
    },
    _ctx: ExecutionContext
  ) {
    const classified = classifyFinding(input.source, input.raw, input.hint);
    if (!classified.finding_class) {
      throw new Error(
        `Could not confidently auto-classify a finding from source '${input.source}'. Supply hint.finding_class ` +
          `(one of: ${FINDING_CLASSES.join(", ")}) and call ingest_finding again.`
      );
    }

    const dedupeKey = buildDedupeKey({
      finding_class: classified.finding_class,
      package_name: classified.package_name,
      cve: classified.cve,
      indicator: classified.indicator,
      description: classified.description,
    });

    const priorityResult = await derivePriority(classified.cve);
    const complexity = deriveComplexity({ finding_class: classified.finding_class, fixable: classified.fixable });

    const { finding, is_new } = await upsertFinding({
      dedupe_key: dedupeKey,
      source: input.source,
      finding_class: classified.finding_class,
      package_name: classified.package_name,
      cve: classified.cve,
      indicator: classified.indicator,
      priority: priorityResult?.priority ?? null,
      complexity,
      fixable: classified.fixable,
      description: classified.description,
      investigation_id: input.investigation_id,
      raw_evidence: input.raw,
    });

    return {
      finding,
      is_new,
      dedupe_key: dedupeKey,
      priority_reasoning: priorityResult?.why ?? "No CVE on this finding — priority left unset (needs a CVE to check against CISA KEV / FIRST EPSS).",
    };
  }

  @Tool({
    name: "query_findings",
    description:
      "Lists persisted findings, filterable and sortable by class, priority, complexity, fixability, and status — " +
      "'sorted according to the client's wish.' Backed by the same findings table ingest_finding writes to.",
    inputSchema: z.object({
      finding_class: z.enum(FINDING_CLASS_VALUES).optional(),
      fixable: z.boolean().optional(),
      status: z.enum(STATUS_VALUES).optional(),
      priority: z.enum(PRIORITY_VALUES).optional(),
      sort_by: z.enum(["priority", "complexity", "last_seen_at", "occurrence_count"]).optional().describe("Defaults to last_seen_at (most recent first)."),
      sort_dir: z.enum(["asc", "desc"]).optional(),
      limit: z.number().int().positive().max(500).optional(),
    }),
  })
  @UseInterceptors(InvestigationTraceInterceptor)
  async queryFindingsTool(
    input: {
      finding_class?: FindingClass;
      fixable?: boolean;
      status?: FindingStatus;
      priority?: (typeof PRIORITY_VALUES)[number];
      sort_by?: "priority" | "complexity" | "last_seen_at" | "occurrence_count";
      sort_dir?: "asc" | "desc";
      limit?: number;
    },
    _ctx: ExecutionContext
  ) {
    const findings = await queryFindings(input);
    return { count: findings.length, findings };
  }

  @Tool({
    name: "analyze_finding_history",
    description:
      "Given a finding's dedupe_key (returned by ingest_finding), returns its full event timeline — first seen, " +
      "last seen, occurrence count, and whether it has reoccurred after being marked resolved. This is the " +
      "recurrence / 'has this happened before, why does it keep happening' answer — it reads finding_events, the " +
      "append-only log, not just the findings table's current-state row.",
    inputSchema: z.object({
      dedupe_key: z.string().describe("The dedupe_key from a prior ingest_finding call."),
    }),
  })
  @UseInterceptors(InvestigationTraceInterceptor)
  async analyzeFindingHistory(input: { dedupe_key: string }, _ctx: ExecutionContext) {
    const { finding, events } = await getFindingHistory(input.dedupe_key);
    if (!finding) {
      return { found: false, dedupe_key: input.dedupe_key, note: "No finding with this dedupe_key has ever been recorded." };
    }

    const resolvedThenReoccurred = events.some(
      (e, i) => e.event_type === "resolved" && events.slice(i + 1).some((later) => later.event_type === "reoccurred")
    );

    return {
      found: true,
      finding,
      occurrence_count: finding.occurrence_count,
      first_seen_at: finding.first_seen_at,
      last_seen_at: finding.last_seen_at,
      is_recurring: finding.occurrence_count > 1,
      resolved_then_reoccurred: resolvedThenReoccurred,
      event_timeline: events,
    };
  }
}
