# 🛡️ PromptIQ Production Intelligence Checklist

This checklist defines the enterprise production governance, monitoring, and safety verification criteria for PromptIQ.

---

## 1. 🔍 Data Leakage & Model Integrity
- [x] **Zero Target Leakage**: Confirmed exclusion of future history statistics (`acceptanceRate`, `userSatIndex`, `avgRetries`) from prompt satisfaction & retry features.
- [x] **Grouped Dataset Split**: 70% Train / 15% Validation / 15% Test split grouped by User ID.
- [x] **Leakage Auditor**: Automated check verifying feature-to-target correlations remain below strict threshold (`leakage_report.json`).

---

## 2. ⚡ Dynamic Model Routing & Simple Query Protection
- [x] **Dynamic Cost Normalizer**: Request cost normalized against estimated prompt token budget rather than static $0.02.
- [x] **Simple Query Routing**: Confirmed lightweight prompts ("What is the capital of France?", "Hello") naturally route to ultra-cheap/fast models (`deepseek-v3`, `gemini-3.5-flash`, `gpt-4o-mini`).
- [x] **Reasoning Allocation**: High-complexity coding & mathematical prompts route to top-tier reasoning models (`o3-mini`, `claude-3-5-sonnet`, `o1`).

---

## 3. 🔄 Continuous Self-Learning & Drift Detection
- [x] **Feedback Store**: User acceptance, rating, and actual vs predicted latency/cost logged to `feedback_dataset.csv`.
- [x] **Drift Monitoring**: Population Stability Index (PSI) and feature shift monitored via `drift_detector.py`.
- [x] **Controlled Retraining**: Automated retraining triggered ONLY when data drift or price changes exceed defined threshold (`retraining_plan.md`).

---

## 4. 🤖 Autonomous Research Agent & Onboarding
- [x] **Autonomous Pricing Scraper**: Periodically checks official provider pricing pages (OpenAI, Anthropic, Google, DeepSeek, Mistral).
- [x] **Zero-Retrain Model Onboarding**: New AI model releases inserted into capability database without retraining existing sub-models.
- [x] **Explainable AI Decision Trace**: Exported JSON trace detailing winner selection, candidate rankings, and cost trade-off rationale (`decision_trace.json`).
