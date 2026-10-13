# CONTINUUM — Getting Started with Phase 1

## Quick Start

### 1. Install Dependencies

```bash
cd continuum
pip install -r requirements.txt
```

### 2. Initialize the System

```bash
python main.py
```

This will:
- Create `data/continuum.db` (SQLite database) and initialize its schema
- Generate `data/employees.csv` (3 technicians)
- Generate `data/maintenance_logs.csv` (92 maintenance events)
- Generate `data/sensor_history.csv` (500 sensor readings — each maintenance
  event is paired with a linked sensor reading, so the embedded pattern is
  statistically real, not just described in text)
- Generate `data/interview_transcripts.json` (3 interview transcripts)
- Load all of the above into the SQLite database
- Generate `config/interview_queue.json` (interview queue)

### 3. Run Tests

```bash
python test_phase1.py
```

Expected output:
```
============================================================
CONTINUUM Phase 1 Test Suite
============================================================

Testing Pydantic models...
✓ Employee model works
✓ MaintenanceLog model works
✓ SensorReading model works
✓ Heuristic model works
✓ ValidationResult model works
✓ OperationalRule model works
✓ InterviewTranscript model works

Testing synthetic data generation...
✓ Generated 3 employees
✓ Generated 92 maintenance logs (30 bearing failures)
✓ Generated 500 sensor readings (~150 high humidity)
✓ Generated 3 interview transcripts

Testing embedded pattern strength...
✓ Pattern present near bearing failures (~77%) exceeds other failures (~13%)
✓ Chi-square test is significant (chi2≈34, p<0.001)

Testing interview queue generation...
✓ Generated interview queue with 3 employees
  1. John Smith (25 years)
  2. Maria Garcia (18 years)
  3. Robert Chen (12 years)

Testing database initialization...
✓ Database initialized with 7 tables

Testing CSV file generation...
✓ employees.csv: 3 rows
✓ maintenance_logs.csv: 92 rows
✓ sensor_history.csv: 500 rows

Testing JSON file generation...
✓ interview_transcripts.json: 3 transcripts

============================================================
✓ All Phase 1 tests passed!
============================================================
```

## Project Structure

```
continuum/
├── agents/                       # AI agents (Phase 2+)
├── mcp/                          # MCP server + tool handlers (Phase 2+)
│   ├── server.py
│   └── tools.py
├── database/                     # SQLite database
│   └── sqlite.py
├── models/                       # Pydantic data models
│   ├── employee.py
│   ├── maintenance.py            # MaintenanceLog + SensorReading
│   ├── heuristic.py              # Heuristic + HeuristicCondition
│   ├── validation.py             # ValidationResult
│   └── operational_rule.py       # OperationalRule + InterviewTranscript
├── utils/                        # Utilities
│   ├── logger.py
│   ├── synthetic_data.py
│   └── interview_queue.py
├── services/                     # Business logic (Phase 2+)
├── data/                         # Generated datasets
├── config/                       # Configuration files
├── requirements.txt              # Python dependencies
├── README.md                     # Project overview
├── PHASE1_SUMMARY.md             # Phase 1 detailed summary
├── VERIFICATION.md               # Verification checklist
├── GETTING_STARTED.md            # This file
├── mcp_manifest.json             # MCP tool manifest
├── main.py                       # Phase 1 entrypoint (DB init + data generation)
└── test_phase1.py                # Test suite
```

Note: this project is built as an **MCP server**, not a CLI application.
`main.py` remains the one-shot Phase 1 setup entrypoint (schema + synthetic
data + interview queue). From Phase 2 onward, the ongoing interface is the
set of MCP tools registered in `mcp/server.py`, not a terminal command set.

## Generated Data

### Employees (3 technicians)

| ID | Name | Machine | Experience | Retirement |
|----|------|---------|------------|------------|
| EMP001 | John Smith | MACHINE-A | 25 years | 2026-12-31 |
| EMP002 | Maria Garcia | MACHINE-B | 18 years | 2027-06-30 |
| EMP003 | Robert Chen | MACHINE-C | 12 years | 2028-03-15 |

### Maintenance Logs (92 events)

- **30 bearing failures** (positive occurrences)
  - High humidity (>80%) AND high vibration (>2.0 mm/s)
  - Real, statistically embedded pattern that should PASS validation
- **62 other failures** (negative occurrences)
  - Seal wear, oil degradation, routine maintenance, etc.
  - Random distribution

### Sensor History (500 readings)

Sensor readings are **linked to maintenance logs**, not generated independently:

- **92 linked readings** — one per maintenance log, timestamped 1-8 hours
  before the incident, on the same machine:
  - Readings linked to bearing failures show the humidity/vibration pattern
    ~90% of the time
  - Readings linked to other failures show it only ~8% of the time (background noise)
- **408 background readings** — unlinked, general historical data (~30%
  exhibit the high-humidity/high-vibration pattern by chance)

This linkage is what makes the pattern statistically detectable (chi-square
and Pearson correlation both come out strongly significant) rather than
existing only in the interview transcript's prose.

### Interview Transcripts (3 interviews)

1. **INT001** (John Smith)
   - Topic: Bearing failure incident
   - Pattern: Humidity > 80% AND Vibration > 2.0 mm/s
   - Confidence: 95%
   - Status: Real, validated pattern

2. **INT002** (Maria Garcia)
   - Topic: Hydraulic seal wear
   - Pattern: Pressure drops with temperature
   - Also mentions: "Failures increase every Tuesday" (40% confidence)
   - Status: False pattern for validation testing — no structural
     support exists anywhere in the maintenance/sensor data, so this
     should FAIL validation

3. **INT003** (Robert Chen)
   - Topic: Sensor calibration
   - Pattern: Unpredictable drift
   - Confidence: Low
   - Status: No clear pattern

## Interview Queue

Ordered by experience (descending), then retirement date (ascending):

```json
[
  {
    "queue_position": 1,
    "employee_id": "EMP001",
    "name": "John Smith",
    "years_experience": 25,
    "retirement_date": "2026-12-31",
    "status": "pending"
  },
  {
    "queue_position": 2,
    "employee_id": "EMP002",
    "name": "Maria Garcia",
    "years_experience": 18,
    "retirement_date": "2027-06-30",
    "status": "pending"
  },
  {
    "queue_position": 3,
    "employee_id": "EMP003",
    "name": "Robert Chen",
    "years_experience": 12,
    "retirement_date": "2028-03-15",
    "status": "pending"
  }
]
```

## Database Schema

### employees
- employee_id (PRIMARY KEY)
- name
- machine_id
- years_experience
- retirement_date
- expertise_areas
- interview_completed

### maintenance_logs
- log_id (PRIMARY KEY)
- machine_id
- component
- failure_type
- timestamp
- description
- technician_id (FOREIGN KEY)
- resolution

### sensor_readings
- reading_id (PRIMARY KEY)
- machine_id
- timestamp
- humidity_percent
- vibration_mm_s
- temperature_celsius
- pressure_bar

### heuristics
- heuristic_id (PRIMARY KEY)
- machine_id
- component
- failure_type
- trigger
- conditions (JSON)
- symptoms (JSON)
- recommended_action
- expert_confidence
- extracted_from_interview
- extraction_timestamp

### validation_results
- validation_id (PRIMARY KEY)
- heuristic_id (FOREIGN KEY)
- support_count
- total_occurrences
- conditional_probability
- pearson_correlation
- chi_square_statistic
- chi_square_p_value
- confidence_score
- decision
- reasoning
- validation_timestamp

### operational_rules
- rule_id (PRIMARY KEY)
- heuristic_id (FOREIGN KEY)
- machine_id
- component
- failure_type
- trigger
- conditions (JSON)
- recommended_action
- confidence_score
- created_timestamp

### interview_transcripts
- interview_id (PRIMARY KEY)
- employee_id (FOREIGN KEY)
- incident_id
- transcript
- timestamp

## Pydantic Models

All models include type hints, docstrings, JSON schema examples, and validation.

### Employee
```python
Employee(
    employee_id="EMP001",
    name="John Smith",
    machine_id="MACHINE-A",
    years_experience=25,
    retirement_date="2026-12-31T00:00:00",
    expertise_areas=["bearing maintenance", "vibration analysis"],
    interview_completed=False
)
```

### MaintenanceLog
```python
MaintenanceLog(
    log_id="LOG001",
    machine_id="MACHINE-A",
    component="bearing",
    failure_type="bearing_failure",
    timestamp="2026-07-20T14:30:00",
    description="Bearing overheated due to high humidity and vibration",
    technician_id="EMP001",
    resolution="Replaced bearing, cleaned lubrication system"
)
```

### SensorReading
```python
SensorReading(
    reading_id="SENSOR001",
    machine_id="MACHINE-A",
    timestamp="2026-07-20T14:00:00",
    humidity_percent=85.5,
    vibration_mm_s=2.3,
    temperature_celsius=72.1,
    pressure_bar=6.2
)
```

### Heuristic
```python
Heuristic(
    heuristic_id="HEU001",
    machine_id="MACHINE-A",
    component="bearing",
    failure_type="bearing_failure",
    trigger="Humidity > 80% AND Increasing vibration",
    conditions=[
        HeuristicCondition(parameter="humidity_percent", operator=">", value=80),
        HeuristicCondition(parameter="vibration_mm_s", operator=">", value=2.0)
    ],
    symptoms=["overheating", "noise", "vibration"],
    recommended_action="Replace bearing and clean lubrication system",
    expert_confidence=0.95,
    extracted_from_interview="INT001",
    extraction_timestamp="2026-07-20T15:00:00"
)
```

### ValidationResult
```python
ValidationResult(
    validation_id="VAL001",
    heuristic_id="HEU001",
    support_count=32,
    total_occurrences=92,
    conditional_probability=0.85,
    pearson_correlation=0.78,
    chi_square_statistic=24.5,
    chi_square_p_value=0.0001,
    confidence_score=0.88,
    decision="Accepted",
    reasoning="Strong statistical support with p-value < 0.05",
    validation_timestamp="2026-07-20T15:30:00"
)
```

### OperationalRule
```python
OperationalRule(
    rule_id="RULE001",
    heuristic_id="HEU001",
    machine_id="MACHINE-A",
    component="bearing",
    failure_type="bearing_failure",
    trigger="Humidity > 80% AND Increasing vibration",
    conditions=[
        HeuristicCondition(parameter="humidity_percent", operator=">", value=80),
        HeuristicCondition(parameter="vibration_mm_s", operator=">", value=2.0)
    ],
    recommended_action="Replace bearing and clean lubrication system",
    confidence_score=0.88,
    created_timestamp="2026-07-20T16:00:00"
)
```

### InterviewTranscript
```python
InterviewTranscript(
    interview_id="INT001",
    employee_id="EMP001",
    incident_id="LOG001",
    transcript="Q: What did you notice before the bearing failed?\nA: ...",
    timestamp="2026-07-20T15:00:00"
)
```

## Next Steps

Phase 1 is complete. The system is ready for Phase 2:

### Phase 2: ElicitationAgent
- Receive maintenance incident
- Generate grounded interview questions using Claude
- Generate intelligent follow-up questions
- Save transcript
- Create Claude interface (real vs mock)

### Phase 3: KnowledgeExtractionAgent
- Extract structured heuristics from transcripts
- Generate JSON with machine, component, failure, trigger, conditions, symptoms, recommended action

### Phase 4: ValidationEngine (Core)
- Statistical validation using Pandas, NumPy, SciPy
- Support count, conditional probability, Pearson correlation, chi-square p-value
- Confidence scoring and decision (Accepted/Rejected)
- Unit tests

### Phase 5: ExplainabilityEngine
- Natural-language explanations
- Supporting historical incidents
- Matplotlib charts
- Results returned via MCP tool output (chart file paths included)

### Phase 6: CodificationAgent
- Convert accepted heuristics to operational rules
- SQLite storage with duplicate detection (already implemented — see
  `Database.is_duplicate_rule` / `Database.insert_operational_rule`)
- Static diagram generation

### Phase 7: MentorAgent
- Real-time sensor event processing
- Rule matching and recommendation
- Confidence scoring and supporting evidence

## Troubleshooting

### Import errors
Make sure you're in the `continuum` directory and have installed dependencies:
```bash
cd continuum
pip install -r requirements.txt
```

### Database errors
Delete the database and reinitialize:
```bash
rm data/continuum.db
python main.py
```

### Test failures
Check that all dependencies are installed:
```bash
pip install -r requirements.txt
python test_phase1.py
```

## Documentation

- **README.md** — Project overview and architecture
- **PHASE1_SUMMARY.md** — Detailed Phase 1 summary
- **VERIFICATION.md** — Verification checklist
- **GETTING_STARTED.md** — This file

---

**Phase 1 Status: ✓ COMPLETE**

Ready for Phase 2 implementation.