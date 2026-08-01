# Cloud-Native Live Fraud Interception Agent Architecture

This document describes the end-to-end request lifecycle and component graph for the Live Fraud Interception Agent deployed on NitroCloud.

## System Architecture Diagram

```
                 LLM Client (NitroStudio / User Prompt)
                                   │
                                   ▼
                       [MCP Tools / FraudTools]
                                   │
 ┌─────────────────────────────────┴─────────────────────────────────┐
 │                                                                   │
 ▼                                                                   ▼
[MCP Resources / FraudResources]                               [AIService]
 │                                                                   │
 └─────────────────────────────────┬─────────────────────────────────┘
                                   │
                                   ▼
                           [DatasetService]
                                   │
                     ┌─────────────┴─────────────┐
                     │                           │
                     ▼                           ▼
             [MongoDB Atlas]               [Cloudinary]
             (Structured Data)             (Image Assets)
                     │
                     ▼
              [Rule Engine]
          (Post-Extraction Rules)
                     │
                     ▼
           [Next.js React Widgets]
          (Confidence & Risk Gauge)
                     │
                     ▼
               [Human Review]
```

## Request Flow Lifecycle

### 1. Tool / Resource Invocation
When the user or AI agent triggers `analyze_claim`, the `FraudTools` controller captures the request:
- It fetches structured claim records, customer history, and investigation timeline data from the database by calling the `DatasetService`.
- If the claim contains an image stored in Cloudinary (`imageUrl`), the `DatasetService` performs a Cloudinary fetch to download the image binary dynamically and convert it into a base64 string.

### 2. Isolation & AI Service Request
- The `AIService` wraps the Gemini API, receiving strictly structured metadata (claim text, history array, image base64 data). It contains **zero** filesystem operations or direct database connections.
- The prompt is compiled programmatically from templates inside `src/prompts/index.ts`. Gemini processes the document features and returns a structured JSON payload verifying document alignment.

### 3. Pure Rule Engine Evaluation
- After the AI returns the structured response, the deterministic `RuleEngine` evaluates active policies on the extracted fields:
  - **VelocityRule**: Detects transaction frequency anomalies.
  - **GeoImpossibilityRule**: Tracks physical distance conflicts.
  - **AmountAnomalyRule**: Validates values against historical benchmarks.
  - **DuplicateRule**: Catches duplicated claims within short time windows.
  - **NewPayeeHighValueRule**: Identifies suspicious new recipient transfers.
- The engine calculates the **Aggregate Risk Score** as the maximum combined risk metric.

### 4. Human Review & Persisted Feedback
- If the aggregate risk is too high or the AI confidence score is below the configured `CONFIDENCE_THRESHOLD`, `request_human_review` is invoked.
- The manual review task and corresponding timeline events are written to MongoDB Atlas.

### 5. Frontend Widget Visualization
- The Next.js widgets (`ConfidenceGauge`, `FraudAlertPanel`, `ReviewQueue`) receive the tool execution output dynamically via request query parameters and render the risk timeline securely for the investigator.
