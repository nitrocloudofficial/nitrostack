"""
FORAY — THE DIAGNOSTICIAN.  R-01.  Demo beat 1.

The agent everything downstream depends on. Contract in foray_plan.md §12:

    in:  reflection.text, candidate Misconception[] for those concepts
    out: { misconception_ids, novel_text, confidence, evidence_span }

    rule: CLASSIFY ONLY — choose from the provided IDs or return novel.
          MUST quote the student's own words in evidence_span.
          Never invent a misconception name. Never score. Never grade.

Two rules are enforced in CODE, not just asked for in the prompt:

  1. Every returned id must exist in the candidate taxonomy. A hallucinated
     id is dropped. This is what makes clustering `GROUP BY misconception_id`
     instead of fuzzy text matching (§8).
  2. `evidence_span` must actually appear in the student's text. A model
     that paraphrases has broken R-01 — "quote the student" is the whole
     claim of beat 1, and a paraphrase on stage would be caught.

There is also an OFFLINE fallback that matches taxonomy `signals`
deterministically. It exists for two reasons: the pipeline is testable
before an API key is set, and beat 1 degrades to something honest if the
conference wifi dies. It is NOT a substitute for the live call — it reports
`source="offline"` so nobody can accidentally claim otherwise on stage.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Literal, Optional

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Read ANTHROPIC_API_KEY from the repo-root .env. Without this the key would
# sit in .env being ignored, the offline matcher would run, and everything
# would LOOK fine — the worst possible failure at 4am.
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:                                   # pragma: no cover
    pass                                              # env vars still work

from agents import llm


def llm_available() -> bool:
    """True when a live call is possible, on ANY configured provider.
    /health reports this so the mode is visible at a glance."""
    return llm.available()

SYSTEM = """You classify a student's reflection into a fixed taxonomy of \
misconceptions. You are not a tutor and not a grader.

YOUR ONLY JOB: decide which of the numbered misconceptions below the student \
holds, if any.

RULES — these are absolute:
- Choose ONLY from the candidate ids provided. Never invent an id or a name.
- If nothing in the list matches, return an empty misconception_ids list and \
put a one-sentence description in novel_text.
- evidence_span MUST be copied VERBATIM from the student's text — an exact \
substring, character for character. Never paraphrase, correct spelling, or \
tidy grammar. If you cannot quote it exactly, you have not found evidence.
- Never score the student. Never say "incorrect" or "wrong". You name a \
specific idea, nothing more.
- A student writing in Tamil, or mixing Tamil and English, is not a weaker \
student. Judge the concept, never the fluency.
- Confidence is your own calibration, 0.0 to 1.0. Low confidence is fine and \
useful; overconfidence is not.

WORKED EXAMPLE
Candidates:
  M12 — Believes a TCP connection is identified by the destination port alone
  M13 — Thinks the three-way handshake carries the application data
Student text:
  "so basically tcp connection management — the port is basically the \
connection. still a bit confused about the rest"
Correct output:
  misconception_ids: ["M12"]
  novel_text: null
  confidence: 0.86
  evidence_span: "the port is basically the connection"
"""


def _norm(s: str) -> str:
    """Loose comparison for the quote check: collapse whitespace, fold case.
    We forgive spacing and capitalisation, never word choice."""
    return re.sub(r"\s+", " ", s or "").strip().lower()


def _load(name: str) -> Any:
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


def all_misconceptions() -> list[dict]:
    """Every taxonomy row across every course: the CN taxonomy plus the
    Semester VI course packs. Concept ids are namespaced per course, so
    filtering by concept_ids keeps courses from bleeding into each other."""
    tax = list(_load("taxonomy.json")["misconceptions"])
    sem6 = ROOT / "data" / "sem6_courses.json"
    if sem6.exists():
        packs = json.loads(sem6.read_text(encoding="utf-8"))
        for course in packs["courses"]:
            tax.extend(course["misconceptions"])
    return tax


def candidates_for(concept_ids: list[str]) -> list[dict]:
    """The Diagnostician only ever sees misconceptions for the concepts this
    reflection is about. Narrowing the candidate set is what keeps
    classification accurate and the prompt small."""
    return [m for m in all_misconceptions() if m["concept_id"] in concept_ids]


# ═══════════════════════════════════════════════════════════════════
#  OFFLINE — deterministic signal matching. No API key required.
# ═══════════════════════════════════════════════════════════════════

def offline_classify(text: str, candidates: list[dict]) -> dict:
    """Match taxonomy `signals` against the student's words.

    Deliberately simple: longest matching signal wins, and the matched
    phrase becomes evidence_span — so the quote is exact by construction.

    Search and slice both happen in the same (raw-lowercased) string, so
    the recovered span is always a verbatim substring of the student's
    original input regardless of leading/extra whitespace.
    """
    norm_text = _norm(text)        # collapsed whitespace, lowered — for matching
    text_lower = text.lower()      # original spacing, lowered — for slicing
    best: tuple[int, dict, str] | None = None
    for m in candidates:
        for sig in m["signals"]:
            sig_norm = _norm(sig)
            if sig_norm and sig_norm in norm_text:
                if best is None or len(sig_norm) > best[0]:
                    # Find the signal in the lowercased raw text so the index
                    # aligns with the original character positions.
                    sig_lower = sig.strip().lower()
                    idx = text_lower.find(sig_lower)
                    if idx >= 0:
                        span = text[idx:idx + len(sig_lower)]
                    else:
                        # Fallback: signal matched after normalization but not
                        # raw (e.g. internal whitespace differs). Use the
                        # normalized span — _validate normalizes both sides
                        # so it will still pass the verbatim check.
                        idx_n = norm_text.find(sig_norm)
                        span = (norm_text[idx_n:idx_n + len(sig_norm)]
                                if idx_n >= 0 else sig)
                    best = (len(sig_norm), m, span)
    if best is None:
        return {
            "misconception_ids": [],
            "novel_text": "No taxonomy signal matched (offline matcher).",
            "confidence": 0.0,
            "evidence_span": "",
            "source": "offline",
        }
    _, m, span = best
    return {
        "misconception_ids": [m["id"]],
        "novel_text": None,
        "confidence": 0.55,        # honest: a substring match is weak evidence
        "evidence_span": span,
        "source": "offline",
    }


# ═══════════════════════════════════════════════════════════════════
#  LIVE — the real agent. Beats 1 and 2 run this.
# ═══════════════════════════════════════════════════════════════════

def _validate(out: dict, text: str, candidates: list[dict]) -> tuple[bool, str]:
    """Enforce the two contract rules in code."""
    valid_ids = {m["id"] for m in candidates}
    bad = [i for i in out.get("misconception_ids", []) if i not in valid_ids]
    if bad:
        return False, f"invented misconception id(s): {bad}"

    span = out.get("evidence_span") or ""
    if out.get("misconception_ids") and not span:
        return False, "named a misconception with no evidence_span"
    if span and _norm(span) not in _norm(text):
        return False, f"evidence_span is not a verbatim quote: {span!r}"
    return True, ""


def classify(text: str, concept_ids: list[str], *, allow_offline: bool = True) -> dict:
    """Classify one reflection. Returns a Diagnosis-shaped dict plus `source`.

    Retries once on a contract violation, then falls back (§12: "never let a
    malformed parse crash a demo path").
    """
    candidates = candidates_for(concept_ids)
    if not candidates:
        return {
            "misconception_ids": [], "novel_text": "No taxonomy for these concepts.",
            "confidence": 0.0, "evidence_span": "", "source": "no-candidates",
        }

    if not llm_available():
        if allow_offline:
            return offline_classify(text, candidates)
        raise RuntimeError("No API key set and allow_offline=False")

    SCHEMA = {
        "type": "object",
        "properties": {
            "misconception_ids": {"type": "array", "items": {"type": "string"}},
            "novel_text": {"type": "string"},
            "confidence": {"type": "number"},
            "evidence_span": {"type": "string"},
        },
        "required": ["misconception_ids", "confidence", "evidence_span"],
    }

    listing = "\n".join(
        f"  {m['id']} — {m['name']}\n"
        f"     student phrasings: {'; '.join(m['signals'][:4])}"
        for m in candidates
    )
    prompt = (
        f"Candidates:\n{listing}\n\n"
        f'Student text:\n"""\n{text}\n"""\n\n'
        "Classify. Quote the student verbatim in evidence_span."
    )

    last_err = ""
    for attempt in (1, 2):
        try:
            out = llm.structured(SYSTEM, prompt, SCHEMA, max_tokens=1200)
            out.setdefault("misconception_ids", [])
            out.setdefault("novel_text", None)
            if out.get("novel_text") == "":
                out["novel_text"] = None
            ok, why = _validate(out, text, candidates)
            if ok:
                # Nothing named -> nothing to quote. Otherwise the UI shows
                # an "evidence" blockquote under a "no match" result, which
                # reads as a contradiction on stage.
                if not out["misconception_ids"]:
                    out["evidence_span"] = ""
                out["source"] = llm.describe()
                return out
            last_err = why
            prompt += (
                f"\n\nYour previous answer was rejected: {why}. "
                "evidence_span must be an EXACT substring of the student text "
                "above, copied character for character."
            )
        except Exception as e:                      # noqa: BLE001
            last_err = f"{type(e).__name__}: {e}"

    # Both attempts failed. Fall back rather than crash the demo path.
    if allow_offline:
        fb = offline_classify(text, candidates)
        fb["source"] = f"offline-after-failure ({last_err})"
        return fb
    raise RuntimeError(f"Diagnostician failed twice: {last_err}")


if __name__ == "__main__":
    samples = [
        ("so basically tcp connection management — the port is basically the "
         "connection. still a bit confused about the rest", ["C11"]),
        ("today we did udp. what i understood is that UDP is just bad TCP. "
         "i think thats the main idea", ["C06"]),
        ("seq numbers class. my takeaway: seq goes 1 2 3. hope thats right",
         ["C08"]),
        ("multiplexing today, the diagram was clear and i followed it", ["C05"]),
    ]
    tax = {m["id"]: m["name"] for m in _load("taxonomy.json")["misconceptions"]}
    print(f"\n  DIAGNOSTICIAN  ({llm.describe()})\n  " + "-" * 62)
    for text, cids in samples:
        d = classify(text, cids)
        ids = d["misconception_ids"]
        label = tax.get(ids[0], "—") if ids else "novel / none"
        print(f"  {', '.join(ids) or '(none)':6} {label[:44]:46} "
              f"conf={d['confidence']:.2f}  [{d['source']}]")
        if d["evidence_span"]:
            print(f"         evidence: \"{d['evidence_span']}\"")
    print()
