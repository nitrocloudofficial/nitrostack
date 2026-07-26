"""Utility helper functions for Explorer Agent."""

import hashlib
import re
from urllib.parse import urlparse, urlunparse


def sanitize_filename(name: str) -> str:
    """Sanitize string for use as a file name."""
    clean = re.sub(r'[^\w\-_.]', '_', name)
    return re.sub(r'_+', '_', clean).strip('_')


def normalize_url(url: str) -> str:
    """Normalize URL by stripping trailing slashes, fragments, and sorting query parameters."""
    parsed = urlparse(url)
    # Strip trailing slash from path unless it's root
    path = parsed.path.rstrip('/') if parsed.path != '/' else '/'
    normalized = urlunparse((
        parsed.scheme.lower(),
        parsed.netloc.lower(),
        path,
        parsed.params,
        parsed.query,
        ""  # Strip fragment #
    ))
    return normalized


def compute_element_hash(tag_name: str, selector: str, text: str = "") -> str:
    """Generate deterministic hash identifier for a UI element."""
    raw = f"{tag_name}:{selector}:{text.strip()}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()[:16]


def is_same_domain(url1: str, url2: str) -> bool:
    """Check if two URLs belong to the same domain."""
    return urlparse(url1).netloc.lower() == urlparse(url2).netloc.lower()
