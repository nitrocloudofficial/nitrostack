"""
plan.py - The Planner agent's capability.

The loop's entry point. Takes a raw user request (free text) and produces the
structured job the rest of the pipeline runs on:

  - class_list        : clean class names
  - queries           : an initial search query per class (for Scout)
  - target_accuracy   : when the loop is allowed to stop
  - images_per_class  : how many Scout should fetch initially
  - max_iterations    : hard cap so the loop always terminates

Parsing is deterministic (no LLM dependency) so the demo never hinges on an API
round-trip. It handles the common phrasings:
  - "cat, dog, bird"
  - "husky vs wolf vs malamute"
  - "distinguish leopard from jaguar and cheetah"
  - "classify apple banana orange"

Standalone:
    python plan.py "husky vs wolf vs malamute"
    python plan.py "cat, dog, bird" --target 0.9 --per-class 30
"""

from __future__ import annotations

import os
import re
import sys
import json
import urllib.request

import re
import sys
import json

# words to strip so they don't become "classes"
STOPWORDS = {
    "classify", "detect", "distinguish", "identify", "recognize", "tell",
    "between", "from", "and", "vs", "versus", "or", "the", "a", "an",
    "difference", "apart", "model", "images", "image", "of", "types", "type",
    "kind", "kinds", "class", "classes", "want", "need", "i", "to", "my",
    "build", "make", "create", "train", "for", "me", "please",
    "just", "one", "thing", "some", "thing", "stuff", "things",
}


def parse_classes(text: str) -> list[str]:
    t = text.lower().strip()

    # strip leading command verbs so "distinguish X from Y" doesn't keep "from"
    t = re.sub(r"^\s*(please\s+)?(i\s+want\s+to\s+|i\s+need\s+to\s+)?"
               r"(classify|detect|distinguish|identify|recognize|tell|build|"
               r"make|create|train)\s+", "", t)

    # normalize common separators to commas (including 'from' and 'between')
    t = re.sub(r"\bvs\.?\b|\bversus\b|\bor\b|\bfrom\b|\bbetween\b", ",", t)
    t = t.replace(" and ", ",").replace("/", ",").replace(";", ",")

    # if there are commas, split on them; else split on whitespace
    if "," in t:
        raw = [p.strip() for p in t.split(",")]
    else:
        raw = t.split()

    classes = []
    for chunk in raw:
        # keep multiword class names but drop stopwords inside them
        words = [w for w in re.findall(r"[a-z0-9\-]+", chunk)
                 if w not in STOPWORDS]
        name = " ".join(words).strip()
        if name and name not in classes:
            classes.append(name)
    return classes


def plan_heuristic(user_request: str,
         target_accuracy: float = 0.85,
         images_per_class: int = 30,
         max_iterations: int = 3) -> dict:
    classes = parse_classes(user_request)

    if len(classes) < 2:
        return {
            "error": "need at least 2 classes to train a classifier",
            "parsed_classes": classes,
            "hint": "try e.g. 'cat, dog, bird' or 'husky vs wolf'",
        }

    # initial query per class: the class name itself is the best first query
    queries = {c: c for c in classes}

    return {
        "user_request": user_request,
        "class_list": classes,
        "queries": queries,
        "target_accuracy": target_accuracy,
        "images_per_class": images_per_class,
        "max_iterations": max_iterations,
        "message": f"Planner: {len(classes)} classes {classes}, "
                   f"target {target_accuracy:.2f}, "
                   f"{images_per_class}/class, max {max_iterations} iters.",
    }




# ----------------------------------------------------------------------------
# LLM-based class extraction (for messy natural-language requests)
# ----------------------------------------------------------------------------
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = os.environ.get("KERNELS_LLM", "qwen2.5:3b")
OLLAMA_TIMEOUT = 30


def _llm_extract_classes(text: str) -> list[str]:
    prompt = f"""Extract the list of visual categories a user wants an image
classifier to distinguish, from their request. Return ONLY a JSON array of
short class names (lowercase, 1-3 words each). No explanation.

Request: "{text}"

Examples:
"I want to detect dogs, cats and raccoons in my backyard" -> ["dog","cat","raccoon"]
"build something to tell ripe vs unripe tomatoes" -> ["ripe tomato","unripe tomato"]
"classify husky wolf malamute" -> ["husky","wolf","malamute"]

JSON array only:"""
    body = json.dumps({"model": OLLAMA_MODEL, "prompt": prompt,
                       "stream": False, "options": {"temperature": 0.1}}).encode()
    req = urllib.request.Request(OLLAMA_URL, data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as r:
        raw = json.loads(r.read().decode()).get("response", "")
    start, end = raw.find("["), raw.rfind("]")
    if start == -1 or end == -1:
        raise ValueError("no JSON array in LLM output")
    arr = json.loads(raw[start:end + 1])
    classes = [str(x).strip().lower() for x in arr if str(x).strip()]
    if len(classes) < 2:
        raise ValueError("LLM returned < 2 classes")
    return classes


def plan(user_request: str,
         target_accuracy: float = 0.85,
         images_per_class: int = 30,
         max_iterations: int = 3) -> dict:
    """LLM-first class extraction, heuristic parser as fallback."""
    reasoning_by = "heuristic"
    try:
        classes = _llm_extract_classes(user_request)
        reasoning_by = "llm"
    except Exception:
        # fall back to the deterministic parser
        parsed = plan_heuristic(user_request, target_accuracy,
                                images_per_class, max_iterations)
        parsed["reasoning_by"] = "heuristic"
        return parsed

    queries = {c: c for c in classes}
    return {
        "user_request": user_request,
        "class_list": classes,
        "queries": queries,
        "target_accuracy": target_accuracy,
        "images_per_class": images_per_class,
        "max_iterations": max_iterations,
        "reasoning_by": reasoning_by,
        "message": f"Planner (LLM): understood {len(classes)} classes {classes}, "
                   f"target {target_accuracy:.2f}, {images_per_class}/class.",
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('usage: python plan.py "<request>" [--target 0.85] '
              '[--per-class 30] [--max-iter 3]')
        raise SystemExit(1)

    req = sys.argv[1]
    target = 0.85
    per_class = 30
    max_iter = 3
    args = sys.argv[2:]
    for i, a in enumerate(args):
        if a == "--target" and i + 1 < len(args):
            target = float(args[i + 1])
        elif a == "--per-class" and i + 1 < len(args):
            per_class = int(args[i + 1])
        elif a == "--max-iter" and i + 1 < len(args):
            max_iter = int(args[i + 1])

    print(json.dumps(
        plan(req, target_accuracy=target, images_per_class=per_class,
             max_iterations=max_iter),
        indent=2))
