# Skill: EV Battery Selection Pipeline
# NitroStack Orchestration Skill for the ev-battery-material-advisor

Run these steps in strict order. Do not skip or reorder. Pass each step's
output as the next step's input.

## Step 1 — RequirementAnalysisModule

Call these tools in sequence. Each tool's output feeds the next.

1. `parse_requirement_spec` → Pass the engineer's raw free-text input.
   Returns: `requirementSet`, `parsedFields`, `confidence`

2. `classify_constraints` → Pass `requirementSet` from step 1.
   Returns: `mandatory[]`, `optional[]`

3. `to_structured_schema` → Pass `requirementSet` from step 1.
   Returns: `metricsTarget`, `schemaValid`, `fieldsCovered`

4. `prioritize_objectives` → Pass `requirementSet` from step 1.
   Returns: `weights`, `dominantObjective`, `rationale`

**Purpose:** Converts user input into a structured, weighted `MaterialMetricsTarget` and `WeightedObjectives` for the downstream ranking and simulation steps.

---

## Step 2 — MaterialRecommendationModule

Call these tools in sequence, once per battery component type of interest (e.g., cathode, anode).

1. `rank_candidate_materials` → Pass `componentType`, `metricsTarget` (from Step 1.3), `weights` (from Step 1.4).
   Returns: `ranked[]` with `compositeScore`, `strengths`, `weaknesses`

2. `run_pareto_optimization` → Pass `ranked[]` from step 2.1.
   Returns: `paretoFront[]`, `dominatedCandidates[]`

3. `suggest_alternative_formulations` → Pass `materialId` (top pareto candidate), `optimizeFor`.
   Returns: `variants[]` with composition adjustment suggestions.

4. `explain_recommendation` → Pass `materialId` of top recommendation.
   Returns: SHAP-style `shapContributions[]`, `overallJustification`

5. (Optional) `show_material_comparison` → Renders the radar + scorecard widget for all candidates.

**Purpose:** Shortlists and ranks candidate materials against the weighted requirement set, with Pareto optimization and SHAP explainability.

---

## Step 3 — DigitalTwinSimulationModule

Call these tools for each shortlisted candidate from Step 2's Pareto front.

1. `build_virtual_cell_model` → Pass `materialId`, optional `particleSizeUm`, `electrodeThicknessUm`, `porosityFraction`.
   Returns: Cell model parameters including `effectiveDiffusivity`, `tortuosity`, `volumeFraction`

2. `simulate_electrochemical_performance` → Pass `materialId`, `cRate`, `temperatureCelsius`.
   Returns: `voltageProfile[]`, `predictedCapacityMahG`, `internalResistanceOhm`, `simulationConfidence`

3. `simulate_thermal_response` → Pass `materialId`, `chargeRateC`, `ambientTempCelsius`.
   Returns: `peakTemperatureCelsius`, `thermalRunawayRisk`, `temperatureProfile[]`

4. `simulate_mechanical_degradation` → Pass `materialId`, `cycleCount`.
   Returns: `volumeExpansionPct`, `projectedCycleLifeCycles`, `degradationCurve[]`

5. `predict_failure_modes` → Pass `materialId`, `chargeRateC`, `temperatureCelsius`.
   Returns: `failureModes[]`, `dominantFailureModes[]`, `estimatedCycleLife`

6. `run_surrogate_screening` → Pass `componentType` to rapidly screen all candidates before full simulation.
   Returns: `shortlist[]` with `surrogateScore`, `recommendedForFullSim`

7. `compare_candidates_side_by_side` → Pass `materialIds[]` of Pareto-front candidates.
   Returns: Parallel `voltageProfiles[]`, `thermalProfiles[]`, `degradationCurves[]`

8. (Optional) `show_digital_twin_timeline` → Renders the tabbed simulation dashboard widget.

**Purpose:** Virtually tests shortlisted candidates for electrochemical, thermal, and mechanical performance, replacing slow physical coin-cell/pouch-cell testing for early-stage screening.

---

## Step 4 — KnowledgeBaseModule (concurrent with other steps)

These tools can be called ad-hoc throughout the pipeline.

### As-needed during pipeline:
- `query_material_compatibility` → Natural-language query for compatible materials at any step.

### Post-decision (after Step 5):
- `log_recommendation_outcome` → Log which material was adopted and how simulation compared to real-world.
- `refine_ranking_model` → Retrain ranking model with ≥5 logged outcomes.

### Data ingestion (independent of pipeline):
- `ingest_new_material_data` → Pull from Materials Project, NREL, Semantic Scholar.
- `validate_dataset_quality` → Schema + outlier check before merging.
- `ingest_manufacturer_datasheet` → Integrate validated manufacturer specs.

**Purpose:** Supplies validated data to all steps and learns from outcomes to improve future pipeline runs.

---

## Step 5 — DecisionReportingModule

Call these tools in sequence to synthesize the full recommendation.

1. `compute_topsis_ranking` → Pass `candidates[]` (Pareto front from Step 2.2), `weights` (from Step 1.4).
   Returns: `topRecommendation`, `topsisRanking[]` with closeness coefficients

2. `identify_trade_offs` → Pass `candidates[]` (top 2-3 from TOPSIS).
   Returns: `tradeOffs[]` with plain-English narratives

3. `surface_design_risks` → Pass `candidates[]` from Step 2.
   Returns: `risks[]` classified by severity and type

4. `compute_confidence_score` → Pass `topMaterialId`, `componentType`, `weights`.
   Returns: `overall` confidence (0-1), `breakdown` by KB/sim/historical

5. `generate_comparison_report` → Pass `componentType`, `weights`.
   Returns: Full report with scorecard, TOPSIS ranking, trade-offs, regulatory matrix, sustainability assessment, confidence.

### Widget tools for visualization:
- `show_pareto_front_chart` → 2D scatter of Pareto candidates
- `show_trade_off_table` → Trade-off comparison table widget
- `show_confidence_gauge` → Confidence gauge with breakdown tooltip

### Prompts for report generation:
- `trade_off_narrative_prompt` → Convert `tradeOffs[]` to plain-English engineering prose
- `executive_summary_prompt` → One-paragraph summary for non-specialist stakeholders

**Purpose:** Synthesizes all upstream analysis into a final ranked recommendation, confidence-scored decision dashboard, and exportable engineering report.

---

## Pipeline Data Flow Summary

```
User Input (free text / structured spec)
  └─► parse_requirement_spec
      └─► classify_constraints, to_structured_schema, prioritize_objectives
          └─► rank_candidate_materials (per component type)
              └─► run_pareto_optimization
                  ├─► explain_recommendation, suggest_alternative_formulations
                  ├─► build_virtual_cell_model
                  │   └─► simulate_electrochemical_performance
                  │   └─► simulate_thermal_response
                  │   └─► simulate_mechanical_degradation
                  │   └─► predict_failure_modes
                  │   └─► compare_candidates_side_by_side
                  └─► compute_topsis_ranking
                      └─► identify_trade_offs
                      └─► surface_design_risks
                      └─► compute_confidence_score
                      └─► generate_comparison_report
                              └─► log_recommendation_outcome (post-decision)
                              └─► refine_ranking_model (periodic)
```

---

## Stopping Conditions

- If `classify_constraints` returns any `mandatory` constraint that no candidate satisfies → surface this to the user immediately and suggest `suggest_alternative_formulations` or `query_material_compatibility`.
- If `compute_confidence_score` returns `overall < 0.60` → surface the low-confidence warning and recommend `ingest_new_material_data` before committing to physical testing.
- If `predict_failure_modes` returns any `critical` risk → stop and surface mitigation requirements before proceeding to the reporting step.
