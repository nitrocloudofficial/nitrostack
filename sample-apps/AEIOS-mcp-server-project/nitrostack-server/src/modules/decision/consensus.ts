import type { AgentResult } from '../agents/agents.service.js';

export interface ConsensusResult {
  score: number;
  confidence: number;
  selected: AgentResult[];
  discarded: AgentResult[];
  summary: string;
}

export class ConsensusEngine {
  evaluate(results: AgentResult[]): ConsensusResult {
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    const scored = successful.map((r) => ({
      result: r,
      weight: this.weight(r),
    }));

    scored.sort((a, b) => b.weight - a.weight);

    const avgWeight =
      scored.length > 0
        ? scored.reduce((sum, s) => sum + s.weight, 0) / scored.length
        : 0;

    return {
      score: scored[0]?.weight ?? 0,
      confidence: Math.min(1.0, avgWeight),
      selected: scored.map((s) => s.result),
      discarded: failed,
      summary: this.buildSummary(scored.map((s) => s.result)),
    };
  }

  private weight(result: AgentResult): number {
    let w = 1.0;
    if (result.output.length > 400) w += 0.3;
    if (/recommend/i.test(result.output)) w += 0.2;
    if (/risk/i.test(result.output)) w += 0.2;
    if (/architecture/i.test(result.output)) w += 0.2;
    if (/security/i.test(result.output)) w += 0.2;
    return w;
  }

  private buildSummary(results: AgentResult[]): string {
    if (results.length === 0) return 'No agent results available.';
    return results
      .map((r) => `**${r.role}**:\n${r.output}`)
      .join('\n\n---\n\n');
  }
}
