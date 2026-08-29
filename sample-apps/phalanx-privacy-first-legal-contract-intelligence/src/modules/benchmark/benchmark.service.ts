import { Injectable, defaultLogger } from '@nitrostack/core';
import { loadDataJson } from '../../common/data-path.js';

@Injectable()
export class BenchmarkService {
  private benchmarks: any[] = [];

  constructor() {
    this.loadBenchmarks();
  }

  private loadBenchmarks() {
    this.benchmarks = loadDataJson<any[]>('benchmarks.json', []);
    if (this.benchmarks.length === 0) {
      defaultLogger.warn('[benchmark] No benchmark corpus loaded — benchmark_clause will return not-found.');
    }
  }

  private getTfIdfVector(text: string): Record<string, number> {
    const words = text.toLowerCase().match(/\b(\w+)\b/g) || [];
    const counts: Record<string, number> = {};
    for (const w of words) {
      counts[w] = (counts[w] || 0) + 1;
    }
    return counts;
  }

  private cosineSimilarity(vec1: Record<string, number>, vec2: Record<string, number>): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const key in vec1) {
      if (vec2[key]) dotProduct += vec1[key] * vec2[key];
      norm1 += vec1[key] * vec1[key];
    }
    for (const key in vec2) {
      norm2 += vec2[key] * vec2[key];
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  async benchmarkClause(text: string, clauseType: string): Promise<any> {
    const targetBenchmark = this.benchmarks.find(b => b.clause_type === clauseType);
    if (!targetBenchmark) {
      return { error: 'Benchmark not found for clause type' };
    }

    const textVec = this.getTfIdfVector(text);
    const standardVec = this.getTfIdfVector(targetBenchmark.standard_text);
    
    const similarity = this.cosineSimilarity(textVec, standardVec);

    return {
      clauseType,
      similarityScore: similarity,
      isStandard: similarity > 0.8,
      standardText: targetBenchmark.standard_text
    };
  }
}
