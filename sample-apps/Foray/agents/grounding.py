"""
FORAY — THE GROUNDING VERIFIER.  R-02.  Demo beat 2.

    in:  misconception_id, correction_hint, MaterialChunk[]
    out: { grounded, material_ids, text, retrieval_question }

    rule: grounded=False -> NO correction is sent, ever. Escalate to faculty
          as an open question. NEVER assert without a citation.
          material_ids must be non-empty whenever grounded is True.

  ██  THIS IS A GATE, NOT A GUIDELINE.  ██

The pitch line is "it structurally cannot assert something it cannot cite."
That is only true if the gate is enforced in code, so it is:

  * `material_ids` must be non-empty when grounded — otherwise we force
    escalation regardless of what the model said.
  * every cited id must be one of the chunks we actually passed in. A model
    citing MAT_9999 has invented a source, which is worse than refusing.
  * zero candidate chunks -> escalate without calling the model at all.
    That is beat 2: ask about something outside the unit, watch it refuse.

foray_plan.md §17 pre-decided the failure mode: "Ship it as escalate-by-
default. The gate existing matters more than it firing often." So every
uncertain path here escalates rather than guesses.
"""

from __future__ import annotations

import json
import os
import re
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

SYSTEM = """You write a short correction for a student, grounded ONLY in \
their own prescribed course material.

You will be given a named misconception, a hint about the correct idea, and \
numbered excerpts from the student's textbook.

RULES — these are absolute:
- You may ONLY assert what the excerpts support. If the excerpts do not \
actually address the misconception, set grounded=false. Do not stretch a \
loosely-related excerpt into a citation.
- When grounded=true, material_ids MUST list the excerpt id(s) you used, \
copied exactly from the ids given to you. Never invent an id.
- When grounded=false, leave material_ids empty and explain in `text` what a \
faculty member would need to clarify. This becomes an open question routed \
to the teacher, NOT a correction sent to the student.
- Address the specific wrong idea. Do not lecture on the whole topic.
- Never say "incorrect", "wrong", or "you failed". Name the idea and give \
the accurate one. Confusion is never punished here.
- Keep `text` under 70 words. The student has 90 seconds.
- retrieval_question: ONE short question that would reveal whether the \
correction actually landed. Not a quiz, not graded.

Refusing is a correct, valued outcome. An ungrounded correction is a defect; \
an escalation is the system working."""

STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "of", "to", "in", "on", "by", "it",
    "that", "this", "and", "or", "for", "with", "as", "at", "be", "not",
    "its", "from", "which", "each", "only", "than", "but", "can", "does",
}


def _words(s: str) -> set[str]:
    return {w for w in re.findall(r"[a-z]{3,}", (s or "").lower())
            if w not in STOPWORDS}


def _escalate(reason: str, source: str) -> dict:
    """The safe default. Every uncertain path lands here."""
    return {
        "grounded": False,
        "material_ids": [],
        "text": reason,
        "retrieval_question": "",
        "status": "escalated_to_faculty",
        "source": source,
    }


def _enforce(out: dict, allowed_ids: set[str], source: str) -> dict:
    """Apply R-02 in code. A model that says grounded=True without a valid
    citation gets overruled — the gate is not advisory."""
    if not out.get("grounded"):
        return _escalate(
            out.get("text") or "Not addressed by the prescribed material.",
            source,
        )

    cited = [m for m in out.get("material_ids", []) if m in allowed_ids]
    invented = [m for m in out.get("material_ids", []) if m not in allowed_ids]
    if invented:
        return _escalate(
            f"Escalated: the verifier cited material that was not provided "
            f"({', '.join(invented)}). Not sent.", source)
    if not cited:
        return _escalate(
            "Escalated: claimed grounding with no citation. Not sent.", source)
    if not (out.get("text") or "").strip():
        return _escalate("Escalated: empty correction text.", source)

    return {
        "grounded": True,
        "material_ids": cited,
        "text": out["text"].strip(),
        "retrieval_question": (out.get("retrieval_question") or "").strip(),
        "status": "sent",
        "source": source,
    }


# ═══════════════════════════════════════════════════════════════════
#  OFFLINE — deterministic. Escalate-by-default (§17).
# ═══════════════════════════════════════════════════════════════════

MIN_OVERLAP = 3      # distinct content words shared with the correction hint


def rank_chunks(misconception: dict, chunks: list[dict]) -> list[dict]:
    """Most-relevant first, by content-word overlap with the misconception.

    Deterministic and used by BOTH paths — offline picks the top one, live
    passes the top few to the model. Still no embeddings (§9); this is a
    set intersection over hand-tagged chunks.
    """
    target = _words(misconception.get("correction_hint", "")) | _words(
        misconception.get("name", ""))
    if not target:
        return list(chunks)
    return sorted(
        chunks,
        key=lambda c: (-len(target & _words(c["text"])), c["id"]),
    )


def offline_verify(misconception: dict, chunks: list[dict]) -> dict:
    """Pick the chunk sharing the most content words with the correction hint.

    Below MIN_OVERLAP we escalate rather than cite something tenuous. This
    is deliberately conservative: a weak citation on stage is worse than an
    honest escalation, and §17 already decided escalate-by-default.
    """
    hint = _words(misconception.get("correction_hint", ""))
    name = _words(misconception.get("name", ""))
    target = hint | name
    if not chunks or not target:
        return _escalate(
            "No prescribed material is tagged for this concept, so no "
            "correction can be grounded. Routed to faculty as an open "
            "question.", "offline")

    ranked = rank_chunks(misconception, chunks)
    best = ranked[0] if ranked else None
    best_score = len(target & _words(best["text"])) if best else 0

    if best is None or best_score < MIN_OVERLAP:
        return _escalate(
            "The prescribed material does not clearly address this "
            "misconception. Routed to faculty as an open question rather "
            "than sending an unsupported correction.", "offline")

    return {
        "grounded": True,
        "material_ids": [best["id"]],
        "text": (f"{misconception['correction_hint'].capitalize()}. "
                 f"See {best['source']}, page {best['page']}."),
        "retrieval_question": f"In your own words: {misconception['correction_hint']}?",
        "status": "sent",
        "source": "offline",
        "page": best["page"],
    }


# ═══════════════════════════════════════════════════════════════════
#  LIVE
# ═══════════════════════════════════════════════════════════════════

def verify(misconception: dict, chunks: list[dict], *,
           allow_offline: bool = True) -> dict:
    """Decide whether a grounded correction can be sent. R-02."""
    # Beat 2: nothing tagged for this concept -> refuse before any model call.
    if not chunks:
        return _escalate(
            "No prescribed course material covers this. The system will not "
            "assert something it cannot cite, so this is routed to the "
            "faculty member as an open question.", "gate")

    if not llm.available():
        if allow_offline:
            return offline_verify(misconception, chunks)
        raise RuntimeError("No API key and allow_offline=False")

    SCHEMA = {
        "type": "object",
        "properties": {
            "grounded": {"type": "boolean"},
            "material_ids": {"type": "array", "items": {"type": "string"}},
            "text": {"type": "string"},
            "retrieval_question": {"type": "string"},
        },
        "required": ["grounded", "material_ids", "text", "retrieval_question"],
    }

    # Cap the excerpt set: §9 expects 2-5, but keyword tagging can return
    # 60+. Passing them all buries the relevant one.
    #
    # RANK FIRST. Slicing chunks[:6] takes the lowest MAT_ ids, which is
    # effectively "earliest page in the book" — for C11 that is Chapter 2
    # application-layer text that says nothing about four-tuples, so the
    # verifier correctly refused EVERY correction and beat 1 never showed a
    # citation. Live mode surfaced this; offline hid it, because the offline
    # matcher already ranked by overlap.
    use = rank_chunks(misconception, chunks)[:6]
    allowed = {c["id"] for c in use}
    excerpts = "\n\n".join(
        f"[{c['id']}] ({c['source']}, page {c['page']})\n{c['text'][:900]}"
        for c in use
    )
    prompt = (
        f"Misconception: {misconception['name']}\n"
        f"Correct idea (hint): {misconception['correction_hint']}\n\n"
        f"Excerpts from the student's prescribed material:\n\n{excerpts}\n\n"
        "Can this misconception be corrected using ONLY these excerpts?"
    )

    try:
        out = _enforce(llm.structured(SYSTEM, prompt, SCHEMA, max_tokens=1200),
                       allowed, llm.describe())
    except Exception as e:                            # noqa: BLE001
        if allow_offline:
            out = offline_verify(misconception, chunks)
            out["source"] = f"offline-after-failure ({type(e).__name__})"
        else:
            raise

    # attach the printed page for the UI citation
    if out["grounded"] and out["material_ids"]:
        cited = next((c for c in chunks if c["id"] == out["material_ids"][0]), None)
        if cited:
            out["page"] = cited["page"]
            out["citation"] = f"{cited['source']}, page {cited['page']}"
    return out


if __name__ == "__main__":
    tax = {m["id"]: m for m in json.loads(
        (ROOT / "data" / "taxonomy.json").read_text(encoding="utf-8")
    )["misconceptions"]}
    chunks = json.loads(
        (ROOT / "data" / "materials" / "chunks.json").read_text(encoding="utf-8"))

    def for_concept(cid: str) -> list[dict]:
        return [c for c in chunks if cid in c["concept_ids"]]

    print(f"\n  GROUNDING VERIFIER — R-02\n  " + "-" * 62)
    for mid in ("M12", "M17", "M11"):
        m = tax[mid]
        r = verify(m, for_concept(m["concept_id"]))
        mark = "SENT     " if r["grounded"] else "ESCALATED"
        print(f"  [{mark}] {mid} {m['name'][:40]}")
        if r["grounded"]:
            print(f"             cite {r['material_ids']} p.{r.get('page')}  [{r['source']}]")
        else:
            print(f"             {r['text'][:66]}...  [{r['source']}]")

    print("\n  BEAT 2 — a concept with no prescribed material:")
    r = verify({"id": "M99", "name": "Something outside the unit",
                "correction_hint": "not in this course"}, [])
    print(f"  [{'SENT' if r['grounded'] else 'ESCALATED'}] status={r['status']}")
    print(f"             {r['text'][:70]}...\n")
