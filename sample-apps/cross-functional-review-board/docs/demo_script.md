# Demo Script — Cross-Functional Decision Review Board

## Order of Demo (suggested flow for live presentation)

### 1. Intro (30 sec)
"Every company makes big decisions — launching a feature, picking a vendor,
migrating infrastructure — but getting Product, Engineering, Security, and
Legal to review it together is slow. Our platform automates that first-pass
review using specialized AI agents."

### 2. Show the fake company setup (30 sec)
Briefly show `demo/fake_company/company_profile.md` and one policy file
(e.g., `data_privacy_policy.md`) to establish that agents review against
real company context, not just general knowledge.

### 3. Submit a proposal (LIVE) — recommended: Proposal 1 or 3
Use `demo/sample_proposals/proposal_1_ai_recommendation.md` (personalization
+ data privacy angle) OR `proposal_3_chatbot_vendor.md` (vendor + security
angle) — both surface clear cross-agent disagreement, which makes for a
good demo.

### 4. Show each agent's independent analysis
Point out that Product is optimistic, Security/Legal raise concerns —
this shows the system isn't just giving one generic answer.

### 5. Show the debate round
Highlight one moment where an agent responds to another agent's concern
(e.g., Engineering proposing encryption as a mitigation for a Security
concern).

### 6. Show the Moderator's final report
This is the payoff — show the structured output: unresolved risks,
required actions, final recommendation.

### 7. Close (30 sec)
"This turns a multi-day cross-functional review into a first-pass report
in minutes, so humans can make faster, better-informed decisions."

## Backup plan
If live demo fails (API issues, etc.), have a pre-recorded run or saved
output screenshots ready in `test/test_results/`.
