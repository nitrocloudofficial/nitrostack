"""
score.py

Combines Health and Drift outputs into a single Enterprise Health Score.

Weighting scheme (documented explicitly since this is the core design
decision of this module):

    Enterprise Health Score =
          health_weight * avg(knowledge_health, decision_health, workflow_health)
        + drift_weight  * (1 - avg(|knowledge_drift|, |workflow_drift|, |decision_drift|))

Rationale for the default 50/50 weighting:
  - Health and Drift matter equally: a system can look healthy right now
    but be actively drifting toward a problem, or look unhealthy now but
    be actively stabilizing. Leadership needs both signals represented.
  - Drift values are passed through abs() before scoring, because both
    large positive and large negative drift indicate instability worth
    surfacing — even though negative drift is directionally "improvement,"
    a large swing in either direction usually means something changed
    that's worth a human looking at.

This weighting is a starting point, not a fixed law — treat it as
configurable and revisit once real usage data is available.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict

from .health import HealthScores
from .drift import DriftSignals
from .metrics import clamp

DEFAULT_HEALTH_WEIGHT = 0.5
DEFAULT_DRIFT_WEIGHT = 0.5


@dataclass
class EnterpriseHealthScore:
    score: float
    components: Dict[str, float] = field(default_factory=dict)
    timestamp: str = ""


def compute_enterprise_health_score(
    health: HealthScores,
    drift: DriftSignals,
    health_weight: float = DEFAULT_HEALTH_WEIGHT,
    drift_weight: float = DEFAULT_DRIFT_WEIGHT,
) -> EnterpriseHealthScore:
    avg_health = (
        health.knowledge_health + health.decision_health + health.workflow_health
    ) / 3

    avg_abs_drift = (
        abs(drift.knowledge_drift) + abs(drift.workflow_drift) + abs(drift.decision_drift)
    ) / 3

    raw_score = health_weight * avg_health + drift_weight * (1 - avg_abs_drift)

    return EnterpriseHealthScore(
        score=round(clamp(raw_score, 0.0, 1.0), 4),
        components={
            "knowledge_health": health.knowledge_health,
            "decision_health": health.decision_health,
            "workflow_health": health.workflow_health,
            "knowledge_drift": drift.knowledge_drift,
            "workflow_drift": drift.workflow_drift,
            "decision_drift": drift.decision_drift,
        },
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
