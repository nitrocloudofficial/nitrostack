"""
FORAY — SQLite store.

One file, zero setup, trivially resettable. No ORM: the tables are the
frozen schema in schema.py and nothing else. If you are tempted to add
SQLAlchemy, read foray_plan.md §19 first.

JSON-shaped fields (lists) are stored as JSON text and round-tripped by the
row adapters at the bottom. That keeps the Python dicts identical to the
TypedDicts in schema.py, which is the whole point of freezing them.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DB_PATH = DATA / "foray.db"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS concepts (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL,
    prereqs TEXT NOT NULL, x INTEGER NOT NULL, y INTEGER NOT NULL,
    course TEXT NOT NULL DEFAULT 'CN'
);
CREATE TABLE IF NOT EXISTS misconceptions (
    id TEXT PRIMARY KEY, concept_id TEXT NOT NULL, name TEXT NOT NULL,
    signals TEXT NOT NULL, correction_hint TEXT NOT NULL,
    course TEXT NOT NULL DEFAULT 'CN'
);
CREATE TABLE IF NOT EXISTS material_chunks (
    id TEXT PRIMARY KEY, source TEXT NOT NULL, page INTEGER NOT NULL,
    text TEXT NOT NULL, concept_ids TEXT NOT NULL,
    course TEXT NOT NULL DEFAULT 'CN'
);
CREATE TABLE IF NOT EXISTS reflections (
    id TEXT PRIMARY KEY, student_id TEXT NOT NULL, concept_ids TEXT NOT NULL,
    week INTEGER NOT NULL, lang TEXT NOT NULL, text TEXT NOT NULL,
    created_at TEXT NOT NULL
    -- NO score column. NO grade column. Deliberate. R-06.
);
CREATE TABLE IF NOT EXISTS diagnoses (
    id TEXT PRIMARY KEY, reflection_id TEXT NOT NULL,
    misconception_ids TEXT NOT NULL, novel_text TEXT,
    confidence REAL NOT NULL, evidence_span TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS corrections (
    id TEXT PRIMARY KEY, diagnosis_id TEXT NOT NULL, grounded INTEGER NOT NULL,
    material_ids TEXT NOT NULL, text TEXT NOT NULL,
    retrieval_question TEXT NOT NULL, status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mastery (
    student_id TEXT NOT NULL, concept_id TEXT NOT NULL, level REAL NOT NULL,
    last_seen_week INTEGER NOT NULL, history TEXT NOT NULL,
    corrected_misconceptions TEXT NOT NULL,
    PRIMARY KEY (student_id, concept_id)
);
CREATE TABLE IF NOT EXISTS clusters (
    id TEXT PRIMARY KEY, week INTEGER NOT NULL, misconception_id TEXT NOT NULL,
    student_count INTEGER NOT NULL, cohort_size INTEGER NOT NULL,
    k_satisfied INTEGER NOT NULL, root_cause_concept_id TEXT,
    root_cause_reasoning TEXT
);
CREATE TABLE IF NOT EXISTS interventions (
    id TEXT PRIMARY KEY, cluster_id TEXT NOT NULL, kind TEXT NOT NULL,
    content TEXT NOT NULL, delivered_week INTEGER NOT NULL, efficacy TEXT
);
CREATE TABLE IF NOT EXISTS access_log (
    rowid_ INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_role TEXT NOT NULL, attempted TEXT NOT NULL, decision TEXT NOT NULL,
    rule TEXT NOT NULL, req_id TEXT NOT NULL, ts TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_refl_week ON reflections(week);
CREATE INDEX IF NOT EXISTS idx_clusters_week ON clusters(week);

-- ── S7 extension: accounts, classes, chat, questioned topics ─────────
-- Additive only. The original nine tables above are untouched.
CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL,
    unit TEXT NOT NULL, faculty_user_id TEXT NOT NULL, source TEXT NOT NULL,
    course TEXT NOT NULL DEFAULT 'CN'    -- content namespace this class teaches
);
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    role TEXT NOT NULL,               -- 'student' | 'faculty'
    password_hash TEXT NOT NULL,      -- sha256(salt + password), salt from email
    student_id TEXT,                  -- pseudonymous S_xxx for students
    class_id TEXT,                    -- enrolment
    scenario TEXT,                    -- roster label, e.g. 'Cleared after intervention'
    scenario_note TEXT                -- one-line case summary for the roster
);
CREATE TABLE IF NOT EXISTS auth_tokens (
    token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL
);
-- S8: a student takes MANY subjects. users.class_id stays as the DEFAULT
-- (the class their session opens on); this table is the real enrolment.
-- Every scoped surface — chat, taxonomy, grounding, constellation, compass,
-- topics — keys off the SELECTED class, not the default one.
CREATE TABLE IF NOT EXISTS enrollments (
    user_id TEXT NOT NULL, class_id TEXT NOT NULL,
    PRIMARY KEY (user_id, class_id)
);
CREATE INDEX IF NOT EXISTS idx_enrol_user ON enrollments(user_id);
-- The regulation log. APPEND-ONLY by convention: there is no endpoint that
-- updates or deletes a chat row. Faculty cannot read it (scope chat_log).
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY, student_id TEXT NOT NULL, class_id TEXT NOT NULL,
    started_at TEXT NOT NULL, ended_at TEXT,
    misconception_ids TEXT NOT NULL DEFAULT '[]',
    question_concept_ids TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL, student_id TEXT NOT NULL,
    sender TEXT NOT NULL,             -- 'student' | 'agent'
    text TEXT NOT NULL,
    analysis TEXT,                    -- JSON: what the pipeline found, per message
    ts TEXT NOT NULL
);
-- R-12: a row per detected question. The 'most questioned topics' number is
-- COUNTED from these rows, never generated.
CREATE TABLE IF NOT EXISTS topic_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL, class_id TEXT NOT NULL, concept_id TEXT NOT NULL,
    week INTEGER NOT NULL,
    source TEXT NOT NULL,             -- 'chat' | 'seed'
    excerpt TEXT NOT NULL,            -- the student's question, for the record
    ts TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_tq_concept ON topic_questions(concept_id);
"""

# Columns stored as JSON text, decoded on read.
JSON_COLUMNS = {
    "prereqs", "signals", "concept_ids", "misconception_ids",
    "material_ids", "history", "corrected_misconceptions", "efficacy",
    "question_concept_ids", "analysis",
}
BOOL_COLUMNS = {"grounded", "k_satisfied"}


def connect() -> sqlite3.Connection:
    DATA.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    """Decode a row back into the shape schema.py declares."""
    if row is None:
        return None
    out: dict[str, Any] = {}
    for key in row.keys():
        if key == "rowid_":
            continue
        val = row[key]
        if key in JSON_COLUMNS and isinstance(val, str):
            try:
                val = json.loads(val)
            except json.JSONDecodeError:
                pass
        elif key in BOOL_COLUMNS:
            val = bool(val)
        out[key] = val
    return out


def rows_to_dicts(rows: Iterable[sqlite3.Row]) -> list[dict[str, Any]]:
    return [d for d in (row_to_dict(r) for r in rows) if d is not None]


def _enc(value: Any) -> Any:
    """Encode a Python value for storage."""
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, bool):
        return int(value)
    return value


def upsert(conn: sqlite3.Connection, table: str, record: dict[str, Any]) -> None:
    cols = list(record.keys())
    placeholders = ",".join("?" for _ in cols)
    collist = ",".join(cols)
    values = [_enc(record[c]) for c in cols]
    conn.execute(
        f"INSERT OR REPLACE INTO {table} ({collist}) VALUES ({placeholders})",
        values,
    )


def init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA_SQL)
    conn.commit()


def load_static(conn: sqlite3.Connection) -> dict[str, int]:
    """Load the hand-authored JSON into SQLite. Idempotent."""
    counts: dict[str, int] = {}

    concepts = json.loads((DATA / "concepts.json").read_text(encoding="utf-8"))
    for c in concepts["concepts"]:
        upsert(conn, "concepts", {**c, "course": "CN"})
    counts["concepts"] = len(concepts["concepts"])

    tax = json.loads((DATA / "taxonomy.json").read_text(encoding="utf-8"))
    for m in tax["misconceptions"]:
        upsert(conn, "misconceptions", {**m, "course": "CN"})
    counts["misconceptions"] = len(tax["misconceptions"])

    # Semester VI course packs — same hand-authored shape, one file for all
    # five subjects. `keywords` stay in the JSON for the chunker/topic
    # tagger; they are tooling data, not part of the Concept record.
    sem6_path = DATA / "sem6_courses.json"
    if sem6_path.exists():
        packs = json.loads(sem6_path.read_text(encoding="utf-8"))
        for course in packs["courses"]:
            for c in course["concepts"]:
                row = {k: v for k, v in c.items() if k != "keywords"}
                upsert(conn, "concepts", {**row, "course": course["code"]})
                counts["concepts"] += 1
            for m in course["misconceptions"]:
                upsert(conn, "misconceptions", {**m, "course": course["code"]})
                counts["misconceptions"] += 1

    # Three corpora, one namespace: the CN textbook (chunks.json, MAT_0001+),
    # the sem V class extras (class_chunks.json, MAT_5001+), and the sem VI
    # subjects (sem6_chunks.json, MAT_6001+, rows carry their course).
    counts["material_chunks"] = 0
    for fname in ("chunks.json", "class_chunks.json", "sem6_chunks.json"):
        chunks_path = DATA / "materials" / fname
        if chunks_path.exists():
            chunks = json.loads(chunks_path.read_text(encoding="utf-8"))
            for ch in chunks:
                upsert(conn, "material_chunks", ch)
            counts["material_chunks"] += len(chunks)

    conn.commit()
    return counts


if __name__ == "__main__":
    c = connect()
    init_schema(c)
    print(f"tables created at {DB_PATH}")
    print("loaded:", load_static(c))
