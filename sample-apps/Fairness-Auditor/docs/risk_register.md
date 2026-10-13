# ⚠️ AFO System Risk Register

| Risk Category | Identified Risk | Mitigation Strategy (Live) |
| :--- | :--- | :--- |
| **Statistical Validity** | False positives flagging non-biased combinations. | Implemented Benjamini-Hochberg False Discovery Rate (BH-FDR) correction on all p-values before flagging. |
| **Operational Safety** | AI applies a patch that breaks the core target service. | Zero-redeploy hot-swapping via Interceptor; original source code remains untouched. |
| **Model Hallucination** | Synthesizer drafts an invalid JSON mitigation policy. | Fallback to strictly validated schema; Agent 3 re-verifies logic against actual data before policy goes live. |
| **Data Privacy** | Sensitive demographic data leaks into the LLM prompt. | Target system sanitizes inputs; `proxy_fields.json` acts as a strict whitelist/blacklist constraint. |