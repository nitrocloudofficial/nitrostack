"""
diagnose.py - The Diagnostician agent (LLM-reasoning version).

The agent that makes the loop intelligent. It reads the Trainer's report
(accuracy, per-class recall, confusion pairs) and decides STOP or CONTINUE.

Reasoning engine: a LOCAL LLM via Ollama (http://localhost:11434). The model
reasons about WHY classes confuse and WHAT specific data would fix it, then
returns a structured re-fetch request.

RELIABILITY: if Ollama is unreachable, slow, or returns malformed output, this
falls back silently to a deterministic heuristic (diagnose_heuristic). The demo
can never break because of the LLM - worst case it reverts to logic that works.

Interface is unchanged: diagnose(train_report, target_accuracy) -> dict with
keys decision / reason / accuracy / requests / message. orchestrator.py needs
no changes.
"""

from __future__ import annotations

import os
import sys
import json
import urllib.request

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = os.environ.get("KERNELS_LLM", "qwen2.5:3b")
OLLAMA_TIMEOUT = 40  # seconds; if it takes longer we fall back


# ----------------------------------------------------------------------------
# HEURISTIC (the fallback - your original logic, unchanged)
# ----------------------------------------------------------------------------
def diagnose_heuristic(train_report: dict,
                       target_accuracy: float = 0.85,
                       weak_recall: float = 0.7,
                       fetch_per_weak_class: int = 15) -> dict:
    acc = float(train_report.get("accuracy", 0.0))
    per_class = train_report.get("per_class", {}) or {}
    confusion = train_report.get("confusion_pairs", {}) or {}
    classes = train_report.get("classes", list(per_class.keys()))

    confused_with = {}
    for pair, count in confusion.items():
        if "->" not in pair:
            continue
        true_c, pred_c = pair.split("->", 1)
        prev = confused_with.get(true_c)
        if prev is None or count > prev[1]:
            confused_with[true_c] = (pred_c, count)

    if acc >= target_accuracy:
        return {"decision": "STOP",
                "reason": f"accuracy {acc:.3f} >= target {target_accuracy:.2f}",
                "accuracy": acc, "requests": [], "reasoning_by": "heuristic",
                "message": f"Target met ({acc:.3f}). Delivering final model."}

    requests, notes = [], []
    for cname in classes:
        recall = float(per_class.get(cname, 1.0))
        if recall < weak_recall:
            rival = confused_with.get(cname)
            if rival:
                rival_class, cnt = rival
                query = f"{cname} not {rival_class}"
                why = f"recall {recall:.2f}, most confused with '{rival_class}' ({cnt}x)"
            else:
                rival_class, query = None, cname
                why = f"recall {recall:.2f}, underperforming"
            requests.append({"class": cname, "current_recall": round(recall, 3),
                             "confused_with": rival_class,
                             "fetch_count": fetch_per_weak_class,
                             "suggested_query": query, "reason": why})
            notes.append(f"{cname}: {why} -> fetch {fetch_per_weak_class} more")

    if not requests:
        for cname in classes:
            requests.append({"class": cname,
                             "current_recall": round(float(per_class.get(cname, 0.0)), 3),
                             "confused_with": None,
                             "fetch_count": max(5, fetch_per_weak_class // 2),
                             "suggested_query": cname,
                             "reason": "accuracy below target; broadening all classes"})
        notes.append("no single weak class; broadening all")

    return {"decision": "CONTINUE",
            "reason": f"accuracy {acc:.3f} < target {target_accuracy:.2f}",
            "accuracy": acc, "requests": requests, "reasoning_by": "heuristic",
            "message": "Diagnostician -> Scout: " + "; ".join(notes)}


# ----------------------------------------------------------------------------
# LLM REASONING (primary)
# ----------------------------------------------------------------------------
def _ollama_generate(prompt: str) -> str:
    body = json.dumps({
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.2},
    }).encode()
    req = urllib.request.Request(OLLAMA_URL, data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as r:
        data = json.loads(r.read().decode())
    return data.get("response", "")


def _build_prompt(train_report: dict, target_accuracy: float) -> str:
    acc = train_report.get("accuracy")
    per_class = train_report.get("per_class", {})
    confusion = train_report.get("confusion_pairs", {})
    classes = train_report.get("classes", [])
    return f"""You are the Diagnostician in an automated model-training loop. A small image
classifier was just trained. Decide whether it is good enough, and if not,
what MORE SPECIFIC images to fetch to fix its weaknesses.

Target accuracy: {target_accuracy}
Overall accuracy: {acc}
Per-class recall: {json.dumps(per_class)}
Confusion pairs (true->predicted : count): {json.dumps(confusion)}
Classes: {json.dumps(classes)}

Reason about WHY the weak classes are confused (e.g. shared visual features,
backgrounds, ambiguous examples), then choose search queries that would fetch
DISTINCTIVE examples to break that confusion. Prefer specific descriptive
queries over generic class names.

Respond with ONLY a JSON object, no prose, in exactly this schema:
{{
  "decision": "STOP" or "CONTINUE",
  "reasoning": "one sentence explaining the main problem and your fix strategy",
  "requests": [
    {{"class": "<name>", "fetch_count": <int 8-20>, "suggested_query": "<specific query>", "reason": "<short why>"}}
  ]
}}
If accuracy >= target, decision is STOP and requests is [].
Only include weak classes in requests. Output JSON only."""


def _parse_llm(raw: str, train_report: dict, target_accuracy: float) -> dict:
    # extract the first {...} block
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON in LLM output")
    obj = json.loads(raw[start:end + 1])

    decision = obj.get("decision", "").upper()
    if decision not in ("STOP", "CONTINUE"):
        raise ValueError("bad decision")

    acc = float(train_report.get("accuracy", 0.0))
    reasoning = obj.get("reasoning", "")
    reqs = []
    for r in obj.get("requests", []):
        cls = r.get("class")
        if not cls:
            continue
        reqs.append({
            "class": cls,
            "current_recall": round(float(train_report.get("per_class", {}).get(cls, 0.0)), 3),
            "confused_with": None,
            "fetch_count": int(r.get("fetch_count", 15)),
            "suggested_query": r.get("suggested_query", cls),
            "reason": r.get("reason", ""),
        })

    if decision == "STOP":
        return {"decision": "STOP",
                "reason": f"LLM: target reached at {acc:.3f}",
                "accuracy": acc, "requests": [], "reasoning_by": "llm",
                "message": f"Diagnostician (LLM): {reasoning or 'Model is good enough.'}"}

    # CONTINUE but LLM gave no requests -> not actionable, fall back
    if not reqs:
        raise ValueError("CONTINUE with no requests")

    return {"decision": "CONTINUE",
            "reason": f"LLM: accuracy {acc:.3f} < target {target_accuracy:.2f}",
            "accuracy": acc, "requests": reqs, "reasoning_by": "llm",
            "message": f"Diagnostician (LLM): {reasoning}"}


def diagnose(train_report: dict, target_accuracy: float = 0.85,
             weak_recall: float = 0.7, fetch_per_weak_class: int = 15) -> dict:
    """LLM-first, heuristic-fallback. Same return shape as before.

    HARD RULE: if overall accuracy already meets the target, STOP immediately -
    the LLM does not get to override a met target with per-class perfectionism.
    This keeps loop behavior predictable: at/above target -> deliver; below -> reason.
    """
    acc = float(train_report.get("accuracy", 0.0))
    if acc >= target_accuracy:
        return {"decision": "STOP",
                "reason": f"accuracy {acc:.3f} >= target {target_accuracy:.2f}",
                "accuracy": acc, "requests": [], "reasoning_by": "target-rule",
                "message": f"Diagnostician: target met ({acc:.3f} >= "
                           f"{target_accuracy:.2f}). Delivering final model."}
    try:
        raw = _ollama_generate(_build_prompt(train_report, target_accuracy))
        return _parse_llm(raw, train_report, target_accuracy)
    except Exception as e:  # noqa: BLE001 - any failure -> safe fallback
        result = diagnose_heuristic(train_report, target_accuracy,
                                    weak_recall, fetch_per_weak_class)
        result["llm_fallback_reason"] = f"{type(e).__name__}: {e}"
        return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python diagnose.py <_train_report.json> [target_accuracy]")
        raise SystemExit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        rep = json.load(f)
    target = float(sys.argv[2]) if len(sys.argv) > 2 else 0.85
    print(json.dumps(diagnose(rep, target_accuracy=target), indent=2))
