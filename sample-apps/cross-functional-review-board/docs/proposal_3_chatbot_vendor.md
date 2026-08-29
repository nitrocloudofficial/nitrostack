# Proposal 3: Adopt Third-Party AI Chatbot for Customer Support

**Proposal ID:** PROP-2026-003
**Submitted by:** Operations Team (Kevin D'Souza, Head of Customer Support)
**Date:** 2026-07-15
**Priority:** Medium
**Target Launch:** 4 weeks from approval

## Summary
Operations proposes integrating a third-party AI chatbot vendor,
"SupportGenie," to handle Tier-1 customer support queries (password resets,
billing questions, basic how-to questions), with the goal of reducing
average response time and freeing up human support agents for complex
issues.

## Background & Motivation
TechNova's support team currently handles ~4,000 tickets/month, with 55%
classified as Tier-1 (routine, low-complexity). Average first-response time
is currently 6 hours, and customer satisfaction (CSAT) surveys show response
time as the top complaint. SupportGenie's published case studies claim a
40% reduction in response time for comparable SaaS companies.

## Vendor Details
- **Vendor:** SupportGenie Inc.
- **Company stage:** 2-year-old startup, Series A funded
- **Contract cost:** $45,000/year (annual contract, auto-renewing)
- **Integration method:** SupportGenie would connect to TechNova's support
  ticketing system via API, with read/write access to support tickets.
- **Data access required:** Customer name, email, account ID, support ticket
  content (which may include account details, and in some cases screenshots
  or account configuration details shared by customers while troubleshooting).

## Scope
- Integrate SupportGenie with the existing support ticketing platform.
- Route all incoming Tier-1 tickets to SupportGenie for initial handling,
  with automatic escalation to human agents for anything SupportGenie
  cannot resolve or anything flagged as sensitive.
- 4-week integration timeline, including a 1-week pilot with 10% of ticket
  volume before full rollout.

## Expected Impact
- Projected 40% reduction in average response time for Tier-1 tickets
  (from 6 hours to ~3.5 hours).
- Estimated reduction in human agent workload of approximately 30%,
  allowing reallocation of 4-5 support agents to more complex Tier-2/3 work.
- Improved CSAT scores based on vendor's published benchmarks (not yet
  validated with TechNova's own data).

## Known Open Questions (raised internally by Operations before submission)
- SupportGenie has not yet provided a SOC 2 Type II report — their sales
  team indicated one is "in progress" but did not provide a timeline.
- A Data Processing Agreement (DPA) has not yet been signed with
  SupportGenie.
- Some support tickets may contain sensitive account configuration details
  or, in rare cases for healthcare/financial clients, information that
  touches on regulated data categories.
- No penetration testing report has been requested or received yet.
- Contract value ($45,000/year) is below the $50,000 threshold requiring VP
  sign-off, but since the vendor will have access to customer data, Security
  review is required regardless of contract value per the Budget Policy.

## Budget
$45,000/year vendor contract + estimated 40 hours of engineering time for
integration (~$8,000).
