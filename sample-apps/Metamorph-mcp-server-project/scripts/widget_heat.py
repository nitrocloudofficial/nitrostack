"""Heat proxies for the Assessment view. NEITHER is user data.

(a) *-saliency-PREDICTED.png : spectral-residual saliency (Hou & Zhang 2007) computed on the screenshot with numpy/scipy.
    A MODEL PREDICTION of where bottom-up attention goes, not eye-tracking and not user data.
(b) *-interaction-MAP.png   : a scripted keyboard + click flow through the real DOM. Records hit-target rects, areas,
    centre distances and a Fitts index of difficulty ID = log2(D / W + 1) relative to the previous target
    (W = the smaller side of the target). The flow is scripted by us, so this is a layout measurement, not behaviour.

Usage: python3 scripts/widget_heat.py [--base URL] [--out docs/img]   (needs the dev server and the screenshots)
"""
import argparse
import json
import math
import pathlib

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, uniform_filter
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent


def saliency(img: Image.Image) -> np.ndarray:
    g = np.asarray(img.convert("L").resize((512, 288)), dtype=np.float64) / 255.0
    f = np.fft.fft2(g)
    log_amp = np.log(np.abs(f) + 1e-8)
    phase = np.angle(f)
    resid = log_amp - uniform_filter(log_amp, size=3)
    s = np.abs(np.fft.ifft2(np.exp(resid + 1j * phase))) ** 2
    s = gaussian_filter(s, sigma=3)
    s = (s - s.min()) / (s.max() - s.min() + 1e-12)
    return s


def overlay(img: Image.Image, s: np.ndarray, out: pathlib.Path, caption: str):
    w, h = img.size
    big = np.asarray(Image.fromarray((s * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), dtype=np.float64) / 255.0
    # keep the hottest ~30% visible, as a warm ramp (black-red-yellow); the rest stays transparent
    a = np.clip((big - 0.25) / 0.75, 0, 1)
    ramp = np.stack([255 * np.clip(a * 2, 0, 1), 255 * np.clip(a * 2 - 1, 0, 1), 40 * (1 - a)], axis=-1)
    base = np.asarray(img.convert("RGB"), dtype=np.float64)
    mix = base * (1 - 0.65 * a[..., None]) + ramp * (0.65 * a[..., None])
    im = Image.fromarray(mix.astype(np.uint8))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w, 26], fill=(0, 0, 0))
    d.text((8, 7), caption, fill=(255, 255, 255))
    im = im.resize((w // 2, h // 2), Image.LANCZOS)
    im.save(out, optimize=True)
    return big


def region_share(big: np.ndarray, rect):
    x, y, w, h = [int(v) for v in rect]
    return float(big[y : y + h, x : x + w].sum() / big.sum())


def interaction(base, out: pathlib.Path, shot: pathlib.Path):
    env = json.loads((ROOT / "tests/fixtures/widget/assess_project.monorepo.json").read_text())["structuredContent"]
    env = {**env, "repo_url": "https://github.com/acme/legacy-monorepo"}  # only to exercise the callTool path
    rows = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1920, "height": 1080}, color_scheme="light")
        page = ctx.new_page()
        page.add_init_script(
            "window.openai = { toolOutput: %s, callTool: (n, a) => { (window.__calls = window.__calls || []).push([n, a]); return new Promise(r => setTimeout(() => r({}), 120)); } };" % json.dumps(env)
        )
        page.goto(f"{base}?theme=light&mode=full", wait_until="networkidle")
        page.wait_for_selector(".numeral")
        page.wait_for_timeout(300)
        page.screenshot(path=str(shot), full_page=True)
        top = page.eval_on_selector(".is-top", "e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }")
        eye = (top[0] + top[2] / 2, top[1] + top[3] / 2)  # the eye lands on the accented top finding (Von Restorff)
        targets = []
        page.keyboard.press("Tab")
        for _ in range(6):
            info = page.evaluate(
                "() => { const e = document.activeElement; if (!e || e === document.body) return null; const r = e.getBoundingClientRect();"
                " return { name: (e.innerText || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 40), x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height, tag: e.tagName }; }"
            )
            if not info or any(t["name"] == info["name"] for t in targets):
                break
            targets.append(info)
            page.keyboard.press("Tab")
        # click the primary action as a user would, and read back what the host stand-in received
        page.click(".btn-primary")
        page.wait_for_timeout(300)
        calls = page.evaluate("window.__calls")
        status = page.inner_text(".status")
        b.close()
    prev = eye
    for t in targets:
        c = (t["x"] + t["w"] / 2, t["y"] + t["h"] / 2)
        D = math.hypot(c[0] - prev[0], c[1] - prev[1])
        W = min(t["w"], t["h"])
        rows.append({**t, "area": t["w"] * t["h"], "cx": c[0], "cy": c[1], "D": D, "ID": math.log2(D / W + 1)})
        prev = c
    im = Image.open(shot).convert("RGB")
    d = ImageDraw.Draw(im)
    pc = eye
    d.ellipse([pc[0] - 8, pc[1] - 8, pc[0] + 8, pc[1] + 8], outline=(0, 90, 200), width=4)
    for i, r in enumerate(rows, 1):
        d.rectangle([r["x"], r["y"], r["x"] + r["w"], r["y"] + r["h"]], outline=(0, 90, 200), width=4)
        d.line([pc, (r["cx"], r["cy"])], fill=(0, 90, 200), width=3)
        d.rectangle([r["x"], r["y"] - 26, r["x"] + 120, r["y"]], fill=(0, 90, 200))
        d.text((r["x"] + 4, r["y"] - 20), f"{i}  ID {r['ID']:.2f}", fill=(255, 255, 255))
        pc = (r["cx"], r["cy"])
    d.rectangle([0, 0, im.width, 26], fill=(0, 0, 0))
    d.text((8, 7), "INTERACTION MAP: scripted Tab flow over the DOM (hit targets, Fitts ID vs previous target). Not user data.", fill=(255, 255, 255))
    im.resize((im.width // 2, im.height // 2), Image.LANCZOS).save(out, optimize=True)
    return rows, calls, status


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:3417/score-dashboard")
    ap.add_argument("--out", default=str(ROOT / "docs/img"))
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    for theme in ("light", "dark"):
        src = out / f"assessment-{theme}-1920x1080.png"
        img = Image.open(src)
        s = saliency(img)
        big = overlay(img, s, out / f"assessment-{theme}-1920x1080-saliency-PREDICTED.png", "PREDICTED attention (spectral-residual model). A model prediction, NOT user data.")
        if theme == "light":
            print("saliency share by region (light, share of total predicted saliency):")
            page_regions = {"score numeral (left, top)": (300, 170, 200, 150), "findings panel": (752, 204, 864, 510), "top finding row": (752, 204, 864, 130), "next step card": (752, 815, 864, 250), "header": (0, 0, 1920, 90)}
            for k, r in page_regions.items():
                area = r[2] * r[3]
                print(f"  {k}: {100 * region_share(big, r):.1f}% of saliency in {100 * area / (big.shape[0] * big.shape[1]):.1f}% of area")
    rows, calls, status = interaction(a.base, out / "assessment-light-1920x1080-interaction-MAP.png", out / ".interaction-src.png")
    (out / ".interaction-src.png").unlink(missing_ok=True)
    print("\n| # | target | w x h | area px | centre | D from previous px | Fitts ID |\n|---|---|---|---|---|---|---|")
    for i, r in enumerate(rows, 1):
        print(f"| {i} | {r['name']} | {r['w']:.0f}x{r['h']:.0f} | {r['area']:.0f} | ({r['cx']:.0f},{r['cy']:.0f}) | {r['D']:.0f} | {r['ID']:.2f} |")
    print("\nclick on the primary button -> host stand-in received:", calls, "| status text:", status)


if __name__ == "__main__":
    main()
