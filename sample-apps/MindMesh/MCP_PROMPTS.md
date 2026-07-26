# ScholarPilot MCP Server — Natural Language Test Prompts

**47 tools across 14 phases + widget compositions + edge cases**

Use these prompts in NitroStudio, MCP client, or any LLM with MCP access to test the full ScholarPilot pipeline.

---

## Phase 0: Prior Work Search & Memory Lookup

### `search_prior_work`
```
Search for prior work on "federated learning with differential privacy" — find papers, GitHub repos, and any previous research sessions I've done on this topic. Store results in a new session.
```

```
I want to start a new research project on "byzantine-robust federated aggregation". Look up what's already been done: papers from top venues, open-source implementations, and check if I've worked on this before.
```

```
Find everything related to "split learning privacy" — limit to 15 papers and 5 repos. Create a session to track this.
```

```
What prior art exists for "gradient inversion attacks on federated learning"? Search papers, code, and my memory.
```

### `verify_repo_relevance`
```
Is this repo relevant to my topic? Repo: "Privacy-preserving FL framework with TensorFlow Privacy". Topic: "federated learning differential privacy".
```

```
Check if "byzantine-robust-aggregation" GitHub repo matches my research on "byzantine fault tolerance in federated learning".
```

```
Evaluate relevance: repo description says "Efficient attention for long sequences". My topic: "linear attention mechanisms".
```

### Resources
```
memory://prior-sessions/federated learning
→ Show me all my previous research sessions on "federated learning".
```

```
memory://session/sess_abc123
→ Load the full details of session "sess_abc123" — I want to see all papers, gaps, and verdicts.
```

```
memory://prior-sessions/attention mechanisms
→ What have I researched before about "attention mechanisms"? List prior sessions with their outcomes.
```

---

## Phase 1: Paper Search & Relevance Scoring

### `search_papers`
```
Search Semantic Scholar for papers on "flash attention" published between 2020-2024 at NeurIPS, ICML, or ICLR with at least 50 citations.
```

```
Find papers about "linear attention transformers" from the last 3 years. Filter for Q1 venues only.
```

```
Look up "differential privacy federated learning" papers from IEEE S&P, CCS, and USENIX Security since 2021.
```

```
Search for "mixture of experts transformers" with minimum 100 citations. I need the most influential works.
```

### `score_paper_relevance`
```
How relevant is paper "paper_123" to my research question: "Can we achieve sub-quadratic attention with theoretical guarantees?"
```

```
Rate the relevance of this paper to "byzantine-robust federated averaging" on a 0-100 scale.
```

```
Score paper "p_456" for the question: "What are the fundamental limits of privacy-utility tradeoffs in FL?"
```

### `get_paper_metadata`
```
Get full metadata for paper ID "paper_789" — I need abstract, authors, venue, citation count, and PDF link.
```

```
Fetch the complete record for "Attention Is All You Need" including fields of study and open access status.
```

---

## Phase 2: Paper Extraction & Claim Mining

### `extract_paper_claims`
```
Extract all claims from this paper (ID: paper_123). Here's the abstract: "We propose FlashAttention, an IO-aware exact attention algorithm..." and I have the full text.
```

```
Mine claims from the BERT paper. Identify findings, methods, limitations, and assumptions separately.
```

```
Extract structured claims from "paper_456" with confidence scores. Focus on methodological contributions.
```

### `extract_paper_metadata`
```
Parse the full text of paper "paper_123" and extract: methodology type, datasets used, evaluation metrics, and stated limitations.
```

### `fetch_full_text`
```
Download the full text of paper "paper_789" from Semantic Scholar or arXiv.
```

```
Try to get the PDF for "FlashAttention" paper — I need the complete text for extraction.
```

---

## Phase 3: Synthesis & Clustering

### `cluster_papers`
```
Cluster these 10 papers by semantic similarity: [paper_1, paper_2, paper_3, paper_4, paper_5, paper_6, paper_7, paper_8, paper_9, paper_10]. Use 3 clusters.
```

```
Group my collected papers on "federated learning privacy" into thematic clusters. Auto-determine cluster count.
```

```
Cluster papers on "efficient attention" — I expect groups like: sparse attention, linear attention, flash attention, low-rank.
```

### `find_contradictory_claims`
```
Find contradictions in the claims extracted in session "sess_001". Look for conflicting findings about privacy-utility tradeoffs.
```

```
Check for contradictory claims across all papers in my current session. Flag high-severity conflicts.
```

### `synthesize_clusters`
```
Write a narrative synthesis for each cluster in session "sess_001". Summarize key themes and representative papers.
```

```
Generate cluster summaries for my "attention efficiency" research — highlight the main technical approaches per cluster.
```

---

## Phase 4: Gap Finder & Novelty Assessment

### `assess_novelty`
```
Assess novelty of this claim: "Adaptive differential privacy that allocates budget per-client per-round based on data heterogeneity". Prior art: standard DP-SGD, fixed budget FL. Cluster themes: differential privacy, federated learning, adaptive methods.
```

```
How novel is "Byzantine-robust aggregation with formal privacy guarantees"? Compare against my clustered prior art.
```

### `propose_gap`
```
Propose a research gap for "federated learning privacy" given my prior art summary and cluster themes. Exclude papers p1, p2.
```

```
Generate a specific, evidence-backed research gap from my session "sess_001" on "efficient transformers".
```

```
Find a gap in "cross-silo federated learning" — focus on the intersection of communication efficiency and privacy.
```

### `rank_gaps`
```
Rank these 3 proposed gaps by composite score (novelty × feasibility × impact): [gap1, gap2, gap3].
```

```
Prioritize my candidate gaps for "long-context transformers" — which is most promising?
```

---

## Phase 5: Adversarial Review & Retry Loop (CRITICAL ORCHESTRATOR)

### `simulate_adversarial_review`
```
Run an adversarial review on this gap: "Adaptive DP with dynamic per-client budget". Search for limitations and counter-evidence. This is iteration 1.
```

```
Reviewer mode: Find objections to "Linear attention with theoretical expressivity guarantees". What could go wrong?
```

```
Adversarial check: "Unified Byzantine+DP framework" — search for "limitations of X", "X failed", "problems with X".
```

### `run_gap_review_cycle` ⭐ **KEY END-TO-END TEST**
```
Run the full gap review cycle for topic "federated learning differential privacy" in session "sess_001". Max 3 retries. GapFinder proposes, Reviewer objects, repeat until PASS or max retries.
```

```
Execute the adversarial review loop on my proposed gap about "efficient attention for 100k+ tokens". Keep refining until it passes review or hits 3 iterations.
```

```
Run gap review cycle: topic="byzantine-robust FL", session="sess_002", maxRetries=3. Show me each iteration's objections and how the gap evolves.
```

---

## Phase 6: Verdict & Resilience Score

### `compute_resilience_score`
```
Calculate resilience score for my gap. Objection strength: 15/100. Closest prior attempt: 2022. Citation density: 40%.
```

```
What's the resilience score? ObjectionStrength=25, ClosestPriorYear=2021, CitationDensity=35.
```

### `render_verdict`
```
Render final verdict for gap "gap_001". Reviews: iteration 1 OBJECTION (budget leakage), iteration 2 PASS, iteration 3 PASS. Objection strength 15. Closest prior 2021. Citation density 40.
```

```
Give me PASS/CONDITIONAL/REJECT for this gap with full reasoning. Iterations: 2. Final objections: []. Resilience score: 82.
```

---

## Phase 7: Cross-Domain Analogist (Stretch)

### `find_cross_domain_analogs`
```
Find cross-domain analogs: technique="attention mechanism", source="NLP", target="computer vision". Exclude NLP. Top 5.
```

```
What techniques from "signal processing" could apply to "federated learning aggregation"? Find analogs.
```

```
Search for "gradient compression" analogs in "distributed systems" and "edge computing" domains.
```

### `verify_technique_match`
```
Verify if "self-attention" from NLP transfers to "image patch modeling" in vision. How transferable?
```

```
Check technique match: "differential privacy composition" from "privacy literature" → "federated learning". Feasible?
```

---

## Phase 8: Technical Parameters (Stretch)

### `extract_technical_parameters`
```
Extract technical parameters from this paper: sensors=[], samplingRateHz=?, datasetSize=?, hardwarePlatform="4×A100", powerBudgetMw=?, latencyMs=?.
```

```
Parse hardware specs, dataset sizes, and compute requirements from the full text of paper "paper_123".
```

### `compare_technical_parameters`
```
Compare technical parameters across papers [p1, p2, p3] on "efficient attention". Show me a comparison table.
```

```
What are the hardware requirements differences between FlashAttention, Linformer, and Performer?
```

### `fetch_and_extract_tech_params`
```
Fetch and extract technical parameters for these paper IDs: ["p1", "p2", "p3"].
```

---

## Phase 9: Citation Management

### `generate_citation`
```
Generate IEEE citation for paper "paper_123". Also give me APA and MLA formats.
```

```
Cite "Attention Is All You Need" in IEEE format with BibTeX.
```

### `export_bibtex`
```
Export BibTeX for papers [paper_1, paper_2, paper_3] for my bibliography.
```

```
Give me a .bib file with all papers from session "sess_001".
```

### `manage_bibliography`
```
Add paper "paper_456" to my session "sess_001" bibliography.
```

```
Remove "paper_789" from bibliography. List current bibliography.
```

---

## Phase 10: Writing Assistance

### `tone_match`
```
Check academic tone of this introduction draft: "In this paper, we propose a really cool new method that beats everything..." Flag issues.
```

```
Tone check: "Our approach significantly outperforms baselines." Is this appropriately hedged?
```

### `check_ai_generic_phrasing`
```
Scan this methodology section for generic AI phrasing: "We leverage the power of deep learning to..." "Our model learns rich representations..."
```

```
Detect AI-generic phrases in my abstract: "In this work, we explore..." "We demonstrate the effectiveness..."
```

### `verify_meaning_preserved`
```
Compare original vs rewritten: Original="The quadratic complexity limits sequence length." Rewritten="Due to O(n²) complexity, long sequences are infeasible." Meaning preserved?
```

```
Check if my paraphrase preserves the technical claim: Original vs my rewrite.
```

---

## Phase 11: Research Verification

### `verify_claim`
```
Verify this claim against my extracted evidence: "FlashAttention achieves 2-4× speedup over standard attention." Evidence: [claim_1, claim_2].
```

```
Check: "Linear attention matches softmax attention quality." My evidence says otherwise. Verify.
```

### `verify_citation`
```
Verify citation accuracy: Paper "p1" claims "Transformer uses dot-product attention." Is this accurate?
```

```
Does paper "p2" actually support the claim "BERT outperforms ELMo on all GLUE tasks"?
```

### `compile_verification_summary`
```
Compile full verification report for session "sess_001". Aggregate all claim, citation, and methodology checks.
```

```
Give me a verification summary: total checks, passed, failed, critical issues.
```

---

## Phase 12: Memory Persistence & Session Resources

### `save_session`
```
Save my current session "sess_001" with topic "federated learning privacy", phase 6, all papers/claims/gaps/verdicts.
```

```
Persist session "sess_abc" — I've completed the review cycle and have a PASS verdict.
```

### `load_session`
```
Load session "sess_001" — I want to continue where I left off.
```

```
Restore my "efficient attention" research session with all 14 phases of data.
```

### `search_knowledge_graph`
```
Query my knowledge graph in session "sess_001" for "attention" — show me all entities and relations.
```

```
Find connections: what papers relate to "differential privacy" in my session's knowledge graph?
```

```
Search KG: show me the path from "federated learning" to "privacy budget" in my accumulated knowledge.
```

### Resources
```
session://sess_001
→ Get session://sess_001 — full session dump.
```

```
session://sess_001/knowledge-graph
→ Get session://sess_001/knowledge-graph — graph edges only.
```

---

## Phase 13: Overleaf Integration (Mode 2)

### `create_overleaf_project`
```
Create an Overleaf project for my paper "Adaptive Differential Privacy in Federated Learning". Use IEEE template. Link to session "sess_001".
```

```
New Overleaf project: title="Linear Attention Transformers", authors=["Me", "Coauthor"], template=neurips, session=sess_002.
```

### `push_to_overleaf`
```
Push my abstract to Overleaf project "proj_123": "We propose AdaptiveDP..."
```

```
Sync methodology section to Overleaf. Content: "Our method allocates privacy budget..."
```

```
Push all 9 sections from session "sess_001" to Overleaf project "proj_456".
```

### `pull_limitations_from_reviewer`
```
Pull reviewer limitations from Overleaf project "proj_123" — extract the "Limitations" section reviewer comments.
```

```
Fetch reviewer objections from my Overleaf paper and auto-generate limitations text.
```

### `sync_session_to_overleaf`
```
Full sync: push entire session "sess_001" to Overleaf — all 9 sections, bibliography, and auto-generated limitations from reviewer objections.
```

```
Sync my completed research (PASS verdict) to Overleaf. Create project if needed.
```

### `export_overleaf_zip`
```
Export Overleaf project "proj_123" as ZIP for submission.
```

```
Download the complete paper source from Overleaf as a zip archive.
```

---

## Widget Compositions (ResearchPilotShell)

### ChatHistorySidebar + PhaseSearchBar
```
I'm in ResearchPilotShell. Show me my conversation history for "federated learning" — filter to phase 4 (Gap Finder). Then set the search bar to phase 4 and suggest gap-finding tools.
```

```
Open my prior session on "efficient attention". Load it in the shell. Set phase navigator to phase 3 (Synthesis). Show me cluster tools in search bar.
```

### OverleafFlowButton in Shell
```
My session "sess_001" has a PASS verdict. Click the Overleaf floating button → create project with IEEE template → full sync all sections.
```

```
I'm viewing conversation "conv_002" in the shell. The verdict is CONDITIONAL. Use Overleaf button to pull limitations from reviewer comments.
```

### Full Shell Workflow
```
Start new research in ResearchPilotShell: topic="byzantine-robust FL". Phase 0: search prior work. Phase 1: search papers. Phase 2: extract claims. Continue through to verdict.
```

```
Load session "sess_001" in the shell. Continue from phase 5 (review cycle). Run adversarial review. Then verdict. Then Overleaf sync.
```

---

## Edge Cases & Error Paths

### Invalid Sessions
```
Load session "nonexistent_session" — should give clear error.
```

```
Search prior work with sessionId that doesn't exist — should create new session gracefully.
```

### Missing Data
```
Score relevance for paper that doesn't exist in my session.
```

```
Extract claims from paper without full text — should work with abstract only.
```

```
Cluster papers with only 2 paper IDs — should handle gracefully.
```

### Empty Results
```
Search papers for "xyz_nonexistent_topic_123" — should return empty array, not error.
```

```
Find contradictions in session with no claims extracted yet.
```

### Rate Limits / API Errors
```
Search Semantic Scholar rapidly 20 times — should handle rate limiting.
```

```
Overleaf Git push fails (bad token) — should return actionable error.
```

### Malformed Inputs
```
Call propose_gap with empty topic string.
```

```
Call run_gap_review_cycle with maxRetries=0.
```

```
Generate citation with invalid style "HARVARD" (not IEEE/APA/MLA).
```

### Large Data
```
Cluster 50 papers at once — should handle or chunk.
```

```
Sync session with 50 papers and 200 claims to Overleaf — progress tracking?
```

### Unicode / Special Chars
```
Search topic: "federated learning 🔒 privacy αβγ 测试".
```

```
Paper title with emojis and special chars in citation generation.
```

---

## Quick Smoke Test Sequence (5 minutes)

Copy-paste each into NitroStudio or MCP client:

1. **Bootstrap**: `Search for prior work on "test topic" — create session "test_smoke"`
2. **Search**: `Search papers for "attention mechanism" year 2020-2024 limit 5`
3. **Extract**: `Extract claims from paper "paper_1" with abstract "We propose a novel method..."`
4. **Cluster**: `Cluster papers ["paper_1", "paper_2", "paper_3"] into 2 clusters`
5. **Gap**: `Propose a gap for "test topic" based on my prior art`
6. **Review**: `Run full gap review cycle for topic "test topic" session "test_smoke" maxRetries=2`
7. **Verdict**: `Render verdict for the gap from review cycle`
8. **Overleaf**: `Sync session "test_smoke" to Overleaf with IEEE template`
9. **Persist**: `Save session "test_smoke"`
10. **Reload**: `Load session "test_smoke" — verify all data restored`

---

## Expected Tool Call Patterns

| Prompt Intent | Expected Tool(s) |
|---------------|------------------|
| "Search for prior work on X" | `search_prior_work` |
| "Find papers about Y" | `search_papers` |
| "How relevant is paper Z?" | `score_paper_relevance` |
| "Extract claims from paper" | `extract_paper_claims` |
| "Cluster my papers" | `cluster_papers` |
| "Find contradictions" | `find_contradictory_claims` |
| "Propose a research gap" | `propose_gap` |
| "Run the review cycle" | `run_gap_review_cycle` |
| "Give me final verdict" | `render_verdict` |
| "Create Overleaf project" | `create_overleaf_project` |
| "Sync to Overleaf" | `sync_session_to_overleaf` |
| "Save my session" | `save_session` |
| "Load my session" | `load_session` |

---

*Save as `MCP_PROMPTS.md` in project root. Each prompt should trigger exactly one tool (or the orchestrator `run_gap_review_cycle`).*