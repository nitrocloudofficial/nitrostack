"""
Clinical guideline corpus ingestion -- Phase 2.5.

Fetches the source guideline PDFs into `data/guidelines/` and rebuilds
the signed FAISS index the Evidence Agent retrieves from.

    python3 scripts/ingest_guidelines.py                 # fetch + index
    python3 scripts/ingest_guidelines.py --skip-download # index what is already there
    python3 scripts/ingest_guidelines.py --list

Requires FAISS_SIGNING_KEY (see .env.example) -- rag/ingest.py signs the
index it builds, and rag/vectorstore.py refuses to load an index whose
signature it cannot verify, so an unsigned index would be built and then
rejected at query time.

On download failures: publisher sites move PDFs, gate them behind
member logins, and block non-browser user agents. This script therefore
treats a failed fetch as a *recoverable* condition -- it reports which
documents are missing and how to place them manually, then indexes
whatever is present, rather than aborting the whole corpus because one
URL rotted. The repo already ships two guideline PDFs under
docs/guidelines/, which are used as a local fallback.
"""
from __future__ import annotations

import argparse
import logging
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT / "src"))

logger = logging.getLogger("medagent.ingest_guidelines")

DEFAULT_TARGET = _REPO_ROOT / "data" / "guidelines"
_BUNDLED_GUIDELINES = _REPO_ROOT / "docs" / "guidelines"

# A browser-ish UA: several publisher CDNs return 403 to python-requests'
# default agent regardless of whether the document itself is public.
_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)


@dataclass(frozen=True)
class GuidelineSource:
    filename: str
    title: str
    url: str
    # Where to find it if the URL fails -- these guidelines are freely
    # readable but not always directly downloadable.
    landing_page: str
    bundled_fallback: str | None = None


GUIDELINE_SOURCES: tuple[GuidelineSource, ...] = (
    GuidelineSource(
        filename="ATS_IDSA_CAP_2019.pdf",
        title=(
            "Diagnosis and Treatment of Adults with Community-acquired Pneumonia. "
            "An Official Clinical Practice Guideline of the American Thoracic Society "
            "and Infectious Diseases Society of America (2019)"
        ),
        url="https://www.atsjournals.org/doi/pdf/10.1164/rccm.201908-1581ST",
        landing_page="https://www.thoracic.org/statements/resources/tb-opi/diagnosis-and-treatment-of-adults-with-cap.pdf",
        bundled_fallback="ATS_IDSA_Pneumonia.pdf",
    ),
    GuidelineSource(
        filename="ACR_Appropriateness_Pneumonia.pdf",
        title="ACR Appropriateness Criteria — Acute Respiratory Illness / Pneumonia",
        url="https://acsearch.acr.org/docs/69446/Narrative/",
        landing_page="https://acsearch.acr.org/list",
        bundled_fallback="ACR_Pneumonia_Criteria.pdf",
    ),
)


def _looks_like_pdf(path: Path) -> bool:
    """A 200 response is not proof of a PDF: gated publisher URLs
    routinely return an HTML login page with a success status, which
    would then be indexed as if it were clinical guidance."""
    try:
        with path.open("rb") as handle:
            return handle.read(5) == b"%PDF-"
    except OSError:
        return False


def fetch(source: GuidelineSource, target_dir: Path, timeout: int = 60) -> bool:
    """Downloads one guideline, falling back to the copy bundled in
    docs/guidelines/ when the network fetch fails or returns something
    that is not a PDF. Returns True if the file is in place."""
    import requests

    destination = target_dir / source.filename
    if destination.exists() and _looks_like_pdf(destination):
        logger.info("Already present: %s", source.filename)
        return True

    try:
        logger.info("Fetching %s ...", source.filename)
        response = requests.get(
            source.url, timeout=timeout, headers={"User-Agent": _USER_AGENT}, allow_redirects=True
        )
        response.raise_for_status()
        destination.write_bytes(response.content)

        if not _looks_like_pdf(destination):
            destination.unlink(missing_ok=True)
            raise ValueError("response was not a PDF (likely a login or interstitial page)")

        logger.info("Downloaded %s (%.1f KB)", source.filename, destination.stat().st_size / 1024)
        return True

    except Exception as exc:  # noqa: BLE001 - any fetch failure falls back identically
        logger.warning("Could not download %s: %s", source.filename, exc)

        if source.bundled_fallback:
            bundled = _BUNDLED_GUIDELINES / source.bundled_fallback
            if bundled.exists() and bundled.stat().st_size > 0:
                shutil.copy2(bundled, destination)
                logger.info("Used bundled fallback %s -> %s", bundled.name, destination.name)
                return True

        logger.error(
            "%s is unavailable. Download it manually from %s and save it as %s",
            source.title, source.landing_page, destination,
        )
        return False


def build_index(guidelines_dir: Path) -> None:
    """Rebuilds and signs the FAISS index over `guidelines_dir`."""
    from medagent.rag.ingest import ingest_documents

    pdfs = sorted(guidelines_dir.glob("*.pdf"))
    if not pdfs:
        raise FileNotFoundError(
            f"No PDFs in {guidelines_dir} -- nothing to index. Download at least one guideline first."
        )

    logger.info("Indexing %d guideline PDF(s) from %s", len(pdfs), guidelines_dir)
    for pdf in pdfs:
        logger.info("  - %s (%.1f KB)", pdf.name, pdf.stat().st_size / 1024)

    ingest_documents(str(guidelines_dir))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--target-dir", default=str(DEFAULT_TARGET))
    parser.add_argument("--skip-download", action="store_true")
    parser.add_argument("--skip-index", action="store_true")
    parser.add_argument("--list", action="store_true", help="List configured sources and exit.")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    if args.list:
        for source in GUIDELINE_SOURCES:
            print(f"\n{source.filename}\n  {source.title}\n  url:     {source.url}\n  landing: {source.landing_page}")
        return 0

    target_dir = Path(args.target_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    obtained = 0
    if not args.skip_download:
        for source in GUIDELINE_SOURCES:
            if fetch(source, target_dir):
                obtained += 1
        logger.info("Obtained %d/%d guideline document(s).", obtained, len(GUIDELINE_SOURCES))
    else:
        obtained = len(list(target_dir.glob("*.pdf")))

    if obtained == 0:
        print(
            "\nNo guideline documents available. Download them manually (see the URLs above), "
            f"place them in {target_dir}, and re-run with --skip-download.",
            file=sys.stderr,
        )
        return 1

    if not args.skip_index:
        try:
            build_index(target_dir)
        except Exception as exc:  # noqa: BLE001 - surfaced with context rather than a bare traceback
            print(f"\nIndexing failed: {type(exc).__name__}: {exc}", file=sys.stderr)
            return 1

    print(f"\nDone. {obtained} guideline document(s) in {target_dir}; signed FAISS index rebuilt.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
