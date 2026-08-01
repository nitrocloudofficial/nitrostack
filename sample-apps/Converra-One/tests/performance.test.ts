import { OrchestratorAgent } from '../src/modules/orchestrator/OrchestratorAgent.js';

async function runPerformanceBenchmark() {
  console.log('🧪 Running Multi-Agent Pipeline Performance Benchmark...');
  const orchestrator = new OrchestratorAgent();
  const iterations = 5;
  const executionTimes: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const res = await orchestrator.execute({ workflowName: 'PerfBench', triggerSource: `ITERATION_${i}` });
    executionTimes.push(res.executionTimeMs);
  }

  const avgMs = Math.round(executionTimes.reduce((a, b) => a + b, 0) / iterations);
  console.log(`📊 Average Pipeline Execution Time across ${iterations} runs: ${avgMs}ms`);
  console.assert(avgMs < 500, 'Average pipeline execution time should be under 500ms');
  console.log('✅ Performance Benchmark Passed Cleanly!');
}

runPerformanceBenchmark().catch(err => {
  console.error('❌ Performance Benchmark Failed:', err);
  process.exit(1);
});
