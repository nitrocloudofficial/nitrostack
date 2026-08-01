"""
HTTP API for the Radiograph Review Console -- Phase 2.5.

Connects the React console (ui/index.html) to the LangGraph pipeline.
Before this existed the console was a pure client-side mock: it rendered
findings, a report, and approve/reject controls entirely from hardcoded
constants, with no backend of any kind. Every clinical control the
Phase 2 work built -- the PHI gate, RBAC, the audit chain, the verifier
firewall -- was unreachable from the UI.

Design notes:

- **Endpoint handlers are sync (`def`, not `async def`) on purpose.**
  run_case() is CPU-bound and slow (model inference, OCR, retrieval).
  Declaring them sync lets FastAPI run them in its threadpool instead of
  blocking the event loop, which an `async def` wrapping blocking work
  would do.

- **Errors map to status codes by *meaning*, not by convenience.** The
  Phase 2 gates raise distinct exception types precisely so a caller can
  tell "you may not do this" from "this case cannot be processed safely"
  from "the knowledge base has been tampered with". Collapsing them into
  500s would discard that. See _install_exception_handlers().

- **No CORS middleware.** The console is served from this same app, so
  there is no cross-origin need -- and adding permissive CORS to an
  endpoint that runs clinical inference and exposes an audit trail would
  be opening a door nothing is asking for.

Run it:
    uvicorn medagent.api.server:app --reload
    # then open http://127.0.0.1:8000
"""
from __future__ import annotations

import json
import logging
import re
import shutil
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from langgraph.graph.state import CompiledStateGraph
from pydantic import ValidationError

from medagent.agents.orchestrator import build_graph, resume_case, run_case
from medagent.agents.state import PatientMetadata
from medagent.api.schemas import (
    AuditResponse,
    CaseResponse,
    PermissionsResponse,
    PatientMetadataPayload,
    ReviewRequest,
)
from medagent.privacy.deidentify import DEFAULT_CACHE_DIR, PHIDeidentificationError
from medagent.security.artifact_signing import SecurityError
from medagent.security.audit_logger import get_audit_logger, verify_chain
from medagent.security.audit_store import AuditStoreError
from medagent.security.auth import (
    AuthenticationError,
    AuthorizationError,
    describe_permission_matrix,
)

logger = logging.getLogger("medagent.api")

_UI_DIR = Path(__file__).resolve().parents[1] / "ui"
_UPLOAD_DIR = Path("data/uploads")
_GRADCAM_DIR = Path("data/processed/gradcam")
_REGISTRY_PATH = Path("data/case_registry.json")

# case_id goes into filesystem paths (the de-identification cache, the
# Grad-CAM output). Anything outside this alphabet could escape those
# directories, so it is rejected at the edge rather than sanitized
# later -- a rejected identifier is unambiguous, a rewritten one is not.
_SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")

_graph: CompiledStateGraph | None = None


def get_graph() -> CompiledStateGraph:
    """The process-wide compiled graph. Built once: it owns a SQLite
    checkpointer connection that must stay open across the separate
    run_case()/resume_case() calls a human-in-the-loop case spans."""
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


# ─────────────────────────────────────────────────────────────────────
# Case registry -- which case IDs exist
# ─────────────────────────────────────────────────────────────────────
# The checkpointer stores each case's *state* but is not a convenient
# index of "what cases are there", so the console's case list is backed
# by this small JSON file. Deliberately not a database: it holds only
# identifiers the operator already chose, and Phase 3 replaces it along
# with the checkpointer.

def _read_registry() -> list[str]:
    if not _REGISTRY_PATH.exists():
        return []
    try:
        return json.loads(_REGISTRY_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        logger.exception("Case registry at %s is unreadable -- treating as empty", _REGISTRY_PATH)
        return []


def _register_case(case_id: str) -> None:
    cases = _read_registry()
    if case_id not in cases:
        cases.append(case_id)
        _REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
        _REGISTRY_PATH.write_text(json.dumps(cases, indent=2), encoding="utf-8")


# ─────────────────────────────────────────────────────────────────────
# State -> wire mapping
# ─────────────────────────────────────────────────────────────────────

def _validate_case_id(case_id: str) -> str:
    if not _SAFE_ID.match(case_id):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid case_id {case_id!r}: expected letters, digits, dot, dash, or underscore.",
        )
    return case_id


def _asset_paths(case_id: str, state: dict) -> tuple[Path, Path | None]:
    deidentified = Path(DEFAULT_CACHE_DIR) / f"{case_id}_deidentified.png"
    gradcam = state.get("gradcam_heatmap_path")
    return deidentified, Path(gradcam) if gradcam else None


def _derive_status(state: dict, awaiting_review: bool) -> str:
    if awaiting_review:
        return "awaiting_review"
    decision = state.get("human_decision")
    if decision in ("approved", "revised"):
        return "finalized"
    if decision == "rejected":
        return "archived"
    return "unknown"


def _case_response(case_id: str, state: dict, awaiting_review: bool) -> CaseResponse:
    deidentified, gradcam = _asset_paths(case_id, state)
    return CaseResponse(
        case_id=case_id,
        status=_derive_status(state, awaiting_review),
        patient_metadata=state.get("patient_metadata"),
        classification=state.get("classification"),
        detections=state.get("detections") or [],
        diagnosis_findings=state.get("diagnosis_findings"),
        retrieved_evidence=state.get("retrieved_evidence"),
        prior_studies=state.get("prior_studies"),
        draft_report=state.get("draft_report"),
        final_report=state.get("final_report"),
        verification_status=state.get("verification_status"),
        verification_notes=state.get("verification_notes"),
        verification_escalated=bool(state.get("verification_escalated")),
        regeneration_count=state.get("regeneration_count") or 0,
        human_decision=state.get("human_decision"),
        reviewed_by=state.get("reviewed_by"),
        heatmap_bbox_alignment_score=state.get("heatmap_bbox_alignment_score"),
        model_provenance=state.get("model_provenance"),
        has_deidentified_image=deidentified.exists(),
        has_gradcam=bool(gradcam and gradcam.exists()),
        errors=state.get("errors") or [],
    )


def _load_state(case_id: str) -> tuple[dict, bool]:
    """Reads a case's persisted state from the checkpointer. Returns
    (state, awaiting_review); 404s if the thread has no checkpoint."""
    snapshot = get_graph().get_state({"configurable": {"thread_id": case_id}})
    if not snapshot or not snapshot.values:
        raise HTTPException(status_code=404, detail=f"No case found with id {case_id!r}.")
    return dict(snapshot.values), bool(snapshot.next)


# ─────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def _lifespan(_app: FastAPI):
    """
    Boot-time preflight on the retrieval index.

    Purely diagnostic: it changes no behaviour and repairs nothing. The
    per-request gate in rag/vectorstore.py remains the thing that
    actually enforces integrity, and it still fails closed.

    It exists because a signing-key/index mismatch was previously
    invisible until the first case, where it surfaced as a 503 whose
    message ("recorded digests matched but the HMAC did not") reads like
    tampering rather than the configuration drift it usually is. Finding
    that out at boot, with the command to fix it, costs one HMAC check.
    """
    _preflight_faiss_index()
    yield


def _preflight_faiss_index() -> None:
    from medagent.rag.vectorstore import _artifact_paths
    from medagent.security.artifact_signing import verify_artifacts
    from medagent.utils.settings import get_settings

    settings = get_settings()
    index_dir = Path(settings.faiss_index_dir)
    index_path, docstore_path, signature_path = _artifact_paths(index_dir, settings.faiss_index_name)

    if not index_path.exists():
        # No index built yet is a legitimate fresh-environment state:
        # get_vectorstore() serves its in-memory sample index and says so.
        logger.info(
            "Retrieval preflight: no index at %s -- the sample index will be used. "
            "Build the real one with scripts/build_faiss_index.sh", index_path,
        )
        return

    if not settings.faiss_signing_key:
        logger.error(
            "Retrieval preflight: an index exists at %s but FAISS_SIGNING_KEY is not set, so it "
            "cannot be verified. Every case will fail closed at evidence retrieval (503). "
            "Set FAISS_SIGNING_KEY in .env, then run scripts/build_faiss_index.sh",
            index_path,
        )
        return

    try:
        verify_artifacts(
            [index_path, docstore_path], settings.faiss_signing_key.encode("utf-8"), signature_path
        )
    except SecurityError as exc:
        logger.error(
            "Retrieval preflight FAILED: the FAISS index at %s does not verify against the "
            "configured FAISS_SIGNING_KEY. Every case will fail closed at evidence retrieval "
            "(503) until this is resolved.\n"
            "  Detail: %s\n"
            "  If the file digests matched but the HMAC did not, the index was signed with a "
            "different key than this server loads -- rebuild and re-sign them together:\n"
            "    ./scripts/build_faiss_index.sh",
            index_path, exc,
        )
        return

    logger.info("Retrieval preflight: FAISS index at %s verified OK.", index_path)


app = FastAPI(
    title="Radiograph Review Console API",
    description=(
        "HTTP surface for the Autonomous Medical Imaging Diagnosis & Clinical Decision "
        "Agent. Assistive clinical decision support -- every case requires radiologist "
        "sign-off (see docs/regulatory/intended_use.md)."
    ),
    version="0.2.5",
    lifespan=_lifespan,
)


def _install_exception_handlers(application: FastAPI) -> None:
    """Maps the Phase 2 safety gates onto HTTP semantics.

    Each gate raises a distinct type so callers can distinguish refusals
    from failures. A console needs that distinction: "you are not
    permitted to approve" is a message for the current user, whereas
    "the knowledge base failed signature verification" is an operational
    alarm for somebody else entirely.
    """

    @application.exception_handler(AuthenticationError)
    def _unauthenticated(_request, exc: AuthenticationError):
        return JSONResponse(status_code=401, content={"error": "unauthenticated", "detail": str(exc)})

    @application.exception_handler(AuthorizationError)
    def _unauthorized(_request, exc: AuthorizationError):
        return JSONResponse(status_code=403, content={"error": "forbidden", "detail": str(exc)})

    @application.exception_handler(PHIDeidentificationError)
    def _phi_failure(_request, exc: PHIDeidentificationError):
        # 422: the request was well-formed, but this image cannot be
        # processed safely, so the case was halted rather than degraded.
        return JSONResponse(
            status_code=422,
            content={
                "error": "deidentification_failed",
                "detail": str(exc),
                "hint": "The case was halted before any downstream node ran. No data was retained.",
            },
        )

    @application.exception_handler(SecurityError)
    def _integrity_failure(_request, exc: SecurityError):
        # 503, not 500: the service is intact but is refusing to operate
        # on a knowledge base it cannot cryptographically trust. That is
        # an operational condition to be fixed, not a bug in the request.
        logger.error("Artifact integrity failure surfaced to the API: %s", exc)
        return JSONResponse(
            status_code=503,
            content={
                "error": "artifact_integrity_failure",
                "detail": str(exc),
                "hint": "Retrieval index signature verification failed. Re-run rag/ingest.py or restore a signed index.",
            },
        )

    @application.exception_handler(AuditStoreError)
    def _audit_failure(_request, exc: AuditStoreError):
        return JSONResponse(status_code=500, content={"error": "audit_store_error", "detail": str(exc)})


_install_exception_handlers(app)


# ── Static console ───────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def index() -> HTMLResponse:
    index_path = _UI_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Console UI not found.")
    return HTMLResponse(index_path.read_text(encoding="utf-8"))


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "medagent-api", "version": app.version}


# ── RBAC ─────────────────────────────────────────────────────────────

@app.get("/api/auth/permissions", response_model=PermissionsResponse)
def permissions() -> PermissionsResponse:
    """The enforced RBAC matrix, so the console can disable actions a
    role cannot perform instead of offering them and failing at submit.
    This is presentation only -- server-side enforcement in
    human_review_node is what actually protects the decision."""
    return PermissionsResponse(matrix=describe_permission_matrix())


# ── Cases ────────────────────────────────────────────────────────────

@app.get("/api/cases")
def list_cases() -> dict:
    summaries = []
    for case_id in _read_registry():
        try:
            state, awaiting = _load_state(case_id)
        except HTTPException:
            continue  # checkpoint DB was reset; registry entry is stale
        summaries.append({
            "case_id": case_id,
            "status": _derive_status(state, awaiting),
            "patient_id": (state.get("patient_metadata") or {}).get("patient_id"),
            "predicted_class": (state.get("classification") or {}).get("predicted_class"),
        })
    return {"cases": summaries}


@app.post("/api/cases", response_model=CaseResponse)
def submit_case(
    image: UploadFile = File(...),
    case_id: str = Form(...),
    patient_metadata: str = Form(...),
    submitted_by: str | None = Form(default=None),
) -> CaseResponse:
    """
    Submits a study and runs it through the full pipeline, returning the
    state at the point the graph pauses for clinician review.

    `patient_metadata` arrives as a JSON string because this is a
    multipart upload -- a file plus structured fields cannot both be a
    JSON body.

    The uploaded file is written to a temporary path and deleted in a
    `finally` block: de-identification produces its own scrubbed copy
    (privacy/deidentify.py) and that copy is what everything downstream
    uses, so keeping the original around would leave the one
    un-scrubbed artifact in the system sitting on disk indefinitely.
    """
    _validate_case_id(case_id)

    try:
        parsed_metadata = json.loads(patient_metadata)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"patient_metadata is not valid JSON: {exc}",
        ) from exc

    if not isinstance(parsed_metadata, dict):
        raise HTTPException(
            status_code=422,
            detail=(
                f"patient_metadata must be a JSON object with age, sex, view_position and "
                f"patient_id; got {type(parsed_metadata).__name__}."
            ),
        )

    try:
        metadata = PatientMetadataPayload(**parsed_metadata)
    except ValidationError as exc:
        # ValidationError was previously uncaught here, so a payload that
        # was valid JSON but failed the schema -- an empty patient_id,
        # say -- escaped as a bare 500 with a stack trace in the server
        # log and "Internal Server Error" in the browser. A rejected
        # field is a client-correctable condition, not a server fault,
        # and the caller needs to be told WHICH field to fix.
        problems = "; ".join(
            f"{'.'.join(str(p) for p in err['loc']) or 'payload'}: {err['msg']}"
            for err in exc.errors()
        )
        raise HTTPException(
            status_code=422,
            detail=f"patient_metadata failed validation -- {problems}",
        ) from exc
    except TypeError as exc:
        raise HTTPException(
            status_code=422, detail=f"patient_metadata has unexpected fields: {exc}"
        ) from exc

    suffix = Path(image.filename or "upload.png").suffix or ".png"
    _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=_UPLOAD_DIR, suffix=suffix, delete=False) as handle:
        shutil.copyfileobj(image.file, handle)
        upload_path = Path(handle.name)

    try:
        typed_metadata: PatientMetadata = metadata.model_dump()  # type: ignore[assignment]
        result = run_case(
            get_graph(),
            case_id=case_id,
            image_path=str(upload_path),
            patient_metadata=typed_metadata,
            submitted_by=submitted_by,
        )
    finally:
        upload_path.unlink(missing_ok=True)

    _register_case(case_id)
    return _case_response(case_id, dict(result), awaiting_review="__interrupt__" in result)


@app.get("/api/cases/{case_id}", response_model=CaseResponse)
def get_case(case_id: str) -> CaseResponse:
    _validate_case_id(case_id)
    state, awaiting = _load_state(case_id)
    return _case_response(case_id, state, awaiting)


@app.post("/api/cases/{case_id}/review", response_model=CaseResponse)
def review_case(case_id: str, request: ReviewRequest) -> CaseResponse:
    """
    Submits a clinician decision at the human_review gate.

    Authorization is enforced by resume_case() -> _authorize_review()
    before the graph is invoked, so an unauthorized attempt is refused
    (401/403 via the handlers above) without touching the case -- it
    stays open for a properly authorized reviewer, and the refusal is
    recorded in the audit trail.
    """
    _validate_case_id(case_id)
    _load_state(case_id)  # 404 early rather than surfacing a graph error

    result = resume_case(get_graph(), case_id, request.to_resume_payload())
    return _case_response(case_id, dict(result), awaiting_review="__interrupt__" in result)


@app.get("/api/cases/{case_id}/assets/{kind}", include_in_schema=False)
def case_asset(case_id: str, kind: str) -> FileResponse:
    """
    Serves a case's images. Only the DE-IDENTIFIED render and the
    Grad-CAM overlay are exposed -- there is deliberately no route that
    can return the originally uploaded file, which is also why
    submit_case deletes it.
    """
    _validate_case_id(case_id)
    if kind not in ("deidentified", "gradcam"):
        raise HTTPException(status_code=400, detail="kind must be 'deidentified' or 'gradcam'")

    state, _ = _load_state(case_id)
    deidentified, gradcam = _asset_paths(case_id, state)
    path = deidentified if kind == "deidentified" else gradcam

    if not path or not path.exists():
        raise HTTPException(status_code=404, detail=f"No {kind} asset for case {case_id!r}.")
    return FileResponse(path, media_type="image/png")


# ── Audit ────────────────────────────────────────────────────────────

@app.get("/api/audit", response_model=AuditResponse)
def audit_trail(case_id: str | None = None, limit: int = 500) -> AuditResponse:
    """
    The hash-chained audit trail, with its integrity verdict.

    Verification always runs over the FULL trail, even when the response
    is filtered to one case or truncated by `limit` -- the chain is only
    meaningful as a whole sequence, so verifying a filtered subset would
    report a break for every record legitimately absent from the filter.
    The returned `chain_valid` therefore describes the log, not the page.
    """
    # Reads through the SAME AuditLogger the graph nodes write with,
    # rather than resolving the log path independently. Two components
    # each deriving the path separately can silently diverge -- the
    # writer honouring a configured location while the reader shows an
    # empty log from the default one -- and an audit viewer that
    # confidently displays the wrong file is worse than one that fails.
    store = get_audit_logger().store
    records = store.read_all_records()
    result = verify_chain(records)

    visible = [r for r in records if r.get("case_id") == case_id] if case_id else records
    return AuditResponse(
        records=visible[-limit:],
        chain_valid=result.is_valid,
        records_checked=result.records_checked,
        broken_at_index=result.broken_at_index,
        reason=result.reason,
    )


if __name__ == "__main__":
    import uvicorn

    logging.basicConfig(level=logging.INFO)
    uvicorn.run(app, host="127.0.0.1", port=8000)
