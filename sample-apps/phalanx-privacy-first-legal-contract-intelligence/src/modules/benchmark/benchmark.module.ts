import { Module } from '@nitrostack/core';
import { BenchmarkTools } from './benchmark.tools.js';
import { BenchmarkService } from './benchmark.service.js';

@Module({
  name: 'benchmark',
  controllers: [BenchmarkTools],
  providers: [BenchmarkService],
  exports: [BenchmarkService]
})
export class BenchmarkModule {}
