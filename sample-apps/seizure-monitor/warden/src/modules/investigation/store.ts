/**
 * In-memory investigation trace store. Every tool call and every explicit
 * decision the agent records gets appended here, in order, with a
 * timestamp — this is what turns "the AI reasoned about it" from a claim
 * into something a judge (or an auditor) can actually read.
 */

export interface ToolStep {
  n: number;
  type: "tool";
  tool: string;
  outcome: string;
  timestamp: string;
}

export interface DecisionStep {
  n: number;
  type: "decision";
  text: string;
  reasoning: string;
  confidence: "high" | "medium" | "low";
  discarded: string[];
  timestamp: string;
}

export type InvestigationStep = ToolStep | DecisionStep;

export interface Investigation {
  id: string;
  question: string;
  started: string;
  steps: InvestigationStep[];
  conclusion: string | null;
}

/**
 * A finding that triage_finding routed to a human-owned queue (anything
 * other than `auto_fix`). This is the "personnel support database" — a
 * durable, browsable list of what still needs a person, separate from the
 * free-form investigation trace.
 */
export interface NeedsHumanItem {
  id: string;
  finding_class: string;
  route: string;
  queue: string;
  next_action: string;
  rationale: string;
  investigation_id?: string;
  context?: string;
  created: string;
}

class InvestigationStore {
  private investigations = new Map<string, Investigation>();
  private currentId: string | null = null;
  private needsHumanQueue: NeedsHumanItem[] = [];

  create(question: string, id?: string): Investigation {
    const investigationId = id ?? `inv-${Math.random().toString(36).slice(2, 8)}`;
    const investigation: Investigation = {
      id: investigationId,
      question,
      started: new Date().toISOString(),
      steps: [],
      conclusion: null,
    };
    this.investigations.set(investigationId, investigation);
    this.currentId = investigationId;
    return investigation;
  }

  private getOrCreate(id: string): Investigation {
    let inv = this.investigations.get(id);
    if (!inv) {
      inv = { id, question: "(unspecified — investigation created implicitly)", started: new Date().toISOString(), steps: [], conclusion: null };
      this.investigations.set(id, inv);
    }
    return inv;
  }

  get(id: string): Investigation | undefined {
    return this.investigations.get(id);
  }

  list(): Array<{ id: string; question: string; started: string; step_count: number }> {
    return [...this.investigations.values()].map((i) => ({
      id: i.id,
      question: i.question,
      started: i.started,
      step_count: i.steps.length,
    }));
  }

  getCurrentId(): string | null {
    return this.currentId;
  }

  setCurrentId(id: string) {
    this.currentId = id;
  }

  addToolStep(investigationId: string, tool: string, outcome: string) {
    const inv = this.getOrCreate(investigationId);
    inv.steps.push({
      n: inv.steps.length + 1,
      type: "tool",
      tool,
      outcome,
      timestamp: new Date().toISOString(),
    });
  }

  addDecisionStep(
    investigationId: string,
    decision: string,
    reasoning: string,
    confidence: "high" | "medium" | "low",
    discarded: string[]
  ) {
    const inv = this.getOrCreate(investigationId);
    inv.steps.push({
      n: inv.steps.length + 1,
      type: "decision",
      text: decision,
      reasoning,
      confidence,
      discarded,
      timestamp: new Date().toISOString(),
    });
    // The most recent decision doubles as the running conclusion, so the
    // resource always reflects the agent's latest synthesis without
    // requiring a separate "finish investigation" tool.
    inv.conclusion = decision;
  }

  enqueueNeedsHuman(item: Omit<NeedsHumanItem, "id" | "created">): NeedsHumanItem {
    const queued: NeedsHumanItem = {
      ...item,
      id: `needs-human-${Math.random().toString(36).slice(2, 8)}`,
      created: new Date().toISOString(),
    };
    this.needsHumanQueue.push(queued);
    return queued;
  }

  listNeedsHumanQueue(): NeedsHumanItem[] {
    return [...this.needsHumanQueue];
  }
}

export const investigationStore = new InvestigationStore();
