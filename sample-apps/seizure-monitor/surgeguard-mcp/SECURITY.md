# Security policy

## Demonstration boundary

SurgeGuard currently uses synthetic data, fixed demonstration identity, local
SQLite-compatible persistence, and simulated operational effects. It is not
approved for clinical production, protected health information, or patient-care
decisions.

Do not connect this repository to a real hospital environment without completing
the controls documented in
[PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md).

## Reporting a vulnerability

After the GitHub repository is created, report vulnerabilities privately through
GitHub Security Advisories. Do not open a public issue for a suspected security
problem.

Include:

- the affected component;
- reproduction steps using synthetic data;
- expected impact;
- suggested mitigation, if known; and
- whether credentials or sensitive data may have been exposed.

Never attach real patient data, access tokens, private keys, database files, or
internal infrastructure details.

## Supported version

Only the latest state of the default branch is supported during the hackathon
demonstration phase. No production security-service-level agreement is offered.

## Dependency advisories

The widget application uses a current supported Next.js release and pins patched
PostCSS and Sharp versions through npm overrides. Remaining audit findings are
transitive dependencies of the MCP SDK and NitroStack development CLI. They are
tracked by Dependabot and are not force-overridden across incompatible major
versions. Reassess them before any network-exposed or production deployment.
