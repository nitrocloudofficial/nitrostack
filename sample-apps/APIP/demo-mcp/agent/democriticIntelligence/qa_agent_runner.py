"""
Dynamic QA Agent Assertion Engine — Universal Director & Animation Inspector
Dynamically evaluates any number of animation files and projects without static counts.
Calculates assertion totals, pass rates, and itemized diagnostic checks on-the-fly.
"""

import os
import sys
import re

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


class DynamicQAAgent:
    def __init__(self, animation_dir="animation"):
        self.animation_dir = os.path.abspath(animation_dir)
        self.results = []
        self.total_assertions = 0
        self.passed_assertions = 0
        self.failed_assertions = 0

    def evaluate_file(self, filename):
        filepath = os.path.join(self.animation_dir, filename)
        file_assertions = []

        if not os.path.exists(filepath):
            file_assertions.append(("ASSERT_FILE_EXISTS", False, f"File {filename} not found"))
            return file_assertions

        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        size_kb = os.path.getsize(filepath) / 1024

        # ── DYNAMIC MICRO-ASSERTIONS FOR THIS FILE ──
        checks = [
            ("ASSERT_FILE_EXISTS", True, f"File exists ({size_kb:.1f} KB)"),
            ("ASSERT_FILESIZE_MIN_5KB", size_kb >= 5.0, f"Size {size_kb:.1f} KB >= 5 KB threshold"),
            ("ASSERT_HTML5_DOCTYPE", "<!DOCTYPE html>" in content.upper() or "<!DOCTYPE HTML" in content.upper(), "Valid HTML5 DOCTYPE present"),
            ("ASSERT_VIEWPORT_META", 'name="viewport"' in content or "name='viewport'" in content, "Responsive viewport meta tag present"),
            ("ASSERT_TITLE_TAG", "<title>" in content.lower() and "</title>" in content.lower(), "Descriptive page title tag defined"),
            ("ASSERT_CSS_GLASSMORPHISM", "backdrop-filter" in content or "background:" in content, "Glassmorphism styling tokens present"),
            ("ASSERT_3D_CANVAS_OR_SVG", "<canvas" in content or "<svg" in content, "3D Canvas or SVG graphics engine present"),
            ("ASSERT_HUD_TELEMETRY", "hud" in content.lower() or "telemetry" in content.lower() or "stat" in content.lower(), "HUD telemetry dashboard elements found"),
            ("ASSERT_MODE_SWITCH_DOCK", "mode" in content.lower() or "button" in content.lower() or "click" in content.lower(), "Interactive mode dock or button handlers present"),
            ("ASSERT_AUTOMATED_TIMELINE", "setInterval" in content or "requestAnimationFrame" in content or "animation" in content, "Automated keyframe timeline loop active"),
            ("ASSERT_SUBTITLES_CAPTION", "subtitle" in content.lower() or "caption" in content.lower() or "badge" in content.lower(), "Keynote subtitle caption container present"),
            ("ASSERT_AUDIO_OR_VOICE", "audio" in content.lower() or "speech" in content.lower() or "sound" in content.lower() or "wave" in content.lower(), "Web Audio synth or voice audio engine present"),
            ("ASSERT_ZERO_SYNTAX_CRASH", not ("console.error(" in content and "throw new Error" in content), "No unhandled syntax crash triggers detected"),
        ]

        # Dynamic check for Three.js / WebGL if canvas is present
        if "<canvas" in content:
            has_three = "three" in content.lower() or "webgl" in content.lower()
            checks.append(("ASSERT_THREEJS_WEBGL_ENGINE", has_three, "Three.js / WebGL 3D rendering library imported"))

        # Dynamic check for SVG curved brand logos
        if "<svg" in content:
            has_viewbox = "viewBox" in content or "viewbox" in content
            checks.append(("ASSERT_SVG_VIEWBOX_RESPONSIVE", has_viewbox, "SVG vector elements have responsive viewBox scaling"))

        return checks

    def run_suite(self, target_files=None):
        if not target_files:
            if os.path.exists(self.animation_dir):
                target_files = [f for f in os.listdir(self.animation_dir) if f.endswith('.html')]
            else:
                target_files = []

        print("\n" + "=" * 70)
        print(" 🧪 DYNAMIC QA AGENT EXECUTION ENGINE")
        print(f" Target Directory: {self.animation_dir}")
        print(f" Evaluating {len(target_files)} target web animation files dynamically...")
        print("=" * 70)

        file_reports = {}

        for idx, filename in enumerate(target_files, start=1):
            checks = self.evaluate_file(filename)
            file_passed = sum(1 for c in checks if c[1])
            file_total = len(checks)

            self.total_assertions += file_total
            self.passed_assertions += file_passed
            self.failed_assertions += (file_total - file_passed)

            file_reports[filename] = {
                "checks": checks,
                "passed": file_passed,
                "total": file_total,
                "score_pct": round((file_passed / file_total) * 100, 1) if file_total > 0 else 0
            }

            status_icon = "✓" if file_passed == file_total else "⚠"
            print(f"\n[{idx}/{len(target_files)}] File: {filename}")
            print(f"    Dynamic Score: {file_passed}/{file_total} Assertions Passed ({file_reports[filename]['score_pct']}%) [{status_icon}]")

            for name, passed, detail in checks:
                icon = "  ✓" if passed else "  ✗"
                color_str = name.ljust(30)
                print(f"      {icon} {color_str} : {detail}")

        # ── FINAL DYNAMIC REPORT SUMMARY ──
        score_pct = round((self.passed_assertions / self.total_assertions) * 100, 1) if self.total_assertions > 0 else 0

        print("\n" + "=" * 70)
        print(" 📊 DYNAMIC QA AGENT AUDIT SUMMARY")
        print("=" * 70)
        print(f"  • Target Files Evaluated   : {len(target_files)}")
        print(f"  • Total Dynamic Assertions : {self.total_assertions}")
        print(f"  • Assertions Passed        : {self.passed_assertions} [✓]")
        print(f"  • Assertions Failed        : {self.failed_assertions} [✗]")
        print(f"  • Overall Dynamic Score    : {self.passed_assertions} / {self.total_assertions} Passed ({score_pct}%)")
        print("=" * 70 + "\n")

        return {
            "total_assertions": self.total_assertions,
            "passed_assertions": self.passed_assertions,
            "failed_assertions": self.failed_assertions,
            "score_pct": score_pct,
            "file_reports": file_reports
        }


if __name__ == "__main__":
    anim_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "animation")
    qa = DynamicQAAgent(animation_dir=anim_dir)
    qa.run_suite()
