# Proposal 2: Migrate Backend Infrastructure to a New Cloud Provider

**Proposal ID:** PROP-2026-002
**Submitted by:** Engineering Team (Arvind Rao, VP Engineering)
**Date:** 2026-07-18
**Priority:** Medium-High
**Target Completion:** 3 months from approval

## Summary
Engineering proposes migrating TechNova's backend infrastructure from the
current provider ("CloudProvider A", EU-region hosted) to a new provider
("CloudProvider B") to reduce hosting costs by an estimated 30% and improve
latency for the growing APAC customer base. This migration was initially
flagged during Q2 infrastructure cost review, where hosting costs were
identified as the second-largest operating expense after payroll.

## Background & Motivation
TechNova's APAC customer segment has grown 45% year-over-year, but current
infrastructure (EU-region hosted) results in average latency of 280ms for
APAC users, compared to 40ms for EU users. Additionally, current hosting
costs have grown to $600,000/year, and CloudProvider B has quoted a 30% cost
reduction along with better regional coverage including a Singapore data
center.

## Scope
- Migrate all production databases, application servers, and supporting
  services from CloudProvider A to CloudProvider B over a 3-month period.
- Requires a temporary dual-hosting period (both providers active
  simultaneously) during the transition to allow safe rollback.
- New provider's primary data center for APAC traffic is located in
  Singapore, whereas current hosting is entirely EU-based (Frankfurt).
- Existing EU customer data would either remain in an EU region on the new
  provider (CloudProvider B does offer EU regions) or potentially be served
  from a global configuration — this needs to be finalized as part of the
  migration plan.

## Technical Approach
- Phase 1 (Weeks 1-4): Set up parallel infrastructure on CloudProvider B,
  begin data replication.
- Phase 2 (Weeks 5-8): Migrate non-critical services first, validate
  performance and stability.
- Phase 3 (Weeks 9-12): Migrate production databases and critical services
  during a planned low-traffic maintenance window, with full rollback plan
  to CloudProvider A if issues arise.

## Expected Impact
- Cost savings of approximately $180,000/year once fully migrated.
- Improved latency for APAC customers: projected drop from 280ms to ~60ms.
- Improved disaster recovery posture with multi-region redundancy.

## Known Open Questions (raised internally by Engineering before submission)
- Data residency implications for EU customers under GDPR if data is served
  from or replicated through non-EU regions.
- Downtime risk during the final cutover window — current estimate is a
  4-hour maintenance window, but this needs Security and Legal sign-off
  given the regulated customers affected.
- Has CloudProvider B provided a SOC 2 Type II report and penetration
  testing results? (Not yet obtained as of this proposal submission.)
- Contract value with CloudProvider B is estimated at $420,000/year,
  which exceeds the $100,000 threshold requiring executive approval per
  the Budget & Vendor Approval Policy.

## Budget
Estimated new annual hosting cost: $420,000/year (down from $600,000/year
with current provider). One-time migration engineering cost: ~$95,000
(6 engineers x 3 months, partial allocation).
