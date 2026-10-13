"""
RemitWise AI – Base Planner Abstract Interface
===============================================
Defines the contract that all planning implementations (RuleBasedPlanner, LLMPlanner)
must fulfill.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict, Optional

from agents.shared.schemas import ExecutionPlan


class BasePlanner(ABC):
    """
    Abstract interface for multi-agent intent planning.

    Given a natural language query and optional context overrides,
    a planner must return an ``ExecutionPlan`` specifying which agents
    should run, in what order, and with what extracted parameters.
    """

    @abstractmethod
    def plan(
        self,
        query: str,
        context_override: Optional[Dict] = None,
    ) -> ExecutionPlan:
        """
        Analyze user query and return an ExecutionPlan.

        Parameters
        ----------
        query : str
            Raw natural language user query.
        context_override : dict, optional
            Explicit context overrides (base_currency, target_currency, amount, from_country, to_country).

        Returns
        -------
        ExecutionPlan
        """
        pass
