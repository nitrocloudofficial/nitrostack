"""
Centralized ChatOllama factory -- one place that maps each agent role to
its model name, temperature, and max-token budget (settings.py /
.env-overridable), so swapping a model is a config change, not an edit
scattered across four agent files each hardcoding
`ChatOllama(model="llama3.1", ...)` independently.

Scope, deliberately: this factory is Ollama-only, matching the project's
actual local-first deployment target today. configs/model_config.yaml's
llms: section describes a richer routing -- per-role *provider* choice
(some profiles there are huggingface/anthropic, not ollama) plus cloud
fallbacks -- that this module does NOT implement. The model names below
are chosen to honor that file's *intent* (e.g. verifier_agent
deliberately uses a different model than report_agent, to avoid
self-grading bias) using tags that are actually valid to `ollama pull`,
which model_config.yaml's HuggingFace-style model_name strings (e.g.
"Qwen/Qwen2.5-7B-Instruct" for verifier_llm) are not -- feeding one of
those straight to ChatOllama would fail at first real invocation, not
at load time. Multi-provider routing is a natural extension of this
same choke point later, not something to fake here.

diagnosis_agent.py's LLM_BACKEND toggle (ollama vs. a self-hosted HF
TGI endpoint) is unrelated to this factory and stays where it is --
this module only owns the Ollama branch's model selection.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from typing import Literal

from langchain_ollama import ChatOllama

from medagent.utils.settings import get_settings

logger = logging.getLogger("medagent.llm.loader")

AgentName = Literal["diagnosis_agent", "evidence_agent", "report_agent", "verifier_agent"]

# agent_name -> (settings model-name field, settings temperature field)
_ROLE_CONFIG: dict[AgentName, tuple[str, str]] = {
    "diagnosis_agent": ("diagnosis_llm_model", "diagnosis_llm_temperature"),
    # evidence_agent has no live LLM call today (evidence_agent.py is pure
    # FAISS retrieval) -- agent_config.yaml documents a future
    # retrieval_llm role for query rewriting; this entry exists so that
    # role has somewhere to plug in later without touching this table.
    "evidence_agent": ("evidence_llm_model", "evidence_llm_temperature"),
    "report_agent": ("report_llm_model", "report_llm_temperature"),
    "verifier_agent": ("verifier_llm_model", "verifier_llm_temperature"),
}


@lru_cache(maxsize=None)
def get_llm(agent_name: AgentName, **overrides) -> ChatOllama:
    """
    Returns a ChatOllama instance configured for `agent_name`'s role.

    `overrides` accepts any additional ChatOllama constructor kwarg
    (e.g. `format="json"` for verifier_agent's structured JSON mode),
    layered on top of the role's configured model/temperature.

    Cached per (agent_name, overrides) combination, so repeated calls
    (e.g. once per graph node execution) reuse the same client instance
    instead of reconstructing one every time -- the same pattern
    diagnosis_agent.py's own _get_diagnosis_chain() already used before
    this factory existed.
    """
    if agent_name not in _ROLE_CONFIG:
        raise ValueError(f"Unknown agent_name={agent_name!r}; expected one of {list(_ROLE_CONFIG)}")

    settings = get_settings()
    model_field, temperature_field = _ROLE_CONFIG[agent_name]
    model_name = getattr(settings, model_field)
    temperature = getattr(settings, temperature_field)

    logger.info(
        "get_llm(%r): model=%r temperature=%.2f base_url=%r%s",
        agent_name, model_name, temperature, settings.ollama_base_url,
        f" overrides={overrides}" if overrides else "",
    )

    # base_url is passed explicitly rather than left to ChatOllama's
    # own default. Without it, OLLAMA_BASE_URL in .env was inert: every
    # agent silently talked to localhost regardless of what the operator
    # configured -- the kind of misconfiguration that looks like it
    # worked right up until inference is meant to land on another host.
    return ChatOllama(
        model=model_name,
        temperature=temperature,
        base_url=settings.ollama_base_url,
        num_predict=settings.llm_max_new_tokens,
        **overrides,
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    for name in ("diagnosis_agent", "evidence_agent", "report_agent", "verifier_agent"):
        llm = get_llm(name)
        print(f"{name}: model={llm.model!r} temperature={llm.temperature!r}")
    verifier_json = get_llm("verifier_agent", format="json")
    print(f"verifier_agent (json mode): format={verifier_json.format!r}")
