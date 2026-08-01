# 🚀 TokenSlash Machine Learning Pipeline & Usage Intelligence Engine

TokenSlash is an **AI Usage Intelligence Engine** designed to predict the **optimal AI model** for every user prompt by balancing user satisfaction, prompt characteristics, NLP phrase vectorization, benchmark capabilities, pricing, latency, expected retries, and business constraints.

---

## 🏗️ End-to-End Pipeline Architecture

```text
  ┌────────────────────────────────────────────────────────┐
  │ 1. Public LLM Conversations & Benchmark Datasets       │
  │    (LMSYS Chat-1M, OASST1, LiveBench, MMLU Pro, Pricing)  │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 2. Data Cleaning & Deduplication (clean_and_normalize) │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 3. 5-Group Feature Extraction (Prompt, Phrase, User,   │
  │    Model Metadata, Business Constraints)               │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 4. Multi-Model Training & Evaluation (RF, XGBoost, LGB)│
  │    • Model 1: Expected Satisfaction (0–100)            │
  │    • Model 2: Expected Retry Count (0+)                │
  │    • Model 3: Expected Latency (seconds)               │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 5. Multi-Objective TokenSlash Scoring Engine              │
  │    Formula: Score = f(Sat, CapabilityFit, Cost, Lat,   │
  │                       HiddenRetries, BusinessRules)    │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 6. NitroStack MCP Server Tools (History & Recommender) │
  └────────────────────────────────────────────────────────┘
```

---

## 🛠️ Step-by-Step Execution Guide

### 1. Data Collection & Benchmark Aggregation
```bash
python packages/server/src/ml_pipeline/dataset/fetch_public_datasets.py
```

### 2. Data Cleaning & Deduplication
```bash
python packages/server/src/ml_pipeline/processed/clean_and_normalize.py
```

### 3. Feature Extraction & Vectorization
```bash
python packages/server/src/ml_pipeline/features/feature_extractor.py
```

### 4. Train & Select Best Models (RF, XGBoost, LightGBM)
```bash
python packages/server/src/ml_pipeline/training/train_all_models.py
```

### 5. Evaluate Performance & Explainability
```bash
python packages/server/src/ml_pipeline/evaluation/evaluate_models.py
```

### 6. Test Inference Engine
```bash
python packages/server/src/ml_pipeline/predictor/inference_engine.py
```

---

## 📊 Performance Metrics

* **Train / Validation / Test Split**: 70% Train / 15% Validation / 15% Test
* **Algorithms Compared**: Random Forest Regressor, XGBoost Regressor, LightGBM Regressor
* **Primary Target Metrics**: $R^2 \ge 0.90$, MAE $\le 1.8$, RMSE $\le 2.5$
