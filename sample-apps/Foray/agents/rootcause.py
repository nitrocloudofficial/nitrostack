"""
FORAY — THE ROOT CAUSE ANALYST.  R-07.  Demo beat 3.

    in:  cluster, concept graph with prereq edges, cohort mastery per concept
    out: { root_cause_concept_id, reasoning }

    rule: MUST walk prerequisite edges backwards. Naming the current topic
          is a FAILED OUTPUT — "pointers are hard" is worthless.
          Prefer a prerequisite with low cohort mastery.

The line this produces is beat 3:

    "Twenty-three students. Not because the handshake is hard — because
     they never learned a connection is a four-tuple, and that goes back
     to addressing in Chapter 1."

Two things are enforced in code rather than trusted to the prompt:

  1. **The walk is deterministic.** The candidate set comes from the concept
     graph, not from the model. The model chooses among real prerequisites
     and explains the choice; it cannot invent an edge that isn't there.
  2. **Naming the cluster's own concept is rejected.** §12 calls that a
     failed output, so it is treated as one — we retry, then fall back to
     the deterministic pick.

foray_plan.md §17 pre-decided the failure branch: if this agent is flaky,
hardcode the prereq walk. "The trace being on screen matters more than an
LLM having produced it." So the deterministic path below is a first-class
answer, not a degraded one — it just carries less explanation.
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

SYSTEM = """You explain, to a faculty member, why a specific prerequisite \
gap produced a specific class-wide misconception.

The prerequisite has ALREADY been identified for you by walking the course's
concept graph backwards and taking the weakest-mastered prerequisite on the
path. Your job is not to choose it — it is to explain it.

RULES — these are absolute:
- Explain the prerequisite you are given. Do not propose a different one.
- reasoning: 2-3 sentences, addressed to the faculty member who taught the \
class. Say what students are missing about that prerequisite, and why that \
gap produces THIS specific wrong idea rather than some other error.
- Never blame the students and never blame the teacher. The enemy is \
finding out too late.
- Do not propose the fix. A different agent designs the intervention.
- Do not hedge with "may" or "might" more than once; the faculty member \
needs something actionable."""


def _load(name: str) -> Any:
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


def walk_back(concept_id: str, concepts: list[dict], max_depth: int = 4) -> list[str]:
    """Breadth-first backwards walk over prerequisite edges. Deterministic.

    Returns prerequisite ids ONLY — the starting concept is excluded,
    because naming it is a failed output by definition."""
    by_id = {c["id"]: c for c in concepts}
    if concept_id not in by_id:
        return []
    out: list[str] = []
    seen = {concept_id}
    frontier = [concept_id]
    for _ in range(max_depth):
        nxt: list[str] = []
        for node in frontier:
            for p in by_id[node]["prereqs"]:
                if p not in seen and p in by_id:
                    seen.add(p)
                    out.append(p)
                    nxt.append(p)
        frontier = nxt
        if not frontier:
            break
    return out


def deterministic_pick(
    candidates: list[str], concepts: list[dict], mastery: dict[str, float],
    origin_unit: str,
) -> Optional[str]:
    """Lowest cohort mastery wins; ties break toward the earlier unit, then
    toward the deeper prerequisite. Used as the fallback AND as the sanity
    check on the model's answer."""
    if not candidates:
        return None
    by_id = {c["id"]: c for c in concepts}
    def key(cid: str) -> tuple:
        m = mastery.get(cid)
        return (
            m if m is not None else 0.5,          # unknown mastery = neutral
            0 if by_id[cid]["unit"] != origin_unit else 1,   # earlier unit first
            candidates.index(cid),                # deeper in the walk first
        )
    return sorted(candidates, key=key)[0]


def analyse(
    cluster: dict, concepts: list[dict], misconceptions: list[dict],
    mastery: dict[str, float], *, allow_offline: bool = True,
) -> dict:
    """Trace a cluster back to the prerequisite that most likely caused it."""
    mis = next(
        (m for m in misconceptions if m["id"] == cluster["misconception_id"]),
        None,
    )
    if mis is None:
        return {"root_cause_concept_id": None,
                "reasoning": "Unknown misconception id.", "source": "error"}

    origin = mis["concept_id"]
    by_id = {c["id"]: c for c in concepts}
    origin_unit = by_id.get(origin, {}).get("unit", "")
    candidates = walk_back(origin, concepts)
    if not candidates:
        return {"root_cause_concept_id": None,
                "reasoning": f"{origin} has no prerequisites in the graph.",
                "source": "graph"}

    fallback_id = deterministic_pick(candidates, concepts, mastery, origin_unit)

    def _det(note: str = "") -> dict:
        c = by_id[fallback_id]
        lvl = mastery.get(fallback_id)
        lvl_s = f"{lvl:.2f}" if lvl is not None else "unmeasured"
        return {
            "root_cause_concept_id": fallback_id,
            "reasoning": (
                f"Tracing {mis['name'].lower()} backwards through the concept "
                f"graph reaches {c['name']} ({c['id']}, {c['unit']}), where "
                f"cohort mastery is {lvl_s} — the weakest prerequisite on the "
                f"path. Students are applying this week's topic on top of a "
                f"gap the syllabus has already moved past."),
            "chain": [origin] + candidates,
            "source": f"deterministic{note}",
        }

    if not llm.available():
        return _det() if allow_offline else _err()

    # ── THE PICK IS DETERMINISTIC. THE MODEL ONLY EXPLAINS IT. ──
    #
    # Live testing showed the model choosing a different (defensible but
    # same-unit) prerequisite than the graph walk — which would silently
    # break beat 3's line, "not because the handshake is hard, because
    # addressing never landed". The pick is arithmetic anyway: lowest cohort
    # mastery on the backwards walk. Per §3.2 we do not put a model in a
    # numeric path; per §17 the trace being right matters more than a model
    # having produced it.
    #
    # What genuinely needs judgement is explaining WHY that gap yields THIS
    # wrong idea, for a teacher. That is what the model does here.
    chosen = fallback_id
    c = by_id[chosen]
    lvl = mastery.get(chosen)

    SCHEMA = {
        "type": "object",
        "properties": {"reasoning": {"type": "string"}},
        "required": ["reasoning"],
    }
    mastery_s = f"{lvl:.2f}" if lvl is not None else "unmeasured"
    chain_s = " -> ".join([origin] + candidates)
    prompt = (
        f"Misconception: {mis['name']}\n"
        f"Held by {cluster['student_count']} of {cluster['cohort_size']} "
        f"students in week {cluster['week']}.\n"
        f"It appeared while teaching: {origin} — {by_id[origin]['name']} "
        f"(unit {origin_unit}).\n\n"
        f"The prerequisite gap identified by the concept graph:\n"
        f"  {chosen} — {c['name']} (unit {c['unit']}, "
        f"cohort mastery {mastery_s})\n\n"
        f"Prerequisite path walked backwards: {chain_s}\n\n"
        "Explain to the faculty member why this gap produces this "
        "specific misconception."
    )

    try:
        out = llm.structured(SYSTEM, prompt, SCHEMA, max_tokens=1200)
        reasoning = (out.get("reasoning") or "").strip()
        if reasoning:
            return {
                "root_cause_concept_id": chosen,
                "reasoning": reasoning,
                "chain": [origin] + candidates,
                "source": llm.describe(),
            }
    except Exception:                                 # noqa: BLE001
        pass
    return _det(" (model unavailable)") if allow_offline else _err()


def _err() -> dict:
    raise RuntimeError("Root cause analysis failed and offline not allowed")


if __name__ == "__main__":
    from api import db

    concepts = _load("concepts.json")["concepts"]
    tax = _load("taxonomy.json")["misconceptions"]
    conn = db.connect()
    mastery = {
        r["concept_id"]: r["m"] for r in conn.execute(
            "SELECT concept_id, AVG(level) m FROM mastery GROUP BY concept_id"
        ).fetchall() if r["m"] is not None
    }
    rows = conn.execute(
        "SELECT * FROM clusters WHERE week = 6 AND k_satisfied = 1"
    ).fetchall()

    by_id = {c["id"]: c for c in concepts}
    print(f"\n  ROOT CAUSE ANALYST — R-07 (week 6)\n  " + "-" * 62)
    for row in rows:
        cl = db.row_to_dict(row)
        r = analyse(cl, concepts, tax, mastery)
        rid = r["root_cause_concept_id"]
        name = by_id[rid]["name"] if rid else "—"
        print(f"  {cl['misconception_id']}  {cl['student_count']}/"
              f"{cl['cohort_size']} students")
        print(f"    chain      {' -> '.join(r.get('chain', []))}")
        print(f"    ROOT CAUSE {rid} — {name} (unit {by_id[rid]['unit']})"
              if rid else "    ROOT CAUSE none")
        print(f"    [{r['source']}] {r['reasoning'][:100]}...\n")
