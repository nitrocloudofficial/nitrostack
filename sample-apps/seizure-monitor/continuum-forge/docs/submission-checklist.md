# 📋 Official Hackathon Submission Checklist & Verification Guide

Project: Continuum Forge  
Repository: https://github.com/AadiHaldar/continuum-forge  
Platform: NitroStack Cloud

---

## ✅ 1. Pre-Submission Verification Checklist

- [x] Deployment Status on NitroStack Cloud: Verified app status is LIVE on NitroStack Cloud.
- [x] GitHub Repository Access: Repo is public, code is updated on main branch, and compiles cleanly with zero TypeScript errors.
- [x] Sample Apps Registry: Submitted project directly to the official Sample Apps repository.
- [x] Documentation: README.md, docs/demo-script.md, and docs/verification.md included in repository.
- [x] Demo Video: Maximum 3-minute video prepared following the docs/demo-script.md guidelines.
- [x] Telemetry & Observability: Langfuse API keys (LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASE_URL) configured in NitroStack Cloud Environment Variables dashboard.

---

## 🔒 2. Critical Submission Restrictions Audit ("Don'ts")

| Restriction | Audit Result | Status |
| :--- | :--- | :---: |
| Do not submit an un-tested project | Passed `npm run build` and live telemetry validation | ✅ PASS |
| Do not omit environment variables documentation | Fully documented in README.md and .env.example | ✅ PASS |
| Do not omit installation instructions | Documented step-by-step in README.md | ✅ PASS |
| Do not use personal/unauthorized accounts | Using organizer-provisioned NitroStack Cloud account | ✅ PASS |
| Do not make GitHub repository private | Repository is public on main branch | ✅ PASS |

---

## 🛠️ 3. Environment Variables Audit for NitroStack Cloud

Ensure these exact keys are configured under NitroStack Cloud Dashboard -> continuum-forge -> Settings -> Environment Variables:

```
NODE_ENV=production
DATABASE_URL=postgres://user:password@ep-sample-pooler.neon.tech/neondb?sslmode=require
LANGFUSE_PUBLIC_KEY=pk-lf-a9917af2-b852-4d74-8280-68cb92f04f8c
LANGFUSE_SECRET_KEY=sk-lf-19608cf3-7d8e-41ea-a596-5c654da586ca
LANGFUSE_BASE_URL=https://jp.cloud.langfuse.com
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 👨‍⚖️ 4. Quick Verification Steps for Judges

1. Test Live MCP Endpoint: Connect NitroStudio or any MCP client to your deployed Cloud endpoint (`https://<app>.nitrostack.app/mcp`).
2. Run Scenario Prompt:
   > "Run the master orchestrator pipeline for Pump B burnout. Vibration 5.0 mm/s, Temp 95C. Use short verbosity mode."
3. Verify Langfuse Traces: Open Langfuse Traces Dashboard (https://jp.cloud.langfuse.com) to view live tool execution spans.
