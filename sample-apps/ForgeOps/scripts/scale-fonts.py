"""
Scale all font-size: X.XXrem values in CSS files by a given factor.
Usage: python scripts/scale-fonts.py <factor> <file1> [file2 ...]
Example: python scripts/scale-fonts.py 0.90 src/styles.css src/theme.css
"""

import re, sys, pathlib

factor = float(sys.argv[1])
files  = sys.argv[2:]

PATTERN = re.compile(r'(font-size:\s*)([\d.]+)(rem;)')

def scale(match):
    val = float(match.group(2))
    new = round(val * factor, 3)
    return f"{match.group(1)}{new}{match.group(3)}"

for path in files:
    p = pathlib.Path(path)
    original = p.read_text(encoding='utf-8')
    updated  = PATTERN.sub(scale, original)
    changed  = sum(1 for a, b in zip(original.splitlines(), updated.splitlines()) if a != b)
    p.write_text(updated, encoding='utf-8')
    print(f"OK {p.name}: {changed} lines scaled by x{factor}")
