"""
FAISS vector store initialization for the ATS/IDSA guideline RAG index.
Loads a persisted index from disk in production; if none exists yet
(fresh dev environment, CI, before rag/ingest.py has been run against
the real guideline PDF), falls back to a small in-memory index built
from sample guideline text so the pipeline still runs end-to-end rather
than crashing.

Persistence format (Phase 2, item 2 -- Strategic_Startup_Roadmap.pdf:
"eliminate unsafe deserialization... use safe, native FAISS I/O methods
rather than pickle"): langchain_community.vectorstores.FAISS's own
save_local()/load_local() write the vector index via faiss.write_index()
(safe) but PICKLE the docstore + index_to_docstore_id mapping into a
companion .pkl file -- load_local() even requires an explicit
allow_dangerous_deserialization=True flag acknowledging that loading it
runs arbitrary code if that file has been tampered with. This module
never calls save_local()/load_local(): save_vectorstore() below writes
the index with faiss.write_index() and the docstore as plain JSON (a
Document is just page_content + metadata -- nothing pickle can do that
JSON can't here), and _load_signed_faiss_index() reads both back with
faiss.read_index() + json.loads() and reconstructs the FAISS object
directly. A persisted index is also cryptographically signed
(security/artifact_signing.py) at write time and verified before a
single byte of it is trusted at load time -- see get_vectorstore().
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

import faiss
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

from medagent.security.artifact_signing import SecurityError, verify_artifacts
from medagent.utils.settings import get_settings

logger = logging.getLogger("medagent.rag.vectorstore")

_SAMPLE_GUIDELINE_CHUNKS = [
    "Pneumonia guidelines: Empiric antibiotic therapy for community-acquired "
    "pneumonia should be guided by severity assessment (e.g. CURB-65) and "
    "local resistance patterns. Amoxicillin is first-line for low-severity, "
    "outpatient-managed cases.",
    "Pneumonia guidelines: Patients with high-severity community-acquired "
    "pneumonia and signs of sepsis should be assessed for ICU admission and "
    "started on combination antibiotic therapy covering atypical organisms.",
    "Fracture guidelines: Suspected long-bone fractures should be immobilized "
    "and radiographically confirmed before weight-bearing is permitted. "
    "Displaced fractures typically require orthopedic referral for reduction.",
    "Fracture guidelines: Stress fractures may not be visible on initial "
    "plain-film radiographs; if clinical suspicion remains high despite a "
    "negative X-ray, MRI or repeat imaging in 1-2 weeks is recommended.",
]

_embeddings: HuggingFaceEmbeddings | None = None
_vectorstore: FAISS | None = None

def get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        settings = get_settings()
        model_name = getattr(settings, "embedding_model", "sentence-transformers/all-MiniLM-L6-v2")
        _embeddings = HuggingFaceEmbeddings(model_name=model_name)
    return _embeddings

def _build_sample_vectorstore() -> FAISS:
    """
    Fail-safe fallback: builds a small in-memory FAISS index from a
    handful of sample guideline chunks. This is NOT a substitute for the
    real ATS/IDSA guideline index -- it exists purely so the pipeline
    runs end-to-end in local dev/testing before rag/ingest.py has been
    pointed at real guideline documents. Never touches disk, so it has
    nothing to sign or verify.
    """
    logger.warning(
        "No persisted FAISS index found on disk -- building a small "
        "in-memory sample index for local testing. Do NOT use this in "
        "production; run rag/ingest.py against the real ATS/IDSA "
        "guideline PDF first."
    )
    return FAISS.from_texts(_SAMPLE_GUIDELINE_CHUNKS, get_embeddings())


def _artifact_paths(index_dir: Path, index_name: str) -> tuple[Path, Path, Path]:
    """(index_path, docstore_path, signature_path) for a given index_dir
    + index_name -- the one place this three-file layout is defined, so
    ingest.py (writer) and this module (reader) can't drift apart."""
    return (
        index_dir / f"{index_name}.faiss",
        index_dir / f"{index_name}_docstore.json",
        index_dir / f"{index_name}.sig",
    )


def save_vectorstore(vectorstore: FAISS, index_dir: Path, index_name: str) -> tuple[Path, Path]:
    """
    Persists `vectorstore` to `index_dir` using ONLY safe, native
    serialization -- see this module's docstring for why. Returns
    (index_path, docstore_path) so the caller (rag/ingest.py) can sign
    exactly those two files immediately afterward.
    """
    index_dir.mkdir(parents=True, exist_ok=True)
    index_path, docstore_path, _ = _artifact_paths(index_dir, index_name)

    faiss.write_index(vectorstore.index, str(index_path))

    # InMemoryDocstore exposes no public "give me everything" accessor
    # (only search-by-id) -- ._dict is its only backing store, and this
    # is the one place in the codebase that needs the whole thing, to
    # export it once at index-build time.
    docstore_payload = {
        "docstore": {
            doc_id: {"page_content": doc.page_content, "metadata": doc.metadata}
            for doc_id, doc in vectorstore.docstore._dict.items()
        },
        "index_to_docstore_id": {str(k): v for k, v in vectorstore.index_to_docstore_id.items()},
    }
    docstore_path.write_text(json.dumps(docstore_payload, indent=2), encoding="utf-8")
    logger.info("Saved FAISS index (%d vectors) to %s", vectorstore.index.ntotal, index_path)
    return index_path, docstore_path


def _load_signed_faiss_index(index_dir: Path, index_name: str) -> FAISS:
    """
    Verifies the signature covering the index + docstore files, THEN
    loads both natively (faiss.read_index() + json.loads(), never
    pickle). Raises SecurityError -- uncaught, by design -- if the key
    is unset or the signature is missing/invalid/tampered; see this
    module's docstring and security/artifact_signing.py.
    """
    settings = get_settings()
    key = settings.faiss_signing_key
    if not key:
        raise SecurityError(
            "FAISS_SIGNING_KEY is not set -- cannot verify the on-disk FAISS index's "
            "signature. Refusing to load an index this system cannot cryptographically "
            "trust. Set FAISS_SIGNING_KEY in .env (see .env.example) to the same value "
            "used when the index was signed (rag/ingest.py -> security/artifact_signing.py)."
        )

    index_path, docstore_path, signature_path = _artifact_paths(index_dir, index_name)
    verify_artifacts([index_path, docstore_path], key.encode("utf-8"), signature_path)

    index = faiss.read_index(str(index_path))
    docstore_payload = json.loads(docstore_path.read_text(encoding="utf-8"))
    docstore = InMemoryDocstore({
        doc_id: Document(page_content=doc["page_content"], metadata=doc["metadata"])
        for doc_id, doc in docstore_payload["docstore"].items()
    })
    index_to_docstore_id = {int(k): v for k, v in docstore_payload["index_to_docstore_id"].items()}

    logger.info("Loaded signature-verified FAISS index from %s (%d vectors)", index_path, index.ntotal)
    return FAISS(
        embedding_function=get_embeddings(),
        index=index,
        docstore=docstore,
        index_to_docstore_id=index_to_docstore_id,
    )


def get_vectorstore() -> FAISS:
    """
    Loads the persisted ATS/IDSA guideline FAISS index from disk. Falls
    back to an in-memory sample index (see _build_sample_vectorstore)
    ONLY if no index file has been built yet at all -- a legitimate
    "fresh environment" state, not a security concern.

    Once an index file DOES exist on disk, every failure from that point
    on -- unset signing key, missing/invalid signature, a tampered
    index or docstore -- raises SecurityError and is NOT caught here.
    Falling back to the sample index in that case would silently swap a
    detected tampering event for "a slightly worse but harmless demo
    index", exactly the kind of quiet failure this signing scheme exists
    to prevent. See evidence_agent_node (agents/evidence_agent.py) for
    how that propagates into a hard halt of the whole case.
    """
    global _vectorstore
    if _vectorstore is not None:
        return _vectorstore

    settings = get_settings()
    index_dir = Path(settings.faiss_index_dir)
    index_name = settings.faiss_index_name
    index_path, _, _ = _artifact_paths(index_dir, index_name)

    if not index_path.exists():
        _vectorstore = _build_sample_vectorstore()
        return _vectorstore

    _vectorstore = _load_signed_faiss_index(index_dir, index_name)
    return _vectorstore
