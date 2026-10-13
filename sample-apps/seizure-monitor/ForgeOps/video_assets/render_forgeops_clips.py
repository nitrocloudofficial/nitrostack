from __future__ import annotations

import argparse
import math
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFont


W, H = 1280, 720
FPS = 30
OUTPUT_SIZE = "1920:1080"
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output"

BG = "#fbf8ef"
PANEL = "#fffdf7"
PANEL_SOFT = "#f5f0e6"
INK = "#2b211c"
MUTED = "#8b8177"
MUTED_DARK = "#62574f"
LINE = "#ded6c8"
BLUE = "#70c4ef"
BLUE_DARK = "#409dcd"
BLUE_SOFT = "#e6f5fc"
GREEN = "#3d956f"
GREEN_SOFT = "#e8f4ee"
AMBER = "#c88a31"
AMBER_SOFT = "#fbf0d9"
RED = "#c95761"
RED_SOFT = "#fae7e5"
WHITE = "#ffffff"

FONT_REGULAR = Path(r"C:\Windows\Fonts\segoeui.ttf")
FONT_SEMIBOLD = Path(r"C:\Windows\Fonts\seguisb.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\segoeuib.ttf")


def font(size: int, weight: str = "regular") -> ImageFont.FreeTypeFont:
    path = {"regular": FONT_REGULAR, "semibold": FONT_SEMIBOLD, "bold": FONT_BOLD}[weight]
    return ImageFont.truetype(str(path), size)


F12 = font(12, "semibold")
F14 = font(14)
F16 = font(16)
F16S = font(16, "semibold")
F18 = font(18)
F18S = font(18, "semibold")
F22S = font(22, "semibold")
F28S = font(28, "semibold")
F38B = font(38, "bold")
F48B = font(48, "bold")
F64B = font(64, "bold")


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def ease(value: float) -> float:
    value = clamp(value)
    return 1 - (1 - value) ** 3


def ease_in_out(value: float) -> float:
    value = clamp(value)
    return value * value * (3 - 2 * value)


def window(t: float, start: float, end: float) -> float:
    return clamp((t - start) / max(0.001, end - start))


def fade_window(t: float, start: float, peak: float, end: float) -> float:
    if t <= peak:
        return ease(window(t, start, peak))
    return 1 - ease(window(t, peak, end))


def mix(a: float, b: float, p: float) -> float:
    return a + (b - a) * p


def text(draw: ImageDraw.ImageDraw, xy: tuple[float, float], value: str, fnt, fill=INK, anchor=None):
    draw.text(xy, value, font=fnt, fill=fill, anchor=anchor)


def rounded(draw: ImageDraw.ImageDraw, box, radius=16, fill=PANEL, outline=LINE, width=1):
    draw.rounded_rectangle(tuple(int(v) for v in box), radius=radius, fill=fill, outline=outline, width=width)


def line(draw: ImageDraw.ImageDraw, points, fill=LINE, width=2):
    draw.line([(int(x), int(y)) for x, y in points], fill=fill, width=width)


def dot(draw: ImageDraw.ImageDraw, x, y, r, fill):
    draw.ellipse((x-r, y-r, x+r, y+r), fill=fill)


def brand_mark(draw: ImageDraw.ImageDraw, x: int, y: int, size: int = 42):
    rounded(draw, (x, y, x+size, y+size), 11, BLUE_SOFT, "#b9dff2")
    heights = (15, 28, 21)
    for idx, height in enumerate(heights):
        bx = x + 10 + idx * 8
        draw.rounded_rectangle((bx, y+size-9-height, bx+5, y+size-9), radius=2, fill=BLUE_DARK)


def header(draw: ImageDraw.ImageDraw, section: str, progress: float | None = None):
    draw.rectangle((0, 0, W, 72), fill=BG)
    line(draw, ((0, 71), (W, 71)), LINE, 1)
    brand_mark(draw, 40, 15, 42)
    text(draw, (96, 23), "FORGEOPS", F16S, INK)
    text(draw, (96, 44), "Decision intelligence", F12, MUTED)
    text(draw, (W-40, 25), section.upper(), F12, BLUE_DARK, anchor="ra")
    if progress is not None:
        draw.rectangle((0, 70, int(W*clamp(progress)), 72), fill=BLUE)


def footer(draw: ImageDraw.ImageDraw, left: str, right: str = "EVIDENCE-BACKED MANUFACTURING"):
    text(draw, (40, H-28), left.upper(), F12, MUTED)
    text(draw, (W-40, H-28), right, F12, MUTED, anchor="ra")


def pill(draw, x, y, label, fg, bg, outline=None, width=None):
    if width is None:
        width = int(draw.textlength(label, font=F12)) + 26
    rounded(draw, (x, y, x+width, y+28), 7, bg, outline or bg)
    text(draw, (x+width/2, y+14), label.upper(), F12, fg, anchor="mm")


def pulse(draw, x, y, p, color=BLUE_DARK, max_radius=30):
    radius = 5 + max_radius * p
    alpha = int(170 * (1-p))
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
    ld.ellipse((x-radius, y-radius, x+radius, y+radius), outline=(*rgb, alpha), width=2)
    return layer


def base_frame() -> Image.Image:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    for x in range(0, W, 48):
        line(draw, ((x, 72), (x, H)), "#f1ede4", 1)
    for y in range(72, H, 48):
        line(draw, ((0, y), (W, y)), "#f1ede4", 1)
    return image


def draw_machine_icon(draw, x, y, active=False, alert=False):
    fill = BLUE_SOFT if active else PANEL
    border = BLUE if active else LINE
    rounded(draw, (x-22, y-22, x+22, y+22), 11, fill, border)
    draw.rectangle((x-10, y-4, x+10, y+9), fill=BLUE_DARK if active else MUTED)
    dot(draw, x-9, y+12, 3, MUTED_DARK)
    dot(draw, x+9, y+12, 3, MUTED_DARK)
    if alert:
        dot(draw, x+19, y-19, 6, RED)


def clip_incident(t: float) -> Image.Image:
    image = base_frame()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / Incident formation", t/8)

    intro = 1 - ease(window(t, 0.0, 0.8))
    if intro > 0:
        text(draw, (64, 155), "ONE BATCH.", F22S, BLUE_DARK)
        text(draw, (64, 205), "ONE HIDDEN DELAY.", F48B, INK)
        text(draw, (64, 267), "₹18L monthly exposure.", F28S, RED)

    appear = ease(window(t, 0.55, 1.25))
    y = 368
    xs = [135, 375, 640, 900, 1140]
    labels = ["INTAKE", "MACHINE A", "QUEUE", "MACHINE 7", "INSPECTION"]
    times = ["08:00", "08:20", "08:51", "11:40", "11:47"]
    if appear > 0:
        line(draw, ((xs[0], y), (xs[-1], y)), "#cfc7ba", 4)
        elapsed = clamp((t-1.0)/5.8)
        part_x = mix(xs[0], xs[-1], elapsed)
        line(draw, ((xs[0], y), (part_x, y)), BLUE_DARK, 5)
        for idx, (x, label, ts) in enumerate(zip(xs, labels, times)):
            active = abs(part_x-x) < 70
            alert = idx >= 2 and t > 3.0 + (idx-2)*1.3
            draw_machine_icon(draw, x, y, active, alert)
            text(draw, (x, y+48), label, F14 if idx != 3 else F12, INK, anchor="ma")
            text(draw, (x, y+69), ts, F12, MUTED, anchor="ma")
        dot(draw, part_x, y, 10, BLUE_DARK)
        dot(draw, part_x, y, 4, WHITE)

    queue_p = window(t, 2.45, 4.75)
    if queue_p > 0:
        rounded(draw, (500, 140, 780, 280), 16, PANEL, "#e3c8a2")
        pill(draw, 520, 158, "QUEUE ANOMALY", AMBER, AMBER_SOFT)
        text(draw, (520, 208), f"{int(mix(30, 198, ease(queue_p)))} min", F38B, INK)
        text(draw, (520, 254), "Target: under 30 minutes", F14, MUTED)
        humidity = mix(48, 68.5, ease(window(t, 3.0, 4.4)))
        text(draw, (755, 208), f"{humidity:.1f}% RH", F22S, AMBER, anchor="ra")
        text(draw, (755, 238), "Humidity exposure", F12, MUTED, anchor="ra")

    final_p = ease(window(t, 5.65, 6.65))
    if final_p > 0:
        rounded(draw, (430, 120, 850, 278), 18, PANEL, "#e4bfc0")
        pill(draw, 456, 145, "BATCH REJECTED", RED, RED_SOFT)
        text(draw, (456, 208), "96%", F38B, MUTED_DARK)
        text(draw, (574, 208), "→", F28S, BLUE_DARK)
        text(draw, (640, 208), f"{mix(96, 82, final_p):.0f}%", F64B, RED)
        text(draw, (456, 251), "Final inspection · dimensional + surface defects", F14, MUTED)

    footer(draw, "MES · SENSORS · MAINTENANCE · QUALITY")
    return image


def clip_false_lead(t: float) -> Image.Image:
    image = base_frame()
    draw = ImageDraw.Draw(image)
    header(draw, "02 / The false lead", t/6)

    text(draw, (64, 118), "THE OBVIOUS FAILURE", F12, RED)
    text(draw, (64, 155), "Machine 7 looks guilty.", F38B, INK)

    machine_scale = 1 - 0.35*ease(window(t, 2.25, 3.2))
    mx = mix(390, 285, ease(window(t, 2.25, 3.2)))
    my = 355
    mw = 480*machine_scale
    mh = 260*machine_scale
    rounded(draw, (mx-mw/2, my-mh/2, mx+mw/2, my+mh/2), 22, PANEL, "#e5b8ba", 2)
    pill(draw, mx-mw/2+24, my-mh/2+22, "CRITICAL ALERT", RED, RED_SOFT)
    text(draw, (mx-mw/2+26, my-22), "MACHINE 7", F22S, INK)
    text(draw, (mx-mw/2+26, my+22), "4.7 mm/s vibration", F18S, RED)
    text(draw, (mx-mw/2+26, my+54), "31.4°C temperature", F18S, AMBER)
    gear_r = 56*machine_scale
    gx = mx+mw/2-90
    dot(draw, gx, my+4, gear_r, "#e8eef0")
    dot(draw, gx, my+4, gear_r*0.57, PANEL)
    for angle in range(0, 360, 45):
        rad = math.radians(angle + t*90)
        x1 = gx + math.cos(rad)*gear_r*0.72
        y1 = my+4 + math.sin(rad)*gear_r*0.72
        x2 = gx + math.cos(rad)*gear_r*1.03
        y2 = my+4 + math.sin(rad)*gear_r*1.03
        line(draw, ((x1, y1), (x2, y2)), MUTED_DARK, max(2, int(7*machine_scale)))

    reveal = ease(window(t, 2.0, 3.1))
    if reveal > 0:
        qx = mix(1000, 855, reveal)
        qw = mix(250, 520, reveal)
        rounded(draw, (qx-qw/2, 225, qx+qw/2, 510), 22, PANEL, "#9bcfe4", 2)
        pill(draw, qx-qw/2+24, 247, "UPSTREAM CAUSE", BLUE_DARK, BLUE_SOFT)
        text(draw, (qx-qw/2+26, 305), "QUEUE DELAY", F28S, INK)
        text(draw, (qx-qw/2+26, 363), "198 min", F64B, BLUE_DARK)
        text(draw, (qx-qw/2+26, 431), "89% causal influence", F18S, GREEN)
        text(draw, (qx-qw/2+26, 464), "Controllable this shift", F14, MUTED)

    verdict = ease(window(t, 3.65, 4.5))
    if verdict > 0:
        rounded(draw, (64, 550, 1216, 635), 16, BLUE_SOFT, "#b9ddea")
        text(draw, (90, 575), "EVIDENCE VERDICT", F12, BLUE_DARK)
        text(draw, (90, 605), "Machine 7 is a contributor—not the primary intervention.", F22S, INK)
        text(draw, (1188, 592), "18% vs 89%", F22S, BLUE_DARK, anchor="ra")

    footer(draw, "CORRELATION ≠ PRIMARY CAUSE")
    return image


def scenario_card(draw, x, y, w, h, title, subtitle, yield_value, cost, effort, color, selected=False, p=1.0):
    offset = (1-ease(p))*90
    y += offset
    outline = color if selected else LINE
    rounded(draw, (x, y, x+w, y+h), 18, PANEL, outline, 3 if selected else 1)
    dot(draw, x+27, y+29, 7, color)
    text(draw, (x+45, y+20), title, F18S, INK)
    text(draw, (x+24, y+57), subtitle, F12, MUTED)
    text(draw, (x+24, y+110), f"{yield_value}%", F48B, color)
    text(draw, (x+24, y+163), "PREDICTED YIELD", F12, MUTED)
    line(draw, ((x+24, y+195), (x+w-24, y+195)), LINE, 1)
    text(draw, (x+24, y+218), "COST", F12, MUTED)
    text(draw, (x+24, y+247), cost, F18S, INK)
    text(draw, (x+24, y+282), effort, F14, MUTED_DARK)
    if selected:
        pill(draw, x+w-116, y+18, "BEST ACTION", GREEN, GREEN_SOFT, width=94)


def clip_scenarios(t: float) -> Image.Image:
    image = base_frame()
    draw = ImageDraw.Draw(image)
    header(draw, "03 / Counterfactual simulator", t/10)

    text(draw, (52, 112), "DON'T GUESS THE FIX.", F12, BLUE_DARK)
    text(draw, (52, 150), "Test the decision before stopping the line.", F38B, INK)
    text(draw, (1228, 157), "Incident baseline 82%", F16S, RED, anchor="ra")

    p1 = window(t, 0.7, 1.45)
    p2 = window(t, 1.0, 1.75)
    p3 = window(t, 1.3, 2.05)
    selected = t >= 4.6
    scenario_card(draw, 52, 230, 360, 330, "Replace Machine 7", "Equipment intervention", 84, "₹12L", "2–3 days downtime", RED, False, p1)
    scenario_card(draw, 460, 230, 360, 330, "Humidity control", "Environmental intervention", 96, "₹8.5L", "1–2 weeks install", AMBER, False, p2)
    scenario_card(draw, 868, 230, 360, 330, "Reduce queue delay", "Scheduling intervention", 96, "₹15K", "Deploy this shift", GREEN, selected, p3)

    if t >= 3.0:
        compare_p = ease(window(t, 3.0, 4.35))
        line(draw, ((230, 598), (1050, 598)), LINE, 8)
        line(draw, ((230, 598), (mix(230, 1050, compare_p), 598)), BLUE, 8)
        dot(draw, mix(230, 1050, compare_p), 598, 9, BLUE_DARK)
        text(draw, (640, 626), "Comparing recovery · cost · disruption", F14, MUTED, anchor="ma")

    if t >= 6.4:
        overlay = ease(window(t, 6.4, 7.4))
        veil = Image.new("RGBA", (W, H), (251, 248, 239, int(240*overlay)))
        image = Image.alpha_composite(image.convert("RGBA"), veil).convert("RGB")
        draw = ImageDraw.Draw(image)
        header(draw, "ForgeOps / Decide", t/10)
        y = mix(H+40, 104, overlay)
        rounded(draw, (42, y, 1238, y+545), 18, PANEL, LINE)
        text(draw, (70, y+34), "WHAT-IF SIMULATOR", F12, BLUE_DARK)
        text(draw, (70, y+70), "Reduce Queue Delay (< 60 min)", F28S, INK)
        rounded(draw, (70, y+122, 690, y+198), 12, PANEL_SOFT, LINE)
        text(draw, (92, y+143), "Queue delay", F14, MUTED)
        line(draw, ((92, y+178), (660, y+178)), "#d3cdc2", 6)
        line(draw, ((92, y+178), (360, y+178)), BLUE_DARK, 6)
        dot(draw, 360, y+178, 9, BLUE_DARK)
        text(draw, (660, y+145), "45 min", F16S, INK, anchor="ra")
        rounded(draw, (744, y+122, 1208, y+420), 14, "#faf7f0", LINE)
        text(draw, (772, y+149), "PREDICTED OUTCOME", F12, MUTED)
        text(draw, (772, y+196), "82%", F38B, RED)
        text(draw, (908, y+196), "→", F28S, BLUE_DARK)
        text(draw, (976, y+196), "96%", F64B, GREEN)
        pill(draw, 772, y+257, "96% CONFIDENCE", GREEN, GREEN_SOFT, width=140)
        text(draw, (772, y+315), "Low cost · Same-shift action", F18S, INK)
        rounded(draw, (70, y+468, 690, y+520), 10, BLUE, "#58aed8")
        text(draw, (380, y+494), "RUN SCENARIO  →", F16S, "#173748", anchor="mm")

    footer(draw, "COUNTERFACTUAL DECISION SUPPORT", "CUT TO LIVE WHAT-IF SIMULATOR")
    return image


def node(draw, box, title, subtitle="", color=BLUE_DARK, active=False):
    x1, y1, x2, y2 = box
    rounded(draw, box, 14, BLUE_SOFT if active else PANEL, color if active else LINE, 2 if active else 1)
    dot(draw, x1+22, y1+24, 6, color)
    text(draw, (x1+38, y1+15), title, F16S, INK)
    if subtitle:
        text(draw, (x1+18, y1+49), subtitle, F12, MUTED)


def moving_dot(draw, start, end, p, color=BLUE_DARK):
    p = ease_in_out(p)
    x = mix(start[0], end[0], p)
    y = mix(start[1], end[1], p)
    line(draw, (start, end), "#c8d7dc", 2)
    dot(draw, x, y, 7, color)
    dot(draw, x, y, 3, WHITE)


def clip_architecture(t: float) -> Image.Image:
    image = base_frame()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / Agent + MCP architecture", t/10)
    text(draw, (52, 112), "FROM QUESTION TO DEFENSIBLE DECISION", F12, BLUE_DARK)
    text(draw, (52, 148), "Reasoning grounded in factory evidence.", F38B, INK)

    node(draw, (455, 205, 825, 275), "FORGEOPS FRONTEND", "Question · evidence · scenarios · decision", BLUE_DARK, t > 0.3)
    node(draw, (455, 315, 825, 385), "PYTHON ORCHESTRATOR", "Controls the investigation and evidence flow", AMBER, t > 1.1)

    agents = [
        (62, "PLANNER", "Frames the investigation"),
        (360, "RESEARCH", "Selects MCP evidence"),
        (658, "ANALYSIS", "Tests causes + scenarios"),
        (956, "EXECUTION", "Drafts the decision"),
    ]
    agent_y = 445
    for idx, (x, title_value, subtitle) in enumerate(agents):
        active = t > 2.0 + idx*0.8
        node(draw, (x, agent_y, x+260, agent_y+78), title_value, subtitle, GREEN if idx == 3 else BLUE_DARK, active)

    node(draw, (90, 580, 405, 650), "NITROCLOUD AI", "NitroChat · configured Gemini model", BLUE_DARK, t > 2.5)
    node(draw, (875, 580, 1190, 650), "FORGEOPS MCP", "Manufacturing tools · simulations", GREEN, t > 3.2)
    pill(draw, 530, 588, "MES", MUTED_DARK, PANEL_SOFT, width=58)
    pill(draw, 598, 588, "IOT", MUTED_DARK, PANEL_SOFT, width=58)
    pill(draw, 666, 588, "QUALITY", MUTED_DARK, PANEL_SOFT, width=82)
    pill(draw, 758, 588, "MAINT.", MUTED_DARK, PANEL_SOFT, width=78)

    if t > 0.7:
        moving_dot(draw, (640, 275), (640, 315), window(t, .7, 1.4), AMBER)
    if t > 1.5:
        for idx, (x, _, _) in enumerate(agents):
            moving_dot(draw, (640, 385), (x+130, agent_y), window(t, 1.5+idx*.45, 2.2+idx*.45), BLUE_DARK)
    if t > 3.0:
        for idx, (x, _, _) in enumerate(agents):
            target = (245, 580) if idx in (0, 2, 3) else (1032, 580)
            moving_dot(draw, (x+130, agent_y+78), target, window(t, 3.0+idx*.4, 3.8+idx*.4), GREEN if target[0] > 500 else BLUE_DARK)

    result_p = ease(window(t, 6.5, 7.45))
    if result_p > 0:
        rounded(draw, (355, 245, 925, 392), 18, PANEL, "#9ccfe3", 2)
        pill(draw, 380, 268, "FINAL DECISION", GREEN, GREEN_SOFT)
        text(draw, (380, 318), "Reduce queue delay below 60 minutes.", F28S, INK)
        text(draw, (380, 360), "96% predicted yield · evidence trace attached", F16, MUTED_DARK)

    if t > 8.2:
        text(draw, (640, 535), "LLM REASONS  ·  MCP RETRIEVES + ACTS  ·  ORCHESTRATOR CONTROLS", F14, BLUE_DARK, anchor="ma")

    footer(draw, "4 AGENT ROLES · 1 ORCHESTRATOR · 16 MCP TOOLS", "CUT TO FORGEOPS DECISION ASSISTANT")
    return image


@dataclass
class Clip:
    key: str
    filename: str
    duration: float
    renderer: Callable[[float], Image.Image]
    samples: tuple[float, float, float, float]


CLIPS = [
    Clip("incident", "01_incident_formation.mp4", 8.0, clip_incident, (0.8, 3.2, 5.4, 6.8)),
    Clip("false-lead", "02_false_lead.mp4", 6.0, clip_false_lead, (0.7, 2.2, 3.5, 4.7)),
    Clip("scenarios", "03_scenario_comparison.mp4", 10.0, clip_scenarios, (1.2, 3.6, 5.1, 8.5)),
    Clip("architecture", "04_agent_mcp_architecture.mp4", 10.0, clip_architecture, (1.0, 3.2, 5.3, 8.5)),
]


def encode_clip(clip: Clip):
    OUT.mkdir(parents=True, exist_ok=True)
    output_path = OUT / clip.filename
    command = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}",
        "-r", str(FPS),
        "-i", "-",
        "-an",
        "-vf", f"scale={OUTPUT_SIZE}:flags=lanczos,format=yuv420p",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "17",
        "-movflags", "+faststart",
        str(output_path),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    assert process.stdin is not None
    frame_count = round(clip.duration * FPS)
    try:
        for frame_idx in range(frame_count):
            t = frame_idx / FPS
            process.stdin.write(clip.renderer(t).convert("RGB").tobytes())
    finally:
        process.stdin.close()
    stderr = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
    return_code = process.wait()
    if return_code != 0:
        raise RuntimeError(f"ffmpeg failed for {clip.key}:\n{stderr[-3000:]}")
    return output_path


def create_storyboard(clips: list[Clip]):
    thumb_w, thumb_h = 320, 180
    board = Image.new("RGB", (thumb_w*4, thumb_h*len(clips)+52), BG)
    draw = ImageDraw.Draw(board)
    text(draw, (22, 14), "FORGEOPS · VIDEO STORYBOARD", F18S, INK)
    for row, clip in enumerate(clips):
        for col, sample_time in enumerate(clip.samples):
            frame = clip.renderer(sample_time).resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            board.paste(frame, (col*thumb_w, 52+row*thumb_h))
        text(draw, (12, 62+row*thumb_h), f"{row+1:02}", F12, BLUE_DARK)
    board.save(OUT / "00_storyboard.png")

    for clip in clips:
        poster = clip.renderer(clip.samples[-1]).resize((1920, 1080), Image.Resampling.LANCZOS)
        poster.save(OUT / f"{clip.key}_poster.png")


def main():
    parser = argparse.ArgumentParser(description="Render ForgeOps demo motion clips.")
    parser.add_argument("--clip", default="all", choices=["all"] + [clip.key for clip in CLIPS])
    parser.add_argument("--storyboard-only", action="store_true")
    args = parser.parse_args()

    selected = CLIPS if args.clip == "all" else [next(c for c in CLIPS if c.key == args.clip)]
    OUT.mkdir(parents=True, exist_ok=True)
    create_storyboard(selected if args.clip != "all" else CLIPS)
    if not args.storyboard_only:
        for clip in selected:
            path = encode_clip(clip)
            print(f"Rendered {path}")


if __name__ == "__main__":
    main()
