# CloudGuard AI — Autonomous FinOps & Security Guardrails

## Problem Statement
Cloud environments suffer from two major operational risks:
1. **Zombie Infrastructure:** Forgotten instances owned by departed employees wasting thousands monthly.
2. **False-Positive Aggression:** Simple average-CPU scripts accidentally terminating scheduled nightly batch/ETL workloads.

## Core Solution
CloudGuard AI evaluates 168-hour (7-day) CPU usage arrays to distinguish true `flat_idle` instances from `periodic_burst` ETL traps. When remediation is needed:
* It generates non-destructive Terraform HCL (`DRY_RUN_ONLY`).
* It enforces a strict **HumanApprovalGuard** preventing automated execution without explicit human sign-off.