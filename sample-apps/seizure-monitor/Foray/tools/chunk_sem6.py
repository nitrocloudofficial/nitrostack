"""
FORAY — turn the Semester VI class archives into MaterialChunks.

    python tools/chunk_sem6.py

Five subjects from `notes/sem VI/` (Compiler Design, Distributed Systems,
Foundations of Cyber Security, IoT, Software Engineering). Same rules as
every other chunker here:

  * tagging is KEYWORD-BASED AND DETERMINISTIC — the keyword tables live
    in data/sem6_courses.json next to the concepts they tag, so a human
    can read the pack and argue with it. No embeddings (§9).
  * untagged chunks are dropped, not guessed at.
  * `page` is what a student would turn to: slide number for decks,
    printed page for PDFs. The two big reference books are capped to the
    taught front matter rather than swallowed whole.

Ids are MAT_6001+ with a `course` column, so all courses coexist in one
material_chunks table and retrieval stays the same list filter.
Output: data/materials/sem6_chunks.json — loaded by api/db.load_static.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from tools.chunk_material import _matches, clean  # noqa: E402

BASE = ROOT / "notes" / "sem VI"
OUT = ROOT / "data" / "materials" / "sem6_chunks.json"

# Slides state definitions tersely — "Many Goroutine execute within a
# single main thread" is 75 chars and is EXACTLY the fact a correction
# needs to cite. 120 (the sem V floor) silently dropped it; keyword
# tagging is the noise filter here, not length.
MIN_SLIDE_CHARS = 60
MIN_PDF_CHARS = 240
MAX_CHARS = 1400

# (course, relative path, source label, page cap or None)
SOURCES: list[tuple[str, str, str, int | None]] = [
    ("CD", "Compiler Design/Lab Manual.pdf", "CD lab manual", None),
    ("CD", "Compiler Design/ANTLR 4 Reference.pdf", "The Definitive ANTLR 4 Reference", 120),
    ("CD", "Compiler Design/Engineering a Compiler.pdf", "Engineering a Compiler", 150),
    ("CD", "Compiler Design/Runtime Environment.pptx", "Runtime Environment slides", None),
    ("CD", "Compiler Design/optimization.pptx", "Optimization slides", None),
    ("DS", "Distributed Systems/Intro_MPI.pdf", "Intro to MPI", None),
    ("DS", "Distributed Systems/Collective New.pdf", "MPI collectives lab", None),
    ("DS", "Distributed Systems/GoRoutines.pptx", "Goroutines slides", None),
    ("DS", "Distributed Systems/go_tutorial.pdf", "Go tutorial", None),
    ("DS", "Distributed Systems/Go_RPC_Lab.pdf", "Go RPC lab", None),
    ("DS", "Distributed Systems/Go_Lab.pdf", "Go lab", None),
    ("DS", "Distributed Systems/Consistency.pptx", "Consistency slides", None),
    ("DS", "Distributed Systems/Checkpointing.pptx", "Checkpointing slides", None),
    ("DS", "Distributed Systems/Global state and snapshots.pdf", "Global state & snapshots", None),
    ("DS", "Distributed Systems/Unit2 Lecture1.pdf", "DS Unit 2 Lecture 1", None),
    ("DS", "Distributed Systems/Unit2 Lecture3.pdf", "DS Unit 2 Lecture 3", None),
    ("FCS", "Foundations of Cyber Security/CH01-CompSec4e.pptx", "CompSec4e Ch.1 slides", None),
    ("FCS", "Foundations of Cyber Security/CH02-CompSec4e.pptx", "CompSec4e Ch.2 slides", None),
    ("FCS", "Foundations of Cyber Security/CH03-CompSec4e.pptx", "CompSec4e Ch.3 slides", None),
    ("FCS", "Foundations of Cyber Security/CH04-CompSec4e.pptx", "CompSec4e Ch.4 slides", None),
    ("FCS", "Foundations of Cyber Security/CH05-CompSec4e.pptx", "CompSec4e Ch.5 slides", None),
    ("FCS", "Foundations of Cyber Security/CH06-CompSec4e.pptx", "CompSec4e Ch.6 slides", None),
    ("FCS", "Foundations of Cyber Security/FILE SECURITY PRINCIPLES.pptx", "File security slides", None),
    ("FCS", "Foundations of Cyber Security/SOP_Policy.pptx", "SOP & policy slides", None),
    ("IO", "IoT/IoT Hands-On ch1-2.pdf", "IoT Hands-On Approach Ch.1-2", None),
    ("IO", "IoT/IoT Hands-On domains.pdf", "IoT Hands-On Approach, domains", None),
    ("SE", "Software Engineering/01_SE-Introduction.pdf", "SE 01 Introduction", None),
    ("SE", "Software Engineering/02-03_SE-Introduction.pdf", "SE 02-03 Introduction", None),
    ("SE", "Software Engineering/04-5_SE-Process.pdf", "SE 04-05 Process", None),
    ("SE", "Software Engineering/06-7_SE-ProcessModels.pdf", "SE 06-07 Process models", None),
    ("SE", "Software Engineering/08_09_Agile.pdf", "SE 08-09 Agile", None),
    ("SE", "Software Engineering/10_Agile manifesto.pdf", "SE 10 Agile manifesto", None),
    ("SE", "Software Engineering/11-13_RequirementsEngineering.pptx", "SE 11-13 Requirements slides", None),
]


# ── IoT: the archive's PDFs are SCANNED IMAGES — zero extractable text,
# checked page by page. Rather than fake citations into a book we cannot
# read, the IoT corpus is hand-authored course notes (source says so), and
# `page` is the note number. Honest label, honest page. R-02 stays real:
# a correction cites "IoT course notes, note N" and that note exists below.
IOT_NOTES: list[str] = [
    "The Internet of Things is a network of physical smart objects — an IoT "
    "device carries sensing or actuation, compute and connectivity, and can "
    "be identified and addressed. Characteristics: dynamic self-adapting "
    "behaviour, self-configuration, interoperable communication protocols, "
    "unique identity, and integration into an information network.",
    "Physical design of IoT covers the things themselves — an IoT device "
    "connects sensors for monitoring and actuators for control, with "
    "interfaces for IO, storage, memory, audio/video and connectivity.",
    "Logical design of IoT describes the system by functional blocks: "
    "device, communication, services, management, security and application. "
    "Each functional block abstracts what the layer does, independent of "
    "which hardware realises it.",
    "MQTT is a lightweight publish-subscribe messaging protocol over TCP: "
    "clients publish messages to named topics on a broker, and subscribers "
    "to a topic receive those messages from the broker. Publishers never "
    "contact subscribers directly, and neither side requests data from the "
    "other — delivery is broker-mediated.",
    "CoAP is a constrained application protocol for low-power devices: "
    "request-response like HTTP with GET/PUT/POST/DELETE, but over UDP "
    "with compact binary headers. WebSocket keeps a full-duplex connection "
    "open; AMQP adds queueing between producers and consumers.",
    "IoT communication models: request-response (client asks the server, "
    "stateless, like HTTP), publish-subscribe (broker decouples publishers "
    "from consumers via topics), push-pull (producers push into queues, "
    "consumers pull at their own rate), and exclusive pair (a persistent "
    "full-duplex connection between exactly two endpoints).",
    "In the publish-subscribe model the broker is the only party that "
    "knows the consumers: publishers know topics, the broker holds the "
    "subscriptions, and subscribers receive whatever arrives on the topics "
    "they registered for.",
    "IoT levels are deployment templates: a level-1 system runs a single "
    "node with local analysis and storage; higher levels move storage and "
    "analysis to the cloud, add multiple nodes, and at the top use "
    "cloud-based observer nodes over big-data scale streams.",
    "Choosing a deployment template: local server versus cloud storage "
    "depends on data volume, analysis complexity and connectivity. When "
    "the data is big and analysis is heavy, the analysis moves to the "
    "cloud; when latency matters, it stays near the device.",
    "A sensor is a transducer that converts a physical quantity — "
    "temperature, humidity, light, motion — into an electrical signal and "
    "so into data. Sensing is input: the environment acts on the device.",
    "An actuator converts a command back into physical action — a relay "
    "switching, a motor turning, a valve opening. Actuation is output: "
    "the device acts on the environment. A thermostat pairs the two: a "
    "temperature sensor reads, a heater actuator responds.",
    "Domain applications: a smart home automates lighting, appliances and "
    "intrusion detection; smart city systems manage parking, lighting and "
    "waste; smart agriculture drives irrigation from soil-moisture "
    "sensing; wearable health monitoring streams vitals for analysis; a "
    "smart grid senses load and reroutes power.",
]


def load_keywords() -> dict[str, dict[str, list[str]]]:
    packs = json.loads(
        (ROOT / "data" / "sem6_courses.json").read_text(encoding="utf-8"))
    return {
        course["code"]: {c["id"]: c["keywords"] for c in course["concepts"]}
        for course in packs["courses"]
    }


def tag(text: str, keywords: dict[str, list[str]]) -> list[str]:
    low = text.lower()
    return [cid for cid, kws in keywords.items()
            if any(_matches(k, low) for k in kws)]


def slide_text(slide) -> str:
    parts: list[str] = []
    for shape in slide.shapes:
        if shape.has_text_frame:
            for para in shape.text_frame.paragraphs:
                line = "".join(run.text for run in para.runs).strip()
                if line:
                    parts.append(line)
    return clean("\n".join(parts))


def split_paragraphs(text: str) -> list[str]:
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    out, buf = [], ""
    for p in paras:
        if len(buf) + len(p) + 2 <= MAX_CHARS:
            buf = f"{buf}\n\n{p}" if buf else p
        else:
            if len(buf) >= MIN_PDF_CHARS:
                out.append(buf)
            buf = p
    if len(buf) >= MIN_PDF_CHARS:
        out.append(buf)
    return out


def main() -> None:
    if not BASE.exists():
        raise SystemExit(f"class content not found: {BASE}")
    per_course_kw = load_keywords()

    chunks: list[dict] = []
    n = 6000                                # MAT_6001 onward
    per_source: list[tuple[str, int]] = []

    for course, rel, source, cap in SOURCES:
        path = BASE / rel
        if not path.exists():
            print(f"  skip (missing): {rel}")
            continue
        kw = per_course_kw[course]
        got = 0
        if path.suffix.lower() == ".pptx":
            from pptx import Presentation
            prs = Presentation(path)
            for i, slide in enumerate(prs.slides, start=1):
                body = slide_text(slide)
                if len(body) < MIN_SLIDE_CHARS:
                    continue
                cids = tag(body, kw)
                if not cids:
                    continue
                n += 1
                got += 1
                chunks.append({
                    "id": f"MAT_{n:04d}", "course": course, "source": source,
                    "page": i, "text": body[:MAX_CHARS], "concept_ids": cids,
                })
        else:
            doc = fitz.open(path)
            pages = min(doc.page_count, cap or doc.page_count)
            for i in range(pages):
                body = clean(doc[i].get_text())
                if len(body) < MIN_PDF_CHARS:
                    continue
                for para in split_paragraphs(body):
                    cids = tag(para, kw)
                    if not cids:
                        continue
                    n += 1
                    got += 1
                    chunks.append({
                        "id": f"MAT_{n:04d}", "course": course,
                        "source": source, "page": i + 1,
                        "text": para[:MAX_CHARS], "concept_ids": cids,
                    })
        per_source.append((f"{course}  {source}", got))

    # IoT hand-authored notes (see IOT_NOTES above for why)
    kw = per_course_kw["IO"]
    got = 0
    for i, note in enumerate(IOT_NOTES, start=1):
        cids = tag(note, kw)
        if not cids:
            continue
        n += 1
        got += 1
        chunks.append({
            "id": f"MAT_{n:04d}", "course": "IO",
            "source": "IoT course notes (Bahga & Madisetti track)",
            "page": i, "text": note, "concept_ids": cids,
        })
    per_source.append(("IO  IoT course notes (hand-authored)", got))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(chunks, indent=1, ensure_ascii=False),
                   encoding="utf-8")

    for label, got in per_source:
        print(f"  {label:44} {got:4d} chunks")
    per_concept: dict[str, int] = {}
    for ch in chunks:
        for c in ch["concept_ids"]:
            per_concept[c] = per_concept.get(c, 0) + 1
    print(f"\nwrote {len(chunks)} chunks -> {OUT.relative_to(ROOT)}")
    print("chunks per concept:")
    for c in sorted(per_concept):
        print(f"  {c}  {per_concept[c]:4d}  " + "#" * min(40, per_concept[c]))
    # every concept in every pack must have at least SOME material, or
    # grounding in that course silently escalates on everything
    all_ids = {c for kw in per_course_kw.values() for c in kw}
    missing = sorted(all_ids - set(per_concept))
    if missing:
        print(f"\n  !! NO MATERIAL for {missing} — grounding will escalate there.")


if __name__ == "__main__":
    main()
