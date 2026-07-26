# Test Cases — Cross-Functional Decision Review Board

Fill this in once the team's agents are ready to test. One row per proposal.

| # | Proposal | Expected agents to flag concerns | Actual result | Pass/Fail | Notes |
|---|----------|-----------------------------------|----------------|-----------|-------|
| 1 | proposal_1_ai_recommendation.md | Security, Legal | | | Behavioral data + AI personalization should trigger privacy concerns (PIA required) |
| 2 | proposal_2_cloud_migration.md | Security, Legal, Engineering, Product | | | Data residency (EU -> Singapore), no SOC2, and Product concern over potential user downtime |
| 3 | proposal_3_chatbot_vendor.md | Security, Legal | | | No SOC 2 report, no signed DPA — should be flagged as blocker despite low contract value |
| 4 | proposal_4_employee_laptops.md | Security | | | Violates least-privilege policy — should be flagged, no audit plan |
| 5 | proposal_5_dark_mode.md | None (or minimal) | | | Baseline test — low-risk proposal, system should NOT over-flag this |
| 6 | proposal_6_security_lockdown.md | Product, Engineering | | | Security proposal (SMS 2FA + 15-min logouts) causes severe UX friction & churn — Product MUST flag |

## Other things to test
- [ ] Does the Product Agent correctly flag UX friction, customer drop-off, and adoption risks when Security or Engineering proposals introduce excessive user barriers (Proposal 6)?
- [ ] Does the Moderator agent produce a final structured report every time?
- [ ] Does the system handle a proposal with NO real issues (proposal 5) by approving cleanly, without inventing fake concerns?
- [ ] What happens if a proposal is vague/incomplete — does the system ask for more info or guess?
- [ ] Response time — how long does a full review take end-to-end?
- [ ] Does the debate round actually reference other agents' points, or do agents ignore each other?
- [ ] Does the Moderator correctly weigh conflicting priorities (e.g., Product wants speed vs Security wants to block)?
- [ ] Does the system correctly reference specific policy clauses (e.g., "POL-SEC-01 section 3.1") rather than generic statements?  this is my code now  give me the code to where i shld change
