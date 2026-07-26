"""
scout.py - The Scout agent's capability: multi-source open-image fetcher.

Design goals:
  - MULTI-SOURCE: fans out across several open-licensed sources.
  - ROBUST: any single source can fail (network, rate-limit, no key) without
    killing the run. Failures are logged into the manifest, never raised.
  - SIMPLE INTERFACE: one function -> fetch_images(query, n, out_dir).
  - JUDGE-PROOF: every downloaded image records its source + license in the
    manifest, so "did you check licensing?" has a real answer.

Sources:
  - openverse   : Creative-Commons image search        (no key)   [downloads]
  - wikimedia   : Wikimedia Commons image search        (no key)   [downloads]
  - huggingface : dataset discovery by keyword          (no key)   [references only]
  - roboflow    : stub (needs API key)                             [extensibility]
  - github      : stub (brittle to scrape)                         [extensibility]

Run standalone:
    python scout.py "cat" 30 C:/hack/storage/images/cat
"""

from __future__ import annotations

import os
import sys
import json
import time
import hashlib
from dataclasses import dataclass, field, asdict
from typing import Callable

import requests

USER_AGENT = "ModelQuarantineDesk/0.1 (hackathon; contact: student@example.edu)"
TIMEOUT = 20


@dataclass
class ImageHit:
    url: str
    source: str
    license: str
    title: str = ""


@dataclass
class FetchResult:
    query: str
    requested: int
    downloaded: int = 0
    out_dir: str = ""
    per_source: dict = field(default_factory=dict)   # source -> count downloaded
    dataset_refs: list = field(default_factory=list)  # HF etc: [{name,url,source}]
    errors: list = field(default_factory=list)        # [{source, error}]
    files: list = field(default_factory=list)         # [{path,url,source,license}]


# --------------------------------------------------------------------------
# SOURCE PLUGINS
# Each returns a list[ImageHit]. Each must swallow its own errors and instead
# append to `result.errors` via the small helper, returning [] on failure.
# --------------------------------------------------------------------------

def _safe(source: str, fn: Callable[[], list], result: FetchResult) -> list:
    try:
        return fn()
    except Exception as e:  # noqa: BLE001 - robustness is the whole point
        result.errors.append({"source": source, "error": f"{type(e).__name__}: {e}"})
        return []


def src_openverse(query: str, need: int, page_offset: int = 0) -> list[ImageHit]:
    hits: list[ImageHit] = []
    page = 1 + page_offset
    max_page = page + 5
    while len(hits) < need and page < max_page:
        r = requests.get(
            "https://api.openverse.org/v1/images/",
            params={"q": query, "page_size": min(need, 20), "page": page,
                    "license_type": "all-cc"},
            headers={"User-Agent": USER_AGENT},
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        results = r.json().get("results", [])
        if not results:
            break
        for it in results:
            url = it.get("url")
            if url:
                hits.append(ImageHit(
                    url=url, source="openverse",
                    license=str(it.get("license", "cc")).upper(),
                    title=it.get("title", "") or "",
                ))
        page += 1
    return hits


def src_wikimedia(query: str, need: int, page_offset: int = 0) -> list[ImageHit]:
    # Search Commons for files, then resolve their direct image URLs.
    r = requests.get(
        "https://commons.wikimedia.org/w/api.php",
        params={
            "action": "query", "format": "json", "generator": "search",
            "gsrsearch": f"{query} filetype:bitmap", "gsrnamespace": 6,
            "gsrlimit": min(need, 40), "gsroffset": page_offset * 40,
            "prop": "imageinfo",
            "iiprop": "url|extmetadata", "iiurlwidth": 512,
        },
        headers={"User-Agent": USER_AGENT},
        timeout=TIMEOUT,
    )
    r.raise_for_status()
    pages = (r.json().get("query", {}) or {}).get("pages", {}) or {}
    hits: list[ImageHit] = []
    for p in pages.values():
        info = (p.get("imageinfo") or [{}])[0]
        url = info.get("thumburl") or info.get("url")
        if not url:
            continue
        meta = info.get("extmetadata", {}) or {}
        lic = (meta.get("LicenseShortName", {}) or {}).get("value", "Commons")
        hits.append(ImageHit(url=url, source="wikimedia", license=str(lic),
                             title=p.get("title", "") or ""))
        if len(hits) >= need:
            break
    return hits


def src_huggingface_datasets(query: str, need: int) -> list[dict]:
    # Discovery only: returns matching dataset listings, NOT loose images.
    r = requests.get(
        "https://huggingface.co/api/datasets",
        params={"search": query, "limit": 10},
        headers={"User-Agent": USER_AGENT},
        timeout=TIMEOUT,
    )
    r.raise_for_status()
    out = []
    for d in r.json():
        dsid = d.get("id")
        if dsid:
            out.append({"name": dsid,
                        "url": f"https://huggingface.co/datasets/{dsid}",
                        "source": "huggingface"})
    return out


def src_roboflow_stub(query: str, need: int, page_offset: int = 0) -> list[ImageHit]:
    # Extensibility stub: Roboflow Universe needs an API key.
    raise RuntimeError("roboflow source not configured (needs API key) - stub")


def src_github_stub(query: str, need: int, page_offset: int = 0) -> list[ImageHit]:
    # Extensibility stub: GitHub image search is brittle/needs auth.
    raise RuntimeError("github source not configured (needs auth) - stub")


IMAGE_SOURCES = [
    ("openverse", src_openverse),
    ("wikimedia", src_wikimedia),
    ("roboflow", src_roboflow_stub),
    ("github", src_github_stub),
]


# --------------------------------------------------------------------------
# DOWNLOAD
# --------------------------------------------------------------------------

def _download(hit: ImageHit, out_dir: str) -> str | None:
    try:
        r = requests.get(hit.url, headers={"User-Agent": USER_AGENT},
                         timeout=TIMEOUT, stream=True)
        r.raise_for_status()
        ctype = r.headers.get("Content-Type", "")
        if "image" not in ctype:
            return None
        ext = {"image/jpeg": ".jpg", "image/png": ".png",
               "image/webp": ".webp", "image/gif": ".gif"}.get(ctype.split(";")[0], ".jpg")
        name = hashlib.sha1(hit.url.encode()).hexdigest()[:16] + ext
        path = os.path.join(out_dir, name)
        with open(path, "wb") as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        # reject tiny/broken files
        if os.path.getsize(path) < 1024:
            os.remove(path)
            return None
        return path
    except Exception:
        return None


# --------------------------------------------------------------------------
# PUBLIC ENTRYPOINT
# --------------------------------------------------------------------------

def _load_offsets(out_dir: str) -> dict:
    try:
        return json.load(open(os.path.join(out_dir, "_fetch_offset.json")))
    except Exception:
        return {}


def _save_offsets(out_dir: str, offsets: dict):
    try:
        json.dump(offsets, open(os.path.join(out_dir, "_fetch_offset.json"), "w"))
    except Exception:
        pass


def _urls_already_on_disk(out_dir: str) -> set:
    """Collect URLs we've downloaded before (from prior manifests) so re-fetches
    across iterations don't re-count duplicates as 'new'."""
    seen = set()
    m = os.path.join(out_dir, "_manifest.json")
    try:
        prev = json.load(open(m))
        for f in prev.get("files", []):
            if f.get("url"):
                seen.add(f["url"])
    except Exception:
        pass
    return seen


def _query_variations(query: str, base_class: str = "") -> list[str]:
    """Fallback queries: the (possibly specific) query first, then progressively
    broader forms, and ALWAYS the true class name last as a guaranteed anchor.
    base_class is the actual class label (e.g. 'bus') - the most reliable query."""
    q = query.strip()
    variants = [q]
    words = q.split()
    # broaden by dropping trailing qualifier words
    if len(words) > 2:
        variants.append(" ".join(words[:2]))
    # the base class is the safest fallback - it always has results
    bc = base_class.strip().lower()
    if bc:
        variants.append(bc)
        variants.append(f"{bc} photo")
    # de-dup preserving order
    out, seen = [], set()
    for v in variants:
        if v and v not in seen:
            seen.add(v)
            out.append(v)
    return out


def fetch_images(query: str, n: int, out_dir: str, base_class: str = "") -> FetchResult:
    os.makedirs(out_dir, exist_ok=True)
    result = FetchResult(query=query, requested=n, out_dir=out_dir)

    offsets = _load_offsets(out_dir)
    seen_urls = _urls_already_on_disk(out_dir)   # skip anything already fetched
    prior_files = []
    m = os.path.join(out_dir, "_manifest.json")
    try:
        prior_files = json.load(open(m)).get("files", [])
    except Exception:
        pass

    # dataset discovery (references, not downloads) - on the primary query only
    result.dataset_refs = _safe(
        "huggingface", lambda: src_huggingface_datasets(query, n), result)

    # Try the query, then progressively broader variations, until we hit n or
    # run out of things to try. Each (query) tracks its own page offset.
    attempts = _query_variations(query, base_class)
    for attempt in attempts:
        if result.downloaded >= n:
            break
        page_offset = int(offsets.get(attempt, 0))
        for source_name, fn in IMAGE_SOURCES:
            if result.downloaded >= n:
                break
            need = n - result.downloaded
            hits = _safe(source_name,
                         lambda fn=fn, need=need, po=page_offset, a=attempt: fn(a, need, po),
                         result)
            got = 0
            for h in hits:
                if result.downloaded >= n:
                    break
                if h.url in seen_urls:
                    continue
                seen_urls.add(h.url)
                path = _download(h, out_dir)
                if path:
                    result.files.append({"path": path, "url": h.url,
                                         "source": h.source, "license": h.license})
                    result.downloaded += 1
                    got += 1
                time.sleep(0.03)
            if got:
                result.per_source[f"{source_name}:{attempt}"] = got
        offsets[attempt] = page_offset + 1   # advance so next time = fresh page

    _save_offsets(out_dir, offsets)

    if result.downloaded == 0:
        result.errors.append({"source": "all",
                              "error": f"no NEW images found for '{query}' "
                                       f"(tried: {attempts}); source may be exhausted"})

    # manifest = prior files + newly added, so the cumulative dataset is recorded
    result.files = prior_files + result.files
    with open(m, "w", encoding="utf-8") as f:
        json.dump(asdict(result), f, indent=2)

    return result


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print('usage: python scout.py "<query>" <n> <out_dir>')
        raise SystemExit(1)
    q, num, outd = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    res = fetch_images(q, num, outd)
    print(json.dumps({
        "query": res.query,
        "requested": res.requested,
        "downloaded": res.downloaded,
        "per_source": res.per_source,
        "dataset_refs": res.dataset_refs[:3],
        "errors": res.errors,
        "out_dir": res.out_dir,
    }, indent=2))
