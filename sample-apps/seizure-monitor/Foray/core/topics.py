"""
FORAY — questioned-topic detection.  R-12.

    in:  one student chat message
    out: was it a question / expression of confusion, and about which concepts

DETERMINISTIC. No LLM anywhere near this file (/core/ rule #2). The
"most questioned topics" number on the faculty dashboard is a COUNT over
rows this module produced — the same argument as the 23 -> 4: a number you
can defend because nothing generated it.

Detection is two hand-authored tables:

  * QUESTION_MARKERS — phrases that signal a question or confusion, in the
    register students actually use (including the code-mixed Tamil forms the
    cohort writes — R-05: confusion in Tamil is confusion, not weakness).
  * concept keywords — the SAME table the material chunker uses, so a
    question is tagged to a concept exactly the way the textbook is.

A message that matches a marker but no concept is still recorded, under
concept_id "C00" (unmapped) — an unanswerable "I'm lost" is signal too.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Keyword tables + word-boundary matcher shared with the chunkers, so a
# question about "port number" lands on the same C03 the material does.
# CN keywords live in the CN chunker; the sem VI packs carry their own.
from tools.chunk_material import CONCEPT_KEYWORDS, _matches  # noqa: E402

QUESTION_MARKERS = [
    "?",
    "how do", "how does", "how is", "why do", "why does", "why is",
    "what is", "what does", "whats ", "what's ",
    "confused", "confusing", "dont get", "don't get", "didnt get",
    "didn't get", "dont understand", "don't understand", "didnt understand",
    "didn't understand", "not sure", "no idea", "lost me", "i am lost",
    "im lost", "i'm lost", "doubt", "unclear", "can you explain",
    "could you explain", "explain again", "stuck on", "struggling",
    "makes no sense", "couldnt follow", "couldn't follow",
    # code-mixed Tamil — accepted, never penalised (R-05)
    "puriyala", "puriyavillai", "theriyala", "epdi", "yen ",
    "enna ", "sandheham", "doubt iruku",
]

# Per-course registries, built once: keywords for tagging, names so a
# student asking "what is flow control" by NAME still lands on the concept.
_REGISTRY: dict[str, dict[str, dict]] = {}


def _registry() -> dict[str, dict[str, dict]]:
    global _REGISTRY
    if _REGISTRY:
        return _REGISTRY
    reg: dict[str, dict[str, dict]] = {}

    cn = json.loads(
        (ROOT / "data" / "concepts.json").read_text(encoding="utf-8"))
    reg["CN"] = {
        "keywords": dict(CONCEPT_KEYWORDS),
        "names": {c["id"]: c["name"] for c in cn["concepts"]},
    }

    sem6_path = ROOT / "data" / "sem6_courses.json"
    if sem6_path.exists():
        packs = json.loads(sem6_path.read_text(encoding="utf-8"))
        for course in packs["courses"]:
            reg[course["code"]] = {
                "keywords": {c["id"]: c["keywords"]
                             for c in course["concepts"]},
                "names": {c["id"]: c["name"] for c in course["concepts"]},
            }
    _REGISTRY = reg
    return reg


def is_question(text: str) -> bool:
    low = " " + re.sub(r"\s+", " ", (text or "").lower()) + " "
    return any(m in low for m in QUESTION_MARKERS)


# ── student phrasing, for TAGGING ONLY ──────────────────────────────
#
# The keyword table above is the CHUNKER's, tuned for matching textbook
# prose. Reusing it verbatim here under-tags real questions, because a
# student writes "the port" not "port number", and "three way handshake"
# without the hyphen. Measured before this table existed: 3 of 7 realistic
# CN questions landed in C00 unmapped, including the two most likely things
# a volunteer asks on stage.
#
# Loosening the chunker's table instead would re-introduce the S1
# over-tagging bug (it matched "ack " inside "back "). Different jobs want
# different tuning: the chunker needs precision over a 200-page corpus,
# the tagger needs recall over one sentence. So this layer is additive and
# tagging-only — the corpus is untouched.
QUESTION_KEYWORDS: dict[str, list[str]] = {
    "C03": ["port", "ports", "address", "addresses", "ip"],
    "C04": ["socket", "sockets"],
    "C05": ["demux", "which socket", "same port", "tell them apart",
            "tell us apart", "mix us up", "four-tuple", "four tuple"],
    "C06": ["udp"],
    "C07": ["reliable", "guaranteed", "lost packet", "packet loss"],
    "C08": ["seq", "sequence number", "ack", "acks", "acknowledge"],
    "C09": ["gbn", "go back n", "selective repeat", "resend", "retransmit"],
    "C10": ["segment", "mss", "header"],
    "C11": ["handshake", "three way", "3 way", "syn", "connection",
            "connections", "establish", "teardown"],
    "C12": ["rwnd", "receive window", "flow control"],
    "C13": ["cwnd", "congestion", "slow start", "aimd"],
}


def tag_concepts(text: str, course: str = "CN") -> list[str]:
    """Concept ids this text is about, WITHIN the student's course.
    Chunker keywords + student phrasing + concept-name match."""
    entry = _registry().get(course) or _registry()["CN"]
    low = (text or "").lower()
    hits = [c for c, kws in entry["keywords"].items()
            if any(_matches(k, low) for k in kws)]
    # student-phrasing layer (CN only — the sem VI packs carry their own
    # keywords, authored against the same student-language standard)
    if course == "CN":
        for cid, kws in QUESTION_KEYWORDS.items():
            if cid not in hits and any(_matches(k, low) for k in kws):
                hits.append(cid)
    for cid, name in entry["names"].items():
        if cid not in hits and len(name) >= 4 and name.lower() in low:
            hits.append(cid)
    return sorted(hits)


def concept_names(course: str = "CN") -> dict[str, str]:
    entry = _registry().get(course) or _registry()["CN"]
    return dict(entry["names"])


def analyse(text: str, course: str = "CN") -> dict:
    """One message in, one verdict out. Pure function, trivially testable."""
    q = is_question(text)
    concepts = tag_concepts(text, course)
    return {
        "is_question": q,
        "concept_ids": concepts if concepts else (["C00"] if q else []),
    }


if __name__ == "__main__":
    samples = [
        "how does the receiver know which socket to send it to?",
        "flow control puriyala, can you explain again",
        "today we did udp, it made sense",
        "im lost",
        "why is the sequence number not just 1 2 3?",
    ]
    for s in samples:
        print(f"  {analyse(s)}  <- {s!r}")
