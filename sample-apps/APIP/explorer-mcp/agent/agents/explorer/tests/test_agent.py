"""Integration and scaffolding unit tests for ExplorerAgent coordinator."""

import pytest
from unittest.mock import AsyncMock, MagicMock, PropertyMock
from pathlib import Path

from agents.explorer.agent import ExplorerAgent
from agents.explorer.config import ExplorerConfig
from agents.explorer.models.exploration_result import ExplorationResult
from agents.explorer.models.page import PageNode


@pytest.mark.asyncio
async def test_agent_initialization(tmp_path: Path):
    config = ExplorerConfig(output_dir=tmp_path / "out", max_actions=5)
    agent = ExplorerAgent(config)
    assert agent.exploration_id.startswith("exp_")
    assert agent.config.max_actions == 5


@pytest.mark.asyncio
async def test_agent_orchestration_mocked(tmp_path: Path):
    config = ExplorerConfig(target_url="http://localhost:8000", output_dir=tmp_path / "out", max_actions=1)
    agent = ExplorerAgent(config)

    # Mock browser and dom analyzer for fast isolated testing
    agent.browser.start = AsyncMock()
    agent.browser.stop = AsyncMock()
    agent.browser.navigate_to = AsyncMock(return_value="http://localhost:8000")
    agent.browser.authenticate_if_required = AsyncMock(return_value=False)
    
    mock_page_obj = MagicMock()
    mock_page_obj.url = "http://localhost:8000"
    type(agent.browser).page = PropertyMock(return_value=mock_page_obj)

    mock_page = PageNode(page_id="p1", url="http://localhost:8000", title="Test Page")
    agent.dom_analyzer.extract_page_node = AsyncMock(return_value=mock_page)
    agent.form_analyzer.extract_forms = AsyncMock(return_value=[])

    result = await agent.explore()
    assert isinstance(result, ExplorationResult)
    assert result.summary.target_url == "http://localhost:8000"
    assert (tmp_path / "out" / "ExplorationResult.json").exists()
