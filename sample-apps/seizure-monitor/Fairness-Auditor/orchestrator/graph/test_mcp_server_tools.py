"""
test_mcp_server_tools.py — Test invoking MCP tools on FastMCP server instance.
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

_orchestrator_dir = Path(__file__).resolve().parent.parent
if str(_orchestrator_dir) not in sys.path:
    sys.path.insert(0, str(_orchestrator_dir))

from dotenv import load_dotenv
load_dotenv(dotenv_path=_orchestrator_dir / ".env")

import mcp_server
from db import repo
from fixtures.fake_findings import FAKE_FINDINGS, FAKE_SCAN_RUN_ID
from fixtures.seed_fake_data import seed

async def main():
    print("=" * 64)
    print("  TEST: MCP Server Tools via FastMCP.call_tool()")
    print("=" * 64)

    # 1. Seed & reset findings
    seed()
    for f in FAKE_FINDINGS:
        repo.update_finding_status(f["id"], "open")
    print("[setup] Findings reset to 'open'")

    # 2. Call synthesize_and_apply_patch tool through FastMCP
    print("\n[run] Calling tool 'synthesize_and_apply_patch'...")
    res1 = await mcp_server.mcp.call_tool("synthesize_and_apply_patch", {"scan_run_id": FAKE_SCAN_RUN_ID})
    print("Result 1 (synthesize_and_apply_patch):")
    print(json.dumps(res1, indent=2, default=str))

    # 3. Call verify_patch tool through FastMCP
    print("\n[run] Calling tool 'verify_patch'...")
    res2 = await mcp_server.mcp.call_tool("verify_patch", {"scan_run_id": FAKE_SCAN_RUN_ID})
    print("Result 2 (verify_patch):")
    print(json.dumps(res2, indent=2, default=str))

    # 4. Call run_ci_gate tool through FastMCP
    print("\n[run] Calling tool 'run_ci_gate'...")
    res3 = await mcp_server.mcp.call_tool("run_ci_gate", {"scan_run_id": FAKE_SCAN_RUN_ID})
    print("Result 3 (run_ci_gate):")
    print(json.dumps(res3, indent=2, default=str))

    print("\n" + "=" * 64)
    print("  [SUCCESS] All MCP tools executed successfully through FastMCP!")
    print("=" * 64)

if __name__ == "__main__":
    asyncio.run(main())
