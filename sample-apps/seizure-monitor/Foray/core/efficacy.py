"""
DETERMINISTIC. NO LLM CALLS IN THIS FILE. EVER.

  ██  THIS FILE PRODUCES THE CROWN-JEWEL NUMBER.  ██

Beat 4 is "23 → 4, cleared", and it is the line the judges remember. It is
a count of the same misconception ID before and after an intervention.
Nothing here is generated, inferred, summarised or estimated.

If anyone proposes making this "smarter", the answer is no. The whole
value of the number is that it cannot have been made up.
"""

from __future__ import annotations

import sqlite3

from core.clustering import count_misconception


def measure(
    conn: sqlite3.Connection,
    misconception_id: str,
    before_week: int,
    after_week: int,
) -> dict:
    """
    Count the same ID before and after. That is the whole method.

    `cleared` is a strict decrease — not a threshold, not a percentage, not
    a judgement call. If the count did not go down, the intervention did
    not work, and we report that. A verification loop that can only
    report success is not a verification loop.
    """
    before = count_misconception(conn, misconception_id, before_week)
    after = count_misconception(conn, misconception_id, after_week)
    return {
        "checked_week": after_week,
        "before_count": before,
        "after_count": after,
        "cleared": after < before,
    }


def attach(
    conn: sqlite3.Connection, intervention_id: str, efficacy: dict
) -> None:
    import json
    conn.execute(
        "UPDATE interventions SET efficacy = ? WHERE id = ?",
        (json.dumps(efficacy), intervention_id),
    )
    conn.commit()
