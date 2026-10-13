"""Unit tests for orchestrator/track_a/bandit_scheduler.py.

Covers:
  - UCB1 exploration phase (every arm pulled before exploitation)
  - Exploitation towards higher-reward arms
  - Arm statistics tracking
  - Error handling for unknown keys
"""
import pytest
from orchestrator.track_a.bandit_scheduler import UCB1Scheduler


class TestUCB1Scheduler:
    def test_ucb1_explores_every_arm_before_exploiting(self):
        """Each arm must be selected at least once during the initial exploration phase.

        In real usage select() is always followed by update() — the scheduler
        only moves past an arm once its count is non-zero.  We simulate that
        here by calling update() with a neutral reward after each select().
        """
        keys = ["a", "b", "c"]
        scheduler = UCB1Scheduler(keys)
        explored = set()
        for _ in range(3):
            key = scheduler.select()
            explored.add(key)
            scheduler.update(key, reward=0.5)  # must update so count increments
        assert explored == set(keys)

    def test_ucb1_prioritises_higher_reward_arm(self):
        """After seeding, the arm with higher reward should be preferred."""
        scheduler = UCB1Scheduler(["low", "high"])
        # Force-explore both arms first
        scheduler.select()  # low (or high — order not guaranteed)
        scheduler.select()  # the other
        # Now seed rewards manually
        scheduler.update("low", reward=0.01)
        scheduler.update("high", reward=0.9)
        # With high exploration c, UCB1 still eventually exploits high reward
        # Run many steps and check high is selected at least as often
        selected_keys = [scheduler.select() for _ in range(20)]
        high_count = selected_keys.count("high")
        low_count = selected_keys.count("low")
        assert high_count >= low_count, (
            f"Expected high ({high_count}) >= low ({low_count}) selections"
        )

    def test_counts_increment_on_update(self):
        scheduler = UCB1Scheduler(["x", "y"])
        # explore
        scheduler.select()
        scheduler.select()
        scheduler.update("x", 0.5)
        scheduler.update("x", 0.5)
        assert scheduler.counts["x"] == 2

    def test_total_reward_accumulates(self):
        scheduler = UCB1Scheduler(["x"])
        scheduler.select()
        scheduler.update("x", 0.3)
        scheduler.update("x", 0.7)
        assert scheduler.total_reward["x"] == pytest.approx(1.0)

    def test_t_increments_on_select(self):
        scheduler = UCB1Scheduler(["a", "b"])
        assert scheduler.t == 0
        scheduler.select()
        assert scheduler.t == 1
        scheduler.select()
        assert scheduler.t == 2

    def test_arm_stats_returns_all_keys(self):
        scheduler = UCB1Scheduler(["a", "b", "c"])
        stats = scheduler.arm_stats()
        assert set(stats.keys()) == {"a", "b", "c"}

    def test_arm_stats_avg_reward_before_any_pulls(self):
        scheduler = UCB1Scheduler(["a"])
        stats = scheduler.arm_stats()
        assert stats["a"]["avg_reward"] == 0.0

    def test_update_unknown_key_raises_key_error(self):
        scheduler = UCB1Scheduler(["a", "b"])
        with pytest.raises(KeyError):
            scheduler.update("nonexistent", 0.5)

    def test_empty_keys_raises_value_error(self):
        with pytest.raises(ValueError):
            UCB1Scheduler([])

    def test_single_arm_always_selected(self):
        scheduler = UCB1Scheduler(["only"])
        for _ in range(5):
            assert scheduler.select() == "only"
