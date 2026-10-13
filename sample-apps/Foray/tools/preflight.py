"""
FORAY — deployment preflight.

    python tools/preflight.py

Answers one question: would this deploy to NitroCloud and actually work?

Checks what a container will experience, not what your laptop does. Every
line is either a hard blocker or a warning with the fix next to it.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

OK, WARN, FAIL = "  ok  ", "  !!  ", "  XX  "
problems = 0
warnings = 0


def check(label: str, passed: bool, detail: str = "", *, fatal: bool = True) -> None:
    global problems, warnings
    if passed:
        print(f"{OK}{label}")
    elif fatal:
        problems += 1
        print(f"{FAIL}{label}")
        if detail:
            print(f"        {detail}")
    else:
        warnings += 1
        print(f"{WARN}{label}")
        if detail:
            print(f"        {detail}")


print("\n  FORAY — deployment preflight\n  " + "-" * 62)
print("  NitroStack project (what NitroCloud builds)")

pkg = ROOT / "package.json"
check("package.json at repo root", pkg.exists())
check("src/index.ts at repo root", (ROOT / "src" / "index.ts").exists())
if pkg.exists():
    d = json.loads(pkg.read_text(encoding="utf-8"))
    check("@nitrostack/core dependency",
          "@nitrostack/core" in d.get("dependencies", {}))
    check("build script present", bool(d.get("scripts", {}).get("build")))
check("dist/ builds (run `npm run build` if missing)",
      (ROOT / "dist" / "index.js").exists(),
      "NitroCloud runs the build itself, but a local dist proves it compiles.",
      fatal=False)

print("\n  The one coupling: MCP layer -> Python API")
api_url = os.environ.get("FORAY_API_URL", "http://127.0.0.1:8000")
is_local = "127.0.0.1" in api_url or "localhost" in api_url
check(f"FORAY_API_URL = {api_url}", not is_local,
      "A container cannot reach your laptop. Deploy the Python API somewhere "
      "public and set FORAY_API_URL to it in the NitroCloud app's env.",
      fatal=False)

print("\n  Python backend (deploy separately — NitroCloud does not run it)")
check("requirements.txt", (ROOT / "requirements.txt").exists())
check("Dockerfile.api", (ROOT / "Dockerfile.api").exists(),
      "Optional, but makes Render/Railway/Fly a one-click deploy.",
      fatal=False)

static = ROOT / "data"
check("data/concepts.json committed", (static / "concepts.json").exists())
check("data/taxonomy.json committed", (static / "taxonomy.json").exists())

chunks = static / "materials" / "chunks.json"
tracked = subprocess.run(
    ["git", "ls-files", "--error-unmatch", "data/materials/chunks.json"],
    cwd=ROOT, capture_output=True,
).returncode == 0
check("grounding corpus reaches the deploy", tracked,
      "data/materials/chunks.json is gitignored (textbook extract). A cloud "
      "deploy will have NO material, so every correction escalates and "
      "citations vanish. Either commit it, ship it as a volume/secret, or "
      "run tools/chunk_material.py during deploy. See DEPLOY.md.",
      fatal=False)

print("\n  Logged-in surface (S7/S8) — dead in the cloud if unseeded")
docker = (ROOT / "Dockerfile.api").read_text(encoding="utf-8") if (
    ROOT / "Dockerfile.api").exists() else ""
check("Dockerfile.api seeds users/classes/enrollments",
      "seed_profiles" in docker,
      "Without `python demo/seed_profiles.py` in the image build there are "
      "ZERO users: every login 401s and the whole logged-in surface is dead, "
      "with nothing pointing at the cause.")

try:
    from api import db as _db
    _c = _db.connect()
    _counts = {t: _c.execute(f"SELECT COUNT(*) n FROM {t}").fetchone()["n"]
               for t in ("users", "classes", "enrollments")}
    check(f"local seed populated {_counts}",
          all(_counts.values()),
          "Run bash demo/reset.sh", fatal=False)
except Exception as e:                                # noqa: BLE001
    check("local seed readable", False, str(e)[:80], fatal=False)

print("\n  MCP layer alignment")
import re as _re
_ts = (ROOT / "src" / "foray" / "permissions.ts").read_text(encoding="utf-8")
_scopes = set(_re.findall(r"^\s{2}([a-z_]+):\s*'[a-z_]+',", _ts[_ts.index("TOOL_SCOPES"):], _re.M))
_tools: set[str] = set()
for _f in (ROOT / "src" / "modules").rglob("*.tools.ts"):
    _tools |= set(_re.findall(r"name:\s*'([a-z_]+)'", _f.read_text(encoding="utf-8")))
check(f"every MCP tool is in TOOL_SCOPES ({len(_tools)} tools)",
      not (_tools - _scopes),
      f"unmapped tools are DENIED by default: {sorted(_tools - _scopes)}")

try:
    from api.schema import PERMISSIONS as _PY
    _blk = _ts[_ts.index("export const PERMISSIONS"):_ts.index("export const TOOL_SCOPES")]
    _drift = []
    for _role, _sc in _PY.items():
        _m = _re.search(rf"\b{_role}:\s*\[(.*?)\]", _blk, _re.S)
        if not _m:
            _drift.append(_role); continue
        _raw = _m.group(1)
        _t = set(_re.findall(r"'([a-z_]+)'", _raw))
        if "...CONTENT" in _raw:
            _t.add("course_content")
        if _t != set(_sc):
            _drift.append(_role)
    check("permissions.ts mirrors api/schema.py", not _drift,
          f"drifted roles: {_drift} — change both in the same commit")
except Exception as e:                                # noqa: BLE001
    check("permissions mirror readable", False, str(e)[:80])

print("\n  Secrets")
check("no .env committed",
      subprocess.run(["git", "ls-files", "--error-unmatch", ".env"],
                     cwd=ROOT, capture_output=True).returncode != 0,
      ".env is in git. Remove it: git rm --cached .env")
provider = os.environ.get("FORAY_LLM_PROVIDER", "(unset)")
check(f"LLM provider configured ({provider})", provider not in ("", "(unset)"),
      "Agents fall back to offline matchers. Fine for beats 3/4/6, not 1/2.",
      fatal=False)

print("  " + "-" * 62)
if problems:
    print(f"  {problems} BLOCKER(S), {warnings} warning(s). Not deploy-ready.\n")
    sys.exit(1)
print(f"  Deploy-ready. {warnings} warning(s) — read them before shipping.\n")
