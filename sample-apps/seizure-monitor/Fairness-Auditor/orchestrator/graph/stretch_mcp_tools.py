"""
STRETCH TIER — Hour 21.5-23.

These functions are ready to paste into orchestrator/mcp_server.py by Person A.
NOT integrated into a running FastMCP server on this branch, since mcp_server.py
doesn't exist here yet.

Test coverage in this file is limited to the FALLBACK PATH ONLY — the actual
Sampling/Elicitation behavior requires a live MCP client connection and MUST
be re-tested by Person A after integration into mcp_server.py.

Architecture note — why no dry_run=True on synthesize_policy():
    synthesize_policy(scan_run_id: str) -> dict is a LOCKED SIGNATURE per the
    build plan. Person A's mcp_server.py already imports it by this exact
    signature; adding dry_run=True would break that import without coordination.
    Instead, synthesize_and_apply_patch_with_approval() inlines the LLM call +
    field derivation here (~20 lines of deliberate duplication), calls
    repo.insert_mitigation_policy() ONLY after ctx.elicit() returns True.
    This avoids touching the locked signature at the cost of a small, clearly
    marked duplication. Person A: when merging, review whether to refactor this
    back into synthesize_policy() once the signature freeze is lifted.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Ensure orchestrator/ is on sys.path
_orchestrator_dir = Path(__file__).resolve().parent.parent
if str(_orchestrator_dir) not in sys.path:
    sys.path.insert(0, str(_orchestrator_dir))

from dotenv import load_dotenv
load_dotenv(dotenv_path=_orchestrator_dir / ".env")

# MCP Context — used only for type hints in these staging functions.
# This import is the ONE permitted exception for this file per the build plan.
# Do NOT add this import anywhere else in orchestrator/.
from mcp.server.fastmcp import Context

from db import repo
from graph.agent2_synthesizer import synthesize_policy, _SYSTEM_PROMPT, _build_user_message


# ---------------------------------------------------------------------------
# Stretch Tool 1: Sampling — delegate policy drafting to connected client's LLM
# ---------------------------------------------------------------------------

async def synthesize_patch_via_sampling(scan_run_id: str, ctx: Context) -> dict:
    """
    Ask the CONNECTED CLIENT's model to draft the mitigation policy via MCP
    Sampling, instead of our own Groq call. Falls back to synthesize_policy()
    if the client doesn't advertise sampling support or the call fails for
    any reason (network, schema mismatch, client-side rejection, etc.).

    Sampling path:  ctx.session.create_message(messages, max_tokens)
    Fallback path:  synthesize_policy(scan_run_id)  [Groq + DB write]

    Returns:
        On sampling success: {"source": "client_sampling", "raw_response": ...}
        On fallback:         the full synthesize_policy() return dict
                             {"source": "groq_fallback", "policy_id": ..., ...}
    """
    findings = repo.get_findings(scan_run_id)
    open_findings = [f for f in findings if f.get("status") == "open"]

    try:
        user_text = _build_user_message(sorted(open_findings, key=lambda f: f["id"]))
        result = await ctx.session.create_message(
            messages=[
                {
                    "role": "user",
                    "content": {"type": "text", "text": user_text},
                }
            ],
            max_tokens=500,
        )
        return {"source": "client_sampling", "raw_response": result}
    except Exception as e:
        print(f"[stretch] Sampling unsupported or failed ({e}), falling back to Groq")
        policy = synthesize_policy(scan_run_id)
        policy["source"] = "groq_fallback"
        return policy


# ---------------------------------------------------------------------------
# Stretch Tool 2: Elicitation — require human approval before writing to DB
# ---------------------------------------------------------------------------

async def synthesize_and_apply_patch_with_approval(scan_run_id: str, ctx: Context) -> dict:
    """
    Before hot-swapping a policy live, ask the human (via whichever MCP client
    is connected) to confirm via MCP Elicitation. Only writes to Postgres if
    the operator approves.

    DRY_RUN DESIGN NOTE (see module docstring for rationale):
        We do NOT call synthesize_policy() here because that function writes
        to Postgres immediately inside its Step 3. Instead we inline the LLM
        call + field derivation to get a draft FIRST, then only persist after
        elicitation approval. This duplicates ~20 lines intentionally to avoid
        touching the locked synthesize_policy() signature.

    Returns:
        {"status": "declined_by_operator"}  — if operator says no
        {"status": "applied", "policy": {...}}  — if operator approves
        {"status": "elicitation_error", "detail": str}  — if ctx.elicit fails
    """
    # ── Step 1: Get open findings ────────────────────────────────────────
    findings = repo.get_findings(scan_run_id)
    open_findings = [f for f in findings if f.get("status") == "open"]

    if not open_findings:
        return {
            "status": "no_open_findings",
            "detail": f"No open findings for scan_run_id={scan_run_id}",
        }

    # ── Step 2: Draft policy inline via Groq (NO DB WRITE YET) ──────────
    # Deliberate duplication of _call_llm logic — see module docstring.
    from groq import Groq

    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not groq_key:
        raise RuntimeError("GROQ_API_KEY is not set in orchestrator/.env.")

    client = Groq(api_key=groq_key)
    model_name = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    user_msg = _build_user_message(sorted(open_findings, key=lambda f: f["id"]))
    completion = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content.strip()
    llm_out = json.loads(raw)

    redact_fields = sorted(set(llm_out.get("redact_fields", [])))
    neutral_value = llm_out.get("neutral_value", "REDACTED")
    group_adjustments = llm_out.get("group_adjustments", {})
    rationale = llm_out.get("rationale", "")

    policy_draft = {
        "redact_fields": redact_fields,
        "neutral_value": neutral_value,
        "group_adjustments": group_adjustments,
        "rationale": rationale,
    }

    # ── Step 3: Elicit operator approval ─────────────────────────────────
    try:
        approved = await ctx.elicit(
            message=(
                f"Apply mitigation policy for scan {scan_run_id}?\n"
                f"Redacts: {redact_fields}\n"
                f"Rationale: {rationale}"
            ),
            schema={"type": "boolean"},
        )
    except Exception as e:
        return {"status": "elicitation_error", "detail": str(e)}

    if not approved:
        return {"status": "declined_by_operator"}

    # ── Step 4: Operator approved — write to Postgres now ────────────────
    policy = repo.insert_mitigation_policy(
        scan_run_id=scan_run_id,
        redact_fields=redact_fields,
        neutral_value=neutral_value,
        group_adjustments=group_adjustments,
        rationale=rationale,
    )

    # Mark findings resolved
    for f in open_findings:
        repo.update_finding_status(f["id"], "resolved")

    return {"status": "applied", "policy": policy}
