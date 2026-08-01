"""
Tests for `.env` loading and configuration routing.

These exist because the failures here were all *silent*: configuration
that never applied looked exactly like configuration that did. Nothing
raised, nothing logged -- inference simply went to the wrong host, or a
signing key read as empty, depending on which directory the process
started in. Each test below pins one of those down.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

from medagent.utils.settings import (
    ENV_FILE,
    REPO_ROOT,
    Settings,
    _is_secret_field,
    describe_settings,
)

ENV_EXAMPLE = REPO_ROOT / ".env.example"

# Keys that are legitimately consumed by a vendor SDK from os.environ
# rather than by a Settings field. load_dotenv() in settings.py is what
# makes these reach their library at all.
SDK_CONSUMED = {
    "HF_HOME", "MLFLOW_TRACKING_URI", "MLFLOW_EXPERIMENT_NAME", "DEEPEVAL_API_KEY",
    "STREAMLIT_SERVER_PORT", "STREAMLIT_SERVER_ADDRESS", "HUGGINGFACE_HUB_TOKEN",
    "ANTHROPIC_API_KEY", "OPENAI_API_KEY",
}


def _example_keys() -> list[str]:
    return [m.group(1) for m in re.finditer(r"^([A-Z_][A-Z0-9_]*)=", ENV_EXAMPLE.read_text(), re.M)]


# ── Where .env is resolved from ─────────────────────────────────────

def test_env_file_is_anchored_to_the_repo_root_not_the_cwd():
    """A bare env_file=".env" resolves against the process working
    directory, so running uvicorn or a script from anywhere else loaded
    no configuration at all -- silently."""
    assert ENV_FILE.is_absolute()
    assert ENV_FILE == REPO_ROOT / ".env"


def test_repo_root_actually_contains_the_project():
    """Guards the parents[3] hop in settings.py: if this file ever moves
    deeper or shallower in the tree, REPO_ROOT silently points somewhere
    wrong and every path-based setting goes with it."""
    assert (REPO_ROOT / "pyproject.toml").is_file()
    assert (REPO_ROOT / "src" / "medagent").is_dir()


def test_settings_load_identically_from_an_unrelated_cwd(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert Settings().ollama_base_url == Settings().ollama_base_url
    assert Path(Settings.model_config["env_file"]).is_absolute()


# ── .env.example is a truthful contract ─────────────────────────────

def test_every_documented_key_is_actually_consumed():
    """The header of .env.example promises every key has a consumer.
    20 of them did not: setting OLLAMA_BASE_URL, ANTHROPIC_API_KEY or
    MLFLOW_TRACKING_URI in .env did precisely nothing."""
    fields = {name.upper() for name in Settings.model_fields}
    phantom = [k for k in _example_keys() if k not in fields and k not in SDK_CONSUMED]
    assert phantom == [], f"documented but consumed by nothing: {phantom}"


def test_every_settings_field_is_documented():
    fields = {name.upper() for name in Settings.model_fields}
    undocumented = sorted(fields - set(_example_keys()))
    assert undocumented == [], f"settings fields absent from .env.example: {undocumented}"


def test_example_ships_no_real_credentials():
    """.env.example is committed; .env is not. Every secret field in the
    template must be blank."""
    for line in ENV_EXAMPLE.read_text().splitlines():
        match = re.match(r"^([A-Z_][A-Z0-9_]*)=(.*)$", line)
        if not match:
            continue
        name, raw = match.group(1), match.group(2).split("#")[0].strip()
        if _is_secret_field(name.lower()):
            assert raw == "", f"{name} has a value in the committed template"


def test_env_is_gitignored():
    """The one non-negotiable: .env holds real keys and must never be
    committable."""
    gitignore = (REPO_ROOT / ".gitignore").read_text().splitlines()
    assert ".env" in [line.strip() for line in gitignore]


# ── Routing: values reach the things that use them ──────────────────

def test_ollama_base_url_reaches_the_llm_client(monkeypatch):
    """The headline fix. ChatOllama was constructed without base_url, so
    every agent talked to localhost no matter what was configured."""
    from medagent.llm import loader

    monkeypatch.setenv("OLLAMA_BASE_URL", "http://gpu-node-7.internal:11434")
    loader.get_llm.cache_clear()
    monkeypatch.setattr(loader, "get_settings", lambda: Settings())

    client = loader.get_llm("report_agent")
    assert client.base_url == "http://gpu-node-7.internal:11434"
    loader.get_llm.cache_clear()


def test_offline_mode_blocks_outbound_literature_search():
    """OFFLINE_MODE claimed "agents must not call external network APIs"
    while nothing checked it. It is now a real guard on the only
    outbound caller in the system."""
    from medagent.rag.sources.semantic_scholar import (
        SemanticScholarClient,
        SemanticScholarError,
    )

    client = SemanticScholarClient(allow_network=False)
    with pytest.raises(SemanticScholarError, match="OFFLINE_MODE"):
        client.search("community-acquired pneumonia")


def test_network_can_be_enabled_deliberately():
    from medagent.rag.sources.semantic_scholar import SemanticScholarClient

    assert SemanticScholarClient(allow_network=True).allow_network is True


# ── Diagnostic never leaks secrets ──────────────────────────────────

@pytest.mark.parametrize(
    "field,expected",
    [
        ("faiss_signing_key", True),
        ("anthropic_api_key", True),
        ("huggingface_hub_token", True),
        ("phi_redaction_salt", True),
        ("llm_max_new_tokens", False),   # "token" is a substring of "tokens"
        ("ollama_base_url", False),
        ("audit_log_path", False),
    ],
)
def test_secret_detection_matches_whole_segments(field, expected):
    """Substring matching flagged llm_max_new_tokens as a secret. Masking
    a harmless integer trains the reader to ignore the marker, which is
    how a real secret eventually gets skimmed past."""
    assert _is_secret_field(field) is expected


def test_describe_settings_masks_every_secret_value(monkeypatch):
    monkeypatch.setenv("FAISS_SIGNING_KEY", "super-secret-signing-key-value")
    rows = describe_settings(Settings())

    rendered = " ".join(display for _, display, _ in rows)
    assert "super-secret-signing-key-value" not in rendered

    key_row = next(row for row in rows if row[0] == "FAISS_SIGNING_KEY")
    assert key_row[1] == "set" and key_row[2] is True


def test_describe_settings_distinguishes_set_from_unset(monkeypatch):
    """"set"/"not set" is the whole point -- it answers "did my key load?"
    without printing the key."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    row = next(r for r in describe_settings(Settings()) if r[0] == "ANTHROPIC_API_KEY")
    assert row[1] == "not set"


def test_describe_settings_covers_every_field():
    assert len(describe_settings(Settings())) == len(Settings.model_fields)
