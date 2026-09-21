# VeriChain AI Hackathon Presentation Script

**Duration**: 3 Minutes Demo Guide

---

## 0:00 - 0:30 | Hook & Problem Definition

"Good afternoon, judges. Today, enterprises are deploying AI agents to automate business critical decisions—ranging from vendor onboarding to budget approvals. But standard LLMs have a critical flaw: **they answer immediately without verification**. They hallucinate, ignore version mismatches, and miss compliance warnings.

That is why we built **VeriChain AI**—the Enterprise Evidence Intelligence Platform that ensures every AI decision is backed by a verified evidence chain."

---

## 0:30 - 1:30 | Live Walkthrough: Ingestion & Engine

"Let's look at the dashboard. We start in our **Upload Center**. We drag and drop two documents:
1. `vendor_agreement_v1.pdf`: An old contract outlining a budget of $50,000.
2. `vendor_agreement_v2.docx`: A revised contract adjusting the budget to $75,000.

Now, we navigate to the **Decision Engine** and submit our audit query: *'Should we approve Vendor ABC?'*

When we click 'Run Multi-Agent Verification', you can watch the agents collaborate in real-time. Our **Planner** maps out the targets; **Evidence** extracts facts; **Verification** scores credibility; **Conflict** scans for date or value mismatches; **Risk** calculates security metrics, and **Decision** renders the result."

---

## 1:30 - 2:30 | The Climax: Evidence Graph & Conflicts

"The run finishes. Let's look at the result. The recommendation badge states: **REVIEW REQUIRED**. Why?

Let's check the **Evidence Center**. Here is the centerpiece of VeriChain AI: our interactive **Evidence Graph**. Instead of just a text explanation, the graph visualizes the logical connections. You can see the blue document nodes connecting to green evidence nodes, and a bright red conflict node linking them.

Our Conflict Agent detected a **value discrepancy**—`agreement_v1` lists $50k while `agreement_v2` lists $75k. The Risk Dashboard shows a radar plot indicating elevated Operational and Financial risks, prompting manual compliance routing. We can immediately download the executive PDF report in our Reports Center."

---

## 2:30 - 3:00 | Conclusion & MCP Hook

"Finally, VeriChain AI is built as a modular MCP Server. Any external agent can connect to our server and invoke these tools to fetch policies, run audits, or verify facts.

VeriChain AI turns black-box AI recommendations into explainable, verified corporate decisions. Thank you, and we're open for questions!"
