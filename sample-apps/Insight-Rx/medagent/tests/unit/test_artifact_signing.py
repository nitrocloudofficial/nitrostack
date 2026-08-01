"""
Unit tests for security/artifact_signing.py (Phase 2, item 2: HMAC-SHA256
signing/verification for the on-disk FAISS artifact).
"""
from __future__ import annotations

import json

import pytest

from medagent.security.artifact_signing import (
    SecurityError,
    sign_artifacts,
    verify_artifacts,
    write_signature_file,
)

KEY = b"unit-test-signing-key"


def _write(path, content: bytes = b"some artifact bytes"):
    path.write_bytes(content)
    return path


def test_sign_and_verify_round_trip_succeeds(tmp_path):
    artifact = _write(tmp_path / "index.faiss")
    sig_path = tmp_path / "index.sig"

    write_signature_file([artifact], KEY, sig_path)
    verify_artifacts([artifact], KEY, sig_path)  # must not raise


def test_verify_multiple_artifacts_together(tmp_path):
    a = _write(tmp_path / "index.faiss", b"vector data")
    b = _write(tmp_path / "index_docstore.json", b'{"docs": []}')
    sig_path = tmp_path / "index.sig"

    write_signature_file([a, b], KEY, sig_path)
    verify_artifacts([a, b], KEY, sig_path)


def test_verify_fails_after_bit_flip_in_artifact(tmp_path):
    artifact = _write(tmp_path / "index.faiss", b"original content")
    sig_path = tmp_path / "index.sig"
    write_signature_file([artifact], KEY, sig_path)

    data = bytearray(artifact.read_bytes())
    data[0] ^= 0xFF
    artifact.write_bytes(bytes(data))

    with pytest.raises(SecurityError, match="does not match|no longer matches"):
        verify_artifacts([artifact], KEY, sig_path)


def test_verify_fails_when_one_of_two_artifacts_is_tampered(tmp_path):
    """A tamper to JUST the docstore sidecar (not the .faiss binary
    itself) must still be caught -- this is the metadata-tampering case
    from item 2's requirement 4 ("alter the JSON metadata")."""
    a = _write(tmp_path / "index.faiss", b"vector data")
    b = _write(tmp_path / "index_docstore.json", b'{"docs": ["real"]}')
    sig_path = tmp_path / "index.sig"
    write_signature_file([a, b], KEY, sig_path)

    b.write_bytes(b'{"docs": ["real", "injected-malicious-entry"]}')

    with pytest.raises(SecurityError):
        verify_artifacts([a, b], KEY, sig_path)


def test_verify_fails_on_missing_signature_file(tmp_path):
    artifact = _write(tmp_path / "index.faiss")
    missing_sig = tmp_path / "does_not_exist.sig"

    with pytest.raises(SecurityError, match="no signature file found"):
        verify_artifacts([artifact], KEY, missing_sig)


def test_verify_fails_on_missing_artifact_file(tmp_path):
    artifact = tmp_path / "index.faiss"  # never created
    sig_path = tmp_path / "index.sig"
    sig_path.write_text("{}")

    with pytest.raises(SecurityError, match="artifact file missing"):
        verify_artifacts([artifact], KEY, sig_path)


def test_verify_fails_on_malformed_signature_file(tmp_path):
    artifact = _write(tmp_path / "index.faiss")
    sig_path = tmp_path / "index.sig"
    sig_path.write_text("not valid json{{{")

    with pytest.raises(SecurityError, match="malformed"):
        verify_artifacts([artifact], KEY, sig_path)


def test_verify_fails_with_wrong_key(tmp_path):
    """Same untampered file, but the verifying key doesn't match the
    signing key -- e.g. FAISS_SIGNING_KEY drifted between the ingestion
    job and the runtime deployment."""
    artifact = _write(tmp_path / "index.faiss")
    sig_path = tmp_path / "index.sig"
    write_signature_file([artifact], KEY, sig_path)

    with pytest.raises(SecurityError):
        verify_artifacts([artifact], b"a-completely-different-key", sig_path)


def test_verify_fails_with_empty_key(tmp_path):
    artifact = _write(tmp_path / "index.faiss")
    sig_path = tmp_path / "index.sig"
    write_signature_file([artifact], KEY, sig_path)

    with pytest.raises(SecurityError, match="empty key"):
        verify_artifacts([artifact], b"", sig_path)


def test_sign_artifacts_rejects_empty_key(tmp_path):
    artifact = _write(tmp_path / "index.faiss")
    with pytest.raises(SecurityError, match="empty key"):
        sign_artifacts([artifact], b"")


def test_signature_is_deterministic_for_same_content_and_key(tmp_path):
    a = _write(tmp_path / "index.faiss", b"identical content")
    assert sign_artifacts([a], KEY) == sign_artifacts([a], KEY)


def test_signature_changes_if_key_changes(tmp_path):
    a = _write(tmp_path / "index.faiss", b"identical content")
    assert sign_artifacts([a], KEY) != sign_artifacts([a], b"different-key")


def test_signature_file_contents_are_readable_json_with_expected_fields(tmp_path):
    artifact = _write(tmp_path / "index.faiss")
    sig_path = tmp_path / "index.sig"
    write_signature_file([artifact], KEY, sig_path)

    payload = json.loads(sig_path.read_text())
    assert payload["algorithm"] == "HMAC-SHA256"
    assert "signature" in payload
    assert payload["file_digests"] == {"index.faiss": _sha256_hex(artifact.read_bytes())}


def _sha256_hex(data: bytes) -> str:
    import hashlib

    return hashlib.sha256(data).hexdigest()
