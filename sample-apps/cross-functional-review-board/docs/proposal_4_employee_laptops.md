# Proposal 4: Issue Admin-Access Laptops to All Employees

**Proposal ID:** PROP-2026-004
**Submitted by:** IT/Operations Team (Sunitha Reddy, IT Manager)
**Date:** 2026-07-10
**Priority:** Low-Medium
**Target Rollout:** 2 weeks from approval

## Summary
The IT team proposes issuing all 450 company laptops with local
administrator access by default, in order to reduce the volume of IT
support tickets related to software installation requests and driver
updates, which currently make up a significant portion of the internal IT
helpdesk workload.

## Background & Motivation
Internal IT ticket analysis for Q2 2026 shows that 340 of the 1,100 total
IT tickets (31%) were related to employees needing software installed or
updated but lacking the local permissions to do so themselves, requiring an
IT staff member to remote in or physically assist. IT believes granting
broader local admin access would significantly reduce this ticket volume
and improve employee productivity, particularly for Engineering and Product
staff who frequently need to install development tools.

## Scope
- All 450 employees would receive local administrator access on their
  company-issued laptops.
- No department-specific restrictions are proposed — the policy would apply
  uniformly across Engineering, Product, Security, Legal, Sales, and
  Support.
- Rollout would happen via a remote configuration push over 2 weeks,
  starting with Engineering and Product (highest ticket volume) and
  expanding company-wide.

## Expected Impact
- Estimated 25% reduction in overall IT ticket volume.
- Faster onboarding for new employees, who would no longer need to wait for
  IT to install standard development/productivity tools.
- Reduced burden on the 6-person IT support team, potentially freeing up
  capacity for higher-value infrastructure work.

## Known Open Questions (raised internally by IT before submission)
- IT is aware this may conflict with the existing least-privilege access
  principle but views the productivity gain as justifying an exception.
- No specific plan has been proposed for monitoring or auditing what gets
  installed on laptops with broad admin access.
- No differentiation has been proposed between departments that handle
  sensitive customer data (e.g., Support, which accesses customer tickets)
  and departments that don't.
- IT has not yet consulted Security on this proposal prior to submission.

## Budget
No new cost — this is a configuration change to existing devices, using
existing IT staff time (~10 hours total for rollout).
