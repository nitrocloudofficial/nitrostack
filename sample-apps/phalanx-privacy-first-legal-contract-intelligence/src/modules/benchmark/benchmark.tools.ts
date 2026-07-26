import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { BenchmarkService } from './benchmark.service.js';

@Injectable({ deps: [BenchmarkService] })
export class BenchmarkTools {
  constructor(private benchmarkService: BenchmarkService) {}

  @Tool({
    name: 'benchmark_clause',
    description: 'Benchmark a clause against standard benchmarks using TF-IDF cosine similarity',
    inputSchema: z.object({
      text: z.string().describe('Clause text to benchmark'),
      clauseType: z.string().describe('Type of the clause to benchmark against')
    })
  })
  async benchmarkClause(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Benchmarking clause', { clauseType: input.clauseType });
    return await this.benchmarkService.benchmarkClause(input.text, input.clauseType);
  }
}
