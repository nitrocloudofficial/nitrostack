import { ExecutionContext, Injectable, ToolDecorator as Tool, UseInterceptors, z } from "@nitrostack/core";
import { InvestigationTraceInterceptor } from "../investigation/investigation.interceptor.js";
import { investigationStore } from "../investigation/store.js";
import { FINDING_CLASSES, type FindingClass } from "./triage-rules.js";
import { TriageService } from "./triage.service.js";
import { applyToolAvailability } from "./tool-availability.js";
import { buildDedupeKey } from "../findings/dedupe-key.js";
import { derivePriority, deriveComplexity } from "../findings/priority-complexity.js";
import { upsertFinding } from "../findings/findings.service.js";
import { suggestMitigations } from "../mitigation/mitigation-rules.js";

const FINDING_CLASS_VALUES = FINDING_CLASSES as unknown as [FindingClass, ...FindingClass[]];

@Injectable({ deps: [TriageService] })
export class TriageTools {
  constructor(private readonly triageService: TriageService) {}

  @Tool({
    name: "triage_finding",
    description:
      "Classifies one security finding into auto_fix, reviewed_auto_fix, human_review, human_operations, or " +
      "no_fix_yet. It never rotates credentials, modifies infrastructure, or applies code changes; it states the " +
      "safe owner and next action. Optionally report `available_tools` (what's actually connected) — an " +
      "auto_fix-eligible finding without a reported patch-generation tool gets downgraded to human_review, since " +
      "WARDEN can't verify another MCP server's tool list on its own. Every finding — fixable or not — is " +
      "persisted (priority/complexity scored, deduplicated by package+CVE/indicator) so it survives past this " +
      "single call; a fixable finding is stored as a *suggestion* (status: suggested) and is never auto-applied.",
    inputSchema: z.object({
      finding_class: z.enum(FINDING_CLASS_VALUES).describe("The class of scan finding to route."),
      patch_available: z.boolean().optional().describe("Whether a known upstream or vendor patch exists."),
      breaking_change: z.boolean().optional().describe("Whether the proposed dependency or image upgrade is a breaking change."),
      available_tools: z.array(z.string()).optional().describe("Tool names the calling agent currently has connected — used only to downgrade auto_fix when no patch-applying tool is actually available."),
      package_name: z.string().optional(),
      cve: z.string().optional(),
      indicator: z.string().optional(),
      context: z.string().optional().describe("A short human-readable description of the specific finding (e.g. package name + CVE) to store alongside the persisted record."),
      investigation_id: z.string().optional().describe("The current investigation id, if any, to cross-link the persisted record back to its audit trail."),
    }),
  })
  @UseInterceptors(InvestigationTraceInterceptor)
  async triageFinding(
    input: {
      finding_class: FindingClass;
      patch_available?: boolean;
      breaking_change?: boolean;
      available_tools?: string[];
      package_name?: string;
      cve?: string;
      indicator?: string;
      context?: string;
      investigation_id?: string;
    },
    _ctx: ExecutionContext
  ) {
    let decision = this.triageService.classify(input);
    decision = applyToolAvailability(decision, input.finding_class, input.available_tools);

    // Old in-memory queue — kept for backward compatibility with cti://queue/needs-human.
    let queued: { queued: false } | { queued: true; queue_id: string; resource: string } = { queued: false };
    if (decision.route !== "auto_fix") {
      const item = investigationStore.enqueueNeedsHuman({
        finding_class: input.finding_class,
        route: decision.route,
        queue: decision.queue,
        next_action: decision.next_action,
        rationale: decision.rationale,
        investigation_id: input.investigation_id,
        context: input.context,
      });
      queued = { queued: true, queue_id: item.id, resource: "cti://queue/needs-human" };
    }

    // New durable persistence — every route, fixable or not.
    const description = input.context ?? decision.next_action;
    const dedupeKey = buildDedupeKey({
      finding_class: input.finding_class,
      package_name: input.package_name ?? null,
      cve: input.cve ?? null,
      indicator: input.indicator ?? null,
      description,
    });

    const fixable = decision.route === "auto_fix";
    let persisted: { persisted: true; dedupe_key: string } | { persisted: false; persistence_error: string };
    try {
      const priorityResult = await derivePriority(input.cve ?? null);
      const complexity = deriveComplexity({ finding_class: input.finding_class, fixable, breaking: input.breaking_change });
      const mitigations = decision.route !== "auto_fix" ? suggestMitigations(input.finding_class) : [];
      const suggestedSolution =
        decision.next_action + (mitigations.length > 0 ? ` Compensating controls: ${mitigations.map((m) => m.control).join(", ")}.` : "");

      await upsertFinding({
        dedupe_key: dedupeKey,
        source: "triage_finding",
        finding_class: input.finding_class,
        package_name: input.package_name ?? null,
        cve: input.cve ?? null,
        indicator: input.indicator ?? null,
        priority: priorityResult?.priority ?? null,
        complexity,
        fixable,
        route: decision.route,
        description,
        suggested_solution: suggestedSolution,
        investigation_id: input.investigation_id ?? null,
        raw_evidence: input,
      });
      persisted = { persisted: true, dedupe_key: dedupeKey };
    } catch (e) {
      // Never let a persistence failure (e.g. Supabase not configured) crash the routing decision itself.
      persisted = { persisted: false, persistence_error: e instanceof Error ? e.message : String(e) };
    }

    return { finding_class: input.finding_class, ...decision, ...queued, ...persisted };
  }
}
