export interface BlackboardEntry {
  agent: string;
  category: string;
  content: string;
  timestamp: Date;
}

export class Blackboard {
  private entries: BlackboardEntry[] = [];

  publish(agent: string, category: string, content: string): void {
    this.entries.push({
      agent,
      category,
      content,
      timestamp: new Date(),
    });
  }

  read(): BlackboardEntry[] {
    return [...this.entries];
  }

  byAgent(agent: string): BlackboardEntry[] {
    return this.entries.filter((e) => e.agent === agent);
  }

  byCategory(category: string): BlackboardEntry[] {
    return this.entries.filter((e) => e.category === category);
  }

  latest(n = 10): BlackboardEntry[] {
    return this.entries.slice(-n);
  }

  summary(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const entry of this.entries) {
      counts[entry.category] = (counts[entry.category] || 0) + 1;
    }
    return counts;
  }

  categories(): string[] {
    return [...new Set(this.entries.map((e) => e.category))];
  }

  clear(): void {
    this.entries = [];
  }

  get size(): number {
    return this.entries.length;
  }
}
