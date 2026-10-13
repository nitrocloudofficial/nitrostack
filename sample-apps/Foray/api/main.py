"""
FORAY — FastAPI backend.

Two surfaces:

  /internal/*   called by the NitroStack MCP tools (nitro/). Contract is
                fixed in nitro/README.md — changing a path breaks the TS
                side silently, so don't.
  /ui/*         called by the React app. Read-only, shaped for rendering.

ALL business logic lives here or in /core/. The MCP layer holds none.
"""

from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from typing import Any

try:
    from dotenv import load_dotenv
    load_dotenv()                    # repo-root .env -> ANTHROPIC_API_KEY
except ImportError:                  # pragma: no cover
    pass

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import db
from .schema import COHORT_SIZE, K_ANONYMITY, REQUIREMENTS, denial_reason

app = FastAPI(title="Foray", version="1.0.0")

# The UI runs on a different port in dev. Demo-machine only, never public.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

conn = db.connect()
db.init_schema(conn)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ═══════════════════════════════════════════════════════════════════
#  INTERNAL — the MCP contract. See nitro/README.md.
# ═══════════════════════════════════════════════════════════════════

@app.get("/internal/concepts/{concept_id}")
def get_concept(concept_id: str) -> dict[str, Any]:
    row = conn.execute(
        "SELECT * FROM concepts WHERE id = ?", (concept_id,)
    ).fetchone()
    out = db.row_to_dict(row)
    if out is None:
        raise HTTPException(404, f"no concept {concept_id}")
    return out


@app.get("/internal/concepts/{concept_id}/prereqs")
def get_prereqs(concept_id: str, depth: int = 1) -> dict[str, Any]:
    """
    Walk prerequisite edges BACKWARDS. R-07.

    Breadth-first so the chain reads in the order a human would trace it.
    Deterministic: the Root Cause Analyst reasons about this walk, it does
    not invent it.
    """
    rows = conn.execute("SELECT * FROM concepts").fetchall()
    by_id = {r["id"]: db.row_to_dict(r) for r in rows}
    if concept_id not in by_id:
        raise HTTPException(404, f"no concept {concept_id}")

    chain: list[str] = [concept_id]
    seen = {concept_id}
    frontier = [concept_id]
    for _ in range(max(1, depth)):
        nxt: list[str] = []
        for node in frontier:
            for p in by_id[node]["prereqs"]:
                if p not in seen and p in by_id:
                    seen.add(p)
                    chain.append(p)
                    nxt.append(p)
        frontier = nxt
        if not frontier:
            break

    return {
        "root": concept_id,
        "chain": chain,
        "concepts": [by_id[c] for c in chain],
    }


@app.get("/internal/materials")
def get_materials(concept_id: str) -> list[dict[str, Any]]:
    """Hand-tagged retrieval. No embeddings, no index. foray_plan.md §9."""
    rows = conn.execute("SELECT * FROM material_chunks").fetchall()
    return [
        d for r in rows
        if (d := db.row_to_dict(r)) and concept_id in d["concept_ids"]
    ]


@app.get("/internal/reflections/{reflection_id}")
def get_reflection(reflection_id: str) -> dict[str, Any]:
    row = conn.execute(
        "SELECT * FROM reflections WHERE id = ?", (reflection_id,)
    ).fetchone()
    out = db.row_to_dict(row)
    if out is None:
        raise HTTPException(404, f"no reflection {reflection_id}")
    return out


class DiagnosisIn(BaseModel):
    reflection_id: str
    misconception_ids: list[str] = Field(default_factory=list)
    novel_text: str | None = None
    confidence: float = 0.0
    evidence_span: str = ""


@app.post("/internal/diagnoses")
def put_diagnosis(payload: DiagnosisIn) -> dict[str, Any]:
    n = conn.execute("SELECT COUNT(*) c FROM diagnoses").fetchone()["c"]
    did = f"D_{n + 1:04d}"
    db.upsert(conn, "diagnoses", {"id": did, **payload.model_dump()})
    conn.commit()
    return {"id": did, "stored": True}


@app.get("/internal/mastery/{student_id}")
def get_mastery(student_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM mastery WHERE student_id = ?", (student_id,)
    ).fetchall()
    return db.rows_to_dicts(rows)


class MasteryIn(BaseModel):
    student_id: str
    concept_id: str
    observation: float
    week: int


@app.post("/internal/mastery")
def put_mastery(payload: MasteryIn) -> dict[str, Any]:
    """The EMA itself is /core/mastery.py — deterministic, no model."""
    from core.mastery import update_level

    row = conn.execute(
        "SELECT * FROM mastery WHERE student_id = ? AND concept_id = ?",
        (payload.student_id, payload.concept_id),
    ).fetchone()
    prev = db.row_to_dict(row)

    level = update_level(
        None if prev is None else prev["level"], payload.observation
    )
    history = (prev["history"] if prev else []) + [
        {"week": payload.week, "level": round(level, 4)}
    ]
    record = {
        "student_id": payload.student_id,
        "concept_id": payload.concept_id,
        "level": round(level, 4),
        "last_seen_week": payload.week,
        "history": history,
        "corrected_misconceptions": (
            prev["corrected_misconceptions"] if prev else []
        ),
    }
    db.upsert(conn, "mastery", record)
    conn.commit()
    return record


@app.get("/internal/clusters")
def get_clusters(week: int) -> list[dict[str, Any]]:
    """k-anonymity gate is applied here. Nothing below k ever leaves. R-04."""
    rows = conn.execute(
        "SELECT * FROM clusters WHERE week = ? AND k_satisfied = 1", (week,)
    ).fetchall()
    return db.rows_to_dicts(rows)


@app.get("/internal/cohort-mastery/{concept_id}")
def get_cohort_mastery(concept_id: str) -> dict[str, Any]:
    row = conn.execute(
        "SELECT AVG(level) m, COUNT(*) n FROM mastery WHERE concept_id = ?",
        (concept_id,),
    ).fetchone()
    return {
        "concept_id": concept_id,
        "mean_level": round(row["m"], 4) if row["m"] is not None else None,
        "n": row["n"],
    }


class InterventionIn(BaseModel):
    cluster_id: str
    kind: str
    content: str
    delivered_week: int


@app.post("/internal/interventions")
def put_intervention(payload: InterventionIn) -> dict[str, Any]:
    n = conn.execute("SELECT COUNT(*) c FROM interventions").fetchone()["c"]
    iid = f"INT_{n + 1:03d}"
    db.upsert(conn, "interventions", {
        "id": iid, **payload.model_dump(), "efficacy": None,
    })
    conn.commit()
    return {"id": iid, "delivered": True}


class AccessLogIn(BaseModel):
    actor_role: str
    attempted: str
    decision: str
    rule: str
    req_id: str
    ts: str | None = None


@app.post("/internal/access-log", status_code=201)
def put_access_log(payload: AccessLogIn) -> dict[str, Any]:
    """
    R-03. Written by the Warden (nitro/src/foray/warden.guard.ts) on EVERY
    denial. This row is demo beat 6 — the judge watches it appear.
    """
    row = payload.model_dump()
    row["ts"] = row["ts"] or now_iso()
    db.upsert(conn, "access_log", row)
    conn.commit()
    return {"logged": True}


# ═══════════════════════════════════════════════════════════════════
#  UI — read-only, shaped for rendering
# ═══════════════════════════════════════════════════════════════════

@app.get("/ui/concepts")
def ui_concepts(course: str = "CN") -> list[dict[str, Any]]:
    """One course's concept graph. Default CN keeps the demo endpoints and
    the faculty heatmap exactly as they were."""
    rows = conn.execute(
        "SELECT * FROM concepts WHERE course = ? ORDER BY id", (course,)
    ).fetchall()
    return db.rows_to_dicts(rows)


@app.get("/ui/taxonomy")
def ui_taxonomy(course: str | None = None) -> list[dict[str, Any]]:
    """The named misconceptions for ONE subject.

    Omitting `course` returns all of them, which is right for an overview
    but wrong for a student: showing a Computer Networks student all 37
    across six subjects is noise. The Diagnostician deliberately still
    classifies against the FULL taxonomy — narrowing by tagged concept was
    found to miss M12 phrased against C03 — so this scoping is for DISPLAY
    only and does not change what gets detected.
    """
    if course:
        rows = conn.execute(
            "SELECT * FROM misconceptions WHERE course = ? ORDER BY id",
            (course,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM misconceptions ORDER BY id").fetchall()
    return db.rows_to_dicts(rows)


@app.get("/ui/access-log")
def ui_access_log(limit: int = 25) -> list[dict[str, Any]]:
    """Beat 6 renders this. Newest first."""
    rows = conn.execute(
        "SELECT * FROM access_log ORDER BY rowid_ DESC LIMIT ?", (limit,)
    ).fetchall()
    return db.rows_to_dicts(rows)


@app.get("/ui/heatmap")
def ui_heatmap(course: str = "CN") -> dict[str, Any]:
    """Concept x week misconception counts for the faculty map.
    Accepts a `course` filter so the faculty panel can browse all six
    classes, not just Computer Networks."""
    rows = conn.execute(
        """SELECT c.week, m.concept_id, SUM(c.student_count) n
           FROM clusters c JOIN misconceptions m
             ON m.id = c.misconception_id
           WHERE c.k_satisfied = 1 AND m.course = ?
           GROUP BY c.week, m.concept_id""",
        (course,),
    ).fetchall()
    # The denominator is THIS class, not always the 60-student CN cohort.
    # A Semester VI class has 8 students; reporting "5 of 60" there is
    # simply a wrong number on a faculty screen. Read it from the cluster
    # rows so the heatmap and the drill-down can never disagree.
    size = conn.execute(
        """SELECT MAX(c.cohort_size) n FROM clusters c
           JOIN misconceptions m ON m.id = c.misconception_id
           WHERE m.course = ?""", (course,)).fetchone()["n"]
    return {
        "cohort_size": size or COHORT_SIZE,
        "k": K_ANONYMITY,
        "cells": [dict(r) for r in rows],
    }


LIVE_WEEK = 99          # outside the taught weeks 1-8, on purpose


class DiagnoseIn(BaseModel):
    text: str
    concept_ids: list[str] = Field(default_factory=lambda: ["C11"])
    # A live capture must NOT land in a taught week.
    #
    # This defaulted to 6, and the full run-through caught what that does:
    # a volunteer's reflection gets diagnosed M12, joins the week-6 count,
    # and beat 4 reads 24 -> 4 instead of 23 -> 4. The slide says 23. Doing
    # beat 1 on stage would have silently broken the crown jewel.
    #
    # Week 99 and a distinct student id keep the seeded cohort exact. The
    # live capture is one student's reflection, not a 61st cohort member.
    week: int = LIVE_WEEK
    student_id: str = "S_LIVE"


@app.post("/ui/diagnose")
def ui_diagnose(payload: DiagnoseIn) -> dict[str, Any]:
    """
    BEAT 1. Live capture: a reflection in, a NAMED misconception out, with
    the student's own words quoted back as evidence.

    Persists the reflection and diagnosis so the run is real, not a mock —
    the same rows the cohort path reads.
    """
    from agents.diagnostician import classify

    n = conn.execute("SELECT COUNT(*) c FROM reflections").fetchone()["c"]
    rid = f"R_L{n + 1:04d}"
    conn.execute(
        "INSERT OR REPLACE INTO reflections "
        "(id, student_id, concept_ids, week, lang, text, created_at) "
        "VALUES (?,?,?,?,?,?,?)",
        (rid, payload.student_id, json.dumps(payload.concept_ids), payload.week,
         "en", payload.text, now_iso()),
    )

    d = classify(payload.text, payload.concept_ids)

    did = f"D_L{n + 1:04d}"
    db.upsert(conn, "diagnoses", {
        "id": did,
        "reflection_id": rid,
        "misconception_ids": d["misconception_ids"],
        "novel_text": d["novel_text"],
        "confidence": d["confidence"],
        "evidence_span": d["evidence_span"],
    })
    conn.commit()

    # Name it. R-01: named, never scored.
    named = []
    for mid in d["misconception_ids"]:
        row = conn.execute(
            "SELECT * FROM misconceptions WHERE id = ?", (mid,)
        ).fetchone()
        m = db.row_to_dict(row)
        if m:
            named.append(m)

    # Material available to ground a correction (R-02). The Grounding
    # Verifier gate itself lands in S3 — this reports what it will have.
    material = []
    if named:
        material = get_materials(named[0]["concept_id"])[:3]

    return {
        "reflection_id": rid,
        "diagnosis_id": did,
        "misconceptions": named,
        "novel_text": d["novel_text"],
        "confidence": d["confidence"],
        "evidence_span": d["evidence_span"],
        "source": d["source"],
        "grounding_available": [
            {"id": c["id"], "page": c["page"], "source": c["source"]}
            for c in material
        ],
    }


@app.post("/ui/correct")
def ui_correct(diagnosis_id: str) -> dict[str, Any]:
    """
    BEAT 2. The R-02 gate. Either a correction cited to a real page, or an
    escalation to faculty — never an ungrounded assertion.
    """
    from agents.grounding import verify

    row = conn.execute(
        "SELECT * FROM diagnoses WHERE id = ?", (diagnosis_id,)
    ).fetchone()
    d = db.row_to_dict(row)
    if d is None:
        raise HTTPException(404, f"no diagnosis {diagnosis_id}")
    if not d["misconception_ids"]:
        return {"grounded": False, "status": "escalated_to_faculty",
                "text": "No misconception named — nothing to correct.",
                "material_ids": []}

    mrow = conn.execute(
        "SELECT * FROM misconceptions WHERE id = ?", (d["misconception_ids"][0],)
    ).fetchone()
    mis = db.row_to_dict(mrow)
    chunks = get_materials(mis["concept_id"])
    out = verify(mis, chunks)

    n = conn.execute("SELECT COUNT(*) c FROM corrections").fetchone()["c"]
    db.upsert(conn, "corrections", {
        "id": f"K_{n + 1:04d}", "diagnosis_id": diagnosis_id,
        "grounded": out["grounded"], "material_ids": out["material_ids"],
        "text": out["text"], "retrieval_question": out["retrieval_question"],
        "status": out["status"],
    })
    conn.commit()
    out["misconception"] = mis
    return out


@app.get("/ui/cluster")
def ui_cluster(week: int, concept_id: str) -> list[dict[str, Any]]:
    """
    BEAT 3. Click a hot cell: the NAMED misconception, the count, and the
    root cause traced backwards to a prerequisite — usually an earlier unit.
    """
    rows = conn.execute(
        """SELECT c.*, m.name AS misconception_name, m.concept_id AS on_concept
           FROM clusters c JOIN misconceptions m ON m.id = c.misconception_id
           WHERE c.week = ? AND m.concept_id = ? AND c.k_satisfied = 1
           ORDER BY c.student_count DESC""",
        (week, concept_id),
    ).fetchall()

    out: list[dict[str, Any]] = []
    for r in rows:
        d = db.row_to_dict(r)
        rc = d.get("root_cause_concept_id")
        if rc:
            crow = conn.execute(
                "SELECT * FROM concepts WHERE id = ?", (rc,)
            ).fetchone()
            rcc = db.row_to_dict(crow)
            d["root_cause"] = rcc
            d["crosses_unit"] = bool(
                rcc and rcc["unit"] != db.row_to_dict(
                    conn.execute("SELECT * FROM concepts WHERE id = ?",
                                 (d["on_concept"],)).fetchone())["unit"])
            cm = conn.execute(
                "SELECT AVG(level) m FROM mastery WHERE concept_id = ?", (rc,)
            ).fetchone()
            d["root_cause_mastery"] = round(cm["m"], 3) if cm["m"] else None
        out.append(d)
    return out


# ═══════════════════════════════════════════════════════════════════
#  BEAT 4 — the crown jewel.
#
#  The intervention text is generated. The number that follows it is
#  COUNTED, by core/efficacy.py, with no model anywhere near it. That
#  separation is the whole reason the number is worth putting on a slide.
# ═══════════════════════════════════════════════════════════════════

@app.get("/ui/intervention")
def ui_get_intervention(cluster_id: str) -> dict[str, Any]:
    """Existing intervention for a cluster, if one has been delivered."""
    row = conn.execute(
        "SELECT * FROM interventions WHERE cluster_id = ? "
        "ORDER BY rowid DESC LIMIT 1", (cluster_id,)
    ).fetchone()
    return db.row_to_dict(row) or {}


@app.post("/ui/deliver")
def ui_deliver(cluster_id: str) -> dict[str, Any]:
    """Faculty delivers the ten-minute intervention for a cluster."""
    from agents.intervention import design

    crow = conn.execute(
        "SELECT * FROM clusters WHERE id = ?", (cluster_id,)
    ).fetchone()
    cl = db.row_to_dict(crow)
    if cl is None:
        raise HTTPException(404, f"no cluster {cluster_id}")

    mis = db.row_to_dict(conn.execute(
        "SELECT * FROM misconceptions WHERE id = ?",
        (cl["misconception_id"],)).fetchone())
    root = db.row_to_dict(conn.execute(
        "SELECT * FROM concepts WHERE id = ?",
        (cl["root_cause_concept_id"],)).fetchone()) if cl.get(
            "root_cause_concept_id") else None
    if root is None:
        raise HTTPException(400, "cluster has no root cause traced yet")

    out = design(cl, mis, root, get_materials(root["id"]))

    n = conn.execute("SELECT COUNT(*) c FROM interventions").fetchone()["c"]
    iid = f"INT_{n + 1:03d}"
    db.upsert(conn, "interventions", {
        "id": iid, "cluster_id": cluster_id, "kind": out["kind"],
        "content": out["content"], "delivered_week": cl["week"],
        "efficacy": None,
    })
    conn.commit()
    return {"id": iid, "delivered": True, "delivered_week": cl["week"], **out}


@app.post("/ui/verify")
def ui_verify(intervention_id: str) -> dict[str, Any]:
    """
    R-08. Count the SAME misconception id before and after. Deterministic.

    This is the 23 -> 4. `cleared` is a strict decrease, so the loop can
    report failure — a verification that can only ever say "it worked" is
    not a verification.
    """
    from core.efficacy import attach, measure

    irow = conn.execute(
        "SELECT * FROM interventions WHERE id = ?", (intervention_id,)
    ).fetchone()
    iv = db.row_to_dict(irow)
    if iv is None:
        raise HTTPException(404, f"no intervention {intervention_id}")

    cl = db.row_to_dict(conn.execute(
        "SELECT * FROM clusters WHERE id = ?", (iv["cluster_id"],)).fetchone())

    eff = measure(conn, cl["misconception_id"],
                  before_week=iv["delivered_week"],
                  after_week=iv["delivered_week"] + 1)
    attach(conn, intervention_id, eff)

    return {
        "intervention_id": intervention_id,
        "misconception_id": cl["misconception_id"],
        "cohort_size": cl["cohort_size"],
        **eff,
    }

def current_user(authorization: str | None = Header(None)) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "not logged in")
    token = authorization.split(" ", 1)[1].strip()
    row = conn.execute(
        """SELECT u.* FROM auth_tokens t JOIN users u ON u.id = t.user_id
           WHERE t.token = ?""", (token,)
    ).fetchone()
    user = db.row_to_dict(row)
    if user is None:
        raise HTTPException(401, "invalid or expired session")
    return user


@app.get("/ui/compass")
def ui_compass(user: dict = Depends(current_user),
               class_id: str | None = None) -> dict[str, Any]:
    """
    BEAT 5. R-09. Three gaps, each citing the reflection that proved it.

    Now auth-required. Faculty is denied here and the denial is written to
    the access log — Compass items carry evidence_text (individual_mastery
    scope), so the R-03 boundary applies. A student reads their own roadmap
    only; the student_id comes from the auth token, never the URL.
    """
    from agents.compass import build

    if user["role"] == "faculty":
        rule, req_id = denial_reason("faculty", "individual_mastery")
        db.upsert(conn, "access_log", {
            "actor_role": "faculty",
            "attempted": "read_compass:individual_mastery",
            "decision": "DENIED", "rule": rule, "req_id": req_id,
            "ts": now_iso(),
        })
        conn.commit()
        raise HTTPException(403, {"decision": "DENIED", "rule": rule,
                                   "req_id": req_id})

    student_id = user.get("student_id")
    if not student_id:
        raise HTTPException(403, "no student_id on this account")

    # §14: serve the pre-computed cache when the logged-in student is the
    # cached one. reset.sh precomputes for whichever student has the most
    # gaps — if they match, serve the file; otherwise build live.
    # The roadmap is per SUBJECT. Without this a student switching to
    # Compiler Design would still be shown their Computer Networks gaps.
    cls = _selected_class(user, class_id)
    course = (cls or {}).get("course", "CN")

    # §14: serve the pre-computed cache only when it matches BOTH the
    # student and the subject being asked about.
    cache = db.DATA / "seed_cache" / "compass.json"
    if cache.exists():
        try:
            cached = json.loads(cache.read_text(encoding="utf-8"))
            if (cached.get("student_id") == student_id
                    and cached.get("course", "CN") == course):
                return cached
        except Exception:                             # noqa: BLE001
            pass

    # Every OTHER (student, subject) pair is precomputed too, with the
    # model switched off — the gap SELECTION is deterministic either way,
    # only the prose differs. Without this, switching subject built live:
    # 3 sequential calls, ~39s, and the free-tier daily quota gone the
    # first time anyone browsed the six subjects.
    bulk = db.DATA / "seed_cache" / "compass_all.json"
    if bulk.exists():
        try:
            hit = json.loads(bulk.read_text(encoding="utf-8")).get(
                f"{student_id}|{course}")
            if hit:
                return {**hit, "class": cls}
        except Exception:                             # noqa: BLE001
            pass

    return {"student_id": student_id, "course": course,
            "class": cls, "items": build(conn, student_id, course=course)}


@app.get("/health")
def health() -> dict[str, Any]:
    counts = {
        t: conn.execute(f"SELECT COUNT(*) c FROM {t}").fetchone()["c"]
        for t in ("concepts", "misconceptions", "material_chunks",
                  "reflections", "clusters", "access_log",
                  "users", "chat_messages", "topic_questions")
    }
    from agents import llm as _llm
    return {
        "ok": True,
        # "live" = beats 1 and 2 call the model. "offline" = deterministic
        # signal matcher. Check this before every rehearsal.
        "llm": _llm.describe(),   # e.g. "gemini:gemini-2.5-flash" or "offline"
        "k": K_ANONYMITY,
        "counts": counts,
        "requirements": len(REQUIREMENTS),
    }


# ═══════════════════════════════════════════════════════════════════
#  S7 — ACCOUNTS, CHAT CAPTURE, ROSTER, QUESTIONED TOPICS
#
#  Real logins replace the role dropdown. The 90-second box becomes a
#  chat (voice-capable in the UI); every message is analysed in place
#  and logged append-only (R-11). Questions are counted per concept
#  (R-12). Faculty gets the roster and the counts — never the words.
# ═══════════════════════════════════════════════════════════════════

from .auth import hash_password  # noqa: E402  — shared with the seeder


def _public_user(u: dict[str, Any]) -> dict[str, Any]:
    out = dict(u)
    out.pop("password_hash", None)
    return out


class LoginIn(BaseModel):
    email: str
    password: str


@app.post("/ui/login")
def ui_login(payload: LoginIn) -> dict[str, Any]:
    row = conn.execute(
        "SELECT * FROM users WHERE lower(email) = ?",
        (payload.email.strip().lower(),)
    ).fetchone()
    user = db.row_to_dict(row)
    if user is None or user["password_hash"] != hash_password(
            payload.email, payload.password):
        raise HTTPException(401, "wrong email or password")

    token = secrets.token_hex(24)
    db.upsert(conn, "auth_tokens", {
        "token": token, "user_id": user["id"], "created_at": now_iso(),
    })
    conn.commit()
    return {"token": token, "user": _public_user(user), **_context_for(user)}


@app.post("/ui/logout")
def ui_logout(user: dict = Depends(current_user),
              authorization: str | None = Header(None)) -> dict[str, Any]:
    token = (authorization or "").split(" ", 1)[-1].strip()
    conn.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
    conn.commit()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════
#  S8 — a student takes MANY subjects.
#
#  Every scoped surface resolves through _selected_class(): the caller may
#  name a class_id, and it is honoured ONLY if they are actually enrolled
#  in it. That check is the point — otherwise "switch subject" becomes a
#  way to read another cohort's data by editing a URL.
# ═══════════════════════════════════════════════════════════════════

def _classes_for(user: dict[str, Any]) -> list[dict[str, Any]]:
    """Every class this user is in. Faculty: the ones they teach."""
    if user["role"] == "faculty":
        return db.rows_to_dicts(conn.execute(
            "SELECT * FROM classes WHERE faculty_user_id = ? ORDER BY code",
            (user["id"],)).fetchall())
    rows = db.rows_to_dicts(conn.execute(
        "SELECT c.* FROM classes c JOIN enrollments e ON e.class_id = c.id "
        "WHERE e.user_id = ? ORDER BY c.code", (user["id"],)).fetchall())
    if rows:
        return rows
    # Pre-S8 accounts with only the single default column.
    if user.get("class_id"):
        one = db.row_to_dict(conn.execute(
            "SELECT * FROM classes WHERE id = ?", (user["class_id"],)).fetchone())
        return [one] if one else []
    return []


def _selected_class(user: dict[str, Any],
                    class_id: str | None = None) -> dict[str, Any] | None:
    """Resolve the class this request is about.

    A requested class_id the caller is NOT enrolled in is refused (403) and
    the refusal is logged — same boundary as everything else here.
    """
    mine = _classes_for(user)
    if not mine:
        return None
    if not class_id:
        # default: their registered home class, else the first alphabetically
        return next((c for c in mine if c["id"] == user.get("class_id")), mine[0])
    hit = next((c for c in mine if c["id"] == class_id), None)
    if hit is None:
        db.upsert(conn, "access_log", {
            "actor_role": user["role"],
            "attempted": f"read_class:{class_id}",
            "decision": "DENIED",
            "rule": "P-08: a user may only read a class they are enrolled in",
            "req_id": "R-03", "ts": now_iso(),
        })
        conn.commit()
        raise HTTPException(403, f"not enrolled in {class_id}")
    return hit


def _context_for(user: dict[str, Any],
                 class_id: str | None = None) -> dict[str, Any]:
    """Class + faculty info shown in the header after login.

    `classes` is the full enrolment so the UI can render a subject switcher;
    `class` is the one this request is scoped to.
    """
    mine = _classes_for(user)
    cls = _selected_class(user, class_id)
    faculty = None
    if cls:
        f = db.row_to_dict(conn.execute(
            "SELECT * FROM users WHERE id = ?", (cls["faculty_user_id"],)
        ).fetchone())
        if f:
            faculty = {"name": f["name"], "email": f["email"]}
    return {"class": cls, "classes": mine, "faculty": faculty}


@app.get("/ui/me")
def ui_me(user: dict = Depends(current_user),
          class_id: str | None = None) -> dict[str, Any]:
    return {"user": _public_user(user), **_context_for(user, class_id)}


@app.get("/ui/mastery")
def ui_mastery(user: dict = Depends(current_user),
               class_id: str | None = None) -> list[dict[str, Any]]:
    """A student's own mastery state for ONE subject — the constellation
    colours nodes from this. Scoped to the selected class, so switching
    subject gives a genuinely different graph rather than one graph with
    other courses' concepts bleeding in.

    Returns [] for faculty (they see cohort mastery via the heatmap)."""
    if user["role"] != "student" or not user.get("student_id"):
        return []
    cls = _selected_class(user, class_id)
    course = (cls or {}).get("course", "CN")
    rows = conn.execute(
        "SELECT m.concept_id, m.level, m.last_seen_week FROM mastery m "
        "JOIN concepts c ON c.id = m.concept_id "
        "WHERE m.student_id = ? AND c.course = ?",
        (user["student_id"], course),
    ).fetchall()
    return db.rows_to_dicts(rows)


# ── the chat capture — replaces the bare 90-second box ─────────────

_TAMIL_MARKERS = ("puriyala", "theriyala", "puriyudhu", "innaiku", " nu ",
                  "panna", "iruku", "sandheham")


def _detect_lang(text: str) -> str:
    low = f" {text.lower()} "
    return "mixed" if any(m in low for m in _TAMIL_MARKERS) else "en"


def named_concept_fallback(d: dict, course_concepts: list[str]) -> str:
    """Concept to file an untargeted chat reflection under: the named
    misconception's own concept if there is one, else the course's first."""
    if d.get("misconception_ids"):
        row = conn.execute(
            "SELECT concept_id FROM misconceptions WHERE id = ?",
            (d["misconception_ids"][0],)).fetchone()
        if row:
            return row["concept_id"]
    return course_concepts[0] if course_concepts else "C11"


class ChatIn(BaseModel):
    text: str
    session_id: str | None = None
    # Which subject this turn is about. Omitted -> the student's default
    # class. Enrolment is checked before it is honoured.
    class_id: str | None = None


@app.post("/ui/chat")
def ui_chat(payload: ChatIn, user: dict = Depends(current_user)) -> dict[str, Any]:
    """
    One student turn, fully analysed IN the conversation:

      1. topic tagger (deterministic, /core/topics.py) — question? which
         concepts? -> a topic_questions row per hit (R-12)
      2. Diagnostician — misconception named from the taxonomy, quoted
         verbatim (R-01)
      3. Grounding Verifier — correction only if citable, else escalation
         (R-02; the gate is upstream of the reply, in code)
      4. Elicitor — the visible reply, handed only what the gates approved
      5. both turns land in chat_messages, append-only (R-11)

    Live captures stay at week 99 / the student's own S_ id, so the seeded
    cohort numbers (23 -> 4) never drift. That bug already happened once.
    """
    from agents.diagnostician import classify
    from agents.elicitor import respond
    from agents.grounding import verify
    from core import topics

    if user["role"] != "student" or not user.get("student_id"):
        raise HTTPException(403, "chat capture is for student accounts")
    text = payload.text.strip()
    if not text:
        raise HTTPException(422, "empty message")

    sid = user["student_id"]
    crow = _selected_class(user, payload.class_id)
    class_id = (crow or {}).get("id") or user.get("class_id") or "CLS_CN5"
    course = (crow or {}).get("course", "CN")

    # session
    session = None
    if payload.session_id:
        session = db.row_to_dict(conn.execute(
            "SELECT * FROM chat_sessions WHERE id = ? AND student_id = ?",
            (payload.session_id, sid)).fetchone())
    if session is None:
        n = conn.execute("SELECT COUNT(*) c FROM chat_sessions").fetchone()["c"]
        session = {
            "id": f"CS_{n + 1:04d}", "student_id": sid, "class_id": class_id,
            "started_at": now_iso(), "ended_at": None,
            "misconception_ids": [], "question_concept_ids": [],
        }
        db.upsert(conn, "chat_sessions", session)

    history = db.rows_to_dicts(conn.execute(
        "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id",
        (session["id"],)).fetchall())

    # 1 · deterministic topic/question tagging, within the student's course
    verdict = topics.analyse(text, course)
    tagged = [c for c in verdict["concept_ids"] if c != "C00"]
    if verdict["is_question"]:
        for cid in (verdict["concept_ids"][:2] or ["C00"]):
            db.upsert(conn, "topic_questions", {
                "student_id": sid, "class_id": class_id, "concept_id": cid,
                "week": LIVE_WEEK, "source": "chat",
                "excerpt": text[:280], "ts": now_iso(),
            })

    # 2 · Diagnostician — against the student's WHOLE COURSE taxonomy, not
    #     the tagged concepts. A chat message blends topics: "the port
    #     number is basically the connection" tags C03 by keyword, but the
    #     misconception it carries (M12) lives on C11. Narrowing by tagged
    #     concept made the Diagnostician miss it — found live in the
    #     browser. Whole-course is the right width; other courses' rows
    #     never enter the prompt.
    course_concepts = [r["id"] for r in conn.execute(
        "SELECT id FROM concepts WHERE course = ?", (course,)).fetchall()]
    d = classify(text, course_concepts)

    named = None
    correction = None
    reflection_id = None
    if d["misconception_ids"]:
        # persist as a real reflection + diagnosis, week 99, own S_ id
        n = conn.execute("SELECT COUNT(*) c FROM reflections").fetchone()["c"]
        reflection_id = f"R_C{n + 1:04d}"
        db.upsert(conn, "reflections", {
            "id": reflection_id, "student_id": sid,
            "concept_ids": tagged or [named_concept_fallback(d, course_concepts)],
            "week": LIVE_WEEK,
            "lang": _detect_lang(text), "text": text, "created_at": now_iso(),
        })
        nd = conn.execute("SELECT COUNT(*) c FROM diagnoses").fetchone()["c"]
        db.upsert(conn, "diagnoses", {
            "id": f"D_C{nd + 1:04d}", "reflection_id": reflection_id,
            "misconception_ids": d["misconception_ids"],
            "novel_text": d["novel_text"], "confidence": d["confidence"],
            "evidence_span": d["evidence_span"],
        })
        named = db.row_to_dict(conn.execute(
            "SELECT * FROM misconceptions WHERE id = ?",
            (d["misconception_ids"][0],)).fetchone())

        # 3 · the R-02 gate — correction only if citable
        if named:
            correction = verify(named, get_materials(named["concept_id"]))
            nk = conn.execute(
                "SELECT COUNT(*) c FROM corrections").fetchone()["c"]
            db.upsert(conn, "corrections", {
                "id": f"K_{nk + 1:04d}",
                "diagnosis_id": f"D_C{nd + 1:04d}",
                "grounded": correction["grounded"],
                "material_ids": correction["material_ids"],
                "text": correction["text"],
                "retrieval_question": correction["retrieval_question"],
                "status": correction["status"],
            })
    elif verdict["is_question"] and not tagged:
        # A question nothing in the course maps to: the honest escalation.
        correction = {
            "grounded": False, "material_ids": [], "status":
            "escalated_to_faculty", "text":
            "Outside the prescribed material — routed to faculty.",
            "retrieval_question": "", "source": "gate",
        }

    # 4 · the Elicitor writes the visible reply
    concept_names = {r["id"]: r["name"] for r in conn.execute(
        "SELECT id, name FROM concepts WHERE course = ?", (course,)
    ).fetchall()}
    faculty = (_context_for(user).get("faculty") or {}).get("name", "your teacher")
    turn = history + [{"sender": "student", "text": text}]
    reply = respond(turn, verdict, named, correction, concept_names, faculty)

    # 5 · append-only log rows (R-11)
    analysis = {
        "is_question": verdict["is_question"],
        "topic_concept_ids": verdict["concept_ids"],
        "misconception_ids": d["misconception_ids"],
        "evidence_span": d["evidence_span"],
        "confidence": d["confidence"],
        "diagnosis_source": d["source"],
        "reflection_id": reflection_id,
        "correction_status": correction["status"] if correction else None,
        "grounded": bool(correction and correction["grounded"]),
    }
    conn.execute(
        "INSERT INTO chat_messages (session_id, student_id, sender, text, "
        "analysis, ts) VALUES (?,?,?,?,?,?)",
        (session["id"], sid, "student", text,
         json.dumps(analysis, ensure_ascii=False), now_iso()))
    conn.execute(
        "INSERT INTO chat_messages (session_id, student_id, sender, text, "
        "analysis, ts) VALUES (?,?,?,?,?,?)",
        (session["id"], sid, "agent", reply["reply"],
         json.dumps({"source": reply["source"]}, ensure_ascii=False),
         now_iso()))

    # roll the session summary
    mids = sorted(set(session["misconception_ids"]) | set(d["misconception_ids"]))
    qids = sorted(set(session["question_concept_ids"])
                  | (set(verdict["concept_ids"]) if verdict["is_question"] else set()))
    conn.execute(
        "UPDATE chat_sessions SET misconception_ids = ?, "
        "question_concept_ids = ? WHERE id = ?",
        (json.dumps(mids), json.dumps(qids), session["id"]))
    conn.commit()

    return {
        "session_id": session["id"],
        "reply": reply["reply"],
        "reply_source": reply["source"],
        "analysis": {
            **analysis,
            "misconceptions": [named] if named else [],
            "topics": [{"id": c, "name": concept_names.get(c, "unmapped")}
                       for c in verdict["concept_ids"]],
            "correction": correction,
        },
    }


@app.get("/ui/chat/history")
def ui_chat_history(user: dict = Depends(current_user)) -> dict[str, Any]:
    """A student's own transcript — scope chat_log, their own rows only."""
    if user["role"] != "student" or not user.get("student_id"):
        raise HTTPException(403, "students only — faculty cannot read transcripts")
    sessions = db.rows_to_dicts(conn.execute(
        "SELECT * FROM chat_sessions WHERE student_id = ? ORDER BY started_at",
        (user["student_id"],)).fetchall())
    for s in sessions:
        s["messages"] = db.rows_to_dicts(conn.execute(
            "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id",
            (s["id"],)).fetchall())
    return {"student_id": user["student_id"], "sessions": sessions}


@app.get("/ui/transcript")
def ui_transcript(session_id: str,
                  user: dict = Depends(current_user)) -> dict[str, Any]:
    """
    The regulation log, permission-gated. A student reads their own session.
    A FACULTY caller is refused and the refusal is WRITTEN TO THE ACCESS
    LOG — same boundary as beat 6, now covering chat.
    """
    session = db.row_to_dict(conn.execute(
        "SELECT * FROM chat_sessions WHERE id = ?", (session_id,)).fetchone())
    if session is None:
        raise HTTPException(404, f"no session {session_id}")

    if user["role"] == "faculty" or session["student_id"] != user.get("student_id"):
        if user["role"] == "faculty":
            rule, req_id = denial_reason("faculty", "chat_log")
        else:
            rule, req_id = ("P-07: a student may only read their own "
                            "transcript", "R-11")
        db.upsert(conn, "access_log", {
            "actor_role": user["role"],
            "attempted": f"read_chat_log:{session_id}",
            "decision": "DENIED", "rule": rule, "req_id": req_id,
            "ts": now_iso(),
        })
        conn.commit()
        raise HTTPException(403, {"decision": "DENIED", "rule": rule,
                                  "req_id": req_id})

    session["messages"] = db.rows_to_dicts(conn.execute(
        "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id",
        (session_id,)).fetchall())
    return session


# ── faculty: the roster and the questioned-topic counts ────────────

def _roster_rows(class_id: str) -> list[dict[str, Any]]:
    """Names, scenarios and COUNTS. No reflection text, no chat text, no
    per-student mastery — those scopes stay denied to faculty."""
    students = db.rows_to_dicts(conn.execute(
        "SELECT DISTINCT u.* FROM users u "
        "LEFT JOIN enrollments e ON e.user_id = u.id "
        "WHERE u.role = 'student' AND (e.class_id = ? OR u.class_id = ?) "
        "ORDER BY u.name", (class_id, class_id)).fetchall())
    out = []
    for s in students:
        sid = s.get("student_id")
        counts = {
            "reflections": conn.execute(
                "SELECT COUNT(*) c FROM reflections WHERE student_id = ?",
                (sid,)).fetchone()["c"],
            "chat_sessions": conn.execute(
                "SELECT COUNT(*) c FROM chat_sessions WHERE student_id = ?",
                (sid,)).fetchone()["c"],
            "chat_messages": conn.execute(
                "SELECT COUNT(*) c FROM chat_messages WHERE student_id = ? "
                "AND sender = 'student'", (sid,)).fetchone()["c"],
            "questions_asked": conn.execute(
                "SELECT COUNT(*) c FROM topic_questions WHERE student_id = ?",
                (sid,)).fetchone()["c"],
            "misconceptions_named": conn.execute(
                """SELECT COUNT(DISTINCT json_extract(d.misconception_ids,'$[0]'))
                   FROM diagnoses d JOIN reflections r
                     ON r.id = d.reflection_id
                   WHERE r.student_id = ? AND d.misconception_ids != '[]'""",
                (sid,)).fetchone()[0],
        }
        last = conn.execute(
            "SELECT MAX(ts) m FROM chat_messages WHERE student_id = ?",
            (sid,)).fetchone()["m"]
        sessions = db.rows_to_dicts(conn.execute(
            "SELECT id, started_at FROM chat_sessions WHERE student_id = ? "
            "ORDER BY started_at DESC LIMIT 3", (sid,)).fetchall())
        out.append({
            "user_id": s["id"], "name": s["name"], "email": s["email"],
            "student_id": sid, "scenario": s.get("scenario"),
            "scenario_note": s.get("scenario_note"),
            "counts": counts, "last_active": last,
            "recent_sessions": sessions,   # ids only — the text is gated
        })
    return out


@app.get("/ui/roster")
def ui_roster(user: dict = Depends(current_user)) -> dict[str, Any]:
    """Every class this teacher takes, every enrolled student, labeled by
    subject. Still summaries and counts — never words."""
    if user["role"] != "faculty":
        raise HTTPException(403, "faculty only")
    classes = db.rows_to_dicts(conn.execute(
        "SELECT * FROM classes WHERE faculty_user_id = ? ORDER BY id",
        (user["id"],)).fetchall())
    students: list[dict[str, Any]] = []
    for cls in classes:
        for s in _roster_rows(cls["id"]):
            s["class"] = {"id": cls["id"], "code": cls["code"],
                          "name": cls["name"], "course": cls["course"]}
            students.append(s)
    students.sort(key=lambda s: s["name"])
    return {"classes": classes, "students": students}


def _topic_rows(class_id: str | None = None) -> list[dict[str, Any]]:
    """R-12: counted from logged questions. k-gate applied like R-04 —
    a topic below k distinct students is not surfaced."""
    where, args = "", []
    if class_id:
        where, args = "WHERE class_id = ?", [class_id]
    rows = conn.execute(
        f"""SELECT concept_id, COUNT(*) n,
                   COUNT(DISTINCT student_id) students, MAX(ts) last_ts
            FROM topic_questions {where}
            GROUP BY concept_id ORDER BY n DESC""", args).fetchall()
    names = {r["id"]: r["name"] for r in conn.execute(
        "SELECT id, name FROM concepts").fetchall()}
    names["C00"] = "Unmapped (outside the course)"
    return [
        {"concept_id": r["concept_id"],
         "concept_name": names.get(r["concept_id"], r["concept_id"]),
         "questions": r["n"], "students": r["students"],
         "last_asked": r["last_ts"]}
        for r in rows if r["students"] >= K_ANONYMITY
    ]


@app.get("/ui/topics")
def ui_topics(user: dict = Depends(current_user)) -> dict[str, Any]:
    """Questioned-topic counts for every class the teacher takes, grouped
    per class so each subject reads on its own terms."""
    if user["role"] != "faculty":
        raise HTTPException(403, "faculty only")
    classes = db.rows_to_dicts(conn.execute(
        "SELECT * FROM classes WHERE faculty_user_id = ? ORDER BY id",
        (user["id"],)).fetchall())
    groups = []
    for cls in classes:
        rows = _topic_rows(cls["id"])
        groups.append({
            "class": {"id": cls["id"], "code": cls["code"],
                      "name": cls["name"]},
            "topics": rows,
        })
    return {"k": K_ANONYMITY, "groups": groups}


# ── /internal — the MCP surface for the new records ────────────────
#    No HTTP auth here, like every other /internal route: the Warden
#    gates these at the MCP layer by caller role, and writes the
#    AccessLog row on denial.

@app.get("/internal/roster")
def internal_roster(class_id: str = "CLS_CN5") -> list[dict[str, Any]]:
    """Scope: student_profile. Names, scenarios, counts — no raw text."""
    return _roster_rows(class_id)


@app.get("/internal/topic-questions")
def internal_topic_questions(class_id: str | None = None) -> list[dict[str, Any]]:
    """Scope: cohort_aggregate. Counted, never generated (R-12)."""
    return _topic_rows(class_id)


@app.get("/internal/chat-log/{session_id}")
def internal_chat_log(session_id: str) -> dict[str, Any]:
    """Scope: chat_log — the regulation log. Faculty is DENIED upstream."""
    session = db.row_to_dict(conn.execute(
        "SELECT * FROM chat_sessions WHERE id = ?", (session_id,)).fetchone())
    if session is None:
        raise HTTPException(404, f"no session {session_id}")
    session["messages"] = db.rows_to_dicts(conn.execute(
        "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id",
        (session_id,)).fetchall())
    return session
