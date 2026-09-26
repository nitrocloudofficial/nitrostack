# Local Data Scaffold

This directory follows `DATA_SPEC.md`. Its contents support validation, deterministic execution,
and offline demonstrations; they are not experimentally validated research results.

- `profiles/` contains validated, immutable workflow profiles whose definitions are never stored in SQLite.
- `reference/` contains reviewed, versioned public facts plus clearly identified synthetic values
  where a source is restricted, license-unclear, or sensitive.
- `fixtures/` contains exact-match, approved demonstrations. Demo proteins, predictor-shaped
  outputs, and population values are synthetic and must retain `SYNTHETIC`, `FIXTURE`, and
  `scientificUse: false` provenance through every consuming surface.
- `schemas/` is reserved for dataset validation schemas.
- `generated/` is gitignored except for its explanatory README.

Synthetic records preserve the same schemas as their live equivalents so offline workflows can be
tested reliably. They must never be presented as live/cached evidence or interpreted as pathogen,
clinical, efficacy, or experimental data.
