"""Shared pytest fixtures for Agent 1 test suite."""
import pytest


@pytest.fixture
def fixed_seed() -> int:
    """Return the canonical fixed seed used across all determinism tests."""
    return 42
