"""
FORAY — COMPASS.  R-09.  Demo beat 5.

    in:  MasteryState[] for one student, concept graph
    out: CompassItem[]  (max 3)

    rule: every item MUST cite the reflection ID that evidences the gap.
          No evidence → no item. Never asks the student what they're
          interested in as the sole input.

The pitch line:

    "Every other roadmap tool asks what you want to do. This one knows what
     you actually understand — and every item cites the evidence."

That claim is only true if "no evidence, no item" is enforced, so it is:
an item is assembled from a reflection id that exists in the database, and
any item that loses its evidence is dropped before it reaches the student.
Same shape as the R-02 gate in grounding.py — the interesting part of this
system is consistently the refusals.

Selection is DETERMINISTIC (weakest demonstrated concepts that have
evidence). The model writes the `why` and `action` prose. Same split as
rootcause.py, and for the same reason: ranking mastery numbers is
arithmetic, and §3.2 says we do not put a model in a numeric path.
"""

from __future__ import annotations

import json
import sqlite3
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

MAX_ITEMS = 3
MASTERY_CEILING = 0.75      # above this the student has demonstrated it

SYSTEM = """You write one line of a student's learning roadmap.

You are given a concept the student has demonstrably not mastered, the \
evidence for that (their own words, from their own reflection), and where \
the concept sits in the course.

RULES — these are absolute:
- `why` explains the gap by pointing at what the student actually wrote. \
Address them as "you". One or two sentences.
- Never say they are behind, weak, failing, or struggling. They wrote \
something honest and it is being used to help them. Confusion is never \
punished here.
- `action` is ONE concrete next step they could do in under thirty \
minutes. Not "review the chapter" — say what to do and what would show it \
worked.
- Do not invent evidence. You are given the quote; do not embellish it or \
claim they said anything else.
- No preamble, no encouragement padding, no exclamation marks."""


def _load(name: str) -> Any:
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


def gaps_with_evidence(conn: sqlite3.Connection, student_id: str,
                       course: str | None = None) -> list[dict]:
    """Weakest concepts that have a REFLECTION backing them.

    The join is the whole point: a low mastery number with no reflection
    behind it cannot become a Compass item, because there would be nothing
    to cite. Deterministic — no model involved in choosing.

    `course` scopes it to one subject. A student taking six subjects has one
    roadmap PER subject; mixing them would rank a Compiler Design gap
    against a Computer Networks one, which means nothing to the student.
    """
    rows = conn.execute(
        """
        SELECT m.concept_id, m.level, c.name AS concept_name, c.unit,
               r.id  AS reflection_id, r.text AS reflection_text, r.week,
               d.misconception_ids
        FROM mastery m
        JOIN concepts c   ON c.id = m.concept_id
        JOIN reflections r ON r.student_id = m.student_id
                          AND r.concept_ids LIKE '%' || m.concept_id || '%'
        LEFT JOIN diagnoses d ON d.reflection_id = r.id
        WHERE m.student_id = ? AND m.level < ?
          AND (? IS NULL OR c.course = ?)
        ORDER BY m.level ASC, r.week DESC
        """,
        (student_id, MASTERY_CEILING, course, course),
    ).fetchall()

    seen: set[str] = set()
    out: list[dict] = []
    for r in rows:
        cid = r["concept_id"]
        if cid in seen:
            continue
        seen.add(cid)
        mids = json.loads(r["misconception_ids"]) if r["misconception_ids"] else []
        out.append({
            "concept_id": cid,
            "concept_name": r["concept_name"],
            "unit": r["unit"],
            "level": round(r["level"], 3),
            "reflection_id": r["reflection_id"],
            "reflection_text": r["reflection_text"],
            "week": r["week"],
            "misconception_ids": mids,
        })
        if len(out) >= MAX_ITEMS:
            break
    return out


def _offline_item(gap: dict, mis: Optional[dict]) -> dict:
    name = mis["name"].lower() if mis else f"your work on {gap['concept_name'].lower()}"
    hint = mis["correction_hint"] if mis else None
    return {
        "why": (f"In week {gap['week']} you wrote about "
                f"{gap['concept_name'].lower()}, and that explanation showed "
                f"{name}. It is the weakest evidence you have left on this "
                f"concept."),
        "action": (f"Re-explain {gap['concept_name'].lower()} in your own "
                   f"words in ninety seconds"
                   + (f", making sure you account for: {hint}." if hint else ".")
                   + " If you can say it without hedging, the gap has closed."),
    }


def build(conn: sqlite3.Connection, student_id: str,
          *, course: str | None = None, allow_offline: bool = True) -> list[dict]:
    """CompassItem[] for one student, in one subject. Max 3.
    Every item cites a reflection."""
    from agents.diagnostician import all_misconceptions
    tax = {m["id"]: m for m in all_misconceptions()}
    gaps = gaps_with_evidence(conn, student_id, course)

    items: list[dict] = []
    for priority, gap in enumerate(gaps, start=1):
        mis = tax.get(gap["misconception_ids"][0]) if gap["misconception_ids"] else None

        prose, source = None, "deterministic"
        if llm.available():
            SCHEMA = {
                "type": "object",
                "properties": {"why": {"type": "string"},
                               "action": {"type": "string"}},
                "required": ["why", "action"],
            }
            prompt = (
                f"Concept not yet mastered: {gap['concept_name']} "
                f"({gap['concept_id']}, unit {gap['unit']})\n"
                f"Demonstrated mastery: {gap['level']} out of 1.0\n"
                + (f"Named misconception: {mis['name']}\n"
                   f"The correct idea: {mis['correction_hint']}\n" if mis else "")
                + f"\nWhat the student wrote in week {gap['week']} "
                  f"(reflection {gap['reflection_id']}):\n"
                  f"\"{gap['reflection_text']}\"\n\n"
                "Write the roadmap line."
            )
            try:
                out = llm.structured(SYSTEM, prompt, SCHEMA, max_tokens=1200)
                if (out.get("why") or "").strip() and (out.get("action") or "").strip():
                    prose, source = out, llm.describe()
            except Exception:                         # noqa: BLE001
                pass

        if prose is None:
            if not allow_offline:
                continue
            prose = _offline_item(gap, mis)

        item = {
            "student_id": student_id,
            "gap_concept_id": gap["concept_id"],
            "gap_concept_name": gap["concept_name"],
            "unit": gap["unit"],
            "level": gap["level"],
            "evidence_reflection_ids": [gap["reflection_id"]],
            "evidence_text": gap["reflection_text"],
            "misconception_ids": gap["misconception_ids"],
            "why": prose["why"].strip(),
            "action": prose["action"].strip(),
            "priority": priority,
            "source": source,
        }

        # ── THE R-09 GATE. No evidence, no item. ──
        if not item["evidence_reflection_ids"] or not item["evidence_text"]:
            continue
        items.append(item)

    return items


if __name__ == "__main__":
    from api import db

    conn = db.connect()
    # pick a student who actually has gaps, so the demo shows something
    row = conn.execute(
        "SELECT student_id, COUNT(*) n FROM mastery WHERE level < 0.6 "
        "GROUP BY student_id ORDER BY n DESC LIMIT 1"
    ).fetchone()
    sid = row["student_id"]

    items = build(conn, sid)
    print(f"\n  COMPASS — {sid}   ({len(items)} items, R-09)\n  " + "-" * 62)
    for it in items:
        print(f"  {it['priority']}. {it['gap_concept_id']} {it['gap_concept_name']} "
              f"(unit {it['unit']}, mastery {it['level']})  [{it['source']}]")
        print(f"     why    : {it['why'][:120]}")
        print(f"     action : {it['action'][:120]}")
        print(f"     EVIDENCE {it['evidence_reflection_ids'][0]}: "
              f"\"{it['evidence_text'][:80]}\"")
        print()
