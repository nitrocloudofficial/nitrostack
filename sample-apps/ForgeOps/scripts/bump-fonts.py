"""
Bump all font-size: X.XXrem values in a CSS file.

Rules:
  - Values < 0.65rem  → add +0.22rem
  - Values 0.65–0.79rem → add +0.15rem  
  - Values 0.80–0.94rem → add +0.10rem
  - Values >= 0.95rem  → leave unchanged
  - Non-rem values (px, vw, clamp) → leave unchanged
"""

import re, sys, pathlib

RULES = [
    (0.95, None,  0.00),   # >= 0.95: no change
    (0.80, 0.95,  0.10),   # 0.80–0.94: +0.10
    (0.65, 0.80,  0.15),   # 0.65–0.79: +0.15
    (0.00, 0.65,  0.22),   # < 0.65:   +0.22
]

def bump(match):
    val = float(match.group(1))
    for lo, hi, delta in RULES:
        if hi is None:
            if val >= lo:
                return f"font-size: {val:.2f}rem;"
        else:
            if lo <= val < hi:
                new = round(val + delta, 2)
                return f"font-size: {new:.2f}rem;"
    return match.group(0)

PATTERN = re.compile(r'font-size:\s*(0\.\d+)rem;')

for path in sys.argv[1:]:
    p = pathlib.Path(path)
    original = p.read_text(encoding='utf-8')
    updated  = PATTERN.sub(bump, original)
    changed  = sum(1 for a, b in zip(original.splitlines(), updated.splitlines()) if a != b)
    p.write_text(updated, encoding='utf-8')
    print(f"OK {p.name}: {changed} lines updated")
