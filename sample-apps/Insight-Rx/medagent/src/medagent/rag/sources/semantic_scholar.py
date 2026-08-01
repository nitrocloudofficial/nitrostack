"""
Semantic Scholar literature retrieval -- Phase 2.5 scaffold.

A read-only client over the Semantic Scholar Graph API, giving the
Evidence Agent a route to current primary literature alongside the
static guideline corpus in the FAISS index.

**Scope and status.** This is wiring, not a clinical evidence source
yet. It is deliberately NOT connected to evidence_agent.py, for two
reasons that need resolving before it should be:

  1. *It reaches the network.* The rest of this pipeline is offline by
     design -- that property is what keeps patient data inside the
     deploying institution (REG-002 section 1.2). Any live query must
     therefore carry only a de-identified clinical concept, never
     patient text. `search()` takes a query string and this module has
     no access to case state; keeping it that way is the control.
  2. *Its results are ungoverned.* The FAISS corpus is a curated set of
     guideline documents. Semantic Scholar returns whatever matches --
     preprints, retracted work, single case reports. Presenting that to
     a clinician with the same weight as an ATS/IDSA recommendation
     would be misleading, so it needs a provenance/credibility model
     first. REG-002 section 6.2 tracks this as the guideline-corpus
     governance gap.

The API works unauthenticated at a low rate limit;
SEMANTIC_SCHOLAR_API_KEY raises it.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from medagent.utils.settings import get_settings

logger = logging.getLogger("medagent.rag.semantic_scholar")

DEFAULT_TIMEOUT = 15
DEFAULT_LIMIT = 5

# Requested explicitly rather than taking the API's default shape, so a
# change on their side cannot silently alter what this returns.
_FIELDS = "title,abstract,year,authors,venue,externalIds,url,citationCount,publicationTypes"


class SemanticScholarError(Exception):
    """Raised when the literature service cannot be reached or returns
    something unusable.

    Callers should treat this as a *degraded* condition, not a fatal
    one: the guideline index is the primary evidence source and remains
    available. Literature search being down must never halt a case."""


@dataclass(frozen=True)
class Paper:
    """One search result, normalized to the fields this project uses."""

    paper_id: str
    title: str
    abstract: str | None
    year: int | None
    venue: str | None
    authors: list[str] = field(default_factory=list)
    citation_count: int = 0
    url: str | None = None
    doi: str | None = None
    publication_types: list[str] = field(default_factory=list)

    @property
    def is_peer_reviewed_journal(self) -> bool:
        """Best-effort signal for filtering out preprints. Semantic
        Scholar's publicationTypes is sparsely populated, so False here
        means "not established", not "definitely a preprint" -- which is
        why this is exposed for a caller to weigh rather than used to
        silently drop results."""
        return "JournalArticle" in self.publication_types

    def to_evidence_line(self, index: int) -> str:
        """Formats as one citable block matching evidence_agent.py's
        `[n] Source: ...` layout -- the same shape the Verifier's
        citation-grounding check parses (verification_checks.py)."""
        citation = self.title
        if self.venue:
            citation += f" — {self.venue}"
        if self.year:
            citation += f" ({self.year})"
        body = (self.abstract or "No abstract available.").strip()
        return f"[{index}] Source: Semantic Scholar — {citation}\n{body}"

    @classmethod
    def from_api(cls, payload: dict[str, Any]) -> "Paper":
        external = payload.get("externalIds") or {}
        return cls(
            paper_id=payload.get("paperId") or "",
            title=payload.get("title") or "(untitled)",
            abstract=payload.get("abstract"),
            year=payload.get("year"),
            venue=payload.get("venue") or None,
            authors=[a.get("name", "") for a in (payload.get("authors") or []) if a.get("name")],
            citation_count=payload.get("citationCount") or 0,
            url=payload.get("url"),
            doi=external.get("DOI"),
            publication_types=payload.get("publicationTypes") or [],
        )


class SemanticScholarClient:
    """
    Thin, synchronous client over the Graph API's paper search.

    Takes explicit settings rather than reading globals at call time, so
    a test can point it at a stub without patching module state.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: int = DEFAULT_TIMEOUT,
        allow_network: bool | None = None,
    ):
        settings = get_settings()
        self.api_key = api_key if api_key is not None else settings.semantic_scholar_api_key
        self.base_url = (base_url or settings.semantic_scholar_base_url).rstrip("/")
        self.timeout = timeout
        # OFFLINE_MODE is enforced here rather than merely documented.
        # This is the only outbound call in the system, so it is the only
        # place the flag can actually mean anything -- and a setting that
        # promises "agents must not call external network APIs" while
        # nothing checks it is worse than no setting, because it will be
        # relied on. Pass allow_network=True to override deliberately.
        self.allow_network = (
            allow_network if allow_network is not None else not settings.offline_mode
        )

    def _headers(self) -> dict[str, str]:
        headers = {"Accept": "application/json"}
        if self.api_key:
            headers["x-api-key"] = self.api_key
        return headers

    def search(self, query: str, limit: int = DEFAULT_LIMIT) -> list[Paper]:
        """
        Searches for papers matching `query`.

        `query` must be a clinical concept ("community-acquired
        pneumonia lobar consolidation"), never patient text: this
        function reaches a third-party service, so anything passed here
        leaves the institution. See this module's docstring.

        Raises SemanticScholarError on any transport or decoding
        failure; callers degrade rather than halt.
        """
        if not query or not query.strip():
            raise SemanticScholarError("search() requires a non-empty query.")

        if not self.allow_network:
            raise SemanticScholarError(
                "OFFLINE_MODE is enabled, so outbound literature search is blocked. This system "
                "runs offline by default to keep patient data inside the deploying institution. "
                "Set OFFLINE_MODE=false in .env, or pass allow_network=True, to permit it."
            )

        import requests

        try:
            response = requests.get(
                f"{self.base_url}/paper/search",
                params={"query": query.strip(), "limit": limit, "fields": _FIELDS},
                headers=self._headers(),
                timeout=self.timeout,
            )
        except Exception as exc:  # noqa: BLE001 - transport failures are all one thing to the caller
            raise SemanticScholarError(
                f"Semantic Scholar request failed: {type(exc).__name__}: {exc}"
            ) from exc

        if response.status_code == 429:
            raise SemanticScholarError(
                "Semantic Scholar rate limit exceeded. Set SEMANTIC_SCHOLAR_API_KEY for a higher limit."
            )
        if not response.ok:
            raise SemanticScholarError(
                f"Semantic Scholar returned HTTP {response.status_code}: {response.text[:200]}"
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise SemanticScholarError(f"Semantic Scholar returned non-JSON: {exc}") from exc

        papers = [Paper.from_api(item) for item in payload.get("data") or []]
        logger.info("Semantic Scholar: %d result(s) for %r", len(papers), query)
        return papers

    def search_as_evidence(self, query: str, limit: int = DEFAULT_LIMIT, start_index: int = 1) -> str:
        """
        Search results formatted as a citable evidence block.

        `start_index` lets these be appended after guideline citations
        without colliding with their numbering -- the Verifier rejects
        any `[n]` a report cites that is not present in the retrieved
        evidence, so overlapping indices would fail grounding.
        """
        papers = self.search(query, limit=limit)
        if not papers:
            return ""
        return "\n\n".join(
            paper.to_evidence_line(start_index + offset) for offset, paper in enumerate(papers)
        )


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    search_query = " ".join(sys.argv[1:]) or "community-acquired pneumonia chest radiograph consolidation"

    print(f"Searching Semantic Scholar for: {search_query!r}\n")
    try:
        for paper in SemanticScholarClient().search(search_query, limit=3):
            flag = "" if paper.is_peer_reviewed_journal else "   [not confirmed peer-reviewed]"
            print(
                f"- {paper.title} ({paper.year}) — {paper.venue or 'unknown venue'} — "
                f"{paper.citation_count} citations{flag}"
            )
    except SemanticScholarError as exc:
        print(f"Search failed (degraded, not fatal): {exc}", file=sys.stderr)
        raise SystemExit(1)
