"""
Centralized settings for the clinical decision pipeline, loaded from
`.env` via pydantic-settings. Every module reads config through
get_settings() rather than os.environ directly, so there is exactly
one place that defines defaults before a case ever touches PHI.

Two things about how `.env` is loaded are deliberate and were both
previously wrong:

1. **The path is anchored to the repo root, not the process CWD.**
   pydantic-settings resolves a bare `env_file=".env"` relative to
   wherever the process happens to have been started. That silently
   loaded nothing whenever the app ran from anywhere else -- `uvicorn`
   from a parent directory, a script invoked by absolute path, an
   editor's run button -- and the failure mode is the worst kind: no
   error, just defaults quietly replacing your configuration.

2. **`.env` is also loaded into os.environ (load_dotenv below).**
   Pydantic only populates the fields declared on this class. But a
   large share of this project's real API configuration is consumed by
   third-party SDKs that read their own standard environment variables
   directly -- mlflow (MLFLOW_TRACKING_URI), huggingface_hub
   (HUGGINGFACE_HUB_TOKEN, HF_HOME), anthropic (ANTHROPIC_API_KEY),
   openai (OPENAI_API_KEY), streamlit (STREAMLIT_*). Without this call
   those keys sat in `.env` doing nothing at all. `override=False` so a
   variable already exported in the real environment still wins, which
   is what CI and container deployments expect.

Inspect the resolved configuration, with secrets masked:
    python3 -m medagent.utils.settings
"""
from __future__ import annotations

import functools
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# settings.py -> utils -> medagent -> src -> <repo root>
REPO_ROOT = Path(__file__).resolve().parents[3]
ENV_FILE = REPO_ROOT / ".env"

load_dotenv(ENV_FILE, override=False)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    # --- App / runtime ---
    app_env: Literal["development", "staging", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    random_seed: int = 42
    # Enforced as a real network guard, not documentation: see
    # rag/sources/semantic_scholar.py, the only component in this system
    # that makes an outbound call. Keeping it true is what keeps patient
    # data inside the deploying institution (REG-002 section 1.2).
    offline_mode: bool = True

    llm_backend: str = "ollama"
    ollama_model: str = "llama3.1:8b"     # generic fallback; per-agent fields below take precedence -- see llm/loader.py
    # The actual Ollama endpoint every agent's LLM call is routed to
    # (llm/loader.py). Point this at a remote host to run inference off
    # this machine.
    ollama_base_url: str = "http://localhost:11434"
    llm_max_new_tokens: int = 512

    # Adjusted to a plain file path to avoid sqlite3 connection string errors
    checkpoint_db_path: str = "checkpoints.db"

    # --- Per-agent LLM routing (llm/loader.py::get_llm()) ---
    # Model *names* here are Ollama tags (whatever `ollama pull <tag>` has
    # actually been run) -- keep them in sync with what's pulled locally.
    # configs/model_config.yaml's llms: section describes a richer intended
    # routing (including non-Ollama providers, e.g. verifier_llm's
    # HuggingFace bitsandbytes profile, and cloud fallbacks) that
    # llm/loader.py doesn't implement yet -- see its module docstring.
    diagnosis_llm_model: str = "qwen2.5:14b-instruct"
    diagnosis_llm_temperature: float = 0.2
    evidence_llm_model: str = "qwen2.5:7b-instruct"
    evidence_llm_temperature: float = 0.0
    report_llm_model: str = "llama3.1:8b-instruct"
    report_llm_temperature: float = 0.3
    # Deliberately NOT report_llm_model -- a verifier grading its own
    # generator's output with the same model risks self-grading bias
    # (agent_config.yaml's own guardrail for this agent).
    verifier_llm_model: str = "qwen2.5:7b-instruct"
    verifier_llm_temperature: float = 0.0

    # --- AI Perception Layer (vision/) ---
    # "auto" resolves to cuda > mps > cpu at runtime; force a specific backend
    # (e.g. for a CUDA-only deployment target) by setting DEVICE explicitly.
    device: Literal["auto", "cpu", "cuda", "mps"] = "auto"

    # torchxrayvision weight identifier for the DenseNet-121 backbone -- see
    # https://github.com/mlmed/torchxrayvision for the full catalogue.
    # "-all" is trained across NIH/PadChest/CheXpert/MIMIC/Kaggle-RSNA and
    # covers 18 pathologies (not just pneumonia), giving a meaningful signal
    # for state.py's "Other Abnormality" bucket as well as "Lung Opacity".
    vision_weights_id: str = "densenet121-res224-all"
    vision_input_size: int = 224
    # None = torchxrayvision's own default cache dir (~/.torchxrayvision).
    vision_cache_dir: str | None = None

    # Fine-tuned checkpoint paths -- see vision/models/*.py. Absent by
    # default (Phase 1 training hasn't produced these yet); each loader logs
    # a loud warning and degrades to pretrained/random weights when missing.
    classifier_checkpoint_path: str = "./models/checkpoints/pneumonet_cxr_v2_3.pt"
    detector_checkpoint_path: str = "./models/checkpoints/detector_frcnn_r50.pt"

    detector_score_threshold: float = 0.5
    detector_nms_iou_threshold: float = 0.4
    detector_max_detections: int = 10

    gradcam_output_dir: str = "./data/processed/gradcam"

    # --- RAG / Vector Store (FAISS) -- Phase 2 item 2 ---
    faiss_index_dir: str = "./vectorstore/faiss_index"
    faiss_index_name: str = "medagent_guidelines"
    # Shared HMAC-SHA256 secret between rag/ingest.py (signs the index
    # after building it) and rag/vectorstore.py (verifies before
    # loading) -- see security/artifact_signing.py. Blank by default so
    # a missing key fails LOUD (SecurityError) rather than silently
    # signing/verifying with an empty, guessable key.
    faiss_signing_key: str = ""

    # --- Audit trail (security/audit_logger.py) -- Phase 2 item 3 ---
    audit_log_path: str = "data/audit_log.jsonl"

    # --- Datasets (Phase 2.5) ---
    # Where the real RSNA Pneumonia Detection Challenge data lives, once
    # scripts/ingest_real_rsna.py has populated it. Point this at
    # data/synthetic_rsna to run the harness against generated data
    # instead -- evaluation/dataset_split.py's is_synthetic_dataset()
    # detects which it is and the Model Card watermarks itself
    # accordingly, so the two cannot be confused in reporting.
    rsna_data_dir: str = "data/rsna"
    splits_dir: str = "data/splits"
    guidelines_dir: str = "data/guidelines"

    # --- Semantic Scholar (rag/sources/semantic_scholar.py) ---
    # Optional: the public API works unauthenticated at a low rate limit.
    semantic_scholar_api_key: str = ""
    semantic_scholar_base_url: str = "https://api.semanticscholar.org/graph/v1"

    # --- Third-party provider credentials ---
    # These are declared here so `python3 -m medagent.utils.settings` can
    # report whether they are set, but this project's own code does not
    # read them: each is consumed by its vendor SDK straight from
    # os.environ, which load_dotenv() above is what actually populates.
    # Declaring them without that call would have been the same silent
    # no-op this module used to have.
    anthropic_api_key: str = ""          # consumed by: anthropic SDK (DeepEval judge)
    openai_api_key: str = ""             # consumed by: openai SDK
    huggingface_hub_token: str = ""      # consumed by: huggingface_hub
    deepeval_api_key: str = ""           # consumed by: deepeval (optional cloud sync)

    # --- MCP / PACS bridge (Phase 3 item 1) ---
    # The NitroStack MCP server is a separate Node process this agent
    # speaks to over STDIO (integration/mcp_client.py). Paths are
    # relative to the repo root unless absolute.
    mcp_server_dir: str = "mcp_server"
    mcp_server_command: str = "node"
    mcp_server_entrypoint: str = "dist/index.js"
    # Startup + per-call ceiling. A PACS that never answers must not hang
    # a clinical case indefinitely -- the client fails and the caller
    # degrades, matching how every other retrieval path here behaves.
    mcp_timeout_seconds: int = 30

    # --- Experiment tracking ---
    # mlflow reads MLFLOW_TRACKING_URI from os.environ itself; declared
    # here for the same reporting reason as the credentials above.
    mlflow_tracking_uri: str = "./mlruns"
    mlflow_experiment_name: str = "medagent-hackathon"

@functools.lru_cache
def get_settings() -> Settings:
    return Settings()


# Field names whose values must never be printed. Matched against whole
# underscore-separated segments rather than as substrings: substring
# matching flags `llm_max_new_tokens` (because "token" is inside
# "tokens") and masking a harmless integer trains the reader to ignore
# the marker, which is how a real secret eventually gets skimmed past.
# Segment matching still catches any future *_api_key / *_token field
# automatically, so the safe behaviour remains the default one.
_SECRET_SEGMENTS = frozenset({"key", "token", "secret", "password", "salt", "credential"})


def _is_secret_field(name: str) -> bool:
    return bool(_SECRET_SEGMENTS.intersection(name.lower().split("_")))


def describe_settings(settings: Settings | None = None) -> list[tuple[str, str, bool]]:
    """
    The resolved configuration as (ENV_VAR, display_value, is_secret),
    with every secret masked to just "set"/"not set".

    Exists because the failure this module used to have was invisible:
    configuration that silently didn't apply looks exactly like
    configuration that did. Being able to print what actually resolved
    is the difference between diagnosing that in seconds and not at all.
    """
    settings = settings or get_settings()
    rows: list[tuple[str, str, bool]] = []
    for name in Settings.model_fields:
        value = getattr(settings, name)
        is_secret = _is_secret_field(name)
        display = ("set" if str(value) else "not set") if is_secret else repr(value)
        rows.append((name.upper(), display, is_secret))
    return rows


if __name__ == "__main__":
    import os

    print(f"\n.env file:  {ENV_FILE}")
    print(f"  exists:   {ENV_FILE.exists()}")
    if ENV_FILE.exists():
        print(f"  size:     {ENV_FILE.stat().st_size} bytes")
    print(f"  repo root:{REPO_ROOT}")
    print(f"  cwd:      {os.getcwd()}")
    print("\nResolved configuration (secrets masked):\n")

    for env_var, display, is_secret in describe_settings():
        marker = "  [secret]" if is_secret else ""
        print(f"  {env_var:<32} {display}{marker}")

    print(
        "\nNote: values shown are what this project's own code reads. Vendor SDKs "
        "(mlflow, huggingface_hub, anthropic, openai) read their own variables from "
        "os.environ, which .env populates via load_dotenv() in this module.\n"
    )