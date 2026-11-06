"""Renders every view of the widget with REAL-shaped data and saves screenshots.

Why Python: the only Playwright on this machine is the Python package (Chromium only, already installed; no downloads,
no new dependencies). scripts/widget-shots.mjs is a thin wrapper that calls this file.

Usage: python3 scripts/widget_shots.py [--base http://localhost:3417/score-dashboard] [--out docs/img] [--only name,...]
Data (all offline, see the scripts that made them):
  assessment  tests/fixtures/widget/assess_project.monorepo.json        scripts/make-widget-fixture.mjs
  report      tests/fixtures/widget/generate_report.result.json         real generate_report output (+ the server's input echo)
  plan, apply, verify  tests/fixtures/widget/*.result.json              scripts/make-widget-flow-fixtures.mjs
Screenshots of the stage 2 views are WebP (PIL) to keep docs/img small; the stage 1 Assessment shots stay PNG.
"""
import argparse
import datetime
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
FIX = ROOT / "tests/fixtures/widget"
# what to wait for before the screenshot, per view
READY = {"assessment": ".numeral", "report": "[data-view=report]", "verify": "[data-view=verify]", "plan": "[data-view=plan]", "apply": "[data-view=apply]", "watch": "[data-view=watch]", "cloud": "[data-view=cloud]"}
SHOTS = [
    # name, view, fixture, theme, mode, width, height
    ("assessment-light-1920x1080", "assessment", "assessment", "light", "full", 1920, 1080),
    ("assessment-dark-1920x1080", "assessment", "assessment", "dark", "full", 1920, 1080),
    ("assessment-light-1280x720", "assessment", "assessment", "light", "full", 1280, 720),
    ("assessment-dark-1280x720", "assessment", "assessment", "dark", "full", 1280, 720),
    ("assessment-light-inline-640x400", "assessment", "assessment", "light", "inline", 640, 400),
]
for _view, _fix in (("report", "report"), ("verify", "verify-notverified"), ("plan", "plan"), ("apply", "apply")):
    for _theme in ("light", "dark"):
        for _w, _h in ((1920, 1080), (1280, 720)):
            SHOTS.append((f"{_view}-{_theme}-{_w}x{_h}", _view, _fix, _theme, "full", _w, _h))
SHOTS.append(("watch-light-1920x1080", "watch", "watch", "light", "full", 1920, 1080))
SHOTS.append(("cloud-light-1920x1080", "cloud", "cloud", "light", "full", 1920, 1080))
SHOTS.append(("verify-verified-light-1920x1080", "verify", "verify-verified", "light", "full", 1920, 1080))


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def load_fixture(name, with_repo=False):
    def sc(file):
        return json.loads((FIX / file).read_text())["structuredContent"]

    if name == "assessment":
        out = sc("assess_project.monorepo.json")
        if with_repo:
            # Not what assess_project returned before the echo; used to exercise the callTool path.
            out = {**out, "input": {"repo_url": "https://github.com/acme/legacy-monorepo"}, "commit": "9f3c2ab41d0e"}
        return out
    if name == "report":
        # Real generate_report output plus the echo the tool now adds.
        return {**sc("generate_report.result.json"), "input": {"repo_url": "https://github.com/acme/legacy-shop"}, "commit": "41d1c9784742b8b8903f4f4b67378c9f1e5c9a81", "generatedAt": now_iso()}
    if name == "verify-notverified":
        return sc("verify_patch.notverified.result.json")
    if name == "verify-verified":
        return sc("verify_patch.verified.result.json")
    if name == "watch":
        return sc("check_watch.result.json")
    if name == "cloud":
        return sc("cloud_inventory.result.json")
    if name == "plan":
        return sc("plan_modernization.result.json")
    if name == "apply":
        return sc("apply_stage.result.json")
    raise KeyError(name)


def open_page(browser, base, theme, mode, w, h, output, ready, call_tool=False, inject_theme=True, open_external=False):
    ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1, color_scheme=theme)
    page = ctx.new_page()
    init = "window.openai = { toolOutput: %s };" % json.dumps(output)
    if call_tool:
        # Stand-in for a host: callTool resolves after a moment and records the call.
        init += "window.__calls = []; window.openai.callTool = (n, a) => { window.__calls.push([n, a]); return new Promise(r => setTimeout(() => r({ ok: true }), 150)); };"
    if open_external:
        init += "window.__opened = []; window.openai.openExternal = ({ href }) => { window.__opened.push(href); };"
    page.add_init_script(init)
    page.on("console", lambda m: print("  console error:", m.text[:200]) if m.type == "error" else None)
    q = f"theme={theme}&" if inject_theme else ""
    page.goto(f"{base}?{q}mode={mode}", wait_until="networkidle")
    page.wait_for_selector(ready if output else ".state", timeout=20000)
    page.wait_for_timeout(300)
    return ctx, page


def save(page, path, full_page):
    """PNG for the stage 1 shots, WebP for the rest."""
    if path.suffix == ".png":
        page.screenshot(path=str(path), full_page=full_page)
        return
    from PIL import Image
    import io

    img = Image.open(io.BytesIO(page.screenshot(full_page=full_page)))
    img.save(path, "WEBP", quality=80, method=6)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:3417/score-dashboard")
    ap.add_argument("--out", default=str(ROOT / "docs/img"))
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    only = set(filter(None, a.only.split(",")))
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, view, fixture, theme, mode, w, h in SHOTS:
            if only and name not in only and not any(name.startswith(o) for o in only):
                continue
            ctx, page = open_page(browser, a.base, theme, mode, w, h, load_fixture(fixture), READY[view], call_tool=(view == "plan"))
            path = out / (f"{name}.png" if view == "assessment" else f"{name}.webp")
            save(page, path, full_page=(mode == "full"))
            size = page.evaluate("[document.documentElement.scrollWidth, document.documentElement.scrollHeight]")
            print(f"{path.name}: page {size[0]}x{size[1]}, {path.stat().st_size // 1024} KB")
            ctx.close()
        # Path 2: no host theme, the user drives the switch itself (auto -> light -> dark). Proves the override path.
        if not only or "switch" in only:
            ctx, page = open_page(browser, a.base, "light", "full", 1280, 720, load_fixture("assessment"), READY["assessment"], inject_theme=False)
            seen = []
            for _ in range(2):
                page.click(".tswitch")
                page.wait_for_timeout(150)
                seen.append(page.evaluate("document.querySelector('.mm').dataset.theme"))
            assert seen == ["light", "dark"], seen
            bg = page.evaluate("getComputedStyle(document.querySelector('.mm')).backgroundColor")
            assert bg == "rgb(21, 22, 20)", bg
            print(f"switch path ok: cycle gave {seen}, background {bg}")
            ctx.close()
        browser.close()


if __name__ == "__main__":
    sys.exit(main())
