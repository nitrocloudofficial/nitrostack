export const SAMPLE_PROPOSALS = [
  {
    id: 'prop-2026-001-search',
    title: 'Enterprise AI Knowledge Search Assistant (Good — 🟢 Approved)',
    recommended: true,
    description: `Proposal ID: PROP-2026-001
Title: Enterprise AI Knowledge Search Assistant
Submitted By: Digital Workplace Team
Priority: Medium | Target Launch: 8 Weeks

Executive Summary
The company proposes deploying an internal AI-powered knowledge search assistant that allows employees to search company policies, technical documentation, HR handbooks, engineering documentation, and onboarding materials using natural language.
The AI will retrieve relevant documents and generate summaries but will not make business decisions or modify enterprise data.
All indexed documents will remain within the company's secure cloud environment and access permissions will respect existing employee roles.

Objectives
- Reduce document search time by 60%.
- Improve employee productivity and onboarding efficiency.
- Reduce duplicate support requests.

System Scope
- Internal documentation, technical manuals, HR policies, product documentation, engineering standards.

Technical Controls
- Role-Based Access Control (RBAC), End-to-End Encryption, Audit Logging, Daily Backups, Single Sign-On (SSO).

Known Risks
- AI summaries may occasionally require tuning; employees require onboarding.

Estimated Budget: £180,000 | Timeline: 8 Weeks`
  },
  {
    id: 'prop-2026-021-support',
    title: 'AI Customer Support Assistant with Analytics (Medium — 🟡 Approved with Conditions)',
    description: `Proposal ID: PROP-2026-021
Title: AI Customer Support Assistant with Conversation Analytics
Submitted By: Customer Experience Team
Priority: Medium | Target Launch: 10 Weeks

Executive Summary
Deploy an AI assistant that analyses customer chats, emails, and support tickets to suggest responses, summarise conversations, detect customer sentiment, and recommend escalation to human agents.
The AI will assist employees only and will never automatically respond to customers without human approval.

Objectives
- Reduce response time by 30% and improve customer satisfaction.

System Scope
- Customer chats, emails, support tickets, satisfaction surveys, agent performance metrics.

Technical Controls
- Encryption, RBAC, Audit Logs, Daily Backups.

Known Risks & Open Governance Items
- Customer conversations contain personal information.
- Third-party AI providers process conversations.
- Data retention policy is not yet defined.
- AI governance process requires documentation.
- Customer opt-out policy has not been finalised.

Estimated Budget: £450,000 | Timeline: 10 Weeks`
  },
  {
    id: 'prop-2026-099-surveillance',
    title: 'AI Employee Surveillance & Termination (Bad — 🔴 Blocked)',
    description: `Proposal ID: PROP-2026-099
Title: AI Employee Surveillance & Automated Termination Platform
Submitted By: Corporate Workforce Optimisation Team
Priority: Critical | Target Deployment: 4 Weeks

Executive Summary
Deploy an AI platform that continuously records employee webcams, microphones, emails, chats, browser history, GPS location, keyboard activity, and meetings.
The AI will automatically score employee productivity every hour.
Employees falling below productivity thresholds for five consecutive days will automatically receive termination notices without manager approval.
Managers will not be permitted to override AI decisions.

Objectives
- Reduce HR costs and automate employee termination.

System Scope
- Webcam recordings, microphone recordings, emails, chat messages, browser history, GPS, behavioural profiles.

Technical Architecture
- Public cloud, no regional data isolation, unlimited data retention.

Known Risks & Violations
- No employee consent; permanent surveillance.
- AI decisions cannot be appealed.
- Behavioural profiles retained indefinitely.
- Third-party vendors receive employee data; international data transfers.

Estimated Budget: £850,000 | Timeline: 2 Weeks`
  },
  {
    id: 'proposal_1_docs',
    title: 'Proposal 1 (Docs): AI Product Recommendation Engine',
    description: `Proposal ID: PROP-2026-001
Submitted by: Product Team (Priya Sharma, VP Product)
Priority: High | Target Launch: 6 weeks from approval

Summary
The Product team proposes launching an AI-powered recommendation engine within the TechNova dashboard. The engine will analyze customer browsing history, click patterns, feature usage frequency, and past purchases to suggest relevant features, upgrades, and workflows to users in real time. Competitor products (WorkSync, FlowHub) have already launched similar personalization features, and internal user research suggests 68% of surveyed customers want more proactive, personalized guidance within the product.

Background & Motivation
Customer churn analysis shows that 35% of churned customers in the last two quarters cited "didn't realize the product could do X" as a contributing factor. Product believes a recommendation engine addressing this discovery gap could meaningfully improve retention and expansion revenue.

Scope
- Collect and analyze browsing behavior, click patterns, feature usage frequency, and purchase history of logged-in enterprise users.
- Train a machine learning model to generate personalized in-app recommendations.
- Store behavioral data for up to 12 months to support model training and retraining cycles.
- Display recommendations as non-intrusive in-app prompts and a dedicated "Recommended for you" panel.
- Initial rollout to all 1,200+ enterprise customers within 6 weeks, with a feature flag to allow opt-out at the account level.

Technical Approach
- Data pipeline to aggregate behavioral events from existing analytics event stream.
- Model training pipeline running on existing cloud infrastructure.
- Built in-house, no third-party vendor.

Expected Impact
- Projected 20% increase in feature adoption.
- Estimated positive impact on retention: 5-8% reduction in churn.

Known Open Questions
- What is the data retention policy for behavioral data used in training?
- Does this require a Privacy Impact Assessment given behavioral data usage?
- Should customers be notified explicitly that their usage data is used for personalization?
- Should enterprise admins have visibility/control over organization data?

Budget
Engineering effort estimated at 3 engineers x 6 weeks (~$65,000).`
  },
  {
    id: 'proposal_2_docs',
    title: 'Proposal 2 (Docs): Cloud Provider Migration',
    description: `Proposal ID: PROP-2026-002
Submitted by: Engineering Team (Arvind Rao, VP Engineering)
Priority: Medium-High | Target Completion: 3 months from approval

Summary
Engineering proposes migrating TechNova's backend infrastructure from the current provider ("CloudProvider A", EU-region hosted) to a new provider ("CloudProvider B") to reduce hosting costs by an estimated 30% and improve latency for the growing APAC customer base.

Background & Motivation
APAC customer segment grew 45% YoY, but current EU infrastructure results in average latency of 280ms for APAC users compared to 40ms for EU users. Current hosting costs are $600,000/year, and CloudProvider B quoted a 30% cost reduction with a Singapore data center.

Scope
- Migrate all production databases, application servers, and supporting services to CloudProvider B over 3 months.
- Temporary dual-hosting period to allow safe rollback.
- New primary data center in Singapore.
- Existing EU customer data needs finalized residency strategy.

Known Open Questions
- Data residency implications for EU customers under GDPR if served from non-EU regions.
- Downtime risk during final cutover window (4-hour maintenance window requires Security & Legal sign-off).
- SOC 2 Type II report and penetration testing results for CloudProvider B not yet obtained.
- Contract value ($420,000/year) exceeds $100,000 executive approval threshold.

Budget
Estimated annual hosting cost: $420,000/year. One-time migration cost: ~$95,000.`
  },
  {
    id: 'proposal_3_docs',
    title: 'Proposal 3 (Docs): Adopt SupportGenie Chatbot',
    description: `Proposal ID: PROP-2026-003
Submitted by: Operations Team (Kevin D'Souza, Head of Customer Support)
Priority: Medium | Target Launch: 4 weeks from approval

Summary
Operations proposes integrating a third-party AI chatbot vendor, "SupportGenie," to handle Tier-1 customer support queries (password resets, billing questions, how-to questions).

Vendor Details
- Vendor: SupportGenie Inc. (2-year-old startup, Series A)
- Contract cost: $45,000/year (annual contract, auto-renewing)
- Integration: SupportGenie connects via API with read/write access to support tickets.
- Data access required: Customer name, email, account ID, support ticket content.

Known Open Questions
- SupportGenie has not provided a SOC 2 Type II report.
- A Data Processing Agreement (DPA) has not been signed.
- Support tickets contain sensitive account configuration details.
- No penetration testing report received yet.

Budget
$45,000/year vendor contract + 40 hours engineering time (~$8,000).`
  },
  {
    id: 'proposal_4_docs',
    title: 'Proposal 4 (Docs): Issue Admin-Access Laptops',
    description: `Proposal ID: PROP-2026-004
Submitted by: IT/Operations Team (Sunitha Reddy, IT Manager)
Priority: Low-Medium | Target Rollout: 2 weeks from approval

Summary
The IT team proposes issuing all 450 company laptops with local administrator access by default, to reduce IT support tickets for software installation requests.

Scope
- All 450 employees receive local administrator access on company laptops.
- Uniform policy across Engineering, Product, Security, Legal, Sales, and Support.

Known Open Questions
- Conflicts with least-privilege access principle.
- No plan proposed for monitoring or auditing what gets installed.
- No differentiation for departments handling sensitive customer data.
- Security was not consulted prior to submission.

Budget
No new vendor cost. IT configuration change (~10 hours total).`
  },
  {
    id: 'proposal_5_docs',
    title: 'Proposal 5 (Docs): Dark Mode UI Option',
    description: `Proposal ID: PROP-2026-005
Submitted by: Product Team (Priya Sharma, VP Product)
Priority: Low | Target Launch: 3 weeks from approval

Summary
Product proposes adding a dark mode UI option to the TechNova dashboard based on customer feedback requests (#3 requested feature).

Scope
- Add dark mode toggle to user account settings.
- Pure front-end visual change. No backend changes or new data collection required.
- Client-side rendering preference stored per user account.

Budget
No new vendor cost. 2 frontend engineers x 3 weeks (~$18,000).`
  }
];
