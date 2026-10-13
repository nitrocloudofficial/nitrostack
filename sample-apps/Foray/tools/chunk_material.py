"""
FORAY — turn the prescribed textbook into MaterialChunks.

    python tools/chunk_material.py

Extracts Kurose & Ross Ch. 3 (Transport Layer) plus the Ch. 1-2 prereq
pages, splits into paragraph-sized chunks, and tags each with concept_ids.

TWO THINGS THAT MATTER:

1. PRINTED PAGE, NOT PDF INDEX. printed = pdf_index - 1, verified across
   the whole book. Beat 1's line is "page 249 of their own notes" — it has
   to be the page a student would actually turn to.

2. Tagging is KEYWORD-BASED AND DETERMINISTIC, not embeddings (§9). The
   keyword table below is hand-authored, so a human can read it, argue
   with it, and fix it. Chunks that match nothing are dropped rather than
   guessed at — an untagged chunk is invisible to retrieval, which is
   correct: the Grounding Verifier should never cite something we are not
   confident is about the concept.

P1: review data/materials/chunks.json after running. Spot-check ten.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parent.parent
PDF = (
    ROOT / "notes" / "sem" / "Computer Networks"
    / "Computer Networking_ A Top-Down Approach, Global Edition, 8th Edition.pdf"
)
OUT = ROOT / "data" / "materials" / "chunks.json"

PAGE_OFFSET = 1          # printed page = pdf index - 1
SOURCE = "Kurose & Ross, Computer Networking 8e"

# pdf-index ranges, inclusive
RANGES = [
    (60, 113),    # Ch.1 — layering, encapsulation      (printed 59-112)
    (114, 213),   # Ch.2 — app layer, sockets, ports     (printed 113-212)
    (214, 335),   # Ch.3 — TRANSPORT LAYER, the unit     (printed 213-334)
]

# Hand-authored. Lowercased substring match. Order does not matter.
CONCEPT_KEYWORDS: dict[str, list[str]] = {
    "C01": ["protocol layer", "layered architecture", "five-layer", "osi ",
            "protocol stack", "service model"],
    "C02": ["encapsulat", "payload field", "adds header", "header field"],
    "C03": ["port number", "well-known port", "ip address", "addressing",
            "source port", "destination port"],
    "C04": ["socket", "socket interface", "welcoming socket"],
    "C05": ["multiplex", "demultiplex", "demultiplexing", "four-tuple",
            "connection-oriented demultiplexing"],
    "C06": ["udp", "connectionless transport", "user datagram"],
    "C07": ["reliable data transfer", "rdt", "checksum", "retransmi",
            "corrupted packet"],
    "C08": ["sequence number", "acknowledgment number", "acknowledgement",
            "cumulative acknowledg", "ack "],
    "C09": ["go-back-n", "gbn", "selective repeat", "pipelin", "sliding window"],
    "C10": ["tcp segment structure", "segment structure", "maximum segment size",
            "mss", "tcp header"],
    "C11": ["three-way handshake", "connection establish", "syn ", "synbit",
            "fin ", "connection management", "connection teardown"],
    "C12": ["flow control", "receive window", "rwnd"],
    "C13": ["congestion control", "cwnd", "congestion window", "aimd",
            "slow start", "fast recovery"],
}

MIN_CHARS = 320
MAX_CHARS = 1400


def clean(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n\n", text)
    return text.strip()


# Two header forms alternate by page parity:
#   odd:  "3.4  •  Principles of Reliable Data Transfer     249"
#   even: "130         CHAPTER 2    •    APPLICATION LAYER"
_HEADER_ODD = re.compile(r"^\s*\d\.\d\s*[•·�]")
_HEADER_EVEN = re.compile(r"^\s*\d{2,3}\s+(CHAPTER\s+\d|[A-Z][A-Z ]{6,})")
# "PROBLEMS         323" / "HOMEWORK PROBLEMS   318" — caps then page number
_HEADER_SECTION = re.compile(r"^\s*[A-Z][A-Z ]{4,}\s+\d{2,3}\s*$")


def strip_running_header(page_text: str) -> str:
    """Drop the running header. Left in, it becomes the first thing a judge
    reads in a cited chunk during beat 1."""
    lines = page_text.split("\n")
    while lines and (_HEADER_ODD.match(lines[0]) or _HEADER_EVEN.match(lines[0])
                     or _HEADER_SECTION.match(lines[0])):
        lines = lines[1:]
    return "\n".join(lines)


# Keywords shorter than this, or ending in a space, are matched on WORD
# BOUNDARIES. Plain substring matching tags "back " as an ACK reference and
# "define" as a FIN reference, which sends the Grounding Verifier to a page
# about something else entirely.
def _matches(keyword: str, low: str) -> bool:
    kw = keyword.strip()
    if len(kw) <= 4 or keyword.endswith(" "):
        return re.search(rf"\b{re.escape(kw)}\b", low) is not None
    return kw in low


def tag(text: str) -> list[str]:
    low = text.lower()
    return [c for c, kws in CONCEPT_KEYWORDS.items()
            if any(_matches(k, low) for k in kws)]


def split_paragraphs(text: str) -> list[str]:
    """Merge paragraphs up to MAX_CHARS so a chunk is a coherent passage."""
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    out, buf = [], ""
    for p in paras:
        if len(buf) + len(p) + 2 <= MAX_CHARS:
            buf = f"{buf}\n\n{p}" if buf else p
        else:
            if len(buf) >= MIN_CHARS:
                out.append(buf)
            buf = p
    if len(buf) >= MIN_CHARS:
        out.append(buf)
    return out


def main() -> None:
    if not PDF.exists():
        raise SystemExit(f"textbook not found: {PDF}")

    doc = fitz.open(PDF)
    chunks: list[dict] = []
    n = 0
    untagged = 0

    for start, end in RANGES:
        for idx in range(start, end + 1):
            printed = idx - PAGE_OFFSET
            raw = clean(strip_running_header(doc[idx].get_text()))
            if len(raw) < MIN_CHARS:
                continue
            for body in split_paragraphs(raw):
                cids = tag(body)
                if not cids:
                    untagged += 1
                    continue
                n += 1
                chunks.append({
                    "id": f"MAT_{n:04d}",
                    "source": SOURCE,
                    "page": printed,
                    "text": body,
                    "concept_ids": cids,
                })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(chunks, indent=1, ensure_ascii=False),
                   encoding="utf-8")

    per: dict[str, int] = {}
    for ch in chunks:
        for c in ch["concept_ids"]:
            per[c] = per.get(c, 0) + 1

    print(f"wrote {len(chunks)} chunks -> {OUT.relative_to(ROOT)}")
    print(f"dropped {untagged} untagged chunks (correct: no confident concept)")
    print("chunks per concept:")
    for c in sorted(per):
        bar = "#" * min(40, per[c] // 2)   # ASCII: Windows consoles are cp1252
        print(f"  {c}  {per[c]:4d}  {bar}")
    missing = [c for c in CONCEPT_KEYWORDS if c not in per]
    if missing:
        print(f"\n  !! NO MATERIAL for {missing} — grounding will fail there.")


if __name__ == "__main__":
    main()
