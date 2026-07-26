import { Blackboard, type BlackboardEntry } from './blackboard.js';

export interface KnowledgeContext {
  facts: string[];
  risks: string[];
  recommendations: string[];
  questions: string[];
  decisions: string[];
}

export class KnowledgeService {
  categorize(entries: BlackboardEntry[]): KnowledgeContext {
    const ctx: KnowledgeContext = {
      facts: [],
      risks: [],
      recommendations: [],
      questions: [],
      decisions: [],
    };

    for (const entry of entries) {
      const lower = entry.content.toLowerCase();

      if (/risk|threat|vulnerab|danger|warning/i.test(lower)) {
        ctx.risks.push(entry.content);
      }
      if (/recommend|suggest|advise|should|consider/i.test(lower)) {
        ctx.recommendations.push(entry.content);
      }
      if (/\?/.test(entry.content)) {
        ctx.questions.push(entry.content);
      }
      if (/decide|decision|chose|selected|approved/i.test(lower)) {
        ctx.decisions.push(entry.content);
      }

      ctx.facts.push(entry.content);
    }

    return ctx;
  }

  formatContext(blackboard: Blackboard): string {
    const entries = blackboard.read();
    if (entries.length === 0) return 'No enterprise knowledge available.';

    const ctx = this.categorize(entries);
    const sections: string[] = ['## Enterprise Knowledge'];

    if (ctx.facts.length > 0) {
      sections.push(`### Facts\n${ctx.facts.map((f) => `- ${f}`).join('\n')}`);
    }
    if (ctx.risks.length > 0) {
      sections.push(`### Risks\n${ctx.risks.map((r) => `- ${r}`).join('\n')}`);
    }
    if (ctx.recommendations.length > 0) {
      sections.push(`### Recommendations\n${ctx.recommendations.map((r) => `- ${r}`).join('\n')}`);
    }
    if (ctx.questions.length > 0) {
      sections.push(`### Open Questions\n${ctx.questions.map((q) => `- ${q}`).join('\n')}`);
    }
    if (ctx.decisions.length > 0) {
      sections.push(`### Decisions\n${ctx.decisions.map((d) => `- ${d}`).join('\n')}`);
    }

    return sections.join('\n\n');
  }
}
