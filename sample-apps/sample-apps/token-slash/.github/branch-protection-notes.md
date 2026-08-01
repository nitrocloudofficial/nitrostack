# 🛡️ PromptIQ Repository & Branch Protection Rules

This document outlines the mandatory gatekeeping and branch protection rules enforced for the PromptIQ hackathon repository. Because our team of four is working across frontend (`packages/web`) and backend MCP tools (`packages/server`), strict merge coordination is required to prevent merge hell and broken demos.

---

## 1. Branching Strategy
- **`main`**: Production-ready code only. Highly protected. Deployed directly to Vercel/Render.
- **`develop`**: Primary integration branch. All feature branches must merge into `develop` first.
- **`feature/*`**: Individual teammate branches (e.g., `feature/ui-dashboard`, `feature/mcp-history-tool`, `feature/nitrostack-routing`).

---

## 2. GitHub Branch Protection Settings (Applied to `main` and `develop`)
1. **Require Pull Request Reviews before Merging**:
   - Minimum approvals required: **1 (Designated Merge Gatekeeper)**.
   - **No self-merging**: Teammates cannot approve or merge their own PRs.
2. **Require Status Checks to Pass before Merging**:
   - TypeScript type checking (`tsc --noEmit`).
   - Vitest unit test suite for MCP tools (`npm run test`).
   - Vite production bundle build test (`cd packages/web && npm run build`).
3. **Require Linear History / Squash Merging**:
   - All PRs must be squash-merged to keep the git log clean and revertible during demo crunch time.
4. **Do Not Allow Bypassing the Above Settings**:
   - Applies even to repository administrators during H0 to H13.

---

## 3. The 4 Golden Rules for Teammates
1. **Never Modify Backend Internals from Frontend**: If the `FinalReport` contract in `packages/server/src/shared/types.ts` is missing a field or needs adjustment, coordinate with Member C. Do not patch around it in the frontend.
2. **Always Test Against Mock Data First**: Ensure the UI works cleanly against `mockFinalReport.json` so demo preparation is unblocked even if the live MCP backend restarts.
3. **Zero Console Errors Rule**: Before requesting a review, open Chrome/Firefox DevTools and verify there are zero warnings or errors during a full analysis flow.
4. **Laptop/Projector Resolution First**: Prioritize desktop/laptop view (1440x900 and 1920x1080) as this is what judges will see during the live presentation.
