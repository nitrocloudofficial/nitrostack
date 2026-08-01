## 📌 PR Summary
<!-- Briefly describe what this PR accomplishes. Mention if this touches frontend UI, backend MCP tools, or shared contracts. -->
- **Component / Area**: `[e.g., packages/web, packages/server]`
- **Key Changes**:

---

## 🚨 Merge Gatekeeper Checklist (Mandatory before PR approval)
As the designated gatekeeper for `develop` / `main`, verify the following:

- [ ] **Zero Backend Contract Drift**: No modifications were made to `packages/server/src/shared/types.ts` or `FinalReport` shape without unanimous team alignment.
- [ ] **No Console Errors**: Verified in browser DevTools that running `npm run dev` yields zero errors or warnings.
- [ ] **3-Second Load Budget**: Report rendering and UI state transitions complete in under 3 seconds.
- [ ] **Graceful Degradation Verified**: Tested against mock data (`mockFinalReport.json`) and verified fallback behavior if live MCP API is unreachable.
- [ ] **Design Token Compliance**: UI changes strictly follow PromptIQ's dark palette (`#0B0F14`, `#161B22`, cyan `#00F2FE` accent) and glassmorphism standards.

---

## 📸 Screenshots / Recordings (For UI PRs)
<!-- Attach laptop/desktop screenshots of original vs optimized diff view, hero savings card, or cost comparison table. -->

---

## 🔗 Related Issue / Task
Closes #
