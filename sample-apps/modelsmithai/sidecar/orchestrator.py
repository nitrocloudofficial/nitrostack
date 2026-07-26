"""
orchestrator.py - ties all six agents into one closed feedback loop.

Flow:
  Planner  -> class list, queries, target, max iterations
  loop (up to max_iterations):
     Scout       -> fetch images for each class (or just the weak ones on
                    re-fetch, using the Diagnostician's sharper queries)
     Curator     -> verify + dedup + cache embeddings
     Trainer     -> fit head, write model.pt, report metrics
     Diagnostician -> STOP (target met) or CONTINUE (structured re-fetch request)
     stop if: target met, OR no improvement over last iteration, OR max iters
  Sentinel -> scan + convert the final model.pt to SafeTensors

Everything is written to state.json so every inter-agent message is visible -
that shared state IS the demo surface.

Run:
  python orchestrator.py "husky vs wolf vs malamute"
  python orchestrator.py "cat, dog, bird" --target 0.9
"""

from __future__ import annotations

import os
import sys
import json
import time

import plan as planner
import scout as scout_agent
import curate as curator
import train_real as trainer
import diagnose as diagnostician
import sentinel as sentinel_agent
import report as report_gen

STORAGE_ROOT = "C:/hack/storage"


def _log(state: dict, agent: str, msg: str, data: dict | None = None):
    entry = {"t": round(time.time(), 2), "agent": agent, "message": msg}
    if data is not None:
        entry["data"] = data
    state["events"].append(entry)
    print(f"[{agent:>13}] {msg}")
    _save(state)


def _save(state: dict):
    path = os.path.join(state["run_dir"], "state.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def _count_clean(class_dir: str) -> int:
    """Count valid images sitting directly in a class folder (rejects were moved
    to _rejected/ by the Curator, so these are the clean survivors)."""
    valid = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
    if not os.path.isdir(class_dir):
        return 0
    return sum(
        1 for f in os.listdir(class_dir)
        if os.path.isfile(os.path.join(class_dir, f))
        and os.path.splitext(f)[1].lower() in valid
    )


def _fetch_clean_target(state, classes, queries, target_per_class,
                        images_root, max_rounds=5):
    """Fetch + curate repeatedly until each class has `target_per_class` CLEAN
    images, or the source is exhausted, or max_rounds is hit. This delivers the
    quantity the user asked for, not 'whatever survived one fetch'.

    Robust guarantees:
      - stops when target met per class
      - stops a class when a fetch yields 0 new (source exhausted) - no infinite loop
      - hard cap of max_rounds regardless
    """
    summary = {c: {"query": queries[c], "downloaded": 0} for c in classes}
    exhausted = set()

    for rnd in range(1, max_rounds + 1):
        # which classes still need more clean images?
        needs = {}
        for c in classes:
            if c in exhausted:
                continue
            have = _count_clean(os.path.join(images_root, c))
            if have < target_per_class:
                needs[c] = target_per_class - have
        if not needs:
            break

        # fetch a buffered batch for each deficient class (2x the shortfall,
        # since some will be rejected by the Curator)
        for c, deficit in needs.items():
            out = os.path.join(images_root, c)
            want = max(4, deficit * 2)
            res = scout_agent.fetch_images(queries[c], want, out, base_class=c)
            summary[c]["downloaded"] += res.downloaded
            if res.downloaded == 0:
                exhausted.add(c)   # source gave nothing new -> stop trying this class

        # curate to move new rejects out, so the next round's _count_clean is accurate
        curator.curate(images_root)

        got = {c: _count_clean(os.path.join(images_root, c)) for c in classes}
        _log(state, "Scout",
             f"top-up round {rnd}: "
             + ", ".join(f"{c}={got[c]}/{target_per_class}"
                         + ("(max)" if c in exhausted else "") for c in classes),
             {"round": rnd, "clean_counts": got,
              "exhausted": sorted(exhausted)})

    # final report
    final_counts = {c: _count_clean(os.path.join(images_root, c)) for c in classes}
    shortfalls = {c: target_per_class - n for c, n in final_counts.items()
                  if n < target_per_class}
    if shortfalls:
        _log(state, "Scout",
             "note: some classes below target (open source exhausted): "
             + ", ".join(f"{c}={final_counts[c]}/{target_per_class}"
                         for c in shortfalls),
             {"final_counts": final_counts})
    else:
        _log(state, "Scout",
             f"reached clean target of {target_per_class}/class for all classes",
             {"final_counts": final_counts})
    return summary


def run(user_request: str, target: float = 0.85,
        per_class: int = 30, max_iter: int = 3) -> dict:

    # ---- Planner ----
    job = planner.plan(user_request, target_accuracy=target,
                       images_per_class=per_class, max_iterations=max_iter)
    if "error" in job:
        return job

    classes = job["class_list"]
    queries = dict(job["queries"])
    run_dir = os.path.join(STORAGE_ROOT, "runs",
                           "_".join(classes) + f"_{int(time.time())}")
    images_root = os.path.join(run_dir, "images")
    os.makedirs(images_root, exist_ok=True)

    state = {
        "run_dir": run_dir.replace("\\", "/"),
        "request": user_request,
        "classes": classes,
        "target": target,
        "iterations": [],
        "events": [],
        "final_model": None,
    }
    _log(state, "Planner", job["message"], {"classes": classes})

    prev_acc = -1.0
    final_report = None

    for it in range(1, max_iter + 1):
        iter_rec = {"iteration": it}

        # ---- Scout (+ top-up on iteration 1 to reach clean target) ----
        # iteration 1: fetch all classes, then TOP UP until each class has
        # `per_class` CLEAN images (or the source is exhausted / cap hit).
        # later iterations: only the classes the Diagnostician asked for.
        if it == 1:
            scout_summary = _fetch_clean_target(
                state, classes, queries, per_class, images_root)
        else:
            fetch_plan = state["_next_fetch"]
            scout_summary = {}
            for req in fetch_plan:
                c, q, n = req["class"], req["query"], req["count"]
                out = os.path.join(images_root, c)
                res = scout_agent.fetch_images(q, n, out, base_class=c)
                scout_summary[c] = {"query": q, "downloaded": res.downloaded}
            _log(state, "Scout", f"iter {it}: fetched "
                 + ", ".join(f"{c}+{s['downloaded']}" for c, s in scout_summary.items()),
                 scout_summary)

        # ---- Curator ----
        crep = curator.curate(images_root)
        kept = crep.get("total_kept", 0)
        _log(state, "Curator", f"iter {it}: kept {kept} clean images",
             crep.get("per_class"))

        # ---- Trainer ----
        trep = trainer.train_from_cache(images_root)
        if "error" in trep:
            _log(state, "Trainer", f"iter {it}: {trep['error']}")
            break
        acc = trep["accuracy"]
        _log(state, "Trainer", f"iter {it}: accuracy {acc:.3f}",
             {"per_class": trep["per_class"], "confusion": trep["confusion_pairs"]})
        final_report = trep

        # ---- Diagnostician ----
        diag = diagnostician.diagnose(trep, target_accuracy=target)
        _log(state, "Diagnostician", diag["message"],
             {"decision": diag["decision"], "requests": diag["requests"]})

        iter_rec.update({"accuracy": acc, "kept": kept,
                         "per_class": trep["per_class"],
                         "confusion": trep["confusion_pairs"],
                         "decision": diag["decision"]})
        state["iterations"].append(iter_rec)
        _save(state)

        # ---- stop rules ----
        if diag["decision"] == "STOP":
            _log(state, "Orchestrator", f"STOP: target met at {acc:.3f}")
            break
        if acc <= prev_acc:
            _log(state, "Orchestrator",
                 f"STOP: no improvement ({acc:.3f} <= {prev_acc:.3f})")
            break
        if it == max_iter:
            _log(state, "Orchestrator", f"STOP: max iterations ({max_iter})")
            break

        prev_acc = acc
        # prepare next fetch from the Diagnostician's structured request
        next_fetch = [
            {"class": r["class"], "query": r["suggested_query"],
             "count": r["fetch_count"]}
            for r in diag["requests"]
        ]
        # Safety: make sure EVERY weak class (recall < 0.7) is covered, even if
        # the LLM only named a subset. Keeps the action aligned with the data.
        covered = {r["class"] for r in next_fetch}
        for cname in classes:
            recall = float(trep["per_class"].get(cname, 1.0))
            if recall < 0.7 and cname not in covered:
                next_fetch.append({"class": cname, "query": cname, "count": 12})
        state["_next_fetch"] = next_fetch
        _save(state)

    # ---- Sentinel on the final model ----
    if final_report and os.path.exists(final_report["model_path"]):
        scan = sentinel_agent.scan_pickle(final_report["model_path"])
        conv = sentinel_agent.convert_safetensors(final_report["model_path"])
        state["final_model"] = {
            "model_path": final_report["model_path"],
            "accuracy": final_report["accuracy"],
            "scan": scan,
            "safetensors": conv.get("output"),
        }
        _log(state, "Sentinel",
             f"final model {scan['verdict']}, converted to SafeTensors",
             {"verdict": scan["verdict"], "safetensors": conv.get("output")})

        # auto-generate the audit PDF from this run's state
        try:
            state_path = os.path.join(state["run_dir"], "state.json")
            rep = report_gen.generate_report(state_path)
            state["audit_report"] = rep["report_path"]
            _log(state, "Sentinel", f"audit report generated: {rep['report_path']}")
        except Exception as e:
            _log(state, "Sentinel", f"audit report skipped: {e}")

    _save(state)
    print("\n=== RUN COMPLETE ===")
    print(f"state: {os.path.join(state['run_dir'], 'state.json')}")
    if state["final_model"]:
        print(f"final accuracy: {state['final_model']['accuracy']}")
        print(f"safetensors:    {state['final_model']['safetensors']}")
    return state


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('usage: python orchestrator.py "<request>" [--target 0.85] '
              '[--per-class 30] [--max-iter 3]')
        raise SystemExit(1)
    req = sys.argv[1]
    target, per_class, max_iter = 0.85, 30, 3
    a = sys.argv[2:]
    for i, x in enumerate(a):
        if x == "--target" and i + 1 < len(a):
            target = float(a[i + 1])
        elif x == "--per-class" and i + 1 < len(a):
            per_class = int(a[i + 1])
        elif x == "--max-iter" and i + 1 < len(a):
            max_iter = int(a[i + 1])
    run(req, target, per_class, max_iter)
