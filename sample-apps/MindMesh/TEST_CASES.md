# ScholarPilot MCP Server - Test Cases Checklist

## Project Overview
This document provides manual test cases to verify your ScholarPilot MCP server (14-phase research pipeline) and NitroStack Studio widgets are working correctly.

---

## 1. MCP Server Startup Tests

### 1.1 Server Bootstrap
- [ ] Run `npm run dev` - server starts without errors
- [ ] Check console shows: `McpApplicationFactory.create(AppModule)` successful
- [ ] Verify all 14 phase modules loaded in AppModule imports
- [ ] Verify core services loaded: MemoryStore, SemanticScholar, Embeddings, GitHub, Overleaf, Quartile
- [ ] Health check endpoint responds: `GET /health` returns 200 OK

### 1.2 Transport Verification
- [ ] STDIO transport works (for MCP client connections)
- [ ] HTTP SSE transport works on port 3000 (for NitroStudio)
- [ ] NitroStudio connects and shows all tools/resources

---

## 2. Phase 0: Prior Work Search & Memory Lookup

### 2.1 Tool: `search_prior_work`
**Test in NitroStudio:**
```
Input: {
  "topic": "federated learning privacy",
  "maxPapers": 5,
  "maxRepos": 3,
  "sessionId": "test-session-001"
}
```
**Expected Output:**
- papers array (≤5 items) with: paperId, title, authors, year, venue, citationCount, quartile, url
- repos array (≤3 items) with: name, url, description, stars, language, updatedAt
- priorSessions array with: sessionId, topic, status, verdict, resilienceScore, createdAt

### 2.2 Tool: `verify_repo_relevance`
```
Input: {
  "repoDescription": "Privacy-preserving federated learning framework",
  "topic": "federated learning privacy"
}
```
**Expected:** relevant=true, matchScore>30, reason explains keyword overlap

### 2.3 Resources
- [ ] `memory://prior-sessions/federated learning` returns JSON list
- [ ] `memory://session/{sessionId}` returns full session JSON

---

## 3. Phase 1: Paper Search & Relevance Scoring

### 3.1 Tool: `search_papers`
```
Input: {
  "query": "attention mechanism transformers",
  "yearFrom": 2017,
  "yearTo": 2024,
  "venues": ["NeurIPS", "ICML", "ICLR"],
  "minCitations": 100,
  "limit": 10
}
```
**Expected:** papers array filtered by all criteria

### 3.2 Tool: `score_paper_relevance`
```
Input: {
  "paperId": "paper-123",
  "researchQuestion": "How to improve attention efficiency for long sequences?"
}
```
**Expected:** score (0-100), reasoning string

### 3.3 Tool: `get_paper_metadata`
```
Input: { "paperId": "paper-123" }
```
**Expected:** full paper metadata including abstract, fieldsOfStudy, pdfUrl

---

## 4. Phase 2: Paper Extraction & Claim Mining

### 4.1 Tool: `extract_paper_claims`
```
Input: {
  "paperId": "paper-123",
  "abstract": "We propose FlashAttention...",
  "fullText": "Full paper text..."
}
```
**Expected:**
- claims array with: claimId, paperId, text, type (finding|method|limitation|assumption|hypothesis|result), confidence (0-100), evidence

### 4.2 Tool: `extract_paper_metadata`
```
Input: { "paperId": "paper-123", "fullText": "..." }
```
**Expected:** methodology, datasets, limitations, metrics arrays

### 4.3 Tool: `fetch_full_text`
```
Input: { "paperId": "paper-123" }
```
**Expected:** string (full text) or null

---

## 5. Phase 3: Synthesis & Clustering

### 5.1 Tool: `cluster_papers`
```
Input: {
  "paperIds": ["p1", "p2", "p3", "p4", "p5"],
  "numClusters": 3
}
```
**Expected:** clusters array with clusterId, label, paperIds, centroid, summary, keyThemes

### 5.2 Tool: `find_contradictory_claims`
```
Input: { "sessionId": "sess-001" }
```
**Expected:** contradictions array with contradictionId, claimA, claimB, explanation, severity (low|medium|high)

### 5.3 Tool: `synthesize_clusters`
```
Input: { "sessionId": "sess-001" }
```
**Expected:** summaries array with clusterId, summary, keyPoints

---

## 6. Phase 4: Gap Finder & Novelty Assessment

### 6.1 Tool: `assess_novelty`
```
Input: {
  "claim": "Adaptive differential privacy with per-client dynamic budget",
  "priorArtSummary": "Existing DP methods use fixed budget...",
  "clusterThemes": ["differential privacy", "federated learning"]
}
```
**Expected:** noveltyScore (0-100), reasoning, similarPapers

### 6.2 Tool: `propose_gap`
```
Input: {
  "topic": "federated learning privacy",
  "priorArtSummary": "...",
  "clusterThemes": [...],
  "excludedPaperIds": []
}
```
**Expected:** gap object with gapId, claim, evidence[], noveltyScore, feasibility, impact, relatedPapers[], status="proposed"

### 6.3 Tool: `rank_gaps`
```
Input: { "gaps": [gap1, gap2, gap3] }
```
**Expected:** rankedGaps sorted by composite score (novelty × feasibility × impact)

---

## 7. Phase 5: Adversarial Review & Retry Loop (CRITICAL)

### 7.1 Tool: `simulate_adversarial_review`
```
Input: {
  "gapClaim": "Adaptive DP with dynamic budget allocation",
  "gapEvidence": ["paper1", "paper2"],
  "iteration": 1
}
```
**Expected:** verdict (PASS|OBJECTION), objections[], objectionStrength (0-100), confidence (0-100)

### 7.2 Tool: `run_gap_review_cycle` (ORCHESTRATOR)
```
Input: {
  "topic": "federated learning privacy",
  "sessionId": "sess-001",
  "maxRetries": 3
}
```
**Expected:**
- Runs GapFinder → Reviewer loop up to 3 times
- Stops early on PASS
- Returns: { gap, reviews[], survived: boolean, objections[] }
- Check console logs show iteration progression

---

## 8. Phase 6: Verdict & Resilience Score

### 8.1 Tool: `compute_resilience_score`
```
Input: {
  "objectionStrength": 20,
  "closestPriorAttemptYear": 2021,
  "citationDensity": 40
}
```
**Expected:** score (0-100), breakdown object

### 8.2 Tool: `render_verdict`
```
Input: {
  "gapId": "gap-001",
  "objectionStrength": 15,
  "closestPriorYear": 2021,
  "citationDensity": 45,
  "reviews": [{iteration:1, verdict:"OBJECTION"}, {iteration:2, verdict:"PASS"}]
}
```
**Expected:** finalVerdict (PASS|CONDITIONAL|REJECT), resilienceScore, reasoning, iterations, objections[]

---

## 9. Phase 7: Cross-Domain Analogist (Stretch)

### 9.1 Tool: `find_cross_domain_analogs`
```
Input: {
  "technique": "attention mechanism",
  "sourceDomain": "NLP",
  "targetDomain": "computer vision",
  "excludeDomains": ["NLP"],
  "limit": 5
}
```
**Expected:** analogs[] with analogyId, sourceDomain, targetDomain, sourceTechnique, targetApplication, similarityScore, transferability

### 9.2 Tool: `verify_technique_match`
```
Input: {
  "sourceTechnique": "self-attention",
  "targetApplication": "image classification",
  "sourceDomain": "NLP",
  "targetDomain": "computer vision"
}
```
**Expected:** transferable (boolean), confidence, reasoning

---

## 10. Phase 8: Technical Parameters (Stretch)

### 10.1 Tool: `extract_technical_parameters`
```
Input: { "paperId": "p1", "fullText": "We use 4 A100 GPUs..." }
```
**Expected:** sensors[], samplingRateHz, datasetSize, hardwarePlatform, powerBudgetMw, latencyMs

### 10.2 Tool: `compare_technical_parameters`
```
Input: { "paperIds": ["p1", "p2", "p3"] }
```
**Expected:** comparison table, insights[]

---

## 11. Phase 9: Citation Management

### 11.1 Tool: `generate_citation`
```
Input: { "paperId": "p1", "style": "IEEE" }
```
**Expected:** formatted citation string, bibtex entry

### 11.2 Tool: `export_bibtex`
```
Input: { "paperIds": ["p1", "p2"] }
```
**Expected:** bibtex entries array

### 11.3 Tool: `manage_bibliography`
```
Input: { "sessionId": "sess-001", "action": "add", "paperIds": ["p1"] }
```
**Expected:** added/removed count

---

## 12. Phase 10: Writing Assistance

### 12.1 Tool: `tone_match`
```
Input: { "section": "introduction", "text": "We propose a novel method..." }
```
**Expected:** passed (boolean), issues[], suggestions[]

### 12.2 Tool: `check_ai_generic_phrasing`
```
Input: { "section": "methodology", "text": "In this paper, we explore..." }
```
**Expected:** passed, flagged phrases

### 12.3 Tool: `verify_meaning_preserved`
```
Input: { "section": "conclusion", "text": "Rewritten...", "originalText": "Original..." }
```
**Expected:** passed, differences[]

---

## 13. Phase 11: Research Verification

### 13.1 Tool: `verify_claim`
```
Input: { "claim": "Attention is O(n)", "evidence": ["paper1 says O(n^2)"] }
```
**Expected:** checkType="claim-support", passed, detail

### 13.2 Tool: `verify_citation`
```
Input: { "paperId": "p1", "citedClaim": "Self-attention is quadratic" }
```
**Expected:** checkType="citation-accuracy", passed

### 13.3 Tool: `compile_verification_summary`
```
Input: { "sessionId": "sess-001" }
```
**Expected:** totalChecks, passed, failed, summary

---

## 14. Phase 12: Memory Persistence & Session Resources

### 14.1 Tool: `save_session`
```
Input: { "sessionId": "sess-001", "topic": "test", "phase": 6, "papers": [...] }
```
**Expected:** { sessionId, saved: true }

### 14.2 Tool: `load_session`
```
Input: { "sessionId": "sess-001" }
```
**Expected:** Full session object with all phase data

### 14.3 Tool: `search_knowledge_graph`
```
Input: { "sessionId": "sess-001", "query": "attention" }
```
**Expected:** edges[] with subject, relation, object, weight, source

### 14.4 Resources
- [ ] `session://{sessionId}` returns full session
- [ ] `session://{sessionId}/knowledge-graph` returns graph edges

---

## 15. Phase 13: Overleaf Integration (Mode 2)

### 15.1 Tool: `create_overleaf_project`
```
Input: {
  "title": "Test Paper",
  "authors": ["Author 1"],
  "template": "ieee-template",
  "sessionId": "sess-001"
}
```
**Expected:** projectId, projectPath, title

### 15.2 Tool: `push_to_overleaf`
```
Input: { "projectId": "proj-123", "section": "abstract", "content": "..." }
```
**Expected:** { success: true }

### 15.3 Tool: `pull_limitations_from_reviewer`
```
Input: { "projectId": "proj-123", "sessionId": "sess-001" }
```
**Expected:** limitations text extracted from reviewer comments

### 15.4 Tool: `sync_session_to_overleaf`
```
Input: { "sessionId": "sess-001" }
```
**Expected:** sectionsSynced (should be 9), hasBibliography, hasLimitations

### 15.5 Tool: `export_overleaf_zip`
```
Input: { "projectId": "proj-123" }
```
**Expected:** Buffer/Blob download

---

## 16. Widget Tests (NitroStack Studio)

### 16.1 ChatHistorySidebar (/chat-history-sidebar)
- [ ] Loads in NitroStudio widget panel
- [ ] Shows conversation list with search filter
- [ ] Phase filter pills work (Intake, Analysis, Stretch, Export)
- [ ] Click conversation → shows message preview panel
- [ ] Messages show role icons (user/assistant), tool chips, timestamps
- [ ] "New Session" button creates empty conversation

### 16.2 PhaseSearchBar (/phase-search-bar)
- [ ] Search input with real-time suggestions
- [ ] Keyboard nav: ArrowUp/Down, Enter, Escape, Tab
- [ ] Phase selector shows 14 phase badges with colors
- [ ] Tool suggestions filter by current phase
- [ ] Recent searches dropdown
- [ ] Tools panel toggle (shows all tools for phase)
- [ ] Shortcuts help modal (? key)

### 16.3 OverleafFlowButton (/overleaf-flow-button)
- [ ] Idle state: "Create Overleaf Project" card
- [ ] Click → template selector (IEEE/ACM/NeurIPS/ICML)
- [ ] Project created → expanded state with 9 sections grid
- [ ] Section status indicators: pending/synced/modified/error
- [ ] Sync status bar shows progress
- [ ] Quick actions: Full Sync, Pull Limitations, Export ZIP
- [ ] Bibliography card with source selector
- [ ] Limitations section marked as auto-generated

### 16.4 ResearchPilotShell (/research-pilot-shell)
- [ ] Full composed layout loads
- [ ] Left sidebar = ChatHistorySidebar (collapsible)
- [ ] Header = Phase navigator with badge pills (0-13)
- [ ] Top bar = PhaseSearchBar
- [ ] Center = Conversation view with message bubbles
- [ ] Bottom = Composer input with send button
- [ ] Floating button = OverleafFlowButton
- [ ] Phase change in sidebar → updates search bar phase
- [ ] Message bubbles show avatars, tool chips, gap display

---

## 17. End-to-End Flow Test

### Complete Research Pipeline
1. **Start**: Call `search_prior_work` with topic "federated learning differential privacy"
2. **Search**: Call `search_papers` with query from results
3. **Extract**: Call `extract_paper_claims` on top 3 papers
4. **Cluster**: Call `cluster_papers` on extracted papers
5. **Find Gaps**: Call `propose_gap` → get research gap
6. **Review**: Call `run_gap_review_cycle` → should PASS after 1-3 iterations
7. **Verdict**: Call `render_verdict` → get PASS with resilience >70
8. **Overleaf**: Call `sync_session_to_overleaf` → creates paper draft
9. **Verify**: Check Overleaf UI has 9 sections + bibliography + limitations

---

## 18. Data Persistence Test

### 18.1 Session Persistence
1. Run full pipeline above
2. Stop server (`Ctrl+C`)
3. Restart server (`npm run dev`)
4. Call `load_session` with same sessionId
5. Verify ALL phase data restored (papers, claims, clusters, gaps, reviews, verdicts)

### 18.2 Prior Session Lookup
1. Create 2-3 sessions on same topic
2. Call `search_prior_work` with same topic
3. Verify priorSessions array includes previous sessions with verdicts

---

## 19. Error Handling Tests

- [ ] Invalid sessionId → appropriate error message
- [ ] Non-existent paperId → graceful handling
- [ ] Semantic Scholar API rate limit → retry/fallback
- [ ] Overleaf Git push failure → error with details
- [ ] Missing API keys → clear configuration error
- [ ] Malformed tool input → Zod validation error

---

## 20. Performance Benchmarks

| Operation | Target |
|-----------|--------|
| Server startup | < 5 seconds |
| `search_prior_work` (10 papers) | < 10 seconds |
| `run_gap_review_cycle` (3 iterations) | < 60 seconds |
| `sync_session_to_overleaf` (9 sections) | < 30 seconds |
| Memory load (100 sessions) | < 1 second |

---

## 21. Test Execution Commands

```bash
# Start server (dual transport for NitroStudio)
npm run dev

# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build
```

---

## 22. Pass Criteria

**Minimum Viable:**
- [ ] Server starts without errors
- [ ] All 14 phase tools execute in NitroStudio
- [ ] Phase 0-6 core pipeline works end-to-end
- [ ] Session save/load works across restarts
- [ ] All 4 widgets render in NitroStudio

**Full Success:**
- [ ] All 20 test categories pass
- [ ] End-to-end flow produces Overleaf paper draft
- [ ] Widgets compose correctly in ResearchPilotShell
- [ ] Performance benchmarks met
- [ ] No console errors/warnings in normal operation

---

## 23. Debugging Tips

**If tools don't appear in NitroStudio:**
1. Check `@Tool` decorators are imported correctly
2. Verify modules are in AppModule imports
3. Check NitroStudio connection (port 3000)

**If Semantic Scholar returns empty:**
1. Check `SEMANTIC_SCHOLAR_API_KEY` in .env
2. Verify rate limits (100 req/5min free tier)

**If Overleaf sync fails:**
1. Check `OVERLEAF_GIT_URL` and `OVERLEAF_GIT_TOKEN`
2. Verify template repo exists and is accessible

**If widgets show blank:**
1. Open browser dev tools → check console for React errors
2. Verify widget-manifest.json paths match page.tsx locations
3. Check design-tokens.ts exports are correct

---

## 24. Quick Smoke Test (2 minutes)

```bash
# 1. Start server
npm run dev &

# 2. Wait 3 seconds
sleep 3

# 3. Test health
curl http://localhost:3000/health

# 4. Test Phase 0 tool via MCP (if you have MCP client)
# Or use NitroStudio UI

# 5. Verify widgets
# Open NitroStudio → Widgets tab → click each widget
```

---

*Save this as `TEST_CASES.md` in your project root. Check off each item as you verify.*