# 📈 TokenSlash Dataset Statistics & Coverage Report

### Data Source Breakdown
* **Public Conversation Sources**: LMSYS Chat-1M, OpenAssistant (oasst1), UltraChat 200k, ShareGPT52K, Dolly 15k, Alpaca, MT-Bench
* **Benchmark Capability Datasets**: LiveBench, Arena Hard, MMLU Pro, SWE-Bench, HumanEval, GPQA, LMSYS Arena Elo
* **Official Pricing Sources**: OpenAI API Pricing, Anthropic API Pricing, Google AI Developer Pricing

### Dataset Distribution
* **Total Clean Dataset Size**: 1,247 prompt records
* **Deduplication Rate**: 100% SHA-256 hash deduplication applied
* **Data Split**:
  - **70% Training**: 872 samples
  - **15% Validation**: 187 samples
  - **15% Test Set**: 188 samples

### Target Metric Ranges
* **Satisfaction Score (Model 1)**: 10.0 to 100.0 (Mean: 84.6)
* **Retry Count (Model 2)**: 0 to 3 retries (Mean: 0.22)
* **Latency (Model 3)**: 0.5s to 12.0s (Mean: 2.35s)
