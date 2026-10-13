"""
FORAY — THE ELICITOR, conversational form.  Demo surface: the student chat.

    in:  recent conversation turns, the per-message analysis (topic tagger +
         Diagnostician verdict), and — when one exists — a correction the
         Grounding Verifier has ALREADY approved.
    out: { reply, source }

    rule: the Elicitor DRAWS OUT the student's own explanation. It never
          grades, never says "wrong", and NEVER asserts a correction the
          Grounding Verifier did not approve. If the correction was
          escalated, the Elicitor says so — it does not freelance one.

The R-02 gate stays where it always was: in agents/grounding.py, upstream
of this file. The Elicitor is handed either an approved, cited correction
or nothing. That means a prompt-injected or hallucinating model here can
phrase things badly, but it cannot invent a citation — the caller composes
what it is allowed to claim.

Offline path: templated replies from the same inputs. Honest and boring,
reported as source="offline" like every other agent.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Optional

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from agents import llm

SYSTEM = """You are the Elicitor in a reflection system for a university \
Computer Networks course. A student talks to you about what they learned. \
You draw out their understanding in their own words.

RULES — these are absolute:
- Never grade, never score, never say "wrong", "incorrect" or "you failed".
- Keep replies under 90 words. Warm, specific, plain language.
- End with EXACTLY ONE question that invites the student to explain an idea
  in their own words.
- If an APPROVED CORRECTION is provided below, weave its content and its
  citation (source + page) into your reply faithfully. Do not change what it
  asserts and do not drop the citation.
- If the note says the question was ESCALATED, tell the student their
  question was routed to their teacher because the course material does not
  cover it — do NOT answer it from your own knowledge.
- If the student mixes Tamil and English, that is normal here. You may
  mirror a friendly phrase, but keep the substance in simple English.
- Never claim to have checked, tracked or monitored anything. You only ever
  respond to what the student just said."""


def _last_student_line(history: list[dict]) -> str:
    for m in reversed(history):
        if m.get("sender") == "student":
            return m.get("text", "")
    return ""


def _offline_reply(analysis: dict, misconception: Optional[dict],
                   correction: Optional[dict], concept_names: dict[str, str],
                   faculty_name: str) -> str:
    """Deterministic composition from the same inputs the live path gets."""
    parts: list[str] = []

    if correction and correction.get("grounded"):
        cite = correction.get("citation") or (
            f"page {correction.get('page')}" if correction.get("page") else "")
        parts.append(correction["text"])
        if cite and cite not in correction["text"]:
            parts.append(f"(See {cite}.)")
        q = correction.get("retrieval_question")
        parts.append(q if q else "How would you say that back in your own words?")
        return " ".join(parts)

    if correction and not correction.get("grounded"):
        parts.append(
            f"That one goes beyond what I can cite from your course "
            f"material, so I've routed it to {faculty_name} as an open "
            f"question rather than guessing.")
        parts.append("While we wait — what part felt clearest to you today?")
        return " ".join(parts)

    if analysis.get("is_question") and analysis.get("concept_ids"):
        cid = analysis["concept_ids"][0]
        name = concept_names.get(cid, "that topic")
        parts.append(
            f"Good question — that's about {name.lower()}. I've noted it "
            f"so your class material on it can be pointed to.")
        parts.append(
            f"Before I point you at a page: how would you explain "
            f"{name.lower()} as it stands in your head right now?")
        return " ".join(parts)

    if misconception:
        # Named but not yet corrected (no grounded correction supplied).
        parts.append("Interesting — say a bit more about that idea.")
        parts.append(
            f"When you say it that way, what do you picture happening "
            f"step by step?")
        return " ".join(parts)

    return ("Thanks — that's a useful reflection. "
            "What's one part of today's class you could teach to a "
            "classmate, and one part you'd want re-explained?")


def respond(history: list[dict], analysis: dict,
            misconception: Optional[dict], correction: Optional[dict],
            concept_names: dict[str, str], faculty_name: str,
            *, allow_offline: bool = True) -> dict[str, Any]:
    """One agent turn. history is the last few {sender, text} rows."""
    if not llm.available():
        if allow_offline:
            return {"reply": _offline_reply(analysis, misconception,
                                            correction, concept_names,
                                            faculty_name),
                    "source": "offline"}
        raise RuntimeError("No LLM provider and allow_offline=False")

    SCHEMA = {
        "type": "object",
        "properties": {"reply": {"type": "string"}},
        "required": ["reply"],
    }

    convo = "\n".join(
        f"{'STUDENT' if m.get('sender') == 'student' else 'YOU'}: {m.get('text','')}"
        for m in history[-8:]
    )
    notes: list[str] = []
    if misconception:
        notes.append(
            f"The Diagnostician named a specific idea in the student's "
            f"words: {misconception['id']} — {misconception['name']}.")
    if correction and correction.get("grounded"):
        cite = correction.get("citation") or f"page {correction.get('page')}"
        notes.append(
            "APPROVED CORRECTION (verified against the prescribed material — "
            f"use it faithfully, keep the citation): \"{correction['text']}\" "
            f"Citation: {cite}. "
            f"Check-in question: {correction.get('retrieval_question','')}")
    elif correction:
        notes.append(
            f"The student's question was ESCALATED to their teacher "
            f"({faculty_name}) because the course material does not cover "
            f"it. Say so; answer nothing yourself.")
    if analysis.get("is_question"):
        cids = ", ".join(analysis.get("concept_ids", [])) or "unmapped"
        notes.append(f"The student is asking a question (topics: {cids}). "
                     f"It has been recorded as a questioned topic.")

    prompt = (
        f"Conversation so far:\n{convo}\n\n"
        f"Pipeline notes:\n" + ("\n".join(f"- {n}" for n in notes) or "- none")
        + "\n\nWrite your next reply."
    )

    try:
        out = llm.structured(SYSTEM, prompt, SCHEMA, max_tokens=1200)
        reply = (out.get("reply") or "").strip()
        if not reply:
            raise ValueError("empty reply")
        # Gate in code: an approved correction's citation must survive.
        if correction and correction.get("grounded"):
            page = str(correction.get("page") or "")
            if page and page not in reply:
                cite = correction.get("citation") or f"page {page}"
                reply += f" (See {cite}.)"
        return {"reply": reply, "source": llm.describe()}
    except Exception as e:                            # noqa: BLE001
        if allow_offline:
            return {"reply": _offline_reply(analysis, misconception,
                                            correction, concept_names,
                                            faculty_name),
                    "source": f"offline-after-failure ({type(e).__name__})"}
        raise


if __name__ == "__main__":
    names = {"C05": "Multiplexing and demultiplexing", "C12": "Flow control"}
    hist = [{"sender": "student",
             "text": "how does the receiver know which socket gets the data?"}]
    out = respond(hist, {"is_question": True, "concept_ids": ["C05"]},
                  None, None, names, "Prof. Meenakshi Raman")
    print(f"  [{out['source']}] {out['reply']}")
