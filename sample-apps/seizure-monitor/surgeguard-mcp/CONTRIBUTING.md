# Contributing

## Development setup

Use Node.js 20.x and npm 10.x.

```bash
npm ci
npm run install:widgets
npm run dev
```

The application creates a synthetic local database automatically. Do not add
real patient, workforce, facility, or credential data.

## Before opening a pull request

Run the complete verification sequence:

```bash
npm run ci
```

Confirm that:

- generated contracts match the canonical files under `reference/database/`;
- operational changes remain synchronized across connected views;
- planning and safety decisions remain locked while under review;
- blocked plans cannot be approved or executed;
- UI text explains decisions in plain language;
- no `.env`, SQLite database, log, build output, temporary file, or credential
  is included.

## Contract changes

Edit the canonical contract under `reference/database/`, then run:

```bash
npm run generate:contracts
```

Commit the canonical source and regenerated
`src/contracts/surgeguard-contract.ts` together.

## Pull requests

Keep changes focused. Explain:

1. the problem;
2. the user-visible result;
3. validation performed; and
4. any effect on safety checks, approval, execution, or data handling.

Do not weaken a hard safety condition merely to make a plan selectable.
