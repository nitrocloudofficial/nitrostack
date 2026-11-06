# Schema validation of the exports

`tests/unit/report-schemas.test.ts` validates the SARIF and CycloneDX files that `generate_report` produces against the official JSON schemas, using Ajv 8 (`ajv@8.20.0`, `ajv-formats@3.0.1`). Schemas are read from npm packages in `node_modules` at test time; nothing is fetched from the network.

| Format | Schema file | Package (pinned devDependency) | Notes |
|---|---|---|---|
| CycloneDX 1.5 | `res/schema/bom-1.5.SNAPSHOT.schema.json` (plus `spdx` and `jsf-0.82`) | `@cyclonedx/cyclonedx-library@10.3.0` | Published by the CycloneDX project. Draft-07. The file names carry `SNAPSHOT`; the test rewrites the two `$ref` file names to the `$id`s the referenced schemas declare. |
| SARIF 2.1.0 | `lib/schemas/sarif-2.1.0-rtm.5.json` | `@microsoft/jest-sarif@1.0.0-beta.0` | A prerelease package from Microsoft's sarif-js-sdk that bundles the SchemaStore copy of the OASIS 2.1.0 schema. Draft-04: the test renames `id` to `$id` and drops the meta-schema reference (the schema uses no draft-04-only keywords). `@types/sarif` and `@microsoft/sarif` ship types only, no schema. |

Limits, stated plainly:

- The SARIF schema is the `rtm.5` text from a beta package, not the final OASIS errata file. A difference between the two would not be caught.
- Ajv ignores the formats `iri-reference` and `idn-email` (not in `ajv-formats`), so URL and email fields of the CycloneDX schema are not format-checked. The generators do not emit those fields.
- Passing the schema does not prove that GitHub code scanning accepts the SARIF upload. That was not tested against GitHub.
- The tests also run negative controls (a bad level, a missing version, a zero line, a bad component type, a bad serial number) so a validator that accepts everything would fail.
