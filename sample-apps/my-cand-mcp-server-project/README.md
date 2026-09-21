# Multi-Source Candidate Data Transformer

A modular, pluggable Python 3.11 candidate data transformer that reads applicant records from various source formats (JSON profiles, CSV registries, unstructured text resumes, LinkedIn exports, and recruiter notes), extracts raw candidate signals, validates them against configuration rules, resolves identity references, merges candidates with tie-breaking rules, and projects them into custom JSON structures alongside dynamic validation alerts and clean visual HTML reports.

---

## Folder Structure

```text
├── configs/                      # Configuration rule tables
│   ├── location_mappings.json    # HSL-based location state and country mapping dicts
│   ├── phone_rules.json          # ISO-code matching dialing formats and lengths
│   └── sample_projection_config.json # Custom field output targets
├── models/                       # Type-hinted candidate data representations
│   ├── candidate.py              # Candidate, ProvenanceRecord, ExtraField data schemas
│   ├── config.py                 # ProjectionConfig validation schemas
│   └── reporting.py              # ValidationResult schemas
├── plugins/                      # Source extraction plugins
│   ├── base.py                   # Abstract BasePlugin interface
│   ├── ats_json_plugin.py        # ATS-profile JSON parsing
│   ├── csv_plugin.py             # CSV-registry candidate parsing
│   ├── resume_text_plugin.py     # Unstructured resume parser (with date locking)
│   ├── linkedin_plugin.py        # LinkedIn JSON member exports parser
│   └── recruiter_notes_plugin.py # Text-formatted recruiter notes parser
├── normalizers/                  # Value-normalization pluggable logic
│   ├── base.py                   # ValueNormalizer abstract interface
│   ├── name.py                   # Name capitalization and cleansing
│   ├── phone.py                  # Strict phone rules validation
│   ├── location.py               # Fuzzy mappings normalization
│   ├── date.py                   # Date parser with format locks
│   └── skill.py                  # Capitalization matching
├── engine/                       # Pipeline core modules
│   ├── pipeline.py               # Extraction, normalization, identity resolution, merge
│   ├── projection.py             # Customizable projection layer
│   ├── validation.py             # Structural validation alert suite
│   ├── explainability.py         # DecisionLog compiler
│   ├── dashboard.py              # Quality Dashboard metrics compiler
│   └── report_generator.py       # Self-contained responsive HTML reporter
├── sample_inputs/                # Pre-packaged test datasets
├── outputs/                      # Final JSON, logs, and HTML reports
├── tests/                        # Comprehensive unit and integration tests
├── requirements.txt              # Project third-party dependencies
├── run_tests.py                  # Test runner entrypoint
└── main.py                       # CLI execution entrypoint
```

---

## Installation

1. Ensure Python 3.11+ is installed.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## Running the CLI

Run the full transformation pipeline by executing the `main.py` entrypoint. Specify the source input files, output directory, and optional projection configuration.

### 1. Run Pipeline with Default Output Configuration
```bash
python main.py -i sample_inputs/ats_profile.json sample_inputs/linkedin_profile.json sample_inputs/resume_john_doe.txt sample_inputs/recruiter_candidates.csv sample_inputs/recruiter_notes.txt sample_inputs/malformed_source.json sample_inputs/tie_profile_a.json sample_inputs/tie_profile_b.json -o outputs
```

### 2. Run Pipeline with Custom Projection Configuration
```bash
python main.py -i sample_inputs/ats_profile.json sample_inputs/linkedin_profile.json sample_inputs/resume_john_doe.txt sample_inputs/recruiter_candidates.csv sample_inputs/recruiter_notes.txt sample_inputs/malformed_source.json sample_inputs/tie_profile_a.json sample_inputs/tie_profile_b.json -c configs/sample_projection_config.json -o outputs
```

### Options
* `-i`, `--inputs` : Paths to one or more source files to process.
* `-c`, `--config` : Path to a custom projection JSON configuration file. **If omitted, the pipeline falls back to the Default Output configuration.**
* `-o`, `--output-dir` : Directory where output files will be written (defaults to `outputs`).

---

## Default Output vs. Custom Projection Configuration

The system uses a **Projection Layer** (`engine/projection.py`) to transform the internal canonical records into the final projected candidate JSON.

### 1. Default Output (No `-c` Flag Passed)
If you run `main.py` without specifying a `-c` custom configuration file:
* **Confidence Wrapping**: Configured to `include_confidence = true`. Every field in the projected output is wrapped in a `{ "value": ..., "confidence": ... }` dictionary.
* **Missing Field Behavior**: Configured to `on_missing = "null"`. Missing fields will output as `null` values.
* **Fields Projected**: Emits exactly the following 9 standard canonical fields: `candidate_id`, `full_name` (marked as required), `emails`, `phones`, `location`, `links`, `headline`, `years_experience`, and `skills`.

### 2. Custom Projection Configuration (Via `-c` Flag)
You can pass a custom projection JSON configuration (e.g. `-c configs/sample_projection_config.json`) to dynamically control the output:
* `include_confidence`: `true` or `false` (controls whether fields are wrapped in a value/confidence object).
* `on_missing`: Determines the pipeline behavior when a field has no normalized value:
  * `"null"`: Emits `null` for missing fields in the JSON output.
  * `"omit"`: Skips/excludes the missing field completely from the candidate's JSON object.
  * `"error"`: Aborts execution with a `ValueError` if a required field is missing.
* `fields`: An array of fields to output. Each field config can customize:
  * `path`: Target name in the projected JSON.
  * `from_path`: Path from the canonical Candidate schema (allows renaming, e.g. mapping `full_name` to `name`).
  * `required`: `true` or `false` (fails validation if missing or null).
  * `normalize`: Special modifiers like `"uppercase"` or `"lowercase"`.

---

## Running the Web UI

The pipeline automatically compiles all execution logs, validation metrics, and candidate timelines directly into a single self-contained HTML report located in:

`outputs/report.html`

To run the Web UI:
1. Double-click or open `outputs/report.html` in any web browser.
2. **No server, hosting, or internet connection is required.** The application runs entirely offline.
3. Use the tabs to toggle between **Run Summary** (visual dashboards and charts), **Candidate Explorer** (expandable cards tracking field resolution timelines and raw contender values), and the **Validation Log** (validation alerts and skipped files list).
4. Download the original JSON artifacts directly from the UI buttons.

---

## Running the Testing Suite

Run the full unit and integration test suite via the test runner:

```bash
python run_tests.py
```

The test suite covers:
* Strict phone validation (min/max length constraints and invalid routing to `extra_fields`).
* Location complementary merging (city, state, country complementing) and provenance conservation.
* Multi-source tie-breaking and unresolved tie conflict flagging (`UNRESOLVED_CONFLICT` null out).
* Weak signal promotions and conflict penalties.
* Date format locking logic.
* Projection validation errors.

---

## System Architecture & Merge Strategy

### 1. Plugin Extraction
Plugins scan files matching standard patterns (JSON, CSV, unstructured TXT resumes, etc.). Raw fields are converted into `RawCandidateField` signals accompanied by an evidence tier (`A` for direct API database exports down to `D` for text regex guesses), source file metadata, and a timestamp.

### 2. Normalization
Each target field has a specialized normalizer:
* **Phone Normalizer**: Reads configuration parameters (`configs/phone_rules.json`) and strictly validates format lengths. Invalid numbers are rejected and routed to `candidate.extra_fields` to prevent corrupting canonical profiles.
* **Location Normalizer**: Dynamically translates inputs using fuzzy similarity matching against `configs/location_mappings.json` aliases.
* **Date Normalizer**: Implements **Date Format Locking**. If a file contains ambiguous dates (e.g. `05/06/2021`), the normalizer analyzes all dates in the file to determine a lock format (`DD/MM/YYYY` vs `MM/DD/YYYY`) before normalizing, avoiding parsing errors.

### 3. Identity Resolution
Candidates from different sources are resolved into a single identity if they share a matching email (case-insensitive) or a normalized canonical phone number.

### 4. Merging & Deduplication
For each canonical field:
* **Single-Valued Fields**: Resolved based on hierarchy: Highest Evidence Tier (e.g. `A` > `C`) $\rightarrow$ Most Recent Source Timestamp $\rightarrow$ Highest Normalization Confidence.
  * If a tie occurs at all three layers, the field value is set to `None`, flagged as an `UNRESOLVED_CONFLICT`, given a `0.15` confidence, and logged in explainability reports.
  * Conflict penalty (`-0.10`) is applied if sources contain disagreeing values.
  * Weak signal promotion is applied when corroborating sources agree on the winner.
* **Location Complementary Merging**: Resolves missing location sub-fields (e.g. merging a source with `"Springfield"` and another with `"Springfield, IL, US"` into a unified location). Original source provenances remain untouched. Any fields added from other sources are explicitly recorded under `merge_reason` and `merge_confidence` is recomputed in the decision logs.
* **Array Fields**: Array elements (emails, phones, skills, links) are unioned. The merge engine treats phone numbers as opaque canonical identifiers and performs exact deduplication only (no suffix or length heuristic matches inside the merge engine).

---

## Configuration Guidelines

* **configs/location_mappings.json**: Mapping dictionary for state and country translations.
* **configs/phone_rules.json**: Country-specific national lengths, dialing codes, and digit ranges used by the PhoneNormalizer fallback validator.
* **configs/sample_projection_config.json**: Configures the fields, paths, and formats emitted in `projected_candidates.json`.

---

## Design Assumptions

1. **Email / Phone Identity Anchors**: The system assumes email and phone numbers are reliable identity keys for merging across multiple sources.
2. **Deterministic Validation**: Configured rules are treated as source-of-truth validators. If a candidate lists an invalid phone, it is treated as a typo and routed out of the canonical field.
