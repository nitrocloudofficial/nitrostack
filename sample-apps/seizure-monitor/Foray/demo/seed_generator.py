"""
FORAY — the time machine.

    python demo/seed_generator.py

We cannot demo eight weeks live, so we seed 60 students across 8 weeks.

  ██  THIS FILE MAKES NO API CALLS. NOT ONE.  ██

foray_plan.md §14 says every seeded LLM call must be cached to disk and
never regenerated. We went one better: seeded reflections are composed
deterministically from the taxonomy's own `signals` phrases, so there is
nothing to cache and nothing to regenerate. Run it on a dead wifi and it
produces byte-identical output. `random` is seeded with a constant.

Being honest about this is a pitch asset, not a weakness:

  "Loops 1, 2 and 3 are live in front of you. The cohort runs on seeded
   longitudinal data — we cannot fake eight weeks and we will not pretend to."

THE PLANT (foray_plan.md §8 — "arrange it, do not hope for it"):
  week 6, misconception M12, exactly 23 of 60 students, on concept C11.
  week 7, after the intervention, exactly 4 remain. That is beat 4.
"""

from __future__ import annotations

import json
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from api import db                                    # noqa: E402
from api.schema import COHORT_SIZE                    # noqa: E402
from core.clustering import cluster_week              # noqa: E402

SEED = 20260726          # constant: reruns are identical
WEEKS = list(range(1, 9))
TERM_START = datetime(2026, 6, 8, tzinfo=timezone.utc)

# ── the plant ────────────────────────────────────────────────────────
PLANT_MISCONCEPTION = "M12"
PLANT_WEEK = 6
PLANT_BEFORE = 23        # beat 3: "23 of 60"
PLANT_AFTER = 4          # beat 4: "23 -> 4. cleared."
PLANT_AFTER_WEEK = 7
PLANT_ROOT_CAUSE = "C03"    # beat 3: traces back to the EARLIER unit

# Which concepts are taught in which week. Weeks 1-2 are the prereq unit;
# the root cause of the week-6 spike lives back there, which is the point.
SYLLABUS: dict[int, list[str]] = {
    1: ["C01", "C02"],
    2: ["C03", "C04"],
    3: ["C05", "C06"],
    4: ["C07", "C08"],
    5: ["C09", "C10"],
    6: ["C11"],
    7: ["C11", "C12"],
    8: ["C12", "C13"],
}

# Sentence frames a student might actually write. The misconception's own
# signal phrase is dropped in verbatim, so the classifier has something
# real to find and the evidence_span can quote it.
FRAMES = [
    "today we did {topic}. what i understood is that {signal}. i think thats the main idea",
    "so basically {topic} — {signal}. still a bit confused about the rest",
    "{topic} class. my takeaway: {signal}. hope thats right",
    "we learned {topic} today. from what i got, {signal}",
    "{topic}. honestly {signal}, thats what i wrote in my notes",
    "notes from {topic}: {signal}. couldnt follow the last example though",
]
CLEAN_FRAMES = [
    "in {topic} today the key point was how it actually works. i followed most of it",
    "{topic} made sense — the worked example helped. no real doubts",
    "today: {topic}. i think i get it, the diagram was clear",
]
# A little Tamil/code-mixed input. We ACCEPT it and claim nothing more
# than acceptance (foray_plan.md §13). The model handles it for free.
MIXED_FRAMES = [
    "{topic} class today. basically {signal} nu puriyudhu. correct ah theriyala",
    "innaiku {topic}. naan understand pannadhu — {signal}",
]


def load(path: str) -> dict:
    return json.loads((ROOT / "data" / path).read_text(encoding="utf-8"))


def main() -> None:
    rng = random.Random(SEED)
    tax = load("taxonomy.json")["misconceptions"]
    by_concept: dict[str, list[dict]] = {}
    for m in tax:
        by_concept.setdefault(m["concept_id"], []).append(m)
    by_id = {m["id"]: m for m in tax}
    concept_names = {
        c["id"]: c["name"] for c in load("concepts.json")["concepts"]
    }

    students = [f"S_{i:03d}" for i in range(1, COHORT_SIZE + 1)]
    # Fixed membership for the plant, so the same students carry M12 in
    # week 6 and a known subset still carry it in week 7.
    plant_cohort = rng.sample(students, PLANT_BEFORE)
    still_wrong = set(plant_cohort[:PLANT_AFTER])

    reflections: list[dict] = []
    diagnoses: list[dict] = []
    rid = 0
    did = 0

    for week in WEEKS:
        taught = SYLLABUS[week]
        for sid in students:
            # ── decide what this student got wrong, BEFORE participation ──
            # A planted student must always write in the plant weeks,
            # otherwise the 85% roll silently eats members of the cluster
            # and the beat-3 number drifts below 23.
            forced: str | None = None
            if week == PLANT_WEEK and sid in plant_cohort:
                forced = PLANT_MISCONCEPTION
            elif week == PLANT_AFTER_WEEK and sid in still_wrong:
                forced = PLANT_MISCONCEPTION

            # not everyone writes every week — 85% participation
            if forced is None and rng.random() > 0.85:
                continue

            concept = rng.choice(taught)
            topic = concept_names[concept]
            candidates = by_concept.get(concept, [])

            if forced:
                mis = by_id[forced]
                concept = mis["concept_id"]
                topic = concept_names[concept]
            else:
                # In the plant weeks nobody ELSE may draw M12 at random, or
                # the count creeps above the number on the slide. The plant
                # is arranged, not hoped for (§8).
                pool = candidates
                if week in (PLANT_WEEK, PLANT_AFTER_WEEK):
                    pool = [m for m in candidates
                            if m["id"] != PLANT_MISCONCEPTION]
                mis = rng.choice(pool) if pool and rng.random() < 0.30 else None

            rid += 1
            reflection_id = f"R_{rid:05d}"
            created = TERM_START + timedelta(weeks=week - 1,
                                             hours=rng.randint(9, 20))

            if mis:
                signal = rng.choice(mis["signals"])
                roll = rng.random()
                if roll < 0.12:
                    frame, lang = rng.choice(MIXED_FRAMES), "mixed"
                else:
                    frame, lang = rng.choice(FRAMES), "en"
                text = frame.format(topic=topic.lower(), signal=signal)
            else:
                text = rng.choice(CLEAN_FRAMES).format(topic=topic.lower())
                lang = "en"

            reflections.append({
                "id": reflection_id,
                "student_id": sid,
                "concept_ids": [concept],
                "week": week,
                "lang": lang,
                "text": text,
                "created_at": created.isoformat(),
            })

            # The seeded diagnosis is known by construction — we planted the
            # misconception, so we are not "predicting" it. Beats 1 and 2
            # run the real Diagnostician live; this is the cohort backdrop.
            if mis:
                did += 1
                diagnoses.append({
                    "id": f"D_{did:05d}",
                    "reflection_id": reflection_id,
                    "misconception_ids": [mis["id"]],
                    "novel_text": None,
                    "confidence": round(rng.uniform(0.72, 0.95), 2),
                    "evidence_span": signal,
                })

    # ── mastery, from the reflections we just built ──
    # Not decoration: the Root Cause Analyst's central rule is "prefer a
    # prerequisite with LOW cohort mastery", and it cannot fire against an
    # empty table. This also lights up the student constellation.
    from core.mastery import update_level

    wrong_by: dict[str, set[str]] = {}      # reflection_id -> misconception ids
    for d in diagnoses:
        wrong_by[d["reflection_id"]] = set(d["misconception_ids"])

    states: dict[tuple[str, str], dict] = {}
    for r in sorted(reflections, key=lambda x: x["week"]):
        held = wrong_by.get(r["id"], set())
        # A reflection showing a misconception is weak evidence of mastery;
        # a clean one is good evidence. Deterministic, no model involved.
        observation = 0.15 if held else 0.85
        for cid in r["concept_ids"]:
            key = (r["student_id"], cid)
            prev = states.get(key)
            level = update_level(None if prev is None else prev["level"],
                                 observation)
            hist = (prev["history"] if prev else []) + [
                {"week": r["week"], "level": round(level, 4)}
            ]
            corrected = list(prev["corrected_misconceptions"]) if prev else []
            # the "got it wrong then right" trail: previously wrong, now clean
            if prev and not held:
                for m in prev.get("_last_wrong", []):
                    if m not in corrected:
                        corrected.append(m)
            states[key] = {
                "student_id": r["student_id"], "concept_id": cid,
                "level": round(level, 4), "last_seen_week": r["week"],
                "history": hist, "corrected_misconceptions": corrected,
                "_last_wrong": list(held),
            }

    # ── write ──
    conn = db.connect()
    db.init_schema(conn)
    conn.execute("DELETE FROM reflections")
    conn.execute("DELETE FROM diagnoses")
    conn.execute("DELETE FROM clusters")
    conn.execute("DELETE FROM mastery")
    for r in reflections:
        db.upsert(conn, "reflections", r)
    for d in diagnoses:
        db.upsert(conn, "diagnoses", d)
    for st in states.values():
        st.pop("_last_wrong", None)
        db.upsert(conn, "mastery", st)
    conn.commit()

    # ── cluster every week deterministically (k-gate applied in /core) ──
    total_clusters = 0
    suppressed = 0
    for week in WEEKS:
        for cl in cluster_week(conn, week):
            db.upsert(conn, "clusters", cl)
            total_clusters += 1
            if not cl["k_satisfied"]:
                suppressed += 1
    conn.commit()

    # ── root cause per surfaced cluster (deterministic graph walk) ──
    from agents.rootcause import analyse
    concepts = load("concepts.json")["concepts"]
    cohort_mastery = {
        r["concept_id"]: r["m"] for r in conn.execute(
            "SELECT concept_id, AVG(level) m FROM mastery GROUP BY concept_id"
        ).fetchall() if r["m"] is not None
    }
    traced = 0
    for row in conn.execute(
            "SELECT * FROM clusters WHERE k_satisfied = 1").fetchall():
        cl = db.row_to_dict(row)
        rc = analyse(cl, concepts, tax, cohort_mastery)
        if rc.get("root_cause_concept_id"):
            conn.execute(
                "UPDATE clusters SET root_cause_concept_id = ?, "
                "root_cause_reasoning = ? WHERE id = ?",
                (rc["root_cause_concept_id"], rc["reasoning"], cl["id"]))
            traced += 1
    conn.commit()

    # ── cache to disk so reset.sh never needs to recompute ──
    cache = ROOT / "data" / "seed_cache"
    cache.mkdir(parents=True, exist_ok=True)
    (cache / "reflections.json").write_text(
        json.dumps(reflections, indent=1, ensure_ascii=False), encoding="utf-8")
    (cache / "diagnoses.json").write_text(
        json.dumps(diagnoses, indent=1, ensure_ascii=False), encoding="utf-8")

    # ── verify the plant landed. If it did not, beats 3 and 4 are dead. ──
    from core.clustering import count_misconception
    before = count_misconception(conn, PLANT_MISCONCEPTION, PLANT_WEEK)
    after = count_misconception(conn, PLANT_MISCONCEPTION, PLANT_AFTER_WEEK)

    print(f"reflections {len(reflections)}  diagnoses {len(diagnoses)}  "
          f"mastery {len(states)}")
    print(f"clusters    {total_clusters}  ({suppressed} suppressed by k-gate)"
          f"  {traced} root-caused")
    print(f"cached ->   data/seed_cache/")
    print()
    print(f"  PLANT CHECK  {PLANT_MISCONCEPTION}: "
          f"week {PLANT_WEEK} = {before}   week {PLANT_AFTER_WEEK} = {after}")
    rc_row = conn.execute(
        "SELECT root_cause_concept_id r FROM clusters WHERE id = ?",
        (f"CL_{PLANT_WEEK:03d}_{PLANT_MISCONCEPTION}",)).fetchone()
    rc = rc_row["r"] if rc_row else None
    print(f"  ROOT CAUSE   {PLANT_MISCONCEPTION} traces to {rc} "
          f"(expected {PLANT_ROOT_CAUSE})")

    ok = (before == PLANT_BEFORE and after == PLANT_AFTER
          and rc == PLANT_ROOT_CAUSE)
    if rc != PLANT_ROOT_CAUSE:
        print(f"  !! Beat 3 would point at {rc}, not the earlier unit. "
              f"The trace is decided by lowest cohort mastery on the walk - "
              f"check the mastery spread before changing SEED or SYLLABUS.")
    if ok:
        print(f"  OK — beat 3 shows {before} of {COHORT_SIZE}, "
              f"beat 4 shows {before} -> {after}")
    else:
        print(f"  !! FAILED — expected {PLANT_BEFORE} -> {PLANT_AFTER}. "
              f"Beats 3 and 4 will not work.")
        sys.exit(1)


if __name__ == "__main__":
    main()
