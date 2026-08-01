"""
MCP client for the NitroStack PACS server -- Phase 3, item 1.

Speaks MCP over STDIO to the TypeScript server in `mcp_server/`, which
exposes prior-imaging lookup as the `query_prior_studies` tool. This is
the seam that will eventually fill the console's empty "Prior Studies"
panel.

Two things about the transport shape the code here:

- **The server is a child process, not a service.** stdio_client spawns
  it, owns its lifetime, and tears it down when the context manager
  exits. There is no port, nothing to leave running, and no shared state
  between calls -- which is why `query_prior_studies()` below opens and
  closes a session per call rather than holding one open. For a lookup
  measured in milliseconds that trade is worth the isolation; if this
  ever sits in a hot path, hoist the session with `mcp_session()`.

- **stdout is the protocol.** Anything the server prints to stdout that
  is not a JSON-RPC frame corrupts the stream. That constraint lives on
  the TypeScript side (see pacs.tools.ts), but it is why this module
  never redirects or merges the child's streams: its stderr is left
  alone so server logs stay readable and separate.

Nothing here raises into a graph node. Failures surface as
McpClientError, and callers are expected to degrade -- a PACS being
unreachable is a missing convenience, not a reason to halt a case.
"""
from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from datetime import timedelta
from pathlib import Path
from typing import Any, AsyncIterator

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from medagent.utils.settings import REPO_ROOT, get_settings

logger = logging.getLogger("medagent.integration.mcp")

PRIOR_STUDIES_TOOL = "query_prior_studies"


class McpClientError(Exception):
    """Raised when the MCP server cannot be reached, or answers with
    something unusable.

    Deliberately a plain exception rather than one of the project's
    fail-closed security errors: prior imaging is supplementary context,
    so a caller should catch this and continue without priors rather
    than halt the case. Contrast with SecurityError in
    rag/vectorstore.py, which must halt."""


def _server_parameters() -> StdioServerParameters:
    """
    Builds the child-process spec from settings.

    Resolves the server directory against the repo root rather than the
    process working directory: the API server, pytest, and a CLI run all
    start from different places, and a relative path would silently
    resolve to a different (missing) directory in each.
    """
    settings = get_settings()

    server_dir = Path(settings.mcp_server_dir)
    if not server_dir.is_absolute():
        server_dir = REPO_ROOT.parent / server_dir

    entrypoint = Path(settings.mcp_server_entrypoint)
    if not entrypoint.is_absolute():
        entrypoint = server_dir / entrypoint

    if not entrypoint.is_file():
        raise McpClientError(
            f"MCP server entrypoint not found at {entrypoint}. Build it first:\n"
            f"    cd {server_dir} && npm install && npm run build"
        )

    return StdioServerParameters(
        command=settings.mcp_server_command,
        args=[str(entrypoint)],
        cwd=str(server_dir),
    )


@asynccontextmanager
async def mcp_session() -> AsyncIterator[ClientSession]:
    """
    Opens an initialized MCP session against the PACS server.

    Use directly when making several calls; the module-level helpers
    below wrap this for one-shot use.

        async with mcp_session() as session:
            tools = await session.list_tools()
    """
    params = _server_parameters()
    logger.info("Starting MCP server: %s %s (cwd=%s)", params.command, params.args, params.cwd)

    try:
        async with stdio_client(params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                logger.info("MCP session initialized")
                yield session
    except McpClientError:
        raise
    except Exception as exc:  # noqa: BLE001 - transport failures are one thing to the caller
        raise McpClientError(
            f"MCP session failed: {type(exc).__name__}: {exc}"
        ) from exc


async def list_tool_names() -> list[str]:
    """Names of every tool the server exposes."""
    async with mcp_session() as session:
        result = await session.list_tools()
        return [tool.name for tool in result.tools]


def _unwrap(result: Any) -> dict:
    """
    Extracts the tool's structured payload from an MCP CallToolResult.

    MCP returns content blocks, so the JSON body arrives as text that
    needs parsing. `structuredContent` is preferred when the server
    provides it; the text block is the fallback. Both paths are handled
    because which one is populated depends on the server's output schema,
    and relying on only one makes this brittle to a server-side change
    that is otherwise none of this module's business.
    """
    if getattr(result, "isError", False):
        raise McpClientError(f"MCP tool reported an error: {result}")

    structured = getattr(result, "structuredContent", None)
    if isinstance(structured, dict):
        # Servers may nest the payload under "result" when the tool
        # returns a non-object; unwrap that one level if present.
        return structured.get("result", structured) if len(structured) == 1 and "result" in structured else structured

    for block in getattr(result, "content", []) or []:
        text = getattr(block, "text", None)
        if not text:
            continue
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            continue

    raise McpClientError(f"MCP tool returned no parseable JSON payload: {result}")


async def query_prior_studies(patient_id: str) -> dict:
    """
    Fetches a patient's prior imaging studies from the PACS server.

    Returns the tool's payload: `patientId`, `studies`, `studyCount`, and
    -- while the server is backed by fixtures -- `dataSource: "SIMULATED"`
    plus a `notice`. Callers rendering these to a clinician MUST surface
    that marker; fabricated prior history shown beside a real study is
    indistinguishable from genuine history at a glance.

    Raises McpClientError if the server is unreachable or the payload is
    unusable. Callers should degrade to "no priors available" rather than
    failing the case.
    """
    if not patient_id or not patient_id.strip():
        raise McpClientError("query_prior_studies() requires a non-empty patient_id")

    settings = get_settings()
    async with mcp_session() as session:
        logger.info("Querying prior studies for patient_id=%s", patient_id)
        result = await session.call_tool(
            PRIOR_STUDIES_TOOL,
            {"patientId": patient_id.strip()},
            read_timeout_seconds=timedelta(seconds=settings.mcp_timeout_seconds),
        )

    payload = _unwrap(result)
    logger.info(
        "PACS returned %s prior study/studies for %s (dataSource=%s)",
        payload.get("studyCount"), patient_id, payload.get("dataSource"),
    )
    return payload


if __name__ == "__main__":
    import asyncio
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    requested_id = sys.argv[1] if len(sys.argv) > 1 else "P-80213-XX"

    async def _main() -> int:
        try:
            print("Tools:", await list_tool_names())
            payload = await query_prior_studies(requested_id)
        except McpClientError as exc:
            print(f"\nMCP client error: {exc}", file=sys.stderr)
            return 1

        print(f"\nPatient {payload['patientId']} -- {payload['studyCount']} prior study/studies "
              f"[{payload.get('dataSource')}]")
        for study in payload.get("studies", []):
            print(f"  {study['studyDate']}  {study['modality']}/{study['viewPosition']}  "
                  f"{study['reportImpression'][:70]}")
        return 0

    raise SystemExit(asyncio.run(_main()))
