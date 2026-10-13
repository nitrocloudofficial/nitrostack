# Contributing to Aurora Billing

## Branching
`master` = production. `develop` = staging. Feature branches: `feature/AUR-<ticket>-<slug>`.
Hotfixes branch from `master` as `hotfix/AUR-<ticket>-<slug>` and must be back-merged to `develop`.

## Commit message convention (enforced by commitlint in CI)
```
<type>(<scope>): <subject>   [AUR-1234]
```
- **type**: feat | fix | perf | refactor | test | chore | docs
- **scope**: billing | invoice | customer | orm | web | ci | batch
- The Jira key in square brackets is **mandatory** — CI rejects commits without it.
- Header max 90 chars. Body wrapped at 100.

Example: `fix(invoice): guard against null ISSUED_ON in date window [AUR-4471]`

## Testing expectations
- Node: Jest. Specs live in `src/test/*.spec.js`. Mock `aurora-orm`, never hit Oracle in unit tests.
- Java: JUnit 4 + Mockito, `mvn test`.
- Coverage gate is **78% lines** — the Jenkins `Coverage Gate` stage fails the build below it.

## Data access rule
All database access goes through `server/db/aurora-orm.js`. Raw `oracledb` calls outside
`server/db/` are rejected in review. The ORM is callback-based; do not wrap it in promises
inside services (the batch tier relies on the callback ordering).
