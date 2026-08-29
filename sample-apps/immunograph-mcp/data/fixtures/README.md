# Prediction Fixtures

Approved exact-match demo fixtures live under the case directories. Their protein sequences,
predictor-shaped outputs, population-coverage values, and expected rankings are synthetic demo
data, not pathogen reference sequences or results from IEDB, MHCflurry, GraphBepi, or another live
provider.

Every synthetic payload must declare `sourceKind: "SYNTHETIC"` and `scientificUse: false`; every
observation must retain `sourceStatus: "FIXTURE"`. Selection requires an approved manifest entry
and an exact protein/configuration match. Fixtures never populate the live cache and must not be
used for research interpretation, clinical decisions, efficacy claims, or experimental validation.
