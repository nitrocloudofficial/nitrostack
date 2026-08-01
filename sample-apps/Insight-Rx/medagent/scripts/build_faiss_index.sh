#!/usr/bin/env bash
#
# Build, sign, and verify the ATS/IDSA guideline FAISS index -- one
# atomic command.
#
#   ./scripts/build_faiss_index.sh [guidelines_dir]
#
# WHY THIS EXISTS
#   The index is signed at build time (rag/ingest.py) and verified at
#   load time (rag/vectorstore.py) with the same FAISS_SIGNING_KEY. Those
#   were two separate manual steps, so it was possible to rebuild the
#   index, or rotate the key, and leave the two out of sync. The result
#   is a signature that verifies against nothing: every case then fails
#   closed with a 503 at evidence retrieval, and the error ("recorded
#   digests matched but the HMAC did not") reads like tampering when it
#   is really just drift.
#
#   Doing build -> sign -> verify in one command means this path cannot
#   leave the index in that state: if the freshly built index does not
#   verify with the key that just signed it, this exits non-zero and says
#   so, instead of deferring the discovery to the first patient case.
#
# FAIL-CLOSED: this script never repairs, re-signs around, or otherwise
# works past a verification failure. It reports and exits non-zero.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PYTHON="${PYTHON:-python3}"
if [[ -x ".venv/bin/python3" ]]; then
  PYTHON=".venv/bin/python3"
fi

GUIDELINES_DIR_ARG="${1:-}"

echo "==> Checking configuration"
# Config is read through Settings rather than by parsing .env here, so
# this script and the application can never disagree about which key,
# index directory, or index name is in effect.
eval "$(
  "$PYTHON" - <<'PY'
import shlex
import sys

sys.path.insert(0, "src")
from medagent.utils.settings import get_settings

s = get_settings()
print(f"CFG_KEY_SET={'1' if s.faiss_signing_key else '0'}")
print(f"CFG_KEY_LEN={len(s.faiss_signing_key)}")
print(f"CFG_INDEX_DIR={shlex.quote(s.faiss_index_dir)}")
print(f"CFG_INDEX_NAME={shlex.quote(s.faiss_index_name)}")
print(f"CFG_GUIDELINES_DIR={shlex.quote(s.guidelines_dir)}")
PY
)"

if [[ "$CFG_KEY_SET" != "1" ]]; then
  cat >&2 <<'EOF'
ERROR: FAISS_SIGNING_KEY is not set.

  The index must be signed with a real secret -- rag/vectorstore.py
  refuses to load an index it cannot cryptographically verify, so an
  unsigned index would build fine and then 503 every case.

  Generate one and put it in .env (never in .env.example):

    python3 -c "import secrets; print(secrets.token_hex(32))"

EOF
  exit 1
fi
echo "    FAISS_SIGNING_KEY: set (${CFG_KEY_LEN} chars)"

GUIDELINES_DIR="${GUIDELINES_DIR_ARG:-$CFG_GUIDELINES_DIR}"
echo "    guidelines dir   : ${GUIDELINES_DIR}"
echo "    index dir        : ${CFG_INDEX_DIR}"
echo "    index name       : ${CFG_INDEX_NAME}"

if [[ ! -d "$GUIDELINES_DIR" ]] || ! compgen -G "${GUIDELINES_DIR}/*.pdf" >/dev/null; then
  cat >&2 <<EOF

ERROR: no source PDFs found in ${GUIDELINES_DIR}

  Populate it first:
    python3 scripts/ingest_guidelines.py

  Rebuilding from source is deliberately the only path here. Re-signing
  an existing index would attest bytes whose provenance this script
  cannot establish: matching digests only prove the files agree with the
  signature file sitting beside them, which anyone replacing all three
  could also arrange.

EOF
  exit 1
fi

echo
echo "==> Building and signing the index (rag/ingest.py)"
"$PYTHON" -m medagent.rag.ingest "$GUIDELINES_DIR"

echo
echo "==> Verifying the signature just written"
"$PYTHON" - <<'PY'
import sys
from pathlib import Path

sys.path.insert(0, "src")
from medagent.security.artifact_signing import SecurityError, verify_artifacts
from medagent.utils.settings import get_settings

s = get_settings()
index_dir = Path(s.faiss_index_dir)
name = s.faiss_index_name
index_path = index_dir / f"{name}.faiss"
docstore_path = index_dir / f"{name}_docstore.json"
signature_path = index_dir / f"{name}.sig"

try:
    verify_artifacts(
        [index_path, docstore_path], s.faiss_signing_key.encode("utf-8"), signature_path
    )
except SecurityError as exc:
    print(f"\nSIGNATURE VERIFICATION FAILED:\n  {exc}\n", file=sys.stderr)
    raise SystemExit(1)

print(f"    OK: {index_path.name} + {docstore_path.name} verify against {signature_path.name}")
PY

echo
echo "==> Loading the index through the application's own code path"
# Verifying the files directly is not the same as proving the app can
# load them: get_vectorstore() re-runs verification and then actually
# reconstructs the index, which is what a real case does.
"$PYTHON" - <<'PY'
import logging
import sys

sys.path.insert(0, "src")
logging.disable(logging.WARNING)
from medagent.rag.vectorstore import get_vectorstore

vs = get_vectorstore()
print(f"    OK: loaded {vs.index.ntotal} vectors via get_vectorstore()")
PY

echo
echo "Done. Index built, signed, and verified green."
