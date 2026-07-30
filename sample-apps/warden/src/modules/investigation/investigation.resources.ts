import { ResourceDecorator as Resource, ExecutionContext } from "@nitrostack/core";
import { investigationStore } from "./store.js";

export class InvestigationResources {
  @Resource({
    uri: "cti://investigation/{id}",
    name: "Investigation trace",
    description: "The full audit trail for one investigation: every tool call, decision, and dead end, in order.",
    mimeType: "application/json",
  })
  async getInvestigation(uri: string, _ctx: ExecutionContext) {
    // NitroStack resolves {id} against the requested URI internally but
    // hands the handler the raw resolved uri (not pre-extracted params) —
    // same convention as the templating in v1's hand-rolled server, just
    // parsed here instead of by the framework.
    const id = decodeURIComponent(uri.replace(/^cti:\/\/investigation\//, ""));
    const inv = investigationStore.get(id);
    if (!inv) {
      return { type: "json" as const, data: { error: `No investigation with id '${id}'.` } };
    }
    return { type: "json" as const, data: inv as unknown as Record<string, unknown> };
  }

  @Resource({
    uri: "cti://investigations",
    name: "All investigations",
    description: "A browsable list of every investigation this server has traced, most recent first.",
    mimeType: "application/json",
  })
  async listInvestigations(_uri: string, _ctx: ExecutionContext) {
    const list = investigationStore.list().reverse();
    return { type: "json" as const, data: { investigations: list } };
  }

  @Resource({
    uri: "cti://queue/needs-human",
    name: "Needs-human queue",
    description:
      "Every finding triage_finding routed to a human-owned queue (human_review, human_operations, or " +
      "no_fix_yet) — anything WARDEN would not apply on its own — most recent first.",
    mimeType: "application/json",
  })
  async listNeedsHumanQueue(_uri: string, _ctx: ExecutionContext) {
    const items = investigationStore.listNeedsHumanQueue().reverse();
    return { type: "json" as const, data: { items } };
  }
}
