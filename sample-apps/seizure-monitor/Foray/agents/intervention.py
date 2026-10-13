"""
FORAY — THE INTERVENTION DESIGNER.  Demo beat 4 (first half).

    in:  cluster, root cause, MaterialChunk[] for the root cause concept
    out: { kind, content, duration_minutes: 10 }

    rule: ten minutes, one misconception, one worked example.
          Template-driven.

This agent writes the ten-minute re-teach a faculty member actually
delivers. It is the ONLY generated thing on beat 4 — the number that
follows it (23 -> 4) is counted, never written. See core/efficacy.py.

Two constraints enforced here rather than hoped for:

  * It addresses the ROOT CAUSE concept, not the week's topic. Re-teaching
    TCP connection management to students whose real gap is addressing is
    how the six-week cycle repeats.
  * It is grounded in the same prescribed material as everything else. The
    faculty member gets a page number they can put on a slide.

foray_plan.md §17 pre-decided the failure branch: "Drop the Intervention
Designer to a static template string and keep the deterministic count. The
count is the beat. The intervention text is decoration." Hence the offline
template below is a first-class output, not a broken one.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Optional

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:                                   # pragma: no cover
    pass

from agents import llm

KINDS = ("reteach", "worked_example", "problem_set")

SYSTEM = """You write a TEN-MINUTE classroom intervention for a faculty \
member whose class holds a specific misconception.

You are given the misconception, how many students hold it, the \
prerequisite concept that actually caused it, and excerpts from the \
students' own prescribed material.

RULES — these are absolute:
- Target the ROOT CAUSE concept, not the topic that was being taught when \
the misconception surfaced. Re-teaching this week's topic is why the \
problem recurs.
- Ten minutes. Not a lecture, not a lab. One idea, one worked example.
- Ground it in the excerpts provided and reference the page. Do not \
introduce facts the excerpts do not support.
- Write TO the teacher, as a colleague: what to put on the board, what to \
ask, what a correct student answer sounds like. Not a lesson-plan template \
with headings and objectives.
- Never characterise the students as weak, careless, or behind. They were \
taught something that did not land. The enemy is finding out too late.
- content: plain prose or short numbered steps. Under 220 words.
- kind: one of reteach | worked_example | problem_set."""


def _load(name: str) -> Any:
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


def offline_design(mis: dict, root: dict, cluster: dict,
                   chunk: Optional[dict]) -> dict:
    """Deterministic template. §17's pre-agreed fallback.

    Says the true thing plainly: here is the gap, here is the worked example
    that exposes it, here is the page. A teacher can run this.
    """
    cite = (f" ({chunk['source']}, page {chunk['page']})" if chunk else "")
    return {
        "kind": "worked_example",
        "duration_minutes": 10,
        "content": (
            f"{cluster['student_count']} of {cluster['cohort_size']} students "
            f"hold: \"{mis['name']}\".\n\n"
            f"The gap is not this week's topic — it traces back to "
            f"{root['name']} ({root['id']}, unit {root['unit']}){cite}.\n\n"
            f"Ten minutes:\n"
            f"1. Put the correct idea on the board in one line — "
            f"{mis['correction_hint']}.\n"
            f"2. Work one example that only comes out right if that idea "
            f"holds, and wrong if it does not.\n"
            f"3. Ask the class to state the idea back in their own words "
            f"before moving on. If they cannot say it, they have not got it."
        ),
        "source": "offline",
        "material_id": chunk["id"] if chunk else None,
        "page": chunk["page"] if chunk else None,
    }


def design(cluster: dict, mis: dict, root: dict, chunks: list[dict],
           *, allow_offline: bool = True) -> dict:
    """Design one ten-minute intervention for a cluster."""
    from agents.grounding import rank_chunks

    ranked = rank_chunks(mis, chunks) if chunks else []
    best = ranked[0] if ranked else None

    if not llm.available():
        if allow_offline:
            return offline_design(mis, root, cluster, best)
        raise RuntimeError("No provider configured and allow_offline=False")

    SCHEMA = {
        "type": "object",
        "properties": {
            "kind": {"type": "string", "enum": list(KINDS)},
            "content": {"type": "string"},
        },
        "required": ["kind", "content"],
    }
    excerpts = "\n\n".join(
        f"[{c['id']}] ({c['source']}, page {c['page']})\n{c['text'][:800]}"
        for c in ranked[:3]
    ) or "(no excerpts available)"

    prompt = (
        f"Misconception: {mis['name']}\n"
        f"Held by {cluster['student_count']} of {cluster['cohort_size']} "
        f"students in week {cluster['week']}.\n"
        f"The correct idea: {mis['correction_hint']}\n\n"
        f"ROOT CAUSE — target this: {root['id']} — {root['name']} "
        f"(unit {root['unit']})\n\n"
        f"Excerpts from the students' prescribed material:\n\n{excerpts}\n\n"
        "Write the ten-minute intervention."
    )

    try:
        out = llm.structured(SYSTEM, prompt, SCHEMA, max_tokens=1600)
        content = (out.get("content") or "").strip()
        kind = out.get("kind") if out.get("kind") in KINDS else "reteach"
        if content:
            return {
                "kind": kind,
                "content": content,
                "duration_minutes": 10,
                "source": llm.describe(),
                "material_id": best["id"] if best else None,
                "page": best["page"] if best else None,
            }
    except Exception:                                 # noqa: BLE001
        pass
    return offline_design(mis, root, cluster, best) if allow_offline else _err()


def _err() -> dict:
    raise RuntimeError("Intervention design failed and offline not allowed")


if __name__ == "__main__":
    from api import db

    conn = db.connect()
    concepts = {c["id"]: c for c in _load("concepts.json")["concepts"]}
    tax = {m["id"]: m for m in _load("taxonomy.json")["misconceptions"]}
    chunks = json.loads(
        (ROOT / "data" / "materials" / "chunks.json").read_text(encoding="utf-8"))

    cl = db.row_to_dict(
        conn.execute("SELECT * FROM clusters WHERE id='CL_006_M12'").fetchone())
    mis = tax[cl["misconception_id"]]
    root = concepts[cl["root_cause_concept_id"]]
    rc_chunks = [c for c in chunks if root["id"] in c["concept_ids"]]

    out = design(cl, mis, root, rc_chunks)
    print(f"\n  INTERVENTION  ({out['source']})")
    print(f"  kind={out['kind']}  {out['duration_minutes']} min  "
          f"cites={out.get('material_id')} p.{out.get('page')}")
    print("  " + "-" * 62)
    for line in out["content"].splitlines():
        print(f"  {line}")
    print()
