"""
FORAY — provider shim.

One function, `structured()`, that returns a validated dict from whichever
LLM provider is configured. The agents call this and do not know or care
who answers.

    FORAY_LLM_PROVIDER = gemini | anthropic | groq | openrouter
                       | together | openai | custom | none

Why a shim rather than calling a vendor SDK inline:

  * We are on a free tier. If it rate-limits at 3am, switching provider is
    an env var, not a code edit under time pressure.
  * The agents already validate everything they get back (taxonomy
    membership, verbatim quotes, prerequisite membership). Those checks are
    the real contract — the provider is an implementation detail.
  * `/core/` still contains no model calls of any kind. Unchanged.

CONFIG — put ONE of these in .env:

    # Google AI Studio — free tier, no card. aistudio.google.com/apikey
    FORAY_LLM_PROVIDER=gemini
    GEMINI_API_KEY=...
    FORAY_LLM_MODEL=gemini-2.5-flash        # or gemini-2.5-flash-lite

    # Anthropic
    FORAY_LLM_PROVIDER=anthropic
    ANTHROPIC_API_KEY=sk-ant-...
    FORAY_LLM_MODEL=claude-opus-5

    # Groq — free tier, no OpenAI account needed. The base URL is built in.
    FORAY_LLM_PROVIDER=groq
    GROQ_API_KEY=gsk_...
    FORAY_LLM_MODEL=llama-3.3-70b-versatile

    # Also built in: openrouter, together, openai. Or point anywhere:
    #   FORAY_LLM_PROVIDER=custom
    #   FORAY_LLM_BASE_URL=http://localhost:8080/v1
    #   FORAY_LLM_API_KEY=whatever

These providers speak OpenAI's wire format, so the `openai` SDK drives
them. That is a protocol detail, not a dependency on OpenAI — you never
need an OpenAI account or an OPENAI_* variable. FORAY_LLM_API_KEY works
for every provider if you would rather set one name and forget it.

Leave FORAY_LLM_PROVIDER unset (or =none) and every agent uses its
deterministic offline path. That is a supported state, not a broken one.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Optional

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:                                   # pragma: no cover
    pass

DEFAULT_MODELS = {
    "gemini": "gemini-3.5-flash-lite",
    "anthropic": "claude-opus-5",
    "groq": "llama-3.3-70b-versatile",
    "openrouter": "meta-llama/llama-3.3-70b-instruct:free",
    "openai": "gpt-4o-mini",
}

# Providers that speak OpenAI's wire format. Naming a provider here means
# you do NOT need an OpenAI account or an OPENAI_* variable — you just set
# FORAY_LLM_PROVIDER=groq and give it your Groq key.
OPENAI_COMPATIBLE = {
    "groq": "https://api.groq.com/openai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "together": "https://api.together.xyz/v1",
    "openai": None,                    # the real OpenAI; SDK default URL
    "custom": None,                    # bring your own FORAY_LLM_BASE_URL
}

# Which env var holds the key, per provider. FORAY_LLM_API_KEY always wins,
# so you never have to remember these.
_KEY_VARS = {
    "gemini": ("GEMINI_API_KEY", "GOOGLE_API_KEY"),
    "anthropic": ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"),
    "groq": ("GROQ_API_KEY", "OPENAI_API_KEY"),
    "openrouter": ("OPENROUTER_API_KEY", "OPENAI_API_KEY"),
    "together": ("TOGETHER_API_KEY", "OPENAI_API_KEY"),
    "openai": ("OPENAI_API_KEY",),
    "custom": ("OPENAI_API_KEY",),
}


def _api_key() -> str:
    """FORAY_LLM_API_KEY, else the provider's conventional variable."""
    if os.environ.get("FORAY_LLM_API_KEY"):
        return os.environ["FORAY_LLM_API_KEY"]
    for var in _KEY_VARS.get(provider(), ()):
        if os.environ.get(var):
            return os.environ[var]
    raise RuntimeError(
        f"No API key for provider {provider()!r}. Set FORAY_LLM_API_KEY, or "
        f"one of: {', '.join(_KEY_VARS.get(provider(), ()))}"
    )


def _base_url() -> Optional[str]:
    """Explicit override wins; otherwise the provider's known endpoint."""
    return (os.environ.get("FORAY_LLM_BASE_URL")
            or os.environ.get("OPENAI_BASE_URL")
            or OPENAI_COMPATIBLE.get(provider()))


def provider() -> str:
    """Which provider is configured, or 'none' for the offline paths."""
    p = (os.environ.get("FORAY_LLM_PROVIDER") or "").strip().lower()
    if p in ("", "none", "offline"):
        # Back-compat: a bare ANTHROPIC_API_KEY still means Anthropic.
        if os.environ.get("ANTHROPIC_API_KEY"):
            return "anthropic"
        return "none"
    return p


def model() -> str:
    return os.environ.get("FORAY_LLM_MODEL") or DEFAULT_MODELS.get(
        provider(), "unknown")


def available() -> bool:
    if provider() == "none":
        return False
    try:
        return bool(_api_key())
    except RuntimeError:
        return False


def describe() -> str:
    return f"{provider()}:{model()}" if available() else "offline"


# ═══════════════════════════════════════════════════════════════════
#  JSON extraction — providers wrap JSON in prose or fences often
#  enough that this is worth doing properly rather than hoping.
# ═══════════════════════════════════════════════════════════════════

_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.S)


def parse_json(raw: str) -> dict:
    if not raw:
        raise ValueError("empty response")
    text = raw.strip()
    m = _FENCE.search(text)
    if m:
        text = m.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # last resort: the outermost {...}
    start, end = text.find("{"), text.rfind("}")
    if start >= 0 and end > start:
        return json.loads(text[start:end + 1])
    raise ValueError(f"no JSON object in response: {raw[:200]!r}")


# ═══════════════════════════════════════════════════════════════════

def _is_rate_limit(e: Exception) -> bool:
    s = f"{type(e).__name__} {e}".lower()
    return ("429" in s or "rate" in s and "limit" in s
            or "resource_exhausted" in s or "quota" in s)


def structured(system: str, prompt: str, schema: dict,
               *, max_tokens: int = 2000, retries: int = 3) -> dict:
    """Ask the configured provider for one JSON object matching `schema`.

    `schema` is a plain JSON Schema dict. We pass it to the provider's
    native structured-output feature where one exists, and always
    re-parse defensively — the caller validates semantics regardless.

    RATE LIMITS ARE THE NORMAL CASE ON A FREE TIER, NOT AN EXCEPTION.
    Gemini's free tier allows 10 requests/minute; a demo that runs the
    Diagnostician then the Grounding Verifier back to back can trip it, and
    an un-retried 429 silently degrades the agent to its offline path
    mid-demo. So back off and retry rather than surfacing it.
    """
    p = provider()
    if not available():
        raise RuntimeError("No LLM provider configured (FORAY_LLM_PROVIDER)")

    if p == "gemini":
        fn = _gemini
    elif p == "anthropic":
        fn = _anthropic
    elif p in OPENAI_COMPATIBLE:
        fn = _openai
    else:
        raise RuntimeError(
            f"Unknown FORAY_LLM_PROVIDER: {p!r}. Valid: gemini, anthropic, "
            f"{', '.join(sorted(OPENAI_COMPATIBLE))}")

    last: Exception | None = None
    for attempt in range(retries):
        try:
            return fn(system, prompt, schema, max_tokens)
        except Exception as e:                        # noqa: BLE001
            last = e
            if not _is_rate_limit(e) or attempt == retries - 1:
                raise
            # Gemini's free quota is per MINUTE, so a 4s/8s backoff often
            # lands inside the same window and fails again. Wait long enough
            # for the window to actually roll over.
            wait = (6, 20, 40)[min(attempt, 2)]
            print(f"  [llm] rate limited, retrying in {wait}s "
                  f"({attempt + 1}/{retries - 1})", file=sys.stderr)
            time.sleep(wait)
    raise last                                        # pragma: no cover


def _gemini(system: str, prompt: str, schema: dict, max_tokens: int) -> dict:
    """
    IMPORTANT — Gemini 3.x models think before answering, and those thinking
    tokens are charged against max_output_tokens. Measured on
    gemini-3.5-flash: ~365 thinking tokens for a one-line classification,
    ~582 at thinking_level="high".

    So a budget that looks generous for the ANSWER can still truncate:
    at max_output_tokens=300 the call returns finish_reason=MAX_TOKENS with
    an empty or half-written body. That failure is silent-ish — you get
    "empty response", not a quota error.

    Hence: thinking_level="low" (classification does not need deep
    reasoning; it halves thinking and latency) and a floor under the budget.
    """
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=_api_key())
    cfg: dict[str, Any] = dict(
        system_instruction=system,
        response_mime_type="application/json",
        response_schema=schema,
        # headroom for thinking + the answer, never below 1500
        max_output_tokens=max(max_tokens, 1500),
        temperature=0.0,              # classification: we want determinism
    )
    try:
        cfg["thinking_config"] = types.ThinkingConfig(thinking_level="low")
    except Exception:                                 # pragma: no cover
        pass                          # older models / SDKs: just skip it

    resp = client.models.generate_content(
        model=model(), contents=prompt,
        config=types.GenerateContentConfig(**cfg),
    )

    if not (resp.text or "").strip():
        fin = resp.candidates[0].finish_reason if resp.candidates else "?"
        thoughts = getattr(resp.usage_metadata, "thoughts_token_count", None)
        raise ValueError(
            f"Gemini returned no text (finish_reason={fin}, "
            f"thinking_tokens={thoughts}). If MAX_TOKENS, raise max_tokens — "
            f"thinking is charged against it."
        )
    return parse_json(resp.text)


def _anthropic(system: str, prompt: str, schema: dict, max_tokens: int) -> dict:
    import anthropic

    resp = anthropic.Anthropic().messages.create(
        model=model(),
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
        output_config={"format": {"type": "json_schema", "schema": schema}},
    )
    text = next((b.text for b in resp.content if b.type == "text"), "")
    return parse_json(text)


def _openai(system: str, prompt: str, schema: dict, max_tokens: int) -> dict:
    """Groq, OpenRouter, Together, local — anything OpenAI-compatible.

    "OpenAI-compatible" means the provider implements OpenAI's request
    shape and endpoint paths, so the `openai` SDK talks to it once you
    repoint base_url. Using it with Groq involves no OpenAI account.
    """
    from openai import OpenAI

    client = OpenAI(api_key=_api_key(), base_url=_base_url())
    kwargs: dict[str, Any] = {}
    try:
        # Preferred: strict schema. Not every gateway/model supports it.
        kwargs["response_format"] = {
            "type": "json_schema",
            "json_schema": {"name": "out", "strict": True, "schema": schema},
        }
        return _openai_call(client, system, prompt, max_tokens, kwargs)
    except Exception:                                 # noqa: BLE001
        # Fall back to plain JSON mode; our validators still gate the result.
        kwargs["response_format"] = {"type": "json_object"}
        sys_json = (system + "\n\nRespond with ONE JSON object matching:\n"
                    + json.dumps(schema))
        return _openai_call(client, sys_json, prompt, max_tokens, kwargs)


def _openai_call(client, system: str, prompt: str, max_tokens: int,
                 kwargs: dict) -> dict:
    resp = client.chat.completions.create(
        model=model(),
        max_tokens=max_tokens,
        temperature=0.0,
        messages=[{"role": "system", "content": system},
                  {"role": "user", "content": prompt}],
        **kwargs,
    )
    return parse_json(resp.choices[0].message.content or "")


if __name__ == "__main__":
    print(f"\n  provider  {provider()}")
    print(f"  model     {model()}")
    print(f"  available {available()}   -> {describe()}\n")
    if available():
        out = structured(
            "You classify text. Reply with JSON only.",
            "Is 'the port is basically the connection' about TCP ports? "
            "Answer with {\"about_ports\": true/false, \"why\": \"...\"}",
            {"type": "object",
             "properties": {"about_ports": {"type": "boolean"},
                            "why": {"type": "string"}},
             "required": ["about_ports", "why"]},
            max_tokens=300,
        )
        print(f"  smoke test -> {out}\n")
    else:
        print("  No provider configured. Agents will use offline paths.\n"
              "  Set FORAY_LLM_PROVIDER + a key in .env — see this file's docstring.\n")
