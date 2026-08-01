# 🔍 TokenSlash Feature Importance & Model Explainability Report

### Top Feature Rankings Across All 3 Targets

#### Model 1: Expected User Satisfaction (Champion: XGBoost)
1. **complexityScore** (Weight: `0.245`) - Primary driver determining required model capability tier.
2. **retryCountPenalty** (Weight: `0.218`) - Heavy negative impact when model requires user iterations.
3. **lmsysElo** (Weight: `0.182`) - Overall model intelligence Elo rating.
4. **codingScore / sweBench** (Weight: `0.154`) - Crucial for code generation prompts.
5. **phrase_step_by_step** (Weight: `0.082`) - High indicator for chain-of-thought requirement.

#### Model 2: Expected Retry Count (Champion: Random Forest)
1. **tierMismatch** (Weight: `0.342`) - Main predictor for user prompt failure when model tier is insufficient.
2. **codeDensity** (Weight: `0.215`) - Complex code prompts without high coding scores increase retry likelihood.
3. **hallucinationRate** (Weight: `0.165`) - Models with higher hallucination rates generate more retries.

#### Model 3: Expected Latency (Champion: LightGBM)
1. **outputTokens / estTokens** (Weight: `0.412`) - Generation length directly drives response time.
2. **baseLatency** (Weight: `0.385`) - Model provider architecture baseline speed.
3. **isCotRequired** (Weight: `0.120`) - Reasoning models (o1/o3-mini) introduce additional thinking latency.
