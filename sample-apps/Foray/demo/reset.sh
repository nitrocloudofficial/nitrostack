#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  FORAY — restore a known-good demo state in ONE command.
#
#      bash demo/reset.sh
#
#  Run this between every rehearsal, and once more at 11:55.
#  It NEVER calls an LLM — the seed generator is fully deterministic,
#  so this works on a dead wifi and produces identical output.
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

# Pick an interpreter that actually exists. On Windows `python3` resolves to
# the Microsoft Store shim, which prints a help message and exits non-zero -
# so a hardcoded `python3` here DROPPED THE DATABASE AND THEN FAILED TO
# REBUILD IT, leaving no demo state at all.
if command -v python >/dev/null 2>&1 && python -c "import sys" >/dev/null 2>&1; then
  PY=python
elif command -v python3 >/dev/null 2>&1 && python3 -c "import sys" >/dev/null 2>&1; then
  PY=python3
else
  echo "  !! No working python on PATH." >&2
  exit 1
fi

DB="data/foray.db"
echo "── foray reset ─────────────────────────────────"

# 1 · wipe the database (and SQLite's WAL sidecars) ------------------
#     On Windows the running API holds a lock on these files, so a reset
#     during a rehearsal fails with "Device or resource busy". Say what to
#     do rather than leaving a half-reset database behind.
if ! rm -f "$DB" "$DB-shm" "$DB-wal" 2>/dev/null; then
  echo ""
  echo "  !! Could not delete $DB — it is locked."
  echo "     The API server is still running. Stop it first:"
  echo ""
  echo "         taskkill //F //IM python.exe        # Windows"
  echo "         pkill -f 'uvicorn api.main'         # macOS/Linux"
  echo ""
  exit 1
fi
echo "  ✓ dropped $DB"

# 1b · the grounding corpus is NOT in git ---------------------------
#      chunks.json is derived from the textbook, so it is gitignored for
#      copyright. Without it every correction escalates and beat 1 loses
#      its citation - silently. Fail loudly instead.
if [ ! -f data/materials/chunks.json ]; then
  echo ""
  echo "  !! data/materials/chunks.json is MISSING."
  echo "     Grounding will escalate on everything and beat 1 will have no"
  echo "     page citation. Put the course PDF under notes/ and run:"
  echo ""
  echo "         python tools/chunk_material.py"
  echo ""
  exit 1
fi

# 2 · rebuild tables + load the hand-authored static data ------------
$PY -m api.db | sed 's/^/    /'

# 3 · regenerate the seeded cohort (no API calls) --------------------
#     Exits non-zero if the planted cluster or the root-cause trace
#     drifts, so a broken beat 3 or 4 fails HERE and not on stage.
$PY demo/seed_generator.py | sed 's/^/    /'

# 3a · accounts, class, scenarios, chat log, questioned topics -------
#      1 teacher + 8 students (password foray123), each mapped by QUERY
#      to a real cohort member. Exits non-zero if a scenario slot or the
#      questioned-topics story cannot be satisfied.
$PY demo/seed_profiles.py | sed 's/^/    /'

# 3a2 · every student, every subject ---------------------------------
#       S8 enrolled all 8 students in all 6 classes but the records only
#       covered one subject each, so switching subject gave a grey
#       constellation and an empty Compass. Fills the gaps and asserts
#       the CN plant (23 -> 4, C03) is untouched.
$PY demo/seed_crosscourse.py | sed 's/^/    /'

# 3b · precompute beat 5 -------------------------------------------
#      §14: live model calls in beats 1 and 2 ONLY. The run-through
#      measured Compass at 39s live (3 sequential calls + free-tier
#      backoff). Precompute it here so the demo reads a file.
$PY - <<'PY'
import json, pathlib
from api import db
from agents.compass import build
conn = db.connect()
row = conn.execute(
    "SELECT student_id, COUNT(*) n FROM mastery WHERE level < 0.6 "
    "GROUP BY student_id ORDER BY n DESC, student_id LIMIT 1").fetchone()
sid = row["student_id"] if row else "S_001"
out = {"student_id": sid, "items": build(conn, sid)}
pathlib.Path("data/seed_cache/compass.json").write_text(
    json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
print(f"    compass cached for {sid} ({len(out['items'])} items)")
PY

# 3b2 · precompute EVERY other roadmap, deterministically ------------
#       Beat 5's student keeps the model-written cache above. Every
#       other (student, subject) pair would otherwise build LIVE on
#       click: 3 sequential calls, ~39s, and the free-tier daily quota
#       gone the first time someone browses subjects. The selection of
#       gaps is deterministic either way (agents/compass.py); only the
#       prose differs, so these are built with the model switched OFF.
$PY - <<'PY'
import json, pathlib
from api import db
from agents import llm
llm.available = lambda: False          # deterministic prose, zero calls
from agents.compass import build

conn = db.connect()
pairs = conn.execute(
    """SELECT DISTINCT u.student_id sid, c.course course
       FROM users u JOIN enrollments e ON e.user_id = u.id
       JOIN classes c ON c.id = e.class_id
       WHERE u.role='student' AND u.student_id IS NOT NULL
       ORDER BY u.student_id, c.course""").fetchall()
out, empty = {}, []
for r in pairs:
    items = build(conn, r["sid"], course=r["course"])
    out[f"{r['sid']}|{r['course']}"] = {
        "student_id": r["sid"], "course": r["course"], "items": items}
    if not items:
        empty.append(f"{r['sid']}/{r['course']}")
pathlib.Path("data/seed_cache/compass_all.json").write_text(
    json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
print(f"    compass precomputed for {len(out)} (student, subject) pairs")
if empty:
    print(f"    !! {len(empty)} pair(s) yield NO roadmap: {empty[:6]}")
    raise SystemExit(1)
PY

# 3c · grounding coverage per course ---------------------------------
#      A class with concepts but no material chunks cannot produce a
#      grounded correction — every reply escalates and beat 1 loses its
#      citation. Without this warning that failure is completely silent.
$PY - <<'PY'
from api import db
conn = db.connect()
rows = conn.execute(
    "SELECT c.course, COUNT(DISTINCT c.id) concepts, "
    "  (SELECT COUNT(*) FROM material_chunks m WHERE m.course = c.course) chunks "
    "FROM concepts c GROUP BY c.course ORDER BY c.course").fetchall()
missing = [r["course"] for r in rows if r["chunks"] == 0]
for r in rows:
    flag = "" if r["chunks"] else "   <-- NO MATERIAL: corrections escalate"
    print(f"    {r['course']:5} {r['concepts']:3} concepts {r['chunks']:5} chunks{flag}")
if missing:
    print(f"    !! no grounding corpus for: {', '.join(missing)}")
    print(f"       Beat 1 has no citation for those classes. The CN demo")
    print(f"       path is unaffected. Fix: put the sources under")
    print(f"       notes/sem VI/ and run  python tools/chunk_sem6.py")
PY

# 4 · beat 6 needs an empty access log -------------------------------
#     The judge has to watch the DENIED row appear, not find one
#     already sitting there.
$PY - <<'PY'
from api import db
conn = db.connect()
conn.execute("DELETE FROM access_log")
conn.execute("DELETE FROM corrections")
conn.execute("DELETE FROM interventions")
conn.commit()
n = conn.execute("SELECT COUNT(*) c FROM access_log").fetchone()["c"]
print(f"    access log + corrections + interventions cleared ({n} rows)")
PY

echo "── ready ───────────────────────────────────────"
echo "   verify: week 6 = 23/60 · week 7 = 4 · root cause C03 · log empty"
