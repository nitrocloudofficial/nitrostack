"""
Integration test for the NitroStack PACS MCP server -- Phase 3, item 1.

Spawns the real TypeScript server as a child process over STDIO and
drives it with the real MCP client. Nothing is mocked: the point is to
prove the transport, the tool registration, and the payload contract all
line up across the language boundary, which is exactly what a mock would
paper over.

Skipped (not failed) when the server has not been built, so a fresh
checkout without `npm install` does not turn a missing optional
dependency into a red suite.
"""
from __future__ import annotations

import pytest

from medagent.integration.mcp_client import (
    PRIOR_STUDIES_TOOL,
    McpClientError,
    list_tool_names,
    mcp_session,
    query_prior_studies,
)
from medagent.utils.settings import REPO_ROOT, get_settings

DUMMY_PATIENT_ID = "P-80213-XX"


def _server_built() -> bool:
    settings = get_settings()
    from pathlib import Path

    server_dir = Path(settings.mcp_server_dir)
    if not server_dir.is_absolute():
        server_dir = REPO_ROOT.parent / server_dir
    return (server_dir / settings.mcp_server_entrypoint).is_file()


pytestmark = pytest.mark.skipif(
    not _server_built(),
    reason="MCP server not built -- run: cd mcp_server && npm install && npm run build",
)


# ── Connection and discovery ────────────────────────────────────────

@pytest.mark.asyncio
async def test_session_initializes_over_stdio():
    """The handshake itself is the thing under test: if the server wrote
    anything but JSON-RPC to stdout, initialize() would fail here."""
    async with mcp_session() as session:
        result = await session.list_tools()
        assert result.tools, "server exposed no tools at all"


@pytest.mark.asyncio
async def test_query_prior_studies_tool_is_available():
    assert PRIOR_STUDIES_TOOL in await list_tool_names()


@pytest.mark.asyncio
async def test_tool_advertises_a_patient_id_input():
    """The agent will call this by schema, so the parameter name is part
    of the contract, not an implementation detail."""
    async with mcp_session() as session:
        tools = (await session.list_tools()).tools
        tool = next(t for t in tools if t.name == PRIOR_STUDIES_TOOL)

        assert "patientId" in (tool.inputSchema.get("properties") or {})
        assert "patientId" in (tool.inputSchema.get("required") or [])
        assert tool.description


# ── Executing the tool ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_query_returns_prior_studies_for_a_known_patient():
    payload = await query_prior_studies(DUMMY_PATIENT_ID)

    assert payload["patientId"] == DUMMY_PATIENT_ID
    assert payload["studyCount"] == len(payload["studies"]) > 0

    study = payload["studies"][0]
    for field in ("studyInstanceUid", "studyDate", "modality", "viewPosition", "reportImpression"):
        assert study.get(field), f"prior study missing {field}"


@pytest.mark.asyncio
async def test_studies_are_returned_oldest_first():
    """Chronological order is what makes a prior-study list readable as a
    progression; the console renders it in the order given."""
    studies = (await query_prior_studies(DUMMY_PATIENT_ID))["studies"]
    dates = [s["studyDate"] for s in studies]
    assert dates == sorted(dates)


@pytest.mark.asyncio
async def test_simulated_data_is_marked_as_such():
    """The single most important property of this scaffold. These
    fixtures will be rendered in a clinical console beside a real
    radiograph, where invented prior history is indistinguishable from
    genuine history at a glance. The markers must survive the round trip
    across the language boundary, or a caller cannot warn the clinician."""
    payload = await query_prior_studies(DUMMY_PATIENT_ID)

    assert payload["dataSource"] == "SIMULATED"
    assert "SIMULATED" in payload["notice"].upper()
    assert all(study["simulated"] is True for study in payload["studies"])


@pytest.mark.asyncio
async def test_unknown_patient_returns_no_priors_rather_than_invented_history():
    """"Nothing on file" and "here is a past" are different clinical
    facts. A miss must return zero studies, never a fabricated set."""
    payload = await query_prior_studies("P-DOES-NOT-EXIST")

    assert payload["studyCount"] == 0
    assert payload["studies"] == []


@pytest.mark.asyncio
async def test_empty_patient_id_is_rejected_client_side():
    """Caught before spawning a server process."""
    with pytest.raises(McpClientError, match="non-empty"):
        await query_prior_studies("   ")
