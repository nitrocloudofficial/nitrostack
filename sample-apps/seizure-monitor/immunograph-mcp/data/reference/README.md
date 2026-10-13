# Reference Data

Reviewed reference datasets live here with manifest entries, source metadata, licenses, and SHA-256
hashes. Public facts such as amino-acid names and HLA nomenclature remain source-backed.

The connector registry includes `immunograph-synthetic-predictor`, an explicitly synthetic-only
demonstration connector. It advertises only `SYNTHETIC`, always has `scientificUse: false`, and is
not a substitute for IEDB or MHCflurry.

Restricted, license-unclear, or sensitive values are replaced with schema-compatible synthetic
records rather than copied or inferred. Synthetic aggregate values use `sourceKind: "SYNTHETIC"`,
synthetic population identifiers, `scientificUse: false`, and a local source URN. They exist only
for validation and deterministic demos and must not be interpreted as measured population
frequencies or research evidence.

`demo-proteins.synthetic-v1.json` contains five artificial protein sequences with verified hashes.
Three correspond to approved full replay fixtures; the remaining two are validation/demo inputs
only and intentionally fail closed if prediction replay is requested.
