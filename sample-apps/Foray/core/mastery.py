"""
DETERMINISTIC. NO LLM CALLS IN THIS FILE. EVER.

Mastery is an exponential moving average per (student, concept).
Reproducible, explainable on stage in one sentence, no API latency.

  "We do not put a language model in a numeric path." — foray_plan.md §3.2
"""

from __future__ import annotations

from api.schema import MASTERY_ALPHA


def update_level(previous: float | None, observation: float) -> float:
    """
    EMA update. `observation` is evidence of understanding from one
    reflection, 0.0–1.0.

    First observation seeds the level directly — averaging against an
    invented prior would make week 1 meaningless.
    """
    obs = min(1.0, max(0.0, observation))
    if previous is None:
        return obs
    return (MASTERY_ALPHA * obs) + ((1.0 - MASTERY_ALPHA) * previous)


def decay(level: float, weeks_unseen: int, rate: float = 0.05) -> float:
    """Concepts dim when unpractised. Drives the constellation fading."""
    return max(0.0, level - (rate * max(0, weeks_unseen)))
