"""
Session-wide pytest bootstrap.

Two concerns live here, both of which must apply to the whole session
rather than to individual test files.

1. EasyOCR/faiss load ordering (module-level, below). Forces EasyOCR's
   torch model to load before `faiss` is ever imported anywhere in the
   test session. On this environment (faiss-cpu + torch + easyocr,
   macOS/Apple Silicon), constructing EasyOCR's reader AFTER `faiss` has
   already been imported into the process reliably segfaults the
   interpreter -- a native OpenMP/BLAS threading conflict between
   faiss-cpu and torch, not a bug in this project's own code (see
   tests/integration/test_evidence_security_gate.py's docstring for the
   investigation that isolated this).

   This never happens in production: the real LangGraph pipeline always
   runs deidentify_node (which constructs EasyOCR's reader) as the
   graph's very first node, before evidence_agent_node ever gets a
   chance to import `faiss` (transitively, via rag/vectorstore.py).
   pytest guarantees a root-level conftest.py is imported before any
   test module is collected, so this import-time warm-up restores that
   same ordering for the test session however pytest orders collection.

2. Audit-log isolation (the autouse fixture below). Every test that runs
   the graph writes audit records, and without this they would append to
   the real data/audit_log.jsonl -- polluting a clinical audit trail
   with test cases, which is exactly the kind of thing that log exists
   to be trustworthy about.
"""
import pytest

from medagent.privacy.ocr_redaction import _get_reader

_get_reader()


@pytest.fixture(autouse=True)
def audit_log(tmp_path, monkeypatch):
    """
    Points the process-wide audit logger at a per-test throwaway file
    and yields that path, so tests can assert against it.

    security/audit_logger.py is the ONLY module that imports
    get_settings lazily (inside its functions) rather than binding it at
    import time -- every other consumer captured its own reference when
    it was imported. That makes patching the settings module here a
    precise way to redirect the audit log without disturbing any other
    setting for any other module.
    """
    import medagent.security.audit_logger as audit_logger_module
    from medagent.utils.settings import Settings

    path = tmp_path / "audit_log.jsonl"
    audit_logger_module.get_audit_logger.cache_clear()
    monkeypatch.setattr(
        "medagent.utils.settings.get_settings", lambda: Settings(audit_log_path=str(path))
    )
    yield path
    audit_logger_module.get_audit_logger.cache_clear()
