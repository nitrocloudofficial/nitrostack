"""
Builds the ATS/IDSA guideline FAISS index from a directory of PDFs and
persists it via vectorstore.py's safe (non-pickle) serialization, then
cryptographically signs the result -- Phase 2, item 2
(Strategic_Startup_Roadmap.pdf: "eliminate unsafe deserialization...
implement cryptographic verification for the FAISS artifact").

Run after `pip install -e .` from the repo root:
    python3 -m medagent.rag.ingest <directory_of_guideline_pdfs>

Requires FAISS_SIGNING_KEY to be set (.env) -- the same key
rag/vectorstore.py's get_vectorstore() will use to verify this index
before ever loading it at runtime. Generate one with:
    python3 -c "import secrets; print(secrets.token_hex(32))"
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

from medagent.rag.vectorstore import get_embeddings, save_vectorstore
from medagent.security.artifact_signing import SecurityError, write_signature_file
from medagent.utils.settings import get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("medagent.rag.ingest")

def ingest_documents(directory_path: str) -> None:
    """
    Ingests clinical documents from a directory, splits them into
    manageable chunks, builds a FAISS index, and persists + signs it at
    the location rag/vectorstore.py's get_vectorstore() reads from
    (settings.faiss_index_dir / settings.faiss_index_name).
    """
    dir_path = Path(directory_path)
    if not dir_path.is_dir():
        raise NotADirectoryError(f"Directory not found: {directory_path}")

    settings = get_settings()
    if not settings.faiss_signing_key:
        raise SecurityError(
            "FAISS_SIGNING_KEY is not set -- refusing to build an index that could never "
            "be verified at load time. Set it in .env first (see .env.example)."
        )

    logger.info("Loading documents from %s...", directory_path)
    loader = PyPDFDirectoryLoader(str(dir_path))
    documents = loader.load()

    if not documents:
        logger.warning("No documents found in %s. Exiting ingestion.", directory_path)
        return

    logger.info("Loaded %d pages. Splitting into chunks...", len(documents))
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        length_function=len,
        add_start_index=True,
    )
    chunks = text_splitter.split_documents(documents)
    logger.info("Split documents into %d chunks.", len(chunks))

    # Uses the SAME embedding model/code path as query-time retrieval
    # (rag/vectorstore.py's get_embeddings()) -- ingesting with one
    # embedding model and querying with another would silently produce
    # meaningless similarity scores, not an obvious error.
    logger.info("Building FAISS index...")
    vectorstore = FAISS.from_documents(chunks, get_embeddings())

    index_dir = Path(settings.faiss_index_dir)
    index_name = settings.faiss_index_name

    logger.info("Saving FAISS index to %s...", index_dir)
    index_path, docstore_path = save_vectorstore(vectorstore, index_dir, index_name)

    signature_path = index_dir / f"{index_name}.sig"
    write_signature_file(
        [index_path, docstore_path], settings.faiss_signing_key.encode("utf-8"), signature_path
    )
    logger.info("Signed index -> %s", signature_path)
    logger.info("Ingestion complete.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        ingest_documents(sys.argv[1])
    else:
        print("Usage: python3 -m medagent.rag.ingest <directory_path_to_documents>")
