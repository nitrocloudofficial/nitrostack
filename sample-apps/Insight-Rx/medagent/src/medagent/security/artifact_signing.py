"""
Cryptographic signing for on-disk retrieval artifacts -- Phase 2, item 2
(Strategic_Startup_Roadmap.pdf: "eliminate unsafe deserialization in the
evidence retrieval system, implement cryptographic verification for the
FAISS artifact").

The FAISS index this project's Evidence Agent loads at startup is just a
file on disk. Anyone who can write to that path -- a compromised
dependency, a bad deploy, an attacker with filesystem access -- can
replace it, and the loader would have no way to know. Signing closes
that gap: rag/ingest.py signs the index right after building it, and
rag/vectorstore.py verifies the signature before trusting a single byte
of it, using the same shared secret (FAISS_SIGNING_KEY) on both ends.

This is HMAC, not a public-key signature -- deliberately, since both the
signer (the offline ingestion job) and the verifier (this same
deployment, at runtime) hold the same key already; there's no third
party that needs to verify authenticity without being able to also
forge it. A stolen FAISS_SIGNING_KEY defeats this the same way a stolen
private key would defeat RSA/Ed25519 here -- treat it like any other
production secret (see .env.example).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from pathlib import Path

logger = logging.getLogger("medagent.security.artifact_signing")

SIGNATURE_ALGORITHM = "HMAC-SHA256"

_CHUNK_SIZE = 1024 * 1024  # stream the digest so multi-hundred-MB indexes never load whole into memory


class SecurityError(Exception):
    """Raised when a signed artifact's signature is missing, malformed,
    or doesn't match its current contents -- i.e. the artifact cannot be
    cryptographically trusted. Callers (rag/vectorstore.py) MUST NOT
    catch this broadly and fall back to loading the artifact anyway or
    substituting a different one -- that would silently paper over a
    detected tampering event. It must propagate and halt, the same way
    privacy/deidentify.py's PHIDeidentificationError halts a case whose
    PHI redaction can't be guaranteed."""


def _file_digest(path: Path) -> str:
    """SHA-256 hex digest of a file's raw bytes, streamed in chunks."""
    hasher = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(_CHUNK_SIZE), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def _file_digests(paths: list[Path]) -> dict[str, str]:
    """{filename: sha256} for every path, sorted by name so the result
    (and anything derived from it) doesn't depend on argument order."""
    return dict(sorted((p.name, _file_digest(p)) for p in paths))


def sign_artifacts(paths: list[Path], key: bytes) -> str:
    """
    Computes an HMAC-SHA256 signature over `paths` (typically the
    .faiss index file and its JSON docstore sidecar), keyed by `key`.

    The signed payload is each file's NAME (not full path -- so a
    signature survives the repo being checked out somewhere else) paired
    with its own SHA-256 digest: changing even one byte anywhere in any
    of `paths` changes that file's digest, which changes the payload,
    which changes the HMAC. Returns the signature as a hex string.
    """
    if not key:
        raise SecurityError("sign_artifacts() called with an empty key -- refusing to sign with no real secret.")
    payload = json.dumps(_file_digests(paths), separators=(",", ":"), sort_keys=True).encode("utf-8")
    return hmac.new(key, payload, hashlib.sha256).hexdigest()


def write_signature_file(paths: list[Path], key: bytes, signature_path: Path) -> None:
    """Signs `paths` and writes the signature -- plus the algorithm name
    and each file's own digest, for a readable tamper report on
    mismatch -- to `signature_path` as JSON."""
    signature_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "algorithm": SIGNATURE_ALGORITHM,
        "signature": sign_artifacts(paths, key),
        "file_digests": _file_digests(paths),
    }
    signature_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    logger.info("Wrote signature for %d artifact(s) to %s", len(paths), signature_path)


def verify_artifacts(paths: list[Path], key: bytes, signature_path: Path) -> None:
    """
    Recomputes the HMAC-SHA256 signature over `paths` and compares it
    (constant-time) against what's recorded in `signature_path`.

    Called BEFORE an artifact is loaded into memory (see
    rag/vectorstore.py's get_vectorstore()) -- verification, not
    cleanup, so nothing downstream ever sees a byte of an artifact that
    fails this check.

    Raises SecurityError if:
      - `key` is empty (nothing meaningful to verify against),
      - any of `paths` is missing,
      - `signature_path` is missing, unreadable, or malformed,
      - the file digests recorded in `signature_path` don't match the
        artifacts' actual current digests (tampering/corruption of the
        file contents), or
      - the recomputed HMAC doesn't match the recorded signature
        (tampering with the signature file itself, or a key mismatch).
    """
    if not key:
        raise SecurityError(
            "verify_artifacts() called with an empty key -- cannot verify a signature "
            "without the real signing secret (FAISS_SIGNING_KEY)."
        )

    for path in paths:
        if not path.exists():
            raise SecurityError(f"Cannot verify signature: artifact file missing: {path}")

    if not signature_path.exists():
        raise SecurityError(
            f"Cannot verify signature: no signature file found at {signature_path}. An index "
            f"file present on disk without a signature is untrusted -- sign it first "
            f"(security/artifact_signing.py:write_signature_file, run automatically by "
            f"rag/ingest.py)."
        )

    try:
        recorded = json.loads(signature_path.read_text(encoding="utf-8"))
        recorded_signature = recorded["signature"]
        recorded_digests = recorded["file_digests"]
    except (json.JSONDecodeError, KeyError, OSError) as exc:
        raise SecurityError(f"Signature file {signature_path} is malformed: {exc}") from exc

    actual_digests = _file_digests(paths)
    if actual_digests != recorded_digests:
        mismatched = sorted(
            name for name in actual_digests
            if actual_digests.get(name) != recorded_digests.get(name)
        )
        raise SecurityError(
            f"Signature verification FAILED: file content no longer matches what was signed "
            f"for {mismatched} -- this artifact was modified after signing (tampering, "
            f"corruption, or an out-of-band edit). Refusing to load."
        )

    expected_signature = sign_artifacts(paths, key)
    if not hmac.compare_digest(expected_signature, recorded_signature):
        raise SecurityError(
            f"Signature verification FAILED for {[p.name for p in paths]}: recorded digests "
            f"matched but the HMAC itself did not -- the signature file was tampered with, or "
            f"was signed with a different key. Refusing to load."
        )

    logger.info("Signature verified OK for %d artifact(s)", len(paths))


if __name__ == "__main__":
    import tempfile

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        artifact = tmp_dir / "demo.bin"
        artifact.write_bytes(b"not a real FAISS index, just a signing demo")
        sig_path = tmp_dir / "demo.sig"
        demo_key = b"demo-signing-key-do-not-use-in-production"

        write_signature_file([artifact], demo_key, sig_path)
        print("Signed. Verifying untampered artifact...")
        verify_artifacts([artifact], demo_key, sig_path)
        print("OK: signature verified.")

        print("Tampering with the artifact...")
        artifact.write_bytes(b"TAMPERED not a real FAISS index, just a signing demo")
        try:
            verify_artifacts([artifact], demo_key, sig_path)
            print("BUG: tampering was not detected!")
        except SecurityError as exc:
            print(f"OK: tampering correctly detected and rejected:\n  {exc}")
