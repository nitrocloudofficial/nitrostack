"""Seed application fixtures for pre-Hour-3 development against mock target.

These four applications span different zip codes and demographics so that the
perturbation sweep can produce statistically meaningful disparate-impact signals
even with a tiny sample.  After Hour 3, swap to real application data loaded
from A's tool if available — or keep these as a reproducible baseline.
"""

SAMPLE_APPLICATIONS: list[dict] = [
    {
        "applicant_id": 1,
        "zip_code": "90210",
        "applicant_name": "A. Smith",
        "income": 62000,
        "credit_score": 710,
    },
    {
        "applicant_id": 2,
        "zip_code": "10001",
        "applicant_name": "B. Jones",
        "income": 58000,
        "credit_score": 690,
    },
    {
        "applicant_id": 3,
        "zip_code": "60614",
        "applicant_name": "C. Diaz",
        "income": 71000,
        "credit_score": 730,
    },
    {
        "applicant_id": 4,
        "zip_code": "94103",
        "applicant_name": "D. Lee",
        "income": 65000,
        "credit_score": 705,
    },
]
