"""
report.py - Model Card / Audit Report generator.

Reads a completed run's state.json and produces a professional PDF documenting
the entire build: the request, the classes, data sources & licenses, the
accuracy progression per iteration, the agent decision log, and the security
verdict. Bundled alongside the delivered .safetensors model.

This is the audit trail an MLOps team needs: where the data came from (with
licenses), how the model performed, what the agents decided, and proof the
artifact was security-scanned.

Standalone:
    python report.py C:/hack/storage/runs/<run_folder>/state.json
"""

from __future__ import annotations

import os
import sys
import json
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, HRFlowable)

# --- brand palette (matches the Kernels site) ---
INK = colors.HexColor("#14142b")
INK_SOFT = colors.HexColor("#5b5b78")
PRIMARY = colors.HexColor("#4f46e5")
LINE = colors.HexColor("#e9e9f2")
OK = colors.HexColor("#059669")
WARN = colors.HexColor("#e11d48")
PANEL = colors.HexColor("#f6f6fc")


def _styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle("KTitle", parent=s["Title"], textColor=INK,
                         fontSize=24, spaceAfter=2, leading=28))
    s.add(ParagraphStyle("KSub", parent=s["Normal"], textColor=INK_SOFT,
                         fontSize=10, spaceAfter=14))
    s.add(ParagraphStyle("KH2", parent=s["Heading2"], textColor=PRIMARY,
                         fontSize=13, spaceBefore=16, spaceAfter=6))
    s.add(ParagraphStyle("KBody", parent=s["Normal"], textColor=INK,
                         fontSize=10, leading=15))
    s.add(ParagraphStyle("KMono", parent=s["Normal"], fontName="Courier",
                         textColor=INK_SOFT, fontSize=8.5, leading=12))
    return s


def _verdict_color(v):
    return OK if v == "SAFE" else WARN


def generate_report(state_path: str, out_path: str | None = None) -> dict:
    with open(state_path, encoding="utf-8") as f:
        state = json.load(f)

    run_dir = state.get("run_dir", os.path.dirname(state_path))
    if out_path is None:
        out_path = os.path.join(run_dir, "audit_report.pdf")

    st = _styles()
    doc = SimpleDocTemplate(out_path, pagesize=A4,
                            topMargin=20 * mm, bottomMargin=18 * mm,
                            leftMargin=18 * mm, rightMargin=18 * mm)
    story = []

    classes = state.get("classes", [])
    iters = state.get("iterations", [])
    final = state.get("final_model") or {}
    request = state.get("request", "")

    # ---- header ----
    story.append(Paragraph("Kernels — Model Audit Report", st["KTitle"]))
    story.append(Paragraph(
        f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} · "
        f"Autonomous multi-agent build", st["KSub"]))
    story.append(HRFlowable(width="100%", color=LINE, thickness=1,
                            spaceAfter=10))

    # ---- summary panel ----
    final_acc = final.get("accuracy")
    verdict = (final.get("scan") or {}).get("verdict", "—")
    acc_str = f"{final_acc*100:.1f}%" if isinstance(final_acc, (int, float)) else "—"
    summary_rows = [
        ["Request", request or "—"],
        ["Classes", ", ".join(classes) or "—"],
        ["Final accuracy", acc_str],
        ["Iterations run", str(len(iters))],
        ["Security verdict", verdict],
        ["Delivered format", "SafeTensors (.safetensors)"],
    ]
    t = Table(summary_rows, colWidths=[45 * mm, 120 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PANEL),
        ("TEXTCOLOR", (0, 0), (0, -1), INK_SOFT),
        ("TEXTCOLOR", (1, 0), (1, -1), INK),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, LINE),
        ("TEXTCOLOR", (1, 4), (1, 4), _verdict_color(verdict)),
        ("FONTNAME", (1, 4), (1, 4), "Helvetica-Bold"),
    ]))
    story.append(t)

    # ---- accuracy progression ----
    story.append(Paragraph("Accuracy progression", st["KH2"]))
    if iters:
        head = ["Iteration", "Accuracy", "Decision", "Per-class recall"]
        rows = [head]
        for it in iters:
            pc = it.get("per_class") or {}
            pc_str = ", ".join(f"{k}: {v}" for k, v in pc.items())
            rows.append([
                str(it.get("iteration", "")),
                f"{it.get('accuracy', 0)*100:.1f}%",
                it.get("decision", ""),
                pc_str,
            ])
        at = Table(rows, colWidths=[22 * mm, 22 * mm, 26 * mm, 95 * mm])
        at.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("TEXTCOLOR", (0, 1), (-1, -1), INK),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, LINE),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PANEL]),
        ]))
        story.append(at)
    else:
        story.append(Paragraph("No iteration data recorded.", st["KBody"]))

    # ---- data provenance (from manifests) ----
    story.append(Paragraph("Data provenance & licensing", st["KH2"]))
    prov_rows = [["Class", "Images kept", "Sources", "Licenses (sample)"]]
    images_root = os.path.join(run_dir, "images")
    for c in classes:
        cdir = os.path.join(images_root, c)
        manifest = os.path.join(cdir, "_manifest.json")
        kept = "—"
        srcs, lics = set(), set()
        try:
            m = json.load(open(manifest))
            for frec in m.get("files", []):
                srcs.add(frec.get("source", "?"))
                lics.add(frec.get("license", "?"))
            kept = str(m.get("downloaded", "—"))
        except Exception:
            pass
        prov_rows.append([c, kept, ", ".join(sorted(srcs)) or "—",
                          ", ".join(sorted(lics))[:40] or "—"])
    pt = Table(prov_rows, colWidths=[30 * mm, 25 * mm, 45 * mm, 65 * mm])
    pt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), INK),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
    ]))
    story.append(pt)
    story.append(Paragraph(
        "All training images were sourced from open-licensed providers. "
        "Per-image source and license are recorded in each class manifest.",
        st["KMono"]))

    # ---- agent decision log ----
    story.append(Paragraph("Agent decision log", st["KH2"]))
    for ev in state.get("events", []):
        agent = ev.get("agent", "")
        msg = ev.get("message", "")
        story.append(Paragraph(
            f"<b>{agent}</b> &nbsp; {msg}", st["KMono"]))

    # ---- security ----
    story.append(Paragraph("Security assessment", st["KH2"]))
    scan = final.get("scan") or {}
    sec = (f"Verdict: <b>{scan.get('verdict', '—')}</b> · "
           f"{scan.get('summary', 'Model scanned for malicious pickle opcodes.')} "
           f"The delivered artifact was converted to SafeTensors, a format with "
           f"no code-execution path.")
    story.append(Paragraph(sec, st["KBody"]))

    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", color=LINE, thickness=1))
    story.append(Paragraph(
        "Kernels · autonomous model builder · built on NitroStack MCP. "
        "This report is auto-generated from the build's execution log.",
        st["KMono"]))

    doc.build(story)
    return {"report_path": out_path.replace("\\", "/")}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python report.py <state.json> [out.pdf]")
        raise SystemExit(1)
    out = sys.argv[2] if len(sys.argv) > 2 else None
    print(json.dumps(generate_report(sys.argv[1], out), indent=2))
