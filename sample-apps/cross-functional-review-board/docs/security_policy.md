# Security Policy — TechNova Solutions

**Policy ID:** POL-SEC-01
**Owner:** Security Team
**Last Reviewed:** February 2026
**Applies To:** All employees, contractors, systems, and third-party integrations

## 1. Purpose
This policy establishes the minimum security standards for TechNova's
systems, infrastructure, employee access, and third-party integrations, in
order to protect customer data, company IP, and system availability.

## 2. Access Control
2.1. All employee access to production systems must follow the **Principle
     of Least Privilege** — no employee or system should have more access
     than is strictly required for their role.
2.2. Admin-level access to any production system, database, or company
     device must be explicitly approved by the Security team and reviewed
     on a quarterly basis.
2.3. Company laptops are issued with standard (non-admin) user accounts by
     default. Admin access requires a documented business justification and
     Security sign-off.
2.4. Multi-Factor Authentication (MFA) is mandatory for all systems handling
     customer or employee data.

## 3. Third-Party & Vendor Security
3.1. Any third-party tool, vendor, or integration that will have access to
     TechNova systems or data must pass a Security review before onboarding.
3.2. Required documentation includes: SOC 2 Type II report (or equivalent),
     penetration testing results within the last 12 months, and a completed
     vendor security questionnaire.
3.3. Vendors without a SOC 2 report may be conditionally approved for
     non-sensitive use cases only, with a mandatory re-review within 6 months.

## 4. Infrastructure & Cloud Security
4.1. Any new cloud infrastructure change (provider migration, new region,
     new service) must include a documented disaster recovery plan and a
     data residency assessment.
4.2. All data in transit must be encrypted using TLS 1.2 or higher.
4.3. All data at rest must be encrypted using AES-256 or an equivalent
     standard.
4.4. Infrastructure changes affecting customer data location must be
     reviewed jointly by Security and Legal (data residency implications).

## 5. Device Security
5.1. All company-issued devices must have endpoint detection and response
     (EDR) software installed and active before being handed to an employee.
5.2. Lost or stolen devices must be reported to Security within 2 hours for
     remote wipe procedures to be initiated.

## 6. Incident Response
6.1. Any suspected security incident must be reported to the Security team
     immediately via the incident response channel.
6.2. The Security team will classify incidents by severity (Low/Medium/High/
     Critical) and follow the documented incident response runbook.
6.3. Post-incident reviews are mandatory for all Medium severity and above
     incidents.

## 7. AI & Model Security
7.1. AI models and the infrastructure serving them must be included in
     regular vulnerability scanning.
7.2. Training data pipelines that use customer data must have access
     controls equivalent to production customer databases.

## 8. Enforcement
Non-compliance with this policy may result in immediate revocation of
access, mandatory remediation before project continuation, and escalation
to department leadership.
