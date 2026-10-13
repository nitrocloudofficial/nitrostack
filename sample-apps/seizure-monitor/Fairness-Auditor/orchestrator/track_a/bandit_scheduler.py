"""UCB1 multi-armed bandit scheduler for combo sweep prioritisation.

The bandit learns which proxy-field combinations (arms) are most likely to
produce high-drift signals and prioritises those within a fixed budget.

Reward signal: abs(1.0 - dir_value) — higher drift gets higher reward,
so UCB1 steers budget toward the most suspicious combos.

Reference:
  Auer, Cesa-Bianchi & Fischer (2002) "Finite-time Analysis of the
  Multiarmed Bandit Problem". Machine Learning 47(2–3), 235–256.
"""
import math


class UCB1Scheduler:
    """Upper Confidence Bound 1 bandit over a fixed set of combo keys.

    Args:
        combo_keys:  List of string keys, one per arm (combo).
        c:           Exploration constant.  Higher values explore more.
                     Defaults to 2.0 (env var UCB1_EXPLORATION_C).
    """

    def __init__(self, combo_keys: list[str], c: float = 2.0) -> None:
        if not combo_keys:
            raise ValueError("combo_keys must be non-empty")
        self.combo_keys = list(combo_keys)
        self.counts: dict[str, int] = {k: 0 for k in combo_keys}
        self.total_reward: dict[str, float] = {k: 0.0 for k in combo_keys}
        self.t: int = 0
        self.c: float = c

    def select(self) -> str:
        """Return the key of the arm to pull next.

        On the first pass every arm is pulled exactly once (exploration
        phase).  After that, UCB1 balances exploitation vs. exploration.
        """
        self.t += 1
        # Force-explore any arm that has never been pulled
        for key in self.combo_keys:
            if self.counts[key] == 0:
                return key
        ucb_values = {
            key: (
                self.total_reward[key] / self.counts[key]
                + self.c * math.sqrt(math.log(self.t) / self.counts[key])
            )
            for key in self.combo_keys
        }
        return max(ucb_values, key=ucb_values.__getitem__)

    def update(self, key: str, reward: float) -> None:
        """Record the outcome of pulling arm ``key``.

        Args:
            key:    The combo key that was just evaluated.
            reward: Observed reward (0.0–1.0).  In practice:
                    abs(1.0 - dir_value), capped at 1.0 for infinite DIR.
        """
        if key not in self.counts:
            raise KeyError(f"Unknown combo key: {key!r}")
        self.counts[key] += 1
        self.total_reward[key] += reward

    def arm_stats(self) -> dict[str, dict]:
        """Return per-arm statistics for logging / debugging."""
        return {
            key: {
                "count": self.counts[key],
                "avg_reward": (
                    self.total_reward[key] / self.counts[key]
                    if self.counts[key]
                    else 0.0
                ),
            }
            for key in self.combo_keys
        }
