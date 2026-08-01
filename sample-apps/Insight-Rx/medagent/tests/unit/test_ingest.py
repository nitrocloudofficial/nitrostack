"""
Unit tests for rag/ingest.py's Phase 2 item 2 guard: refuse to build an
index that could never be verified at load time. The actual safe-
serialization + signing mechanics ingest_documents() delegates to
(save_vectorstore(), write_signature_file()) have their own dedicated
coverage in test_vectorstore_signing.py and test_artifact_signing.py --
this file only covers what's specific to ingest.py itself, since faking
a real PDF corpus here would test langchain's PDF loader, not this
project's code.
"""
from __future__ import annotations

import pytest

import medagent.rag.ingest as ingest_module
from medagent.rag.ingest import ingest_documents
from medagent.security.artifact_signing import SecurityError
from medagent.utils.settings import Settings


def test_ingest_documents_raises_not_a_directory_error_for_missing_directory(tmp_path, monkeypatch):
    fake_settings = Settings(faiss_signing_key="a-real-key")
    monkeypatch.setattr(ingest_module, "get_settings", lambda: fake_settings)

    missing_dir = tmp_path / "does_not_exist"
    with pytest.raises(NotADirectoryError):
        ingest_documents(str(missing_dir))


def test_ingest_documents_refuses_to_build_an_unsignable_index(tmp_path, monkeypatch):
    """FAISS_SIGNING_KEY unset must be caught BEFORE any document
    loading/index building happens -- an index nobody can ever verify
    is worse than no index at all (a silent SecurityError at query
    time, in whatever process happens to load it first)."""
    fake_settings = Settings(faiss_signing_key="")
    monkeypatch.setattr(ingest_module, "get_settings", lambda: fake_settings)

    empty_dir = tmp_path / "pdfs"
    empty_dir.mkdir()  # exists, so this isn't a NotADirectoryError case

    with pytest.raises(SecurityError, match="FAISS_SIGNING_KEY"):
        ingest_documents(str(empty_dir))
