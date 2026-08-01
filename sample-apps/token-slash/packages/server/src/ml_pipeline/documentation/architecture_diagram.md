# 🏛️ TokenSlash ML Architecture & Flow Diagrams

```mermaid
graph TD
    A[Public Conversations & Benchmarks] --> B[Clean & Normalize Data]
    B --> C[Extract 5 Feature Groups]
    C --> D[Train 70/15/15 Data Split]
    D --> E1[Model 1: Satisfaction]
    D --> E2[Model 2: Retry Count]
    D --> E3[Model 3: Latency]
    E1 --> F[TokenSlash Scoring Engine]
    E2 --> F
    E3 --> F
    F --> G[NitroStack MCP Server Recommendations]
```

### Multi-Objective Scoring Equation

$$\text{TokenSlash Score} = 100 \times \frac{w_s \cdot \text{NormSat} + w_f \cdot \text{NormFit} - w_c \cdot \text{NormCost} - w_l \cdot \text{NormLat} - w_r \cdot \text{NormRetry}}{\sum w}$$
