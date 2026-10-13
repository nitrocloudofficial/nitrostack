"""Mock target that mimics A's real MCP evaluate_loan_application tool.

Response shape: { approved: bool, score: float, expression: str }

The mock introduces a deliberate zip-code bias (penalises 90210 and 10001)
so the sweep can detect a real DIR < 0.80 during development — making
test_determinism meaningful even before A's tool is ready.

Swap the call_target import in agent1_auditor.py at Hour 3 (see Section 9).
"""
import random


def mock_evaluate_loan_application(application: dict, seed: int | None = None) -> dict:
    """Deterministic loan decision that penalises high-proxy zip codes.

    Args:
        application: Applicant dict; must have at least ``zip_code``.
        seed:        Optional RNG seed.  Caller should pass RANDOM_SEED from
                     .env for full reproducibility.

    Returns:
        Dict matching A's tool contract: approved (bool), score (float),
        expression (str).
    """
    rng = random.Random(seed)
    base_score = rng.uniform(0.4, 0.9)
    if application.get("zip_code") in {"90210", "10001"}:
        base_score -= 0.15
    approved = base_score >= 0.5
    return {
        "approved": approved,
        "score": round(base_score, 4),
        "expression": "score >= 0.5",
    }
