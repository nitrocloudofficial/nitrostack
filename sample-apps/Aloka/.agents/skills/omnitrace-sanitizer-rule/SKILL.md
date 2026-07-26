---
name: omnitrace-sanitizer-rule
description: Telemetry Data Sanitization Standard
---
# Telemetry Data Sanitization Standard
Before any string extracted from CI logs, APM traces, or DOM console errors is sent to LLM prompts:
- Run regex filters to redact Bearer tokens, AWS keys, JWTs, and database passwords.
- Replace matching strings with `[REDACTED_SECRET]`.
- Enforce strict typing from `@omnitrace/shared/sanitizer`.
