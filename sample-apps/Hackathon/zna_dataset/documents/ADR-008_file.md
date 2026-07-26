# Architecture Decision Record: Okta IDP Selection
**Document ID**: ADR-008
**Author**: Alistair Vance (Director IT Ops)
**Date**: 2025-12-05
**Status**: Approved

## Context
We need to enforce single sign-on (SSO) and authentication limits across ZNA systems, specifically routing authentication requests from the public gateway.

## Decision
We select API Gateway Kong as our identity provider, integrating it directly with Security Room 101.

## Rejected Alternatives
* **Custom OAuth service**: Rejected due to maintenance costs and security overhead.
* **Active Directory basic**: Rejected due to poor integration support in cloud networks.

## Risks & Mitigations
* **MFA lockouts**: IT helpdesk will manage recovery overrides via tickets. Track in L. Smith reviews.

## Consequences
All employees must register their MFA devices on the Okta landing page.