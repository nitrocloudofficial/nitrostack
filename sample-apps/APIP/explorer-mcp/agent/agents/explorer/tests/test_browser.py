"""Unit tests for BrowserController lifecycle and ActionExecutor."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from agents.explorer.config import ExplorerConfig
from agents.explorer.browser.browser_controller import BrowserController
from agents.explorer.browser.action_executor import ActionExecutor
from agents.explorer.models.action import ActionTarget, ActionType


@pytest.mark.asyncio
async def test_browser_controller_unit():
    config = ExplorerConfig(headless=True)
    controller = BrowserController(config)
    assert controller.is_authenticated is False


@pytest.mark.asyncio
async def test_action_executor_mocked():
    mock_page = MagicMock()
    mock_page.url = "http://localhost/test"
    mock_locator = AsyncMock()
    mock_page.locator.return_value.first = mock_locator

    mock_controller = MagicMock()
    mock_controller.page = mock_page
    mock_controller.config.action_timeout_ms = 1000

    executor = ActionExecutor(mock_controller)
    action = ActionTarget(action_type=ActionType.CLICK, css_selector="button#mock")

    result = await executor.execute(action)
    assert result.success is True
    assert result.execution_time_ms >= 0.0
    mock_locator.click.assert_called_once()
